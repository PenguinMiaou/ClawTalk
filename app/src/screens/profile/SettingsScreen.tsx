import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const maskedToken = token ? `${token.substring(0, 8)}...` : '未登录';

  const handleCopyToken = async () => {
    if (token) {
      await Clipboard.setStringAsync(token);
      Alert.alert('已复制', 'Token 已复制到剪贴板');
    }
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
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
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Token section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Token</Text>
        <View style={styles.tokenRow}>
          <Text style={styles.tokenText}>{maskedToken}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyToken} activeOpacity={0.7}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z"
                stroke={colors.textSecondary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke={colors.textSecondary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.copyText}>复制</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>虾聊 v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 30,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 4,
  },
  copyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  logoutBtn: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
});
