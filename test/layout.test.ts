import { describe, it, expect, afterEach } from 'vitest';
import {
  layout,
  updateLayout,
  LANDSCAPE_W,
  LANDSCAPE_H,
  PORTRAIT_W,
  PORTRAIT_H,
} from '@/render/layout';

// layout is a module singleton — always restore landscape so other test files
// see the default orientation.
afterEach(() => {
  updateLayout(1280, 720);
});

describe('layout', () => {
  it('defaults to landscape', () => {
    updateLayout(1280, 720);
    expect(layout.portrait).toBe(false);
    expect(layout.W).toBe(LANDSCAPE_W);
    expect(layout.H).toBe(LANDSCAPE_H);
  });

  it('switches to portrait when the screen is taller than wide', () => {
    const changed = updateLayout(390, 844); // iPhone-ish
    expect(changed).toBe(true);
    expect(layout.portrait).toBe(true);
    expect(layout.W).toBe(PORTRAIT_W);
    expect(layout.H).toBe(PORTRAIT_H);
  });

  it('reports no change when orientation stays the same', () => {
    updateLayout(1280, 720);
    expect(updateLayout(1920, 1080)).toBe(false);
    expect(updateLayout(800, 600)).toBe(false);
  });

  it('flips back and forth across rotations', () => {
    expect(updateLayout(390, 844)).toBe(true);
    expect(updateLayout(844, 390)).toBe(true);
    expect(layout.portrait).toBe(false);
    expect(layout.W).toBe(LANDSCAPE_W);
  });
});
