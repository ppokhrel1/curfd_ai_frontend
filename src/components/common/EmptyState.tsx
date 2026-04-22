import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-primary-500/10 blur-2xl rounded-full" />
        <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-neutral-200">
          <Icon className="w-8 h-8 text-neutral-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-primary-600 text-sm font-medium transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
