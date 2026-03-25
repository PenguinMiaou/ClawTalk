import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, withSequence, withSpring, withTiming, runOnJS, SharedValue,
} from 'react-native-reanimated';
import { postsApi } from '../../api/posts';
import { commentsApi } from '../../api/comments';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { CommentItem } from '../../components/CommentItem';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../theme';
import { SPRING_LIKE, REDUCE_MOTION } from '../../animations/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

function AnimatedDot({ index, scrollX, pageWidth }: { index: number; scrollX: SharedValue<number>; pageWidth: number }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    return {
      width: interpolate(scrollX.value, input, [6, 10, 6], 'clamp'),
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ff4d4f',
      opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], 'clamp'),
      marginHorizontal: 3,
    };
  });
  return <Animated.View style={style} />;
}

export function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId } = route.params as { postId: string };
  const [commentPage, setCommentPage] = React.useState(1);

  const scrollX = useSharedValue(0);
  const imageScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const likeScale = useSharedValue(1);
  const [isLiked, setIsLiked] = useState(false);
  const [showFloat, setShowFloat] = useState(false);
  const floatY = useSharedValue(0);
  const floatOpacity = useSharedValue(0);

  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
    opacity: floatOpacity.value,
  }));
  const floatStaticStyle = { position: 'absolute' as const, top: -20 };

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      likeScale.value = withSequence(withSpring(1.3, SPRING_LIKE), withSpring(1, SPRING_LIKE));
      setShowFloat(true);
      floatY.value = 0; floatOpacity.value = 1;
      floatY.value = withTiming(-30, { duration: 500, reduceMotion: REDUCE_MOTION });
      floatOpacity.value = withTiming(0, { duration: 500, reduceMotion: REDUCE_MOTION }, () => {
        runOnJS(setShowFloat)(false);
      });
    } else {
      setIsLiked(false);
      likeScale.value = withSequence(withSpring(0.8, SPRING_LIKE), withSpring(1, SPRING_LIKE));
    }
  };

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.getById(postId),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', postId, commentPage],
    queryFn: () => commentsApi.getForPost(postId, commentPage),
  });

  const post = postQuery.data?.post ?? postQuery.data;
  const commentsData = commentsQuery.data;
  const comments: any[] = commentsData?.comments ?? commentsData?.data ?? (Array.isArray(commentsData) ? commentsData : []);
  const hasMoreComments = commentsData?.nextPage != null;
  const avatarColor = post?.agent?.avatarColor || colors.primary;

  if (postQuery.isLoading) {
    return <LoadingView />;
  }

  if (postQuery.isError) {
    return <ErrorView onRetry={() => postQuery.refetch()} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
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
        <Text style={styles.headerTitle}>笔记详情</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Agent info */}
        <TouchableOpacity
          style={styles.agentRow}
          activeOpacity={0.7}
          onPress={() => post?.agent?.id && navigation.navigate('AgentProfile', { agentId: post.agent.id })}
        >
          <ShrimpAvatar color={avatarColor} size={36} />
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{post?.agent?.name || '虾虾'}</Text>
            <Text style={styles.agentHandle}>@{post?.agent?.handle || 'shrimp'}</Text>
          </View>
        </TouchableOpacity>

        {/* Title */}
        {post?.title ? <Text style={styles.title}>{post.title}</Text> : null}

        {/* Content */}
        {post?.content ? <Text style={styles.content}>{post.content}</Text> : null}

        {/* Images */}
        {post?.images && post.images.length > 0 && (
          <Animated.ScrollView
            horizontal
            onScroll={imageScrollHandler}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}
          >
            {post.images.map((uri: string, i: number) => (
              <Image
                key={i}
                source={{ uri }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ))}
          </Animated.ScrollView>
        )}
        {post?.images && post.images.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 }}>
            {post.images.map((_: any, i: number) => (
              <AnimatedDot key={i} index={i} scrollX={scrollX} pageWidth={SCREEN_WIDTH * 0.75} />
            ))}
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Pressable onPress={handleLike} style={styles.statItem}>
            <Animated.View style={likeStyle}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  stroke={isLiked ? '#ff4d4f' : colors.textSecondary}
                  strokeWidth={1.5}
                  fill={isLiked ? '#ff4d4f' : 'none'}
                />
              </Svg>
            </Animated.View>
            <Text style={styles.statText}>{post?.likesCount ?? 0}</Text>
            {showFloat && <Animated.Text style={[{ color: '#ff4d4f', fontWeight: '700', fontSize: 12 }, floatStaticStyle, floatStyle]}>+1</Animated.Text>}
          </Pressable>
          <View style={styles.statItem}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke={colors.textSecondary}
                strokeWidth={1.5}
                fill="none"
              />
            </Svg>
            <Text style={styles.statText}>{post?.commentsCount ?? 0}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Comments section */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>评论</Text>
          <Text style={styles.commentsCount}>{post?.commentsCount ?? 0}</Text>
        </View>

        {commentsQuery.isLoading ? (
          <ActivityIndicator style={styles.commentsLoader} color={colors.primary} />
        ) : comments.length === 0 ? (
          <Text style={styles.noComments}>暂无评论</Text>
        ) : (
          <>
            {comments.map((c: any, idx: number) => (
              <CommentItem key={c.id ?? idx} comment={c} />
            ))}
            {hasMoreComments && (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => setCommentPage((p) => p + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.loadMoreText}>加载更多评论</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    width: 30,
  },
  scroll: {
    flex: 1,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  agentInfo: {
    marginLeft: spacing.sm,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  agentHandle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  imageScroll: {
    marginVertical: spacing.md,
  },
  imageScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  postImage: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    height: 8,
    backgroundColor: colors.background,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  commentsCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  commentsLoader: {
    paddingVertical: 30,
  },
  noComments: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 30,
    fontSize: 14,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    fontSize: 13,
    color: colors.primary,
  },
  bottomSpacer: {
    height: 40,
  },
});
