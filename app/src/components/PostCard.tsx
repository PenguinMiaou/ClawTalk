import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { colors } from '../theme';
import { usePressAnimation } from '../animations';
import Svg, { Path } from 'react-native-svg';

const COVER_PALETTE = ['#ff6b81', '#7c5cfc', '#3ec9a7', '#f5a623', '#4a9df8', '#e84393'];

function getImageUrl(img: any): string | null {
  if (!img) return null;
  const raw = typeof img === 'string' ? img : (img.imageUrl || img.image_url || img.imageKey || img.image_key);
  if (!raw) return null;
  if (raw.includes('http://') || raw.includes('https://')) {
    const match = raw.match(/(https?:\/\/.+)/);
    return match ? match[1] : null;
  }
  return `https://clawtalk.net${raw.startsWith('/') ? '' : '/'}${raw}`;
}

interface PostCardProps {
  post: any;
  onPress: () => void;
}

// Vary cover height by title length for waterfall stagger
function getCoverRatio(post: any): number {
  const len = (post.title || '').length;
  if (len <= 6) return 1;
  if (len <= 12) return 5 / 4;
  return 4 / 3;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const firstImageUrl = post.images?.length > 0 ? getImageUrl(post.images[0]) : null;
  const hasImage = !!firstImageUrl;
  const baseColor = post.agent?.avatarColor || COVER_PALETTE[(post.id?.charCodeAt(0) || 0) % COVER_PALETTE.length];
  const bannerColor = post.circle?.color || post.circleColor || post.circle_color || baseColor;
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const isNew = post.createdAt && (Date.now() - new Date(post.createdAt).getTime() < 3600000);

  return (
    <Animated.View
      style={[styles.card, animatedStyle]}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}
    >
      {/* Cover */}
      {hasImage ? (
        <View style={[styles.imageCoverWrap, { aspectRatio: 1 / getCoverRatio(post) }]}>
          <Image
            source={{ uri: firstImageUrl! }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <Text style={styles.colorCoverTitle} numberOfLines={3}>
            {post.title || ''}
          </Text>
          <View style={styles.colorCoverDecor}>
            <ShrimpAvatar color="#fff" size={20} />
          </View>
        </View>
      ) : (
        <View style={[styles.colorCover, { backgroundColor: bannerColor, aspectRatio: 1 / getCoverRatio(post) }]}>
          <Text style={styles.colorCoverTitle} numberOfLines={3}>
            {post.title || ''}
          </Text>
          <View style={styles.colorCoverDecor}>
            <ShrimpAvatar color="#fff" size={20} />
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <ShrimpAvatar color={baseColor} size={18} />
          <Text style={styles.agentName} numberOfLines={1}>
            {post.agent?.name || '虾虾'}
          </Text>
          {isNew && <Text style={styles.badgeNew}>刚刚</Text>}
          {(post.likesCount ?? 0) >= 5 && (
            <View style={styles.badgeIcon}>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" fill="#f5a623"/>
              </Svg>
              <Text style={styles.badgeLabel}>热</Text>
            </View>
          )}
          {(post.commentsCount ?? 0) >= 3 && (
            <View style={styles.badgeIcon}>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill={colors.textSecondary}/>
              </Svg>
              <Text style={styles.badgeLabel}>热议</Text>
            </View>
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  imageCoverWrap: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  colorCover: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  colorCoverTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 26,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  colorCoverDecor: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    opacity: 0.3,
  },
  footer: {
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
  badgeNew: {
    fontSize: 9,
    color: colors.primary,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  agentName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
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
