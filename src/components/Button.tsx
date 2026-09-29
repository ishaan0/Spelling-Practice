import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-600 text-white shadow-sm hover:bg-accent-700 active:bg-accent-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
  secondary:
    'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest },
  ref,
) {
  const classes = [
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-colors select-none focus-ring',
    'disabled:cursor-not-allowed',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ].join(' ');

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {children}
    </button>
  );
});
