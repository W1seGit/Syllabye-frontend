import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { streamChatMessage } from '../api';
import { useAppContext } from '../context/AppContext';
import { ClassDropdown } from '../components/ClassDropdown';
import { CuteButton } from '../components/CuteButton';
import type { ChatMessageItem } from '../types';
import { palette, radius, spacing, typography } from '../theme';

export const SylAiScreen: React.FC = () => {
  const { token, classes, selectedClassId, selectClass } = useAppContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    const clsName = classes.find((cls) => cls.id === selectedClassId)?.name;
    return clsName ? `Syl is focused on ${clsName}` : 'Pick a class so Syl knows what to study.';
  }, [classes, selectedClassId]);

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
      <Text style={styles.title}>Syl AI</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <ClassDropdown
        classes={classes}
        selectedId={selectedClassId}
        onSelect={(id) => selectClass(id)}
      />

      <View style={styles.chatCard}>
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

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Ask Syl something"
            placeholderTextColor={palette.muted}
            value={input}
            onChangeText={setInput}
            style={styles.input}
            multiline
          />
          <CuteButton
            label={isStreaming ? 'Thinking...' : 'Send'}
            onPress={handleSend}
            disabled={isStreaming}
            style={styles.sendButton}
          />
        </View>
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
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  chatCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chatContent: {
    flexGrow: 1,
    gap: spacing.sm,
  },
  placeholder: {
    textAlign: 'center',
    color: palette.muted,
    marginTop: spacing.lg,
  },
  bubble: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: palette.lavender,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  bubbleText: {
    color: palette.text,
  },
  aiText: {
    color: palette.text,
  },
  inputRow: {
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    color: palette.text,
  },
  sendButton: {
    marginTop: spacing.sm,
  },
});
