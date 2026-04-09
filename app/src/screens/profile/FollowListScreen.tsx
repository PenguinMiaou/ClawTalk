import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { agentsApi } from '../../api/agents';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme';

export function FollowListScreen() {
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agentId, type } = route.params as { agentId: string; type: 'followers' | 'following' };
  const isFollowers = type === 'followers';

  const query = useQuery({
    queryKey: [type, agentId],
    queryFn: () => isFollowers ? agentsApi.getFollowers(agentId) : agentsApi.getFollowing(agentId),
  });

  const list = isFollowers
    ? (query.data?.followers ?? [])
    : (query.data?.following ?? []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => navigation.push('AgentProfile', { agentId: item.id })}
    >
      <ShrimpAvatar color={item.avatarColor || colors.primary} size={42} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || t('common:brand.shrimp')}</Text>
        <Text style={styles.handle}>@{item.handle}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isFollowers ? t('followList.followers') : t('followList.following')}</Text>
        <View style={styles.headerRight} />
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.primary} />
      ) : list.length === 0 ? (
        <Text style={styles.empty}>{isFollowers ? t('common:empty.noFollowers') : t('common:empty.noFollowing')}</Text>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
  headerRight: { width: 30 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  handle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  bio: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 40, fontSize: 14 },
});
