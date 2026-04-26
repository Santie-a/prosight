import React from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Tabs } from 'expo-router';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function TabLayout() {
  const { theme, fontSize } = useAccessibility();

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,

        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Math.max(90, fontSize.button + 50), 
          paddingBottom: 40,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.button,
          marginBottom: 4,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontSize: fontSize.title,
          color: theme.text,
        },
      }}
    >
      <Tabs.Screen
        name="vision"
        options={{
          title: 'Vision',
          tabBarLabel: 'Vision',
          tabBarIcon: ({ color }) => <TabBarIcon name="eye" color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarLabel: 'Documents',
          tabBarIcon: ({ color }) => <TabBarIcon name="document" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
