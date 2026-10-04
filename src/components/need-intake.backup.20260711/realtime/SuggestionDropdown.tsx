'use client';

import { cn } from '@/lib/utils';

interface SuggestionDropdownProps {
  suggestions: string[];
  onSelect: (phrase: string) => void;
  className?: string;
}

export function SuggestionDropdown({
  suggestions,
  onSelect,
  className,
}: SuggestionDropdownProps) {
  if (!suggestions.length) return null;

  return (
    <ul
      className={cn(
        'max-h-40 overflow-y-auto rounded-xl border bg-popover p-1 shadow-md',
        className
      )}
      role="listbox"
    >
      {suggestions.map((item) => (
        <li key={item}>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-accent"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}
