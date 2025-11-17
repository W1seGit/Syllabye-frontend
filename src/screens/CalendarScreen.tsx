import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Platform,
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

import { createEvent, listEvents, renameClass, deleteClass, updateEvent, deleteEvent } from '../api';
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
type CalendarDisplayMode = 'month' | 'day';

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
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('month');
  const [navigationSource, setNavigationSource] = useState<'month' | 'scroll' | null>(null);
  const [visibleMonths, setVisibleMonths] = useState<dayjs.Dayjs[]>([]);
  const [visibleDays, setVisibleDays] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const dayScrollViewRef = useRef<ScrollView>(null);
  const monthHeights = useRef<number[]>([]);
  const [calendarViewportHeight, setCalendarViewportHeight] = useState(0);
  const viewTransition = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [newTime, setNewTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newAssignmentType, setNewAssignmentType] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
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

  // On first render of the month view, scroll so that the current month is
  // brought into view instead of starting several months in the past.
  useEffect(() => {
    if (!scrollViewRef.current) return;
    if (!visibleMonths.length) return;
    if (calendarViewportHeight <= 0) return;

    const todayMonth = dayjs().startOf('month');
    const index = visibleMonths.findIndex((m) => m.isSame(todayMonth, 'month'));
    if (index <= 0) return;

    // Approximate per-month height using the viewport height. This doesn't
    // have to be perfect; it's just to land near the current month.
    const estimatedMonthHeight = calendarViewportHeight || Dimensions.get('window').height * 0.8;
    const offset = index * estimatedMonthHeight;

    scrollViewRef.current.scrollTo({ y: offset, animated: false });
  }, [calendarViewportHeight, visibleMonths]);

  // When navigating from month view into day view by tapping a date, scroll the
  // day list once so that the chosen date is brought into view. After that,
  // the header follows the scroll position only.
  useEffect(() => {
    if (displayMode !== 'day') return;
    if (navigationSource !== 'month') return;
    if (!dayScrollViewRef.current) return;
    if (!visibleDays.length) return;

    const first = dayjs(visibleDays[0]);
    const target = dayjs(selectedDate);
    const index = target.diff(first, 'day');
    if (index < 0 || index >= visibleDays.length) return;

    const estimatedDayHeight = Dimensions.get('window').height * 0.5;
    const offset = index * estimatedDayHeight;

    dayScrollViewRef.current.scrollTo({ y: offset, animated: false });
    // Mark that further updates come from scroll, not navigation.
    setNavigationSource('scroll');
  }, [displayMode, navigationSource, selectedDate, visibleDays]);

  useEffect(() => {
    loadEvents();
  }, [token]);

  // Initialize visible months (6 months before and after current - 1 year total)
  useEffect(() => {
    const months: dayjs.Dayjs[] = [];
    for (let i = -6; i <= 6; i++) {
      months.push(dayjs().startOf('month').add(i, 'month'));
    }
    setVisibleMonths(months);
  }, []);

  // Initialize a fixed range of visible days (6 months before today and 6 after)
  useEffect(() => {
    const days: string[] = [];
    const start = dayjs().startOf('day').subtract(180, 'day');
    for (let i = 0; i <= 360; i++) {
      days.push(start.add(i, 'day').format('YYYY-MM-DD'));
    }
    setVisibleDays(days);
  }, []);

  const selectedClassName = useMemo(() => {
    const cls = classes.find((c) => c.id === selectedClassId);
    return cls?.name || null;
  }, [classes, selectedClassId]);

  const classFilteredEvents = useMemo(() => {
    if (!selectedClassName) return events;
    return events.filter((event) => event.class_name === selectedClassName);
  }, [events, selectedClassName]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    classFilteredEvents.forEach((event) => {
      const key = dayjs(event.due).format('YYYY-MM-DD');
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(event);
    });
    return map;
  }, [classFilteredEvents]);

  const getPriorityColors = (priority?: string | null) => {
    const normalized = (priority || '').toLowerCase();
    if (normalized === 'high') {
      return { backgroundColor: palette.coral, textColor: palette.white };
    }
    if (normalized === 'medium') {
      return { backgroundColor: palette.gold, textColor: palette.text };
    }
    if (normalized === 'low') {
      return { backgroundColor: palette.mint, textColor: palette.text };
    }
    return { backgroundColor: palette.sky, textColor: palette.text };
  };

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
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportCenterY = scrollY + calendarViewportHeight / 2;
    let accumulatedHeight = 0;
    
    for (let i = 0; i < visibleMonths.length; i++) {
      const monthHeight = monthHeights.current[i] || 0;
      const monthStart = accumulatedHeight;
      const monthEnd = accumulatedHeight + monthHeight;

      // Use viewport center to decide which month is "active" so the header
      // switches when the next month is about half visible.
      const isCenterInThisMonth =
        calendarViewportHeight > 0
          ? viewportCenterY >= monthStart && viewportCenterY < monthEnd
          : scrollY >= monthStart && scrollY < monthEnd;

      if (isCenterInThisMonth) {
        const newMonth = visibleMonths[i];

        // Keep header in sync with the month that is currently near the top
        if (!newMonth.isSame(currentMonth, 'month')) {
          setCurrentMonth(newMonth);
        }

        break;
      }
      accumulatedHeight += monthHeight;
    }
  };

  // In day view, keep the header in sync with the calendar position instead of
  // forcing the calendar to jump to the header date.
  const handleDayScroll = (event: any) => {
    if (displayMode !== 'day') return;
    if (!visibleDays.length) return;

    const scrollY = event.nativeEvent.contentOffset.y;
    const estimatedDayHeight = Dimensions.get('window').height * 0.5;
    if (estimatedDayHeight <= 0) return;

    // Use the center of the viewport to decide which day is "active".
    const viewportCenterY = scrollY + estimatedDayHeight / 2;
    let index = Math.floor(viewportCenterY / estimatedDayHeight);

    if (index < 0) index = 0;
    if (index >= visibleDays.length) index = visibleDays.length - 1;

    const newDate = visibleDays[index];
    if (newDate && newDate !== selectedDate) {
      setNavigationSource('scroll');
      setSelectedDate(newDate);
    }
  };


  const sortedEvents = useMemo(
    () =>
      [...classFilteredEvents].sort((a, b) => dayjs(a.due).valueOf() - dayjs(b.due).valueOf()),
    [classFilteredEvents],
  );

  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTodoEvents = useMemo(() => {
    const filtered = sortedEvents.filter((event) => {
      const status = (event.status || '').toLowerCase();
      if (taskFilter === 'completed') {
        return status === 'completed';
      }
      if (taskFilter === 'pending') {
        return status !== 'completed';
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const aCompleted = (a.status || '').toLowerCase() === 'completed';
      const bCompleted = (b.status || '').toLowerCase() === 'completed';

      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      return dayjs(a.due).valueOf() - dayjs(b.due).valueOf();
    });
  }, [sortedEvents, taskFilter]);

  const renderTaskCard = (event: EventItem) => {
    const dateTimeLabel = dayjs(event.due).format('MMM D • h:mm A');
    const metaParts: string[] = [];
    if (event.priority) metaParts.push(event.priority);
    if (event.assignment_type) metaParts.push(event.assignment_type);
    const metaLabel = metaParts.join(' • ');
    const colors = getPriorityColors(event.priority);

    return (
      <View key={event.id} style={[styles.todoCard, { backgroundColor: colors.backgroundColor }]}>
        <TouchableOpacity 
          onPress={() => handleTaskMenu(event)}
          style={styles.todoActions}
          activeOpacity={0.6}
        >
          <View style={styles.actionButton}>
            <Feather name="more-vertical" size={20} color={colors.textColor} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.todoDateTime, { color: colors.textColor }]}>{dateTimeLabel}</Text>
        <View style={styles.todoTitleRow}>
          <TouchableOpacity
            onPress={() => handleToggleEventStatus(event)}
            style={styles.checkbox}
          >
            <Feather
              name={
                (event.status || '').toLowerCase() === 'completed'
                  ? 'check-square'
                  : 'square'
              }
              size={18}
              color={colors.textColor}
            />
          </TouchableOpacity>
          <Text style={[styles.todoTitle, { color: colors.textColor }]}>{event.title}</Text>
        </View>
        {event.class_name ? (
          <Text style={[styles.todoClass, { color: colors.textColor }]}>{event.class_name}</Text>
        ) : null}
        {event.description ? (
          <Text style={[styles.todoDescription, { color: colors.textColor }]}>
            {event.description}
          </Text>
        ) : null}
        {metaLabel ? (
          <Text style={[styles.todoMeta, { color: colors.textColor }]}>{metaLabel}</Text>
        ) : null}
      </View>
    );
  };

  const openModal = (date?: string) => {
    const targetDate = date || selectedDate || currentMonth.format('YYYY-MM-DD');
    setNewTitle('');
    setNewDescription('');
    setNewTime('09:00');
    setNewDate(targetDate);
    setNewPriority('');
    setNewAssignmentType('');
    setEditingEventId(null);
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
      const payload = {
        title: newTitle.trim(),
        due: due.toISOString(),
        description: newDescription.trim() || undefined,
        class_name: className,
        priority: newPriority.trim() || undefined,
        assignment_type: newAssignmentType.trim() || undefined,
      };
      if (editingEventId) {
        await updateEvent(token, editingEventId, payload);
      } else {
        await createEvent(token, payload);
      }
      setShowModal(false);
      setEditingEventId(null);
      await loadEvents();
    } catch (error) {
      Alert.alert('Could not create event', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };


  const handleSelectDay = (date: string) => {
    setNavigationSource('month');
    setSelectedDate(date);
    // Animate to day view
    setDisplayMode('day');
    Animated.spring(viewTransition, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const handleToggleEventStatus = async (event: EventItem) => {
    if (!token) return;
    const current = (event.status || '').toLowerCase() === 'completed';
    const nextStatus = current ? 'pending' : 'completed';
    try {
      await updateEvent(token, event.id, { status: nextStatus });
      await loadEvents();
    } catch (error) {
      Alert.alert('Unable to update task', (error as Error).message);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!token) return;
    try {
      await deleteEvent(token, eventId);
      await loadEvents();
    } catch (error) {
      Alert.alert('Unable to delete task', (error as Error).message);
    }
  };

  const handleTaskMenu = (event: EventItem) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleEditEvent(event);
          } else if (buttonIndex === 2) {
            handleDeleteEvent(event.id);
          }
        },
      );
    } else {
      Alert.alert(
        event.title,
        'Choose an action',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditEvent(event) },
          { text: 'Delete', onPress: () => handleDeleteEvent(event.id), style: 'destructive' },
        ],
      );
    }
  };

  const handleEditEvent = (event: EventItem) => {
    setEditingEventId(event.id);
    setNewTitle(event.title);
    setNewDescription(event.description || '');
    setNewTime(dayjs(event.due).format('HH:mm'));
    setNewDate(dayjs(event.due).format('YYYY-MM-DD'));
    setNewPriority(event.priority || '');
    setNewAssignmentType(event.assignment_type || '');
    setShowModal(true);
  };

  const handleBackToMonth = () => {
    Animated.spring(viewTransition, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start(() => {
      const today = dayjs().startOf('day');
      const todayMonth = today.startOf('month');

      setSelectedDate(today.format('YYYY-MM-DD'));
      setCurrentMonth(todayMonth);

      if (scrollViewRef.current && visibleMonths.length) {
        const index = visibleMonths.findIndex((m) => m.isSame(todayMonth, 'month'));
        if (index >= 0) {
          let offset = 0;
          for (let i = 0; i < index; i++) {
            offset += monthHeights.current[i] || 0;
          }
          scrollViewRef.current.scrollTo({ y: offset, animated: false });
        }
      }

      setDisplayMode('month');
    });
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
        onOpen={() => {
          refreshClasses();
          loadEvents();
        }}
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
          {displayMode === 'month' ? (
            <View style={styles.header}>
              <View style={styles.monthInfo}>
                <Text style={styles.monthLabel}>{currentMonth.format('MMMM YYYY')}</Text>
                <Text style={styles.monthHint}>Scroll to browse months.</Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
                <Feather name="plus" size={20} color={palette.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity style={styles.backButton} onPress={handleBackToMonth}>
                <Feather name="chevron-left" size={20} color={palette.plum} />
                <Text style={styles.backText}>Back to Month</Text>
              </TouchableOpacity>
              <View style={styles.header}>
                <View style={styles.monthInfo}>
                  <Text style={styles.monthLabel}>{dayjs(selectedDate).format('MMMM D, YYYY')}</Text>
                  <Text style={styles.monthHint}>{dayjs(selectedDate).format('dddd')}</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => openModal(selectedDate)}>
                  <Feather name="plus" size={20} color={palette.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {displayMode === 'month' && (
            <View style={styles.weekRow}>
              {weekDays.map((day) => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>
          )}

          {displayMode === 'month' ? (
            <ScrollView
              ref={scrollViewRef}
              style={styles.calendarScrollView}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onLayout={(event) => {
                setCalendarViewportHeight(event.nativeEvent.layout.height);
              }}
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
                                {dayEvents.slice(0, 3).map((event) => {
                                  const colors = getPriorityColors(event.priority);
                                  return (
                                    <View
                                      key={event.id}
                                      style={[styles.eventPreview, { backgroundColor: colors.backgroundColor }]}
                                    >
                                      <Text
                                        style={[styles.eventPreviewText, { color: colors.textColor }]}
                                        numberOfLines={1}
                                      >
                                        {event.title}
                                      </Text>
                                    </View>
                                  );
                                })}
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
          ) : (
            <ScrollView
              ref={dayScrollViewRef}
              style={styles.dayScrollView}
              showsVerticalScrollIndicator={false}
              onScroll={handleDayScroll}
              scrollEventThrottle={16}
            >
              {visibleDays.map((date) => {
                const dayEvents = eventsByDate[date] || [];
                const sortedDayEvents = [...dayEvents].sort((a, b) => 
                  dayjs(a.due).valueOf() - dayjs(b.due).valueOf()
                );
                
                return (
                  <View
                    key={date}
                    style={styles.dayContainer}
                  >
                    <Text style={styles.daySectionLabel}>
                      {dayjs(date).format('dddd, MMMM D')}
                    </Text>
                    <View style={styles.dayEventsContainer}>
                      {sortedDayEvents.length === 0 ? (
                        <View style={styles.emptyDayCard}>
                          <Feather name="calendar" size={64} color={palette.muted} />
                          <Text style={styles.emptyDayText}>No events</Text>
                          <Text style={styles.emptyDayHint}>Tap + to add one</Text>
                        </View>
                      ) : (
                        sortedDayEvents.map((event) => renderTaskCard(event))
                      )}
                    </View>
                    <View style={styles.daySeparator} />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : (
        <View style={styles.listWrapper}>
          <View style={styles.listHeader}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  taskFilter === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setTaskFilter('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    taskFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  taskFilter === 'pending' && styles.filterChipActive,
                ]}
                onPress={() => setTaskFilter('pending')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    taskFilter === 'pending' && styles.filterChipTextActive,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  taskFilter === 'completed' && styles.filterChipActive,
                ]}
                onPress={() => setTaskFilter('completed')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    taskFilter === 'completed' && styles.filterChipTextActive,
                  ]}
                >
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
              <Feather name="plus" size={20} color={palette.white} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.todoList}>
            {filteredTodoEvents.length === 0 ? (
              <Text style={styles.empty}>Nothing scheduled. Syl is chilling.</Text>
            ) : (
              filteredTodoEvents.map((event) => renderTaskCard(event))
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
                label="Priority (high, medium, low)"
                value={newPriority}
                onChangeText={setNewPriority}
                placeholder="high / medium / low"
              />
              <CuteTextField
                label="Assignment type"
                value={newAssignmentType}
                onChangeText={setNewAssignmentType}
                placeholder="Homework, exam, project..."
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.plum,
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
    backgroundColor: palette.cream,
    paddingHorizontal: 0,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  filterChipActive: {
    backgroundColor: palette.plum,
    borderColor: palette.plum,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.muted,
  },
  filterChipTextActive: {
    color: palette.white,
  },
  todoList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  todoCard: {
    position: 'relative',
    gap: spacing.xs,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingRight: spacing.xl * 1.5,
  },
  todoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    paddingRight: spacing.xs,
  },
  todoDateTime: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.plum,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  todoActions: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  todoClass: {
    fontSize: 13,
    color: palette.muted,
  },
  todoDescription: {
    fontSize: 13,
    color: palette.text,
  },
  todoMeta: {
    fontSize: 12,
    color: palette.muted,
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
  dayScrollView: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dayContainer: {
    paddingTop: spacing.sm,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  daySectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dayEventsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flex: 1,
  },
  emptyDayCard: {
    flex: 1,
    paddingVertical: spacing.xl * 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyDayText: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  emptyDayHint: {
    fontSize: 14,
    color: palette.muted,
  },
  dayEventCard: {
    backgroundColor: palette.sky,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: palette.coral,
    gap: spacing.xs,
  },
  dayEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayEventTime: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.plum,
    minWidth: 70,
  },
  dayEventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    flex: 1,
  },
  dayEventClass: {
    fontSize: 13,
    color: palette.muted,
    paddingLeft: 86,
  },
  dayEventDescription: {
    fontSize: 13,
    color: palette.text,
    paddingLeft: 86,
  },
  daySeparator: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
