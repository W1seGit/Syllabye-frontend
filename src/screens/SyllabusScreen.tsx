import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { Feather } from '@expo/vector-icons';

import {
  createClass,
  renameClass,
  deleteClass,
  updateSyllabusText,
  uploadSyllabusPdf,
  uploadSyllabusImages,
  deleteSyllabusPdf,
  deleteSyllabusImage,
  listEvents,
} from '../api';
import type { EventItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { ClassHeader } from '../components/ClassHeader';
import { CuteButton } from '../components/CuteButton';
import { CuteModal } from '../components/CuteModal';
import { CuteTextField } from '../components/CuteTextField';
import { SyllabusPreview } from '../components/SyllabusPreview';
import { palette, radius, spacing, typography } from '../theme';

export const SyllabusScreen: React.FC = () => {
  const {
    token,
    classes,
    selectedClassId,
    selectClass,
    refreshClasses,
    syllabusCache,
    fetchSyllabusForClass,
  } = useAppContext();
  const [editDraft, setEditDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'syllabus'>('summary');
  const [showEditModal, setShowEditModal] = useState(false);
  const [syllabusEvents, setSyllabusEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [foundTasks, setFoundTasks] = useState<EventItem[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  const currentClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId),
    [classes, selectedClassId],
  );
  const syllabus = selectedClassId ? syllabusCache[selectedClassId] : undefined;
  const hasSyllabusContent = Boolean(
    syllabus && (syllabus.text?.trim() || syllabus.pdf_path || syllabus.images?.length),
  );

  useEffect(() => {
    if (selectedClassId) {
      fetchSyllabusForClass(selectedClassId).catch(() => null);
    }
  }, [selectedClassId, fetchSyllabusForClass]);

  const processingMessages = useMemo(
    () => [
      'Syl is reading your syllabus…',
      'Highlighting cozy deadlines…',
      'Turning dates into to-dos…',
      'Fluffing up your summary…',
    ],
    [],
  );

  useEffect(() => {
    if (!showProcessing) {
      setProcessingProgress(0);
      setProcessingMessageIndex(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      iconRotate.setValue(0);
      return;
    }
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for icon
    Animated.loop(
      Animated.timing(iconRotate, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    let progress = 0;
    let tick = 0;
    const interval = setInterval(() => {
      tick += 1;
      progress = Math.min(1, progress + 0.06);
      setProcessingProgress(progress);
      setProcessingMessageIndex((prev) => (prev + 1) % processingMessages.length);
    }, 600);
    return () => clearInterval(interval);
  }, [showProcessing, processingMessages.length, fadeAnim, scaleAnim, iconRotate]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!token || !currentClass || !syllabus) {
        setSyllabusEvents([]);
        return;
      }
      try {
        setLoadingEvents(true);
        const all = await listEvents(token);
        const filtered = all.filter(
          (event) =>
            event.class_name === currentClass.name &&
            event.source === 'syllabus' &&
            event.syllabus_id === syllabus.id,
        );
        setSyllabusEvents(filtered);
      } catch (error) {
        // surface errors only when user is on calendar
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [token, currentClass, syllabus]);

  const openEditModal = () => {
    if (!selectedClassId) return;
    setEditDraft(syllabus?.text || '');
    setShowEditModal(true);
  };

  const handleSaveText = async () => {
    if (!token || !selectedClassId) {
      return;
    }
    const trimmed = editDraft.trim();
    if (!trimmed) {
      Alert.alert('Missing details', 'Add text before saving.');
      return;
    }
    try {
      setSaving(true);
      setShowEditModal(false);
      setShowProcessing(true);
      await updateSyllabusText(token, selectedClassId, trimmed);
      await fetchSyllabusForClass(selectedClassId);
      // Check for newly created tasks from syllabus
      await checkForNewTasks();
    } catch (error) {
      setShowProcessing(false);
      Alert.alert('Unable to save', (error as Error).message);
    } finally {
      setSaving(false);
      setShowProcessing(false);
    }
  };

  const checkForNewTasks = async () => {
    if (!token || !selectedClassId || !syllabus) return;
    try {
      const allEvents = await listEvents(token);
      const syllabusEvents = allEvents.filter(
        (event) => event.source === 'syllabus' && event.syllabus_id === syllabus.id
      );
      if (syllabusEvents.length > 0) {
        setFoundTasks(syllabusEvents);
        setShowTaskOverview(true);
      }
    } catch (error) {
      // Silently fail, not critical
    }
  };

  const handleUploadPdf = async () => {
    if (!token || !selectedClassId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      setShowProcessing(true);
      await uploadSyllabusPdf(
        token,
        selectedClassId,
        asset.uri,
        asset.name || 'syllabus.pdf',
        asset.mimeType || 'application/pdf',
      );
      await fetchSyllabusForClass(selectedClassId);
      // Check for newly created tasks from syllabus
      await checkForNewTasks();
    } catch (error) {
      Alert.alert('PDF upload failed', (error as Error).message);
    } finally {
      setUploading(false);
      setShowProcessing(false);
    }
  };

  const handleUploadImages = async () => {
    if (!token || !selectedClassId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled || !result.assets?.length) return;
      setUploading(true);
      setShowProcessing(true);
      await uploadSyllabusImages(
        token,
        selectedClassId,
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `image-${index}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        })),
      );
      await fetchSyllabusForClass(selectedClassId);
      // Check for newly created tasks from syllabus
      await checkForNewTasks();
    } catch (error) {
      Alert.alert('Image upload failed', (error as Error).message);
    } finally {
      setUploading(false);
      setShowProcessing(false);
    }
  };

  const handleUploadFile = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose PDF', 'Choose from Photos', 'Take Photo'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleUploadPdf();
          } else if (buttonIndex === 2) {
            handleUploadImages();
          } else if (buttonIndex === 3) {
            handleTakePhoto();
          }
        },
      );
    } else {
      // Android fallback - show alert
      Alert.alert(
        'Upload File',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose PDF', onPress: handleUploadPdf },
          { text: 'Choose from Photos', onPress: handleUploadImages },
          { text: 'Take Photo', onPress: handleTakePhoto },
        ],
      );
    }
  };

  const handleTakePhoto = async () => {
    if (!token || !selectedClassId) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setUploading(true);
      setShowProcessing(true);
      await uploadSyllabusImages(
        token,
        selectedClassId,
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `photo-${index}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        })),
      );
      await fetchSyllabusForClass(selectedClassId);
      // Check for newly created tasks from syllabus
      await checkForNewTasks();
    } catch (error) {
      Alert.alert('Photo capture failed', (error as Error).message);
    } finally {
      setUploading(false);
      setShowProcessing(false);
    }
  };

  const handleDeletePdf = async () => {
    if (!token || !selectedClassId) return;
    try {
      setUploading(true);
      await deleteSyllabusPdf(token, selectedClassId);
      await fetchSyllabusForClass(selectedClassId);
    } catch (error) {
      Alert.alert('Oops', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!token || !selectedClassId) return;
    try {
      setUploading(true);
      await deleteSyllabusImage(token, selectedClassId, imageId);
      await fetchSyllabusForClass(selectedClassId);
    } catch (error) {
      Alert.alert('Oops', (error as Error).message);
    } finally {
      setUploading(false);
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
      setSaving(true);
      await renameClass(token, editingClassId, trimmed);
      await refreshClasses();
      setShowEditClassModal(false);
      setEditingClassId(null);
      setEditingClassName('');
    } catch (error) {
      Alert.alert('Unable to rename', (error as Error).message);
    } finally {
      setSaving(false);
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
              // If we deleted the selected class, clear selection
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

  const handleCreateClass = async () => {
    if (!token || !newClassName.trim()) {
      Alert.alert('Class name', 'Give your class a name.');
      return;
    }
    try {
      setSaving(true);
      await createClass(token, newClassName.trim());
      setNewClassName('');
      setShowNewClassModal(false);
      const updatedClasses = await refreshClasses();
      // Auto-select the newly created class
      if (updatedClasses && updatedClasses.length > 0) {
        const newClass = updatedClasses[updatedClasses.length - 1];
        await selectClass(newClass.id);
      }
    } catch (error) {
      Alert.alert('Cannot create class', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshClasses();
    if (selectedClassId) {
      await fetchSyllabusForClass(selectedClassId);
    }
    setRefreshing(false);
  };

  if (!classes.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No classes yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first class to start organizing cozy syllabi.
        </Text>
        <CuteButton label="Add class" onPress={() => setShowNewClassModal(true)} />
        {renderNewClassModal()}
      </View>
    );
  }

  function renderNewClassModal() {
    return (
      <Modal
        transparent
        visible={showNewClassModal}
        animationType="fade"
        onRequestClose={() => setShowNewClassModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a class</Text>
            <TextInput
              placeholder="Pastel Physics"
              placeholderTextColor={palette.muted}
              value={newClassName}
              onChangeText={setNewClassName}
              style={styles.modalInput}
              autoFocus
            />
            <CuteButton label="Save" onPress={handleCreateClass} loading={saving} />
            <CuteButton label="Cancel" onPress={() => setShowNewClassModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ClassHeader
          classes={classes}
          selectedId={selectedClassId}
          onSelect={(id) => selectClass(id)}
          onAddClass={() => setShowNewClassModal(true)}
          onEditClass={handleEditClass}
          onDeleteClass={handleDeleteClass}
        />

        {currentClass && !hasSyllabusContent ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>Syl AI doesn't have your syllabus yet!</Text>
            <Text style={styles.emptyCardSubtitle}>
              Add your syllabus for {currentClass.name} and let Syl organize everything for you.
            </Text>
            <View style={styles.emptyActions}>
              <CuteButton 
                label="Paste text" 
                onPress={openEditModal} 
                variant="primary"
                icon={<Feather name="file-text" size={20} color="white" />}
              />
              <CuteButton 
                label="Upload file" 
                onPress={handleUploadFile} 
                variant="secondary"
                icon={<Feather name="upload" size={20} color={palette.plum} />}
                loading={uploading}
              />
            </View>
          </View>
        ) : null}

        {hasSyllabusContent ? (
          <View style={styles.tabSwitcher}>
            <Text
              style={[
                styles.tabButton,
                activeTab === 'summary' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('summary')}
            >
              Summary
            </Text>
            <Text
              style={[
                styles.tabButton,
                activeTab === 'syllabus' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('syllabus')}
            >
              Syllabus
            </Text>
          </View>
        ) : null}

        {hasSyllabusContent && activeTab === 'summary' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            {syllabus?.summary ? (
              <Text style={styles.summaryText}>{syllabus.summary}</Text>
            ) : (
              <Text style={styles.placeholder}>
                No summary yet. Add or upload a syllabus and Syl will summarize it here.
              </Text>
            )}

            <View style={styles.eventsSection}>
              <Text style={styles.eventsTitle}>Tasks from this syllabus</Text>
              {loadingEvents ? (
                <Text style={styles.placeholder}>Loading tasks...</Text>
              ) : syllabusEvents.length === 0 ? (
                <Text style={styles.placeholder}>
                  No tasks yet. Once your syllabus is processed, syllabus-based tasks will appear
                  here.
                </Text>
              ) : (
                <>
                  <Text style={styles.placeholder}>
                    Syl found {syllabusEvents.length} cozy task
                    {syllabusEvents.length === 1 ? '' : 's'} in your syllabus.
                  </Text>
                  {syllabusEvents.map((event) => (
                    <View key={event.id} style={styles.eventRow}>
                      <View style={styles.eventMeta}>
                        <Text style={styles.eventName}>{event.title}</Text>
                        <Text style={styles.eventDue}>
                          {dayjs(event.due).format('MMM D, h:mm A')}
                        </Text>
                      </View>
                      {event.assignment_type ? (
                        <Text style={styles.eventType}>{event.assignment_type}</Text>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        ) : null}

        {hasSyllabusContent && activeTab === 'syllabus' ? (
          <>
            {currentClass ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Syllabus for {currentClass.name}</Text>
                <Text style={styles.placeholder}>
                  Edit your syllabus text or attach the original document.
                </Text>
                <CuteButton 
                  label="Edit syllabus text" 
                  onPress={openEditModal} 
                  variant="primary"
                  icon={<Feather name="file-text" size={20} color="white" />}
                />
                <CuteButton 
                  label="Upload file" 
                  onPress={handleUploadFile} 
                  variant="secondary"
                  icon={<Feather name="upload" size={20} color={palette.plum} />}
                  loading={uploading}
                />
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your syllabus</Text>
              {syllabus ? (
                <SyllabusPreview
                  syllabus={syllabus}
                  onDeletePdf={syllabus.pdf_path ? handleDeletePdf : undefined}
                  onDeleteImage={syllabus.images?.length ? handleDeleteImage : undefined}
                />
              ) : (
                <Text style={styles.placeholder}>Select a class to see its syllabus.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      {renderNewClassModal()}

      <CuteModal
        visible={showEditClassModal}
        onClose={() => {
          setShowEditClassModal(false);
          setEditingClassId(null);
          setEditingClassName('');
        }}
        title="Edit class"
      >
        <TextInput
          placeholder="e.g. CS 101"
          placeholderTextColor={palette.muted}
          value={editingClassName}
          onChangeText={setEditingClassName}
          style={styles.modalInput}
          autoFocus
        />
        <CuteButton
          label="Save"
          onPress={handleSaveEditClass}
          loading={saving}
        />
        <CuteButton
          label="Cancel"
          onPress={() => {
            setShowEditClassModal(false);
            setEditingClassId(null);
            setEditingClassName('');
          }}
          variant="ghost"
        />
      </CuteModal>

      <CuteModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit syllabus text"
      >
        <TextInput
          placeholder="Paste your syllabus here..."
          placeholderTextColor={palette.muted}
          value={editDraft}
          onChangeText={setEditDraft}
          style={[styles.modalInput, styles.editInput]}
          multiline
          autoFocus
        />
        <CuteButton
          label="Save"
          onPress={handleSaveText}
          loading={saving}
        />
        <CuteButton
          label="Cancel"
          onPress={() => setShowEditModal(false)}
          variant="ghost"
        />
      </CuteModal>

      {showProcessing ? (
        <Modal visible animationType="none" onRequestClose={() => {}}>
          <Animated.View 
            style={[
              styles.processingFullScreen,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.processingContent,
                {
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: iconRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}
              >
                <Feather name="loader" size={64} color={palette.plum} />
              </Animated.View>
              <Text style={styles.processingTitle}>Syl is thinking…</Text>
              <Text style={styles.processingSubtitle}>
                {processingMessages[processingMessageIndex]}
              </Text>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    { width: `${Math.max(10, processingProgress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.processingHint}>We'll tuck your syllabus into place.</Text>
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}

      {showTaskOverview ? (
        <Modal visible animationType="slide" onRequestClose={() => setShowTaskOverview(false)}>
          <View style={styles.taskOverviewScreen}>
            <View style={styles.taskOverviewHeader}>
              <Feather name="check-circle" size={48} color={palette.plum} />
              <Text style={styles.taskOverviewTitle}>Tasks Found!</Text>
              <Text style={styles.taskOverviewSubtitle}>
                Syl AI found {foundTasks.length} task{foundTasks.length === 1 ? '' : 's'} in your syllabus and added them to your calendar.
              </Text>
            </View>

            <ScrollView style={styles.taskList} contentContainerStyle={styles.taskListContent}>
              {foundTasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskItemHeader}>
                    <Text style={styles.taskItemTitle}>{task.title}</Text>
                    {task.assignment_type && (
                      <View style={styles.taskTypeBadge}>
                        <Text style={styles.taskTypeText}>{task.assignment_type}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.taskItemDue}>
                    {dayjs(task.due).format('MMM D, YYYY • h:mm A')}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.taskOverviewFooter}>
              <CuteButton 
                label="Got it!" 
                onPress={() => setShowTaskOverview(false)} 
                variant="primary"
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: palette.cream,
    flexGrow: 1,
  },
  subheader: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  placeholder: {
    color: palette.muted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: palette.cream,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  emptySubtitle: {
    color: palette.muted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: palette.text,
  },
  editInput: {
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: 'top',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
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
  summaryText: {
    color: palette.text,
  },
  eventsSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  eventMeta: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontWeight: '600',
    color: palette.text,
  },
  eventDue: {
    color: palette.muted,
    marginTop: spacing.xs / 2,
  },
  eventType: {
    color: palette.plum,
    fontWeight: '600',
  },
  processingFullScreen: {
    flex: 1,
    backgroundColor: palette.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  processingContent: {
    width: '100%',
    maxWidth: 400,
    gap: spacing.lg,
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.plum,
    textAlign: 'center',
  },
  processingSubtitle: {
    fontSize: 18,
    color: palette.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressTrack: {
    height: 12,
    width: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.lavender,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.plum,
  },
  processingHint: {
    color: palette.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyCard: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 2,
    borderColor: palette.lavender,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.plum,
    textAlign: 'center',
  },
  emptyCardSubtitle: {
    fontSize: 16,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  taskOverviewScreen: {
    flex: 1,
    backgroundColor: palette.cream,
    padding: spacing.lg,
  },
  taskOverviewHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  taskOverviewTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.plum,
    textAlign: 'center',
  },
  taskOverviewSubtitle: {
    fontSize: 16,
    color: palette.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  taskItem: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  taskItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    flex: 1,
  },
  taskTypeBadge: {
    backgroundColor: palette.lavender,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.pill,
  },
  taskTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.plum,
  },
  taskItemDue: {
    fontSize: 14,
    color: palette.muted,
  },
  taskOverviewFooter: {
    paddingTop: spacing.md,
  },
});
