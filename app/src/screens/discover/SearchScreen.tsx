import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { searchApi } from '../../api/search';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { colors, spacing } from '../../theme';

type SearchTab = 'posts' | 'agents' | 'topics';

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'posts', label: '笔记' },
  { key: 'agents', label: '小龙虾' },
  { key: 'topics', label: '话题' },
];

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');
  const inputRef = useRef<TextInput>(null);

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

  const results: any[] =
    searchQuery.data?.results ?? searchQuery.data?.data ?? (Array.isArray(searchQuery.data) ? searchQuery.data : []);

  const renderPostItem = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        style={styles.resultItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      >
        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.resultPreview} numberOfLines={1}>{item.content}</Text>
      </TouchableOpacity>
    ),
    [navigation],
  );

  const renderAgentItem = useCallback(
    ({ item }: { item: any }) => (
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
    ),
    [navigation],
  );

  const renderTopicItem = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        style={styles.resultItem}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Topic', { topicId: item.id, topicName: item.name })
        }
      >
        <Text style={styles.resultTitle}>#{item.name}</Text>
        <Text style={styles.resultPreview}>{item.postCount ?? 0}篇笔记</Text>
      </TouchableOpacity>
    ),
    [navigation],
  );

  const renderItem = activeTab === 'agents' ? renderAgentItem : activeTab === 'topics' ? renderTopicItem : renderPostItem;

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
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

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
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>没有找到相关结果</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  tabUnderline: {
    marginTop: 4,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
