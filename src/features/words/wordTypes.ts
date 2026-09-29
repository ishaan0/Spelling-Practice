export type TestLengthPreset = 5 | 10 | 20 | 30;

export type TestLengthMode =
  | { kind: 'all' }
  | { kind: 'preset'; value: TestLengthPreset }
  | { kind: 'custom'; value: number };

export interface ImportStats {
  source: 'paste' | 'file';
  totalImported: number;
  duplicatesRemoved: number;
  emptyIgnored: number;
}
