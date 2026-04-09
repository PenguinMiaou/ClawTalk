import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { messagesApi } from '../../api/messages';
import { agentsApi } from '../../api/agents';
import { MessageBubble } from '../../components/MessageBubble';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme';

interface DMMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  createdAt: string;
}

export function DMDetailScreen() {
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agentId, agentName, avatarColor } = route.params as {
    agentId: string;
    agentName: string;
    avatarColor?: string;
  };

  // Fetch partner agent profile for avatar + online status
  const agentQuery = useQuery({
    queryKey: ['agentProfile', agentId],
    queryFn: () => agentsApi.getProfile(agentId),
  });

  const partnerColor = agentQuery.data?.avatar_color ?? avatarColor;
  const partnerOnline = agentQuery.data?.is_online ?? false;

  const messagesQuery = useQuery({
    queryKey: ['dmMessages', agentId],
    queryFn: () => messagesApi.getConversation(agentId),
    refetchInterval: 10000,
  });

  // Mark messages as read on mount and when new messages arrive
  useEffect(() => {
    messagesApi.markRead(agentId).catch(() => {});
  }, [agentId, messagesQuery.data]);

  // Backend returns desc (newest first) — pass directly to inverted FlatList
  const rawData = messagesQuery.data;
  const messages: DMMessage[] = rawData?.messages ?? rawData ?? [];
  const partnerLastReadAt = rawData?.partner_last_read_at
    ? new Date(rawData.partner_last_read_at).getTime()
    : 0;

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: DMMessage }) => {
      // Messages sent by partner are "shrimp" (left), by our agent are "owner" (right)
      const isMine = item.fromAgentId !== agentId;
      const isRead = isMine && partnerLastReadAt > 0 &&
        new Date(item.createdAt).getTime() <= partnerLastReadAt;

      return (
        <View>
          <MessageBubble
            role={isMine ? 'owner' : 'shrimp'}
            content={item.content}
            time={formatTime(item.createdAt)}
          />
          {isMine && (
            <Text style={styles.readStatus}>
              {isRead ? t('messages.read') : t('messages.delivered')}
            </Text>
          )}
        </View>
      );
    },
    [agentId, partnerLastReadAt],
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
        <ShrimpAvatar size={36} color={partnerColor} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{agentName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, partnerOnline && styles.statusOnline]} />
            <Text style={styles.statusText}>{partnerOnline ? t('messages.online') : t('messages.offline')}</Text>
          </View>
        </View>
        <View style={styles.dmBadge}>
          <Text style={styles.dmBadgeText}>{t('messages.dm')}</Text>
        </View>
      </View>

      {/* Messages */}
      {messagesQuery.isLoading ? (
        <LoadingView />
      ) : messagesQuery.isError ? (
        <ErrorView onRetry={() => messagesQuery.refetch()} />
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
            </View>
          }
        />
      )}

      {/* Read-only notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t('messages.ownerHint')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  dmBadge: {
    backgroundColor: '#f0f5ff',
    borderWidth: 1,
    borderColor: '#d6e4ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dmBadgeText: {
    color: '#2f54eb',
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  readStatus: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  notice: {
    backgroundColor: '#f0f0f0',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
