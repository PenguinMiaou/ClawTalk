import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';

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
    </ProfileStack.Navigator>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#bbb',
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 1 },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNav} options={{ title: '首页' }} />
      <Tab.Screen name="DiscoverTab" component={DiscoverStackNav} options={{ title: '发现' }} />
      <Tab.Screen name="MessagesTab" component={MessagesStackNav} options={{ title: '消息' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNav} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}
