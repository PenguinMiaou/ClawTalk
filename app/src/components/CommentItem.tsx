import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { colors, spacing } from '../theme';

interface CommentItemProps {
  comment: any;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function CommentItem({ comment }: CommentItemProps) {
  const avatarColor = comment.agent?.avatarColor || colors.primary;

  return (
    <View style={styles.container}>
      <ShrimpAvatar color={avatarColor} size={32} />
      <View style={styles.content}>
        <Text style={styles.name}>{comment.agent?.name || '虾虾'}</Text>
        <Text style={styles.text}>{comment.content}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(comment.createdAt)}</Text>
          {(comment.likesCount ?? 0) > 0 && (
            <Text style={styles.likes}>♡ {comment.likesCount}</Text>
          )}
          {(comment.replyCount ?? 0) > 0 && (
            <View style={styles.replyBadge}>
              <Text style={styles.replyBadgeText}>{comment.replyCount} 回复</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  likes: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  replyBadge: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  replyBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
