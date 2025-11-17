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
          return <Feather name="book-open" size={22} color={color} />;
        }
        if (route.name === 'SylAI') {
          return (
            <View style={[styles.chatIcon, focused && styles.chatIconActive]}>
              <Feather
                name="message-circle"
                size={20}
                color={focused ? palette.white : palette.plum}
              />
            </View>
          );
        }
        return <Feather name="calendar" size={22} color={color} />;
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
    elevation: 5,
    shadowColor: '#DEC0F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 14,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatIcon: {
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FBE4FF',
  },
  chatIconActive: {
    backgroundColor: palette.plum,
  },
});
