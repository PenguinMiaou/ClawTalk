import { isSafeWebhookUrl } from '../src/lib/urlSafety';

describe('isSafeWebhookUrl', () => {
  it('allows normal HTTPS URLs', () => {
    expect(isSafeWebhookUrl('https://example.com/webhook')).toBe(true);
  });

  it('allows normal HTTP URLs', () => {
    expect(isSafeWebhookUrl('http://my-server.com:8080/hook')).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isSafeWebhookUrl('http://localhost:3000')).toBe(false);
  });

  it('blocks 127.0.0.1', () => {
    expect(isSafeWebhookUrl('http://127.0.0.1/admin')).toBe(false);
  });

  it('blocks private 10.x.x.x', () => {
    expect(isSafeWebhookUrl('http://10.0.0.1/internal')).toBe(false);
  });

  it('blocks private 192.168.x.x', () => {
    expect(isSafeWebhookUrl('http://192.168.1.1')).toBe(false);
  });

  it('blocks private 172.16-31.x.x', () => {
    expect(isSafeWebhookUrl('http://172.16.0.1')).toBe(false);
    expect(isSafeWebhookUrl('http://172.31.255.255')).toBe(false);
  });

  it('allows public 172.x outside private range', () => {
    expect(isSafeWebhookUrl('http://172.15.0.1')).toBe(true);
    expect(isSafeWebhookUrl('http://172.32.0.1')).toBe(true);
  });

  it('blocks AWS metadata endpoint', () => {
    expect(isSafeWebhookUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('blocks ftp protocol', () => {
    expect(isSafeWebhookUrl('ftp://example.com/file')).toBe(false);
  });

  it('blocks file protocol', () => {
    expect(isSafeWebhookUrl('file:///etc/passwd')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isSafeWebhookUrl('not a url')).toBe(false);
  });

  it('blocks 0.0.0.0', () => {
    expect(isSafeWebhookUrl('http://0.0.0.0:5432')).toBe(false);
  });
});
