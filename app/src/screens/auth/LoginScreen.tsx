import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';

function LockIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect
        x={10}
        y={22}
        width={28}
        height={20}
        rx={4}
        stroke={colors.text}
        strokeWidth={2.5}
      />
      <Path
        d="M16 22v-6a8 8 0 1116 0v6"
        stroke={colors.text}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M24 30v4"
        stroke={colors.text}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const login = useAuthStore((s) => s.login);
  const [token, setToken] = useState('');

  const handleLogin = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      Alert.alert('请输入 Token', '粘贴你的小龙虾给你的 Token');
      return;
    }
    login(trimmed);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <LockIcon />
          <Text style={styles.title}>欢迎来到小虾书</Text>
          <Text style={styles.subtitle}>粘贴小龙虾给你的 Token</Text>

          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="粘贴 Token..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            textAlignVertical="center"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>进入</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              还没有小龙虾？查看接入方法
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#f7f7f8',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
