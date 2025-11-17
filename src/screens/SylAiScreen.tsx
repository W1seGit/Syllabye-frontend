import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { streamChatMessage, renameClass, deleteClass } from '../api';
import { useAppContext } from '../context/AppContext';
import { ClassHeader } from '../components/ClassHeader';
import { CuteButton } from '../components/CuteButton';
import type { ChatMessageItem } from '../types';
import { palette, radius, spacing, typography } from '../theme';

export const SylAiScreen: React.FC = () => {
  const { token, classes, selectedClassId, selectClass, refreshClasses } = useAppContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  const handleEditClass = (classId: number) => {
    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      setEditingClassId(classId);
      setEditingClassName(cls.name);
      setShowEditClassModal(true);
    }
  };

  const handleSaveEditClass = async () => {
    if (!token || !editingClassId) return;
    const trimmed = editingClassName.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Please enter a class name.');
      return;
    }
    try {
      setSavingClass(true);
      await renameClass(token, editingClassId, trimmed);
      await refreshClasses();
      setShowEditClassModal(false);
      setEditingClassId(null);
      setEditingClassName('');
    } catch (error) {
      Alert.alert('Unable to rename', (error as Error).message);
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (classId: number) => {
    if (!token) return;
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    
    Alert.alert(
      'Delete class?',
      `Are you sure you want to delete "${cls.name}"? This will also delete its syllabus and all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(token, classId);
              await refreshClasses();
              if (classId === selectedClassId) {
                selectClass(null);
              }
            } catch (error) {
              Alert.alert('Unable to delete', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    if (!token || !input.trim()) {
      return;
    }
    const text = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setStreamingText('');
    setIsStreaming(true);
    try {
      const result = await streamChatMessage({
        token,
        message: text,
        conversationUuid: conversationId,
        onChunk: (chunk) => {
          setStreamingText((prev) => prev + chunk);
        },
      });
      setConversationId(result.conversationUuid);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.fullText }]);
      setStreamingText('');
    } catch (error) {
      Alert.alert('Syl is feeling shy', (error as Error).message);
      setStreamingText('');
    } finally {
      setIsStreaming(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageItem }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, !isUser && styles.aiText]}>{item.content}</Text>
      </View>
    );
  };

  const data: ChatMessageItem[] = streamingText
    ? [...messages, { role: 'assistant', content: streamingText }]
    : messages;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ClassHeader
        classes={classes}
        selectedId={selectedClassId}
        onSelect={(id) => selectClass(id)}
        onAddClass={() => setShowNewClassModal(true)}
        onEditClass={handleEditClass}
        onDeleteClass={handleDeleteClass}
      />

      <FlatList
        data={data}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        ListEmptyComponent={
          <Text style={styles.placeholder}>
            Ask Syl about due dates, readings, or anything on your mind ✨
          </Text>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Ask Syl something"
          placeholderTextColor={palette.muted}
          value={input}
          onChangeText={setInput}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isStreaming) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
          activeOpacity={0.7}
        >
          {isStreaming ? (
            <Feather name="loader" size={20} color={palette.white} />
          ) : (
            <Feather name="send" size={20} color={palette.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: palette.cream,
  },
  chatContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  placeholder: {
    textAlign: 'center',
    color: palette.muted,
    marginTop: spacing.lg,
  },
  bubble: {
    padding: spacing.md,
    borderRadius: radius.lg,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: palette.plum,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  bubbleText: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    color: palette.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    minHeight: 44,
    maxHeight: 120,
    color: palette.text,
    backgroundColor: palette.white,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: '#A482C4',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 3,
    },
  },
  sendButtonDisabled: {
    backgroundColor: palette.muted,
    opacity: 0.5,
  },
});
