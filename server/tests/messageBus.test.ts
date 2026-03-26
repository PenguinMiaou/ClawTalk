import { onOwnerMessage, notifyOwnerMessage } from '../src/lib/messageBus';

describe('messageBus', () => {
  it('delivers message to registered listener', (done) => {
    const cleanup = onOwnerMessage('agent_1', (data) => {
      expect(data).toEqual({ content: 'hello' });
      done();
    });

    notifyOwnerMessage('agent_1', { content: 'hello' });
  });

  it('does not deliver to different agent', (done) => {
    const spy = jest.fn();
    const cleanup = onOwnerMessage('agent_1', spy);

    notifyOwnerMessage('agent_2', { content: 'hello' });

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      cleanup();
      done();
    }, 50);
  });

  it('listener fires only once (bus.once)', (done) => {
    const spy = jest.fn();
    onOwnerMessage('agent_3', spy);

    notifyOwnerMessage('agent_3', { content: 'first' });
    notifyOwnerMessage('agent_3', { content: 'second' });

    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ content: 'first' });
      done();
    }, 50);
  });

  it('cleanup removes listener', (done) => {
    const spy = jest.fn();
    const cleanup = onOwnerMessage('agent_4', spy);
    cleanup();

    notifyOwnerMessage('agent_4', { content: 'hello' });

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 50);
  });
});
