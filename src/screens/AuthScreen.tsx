import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { loginUser, registerUser } from '../api';
import { useAppContext } from '../context/AppContext';
import { CuteButton } from '../components/CuteButton';
import { CuteTextField } from '../components/CuteTextField';
import { palette, radius, spacing, typography } from '../theme';

type Mode = 'login' | 'register';

export const AuthScreen: React.FC = () => {
  const { setSession } = useAppContext();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Hold on ☁️', 'Please enter a dreamy username and password.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'register') {
        const newUser = await registerUser(username.trim(), password);
        const auth = await loginUser(username.trim(), password);
        await setSession(auth.access_token, newUser);
      } else {
        const auth = await loginUser(username.trim(), password);
        await setSession(auth.access_token, { username: username.trim() });
      }
    } catch (error) {
      Alert.alert('Oh no!', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFF8F1', '#FDE1F3']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Syllabye</Text>
          <Text style={styles.subtitle}>
            Cozy up your semester. {mode === 'login' ? 'Sign in to continue.' : 'Create a snuggly home for your syllabi.'}
          </Text>

          <CuteTextField
            label="Username"
            autoCapitalize="none"
            placeholder="sunny_student"
            value={username}
            onChangeText={setUsername}
          />

          <CuteTextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <CuteButton
            label={mode === 'login' ? 'Sign In' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <Text style={styles.switchText}>
            {mode === 'login' ? "New here?" : 'Already comfy?'}{' '}
            <Text style={styles.switchLink} onPress={toggleMode}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </Text>
          </Text>
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
    ...{
      shadowColor: '#B59BCB',
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  switchText: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: palette.muted,
  },
  switchLink: {
    color: palette.plum,
    fontWeight: '700',
  },
});
