import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { ownerApi } from '../../api/owner';
import { agentsApi } from '../../api/agents';
import { MessageBubble } from '../../components/MessageBubble';
import { OwnerActionBar } from '../../components/OwnerActionBar';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { useSocketStore } from '../../store/socketStore';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../theme';

interface Message {
  id: string;
  role: 'owner' | 'shrimp';
  content: string;
  createdAt: string;
  messageType?: string;
}

function TypingDot({ delay: d }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    const anim = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      ),
    );
    opacity.value = anim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[typingStyles.dot, style]} />;
}

function TypingIndicator() {
  return (
    <View style={typingStyles.row}>
      <View style={typingStyles.bubble}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  );
}

export function OwnerChannelScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const connected = useSocketStore((s) => s.connected);
  const typingAgentId = useSocketStore((s) => s.typingAgentId);
  const setTyping = useSocketStore((s) => s.setTyping);
  const markOwnerChannelRead = useSocketStore((s) => s.markOwnerChannelRead);
  const [input, setInput] = useState('');
  const sendScale = useSharedValue(1);
  const sendBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // Mark owner channel as read on mount
  useEffect(() => { markOwnerChannelRead(); }, [markOwnerChannelRead]);
  const flatListRef = useRef<FlatList>(null);

  const agentQuery = useQuery({
    queryKey: ['myAgent'],
    queryFn: () => agentsApi.getProfile('me'),
  });

  const agentName = agentQuery.data?.name || '我的虾虾';
  const agentOnline = agentQuery.data?.is_online ?? false;
  const agentColor = agentQuery.data?.avatar_color;
  const agentId = agentQuery.data?.id;
  const isTyping = typingAgentId === agentId;

  const messagesQuery = useQuery({
    queryKey: ['ownerMessages'],
    queryFn: () => ownerApi.getMessages(),
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => ownerApi.sendMessage(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerMessages'] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ messageId, actionType }: { messageId: string; actionType: string }) =>
      ownerApi.action(messageId, actionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerMessages'] });
    },
  });

  const rawData = messagesQuery.data;
  const messages: Message[] = rawData?.messages ?? rawData ?? [];
  const agentLastReadAt = rawData?.agent_last_read_at
    ? new Date(rawData.agent_last_read_at).getTime()
    : 0;

  // Clear typing when agent actually sends a message (belt-and-suspenders with socket)
  useEffect(() => {
    if (isTyping && messages.length > 0) {
      const latest = messages[messages.length - 1];
      if (latest.role === 'shrimp') {
        setTyping(null);
      }
    }
  }, [messages, isTyping, setTyping]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    sendScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 }),
    );
    setInput('');
    sendMutation.mutate(text);
  }, [input, sendMutation, sendScale]);

  const handleAction = useCallback(
    (messageId: string, type: 'approve' | 'reject' | 'edit') => {
      actionMutation.mutate({ messageId, actionType: type });
    },
    [actionMutation],
  );

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isRead = item.role === 'owner' && agentLastReadAt > 0 &&
        new Date(item.createdAt).getTime() <= agentLastReadAt;

      return (
        <View>
          <MessageBubble
            role={item.role}
            content={item.content}
            time={formatTime(item.createdAt)}
            messageType={item.messageType}
          />
          {item.role === 'owner' && (
            <Text style={styles.readStatus}>
              {isRead ? '已读' : '已送达'}
            </Text>
          )}
          {item.messageType === 'approval_request' && (
            <OwnerActionBar
              messageId={item.id}
              onAction={(type) => handleAction(item.id, type)}
            />
          )}
        </View>
      );
    },
    [handleAction, agentLastReadAt],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <ShrimpAvatar size={36} color={agentColor} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{agentName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, agentOnline && styles.statusOnline]} />
            <Text style={styles.statusText}>{agentOnline ? '在线' : '离线'}</Text>
          </View>
        </View>
        <View style={styles.channelBadge}>
          <Text style={styles.channelBadgeText}>主人通道</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messagesQuery.isLoading ? (
          <LoadingView />
        ) : messagesQuery.isError ? (
          <ErrorView onRetry={() => messagesQuery.refetch()} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>和你的虾虾说点什么吧</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="给你的虾虾发指令..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            <Animated.View style={sendBtnAnimStyle}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                  stroke={colors.white}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    marginRight: 4,
  },
  statusOnline: {
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  channelBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  channelBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
    // inverted list flips this
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 15,
    maxHeight: 100,
    color: colors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  readStatus: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
});

const typingStyles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
  },
});
