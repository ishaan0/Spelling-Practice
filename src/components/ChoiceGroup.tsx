import type { ReactNode } from 'react';

interface ChoiceGroupProps {
  label: string;
  children: ReactNode;
}

/** A row of mutually exclusive options. */
export function ChoiceGroup({ label, children }: ChoiceGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
}

interface ChoiceProps {
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function Choice({ active, onSelect, children, disabled }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      disabled={disabled}
      className={`h-9 min-w-[3rem] whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-accent-600 bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-600'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
