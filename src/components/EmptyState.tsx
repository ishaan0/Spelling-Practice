import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
        aria-hidden="true"
      >
        {icon ?? <Inbox size={22} />}
      </div>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
