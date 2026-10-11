import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  value: number; // 0 - 100
  color?: 'primary' | 'amber' | 'coral' | 'lime';
  animated?: boolean;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorStyles = {
  primary: 'bg-[#245B38]',
  amber: 'bg-[#D89A3D]',
  coral: 'bg-[#C54A43]',
  lime: 'bg-[#4F8A4B]',
};

const heightStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'primary',
  animated = true,
  label,
  showPercent = false,
  size = 'md',
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const clampedValue = Math.min(Math.max(isNaN(value) ? 0 : value, 0), 100);

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs font-medium text-[#58645A] select-none">
          {label ? <span>{label}</span> : <span />}
          {showPercent && (
            <span className="font-mono text-[#17231B] font-semibold">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-[#EEF3E8] border border-[#D4DFCE] rounded-full overflow-hidden p-0.5',
          heightStyles[size]
        )}
      >
        <motion.div
          initial={animated && !shouldReduceMotion ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className={cn('h-full rounded-full transition-colors', colorStyles[color])}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
