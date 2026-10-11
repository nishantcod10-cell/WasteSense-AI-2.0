import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import GlassCard from './GlassCard';

export interface KPICardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  colorScheme: 'primary' | 'amber' | 'coral' | 'lime';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorSchemeConfig = {
  primary: {
    glow: 'none' as const,
    text: 'text-[#245B38]',
    bg: 'bg-[#EEF3E8]',
    border: 'border-[#D4DFCE]',
    stroke: '#245B38',
    fillGradient: 'url(#sparkline-primary)',
  },
  amber: {
    glow: 'none' as const,
    text: 'text-[#A66E24]',
    bg: 'bg-[#FFF0DF]',
    border: 'border-[#F8E1CD]',
    stroke: '#D89A3D',
    fillGradient: 'url(#sparkline-amber)',
  },
  coral: {
    glow: 'none' as const,
    text: 'text-[#C54A43]',
    bg: 'bg-[#FBEBEB]',
    border: 'border-[#F3C7C5]',
    stroke: '#C54A43',
    fillGradient: 'url(#sparkline-coral)',
  },
  lime: {
    glow: 'none' as const,
    text: 'text-[#245B38]',
    bg: 'bg-[#E4F0DE]',
    border: 'border-[#DCE8D3]',
    stroke: '#4F8A4B',
    fillGradient: 'url(#sparkline-lime)',
  },
};

const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 0 }) => {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (latest) =>
    decimals > 0
      ? latest.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  previousValue,
  unit = '',
  icon,
  trend,
  trendLabel,
  colorScheme = 'primary',
  loading = false,
  onClick,
  className,
}) => {
  const colors = colorSchemeConfig[colorScheme] || colorSchemeConfig.primary;

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const decimals = typeof value === 'number' && value % 1 !== 0 ? 1 : 0;

  // Compute percentage change if previousValue is supplied
  let computedPercentChange: number | null = null;
  let derivedTrend = trend;

  if (typeof previousValue === 'number' && previousValue !== 0 && !isNaN(numericValue)) {
    computedPercentChange = ((numericValue - previousValue) / Math.abs(previousValue)) * 100;
    if (!derivedTrend) {
      if (computedPercentChange > 0.05) derivedTrend = 'up';
      else if (computedPercentChange < -0.05) derivedTrend = 'down';
      else derivedTrend = 'neutral';
    }
  }

  const renderTrendIcon = () => {
    switch (derivedTrend) {
      case 'up':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'down':
        return <TrendingDown className="w-3.5 h-3.5" />;
      default:
        return <Minus className="w-3.5 h-3.5" />;
    }
  };

  const trendColorClass =
    derivedTrend === 'up'
      ? 'text-[#245B38] bg-[#EEF3E8] border-[#D4DFCE]'
      : derivedTrend === 'down'
      ? 'text-[#C54A43] bg-[#FBEBEB] border-[#F3C7C5]'
      : 'text-[#778178] bg-[#F0F2EF] border-[#E7E4DA]';

  return (
    <GlassCard
      hoverable={Boolean(onClick) || true}
      glowColor={colors.glow}
      onClick={onClick}
      className={cn('p-5 flex flex-col justify-between select-none bg-white border border-[#D4DFCE]', className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-[#58645A] uppercase">
            {title}
          </p>
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105',
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          {icon}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        {loading ? (
          <div className="h-9 w-28 rounded-md bg-[#EEF3E8] shimmer mb-1" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17231B]">
              {isNumeric ? (
                <AnimatedNumber value={numericValue} decimals={decimals} />
              ) : (
                value
              )}
            </h3>
            {unit && (
              <span className="text-sm font-medium text-[#778178]">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer / Trend & Sparkline */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#E7E4DA] text-xs">
        {/* Trend Indicator */}
        {derivedTrend ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold',
              trendColorClass
            )}
          >
            {renderTrendIcon()}
            <span>
              {trendLabel ??
                (computedPercentChange !== null
                  ? `${computedPercentChange >= 0 ? '+' : ''}${computedPercentChange.toFixed(1)}%`
                  : '')}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#778178]">
            {trendLabel || 'Past 30 days'}
          </span>
        )}

        {/* Sparkline Graphic */}
        <div className="w-16 h-6 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 64 24" fill="none">
            <defs>
              <linearGradient id={`sparkline-${colorScheme}`} x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor={colors.stroke} stopOpacity="0.25" />
                <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0 18 Q 16 6, 32 14 T 64 8 L 64 24 L 0 24 Z"
              fill={colors.fillGradient}
            />
            <path
              d="M0 18 Q 16 6, 32 14 T 64 8"
              stroke={colors.stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </GlassCard>
  );
};

export default KPICard;
