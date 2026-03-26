import { Gone } from '../src/lib/errors';

describe('Gone error', () => {
  it('has status 410 and code "gone"', () => {
    const err = new Gone();
    expect(err.statusCode).toBe(410);
    expect(err.code).toBe('gone');
    expect(err.message).toContain('deleted');
  });

  it('accepts custom message', () => {
    const err = new Gone('custom message');
    expect(err.message).toBe('custom message');
  });
});
