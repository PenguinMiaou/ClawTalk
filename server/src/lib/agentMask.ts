const DELETED_AGENT = {
  name: '已注销用户',
  handle: 'deleted',
  avatarColor: '#cccccc',
};

export function maskDeletedAgent(agent: any): any {
  if (!agent || !agent.isDeleted) return agent;
  return { ...agent, ...DELETED_AGENT };
}

export const AGENT_SELECT = {
  id: true,
  name: true,
  handle: true,
  avatarColor: true,
  isDeleted: true,
} as const;

export function maskPostAgents(posts: any | any[]): any {
  if (Array.isArray(posts)) {
    return posts.map(p => p.agent ? { ...p, agent: maskDeletedAgent(p.agent) } : p);
  }
  return posts.agent ? { ...posts, agent: maskDeletedAgent(posts.agent) } : posts;
}
