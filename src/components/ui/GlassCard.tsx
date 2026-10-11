import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: 'primary' | 'amber' | 'coral' | 'none';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverable = false,
  glowColor = 'none',
  onClick,
  style,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      onClick={onClick}
      whileHover={
        shouldReduceMotion || !hoverable
          ? undefined
          : { y: -2, transition: { duration: 0.18, ease: 'easeOut' } }
      }
      style={style}
      className={cn(
        'glass-card relative overflow-hidden transition-all duration-200',
        hoverable && 'cursor-pointer hover:border-[#BDCEB4] hover:shadow-md',
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
