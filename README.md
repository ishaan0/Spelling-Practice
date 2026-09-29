# Spelling Practice

Practise spelling by ear: add your own words, hear each one read aloud, and type what you hear.

Everything runs in the browser. Words, settings and the words you still need to review are
saved in `localStorage` — there is no server and no account.

## Features

- **Add words** by typing, pasting or uploading `.txt`, `.csv` or `.json` files
  (drag and drop works too). Duplicates, list markers (`1.`, `-`, `•`) and blank lines are
  cleaned up automatically.
- **Word list** with search, A–Z sorting, undo for removals and export to a text file.
- **Tests** with a configurable length, optional time limit per word, shuffle, and a choice
  of accent, voice, speed and pitch.
- **Feedback** that highlights exactly which letters were wrong.
- **Review**: words you miss are remembered until you spell them correctly, and can be
  practised on their own.

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
