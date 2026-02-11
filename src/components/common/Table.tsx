import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
    sortable?: boolean;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (row: T) => void;
    rowKey?: keyof T;
}

function Table<T>({ data, columns, onRowClick, rowKey }: TableProps<T>) {
    const [sortField, setSortField] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: keyof T) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for crypto often better for prices
        }
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortField) return 0;
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-text-secondary text-sm border-b border-border">
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={`py-3 px-4 font-normal ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:text-primary' : ''}`}
                                onClick={() => col.sortable && typeof col.accessor === 'string' ? handleSort(col.accessor as keyof T) : null}
                            >
                                <div className="flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && sortField === col.accessor && (
                                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, rowIdx) => (
                        <tr
                            key={rowKey ? (row[rowKey] as React.Key) : rowIdx}
                            onClick={() => onRowClick && onRowClick(row)}
                            className="hover:bg-hover transition-colors cursor-pointer border-b border-border last:border-0 text-sm"
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className={`py-3 px-4 ${col.className || ''}`}>
                                    {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as React.ReactNode)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Table;
