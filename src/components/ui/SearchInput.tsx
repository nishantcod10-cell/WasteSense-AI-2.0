import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  autoFocus = false,
}) => {
  return (
    <div className={cn('relative flex items-center w-full min-w-48', className)}>
      <Search className="absolute left-3.5 w-4 h-4 text-[#778178] pointer-events-none" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full pl-10 pr-9 py-2 text-sm rounded-xl',
          'bg-white text-[#17231B] placeholder:text-[#778178]',
          'border border-[#D4DFCE] focus:border-[#245B38] focus:outline-none',
          'transition-all duration-200 shadow-2xs',
          'focus:ring-2 focus:ring-[#245B38]/10'
        )}
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 p-1 rounded-md text-[#778178] hover:text-[#17231B] hover:bg-[#EEF3E8] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
