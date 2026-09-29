import { vi } from 'vitest';

/**
 * Mock navigator.clipboard.writeText for tests.
 *
 * The cleanest way to make `useClipboard` (and CopyButton) testable is to
 * spy on `navigator.clipboard.writeText` at the time the test runs the click.
 * We expose a helper that returns a fresh vi.fn spy and the function the
 * component will hit.
 */

export interface ClipboardMock {
  writeText: ReturnType<typeof vi.fn>;
}

/**
 * Spy on navigator.clipboard.writeText and return the mock. Tests can call
 * this right before exercising a copy action.
 */
export function __installClipboardMock(): ClipboardMock {
  if (typeof navigator === 'undefined') {
    return { writeText: vi.fn() };
  }

  const fn = vi.fn(async (_text: string) => {});

  // Patch the existing clipboard object in-place. If that fails (frozen),
  // fall back to redefining the property.
  const clipboard = navigator.clipboard as { writeText?: unknown } | undefined;
  if (clipboard) {
    try {
      clipboard.writeText = fn;
    } catch {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: fn },
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: fn },
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
  return { writeText: fn };
}

export function __getClipboardMock(): ClipboardMock {
  // For backwards-compat with tests that didn't capture the spy. Returns
  // whatever writeText is currently installed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { writeText: (navigator.clipboard as any)?.writeText ?? vi.fn() };
}