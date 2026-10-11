import React from 'react';
import { cn } from '@/utils/cn';
import Button from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'glass-card p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-ws-bg-card border border-ws-border flex items-center justify-center text-ws-text-muted mb-4 shadow-inner">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
              className: cn('w-8 h-8 text-ws-text-muted', (icon.props as any)?.className),
            })
          : icon}
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-ws-text mb-2">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-ws-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
