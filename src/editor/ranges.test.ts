import { describe, expect, it } from 'vitest';
import { adjustRangesAfterEdit, findActiveRange } from './ranges';

const blocks = [
  { id: 'a', type: 'heading', start: 0, end: 10 },
  { id: 'b', type: 'paragraph', start: 12, end: 22 },
];

describe('editor range mapping', () => {
  it('shifts following blocks when text is inserted before them', () => {
    expect(adjustRangesAfterEdit(blocks, 'abcdefghij\n\nklmnopqrst', 'Xabcdefghij\n\nklmnopqrst'))
      .toEqual([{ ...blocks[0], start: 1, end: 11 }, { ...blocks[1], start: 13, end: 23 }]);
  });

  it('keeps changed block selected and contracts its range after deletion', () => {
    const mapped = adjustRangesAfterEdit(blocks, 'abcdefghij\n\nklmnopqrst', 'abc\n\nklmnopqrst');
    expect(mapped[0]).toMatchObject({ id: 'a', start: 0, end: 3 });
    expect(mapped[1]).toMatchObject({ id: 'b', start: 5, end: 15 });
  });

  it('chooses the smallest matching range touched by a non-empty selection', () => {
    const nested = [...blocks, { id: 'inner', type: 'paragraph', start: 16, end: 20 }];
    expect(findActiveRange(nested, 17, 18)?.id).toBe('inner');
    expect(findActiveRange(nested, 17, 18, 'heading')).toBeNull();
  });

  it('chooses the next block when the caret is exactly at a shared boundary', () => {
    const adjacent = [
      { id: 'before', type: 'paragraph', start: 0, end: 10 },
      { id: 'after', type: 'heading', start: 10, end: 20 },
    ];
    expect(findActiveRange(adjacent, 10, 10)?.id).toBe('after');
  });

  it('chooses a nested block at its opening boundary and falls back to the final block end', () => {
    const nested = [
      { id: 'outer', type: 'paragraph', start: 0, end: 30 },
      { id: 'inner', type: 'heading', start: 10, end: 20 },
    ];
    expect(findActiveRange(nested, 10, 10)?.id).toBe('inner');
    expect(findActiveRange(nested, 20, 20)?.id).toBe('outer');
  });
});
