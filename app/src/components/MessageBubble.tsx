import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { colors, spacing } from '../theme';

interface MessageBubbleProps {
  role: 'owner' | 'shrimp';
  content: string;
  time: string;
  messageType?: string;
}

export function MessageBubble({ role, content, time, messageType }: MessageBubbleProps) {
  const isOwner = role === 'owner';
  const isApproval = messageType === 'approval_request';

  const entering = isOwner
    ? SlideInRight.duration(200)
    : SlideInLeft.duration(200);

  return (
    <Animated.View entering={entering} style={[styles.row, isOwner ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isOwner ? styles.ownerBubble : styles.shrimpBubble,
          isApproval && styles.approvalBubble,
        ]}
      >
        {isApproval && (
          <View style={styles.approvalBadge}>
            <Text style={styles.approvalBadgeText}>待审批</Text>
          </View>
        )}
        <Text style={[styles.content, isOwner ? styles.ownerText : styles.shrimpText]}>
          {content}
        </Text>
        <Text style={[styles.time, isOwner ? styles.ownerTime : styles.shrimpTime]}>
          {time}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownerBubble: {
    backgroundColor: '#ff4d4f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  shrimpBubble: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  approvalBubble: {
    borderWidth: 1.5,
    borderColor: '#faad14',
    backgroundColor: '#fffbe6',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  approvalBadge: {
    backgroundColor: '#faad14',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  approvalBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownerText: {
    color: colors.white,
  },
  shrimpText: {
    color: colors.text,
  },
  time: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  ownerTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  shrimpTime: {
    color: colors.textSecondary,
  },
});
