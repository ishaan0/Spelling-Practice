import { MAX_COLLECTION_NAME_LENGTH, MAX_COLLECTIONS } from '../../utils/constants';
import { generateId } from '../../utils/ids';
import { uniqueMistakeWords } from '../test/testUtils';
import type { TestSession } from '../test/testTypes';
import type { Collection, FrequentError, GlobalError, WordOwners } from './collectionTypes';

/** Fixed id, so the collection made from an older single word list is stable across reloads. */
export const DEFAULT_COLLECTION_ID = 'default';
export const DEFAULT_COLLECTION_NAME = 'My words';

export function createCollection(name: string, now: number, id: string = generateId()): Collection {
  return { id, name: cleanCollectionName(name), words: [], errors: [], createdAt: now };
}

export function cleanCollectionName(name: string): string {
  return name.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Returns why a name can't be used, or null when it is fine.
 * Names are unique regardless of case; `ignoreId` lets a collection keep its own name.
 */
export function validateCollectionName(
  name: string,
  collections: readonly Collection[],
  ignoreId?: string,
): string | null {
  const cleaned = cleanCollectionName(name);
  if (cleaned.length === 0) return 'Enter a name.';
  if (cleaned.length > MAX_COLLECTION_NAME_LENGTH) {
    return `Use ${MAX_COLLECTION_NAME_LENGTH} characters or fewer.`;
  }
  const key = cleaned.toLowerCase();
  if (collections.some((c) => c.id !== ignoreId && c.name.toLowerCase() === key)) {
    return 'A collection with this name already exists.';
  }
  return null;
}

export function canAddCollection(collections: readonly Collection[]): boolean {
  return collections.length < MAX_COLLECTIONS;
}

/** Most-missed first; ties go to the most recently missed. */
export function sortErrors(errors: readonly FrequentError[]): FrequentError[] {
  return [...errors].sort((a, b) => b.misses - a.misses || b.lastMissedAt - a.lastMissedAt);
}

/** Adds each word to the list, or counts one more miss when it is already there. */
export function addErrors(
  errors: readonly FrequentError[],
  words: readonly string[],
  now: number,
): FrequentError[] {
  const next = errors.slice();
  const index = new Map(next.map((e, i) => [e.word.toLowerCase(), i]));
  for (const word of words) {
    const key = word.toLowerCase();
    const i = index.get(key);
    const existing = i === undefined ? undefined : next[i];
    if (i !== undefined && existing) {
      next[i] = { ...existing, misses: existing.misses + 1, lastMissedAt: now };
    } else {
      index.set(key, next.length);
      next.push({ word, misses: 1, lastMissedAt: now });
    }
  }
  return next;
}

export function removeErrors(
  errors: readonly FrequentError[],
  words: readonly string[],
): FrequentError[] {
  const remove = new Set(words.map((w) => w.toLowerCase()));
  return errors.filter((e) => !remove.has(e.word.toLowerCase()));
}

/**
 * Puts removed entries back (for Undo). Entries that have been re-added in the
 * meantime are left alone so a newer miss count is not overwritten.
 */
export function restoreErrors(
  errors: readonly FrequentError[],
  entries: readonly FrequentError[],
): FrequentError[] {
  const present = new Set(errors.map((e) => e.word.toLowerCase()));
  return [...errors, ...entries.filter((e) => !present.has(e.word.toLowerCase()))];
}

/** Every collection's mistakes from a test are recorded where `owners` says they belong. */
export function recordMistakes(
  collections: readonly Collection[],
  session: TestSession,
  owners: WordOwners,
  now: number,
): Collection[] {
  const byCollection = new Map<string, string[]>();
  for (const word of uniqueMistakeWords(session)) {
    for (const id of owners[word.toLowerCase()] ?? []) {
      const list = byCollection.get(id);
      if (list) list.push(word);
      else byCollection.set(id, [word]);
    }
  }
  if (byCollection.size === 0) return collections.slice();
  return collections.map((c) => {
    const missed = byCollection.get(c.id);
    return missed ? { ...c, errors: addErrors(c.errors, missed, now) } : c;
  });
}

/**
 * The frequent errors of all collections, each word once (case-insensitive,
 * first spelling seen), most-missed first.
 */
export function collectGlobalErrors(collections: readonly Collection[]): GlobalError[] {
  const merged = new Map<string, GlobalError>();
  for (const c of collections) {
    for (const e of c.errors) {
      const key = e.word.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.misses += e.misses;
        if (!existing.collectionIds.includes(c.id)) existing.collectionIds.push(c.id);
      } else {
        merged.set(key, { word: e.word, misses: e.misses, collectionIds: [c.id] });
      }
    }
  }
  return [...merged.values()].sort(
    (a, b) => b.misses - a.misses || a.word.localeCompare(b.word, undefined, { sensitivity: 'base' }),
  );
}

/** Mistakes on any of these words go to a single collection. */
export function ownersFor(words: readonly string[], collectionId: string): WordOwners {
  const owners: WordOwners = {};
  for (const word of words) owners[word.toLowerCase()] = [collectionId];
  return owners;
}

/** Mistakes in a test of global errors go back to every collection the word came from. */
export function ownersForGlobalErrors(errors: readonly GlobalError[]): WordOwners {
  const owners: WordOwners = {};
  for (const e of errors) owners[e.word.toLowerCase()] = [...e.collectionIds];
  return owners;
}
