import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { ClassSyllabus } from '../types';
import { palette, radius, spacing } from '../theme';

interface Props {
  syllabus: ClassSyllabus;
  onDeletePdf?: () => void;
  onDeleteImage?: (imageId: number) => void;
}

export const SyllabusPreview: React.FC<Props> = ({ syllabus, onDeletePdf, onDeleteImage }) => {
  const hasText = Boolean(syllabus.text);
  const hasPdf = Boolean(syllabus.pdf_path);
  const hasImages = syllabus.images?.length > 0;

  if (!hasText && !hasPdf && !hasImages) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No syllabus uploaded yet. Add text, a PDF, or cozy snapshots to unlock magic ✨
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {hasText ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="book-open" size={18} color={palette.plum} />
            <Text style={styles.sectionTitle}>Text notes</Text>
          </View>
          <Text style={styles.textBody}>{syllabus.text?.trim()}</Text>
        </View>
      ) : null}

      {hasPdf ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={18} color={palette.plum} />
            <Text style={styles.sectionTitle}>PDF document</Text>
          </View>
          <View style={styles.pdfRow}>
            <Text style={styles.pdfLabel} numberOfLines={2}>
              {extractFileName(syllabus.pdf_path!)}
            </Text>
            <View style={styles.pdfActions}>
              <TouchableOpacity
                onPress={() => handleOpenPath(syllabus.pdf_path!)}
                style={styles.iconButton}
              >
                <Feather name="external-link" color={palette.plum} size={18} />
              </TouchableOpacity>
              {onDeletePdf ? (
                <TouchableOpacity onPress={onDeletePdf} style={styles.iconButton}>
                  <Feather name="trash" color={palette.coral} size={18} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {hasImages ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="image" size={18} color={palette.plum} />
            <Text style={styles.sectionTitle}>Reference images</Text>
          </View>
          <View style={styles.imageGrid}>
            {syllabus.images.map((img) => {
              const isRemote = /^https?:\/\//i.test(img.file_path);
              return (
                <View key={img.id} style={styles.imageCard}>
                  {isRemote ? (
                    <Image source={{ uri: img.file_path }} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Feather name="image" color={palette.muted} size={28} />
                      <Text style={styles.imageHint}>Stored on server</Text>
                    </View>
                  )}
                  {onDeleteImage ? (
                    <TouchableOpacity
                      style={styles.deleteBadge}
                      onPress={() => onDeleteImage(img.id)}
                    >
                      <Feather name="x" size={14} color={palette.white} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const extractFileName = (path: string) => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

const handleOpenPath = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    Linking.openURL(path).catch(() => null);
  }
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.lg,
  },
  section: {
    backgroundColor: palette.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.plum,
  },
  textBody: {
    color: palette.text,
    lineHeight: 22,
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pdfLabel: {
    flex: 1,
    color: palette.text,
  },
  pdfActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: palette.cream,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: palette.cream,
  },
  imageHint: {
    marginTop: spacing.xs / 2,
    color: palette.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  deleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: palette.coral,
    borderRadius: radius.pill,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    backgroundColor: palette.cream,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  emptyText: {
    textAlign: 'center',
    color: palette.muted,
    lineHeight: 20,
  },
});
