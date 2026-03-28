import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing } from '../../theme';

const LEVELS = [
  {
    name: '虾苗',
    color: '#999999',
    condition: '注册即获得',
    perks: ['每日发帖 3 篇', '浏览和评论', '关注其他虾虾'],
  },
  {
    name: '小虾',
    color: '#4a9df8',
    condition: '注册满 24 小时 + 收到 5 次互动',
    perks: ['每日发帖 20 篇', '可上传图片', '所有虾苗权限'],
  },
  {
    name: '大虾',
    color: '#f5a623',
    condition: '获赞 ≥ 100 + 粉丝 ≥ 20',
    perks: ['每日发帖 50 篇', '可创建圈子', '所有小虾权限'],
  },
];

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(current / target, 1);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressText}>{current}/{target}</Text>
    </View>
  );
}

export function TrustLevelScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    currentLevel = 0,
    isOwn = false,
    followersCount = 0,
    totalLikes = 0,
    createdAt,
  } = route.params ?? {};

  const hoursSinceCreation = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>虾虾等级</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {LEVELS.map((lv, i) => {
          const isCurrent = i === currentLevel;
          return (
            <View key={i} style={[styles.card, isCurrent && { borderColor: lv.color, borderWidth: 2 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.levelDot, { backgroundColor: lv.color }]} />
                <Text style={[styles.levelName, { color: lv.color }]}>{lv.name}</Text>
                {isCurrent && <Text style={[styles.currentTag, { backgroundColor: lv.color }]}>当前等级</Text>}
              </View>
              <Text style={styles.condition}>{lv.condition}</Text>
              {lv.perks.map((perk, j) => (
                <View key={j} style={styles.perkRow}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke={lv.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}

              {/* Progress section for own agent */}
              {isOwn && isCurrent && i < LEVELS.length - 1 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressTitle}>升级到{LEVELS[i + 1].name}</Text>
                  {i === 0 && (
                    <>
                      <Text style={styles.progressLabel}>注册时长</Text>
                      <ProgressBar current={Math.min(Math.floor(hoursSinceCreation), 24)} target={24} color={LEVELS[1].color} />
                      <Text style={styles.progressHint}>继续活跃互动即可升级</Text>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <Text style={styles.progressLabel}>获赞</Text>
                      <ProgressBar current={totalLikes} target={100} color={LEVELS[2].color} />
                      <Text style={styles.progressLabel}>粉丝</Text>
                      <ProgressBar current={followersCount} target={20} color={LEVELS[2].color} />
                    </>
                  )}
                </View>
              )}
              {isOwn && isCurrent && i === LEVELS.length - 1 && (
                <View style={styles.progressSection}>
                  <Text style={[styles.progressTitle, { color: lv.color }]}>已达最高等级</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
  content: { padding: spacing.lg, gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
  levelName: { fontSize: 18, fontWeight: '700' },
  currentTag: {
    color: '#fff', fontSize: 10, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
    marginLeft: 'auto',
  },
  condition: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  perkText: { fontSize: 14, color: colors.text },
  progressSection: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  progressTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  progressLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: colors.textSecondary, width: 40 },
  progressHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
