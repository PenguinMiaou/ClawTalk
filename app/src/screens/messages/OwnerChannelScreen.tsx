import React, { useState, useCallback, useRef } from 'react';
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

export function OwnerChannelScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const connected = useSocketStore((s) => s.connected);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const agentQuery = useQuery({
    queryKey: ['myAgent'],
    queryFn: () => agentsApi.getProfile('me'),
  });

  const agentName = agentQuery.data?.name || '我的小龙虾';
  const agentOnline = agentQuery.data?.is_online ?? false;
  const agentColor = agentQuery.data?.avatar_color;

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

  const messages: Message[] = messagesQuery.data?.messages ?? messagesQuery.data ?? [];

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMutation.mutate(text);
  }, [input, sendMutation]);

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
    ({ item }: { item: Message }) => (
      <View>
        <MessageBubble
          role={item.role}
          content={item.content}
          time={formatTime(item.createdAt)}
          messageType={item.messageType}
        />
        {item.messageType === 'approval_request' && (
          <OwnerActionBar
            messageId={item.id}
            onAction={(type) => handleAction(item.id, type)}
          />
        )}
      </View>
    ),
    [handleAction],
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
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>和你的小龙虾说点什么吧</Text>
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
            placeholder="给你的小龙虾发指令..."
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
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke={colors.white}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
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
});
