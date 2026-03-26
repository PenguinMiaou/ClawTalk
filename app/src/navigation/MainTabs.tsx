import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../theme';
import { ownerApi } from '../api/owner';
import { useSocketStore } from '../store/socketStore';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const INACTIVE_COLOR = '#bbb';
const ACTIVE_COLOR = colors.primary;
const ICON_SPRING = { damping: 14, stiffness: 160 };

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

// --- Animated Tab Icon wrapper ---

function useTabAnimation(focused: boolean) {
  const progress = useDerivedValue(() =>
    withSpring(focused ? 1 : 0, ICON_SPRING)
  );
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.08 }],
  }));
  const iconColor = useDerivedValue(() =>
    interpolateColor(progress.value, [0, 1], [INACTIVE_COLOR, ACTIVE_COLOR])
  );
  return { scaleStyle, iconColor };
}

// --- Tab bar icons ---

function HomeIcon({ focused, size }: { focused: boolean; size: number }) {
  const { scaleStyle, iconColor } = useTabAnimation(focused);
  const animatedProps = useAnimatedProps(() => ({
    stroke: iconColor.value,
  }));
  return (
    <Animated.View style={scaleStyle}>
      <AnimatedSvg width={size} height={size} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" animatedProps={animatedProps}>
        <Path d="M3 10.5L12 3l9 7.5" />
        <Path d="M5 9v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1V9" />
      </AnimatedSvg>
    </Animated.View>
  );
}

function DiscoverIcon({ focused, size }: { focused: boolean; size: number }) {
  const { scaleStyle, iconColor } = useTabAnimation(focused);
  const animatedProps = useAnimatedProps(() => ({
    stroke: iconColor.value,
  }));
  return (
    <Animated.View style={scaleStyle}>
      <AnimatedSvg width={size} height={size} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" animatedProps={animatedProps}>
        <Circle cx={11} cy={11} r={7} />
        <Path d="M21 21l-4.35-4.35" />
      </AnimatedSvg>
    </Animated.View>
  );
}

function MessagesIcon({ focused, size, showBadge }: { focused: boolean; size: number; showBadge?: boolean }) {
  const { scaleStyle, iconColor } = useTabAnimation(focused);
  const animatedProps = useAnimatedProps(() => ({
    stroke: iconColor.value,
  }));
  return (
    <Animated.View style={scaleStyle}>
      <View>
        <AnimatedSvg width={size} height={size} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" animatedProps={animatedProps}>
          <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
        </AnimatedSvg>
        {showBadge && <View style={badgeStyles.dot} />}
      </View>
    </Animated.View>
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

function ProfileIcon({ focused, size }: { focused: boolean; size: number }) {
  const { scaleStyle, iconColor } = useTabAnimation(focused);
  const animatedProps = useAnimatedProps(() => ({
    stroke: iconColor.value,
  }));
  return (
    <Animated.View style={scaleStyle}>
      <AnimatedSvg width={size} height={size} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" animatedProps={animatedProps}>
        <Circle cx={12} cy={8} r={4} />
        <Path d="M20 21c0-3.314-3.582-6-8-6s-8 2.686-8 6" />
      </AnimatedSvg>
    </Animated.View>
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
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 4 },
        tabBarIconStyle: { width: 28, height: 28 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          title: '首页',
          tabBarIcon: ({ focused, size }) => <HomeIcon focused={focused} size={size} />,
        }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStackNav}
        options={{
          title: '发现',
          tabBarIcon: ({ focused, size }) => <DiscoverIcon focused={focused} size={size} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNav}
        options={{
          title: '消息',
          tabBarIcon: ({ focused, size }) => <MessagesIcon focused={focused} size={size} showBadge={hasUnread} />,
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
          tabBarIcon: ({ focused, size }) => <ProfileIcon focused={focused} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
