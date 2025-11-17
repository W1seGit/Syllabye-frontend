import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

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
    <View style={styles.container}>
      {/* Top gradient section with illustration */}
      <LinearGradient colors={['#E8D5F2', '#F3E5F5']} style={styles.topSection}>
        <View style={styles.illustration}>
          {/* Center AI icon */}
          <View style={styles.iconCircle}>
            <Feather name="message-square" size={48} color={palette.plum} />
          </View>
          
          {/* Dotted connecting lines */}
          <View style={[styles.dottedLine, styles.lineTopLeft]} />
          <View style={[styles.dottedLine, styles.lineTopRight]} />
          <View style={[styles.dottedLine, styles.lineBottomRight]} />
          <View style={[styles.dottedLine, styles.lineBottomLeft]} />
          
          {/* Connected icons with varied positions and colors */}
          <View style={[styles.iconCircleSmall, styles.iconTopLeft, { backgroundColor: '#FFE6F0' }]}>
            <Feather name="book-open" size={20} color={palette.coral} />
          </View>
          <View style={[styles.iconCircleSmall, styles.iconTopRight, { backgroundColor: '#E8F4FF' }]}>
            <Feather name="calendar" size={20} color="#5B9BD5" />
          </View>
          <View style={[styles.iconCircleSmall, styles.iconBottomRight, { backgroundColor: '#E8FFE8' }]}>
            <Feather name="check-circle" size={20} color="#6BBF6B" />
          </View>
          <View style={[styles.iconCircleSmall, styles.iconBottomLeft, { backgroundColor: '#FFF4E6' }]}>
            <Feather name="clock" size={20} color="#F7A84A" />
          </View>
        </View>
      </LinearGradient>

      {/* White form section with curved top */}
      <KeyboardAvoidingView
        style={styles.formSection}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContent}>
            <Text style={styles.title}>Welcome to Syllabye</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' 
                ? 'Your cozy study companion ✨' 
                : 'Create your study sanctuary 🌸'}
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
              label={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />

            <Text style={styles.switchText}>
              {mode === 'login' ? "New here?" : 'Already have an account?'}{' '}
              <Text style={styles.switchLink} onPress={toggleMode}>
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  topSection: {
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    width: 180,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.plum,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 2,
  },
  dottedLine: {
    position: 'absolute',
    borderStyle: 'dotted',
    borderColor: palette.plum,
    opacity: 0.3,
  },
  lineTopLeft: {
    width: 50,
    height: 50,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    top: 15,
    left: 15,
    transform: [{ rotate: '0deg' }],
  },
  lineTopRight: {
    width: 50,
    height: 50,
    borderTopWidth: 2,
    borderRightWidth: 2,
    top: 20,
    right: 15,
    transform: [{ rotate: '0deg' }],
  },
  lineBottomRight: {
    width: 50,
    height: 50,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: 15,
    right: 20,
    transform: [{ rotate: '0deg' }],
  },
  lineBottomLeft: {
    width: 50,
    height: 50,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    bottom: 20,
    left: 15,
    transform: [{ rotate: '0deg' }],
  },
  iconCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    zIndex: 1,
  },
  iconTopLeft: {
    top: 5,
    left: 10,
  },
  iconTopRight: {
    top: 10,
    right: 5,
  },
  iconBottomRight: {
    bottom: 5,
    right: 10,
  },
  iconBottomLeft: {
    bottom: 10,
    left: 5,
  },
  formSection: {
    flex: 1,
    backgroundColor: palette.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -40,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContent: {
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.plum,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: palette.text,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: spacing.xl,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  switchText: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: palette.muted,
    fontSize: 14,
  },
  switchLink: {
    color: palette.plum,
    fontWeight: '700',
  },
});
