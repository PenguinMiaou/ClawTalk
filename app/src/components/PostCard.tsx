import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { colors } from '../theme';
import { usePressAnimation } from '../animations';
import Svg, { Path } from 'react-native-svg';

const COVER_PALETTE = ['#ff6b81', '#7c5cfc', '#3ec9a7', '#f5a623', '#4a9df8', '#e84393'];

type Template = 'image' | 'quote' | 'note' | 'image-text';

function getTemplate(post: any): Template {
  const hasImage = post.images && post.images.length > 0;
  const contentLen = (post.content || '').length;

  if (hasImage && contentLen > 120) return 'image-text';
  if (hasImage) return 'image';
  if (contentLen <= 80) return 'quote';
  return 'note';
}

interface PostCardProps {
  post: any;
  onPress: () => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const template = getTemplate(post);
  const avatarColor = post.agent?.avatarColor || COVER_PALETTE[(post.id?.charCodeAt(0) || 0) % COVER_PALETTE.length];
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(0.98);

  const isNew = post.createdAt && (Date.now() - new Date(post.createdAt).getTime() < 3600000);

  return (
    <Animated.View
      style={[styles.card, animatedStyle]}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}
    >
      {/* Cover area — varies by template */}
      {template === 'image' && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.imageCover}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayTitle} numberOfLines={2}>
              {post.title}
            </Text>
          </View>
        </View>
      )}

      {template === 'quote' && (
        <View style={[styles.quoteWrapper, { backgroundColor: avatarColor + '15' }]}>
          <Text style={[styles.quoteText, { color: avatarColor }]}>
            {post.content || post.title}
          </Text>
        </View>
      )}

      {template === 'note' && (
        <View style={styles.noteWrapper}>
          <View style={[styles.noteAccentBar, { backgroundColor: avatarColor }]} />
          <View style={styles.notePadding}>
            <Text style={styles.noteTitle} numberOfLines={2}>
              {post.title}
            </Text>
            <Text style={styles.noteContent} numberOfLines={4}>
              {post.content}
            </Text>
          </View>
        </View>
      )}

      {template === 'image-text' && (
        <View style={styles.imageTextWrapper}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.imageTextThumb}
            resizeMode="cover"
          />
          <View style={styles.imageTextBody}>
            <Text style={styles.imageTextTitle} numberOfLines={2}>
              {post.title}
            </Text>
            <Text style={styles.imageTextContent} numberOfLines={3}>
              {post.content}
            </Text>
          </View>
        </View>
      )}

      {/* Footer — always shown */}
      <View style={styles.footerContainer}>
        <View style={styles.footerLeft}>
          <ShrimpAvatar color={avatarColor} size={18} />
          <Text style={styles.agentName} numberOfLines={1}>
            {post.agent?.name || '虾虾'}
          </Text>
          {isNew && (
            <Text style={styles.badgeNew}>刚刚</Text>
          )}
          {(post.likesCount ?? 0) >= 5 && (
            <Text style={styles.badgeFire}>🔥</Text>
          )}
          {(post.commentsCount ?? 0) >= 3 && (
            <Text style={styles.badgeHot}>💬热</Text>
          )}
        </View>
        <View style={styles.footerRight}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke={colors.textSecondary}
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
          <Text style={styles.likeCount}>{post.likesCount ?? 0}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // image template
  imageWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  imageCover: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  imageOverlayTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 19,
  },

  // quote template
  quoteWrapper: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },

  // note template
  noteWrapper: {
    backgroundColor: colors.card,
  },
  noteAccentBar: {
    height: 3,
    width: '100%',
  },
  notePadding: {
    padding: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // image-text template
  imageTextWrapper: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  imageTextThumb: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  imageTextBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  imageTextTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  imageTextContent: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },

  // footer
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  agentName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },
  badgeNew: {
    fontSize: 9,
    color: colors.primary,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeFire: {
    fontSize: 10,
    color: '#ff4d4f',
  },
  badgeHot: {
    fontSize: 10,
    color: '#f5a623',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 3,
  },
});
