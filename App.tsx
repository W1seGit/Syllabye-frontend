import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { AppProvider, useAppContext } from './src/context/AppContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { SyllabusScreen } from './src/screens/SyllabusScreen';
import { SylAiScreen } from './src/screens/SylAiScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import type { MainTabParamList } from './src/navigation/types';
import { palette } from './src/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.cream,
  },
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: palette.plum,
      tabBarInactiveTintColor: palette.muted,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ focused, color }) => {
        if (route.name === 'Syllabus') {
          return <Feather name="book-open" size={24} color={color} />;
        }
        if (route.name === 'SylAI') {
          return (
            <View style={[styles.chatBubble, focused && styles.chatBubbleActive]}>
              <Feather
                name="message-square"
                size={24}
                color={focused ? palette.white : palette.plum}
              />
            </View>
          );
        }
        return <Feather name="calendar" size={24} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Syllabus" component={SyllabusScreen} />
    <Tab.Screen
      name="SylAI"
      component={SylAiScreen}
      options={{ tabBarLabel: 'Syl AI' }}
    />
    <Tab.Screen name="Calendar" component={CalendarScreen} />
  </Tab.Navigator>
);

const AppContent = () => {
  const { initializing, token } = useAppContext();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={palette.plum} />
      </View>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  return <MainTabs />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <AppContent />
          </SafeAreaView>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.cream,
  },
  tabBar: {
    backgroundColor: palette.white,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
    height: 70,
    paddingBottom: 8,
    paddingTop: 4,
    marginHorizontal: 40,
    borderRadius: 24,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  chatBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 4,
    borderColor: palette.white,
    shadowColor: palette.plum,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  chatBubbleActive: {
    backgroundColor: palette.plum,
  },
});
