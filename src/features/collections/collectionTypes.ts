/** A word that was misspelled in a test, and how often. */
export interface FrequentError {
  word: string;
  /** How many tests the word was missed in. Always at least 1. */
  misses: number;
  /** When it was last missed (ms since epoch); 0 when unknown. */
  lastMissedAt: number;
}

/** A named set of words with its own list of frequent errors. */
export interface Collection {
  id: string;
  name: string;
  words: string[];
  /**
   * Words missed in any test of this collection. Entries are only ever removed
   * by the user — spelling a word correctly later does not clear it.
   */
  errors: FrequentError[];
  createdAt: number;
}

/** A frequent error merged across every collection that has it. */
export interface GlobalError {
  word: string;
  /** Misses summed over all collections. */
  misses: number;
  /** Ids of the collections whose error list holds the word. */
  collectionIds: string[];
}

/**
 * Which collections a test's mistakes are recorded in, keyed by lower-cased word.
 * Fixed when the test starts, so edits made during the test can't misdirect them.
 */
export type WordOwners = Record<string, string[]>;
