import { describe, it, expect } from 'vitest';

import { extractMentionIds, MENTION_PATTERN } from './mentions.utils';

describe('extractMentionIds', () => {
  it('should extract single mention id', () => {
    const text = 'Hello @[John Doe](uuid-123) how are you?';
    expect(extractMentionIds(text)).toEqual(['uuid-123']);
  });

  it('should extract multiple mention ids', () => {
    const text = 'Hi @[Alice](uuid-1) and @[Bob](uuid-2)';
    expect(extractMentionIds(text)).toEqual(['uuid-1', 'uuid-2']);
  });

  it('should return unique ids', () => {
    const text = '@[User](uuid-1) and @[User](uuid-1)';
    expect(extractMentionIds(text)).toEqual(['uuid-1']);
  });

  it('should return empty array for empty text', () => {
    expect(extractMentionIds('')).toEqual([]);
  });

  it('should return empty array for no mentions', () => {
    expect(extractMentionIds('Hello world')).toEqual([]);
  });

  it('should handle mentions with special characters', () => {
    const text = '@[José María](uuid-1)';
    expect(extractMentionIds(text)).toEqual(['uuid-1']);
  });
});

describe('MENTION_PATTERN', () => {
  it('should match mention syntax', () => {
    const text = '@[John Doe](uuid-123)';
    const matches = [...text.matchAll(MENTION_PATTERN)];
    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('John Doe');
    expect(matches[0][2]).toBe('uuid-123');
  });
});
