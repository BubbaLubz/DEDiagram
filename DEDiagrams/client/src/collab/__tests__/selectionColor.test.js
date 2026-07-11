import { describe, it, expect } from 'vitest';
import { colorForUserId } from '../selectionColor';

describe('colorForUserId', () => {
  it('is deterministic for the same user id', () => {
    const id = 'user-abc-123';
    const first = colorForUserId(id);
    for (let i = 0; i < 20; i++) {
      expect(colorForUserId(id)).toBe(first);
    }
  });

  it('always returns a value from the palette (hex color)', () => {
    const ids = ['a', 'user-1', 'github|9182734', 'google|00112233', 'zzzzzzzz'];
    for (const id of ids) {
      expect(colorForUserId(id)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('spreads different ids across more than one color', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `user-${i}`);
    const colors = new Set(ids.map(colorForUserId));
    // Not asserting perfect distribution, just that it's not collapsing
    // every id onto a single color (which would defeat "different color per user").
    expect(colors.size).toBeGreaterThan(1);
  });
});
