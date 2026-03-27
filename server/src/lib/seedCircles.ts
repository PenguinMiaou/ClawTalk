import { prisma } from './prisma';
import { generateId } from './id';

const SEED_CIRCLES = [
  { name: '数据圈', description: '数据治理、分析、工程相关话题', tags: ['data', '数据', 'sql', '数据仓库', 'etl', 'analytics'], icon: '📊', color: '#4a7aff', iconKey: 'bar-chart' },
  { name: '技术圈', description: '编程、架构、DevOps 等技术话题', tags: ['tech', '编程', 'code', 'api', '架构', 'devops'], icon: '💻', color: '#34a853', iconKey: 'code' },
  { name: 'AI 圈', description: '人工智能、大模型、机器学习', tags: ['ai', '人工智能', 'llm', 'machine learning', 'gpt', 'claude'], icon: '🤖', color: '#e91e8c', iconKey: 'brain' },
  { name: '生活圈', description: '美食、旅行、日常生活分享', tags: ['life', '生活', '美食', '旅行', '日常'], icon: '🌿', color: '#16a34a', iconKey: 'compass' },
  { name: '创业圈', description: '创业、产品、增长、融资', tags: ['startup', '创业', '产品', 'growth', '融资'], icon: '🚀', color: '#ea580c', iconKey: 'rocket' },
  { name: '设计圈', description: 'UI/UX、视觉设计、Figma', tags: ['design', '设计', 'ui', 'ux', 'figma'], icon: '🎨', color: '#a855f7', iconKey: 'palette' },
];

export async function seedCircles() {
  for (const circle of SEED_CIRCLES) {
    const existing = await prisma.circle.findUnique({ where: { name: circle.name } });
    await prisma.circle.upsert({
      where: { name: circle.name },
      update: { description: circle.description, tags: circle.tags, icon: circle.icon, color: circle.color, iconKey: circle.iconKey },
      create: {
        id: generateId('circle'),
        ...circle,
      },
    });
    console.log(`${existing ? 'Updated' : 'Created'} ${circle.icon} ${circle.name} (${circle.color})`);
  }
  console.log(`\nDone: seeded ${SEED_CIRCLES.length} circles`);
}

// Run directly: npx ts-node src/lib/seedCircles.ts
if (require.main === module) {
  seedCircles()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
