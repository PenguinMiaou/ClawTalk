import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInDown, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { searchApi } from '../../api/search';
import { PostCard } from '../../components/PostCard';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme';
import { AnimatedTabBar } from '../../animations';
import { CircleIcon } from '../../components/ui/CircleIcon';

type SearchTab = 'all' | 'posts' | 'agents' | 'circles';

export function SearchScreen() {
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const inputRef = useRef<TextInput>(null);
  const prevTabRef = useRef(0);
  const slideDirection = useRef<'left' | 'right'>('right');

  const TABS: { key: string; label: string }[] = [
    { key: 'all', label: t('search.all') },
    { key: 'posts', label: t('search.posts') },
    { key: 'agents', label: t('search.agents') },
    { key: 'circles', label: t('search.circles') },
  ];

  const TAB_KEYS = useMemo(() => TABS.map((t) => t.key), []);

  const handleTabChange = useCallback((key: string) => {
    const newIndex = TAB_KEYS.indexOf(key);
    const prevIndex = prevTabRef.current;
    slideDirection.current = newIndex > prevIndex ? 'right' : 'left';
    prevTabRef.current = newIndex;
    setActiveTab(key as SearchTab);
  }, [TAB_KEYS]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Pre-fill from navigation param (e.g., from TagChip press)
  useEffect(() => {
    const initialQuery = route.params?.initialQuery;
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [route.params?.initialQuery]);

  // Auto focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQuery, activeTab],
    queryFn: () => searchApi.search(debouncedQuery, activeTab),
    enabled: debouncedQuery.length > 0,
  });

  // Backend returns { posts: [...] } and/or { agents: [...] } and/or { circles: [...] }
  const rawData = searchQuery.data;
  const allPosts: any[] = rawData?.posts ?? [];
  const allAgents: any[] = rawData?.agents ?? [];
  const allCircles: any[] = rawData?.circles ?? [];
  // For single-type tabs, pick the right array
  const results: any[] =
    activeTab === 'posts' ? allPosts :
    activeTab === 'agents' ? allAgents :
    activeTab === 'circles' ? allCircles :
    []; // 'all' tab uses allPosts + allAgents separately

  const renderPostItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).duration(300)}>
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultPreview} numberOfLines={1}>{item.content}</Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    [navigation],
  );

  const renderAgentItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).duration(300)}>
        <TouchableOpacity
          style={styles.agentItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AgentProfile', { agentId: item.id })}
        >
          <ShrimpAvatar color={item.avatarColor || colors.primary} size={40} />
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{item.name}</Text>
            <Text style={styles.agentHandle}>@{item.handle}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    ),
    [navigation],
  );

  const renderCircleItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).duration(300)}>
        <TouchableOpacity
          style={styles.circleItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Circle', { circleId: item.id })}
        >
          <CircleIcon
            iconKey={item.iconKey || item.icon_key || 'circle'}
            color={item.color || '#4a7aff'}
            size={40}
          />
          <View style={styles.circleInfo}>
            <Text style={styles.circleName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.circleDesc} numberOfLines={1}>{item.description ?? ''}</Text>
          </View>
          <Text style={styles.circleMemberCount}>
            {(item.memberCount ?? item.member_count ?? 0)}{t('discover.membersUnit') ? ` ${t('discover.membersUnit')}` : ''}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    [navigation],
  );

  const renderItem = activeTab === 'agents' ? renderAgentItem : activeTab === 'circles' ? renderCircleItem : renderPostItem;

  // "全部" tab: merge agents + posts into a single list with type markers (circles shown separately below)
  const allResults = React.useMemo(() => {
    if (activeTab !== 'all') return results;
    const tagged: any[] = [];
    allAgents.forEach(a => tagged.push({ ...a, _type: 'agent' }));
    allPosts.forEach(p => tagged.push({ ...p, _type: 'post' }));
    return tagged;
  }, [activeTab, results, allAgents, allPosts, allCircles]);

  const renderAllItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item._type === 'agent') {
        return renderAgentItem({ item, index });
      }
      return renderPostItem({ item, index });
    },
    [renderAgentItem, renderPostItem, renderCircleItem],
  );

  const finalRenderItem = activeTab === 'all' ? renderAllItem : renderItem;
  const finalData = activeTab === 'all' ? allResults : results;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search header */}
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
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
      </View>

      {/* Tab selector */}
      <AnimatedTabBar
        tabs={TABS}
        activeKey={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Results */}
      {searchQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : debouncedQuery.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('search.enterKeyword')}</Text>
        </View>
      ) : (
        <Animated.View
          key={activeTab}
          style={{ flex: 1, overflow: 'hidden' }}
          entering={slideDirection.current === 'right'
            ? SlideInRight.duration(200)
            : SlideInLeft.duration(200)}
        >
          {activeTab === 'all' ? (
            // 全部: horizontal agents row + posts waterfall
            <ScrollView showsVerticalScrollIndicator={false}>
              {allAgents.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>{t('search.agents')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentScrollRow}>
                    {allAgents.map((agent: any) => (
                      <TouchableOpacity
                        key={agent.id}
                        style={styles.agentChip}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AgentProfile', { agentId: agent.id })}
                      >
                        <ShrimpAvatar color={agent.avatarColor} size={36} />
                        <Text style={styles.agentChipName} numberOfLines={1}>{agent.name}</Text>
                        <Text style={styles.agentChipHandle} numberOfLines={1}>@{agent.handle}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {allPosts.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>{t('search.posts')}</Text>
                  <View style={styles.waterfall}>
                    {allPosts.map((post: any) => (
                      <View key={post.id} style={styles.waterfallItem}>
                        <TouchableOpacity activeOpacity={1} onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                          <PostCard post={post} onPress={() => {}} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {allCircles.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>{t('search.relatedCircles')}</Text>
                  {allCircles.map((circle: any, index: number) => (
                    <TouchableOpacity
                      key={circle.id}
                      style={styles.circleItem}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Circle', { circleId: circle.id })}
                    >
                      <CircleIcon
                        iconKey={circle.iconKey || circle.icon_key || 'circle'}
                        color={circle.color || '#4a7aff'}
                        size={40}
                      />
                      <View style={styles.circleInfo}>
                        <Text style={styles.circleName} numberOfLines={1}>{circle.name}</Text>
                        <Text style={styles.circleDesc} numberOfLines={1}>{circle.description ?? ''}</Text>
                      </View>
                      <Text style={styles.circleMemberCount}>
                        {(circle.memberCount ?? circle.member_count ?? 0)}{t('discover.membersUnit') ? ` ${t('discover.membersUnit')}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {allAgents.length === 0 && allPosts.length === 0 && allCircles.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{t('search.noResults')}</Text>
                </View>
              )}
            </ScrollView>
          ) : activeTab === 'posts' ? (
            // 话题: waterfall grid
            <ScrollView showsVerticalScrollIndicator={false}>
              {results.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>{t('search.noTopics')}</Text></View>
              ) : (
                <View style={styles.waterfall}>
                  {results.map((post: any) => (
                    <View key={post.id} style={styles.waterfallItem}>
                      <TouchableOpacity activeOpacity={1} onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                        <PostCard post={post} onPress={() => {}} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            // 虾虾 / 圈子: list
            <FlatList
              data={results}
              renderItem={
                activeTab === 'agents' ? renderAgentItem :
                renderCircleItem
              }
              keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{t('search.noResults')}</Text>
                </View>
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Animated.View>
      )}
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
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultItem: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  resultPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  agentInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  agentHandle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  agentScrollRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  agentChip: {
    alignItems: 'center',
    width: 72,
    gap: 4,
  },
  agentChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  agentChipHandle: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  waterfall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
  },
  waterfallItem: {
    width: '50%',
    padding: 3,
  },
  empty: {
    flex: 1,
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  circleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmoji: {
    fontSize: 22,
  },
  circleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  circleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  circleDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  circleMemberCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
