export function formatPercentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function formatPercentageLabel(correct: number, total: number): string {
  return `${formatPercentage(correct, total)}%`;
}
