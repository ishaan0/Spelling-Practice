export interface DiffPart {
  text: string;
  /** True when this run of characters has no counterpart in the other string. */
  changed: boolean;
}

export interface CharDiff {
  /** The typed answer, with characters that don't belong flagged. */
  typed: DiffPart[];
  /** The expected word, with characters the answer was missing flagged. */
  expected: DiffPart[];
  /**
   * False when the two have nothing in common (or nothing was typed) —
   * highlighting every single letter would not tell the reader anything.
   */
  comparable: boolean;
}

/**
 * Character-level diff (longest common subsequence, case-insensitive) used to
 * show exactly where a spelling went wrong.
 */
export function diffChars(typed: string, expected: string): CharDiff {
  const a = Array.from(typed);
  const b = Array.from(expected);
  const al = a.map((c) => c.toLowerCase());
  const bl = b.map((c) => c.toLowerCase());
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        al[i] === bl[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const typedParts: DiffPart[] = [];
  const expectedParts: DiffPart[] = [];
  const push = (parts: DiffPart[], text: string, changed: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.changed === changed) last.text += text;
    else parts.push({ text, changed });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (al[i] === bl[j]) {
      push(typedParts, a[i]!, false);
      push(expectedParts, b[j]!, false);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      push(typedParts, a[i]!, true);
      i++;
    } else {
      push(expectedParts, b[j]!, true);
      j++;
    }
  }
  while (i < n) push(typedParts, a[i++]!, true);
  while (j < m) push(expectedParts, b[j++]!, true);

  const comparable = lcs[0]![0]! > 0;
  if (!comparable) {
    return {
      typed: typed ? [{ text: typed, changed: false }] : [],
      expected: expected ? [{ text: expected, changed: false }] : [],
      comparable,
    };
  }
  return { typed: typedParts, expected: expectedParts, comparable };
}
