import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';

import { createEvent, listEvents } from '../api';
import type { EventItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import { palette, radius, spacing, typography } from '../theme';

export const CalendarScreen: React.FC = () => {
  const { token, classes, selectedClassId } = useAppContext();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  const loadEvents = async () => {
    if (!token) return;
    try {
      const data = await listEvents(token);
      setEvents(data);
    } catch (error) {
      Alert.alert('Unable to load events', (error as Error).message);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [token]);

  const handleCreateEvent = async () => {
    if (!token || !title.trim() || !date || !time) {
      Alert.alert('Missing info', 'Title, date, and time are required.');
      return;
    }
    try {
      setLoading(true);
      const due = dayjs(`${date} ${time}`).toISOString();
      const className = classes.find((cls) => cls.id === selectedClassId)?.name;
      const payload: Partial<EventItem> = {
        title: title.trim(),
        due,
        description: description.trim() || undefined,
        class_name: className,
      };
      await createEvent(token, payload);
      setTitle('');
      setDate('');
      setTime('');
      setDescription('');
      await loadEvents();
    } catch (error) {
      Alert.alert('Could not create event', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Syl keeps track of important dates.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add something new</Text>
        <CuteTextField label="Title" value={title} onChangeText={setTitle} placeholder="Quiz, project..." />
        <CuteTextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2024-09-01" />
        <CuteTextField label="Time (HH:MM)" value={time} onChangeText={setTime} placeholder="09:00" />
        <CuteTextField
          label="Notes"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
        />
        <CuteButton label="Save to calendar" onPress={handleCreateEvent} loading={loading} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventDate}>{dayjs(item.due).format('MMM D • h:mm A')}</Text>
            {item.class_name ? <Text style={styles.eventClass}>{item.class_name}</Text> : null}
            {item.description ? <Text style={styles.eventDescription}>{item.description}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No events yet. Syl is ready!</Text>}
      />
    </View>
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
  card: {
    backgroundColor: palette.white,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
    color: palette.text,
  },
  list: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: palette.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  eventDate: {
    marginTop: spacing.xs,
    color: palette.plum,
    fontWeight: '600',
  },
  eventClass: {
    color: palette.muted,
    marginTop: spacing.xs / 2,
  },
  eventDescription: {
    marginTop: spacing.xs,
    color: palette.text,
  },
  empty: {
    textAlign: 'center',
    color: palette.muted,
  },
});
