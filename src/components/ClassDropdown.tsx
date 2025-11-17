import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { ClassSummary } from '../types';
import { palette, radius, spacing } from '../theme';

interface Props {
  classes: ClassSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddClass?: () => void;
}

export const ClassDropdown: React.FC<Props> = ({ classes, selectedId, onSelect, onAddClass }) => {
  const [open, setOpen] = useState(false);

  const selectedName = useMemo(() => {
    return classes.find((cls) => cls.id === selectedId)?.name || 'Choose class';
  }, [classes, selectedId]);

  const handleSelect = (id: number) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {selectedName}
        </Text>
        <Feather name="chevron-down" size={20} color={palette.plum} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose a class</Text>
            <FlatList
              data={classes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No classes yet. Add one to get started!</Text>
              }
            />
            {onAddClass ? (
              <TouchableOpacity style={styles.addButton} onPress={onAddClass}>
                <Feather name="plus" color={palette.plum} size={18} />
                <Text style={styles.addLabel}>New class</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  triggerLabel: {
    color: palette.text,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(52, 28, 63, 0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    color: palette.text,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  itemSelected: {
    backgroundColor: palette.lavender,
  },
  itemText: {
    fontSize: 16,
    color: palette.text,
  },
  itemTextSelected: {
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  addLabel: {
    color: palette.plum,
    fontWeight: '600',
  },
  emptyText: {
    color: palette.muted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  closeLabel: {
    color: palette.muted,
    fontWeight: '600',
  },
});
