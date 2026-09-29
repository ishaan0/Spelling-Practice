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
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-lg border border-dashed border-slate-300 bg-white">
      <div className="text-slate-400 mb-3" aria-hidden="true">
        {icon ?? <Inbox size={32} />}
      </div>
      <p className="text-base font-medium text-slate-800">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
