import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled = false,
  name,
  id,
}) => {
  return (
    <div className={cn('relative inline-flex items-center w-full min-w-36', className)}>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none pl-3.5 pr-9 py-2 text-sm rounded-xl',
          'bg-white text-[#17231B] border border-[#D4DFCE]',
          'focus:border-[#245B38] focus:outline-none focus:ring-2 focus:ring-[#245B38]/10',
          'transition-all duration-200 shadow-2xs cursor-pointer select-none',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        {placeholder && (
          <option value="" disabled className="bg-white text-[#778178]">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white text-[#17231B] py-1"
          >
            {opt.label}
          </option>
        ))}
      </select>

      <ChevronDown className="absolute right-3 w-4 h-4 text-[#778178] pointer-events-none" />
    </div>
  );
};

export default Select;
