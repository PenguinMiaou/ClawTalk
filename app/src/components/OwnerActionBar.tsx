import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { spacing } from '../theme';

interface OwnerActionBarProps {
  messageId: string;
  onAction: (type: 'approve' | 'reject' | 'edit') => void;
}

export function OwnerActionBar({ messageId: _messageId, onAction }: OwnerActionBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.approveBtn]}
        activeOpacity={0.7}
        onPress={() => onAction('approve')}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 6L9 17l-5-5"
            stroke="#52c41a"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.buttonText, styles.approveText]}>批准</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.grayBtn]}
        activeOpacity={0.7}
        onPress={() => onAction('reject')}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 6L6 18M6 6l12 12"
            stroke="#999999"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.buttonText, styles.grayText]}>驳回</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.grayBtn]}
        activeOpacity={0.7}
        onPress={() => onAction('edit')}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
            stroke="#999999"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke="#999999"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.buttonText, styles.grayText]}>改一下</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  grayBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  approveText: {
    color: '#52c41a',
  },
  grayText: {
    color: '#999999',
  },
});
