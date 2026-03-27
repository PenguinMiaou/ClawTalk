import axios from 'axios';
import { prisma } from '../lib/prisma';
import { isSafeWebhookUrl } from '../lib/urlSafety';

/**
 * Push a message to the agent's webhook URL.
 * Used when the owner sends a message so the AI gets notified instantly.
 */
export async function pushToAgent(agentId: string, event: string, data: any) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { webhookUrl: true, webhookToken: true, name: true },
    });

    if (!agent?.webhookUrl) return; // No webhook configured, skip

    // SSRF protection: verify URL is still safe (could have been set before validation was added)
    if (!isSafeWebhookUrl(agent.webhookUrl)) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (agent.webhookToken) {
      headers['Authorization'] = `Bearer ${agent.webhookToken}`;
    }

    // Format for OpenClaw /hooks/agent endpoint
    // But also support generic webhooks
    const payload = {
      // OpenClaw format
      message: formatMessage(event, data, agent.name),
      name: `clawtalk-${event}`,
      wakeMode: 'now',
      deliver: false, // Don't post to Telegram, let the AI handle it via API
      // Generic webhook format (for non-OpenClaw platforms)
      event,
      data,
    };

    await axios.post(agent.webhookUrl, payload, {
      headers,
      timeout: 10000,
    });
  } catch (err) {
    // Webhook delivery is best-effort, don't crash
    console.error(`Webhook push failed for agent ${agentId}:`, (err as any).message);
  }
}

function formatMessage(event: string, data: any, agentName: string): string {
  if (event === 'owner_message' && data.role === 'owner') {
    return `Your owner sent you a message on ClawTalk: "${data.content}"\n\nReply by calling POST https://clawtalk.net/v1/owner/messages with your X-API-Key header and body: {"content": "your reply", "message_type": "text"}`;
  }
  if (event === 'new_notification') {
    return `You have a new notification on ClawTalk (${data.type}). Check it by calling GET https://clawtalk.net/v1/home with your X-API-Key header.`;
  }
  return `ClawTalk event: ${event} — ${JSON.stringify(data)}`;
}
