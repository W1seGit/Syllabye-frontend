import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { streamChatMessage, streamChatMessageWs, renameClass, deleteClass } from '../api';
import { useAppContext } from '../context/AppContext';
import { ClassHeader } from '../components/ClassHeader';
import { CuteButton } from '../components/CuteButton';
import type { ChatMessageItem } from '../types';
import type { MainTabParamList } from '../navigation/types';
import { palette, radius, spacing, typography } from '../theme';

type MainTabNav = BottomTabNavigationProp<MainTabParamList>;

export const SylAiScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNav>();
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
  const slideX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const flatListRef = useRef<FlatList>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderMove: (_, gestureState) => {
        const maxOffset = screenWidth * 0.3;
        const clampedDx = Math.max(-maxOffset, Math.min(maxOffset, gestureState.dx));
        slideX.setValue(clampedDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const threshold = screenWidth * 0.15;
        if (dx > threshold) {
          Animated.timing(slideX, {
            toValue: screenWidth,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            slideX.setValue(0);
            navigation.navigate('Syllabus');
          });
        } else if (dx < -threshold) {
          Animated.timing(slideX, {
            toValue: -screenWidth,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            slideX.setValue(0);
            navigation.navigate('Calendar');
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

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
      let result;
      try {
        result = await streamChatMessageWs({
          token,
          message: text,
          conversationUuid: conversationId,
          onChunk: (chunk) => {
            setStreamingText((prev) => prev + chunk);
          },
        });
      } catch {
        result = await streamChatMessage({
          token,
          message: text,
          conversationUuid: conversationId,
          onChunk: (chunk) => {
            setStreamingText((prev) => prev + chunk);
          },
        });
      }
      setConversationId(result.conversationUuid);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.fullText }]);
      setStreamingText('');
      // Refresh classes and events in case AI created or updated them
      await refreshClasses();
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

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (data.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data.length]);

  return (
    <Animated.View
      style={{ flex: 1, transform: [{ translateX: slideX }] }}
      {...panResponder.panHandlers}
    >
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
        onOpen={refreshClasses}
      />

      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderMessage}
        contentContainerStyle={[styles.chatContent, data.length > 0 && styles.chatContentWithMessages]}
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
        {(input.trim() || isStreaming) && (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            activeOpacity={0.7}
          >
            {isStreaming ? (
              <Feather name="loader" size={18} color={palette.white} />
            ) : (
              <Feather name="send" size={18} color={palette.white} />
            )}
          </TouchableOpacity>
        )}
      </View>
      </KeyboardAvoidingView>
    </Animated.View>
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
  chatContentWithMessages: {
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: palette.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    shadowColor: '#A482C4',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
});
