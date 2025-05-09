'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchInputProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

export function SearchInput({ searchTerm, onSearchChange, placeholder = "Cercar tasques..." }: SearchInputProps) {
  return (
    <div className="relative w-full no-print">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 shadow-sm"
      />
    </div>
  );
}
