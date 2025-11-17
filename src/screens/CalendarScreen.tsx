import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { createEvent, listEvents, renameClass, deleteClass } from '../api';
import type { EventItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { ClassHeader } from '../components/ClassHeader';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import type { MainTabParamList } from '../navigation/types';
import { palette, radius, spacing, typography } from '../theme';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type MainTabNav = BottomTabNavigationProp<MainTabParamList>;

interface DayCell {
  date: dayjs.Dayjs;
  inMonth: boolean;
}

type CalendarViewMode = 'calendar' | 'list';

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<MainTabNav>();
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
  const [visibleMonths, setVisibleMonths] = useState<dayjs.Dayjs[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const monthHeights = useRef<number[]>([]);
  const isScrolling = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

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
            navigation.navigate('SylAI');
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

  // Initialize visible months (6 months before and after current)
  useEffect(() => {
    const months: dayjs.Dayjs[] = [];
    for (let i = -6; i <= 6; i++) {
      months.push(dayjs().startOf('month').add(i, 'month'));
    }
    setVisibleMonths(months);
  }, []);

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

  const getMonthDays = (month: dayjs.Dayjs): DayCell[] => {
    const start = month.startOf('month');
    const days: DayCell[] = [];
    const leading = start.day();
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < leading; i++) {
      days.push({ date: start, inMonth: false }); // placeholder
    }
    
    // Add all days in the month
    for (let i = 0; i < month.daysInMonth(); i++) {
      days.push({ date: start.add(i, 'day'), inMonth: true });
    }
    
    // Add empty cells to complete the last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push({ date: start, inMonth: false }); // placeholder
      }
    }
    
    return days;
  };

  const handleScroll = (event: any) => {
    if (isScrolling.current) return;
    
    const scrollY = event.nativeEvent.contentOffset.y;
    let accumulatedHeight = 0;
    
    for (let i = 0; i < visibleMonths.length; i++) {
      const monthHeight = monthHeights.current[i] || 0;
      if (scrollY >= accumulatedHeight && scrollY < accumulatedHeight + monthHeight / 2) {
        const newMonth = visibleMonths[i];
        if (!newMonth.isSame(currentMonth, 'month')) {
          setCurrentMonth(newMonth);
        }
        break;
      }
      accumulatedHeight += monthHeight;
    }
  };

  const loadMoreMonths = (direction: 'top' | 'bottom') => {
    setVisibleMonths((prev) => {
      if (direction === 'top') {
        const firstMonth = prev[0];
        const newMonths = [];
        for (let i = 3; i > 0; i--) {
          newMonths.push(firstMonth.subtract(i, 'month'));
        }
        return [...newMonths, ...prev];
      } else {
        const lastMonth = prev[prev.length - 1];
        const newMonths = [];
        for (let i = 1; i <= 3; i++) {
          newMonths.push(lastMonth.add(i, 'month'));
        }
        return [...prev, ...newMonths];
      }
    });
  };

  const handleScrollBeginDrag = () => {
    isScrolling.current = true;
  };

  const handleScrollEndDrag = () => {
    isScrolling.current = false;
  };

  const handleMomentumScrollEnd = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    // Load more months when near the edges
    if (scrollY < 500) {
      loadMoreMonths('top');
    } else if (scrollY > contentHeight - layoutHeight - 500) {
      loadMoreMonths('bottom');
    }
  };

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


  const handleSelectDay = (date: string) => {
    setSelectedDate(date);
    // Navigate to a detailed day view (you can implement this later)
    // For now, just open the modal to add an event
    openModal(date);
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
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideX }] }]}
      {...panResponder.panHandlers}
    >
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
            <View style={styles.monthInfo}>
              <Text style={styles.monthLabel}>{currentMonth.format('MMMM YYYY')}</Text>
              <Text style={styles.monthHint}>Scroll to browse months.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
              <Feather name="plus" size={20} color={palette.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekLabel}>
                {day}
              </Text>
            ))}
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.calendarScrollView}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
          >
            {visibleMonths.map((month, monthIndex) => {
              const monthDays = getMonthDays(month);
              const weeks: DayCell[][] = [];
              for (let i = 0; i < monthDays.length; i += 7) {
                weeks.push(monthDays.slice(i, i + 7));
              }
              
              // Check if this is the first week that contains days from this month
              const firstWeekWithMonthDays = weeks.findIndex(week => 
                week.some(cell => cell.inMonth)
              );
              
              return (
                <View
                  key={month.format('YYYY-MM')}
                  style={styles.monthContainer}
                  onLayout={(event) => {
                    monthHeights.current[monthIndex] = event.nativeEvent.layout.height;
                  }}
                >
                  {weeks.map((week, weekIndex) => {
                    const hasMonthDays = week.some(cell => cell.inMonth);
                    const isFirstWeekOfMonth = weekIndex === firstWeekWithMonthDays;
                    
                    return (
                      <View key={weekIndex}>
                        {isFirstWeekOfMonth && (
                          <Text style={styles.monthSectionLabel}>{month.format('MMMM')}</Text>
                        )}
                        <View style={styles.weekRowContainer}>
                          {week.map((cell, cellIndex) => {
                            if (!cell.inMonth) {
                              // Empty cell for days outside the month
                              return (
                                <View key={`empty-${weekIndex}-${cellIndex}`} style={styles.dayCell} />
                              );
                            }
                            
                            const iso = cell.date.format('YYYY-MM-DD');
                            const isSelected = selectedDate === iso;
                            const dayEvents = eventsByDate[iso] || [];
                            const isToday = dayjs().isSame(cell.date, 'day');
                            
                            return (
                              <TouchableOpacity
                                key={iso}
                                style={styles.dayCell}
                                onPress={() => handleSelectDay(iso)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.dayNumber,
                                    isToday && styles.todayText,
                                    isSelected && styles.selectedText,
                                  ]}
                                >
                                  {cell.date.date()}
                                </Text>
                                {dayEvents.slice(0, 3).map((event) => (
                                  <View key={event.id} style={styles.eventPreview}>
                                    <Text style={styles.eventPreviewText} numberOfLines={1}>
                                      {event.title}
                                    </Text>
                                  </View>
                                ))}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={styles.weekSeparator} />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
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
    </Animated.View>
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
  monthInfo: {
    flex: 1,
    alignItems: 'flex-start',
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
  addButton: {
    backgroundColor: palette.plum,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  calendarScrollView: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  monthContainer: {
    paddingTop: spacing.sm,
  },
  monthSectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weekRowContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  weekSeparator: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: spacing.xs,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: palette.muted,
    fontWeight: '600',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    gap: 2,
  },
  dayNumber: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '600',
  },
  selectedText: {
    color: palette.plum,
  },
  todayText: {
    textDecorationLine: 'underline',
  },
  eventPreview: {
    width: '100%',
    backgroundColor: palette.coral,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  eventPreviewText: {
    fontSize: 9,
    color: palette.white,
    fontWeight: '600',
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  eventsSubtitle: {
    color: palette.muted,
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
