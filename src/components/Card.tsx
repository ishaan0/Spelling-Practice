import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 sm:px-6 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 sm:px-6 py-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl ${className}`}
    >
      {children}
    </div>
  );
}
