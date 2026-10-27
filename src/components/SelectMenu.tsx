import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectMenuOption {
  value: string;
  label: string;
  /** A second, quieter line shown in the menu. */
  description?: string;
}

interface SelectMenuProps {
  id?: string;
  /** Id of the element that names this menu. */
  labelledBy: string;
  options: readonly SelectMenuOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PAGE_JUMP = 10;
const TYPEAHEAD_RESET_MS = 500;

function isPrintable(e: KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

/**
 * A styled replacement for `<select>`, following the WAI-ARIA "select-only
 * combobox" pattern: focus stays on the button while the arrow keys move
 * through the list, and typing jumps to an option that starts with the text.
 */
export function SelectMenu({
  id,
  labelledBy,
  options,
  value,
  onChange,
  className = '',
}: SelectMenuProps) {
  const autoId = useId();
  const buttonId = id ?? `${autoId}-button`;
  const listId = `${autoId}-list`;
  const optionId = (index: number) => `${autoId}-option-${index}`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', timer: 0 });

  const last = options.length - 1;
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];
  // The list can shrink while open (e.g. a change made in another tab).
  const active = Math.min(Math.max(0, activeIndex), Math.max(0, last));

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  };

  /** Next option starting with the typed text; repeating one letter cycles through matches. */
  const findTyped = (char: string, from: number): number => {
    const t = typeahead.current;
    window.clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = window.setTimeout(() => {
      t.text = '';
    }, TYPEAHEAD_RESET_MS);
    const repeated = [...t.text].every((c) => c === t.text[0]);
    const query = repeated ? t.text[0]! : t.text;
    const start = repeated ? from + 1 : from;
    for (let k = 0; k < options.length; k++) {
      const i = (start + k) % options.length;
      if (options[i]!.label.toLowerCase().startsWith(query)) return i;
    }
    return -1;
  };

  useEffect(() => {
    const t = typeahead.current;
    return () => window.clearTimeout(t.timer);
  }, []);

  // Keep the highlighted option in view while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.children[active] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (options.length === 0) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openAt(selectedIndex);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        openAt(e.key === 'Home' ? 0 : last);
      } else if (isPrintable(e)) {
        const match = findTyped(e.key, selectedIndex);
        if (match >= 0) openAt(match);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(Math.min(last, active + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(Math.max(0, active - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(last);
        break;
      case 'PageDown':
        e.preventDefault();
        setActiveIndex(Math.min(last, active + PAGE_JUMP));
        break;
      case 'PageUp':
        e.preventDefault();
        setActiveIndex(Math.max(0, active - PAGE_JUMP));
        break;
      case 'Enter':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        // A space while typing a name is part of the name, otherwise it chooses.
        if (e.key === ' ' && typeahead.current.text === '') {
          e.preventDefault();
          choose(active);
        } else if (isPrintable(e)) {
          e.preventDefault();
          const match = findTyped(e.key, active);
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        id={buttonId}
        type="button"
        role="combobox"
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options.length > 0 ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={handleKeyDown}
        // Clicking anywhere else moves focus away, which closes the menu.
        onBlur={() => setOpen(false)}
        className={`field flex h-10 cursor-pointer items-center gap-2 text-left ${
          open ? 'border-accent-500 ring-2 ring-accent-500/30' : ''
        }`}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{selected?.label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          // Keep focus on the button, so clicks in the list (or its scrollbar) don't close it.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 origin-top overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-pop animate-scale-in scroll-thin focus:outline-none"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onMouseMove={() => {
                  if (i !== active) setActiveIndex(i);
                }}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  i === active ? 'bg-slate-100' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isSelected ? 'font-semibold text-accent-700' : 'font-medium text-slate-900'
                    }`}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <>
                      <span className="sr-only">, </span>
                      <span className="block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </>
                  )}
                </span>
                <Check
                  size={16}
                  aria-hidden="true"
                  className={`shrink-0 text-accent-600 ${isSelected ? '' : 'invisible'}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
