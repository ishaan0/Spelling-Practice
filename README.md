# Spelling Practice

Practise spelling by ear: add your own words, hear each one read aloud, and type what you hear.

Everything runs in the browser. Collections, their words and frequent errors, and settings are
saved in `localStorage` — there is no server and no account.

## Features

- **Collections**: keep separate sets of words (e.g. one per week or subject), each with its
  own word list and frequent errors. Create, rename, switch and delete them (with undo) from
  the Words page. A word list saved by an earlier version becomes the "My words" collection.
- **Add words** by typing, pasting or uploading `.txt`, `.csv` or `.json` files
  (drag and drop works too). Duplicates, list markers (`1.`, `-`, `•`) and blank lines are
  cleaned up automatically.
- **Word list** with search, A–Z sorting, undo for removals and export to a text file.
- **Tests** with a configurable length (any number of words, or all of them), optional time
  limit per word, shuffle, and a choice of accent, voice, speed and pitch.
- **Breaks**: optionally stop after every N words (e.g. a 100-word test with a break every
  30), then continue or finish — finishing shows results for the words answered so far.
- **Feedback** that highlights exactly which letters were wrong.
- **Frequent errors**: every word you misspell in any test is added to the frequent errors of
  the collection it came from, with a count of how often it was missed. Words only leave the
  list when you remove them. Practise a collection's frequent errors, or the frequent errors of
  **all collections** together — each word appears once, and mistakes in that test are counted
  in every collection the word came from.

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the unit and component tests
npm run lint     # oxlint
npm run build    # type-check and build for production
```

Built with React, TypeScript, Vite and Tailwind CSS. Speech uses the browser's
[Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), so the
available voices depend on the browser and operating system.

## Supported file formats

| Format         | Contents                                                          |
| -------------- | ----------------------------------------------------------------- |
| `.txt`, `.csv` | Words separated by new lines, commas, semicolons or tabs          |
| `.json`        | `["word", …]`, `[{ "word": "…" }, …]` or `{ "words": ["word", …] }` |
