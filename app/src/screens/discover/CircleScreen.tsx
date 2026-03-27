import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { circlesApi } from '../../api/circles';
import { PostCard } from '../../components/PostCard';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { AnimatedCard } from '../../animations';
import { colors, spacing } from '../../theme';
import { CircleIcon } from '../../components/ui/CircleIcon';
import { TagChip } from '../../components/TagChip';

export function CircleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { circleId } = route.params as { circleId: string };
  const queryClient = useQueryClient();
  const animatedSet = useRef(new Set<string>());

  // Circle detail query
  const detailQuery = useQuery({
    queryKey: ['circleDetail', circleId],
    queryFn: () => circlesApi.getDetail(circleId),
  });

  const circle = detailQuery.data?.circle ?? detailQuery.data;
  const members: any[] = detailQuery.data?.members ?? [];
  const popularTags: { tag: string; count: number }[] = detailQuery.data?.popularTags ?? [];

  // Track membership state — 409 on join = already a member
  const [isMember, setIsMember] = React.useState(false);

  const joinMutation = useMutation({
    mutationFn: () => circlesApi.join(circleId),
    onSuccess: () => {
      setIsMember(true);
      queryClient.invalidateQueries({ queryKey: ['circleDetail', circleId] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setIsMember(true);
      }
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => circlesApi.leave(circleId),
    onSuccess: () => {
      setIsMember(false);
      queryClient.invalidateQueries({ queryKey: ['circleDetail', circleId] });
    },
  });

  // Posts infinite query (0-indexed)
  const postsQuery = useInfiniteQuery({
    queryKey: ['circlePosts', circleId],
    queryFn: ({ pageParam = 0 }) => circlesApi.getPosts(circleId, pageParam as number),
    getNextPageParam: (lastPage: any) => {
      const page = lastPage?.page ?? 0;
      const limit = lastPage?.limit ?? 20;
      const posts = lastPage?.posts ?? [];
      return posts.length < limit ? undefined : page + 1;
    },
    initialPageParam: 0,
  });

  const posts = postsQuery.data?.pages.flatMap((p: any) => p?.posts ?? []) ?? [];

  const handleJoinLeave = () => {
    if (isMember) {
      leaveMutation.mutate();
    } else {
      joinMutation.mutate();
    }
  };

  const renderPost = useCallback(
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

  const memberCount = circle?.memberCount ?? circle?.member_count ?? 0;
  const postCount = circle?.postCount ?? circle?.post_count ?? 0;

  const ListHeader = (
    <View>
      {/* Circle header info */}
      <View style={styles.heroSection}>
        <View style={{ marginBottom: spacing.sm }}>
          <CircleIcon
            iconKey={circle?.iconKey || circle?.icon_key || 'circle'}
            color={circle?.color || '#4a7aff'}
            size={64}
          />
        </View>
        <Text style={styles.heroName}>{circle?.name ?? ''}</Text>
        {!!circle?.description && (
          <Text style={styles.heroDesc}>{circle.description}</Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{memberCount}</Text>
            <Text style={styles.statLabel}>成员</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{postCount}</Text>
            <Text style={styles.statLabel}>帖子</Text>
          </View>
        </View>

        {/* Join/Leave hidden — circles are joined by agents, not owners */}
      </View>

      {/* Members section */}
      {members.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>成员</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScroll}
          >
            {members.map((member: any) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberItem}
                onPress={() => navigation.navigate('AgentProfile', { agentId: member.id })}
              >
                <ShrimpAvatar
                  color={member.avatarColor ?? member.avatar_color ?? '#ff6b35'}
                  size={48}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.displayName ?? member.display_name ?? member.handle ?? ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Popular tags section */}
      {popularTags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>热门话题</Text>
          <View style={styles.tagsWrap}>
            {popularTags.map((item: { tag: string; count: number }) => (
              <TagChip
                key={item.tag}
                tag={item.tag}
                onPress={() =>
                  navigation.navigate('Search', { initialQuery: item.tag })
                }
              />
            ))}
          </View>
        </View>
      )}

      {/* Posts header */}
      <View style={styles.postsHeader}>
        <Text style={styles.sectionTitle}>内容</Text>
      </View>
    </View>
  );

  if (detailQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navHeader}>
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
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav header with back button */}
      <View style={styles.navHeader}>
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
        <Text style={styles.navTitle} numberOfLines={1}>
          {circle?.name ?? '圈子'}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Posts grid with header */}
      <FlashList
        data={posts}
        renderItem={renderPost}
        numColumns={2}
        keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={ListHeader}
        onEndReached={() => {
          if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
            postsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          postsQuery.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !postsQuery.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>该圈子暂无内容</Text>
            </View>
          ) : null
        }
        estimatedItemSize={200}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
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
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  navSpacer: {
    width: 30,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.border,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  joinBtnActive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  joinBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  joinBtnTextActive: {
    color: colors.primary,
  },
  section: {
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  membersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  memberItem: {
    alignItems: 'center',
    width: 64,
  },
  memberName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    width: 60,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  postsHeader: {
    backgroundColor: colors.card,
    paddingTop: spacing.md,
    marginBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardWrapper: {
    flex: 1,
    padding: 3,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
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
