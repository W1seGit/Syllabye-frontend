import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {
  createClass,
  updateSyllabusText,
  uploadSyllabusPdf,
  uploadSyllabusImages,
  deleteSyllabusPdf,
  deleteSyllabusImage,
} from '../api';
import { useAppContext } from '../context/AppContext';
import { ClassDropdown } from '../components/ClassDropdown';
import { CuteButton } from '../components/CuteButton';
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
  const [textDraft, setTextDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const currentClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId),
    [classes, selectedClassId],
  );
  const syllabus = selectedClassId ? syllabusCache[selectedClassId] : undefined;

  useEffect(() => {
    if (selectedClassId) {
      fetchSyllabusForClass(selectedClassId).catch(() => null);
    }
  }, [selectedClassId, fetchSyllabusForClass]);

  const handleSaveText = async () => {
    if (!token || !selectedClassId || !textDraft.trim()) {
      Alert.alert('Missing details', 'Add text before saving.');
      return;
    }
    try {
      setSaving(true);
      await updateSyllabusText(token, selectedClassId, textDraft);
      await fetchSyllabusForClass(selectedClassId);
      setTextDraft('');
    } catch (error) {
      Alert.alert('Unable to save', (error as Error).message);
    } finally {
      setSaving(false);
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
      await uploadSyllabusPdf(
        token,
        selectedClassId,
        asset.uri,
        asset.name || 'syllabus.pdf',
        asset.mimeType || 'application/pdf',
      );
      await fetchSyllabusForClass(selectedClassId);
    } catch (error) {
      Alert.alert('PDF upload failed', (error as Error).message);
    } finally {
      setUploading(false);
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
    } catch (error) {
      Alert.alert('Image upload failed', (error as Error).message);
    } finally {
      setUploading(false);
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
      await refreshClasses();
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
        <Text style={styles.header}>Syllabuses</Text>
        <Text style={styles.subheader}>Keep every class snugly organized.</Text>

        <ClassDropdown
          classes={classes}
          selectedId={selectedClassId}
          onSelect={(id) => selectClass(id)}
          onAddClass={() => setShowNewClassModal(true)}
        />

        {currentClass ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Update {currentClass.name}</Text>
            <CuteTextField
              label="Add text"
              placeholder="Important details..."
              value={textDraft}
              onChangeText={setTextDraft}
              multiline
            />
            <CuteButton label="Save text" onPress={handleSaveText} loading={saving} />
            <View style={styles.buttonRow}>
              <CuteButton label="Attach PDF" onPress={handleUploadPdf} loading={uploading} />
              <CuteButton label="Add images" onPress={handleUploadImages} loading={uploading} />
            </View>
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
      </ScrollView>
      {renderNewClassModal()}
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
  header: {
    ...typography.title,
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
  },
});
