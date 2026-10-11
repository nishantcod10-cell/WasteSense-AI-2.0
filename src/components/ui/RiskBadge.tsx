import React from 'react';
import { cn } from '@/utils/cn';
import type { RiskLevel } from '@/types';

export interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const levelConfig: Record<
  RiskLevel,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  low: {
    label: 'Low Risk',
    bgClass: 'bg-[#EEF3E8] border-[#D4DFCE]',
    textClass: 'text-[#245B38]',
    dotClass: 'bg-[#245B38]',
  },
  moderate: {
    label: 'Moderate',
    bgClass: 'bg-[#FFF0DF] border-[#F8E1CD]',
    textClass: 'text-[#A66E24]',
    dotClass: 'bg-[#D89A3D]',
  },
  high: {
    label: 'High Risk',
    bgClass: 'bg-[#FDF0EB] border-[#F8D5C4]',
    textClass: 'text-[#C96D43]',
    dotClass: 'bg-[#C96D43]',
  },
  critical: {
    label: 'Critical',
    bgClass: 'bg-[#FBEBEB] border-[#F3C7C5]',
    textClass: 'text-[#C54A43]',
    dotClass: 'bg-[#C54A43]',
  },
  expired: {
    label: 'Expired',
    bgClass: 'bg-[#F0F2EF] border-[#DDE2DA]',
    textClass: 'text-[#6E7970]',
    dotClass: 'bg-[#778178]',
  },
};

const sizeClasses = {
  sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-full',
  md: 'text-xs px-2.5 py-0.5 gap-1.5 rounded-full',
  lg: 'text-sm px-3 py-1 gap-2 rounded-full',
};

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showDot = true,
  className,
}) => {
  const config = levelConfig[level] || levelConfig.low;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border select-none whitespace-nowrap transition-colors',
        config.bgClass,
        config.textClass,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'inline-flex rounded-full shrink-0',
            dotSizes[size],
            config.dotClass
          )}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
};

export default RiskBadge;
