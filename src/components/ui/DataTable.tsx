import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T = any>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records found',
  loading = false,
  className,
  rowKey,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortColumn !== key) {
      setSortColumn(key);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a: any, b: any) => {
      const aVal = a?.[sortColumn];
      const bVal = b?.[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <div className={cn('bg-white rounded-2xl overflow-hidden border border-[#D4DFCE] shadow-2xs', className)}>
      <div className="w-full overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D4DFCE] bg-[#EEF3E8]/70 select-none">
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      'px-4 py-3.5 text-xs font-semibold tracking-wider text-[#58645A] uppercase',
                      col.sortable && 'cursor-pointer hover:text-[#17231B] transition-colors',
                      col.headerClassName
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="shrink-0 text-[#778178]">
                          {isSorted && sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#245B38]" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[#245B38]" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 hover:text-[#17231B]" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E4DA] text-sm text-[#17231B]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-[#778178]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#245B38]" />
                    <span className="text-xs">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[#778178] text-sm font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const key = rowKey ? rowKey(row, idx) : (row as any)?.id ?? idx;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors duration-150',
                      onRowClick
                        ? 'cursor-pointer hover:bg-[#FAF9F4] active:bg-[#EEF3E8]'
                        : 'hover:bg-[#FAF9F4]/70'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3.5 whitespace-nowrap text-xs sm:text-sm', col.className)}
                      >
                        {col.render ? col.render(row, idx) : (row as any)?.[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
