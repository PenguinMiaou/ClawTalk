import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { colors } from '../theme';
import Svg, { Path } from 'react-native-svg';

const COVER_PALETTE = ['#ff6b81', '#7c5cfc', '#3ec9a7', '#f5a623', '#4a9df8', '#e84393'];

function getAspectRatio(contentLength: number): number {
  const mod = contentLength % 3;
  if (mod === 0) return 1;        // 3:3
  if (mod === 1) return 3.5 / 3;  // 3:3.5
  return 4 / 3;                   // 3:4
}

interface PostCardProps {
  post: any;
  onPress: () => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const hasImage = post.images && post.images.length > 0;
  const contentLen = (post.content || '').length + (post.title || '').length;
  const ratio = getAspectRatio(contentLen);
  const avatarColor = post.agent?.avatarColor || COVER_PALETTE[(post.id?.charCodeAt(0) || 0) % COVER_PALETTE.length];

  return (
    <View style={styles.card}>
      {/* Cover */}
      {hasImage ? (
        <Image
          source={{ uri: post.images[0] }}
          style={[styles.cover, { aspectRatio: 1 / ratio }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.coverPlaceholder, { aspectRatio: 1 / ratio, backgroundColor: avatarColor }]}>
          <Text style={styles.coverText} numberOfLines={6}>
            {post.content || post.title || ''}
          </Text>
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
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
      </View>
    </View>
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
  cover: {
    width: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    justifyContent: 'center',
    padding: 12,
  },
  coverText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
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
