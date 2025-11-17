import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { createEvent, listEvents, renameClass, deleteClass } from '../api';
import type { EventItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { ClassHeader } from '../components/ClassHeader';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import { palette, radius, spacing, typography } from '../theme';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayCell {
  date: dayjs.Dayjs;
  inMonth: boolean;
}

type CalendarViewMode = 'calendar' | 'list';

export const CalendarScreen: React.FC = () => {
  const { token, classes, selectedClassId, selectClass, refreshClasses } = useAppContext();
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [savingClass, setSavingClass] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [viewMode, setViewMode] = useState<CalendarViewMode>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const selected = dayjs(selectedDate);
    if (!selected.isSame(currentMonth, 'month')) {
      setSelectedDate(currentMonth.format('YYYY-MM-DD'));
    }
  }, [currentMonth, selectedDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach((event) => {
      const key = dayjs(event.due).format('YYYY-MM-DD');
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(event);
    });
    return map;
  }, [events]);

  const monthDays = useMemo<DayCell[]>(() => {
    const start = currentMonth.startOf('month');
    const days: DayCell[] = [];
    const leading = start.day();
    for (let i = leading; i > 0; i--) {
      days.push({ date: start.subtract(i, 'day'), inMonth: false });
    }
    for (let i = 0; i < currentMonth.daysInMonth(); i++) {
      days.push({ date: start.add(i, 'day'), inMonth: true });
    }
    while (days.length < 42) {
      const last = days[days.length - 1]?.date ?? start;
      days.push({ date: last.add(1, 'day'), inMonth: false });
    }
    return days;
  }, [currentMonth]);

  const selectedEvents = useMemo(() => {
    const data = eventsByDate[selectedDate] || [];
    return [...data].sort((a, b) => dayjs(a.due).valueOf() - dayjs(b.due).valueOf());
  }, [eventsByDate, selectedDate]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => dayjs(a.due).valueOf() - dayjs(b.due).valueOf()),
    [events],
  );

  const openModal = (date?: string) => {
    const targetDate = date || selectedDate || currentMonth.format('YYYY-MM-DD');
    setNewTitle('');
    setNewDescription('');
    setNewTime('09:00');
    setNewDate(targetDate);
    setShowModal(true);
  };

  const handleSaveEvent = async () => {
    if (!token || !newTitle.trim() || !newDate || !newTime) {
      Alert.alert('Missing info', 'Title, date, and time are required.');
      return;
    }
    const due = dayjs(`${newDate} ${newTime}`);
    if (!due.isValid()) {
      Alert.alert('Check date', 'Please use a valid date/time.');
      return;
    }
    try {
      setSaving(true);
      const className = classes.find((cls) => cls.id === selectedClassId)?.name;
      await createEvent(token, {
        title: newTitle.trim(),
        due: due.toISOString(),
        description: newDescription.trim() || undefined,
        class_name: className,
      });
      setShowModal(false);
      await loadEvents();
    } catch (error) {
      Alert.alert('Could not create event', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const goToMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) =>
      direction === 'next' ? prev.add(1, 'month') : prev.subtract(1, 'month'),
    );
  };

  const handleSelectDay = (cell: DayCell) => {
    setSelectedDate(cell.date.format('YYYY-MM-DD'));
    if (!cell.inMonth) {
      setCurrentMonth(cell.date.startOf('month'));
    }
  };

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

  return (
    <View style={styles.container}>
      <ClassHeader
        classes={classes}
        selectedId={selectedClassId}
        onSelect={(id) => selectClass(id)}
        onAddClass={() => setShowNewClassModal(true)}
        onEditClass={handleEditClass}
        onDeleteClass={handleDeleteClass}
      />
      <View style={styles.tabSwitcher}>
        <Text
          style={[
            styles.tabButton,
            viewMode === 'calendar' && styles.tabButtonActive,
          ]}
          onPress={() => setViewMode('calendar')}
        >
          Calendar
        </Text>
        <Text
          style={[
            styles.tabButton,
            viewMode === 'list' && styles.tabButtonActive,
          ]}
          onPress={() => setViewMode('list')}
        >
          To-do
        </Text>
      </View>

      {viewMode === 'calendar' ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => goToMonth('prev')}>
              <Feather name="chevron-left" size={20} color={palette.plum} />
            </TouchableOpacity>
            <View style={styles.monthInfo}>
              <Text style={styles.monthLabel}>{currentMonth.format('MMMM YYYY')}</Text>
              <Text style={styles.monthHint}>Tap a date to see cozy plans.</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
                <Feather name="plus" size={20} color={palette.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => goToMonth('next')}>
                <Feather name="chevron-right" size={20} color={palette.plum} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekLabel}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {monthDays.map((cell) => {
              const iso = cell.date.format('YYYY-MM-DD');
              const isSelected = selectedDate === iso;
              const hasEvents = Boolean(eventsByDate[iso]?.length);
              const isToday = dayjs().isSame(cell.date, 'day');
              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.dayCell,
                    !cell.inMonth && styles.dimmedDay,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => handleSelectDay(cell)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !cell.inMonth && styles.dimmedText,
                      isToday && styles.todayText,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {cell.date.date()}
                  </Text>
                  {hasEvents ? <View style={styles.eventDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.eventsCard}>
            <View style={styles.eventsHeader}>
              <View>
                <Text style={styles.eventsTitle}>{dayjs(selectedDate).format('MMMM D')}</Text>
                <Text style={styles.eventsSubtitle}>
                  {selectedEvents.length ? 'Here is your agenda.' : 'Nothing planned. 🌤️'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => openModal(selectedDate)}>
                <Feather name="plus-circle" size={26} color={palette.plum} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.eventsList}
              showsVerticalScrollIndicator={false}
            >
              {selectedEvents.length === 0 ? (
                <Text style={styles.empty}>Take a breather – no events.</Text>
              ) : (
                selectedEvents.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>{dayjs(event.due).format('h:mm A')}</Text>
                    {event.class_name ? (
                      <Text style={styles.eventClass}>{event.class_name}</Text>
                    ) : null}
                    {event.description ? (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </>
      ) : (
        <View style={styles.listWrapper}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.eventsTitle}>To-do</Text>
              <Text style={styles.eventsSubtitle}>All upcoming tasks in one cozy list.</Text>
            </View>
            <TouchableOpacity onPress={() => openModal()}>
              <Feather name="plus-circle" size={26} color={palette.plum} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.todoList}>
            {sortedEvents.length === 0 ? (
              <Text style={styles.empty}>Nothing scheduled. Syl is chilling.</Text>
            ) : (
              sortedEvents.map((event) => {
                const dayLabel = dayjs(event.due).format('MMM D');
                return (
                  <View key={event.id} style={styles.todoCard}>
                    <View style={styles.todoDate}>
                      <Text style={styles.todoDay}>{dayLabel}</Text>
                      <Text style={styles.todoTime}>{dayjs(event.due).format('h:mm A')}</Text>
                    </View>
                    <View style={styles.todoDetails}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {event.class_name ? (
                        <Text style={styles.eventClass}>{event.class_name}</Text>
                      ) : null}
                      {event.description ? (
                        <Text style={styles.eventDescription}>{event.description}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {showModal ? (
        <Modal
          transparent
          visible
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add an event</Text>
              <CuteTextField
                label="Title"
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Quiz, lab, brunch..."
              />
              <CuteTextField
                label="Date (YYYY-MM-DD)"
                value={newDate}
                onChangeText={setNewDate}
                placeholder="2024-09-01"
              />
              <CuteTextField
                label="Time (HH:MM)"
                value={newTime}
                onChangeText={setNewTime}
                placeholder="09:00"
              />
              <CuteTextField
                label="Notes"
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Optional details"
                multiline
              />
              <CuteButton label="Save event" onPress={handleSaveEvent} loading={saving} />
              <CuteButton label="Cancel" onPress={() => setShowModal(false)} variant="ghost" />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: palette.cream,
    gap: spacing.md,
  },
  screenTitle: {
    ...typography.title,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    color: palette.muted,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  tabButtonActive: {
    backgroundColor: palette.plum,
    color: palette.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconButton: {
    backgroundColor: palette.white,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  monthInfo: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  monthHint: {
    color: palette.muted,
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    backgroundColor: palette.plum,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: palette.muted,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.lg,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  dimmedDay: {
    opacity: 0.45,
  },
  dayNumber: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '600',
  },
  dimmedText: {
    color: palette.muted,
  },
  selectedCell: {
    backgroundColor: palette.lavender,
  },
  selectedText: {
    color: palette.plum,
  },
  todayText: {
    textDecorationLine: 'underline',
  },
  eventDot: {
    width: 6,
    height: 6,
    backgroundColor: palette.coral,
    borderRadius: 3,
    marginTop: spacing.xs / 2,
  },
  eventsCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  eventsSubtitle: {
    color: palette.muted,
  },
  eventsList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  eventCard: {
    backgroundColor: palette.sky,
    padding: spacing.md,
    borderRadius: radius.md,
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
  listWrapper: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  todoList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  todoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: palette.sky,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  todoDate: {
    width: 80,
    alignItems: 'flex-start',
  },
  todoDay: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  todoTime: {
    color: palette.plum,
  },
  todoDetails: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
});
