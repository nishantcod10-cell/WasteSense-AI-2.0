import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[#245B38] text-white font-semibold hover:bg-[#1C492C] active:bg-[#173D2A] shadow-xs border border-transparent',
  secondary:
    'border border-[#D4DFCE] bg-white text-[#245B38] hover:bg-[#EEF3E8] hover:border-[#BDCEB4] active:bg-[#E4F0DE] shadow-2xs',
  ghost:
    'bg-transparent text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8] border border-transparent',
  danger:
    'bg-[#FBEBEB] text-[#C54A43] border border-[#F3C7C5] hover:bg-[#F8DCDA] active:bg-[#F3C7C5]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  icon,
  disabled = false,
  onClick,
  className,
  type = 'button',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      whileHover={shouldReduceMotion || isDisabled ? undefined : { y: -1 }}
      whileTap={shouldReduceMotion || isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 outline-none select-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-[#245B38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F4]',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none filter grayscale-[20%]',
        className
      )}
      {...(props as any)}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};

export default Button;
