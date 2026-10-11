import React from 'react';
import { cn } from '@/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean | string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className,
  rounded = true,
  circle = false,
  style,
  ...props
}) => {
  const dynamicStyles: React.CSSProperties = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      style={dynamicStyles}
      className={cn(
        'bg-ws-bg-card/70 border border-ws-border/40 shimmer overflow-hidden',
        circle
          ? 'rounded-full aspect-square'
          : typeof rounded === 'string'
          ? rounded
          : rounded
          ? 'rounded-lg'
          : 'rounded-none',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Skeleton;
