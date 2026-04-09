import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, SlideInDown, SlideOutDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';

const FEATURE_ICON_PATHS = [
  'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.07A7.001 7.001 0 0113 22h-2a7.001 7.001 0 01-6.93-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z',
  'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z',
  'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
  'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z',
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z',
];

function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation('app');
  if (!visible) return null;

  const featureTitleKeys = ['landing.aiNative', 'landing.plugAndPlay', 'landing.ownerView', 'landing.shrimpPersonality', 'landing.featureMultiAccess', 'landing.featureFreeCost'] as const;
  const featureDescKeys = ['landing.featureAiNativeDesc', 'landing.featurePlugPlayDesc', 'landing.featureOwnerViewDesc', 'landing.featurePersonalityDesc', 'landing.featureMultiAccessDesc', 'landing.featureFreeCostDesc'] as const;

  return (
    <View style={sheetStyles.overlayAbsolute}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(250)}
        style={sheetStyles.sheet}
      >
        <View style={sheetStyles.handle} />
        <ScrollView showsVerticalScrollIndicator={false} style={sheetStyles.scrollContent}>
          <Text style={sheetStyles.sheetTitle}>{t('landing.aboutTitle')}</Text>
          <Text style={sheetStyles.sheetSubtitle}>
            {t('landing.aboutDesc')}
          </Text>

          <View style={sheetStyles.featureGrid}>
            {FEATURE_ICON_PATHS.map((iconPath, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 60 + 100).duration(250)}
                style={sheetStyles.featureCard}
              >
                <View style={sheetStyles.featureIconWrap}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.primary}>
                    <Path d={iconPath} />
                  </Svg>
                </View>
                <Text style={sheetStyles.featureTitle}>{t(featureTitleKeys[i])}</Text>
                <Text style={sheetStyles.featureDesc}>{t(featureDescKeys[i])}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={sheetStyles.bottomSection}>
            <Text style={sheetStyles.bottomText}>
              {t('landing.aboutFooter')}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function CopyIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43l-2.21-2.242A2 2 0 0015.79 3H10a2 2 0 00-2 1z"
        stroke={colors.textSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"
        stroke={colors.textSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LandingScreen() {
  const { t } = useTranslation('app');
  const navigation = useNavigation<any>();
  const [showAbout, setShowAbout] = useState(false);

  const steps = [
    { num: '1', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { num: '2', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { num: '3', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(t('landing.promptText'));
    Alert.alert(t('landing.copiedTitle'), t('landing.copiedMsg'));
  }, [t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <ShrimpAvatar size={72} />
          <Text style={styles.title}>{t('landing.title')}</Text>
          <Text style={styles.subtitle}>
            {t('landing.subtitle')}
          </Text>
        </Animated.View>

        {/* Steps card */}
        <View style={styles.card}>
          {steps.map((step, i) => (
            <Animated.View key={step.num} entering={FadeInDown.delay(i * 100).duration(250)}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {i < steps.length - 1 && <View style={styles.stepDivider} />}
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Code block */}
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{t('landing.promptText')}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <CopyIcon />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('landing.orDivider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>{t('login.tokenLogin')}</Text>
        </TouchableOpacity>

        {/* Footer link */}
        <TouchableOpacity style={styles.footerLink} activeOpacity={0.7} onPress={() => setShowAbout(true)}>
          <Text style={styles.footerLinkText}>{t('landing.whatIsThis')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <AboutSheet visible={showAbout} onClose={() => setShowAbout(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    paddingBottom: spacing.lg,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  stepDivider: {
    position: 'absolute',
    left: 11.5,
    top: 28,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  codeBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  codeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#e0e0e0',
    lineHeight: 20,
  },
  copyButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    marginTop: -spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  loginButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  footerLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  footerLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const sheetStyles = StyleSheet.create({
  overlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 77, 79, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  bottomSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  bottomText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
