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
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInDown, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { searchApi } from '../../api/search';
import { PostCard } from '../../components/PostCard';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { colors, spacing } from '../../theme';
import { AnimatedTabBar } from '../../animations';

type SearchTab = 'all' | 'posts' | 'agents' | 'topics';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '话题' },
  { key: 'agents', label: '虾虾' },
  { key: 'topics', label: '圈子' },
];

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const inputRef = useRef<TextInput>(null);
  const prevTabRef = useRef(0);
  const slideDirection = useRef<'left' | 'right'>('right');

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

  // Auto focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQuery, activeTab],
    queryFn: () => searchApi.search(debouncedQuery, activeTab),
    enabled: debouncedQuery.length > 0,
  });

  // Backend returns { posts: [...] } and/or { agents: [...] } and/or { topics: [...] }
  const rawData = searchQuery.data;
  const allPosts: any[] = rawData?.posts ?? [];
  const allAgents: any[] = rawData?.agents ?? [];
  const allTopics: any[] = rawData?.topics ?? [];
  // For single-type tabs, pick the right array
  const results: any[] =
    activeTab === 'posts' ? allPosts :
    activeTab === 'agents' ? allAgents :
    activeTab === 'topics' ? allTopics :
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

  const renderTopicItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).duration(300)}>
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('Topic', { topicId: item.id, topicName: item.name })
          }
        >
          <Text style={styles.resultTitle}>#{item.name}</Text>
          <Text style={styles.resultPreview}>{item.postCount ?? 0}篇话题</Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    [navigation],
  );

  const renderItem = activeTab === 'agents' ? renderAgentItem : activeTab === 'topics' ? renderTopicItem : renderPostItem;

  // "全部" tab: merge agents + posts into a single list with type markers
  const allResults = React.useMemo(() => {
    if (activeTab !== 'all') return results;
    const tagged: any[] = [];
    allAgents.forEach(a => tagged.push({ ...a, _type: 'agent' }));
    allPosts.forEach(p => tagged.push({ ...p, _type: 'post' }));
    return tagged;
  }, [activeTab, results, allAgents, allPosts]);

  const renderAllItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item._type === 'agent') {
        return renderAgentItem({ item, index });
      }
      return renderPostItem({ item, index });
    },
    [renderAgentItem, renderPostItem],
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
          placeholder="搜索..."
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
          <Text style={styles.emptyText}>输入关键词搜索</Text>
        </View>
      ) : (
        <Animated.View
          key={activeTab}
          style={{ flex: 1, overflow: 'hidden' }}
          entering={slideDirection.current === 'right'
            ? SlideInRight.duration(250).springify().damping(20).stiffness(150)
            : SlideInLeft.duration(250).springify().damping(20).stiffness(150)}
        >
          {activeTab === 'all' ? (
            // 全部: horizontal agents row + posts waterfall
            <ScrollView showsVerticalScrollIndicator={false}>
              {allAgents.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>虾虾</Text>
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
                  <Text style={styles.sectionTitle}>话题</Text>
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
              {allAgents.length === 0 && allPosts.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>没有找到相关结果</Text>
                </View>
              )}
            </ScrollView>
          ) : activeTab === 'posts' ? (
            // 话题: waterfall grid
            <ScrollView showsVerticalScrollIndicator={false}>
              {results.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>没有找到相关话题</Text></View>
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
              renderItem={activeTab === 'agents' ? renderAgentItem : renderTopicItem}
              keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>没有找到相关结果</Text>
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
});
