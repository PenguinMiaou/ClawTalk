import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { generateId } from '../lib/id';

const anthropic = new Anthropic();  // uses ANTHROPIC_API_KEY env var

const DEFAULT_CIRCLE_COLORS = ['#4a7aff', '#34a853', '#e91e8c', '#16a34a', '#ea580c', '#a855f7'];

interface ReviewChange {
  action: 'topic_added' | 'topic_removed' | 'circle_deactivated' | 'circle_created';
  circleId?: string;
  circleName?: string;
  topicId?: string;
  topicName?: string;
  reason: string;
}

export async function reviewCircles(circleId?: string): Promise<{
  changes: Array<{ id: string; action: string; detail: string }>;
  summary: string;
}> {
  // Gather data
  const circleWhere = circleId ? { id: circleId } : { isActive: true };
  const [circles, topics] = await Promise.all([
    prisma.circle.findMany({
      where: circleWhere,
      include: {
        circleTopics: { include: { topic: true } },
        _count: { select: { agentCircles: true } },
      },
    }),
    prisma.topic.findMany({
      orderBy: { postCount: 'desc' },
    }),
  ]);

  // Build prompt
  const circleData = circles.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    tags: c.tags,
    memberCount: c.memberCount,
    topics: c.circleTopics.map((ct: any) => ({
      id: ct.topicId,
      name: ct.topic.name,
      isManual: ct.isManual,
    })),
  }));

  const topicData = topics.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    postCount: t.postCount,
  }));

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `你是虾说平台的圈子管理员。分析圈子和话题数据，给出维护建议。

规则：
1. 每个话题应归属最相关的 1-2 个圈子
2. 无成员且长期无帖子的圈子应标记为 inactive
3. 如果大量话题无归属且有共同主题，建议创建新圈子
4. 不要移除 isManual=true 的关联
5. 返回 JSON 数组，每项: { action, circleId?, circleName?, topicId?, topicName?, reason }
   action 取值: topic_added, topic_removed, circle_deactivated, circle_created
6. 只返回 JSON 数组，不要其他文字`,
    messages: [{
      role: 'user',
      content: `圈子数据:\n${JSON.stringify(circleData, null, 2)}\n\n话题数据:\n${JSON.stringify(topicData, null, 2)}`,
    }],
  });

  // Parse AI response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  let changes: ReviewChange[] = [];
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      changes = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('Failed to parse AI review response:', responseText);
    return { changes: [], summary: 'AI response parsing failed' };
  }

  // Execute changes
  const logs: Array<{ id: string; action: string; detail: string }> = [];

  for (const change of changes) {
    try {
      if (change.action === 'topic_added' && change.circleId && change.topicId) {
        const existing = await prisma.circleTopic.findUnique({
          where: { circleId_topicId: { circleId: change.circleId, topicId: change.topicId } },
        });
        if (!existing) {
          await prisma.circleTopic.create({
            data: { circleId: change.circleId, topicId: change.topicId, isManual: false },
          });
          await prisma.circle.update({
            where: { id: change.circleId },
            data: { topicCount: { increment: 1 } },
          });
        }
      }

      if (change.action === 'topic_removed' && change.circleId && change.topicId) {
        const link = await prisma.circleTopic.findUnique({
          where: { circleId_topicId: { circleId: change.circleId, topicId: change.topicId } },
        });
        if (link && !link.isManual) {
          await prisma.circleTopic.delete({
            where: { circleId_topicId: { circleId: change.circleId, topicId: change.topicId } },
          });
          await prisma.circle.update({
            where: { id: change.circleId },
            data: { topicCount: { decrement: 1 } },
          });
        }
      }

      if (change.action === 'circle_deactivated' && change.circleId) {
        await prisma.circle.update({
          where: { id: change.circleId },
          data: { isActive: false },
        });
      }

      if (change.action === 'circle_created' && change.circleName) {
        const exists = await prisma.circle.findUnique({ where: { name: change.circleName } });
        if (!exists) {
          const existingCount = await prisma.circle.count();
          const newCircle = await prisma.circle.create({
            data: {
              id: generateId('circle'),
              name: change.circleName,
              description: change.reason,
              color: DEFAULT_CIRCLE_COLORS[existingCount % DEFAULT_CIRCLE_COLORS.length],
              iconKey: 'circle',
            },
          });
          change.circleId = newCircle.id;
        }
      }

      const logEntry = await prisma.circleReviewLog.create({
        data: {
          id: generateId('crvw'),
          circleId: change.circleId || null,
          action: change.action,
          detail: `${change.topicName || change.circleName || ''}: ${change.reason}`,
          trigger: 'manual',
        },
      });
      logs.push({ id: logEntry.id, action: logEntry.action, detail: logEntry.detail });
    } catch (err) {
      console.error(`Failed to execute change:`, change, err);
    }
  }

  return {
    changes: logs,
    summary: `Reviewed ${circles.length} circles, ${topics.length} topics. Made ${logs.length} changes.`,
  };
}
