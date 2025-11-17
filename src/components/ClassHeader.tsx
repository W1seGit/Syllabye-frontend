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
  onEditClass?: (id: number) => void;
  onDeleteClass?: (id: number) => void;
}

export const ClassHeader: React.FC<Props> = ({ classes, selectedId, onSelect, onAddClass, onEditClass, onDeleteClass }) => {
  const [open, setOpen] = useState(false);

  const selectedName = useMemo(() => {
    return classes.find((cls) => cls.id === selectedId)?.name || 'Choose class';
  }, [classes, selectedId]);

  const handleSelect = (id: number) => {
    onSelect(id);
    setOpen(false);
  };

  const handleAddClass = () => {
    setOpen(false);
    onAddClass?.();
  };

  return (
    <>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.header} 
          onPress={() => setOpen(true)} 
          activeOpacity={0.7}
        >
          <Text style={styles.headerText} numberOfLines={1}>
            {selectedName}
          </Text>
          <Feather name="chevron-down" size={24} color={palette.text} style={styles.chevron} />
        </TouchableOpacity>
        
        {selectedId && (onEditClass || onDeleteClass) && (
          <View style={styles.actions}>
            {onEditClass && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => onEditClass(selectedId)}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={20} color={palette.plum} />
              </TouchableOpacity>
            )}
            {onDeleteClass && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => onDeleteClass(selectedId)}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={20} color={palette.plum} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Switch class</Text>
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
                    {isSelected && (
                      <Feather name="check" size={18} color={palette.plum} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No classes yet. Add one to get started!</Text>
              }
            />
            {onAddClass ? (
              <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
  },
  itemTextSelected: {
    fontWeight: '700',
    color: palette.plum,
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
