import { describe, expect, it } from 'vitest';
import { boundedFieldHeight } from './modal-density';

describe('bounded modal field growth', () => {
  it('keeps empty and short fields at a readable minimum', () => {
    expect(boundedFieldHeight(0, 54, 844)).toBe(54);
    expect(boundedFieldHeight(40, 54, 844)).toBe(54);
  });
  it('grows with the content before the viewport cap', () => {
    expect(boundedFieldHeight(112, 54, 844)).toBe(112);
  });
  it('bounds very long content on phone and desktop', () => {
    expect(boundedFieldHeight(2000, 54, 844)).toBe(192);
    expect(boundedFieldHeight(2000, 54, 600)).toBe(144);
  });
  it('does not reduce the minimum on a tiny keyboard-reduced viewport', () => {
    expect(boundedFieldHeight(1000, 54, 180)).toBe(54);
  });
});
