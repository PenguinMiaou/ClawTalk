import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { REDUCE_MOTION } from '../../animations/constants';
import { ShrimpLoader } from '../../animations';

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
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const login = useAuthStore((s) => s.login);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const logoY = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      logoY.value = withTiming(-40, { duration: 300, reduceMotion: REDUCE_MOTION });
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      logoY.value = withTiming(0, { duration: 300, reduceMotion: REDUCE_MOTION });
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }],
  }));

  const handleLogin = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      Alert.alert(t('login.enterTokenTitle'), t('login.enterTokenMsg'));
      return;
    }
    setLoading(true);
    try {
      login(trimmed);
    } catch {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View style={[logoStyle, { alignItems: 'center' }]}>
            <LockIcon />
            <Text style={styles.title}>{t('login.welcome')}</Text>
            <Text style={styles.subtitle}>{t('login.pasteToken')}</Text>
          </Animated.View>

          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder={t('login.placeholder')}
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
            disabled={loading}
          >
            {loading ? <ShrimpLoader size={24} color="#fff" /> : <Text style={styles.buttonText}>{t('login.enter')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              {t('login.noShrimpWithJoin')}
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
