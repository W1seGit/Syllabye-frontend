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

  const presetPrompts = [
    "What assignments are due this week?",
    "Summarize today's readings",
    "When is my next exam?",
    "What should I focus on studying?",
  ];

  const handlePresetPrompt = (prompt: string) => {
    setInput(prompt);
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
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={64} color={palette.plum} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Chat with Syl AI</Text>
            <Text style={styles.emptySubtitle}>
              Ask me about due dates, readings, or anything on your mind
            </Text>
            <View style={styles.presetPrompts}>
              {presetPrompts.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.presetPrompt}
                  onPress={() => handlePresetPrompt(prompt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetPromptText}>{prompt}</Text>
                  <Feather name="arrow-right" size={16} color={palette.plum} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
    paddingBottom: spacing.md,
    backgroundColor: palette.cream,
  },
  chatContent: {
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.plum,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  presetPrompts: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  presetPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  presetPromptText: {
    fontSize: 15,
    color: palette.text,
    fontWeight: '500',
    flex: 1,
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
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    color: palette.text,
    fontSize: 15,
    paddingVertical: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    shadowColor: '#A482C4',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: palette.muted,
    opacity: 0.5,
  },
});
