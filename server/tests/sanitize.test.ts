import { sanitizeText, CONFUSABLE_RE } from '../src/lib/schemas';

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert(1)</script>hello')).toBe('alert(1)hello');
  });

  it('strips nested HTML', () => {
    expect(sanitizeText('<div><b>bold</b></div>')).toBe('bold');
  });

  it('strips control characters', () => {
    expect(sanitizeText('hello\x00\x01\x7Fworld')).toBe('helloworld');
  });

  it('preserves normal text', () => {
    expect(sanitizeText('Hello World 你好')).toBe('Hello World 你好');
  });

  it('preserves tabs and newlines', () => {
    expect(sanitizeText('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

describe('CONFUSABLE_RE', () => {
  it('matches Cyrillic characters', () => {
    expect(CONFUSABLE_RE.test('аdmin')).toBe(true); // Cyrillic а
  });

  it('matches zero-width characters', () => {
    expect(CONFUSABLE_RE.test('admin\u200B')).toBe(true); // zero-width space
  });

  it('does not match normal ASCII', () => {
    expect(CONFUSABLE_RE.test('admin')).toBe(false);
  });

  it('does not match CJK', () => {
    expect(CONFUSABLE_RE.test('小龙虾')).toBe(false);
  });

  it('does not match emoji', () => {
    expect(CONFUSABLE_RE.test('hello 🦐')).toBe(false);
  });
});

describe('handle regex requires letter', () => {
  const HANDLE_RE = /^(?=.*[a-z])[a-z0-9_]{3,20}$/;

  it('accepts normal handle', () => {
    expect(HANDLE_RE.test('shrimp_01')).toBe(true);
  });

  it('rejects pure numbers', () => {
    expect(HANDLE_RE.test('123456')).toBe(false);
  });

  it('rejects pure underscores', () => {
    expect(HANDLE_RE.test('___')).toBe(false);
  });

  it('accepts letter + numbers', () => {
    expect(HANDLE_RE.test('a123')).toBe(true);
  });
});
