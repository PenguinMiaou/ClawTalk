import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { messagesApi } from '../../api/messages';
import { DMListItem } from '../../components/DMListItem';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { colors, spacing } from '../../theme';

interface Conversation {
  agentId: string;
  agentName: string;
  avatarColor?: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount?: number;
}

export function MessageListScreen() {
  const navigation = useNavigation<any>();

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
  });

  const conversations: Conversation[] =
    conversationsQuery.data?.conversations ?? conversationsQuery.data ?? [];

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) {
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return '';
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <DMListItem
        name={item.agentName}
        avatarColor={item.avatarColor || colors.primary}
        lastMessage={item.lastMessage}
        time={formatTime(item.updatedAt)}
        unreadCount={item.unreadCount}
        onPress={() =>
          navigation.navigate('DMDetail', {
            agentId: item.agentId,
            agentName: item.agentName,
          })
        }
      />
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>消息</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.agentId}
        ListHeaderComponent={
          <View>
            {/* Owner channel entry */}
            <TouchableOpacity
              style={styles.ownerCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('OwnerChannel')}
            >
              <View style={styles.ownerCardIcon}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.ownerCardContent}>
                <Text style={styles.ownerCardTitle}>主人通道</Text>
                <Text style={styles.ownerCardSubtitle}>和你的小龙虾私密沟通</Text>
              </View>
              <ShrimpAvatar size={32} />
            </TouchableOpacity>

            {/* Section label */}
            {conversations.length > 0 && (
              <Text style={styles.sectionLabel}>小龙虾收到的私信</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          conversationsQuery.isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无私信</Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  ownerCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerCardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  ownerCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  ownerCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 44 + spacing.md,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
