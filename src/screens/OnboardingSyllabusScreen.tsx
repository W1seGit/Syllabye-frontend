import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {
  updateSyllabusText,
  uploadSyllabusPdf,
  uploadSyllabusImages,
  deleteSyllabusPdf,
  deleteSyllabusImage,
} from '../api';
import { useAppContext } from '../context/AppContext';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import { SyllabusPreview } from '../components/SyllabusPreview';
import { palette, radius, spacing, typography } from '../theme';

export const OnboardingSyllabusScreen: React.FC = () => {
  const {
    token,
    classes,
    syllabusCache,
    fetchSyllabusForClass,
    setSkipForClass,
    skipMap,
  } = useAppContext();
  const [textValue, setTextValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const starterClass = useMemo(() => classes[0], [classes]);
  const classId = starterClass?.id;
  const className = starterClass?.name || 'your class';
  const syllabus = classId ? syllabusCache[classId] : undefined;

  useEffect(() => {
    if (classId && !skipMap[classId]) {
      fetchSyllabusForClass(classId).catch(() => null);
    }
  }, [classId, fetchSyllabusForClass, skipMap]);

  const hasContent =
    Boolean(syllabus?.text?.trim()) ||
    Boolean(syllabus?.pdf_path) ||
    Boolean(syllabus?.images?.length);

  const handleSaveText = async () => {
    if (!token || !classId || !textValue.trim()) {
      Alert.alert('Add notes', 'Paste at least a few words from your syllabus.');
      return;
    }
    try {
      setLoading(true);
      await updateSyllabusText(token, classId, textValue);
      await fetchSyllabusForClass(classId);
      setTextValue('');
    } catch (error) {
      Alert.alert('Unable to save', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!token || !classId) {
      return;
    }
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
        classId,
        asset.uri,
        asset.name || 'syllabus.pdf',
        asset.mimeType || 'application/pdf',
      );
      await fetchSyllabusForClass(classId);
    } catch (error) {
      Alert.alert('PDF upload failed', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async () => {
    if (!token || !classId) {
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled || !result.assets?.length) return;
      setUploading(true);
      await uploadSyllabusImages(
        token,
        classId,
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `photo-${index}.jpg`,
          type: asset.type === 'image' ? asset.mimeType || 'image/jpeg' : 'image/jpeg',
        })),
      );
      await fetchSyllabusForClass(classId);
    } catch (error) {
      Alert.alert('Image upload failed', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    if (!classId) return;
    await setSkipForClass(classId, true);
    Alert.alert('All set', 'You can always come back to add your syllabus later.');
  };

  const handleContinue = async () => {
    if (!classId) return;
    if (!hasContent) {
      Alert.alert('Almost!', 'Upload at least one piece of your syllabus or tap skip.');
      return;
    }
    await setSkipForClass(classId, false);
    Alert.alert('Yay!', 'Your class is unlocked. Jump into the app!');
  };

  const handleDeletePdf = async () => {
    if (!token || !classId) return;
    try {
      setUploading(true);
      await deleteSyllabusPdf(token, classId);
      await fetchSyllabusForClass(classId);
    } catch (error) {
      Alert.alert('Oops', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!token || !classId) return;
    try {
      setUploading(true);
      await deleteSyllabusImage(token, classId, imageId);
      await fetchSyllabusForClass(classId);
    } catch (error) {
      Alert.alert('Oops', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFF8F1', '#E8F3FF']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.kicker}>Step 2 of 2</Text>
            <Text style={styles.title}>Drop in your {className} syllabus</Text>
            <Text style={styles.subtitle}>
              Paste key text, upload a PDF, or add cozy photos. You can always update this later.
            </Text>

            <CuteTextField
              label="Paste text"
              placeholder="Important dates, professor office hours..."
              value={textValue}
              onChangeText={setTextValue}
              multiline
            />

            <CuteButton
              label="Save text"
              onPress={handleSaveText}
              loading={loading}
              variant="secondary"
            />

            <View style={styles.actionsRow}>
              <CuteButton label="Attach PDF" onPress={handleUploadPdf} loading={uploading} />
              <CuteButton label="Add images" onPress={handleUploadImages} loading={uploading} />
            </View>

            {syllabus ? (
              <SyllabusPreview
                syllabus={syllabus}
                onDeletePdf={syllabus.pdf_path ? handleDeletePdf : undefined}
                onDeleteImage={syllabus.images?.length ? handleDeleteImage : undefined}
              />
            ) : null}

            <View style={styles.footer}>
              <CuteButton
                label={hasContent ? 'Looks good!' : 'Skip for now'}
                onPress={hasContent ? handleContinue : handleSkip}
                variant={hasContent ? 'primary' : 'ghost'}
              />
              {hasContent ? (
                <Text style={styles.hintText}>You can always add more later.</Text>
              ) : (
                <Text style={styles.hintText}>Skipping keeps the rest of the app locked in ✨</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  kicker: {
    color: palette.muted,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  hintText: {
    color: palette.muted,
    fontSize: 13,
  },
});
