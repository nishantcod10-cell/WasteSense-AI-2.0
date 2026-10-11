import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 border-b border-[#D4DFCE] overflow-x-auto scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none whitespace-nowrap',
              isActive
                ? 'text-[#245B38] font-semibold'
                : 'text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8]/50 rounded-t-lg'
            )}
          >
            {tab.icon && (
              <span className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#245B38]' : 'text-[#778178]')}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
                  isActive
                    ? 'bg-[#EEF3E8] text-[#245B38] border border-[#D4DFCE]'
                    : 'bg-[#F0F2EF] text-[#778178]'
                )}
              >
                {tab.badge}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId="tabs-active-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#245B38] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
