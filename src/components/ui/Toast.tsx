import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Toast as ToastType } from '@/types';

export interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const typeConfigs = {
  success: {
    icon: CheckCircle2,
    border: 'border-[#D4DFCE]',
    bg: 'bg-[#FFFDF8]',
    iconColor: 'text-[#245B38]',
    badgeBg: 'bg-[#EEF3E8]',
  },
  error: {
    icon: AlertCircle,
    border: 'border-[#F3C7C5]',
    bg: 'bg-[#FFFDF8]',
    iconColor: 'text-[#C54A43]',
    badgeBg: 'bg-[#FBEBEB]',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-[#F8E1CD]',
    bg: 'bg-[#FFFDF8]',
    iconColor: 'text-[#D89A3D]',
    badgeBg: 'bg-[#FFF0DF]',
  },
  info: {
    icon: Info,
    border: 'border-[#DCE8D3]',
    bg: 'bg-[#FFFDF8]',
    iconColor: 'text-[#4F8A4B]',
    badgeBg: 'bg-[#E4F0DE]',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, title, message, type = 'info', duration = 4500 } = toast;
  const config = typeConfigs[type] || typeConfigs.info;
  const Icon = config.icon;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={cn(
        'w-84 max-w-[calc(100vw-2rem)] p-4 rounded-2xl border shadow-lg',
        'flex items-start gap-3 pointer-events-auto select-none',
        config.bg,
        config.border
      )}
      role="alert"
    >
      <div className={cn('p-1.5 rounded-xl shrink-0', config.badgeBg)}>
        <Icon className={cn('w-4 h-4', config.iconColor)} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <h4 className="text-xs font-semibold text-[#17231B] tracking-wide mb-0.5">
            {title}
          </h4>
        )}
        <p className="text-xs text-[#58645A] leading-relaxed break-words">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss toast"
        className="p-1 rounded-md text-[#778178] hover:text-[#17231B] hover:bg-[#EEF3E8] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export default Toast;
