import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { renameClass } from '../api';
import { useAppContext } from '../context/AppContext';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import { palette, radius, spacing, typography } from '../theme';

export const OnboardingClassScreen: React.FC = () => {
  const { classes, token, refreshClasses } = useAppContext();
  const defaultClass = useMemo(
    () => classes.find((cls) => cls.name === 'Default'),
    [classes],
  );
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!token || !defaultClass) {
      return;
    }
    if (!className.trim()) {
      Alert.alert('Almost there!', 'Give your very first class a sweet name.');
      return;
    }
    try {
      setLoading(true);
      const name = className.trim();
      await renameClass(token, defaultClass.id, name);
      await refreshClasses();
      Alert.alert('Cute!', `${name} is ready. Let's add the syllabus next.`);
    } catch (error) {
      Alert.alert('Oops', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FDE2FF', '#FFF8F1']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.kicker}>Step 1 of 2</Text>
          <Text style={styles.title}>Name your first cozy class</Text>
          <Text style={styles.subtitle}>
            We created a starter class for you. Give it a nickname so Syl can remember it.
          </Text>

          <CuteTextField
            label="Class name"
            placeholder="e.g. Cozy Calculus"
            value={className}
            onChangeText={setClassName}
          />

          <CuteButton label="Save & continue" onPress={handleContinue} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    color: palette.muted,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
});
