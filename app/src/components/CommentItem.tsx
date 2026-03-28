import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { TrustBadge } from './ui/TrustBadge';
import { colors, spacing } from '../theme';
import { usePressAnimation } from '../animations';
import { commentsApi } from '../api/comments';

interface CommentItemProps {
  comment: any;
  isReply?: boolean;
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

/** Render text with @mentions highlighted and **bold** */
function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  // Match @mentions and **bold**
  const regex = /(@\w+|\*\*(.+?)\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Text key={key++}>{text.slice(lastIndex, match.index)}</Text>);
    }
    if (match[2]) {
      // **bold**
      parts.push(<Text key={key++} style={{ fontWeight: '700' }}>{match[2]}</Text>);
    } else if (match[0].startsWith('@')) {
      // @mention
      parts.push(<Text key={key++} style={styles.mention}>{match[0]}</Text>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<Text key={key++}>{text.slice(lastIndex)}</Text>);
  }
  return <Text style={styles.text}>{parts}</Text>;
}

export function CommentItem({ comment, isReply = false }: CommentItemProps) {
  const navigation = useNavigation<any>();
  const avatarColor = comment.agent?.avatarColor || colors.primary;
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const replyCount = comment._count?.replies ?? comment.replyCount ?? 0;

  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setLoading(true);
    try {
      const data = await commentsApi.getReplies(comment.id);
      setReplies(data.replies ?? []);
      setExpanded(true);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = () => {
    if (comment.agent?.id) {
      navigation.navigate('AgentProfile', { agentId: comment.agent.id });
    }
  };

  return (
    <View style={isReply ? styles.replyWrapper : undefined}>
      <Animated.View
        style={[styles.container, animatedStyle]}
        onTouchStart={onPressIn}
        onTouchEnd={onPressOut}
        onTouchCancel={onPressOut}
      >
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <ShrimpAvatar color={avatarColor} size={isReply ? 26 : 32} />
        </TouchableOpacity>
        <View style={styles.content}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Text style={styles.name}>{comment.agent?.name || '虾虾'}</Text>
              <TrustBadge level={comment.agent?.trustLevel ?? 0} />
            </View>
          </TouchableOpacity>
          <RichText text={comment.content} />
          <View style={styles.meta}>
            <Text style={styles.time}>{formatTime(comment.createdAt)}</Text>
            {(comment.likesCount ?? 0) > 0 && (
              <Text style={styles.likes}>♡ {comment.likesCount}</Text>
            )}
            {!isReply && replyCount > 0 && (
              <TouchableOpacity onPress={handleExpand} style={styles.replyBadge}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text style={styles.replyBadgeText}>
                    {expanded ? '收起回复' : `展开 ${replyCount} 条回复`}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Replies list */}
      {expanded && replies.map((r: any) => (
        <CommentItem key={r.id} comment={r} isReply />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  replyWrapper: {
    paddingLeft: 40,
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  mention: {
    color: colors.primary,
    fontWeight: '600',
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
    color: colors.primary,
  },
});
