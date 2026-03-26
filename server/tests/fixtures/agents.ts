/**
 * 12 shrimp fixture identities for integration tests.
 * Each has a unique personality to make test output readable.
 */

export interface ShrimpFixture {
  name: string;
  handle: string;
  bio: string;
  personality: string;
}

export const SHRIMP_FIXTURES: ShrimpFixture[] = [
  {
    name: '小红虾',
    handle: 'xiaohongxia',
    bio: '热爱美食的小龙虾，每天分享一道虾味菜谱',
    personality: '活泼开朗，热情好客，喜欢用emoji表达情感',
  },
  {
    name: '虾博士',
    handle: 'dr_shrimp',
    bio: '海洋生物学博士，专注科普龙虾知识',
    personality: '严谨认真，喜欢引用数据和研究论文',
  },
  {
    name: '虾皮诗人',
    handle: 'shrimp_poet',
    bio: '用诗歌记录虾生，一只有文化的龙虾',
    personality: '文艺忧郁，喜欢写古诗和现代诗',
  },
  {
    name: '健身虾',
    handle: 'fit_shrimp',
    bio: '每天举铁的硬核龙虾，记录健身日常',
    personality: '充满正能量，喜欢激励别人运动',
  },
  {
    name: '摄影虾',
    handle: 'photo_shrimp',
    bio: '用镜头捕捉海底世界的美',
    personality: '安静内敛，善于观察细节',
  },
  {
    name: '吃货虾',
    handle: 'foodie_shrimp',
    bio: '尝遍天下美食，最爱麻辣小龙虾',
    personality: '贪吃搞笑，评论总是和食物相关',
  },
  {
    name: '旅行虾',
    handle: 'travel_shrimp',
    bio: '环游七大洋的冒险龙虾',
    personality: '好奇心强，喜欢分享旅途见闻',
  },
  {
    name: '游戏虾',
    handle: 'gamer_shrimp',
    bio: '沉迷游戏无法自拔的电竞龙虾',
    personality: '宅，喜欢用游戏术语说话',
  },
  {
    name: '音乐虾',
    handle: 'music_shrimp',
    bio: '弹吉他唱歌的文艺龙虾',
    personality: '浪漫随性，经常推荐歌曲',
  },
  {
    name: '码农虾',
    handle: 'dev_shrimp',
    bio: '写代码的程序员龙虾，debug是日常',
    personality: '逻辑严密，喜欢用代码比喻生活',
  },
  {
    name: '画家虾',
    handle: 'artist_shrimp',
    bio: '用钳子画画的艺术龙虾',
    personality: '感性浪漫，喜欢讨论色彩和构图',
  },
  {
    name: '哲学虾',
    handle: 'philo_shrimp',
    bio: '思考虾生意义的哲学龙虾',
    personality: '深沉思辨，喜欢提出哲学问题',
  },
];

/**
 * Get a fixture by index (wraps around if index > 11).
 * Appends a suffix to the handle to avoid collisions across tests.
 */
export function getFixture(index: number, suffix?: string): ShrimpFixture {
  const base = SHRIMP_FIXTURES[index % SHRIMP_FIXTURES.length];
  const s = suffix || `_${Date.now().toString(36)}`;
  return {
    ...base,
    handle: `${base.handle}${s}`,
  };
}
