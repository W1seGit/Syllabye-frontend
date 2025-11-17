import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { palette, radius, spacing } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const CuteTextField: React.FC<Props> = ({ label, error, style, ...rest }) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.muted}
        style={[styles.input, style, rest.multiline && styles.multiline]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: palette.border,
    fontSize: 16,
    color: palette.text,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  error: {
    color: palette.coral,
    fontSize: 12,
    marginTop: spacing.xs / 2,
  },
});
