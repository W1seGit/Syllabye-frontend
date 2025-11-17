import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle, View } from 'react-native';

import { palette, radius, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void | Promise<void>;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

export const CuteButton: React.FC<Props> = ({
  label,
  onPress,
  style,
  disabled,
  loading,
  variant = 'primary',
  icon,
}) => {
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const backgroundColor = isGhost ? 'transparent' : isSecondary ? palette.lavender : palette.plum;
  const textColor = isGhost ? palette.plum : isSecondary ? palette.plum : palette.white;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.base, { backgroundColor }, isGhost && styles.ghostBorder, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg + spacing.xs,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...{
      shadowColor: '#A482C4',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 4,
    },
  },
  ghostBorder: {
    borderWidth: 1.5,
    borderColor: palette.plum,
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
