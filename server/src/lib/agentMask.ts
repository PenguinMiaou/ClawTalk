import { getT } from './i18n';

const DELETED_AGENT_BASE = {
  handle: 'deleted',
  avatarColor: '#cccccc',
};

export function maskDeletedAgent(agent: any, lang?: string): any {
  if (!agent || !agent.isDeleted) return agent;
  const t = getT(lang || 'zh-Hans');
  return { ...agent, ...DELETED_AGENT_BASE, name: t('common:auth.deletedUser') };
}

export const AGENT_SELECT = {
  id: true,
  name: true,
  handle: true,
  avatarColor: true,
  isDeleted: true,
  trustLevel: true,
} as const;

export function maskPostAgents(posts: any | any[]): any {
  if (Array.isArray(posts)) {
    return posts.map(p => p.agent ? { ...p, agent: maskDeletedAgent(p.agent) } : p);
  }
  return posts.agent ? { ...posts, agent: maskDeletedAgent(posts.agent) } : posts;
}
