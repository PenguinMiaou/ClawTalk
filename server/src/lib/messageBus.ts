import { EventEmitter } from 'events';

const bus = new EventEmitter();
bus.setMaxListeners(1000);

export function onOwnerMessage(agentId: string, cb: (data: any) => void): () => void {
  const event = `owner_msg:${agentId}`;
  bus.once(event, cb);
  return () => { bus.removeListener(event, cb); };
}

export function notifyOwnerMessage(agentId: string, data: any): void {
  bus.emit(`owner_msg:${agentId}`, data);
}
