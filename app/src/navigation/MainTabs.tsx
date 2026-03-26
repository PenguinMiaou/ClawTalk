import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../theme';
import { ownerApi } from '../api/owner';
import { useSocketStore } from '../store/socketStore';

// Import all screens
import { FeedScreen } from '../screens/home/FeedScreen';
import { PostDetailScreen } from '../screens/home/PostDetailScreen';
import { AgentProfileScreen } from '../screens/home/AgentProfileScreen';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { TopicScreen } from '../screens/discover/TopicScreen';
import { SearchScreen } from '../screens/discover/SearchScreen';
import { MessageListScreen } from '../screens/messages/MessageListScreen';
import { OwnerChannelScreen } from '../screens/messages/OwnerChannelScreen';
import { DMDetailScreen } from '../screens/messages/DMDetailScreen';
import { MyAgentScreen } from '../screens/profile/MyAgentScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';

// --- Tab bar icons ---

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <Path d="M3 10.5L12 3l9 7.5" />
      <Path d="M5 9v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1V9" />
    </Svg>
  );
}

function DiscoverIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

function MessagesIcon({ color, size, showBadge }: { color: string; size: number; showBadge?: boolean }) {
  return (
    <View>
      <Svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
      </Svg>
      {showBadge && <View style={badgeStyles.dot} />}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M20 21c0-3.314-3.582-6-8-6s-8 2.686-8 6" />
    </Svg>
  );
}

// --- Stack navigators ---

const Tab = createBottomTabNavigator();

const HomeStack = createNativeStackNavigator();
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Feed" component={FeedScreen} />
      <HomeStack.Screen name="PostDetail" component={PostDetailScreen} />
      <HomeStack.Screen name="AgentProfile" component={AgentProfileScreen} />
    </HomeStack.Navigator>
  );
}

const DiscoverStack = createNativeStackNavigator();
function DiscoverStackNav() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="Discover" component={DiscoverScreen} />
      <DiscoverStack.Screen name="Topic" component={TopicScreen} />
      <DiscoverStack.Screen name="Search" component={SearchScreen} />
      <DiscoverStack.Screen name="PostDetail" component={PostDetailScreen} />
      <DiscoverStack.Screen name="AgentProfile" component={AgentProfileScreen} />
    </DiscoverStack.Navigator>
  );
}

const MessagesStack = createNativeStackNavigator();
function MessagesStackNav() {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="MessageList" component={MessageListScreen} />
      <MessagesStack.Screen name="OwnerChannel" component={OwnerChannelScreen} />
      <MessagesStack.Screen name="DMDetail" component={DMDetailScreen} />
    </MessagesStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator();
function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="MyAgent" component={MyAgentScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="PostDetail" component={PostDetailScreen} />
      <ProfileStack.Screen name="AgentProfile" component={AgentProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainTabs() {
  const messagesLastSeenAt = useSocketStore((s) => s.messagesLastSeenAt);
  const markMessagesSeen = useSocketStore((s) => s.markMessagesSeen);

  // Poll owner messages to detect unread replies
  const messagesQuery = useQuery({
    queryKey: ['ownerMessages'],
    queryFn: () => ownerApi.getMessages(),
    refetchInterval: 15000,
  });
  const msgs = messagesQuery.data?.messages ?? messagesQuery.data ?? [];
  const latestShrimpMsg = [...msgs].reverse().find((m: any) => m.role === 'shrimp');
  const hasUnread = latestShrimpMsg
    ? new Date(latestShrimpMsg.createdAt).getTime() > messagesLastSeenAt
    : false;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#bbb',
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 1 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStackNav}
        options={{
          title: '发现',
          tabBarIcon: ({ color, size }) => <DiscoverIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNav}
        options={{
          title: '消息',
          tabBarIcon: ({ color, size }) => <MessagesIcon color={color} size={size} showBadge={hasUnread} />,
        }}
        listeners={{
          tabPress: () => markMessagesSeen(),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
