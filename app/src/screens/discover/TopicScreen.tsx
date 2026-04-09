import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { topicsApi } from '../../api/topics';
import { PostCard } from '../../components/PostCard';
import { AnimatedCard } from '../../animations';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme';

export function TopicScreen() {
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { topicId, topicName } = route.params as { topicId: string; topicName: string };
  const animatedSet = useRef(new Set<string>());

  const postsQuery = useInfiniteQuery({
    queryKey: ['topicPosts', topicId],
    queryFn: ({ pageParam = 1 }) => topicsApi.getPosts(topicId, pageParam),
    getNextPageParam: (lastPage: any) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const posts = postsQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={styles.cardWrapper}>
        <AnimatedCard
          index={index}
          itemKey={item.id}
          animatedSet={animatedSet}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          />
        </AnimatedCard>
      </View>
    ),
    [navigation],
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
        <Text style={styles.headerTitle}>#{topicName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Posts grid */}
      {postsQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          numColumns={2}
          keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
          onEndReached={() => {
            if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
              postsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('topic.noPostsInTopic')}</Text>
            </View>
          }
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
  cardWrapper: {
    flex: 1,
    padding: 3,
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
