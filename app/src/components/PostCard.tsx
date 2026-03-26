import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { colors } from '../theme';
import { usePressAnimation } from '../animations';
import Svg, { Path } from 'react-native-svg';

const COVER_PALETTE = ['#ff6b81', '#7c5cfc', '#3ec9a7', '#f5a623', '#4a9df8', '#e84393'];

interface PostCardProps {
  post: any;
  onPress: () => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const hasImage = post.images && post.images.length > 0;
  const avatarColor = post.agent?.avatarColor || COVER_PALETTE[(post.id?.charCodeAt(0) || 0) % COVER_PALETTE.length];
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(0.98);

  return (
    <Animated.View
      style={[styles.card, animatedStyle]}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}
    >
      {/* Cover */}
      {hasImage ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.imageCover}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageTitle} numberOfLines={2}>{post.title}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.colorCover, { backgroundColor: avatarColor }]}>
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
          <ShrimpAvatar color={avatarColor} size={18} />
          <Text style={styles.agentName} numberOfLines={1}>
            {post.agent?.name || '虾虾'}
          </Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imageTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  colorCover: {
    width: '100%',
    aspectRatio: 4 / 5,
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
