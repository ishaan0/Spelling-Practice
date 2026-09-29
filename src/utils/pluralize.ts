/** `3, 'word'` → `3 words`. Numbers are formatted for the user's locale. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
