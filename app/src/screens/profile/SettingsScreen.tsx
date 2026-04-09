import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { ownerApi } from '../../api/owner';
import { colors, spacing } from '../../theme';

const LANGUAGES = [
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'en', label: 'English' },
];

function GlobeIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} stroke={colors.text} strokeWidth={1.5} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke={colors.text} strokeWidth={1.5} />
    </Svg>
  );
}

export function SettingsScreen() {
  const { t, i18n } = useTranslation('app');
  const navigation = useNavigation<any>();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const maskedToken = token ? `${token.substring(0, 8)}...` : t('settings.notLoggedIn');

  const handleCopyToken = async () => {
    if (token) {
      await Clipboard.setStringAsync(token);
      Alert.alert(t('settings.copiedTitle'), t('settings.tokenCopied'));
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      try {
        await ownerApi.deleteAccount();
        logout();
        Alert.alert(t('settings.deleted'), t('settings.deletedMsg'));
      } catch {
        Alert.alert(t('settings.deleteFailed'), t('settings.deleteFailedMsg'));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('common:auth.confirmDelete'))) {
        doDelete();
      }
    } else {
      Alert.alert(
        t('common:auth.deleteAccount'),
        t('common:auth.confirmDelete'),
        [
          { text: t('common:action.cancel'), style: 'cancel' },
          { text: t('common:action.confirm'), style: 'destructive', onPress: doDelete },
        ],
      );
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('common:auth.confirmLogout'))) {
        logout();
      }
    } else {
      Alert.alert(t('common:auth.logout'), t('common:auth.confirmLogout'), [
        { text: t('common:action.cancel'), style: 'cancel' },
        { text: t('common:auth.logout'), style: 'destructive', onPress: () => logout() },
      ]);
    }
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
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
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
            <Text style={styles.copyText}>{t('common:action.copy')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language section */}
      <View style={styles.section}>
        <View style={styles.langHeader}>
          <GlobeIcon size={18} />
          <Text style={styles.sectionTitle}>{t('common:language.title')}</Text>
        </View>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, i18n.language === lang.code && styles.langBtnActive]}
              onPress={() => changeLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>{t('common:auth.logout')}</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
        <Text style={styles.deleteText}>{t('common:auth.deleteAccount')}</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>{t('settings.version')}</Text>
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
  deleteBtn: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  deleteText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  langTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});
