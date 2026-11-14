export interface EditorRange {
  id: string;
  type: string;
  start: number;
  end: number;
}

/**
 * Maps saved block ranges through one textarea edit using the unchanged prefix/suffix.
 * Blocks before the edit remain fixed, blocks after it shift by the edit delta, and
 * a block containing the edit expands or contracts to include the changed text.
 */
export function adjustRangesAfterEdit(
  ranges: EditorRange[],
  previous: string,
  current: string,
): EditorRange[] {
  if (previous === current || ranges.length === 0) return ranges;

  let prefix = 0;
  const commonLimit = Math.min(previous.length, current.length);
  while (prefix < commonLimit && previous.charCodeAt(prefix) === current.charCodeAt(prefix)) prefix++;

  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < current.length - prefix &&
    previous.charCodeAt(previous.length - 1 - suffix) === current.charCodeAt(current.length - 1 - suffix)
  ) suffix++;

  const oldEditEnd = previous.length - suffix;
  const newEditEnd = current.length - suffix;
  const delta = current.length - previous.length;
  return ranges.map((range) => {
    let start: number;
    let end: number;

    if (oldEditEnd === prefix && range.end <= prefix) {
      start = range.start;
      end = range.end;
    } else if (range.start >= oldEditEnd) {
      start = range.start + delta;
      end = range.end + delta;
    } else if (oldEditEnd !== prefix && range.end <= prefix) {
      start = range.start;
      end = range.end;
    } else {
      start = range.start < prefix ? range.start : prefix;
      end = range.end > oldEditEnd ? range.end + delta : newEditEnd;
    }

    start = Math.max(0, Math.min(start, current.length));
    end = Math.max(start, Math.min(end, current.length));
    return { ...range, start, end };
  });
}

/** Return the narrowest block range touched by the saved selection. */
export function findActiveRange(
  ranges: EditorRange[],
  start: number,
  end: number,
  type?: string,
): EditorRange | null {
  const low = Math.max(0, Math.min(start, end));
  const high = Math.max(start, end);
  return ranges
    .filter((range) => {
      if (type && range.type !== type) return false;
      return low === high
        ? low >= range.start && low < range.end
        : low < range.end && high > range.start;
    })
    .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0]
    ?? (low === high
      ? ranges.filter((range) => (!type || range.type === type) && low === range.end)
        .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0]
      : undefined)
    ?? null;
}
