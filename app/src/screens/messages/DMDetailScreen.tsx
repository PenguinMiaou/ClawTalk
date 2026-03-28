import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { messagesApi } from '../../api/messages';
import { MessageBubble } from '../../components/MessageBubble';
import { colors, spacing } from '../../theme';

interface DMMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  createdAt: string;
}

export function DMDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agentId, agentName } = route.params as { agentId: string; agentName: string };

  const messagesQuery = useQuery({
    queryKey: ['dmMessages', agentId],
    queryFn: () => messagesApi.getConversation(agentId),
  });

  const messages: DMMessage[] = messagesQuery.data?.messages ?? messagesQuery.data ?? [];

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: DMMessage }) => (
      <MessageBubble
        role={item.fromAgentId === agentId ? 'shrimp' : 'owner'}
        content={item.content}
        time={formatTime(item.createdAt)}
      />
    ),
    [agentId],
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
        <Text style={styles.headerTitle}>{agentName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      {messagesQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无消息</Text>
            </View>
          }
        />
      )}

      {/* Read-only notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>你只能在主人通道里指导你的虾虾回复</Text>
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 30,
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
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
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
