export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export interface SearchSuggestion {
  id: string;
  type: 'category' | 'subcategory' | 'request';
  title: string;
  description?: string;
  category?: string;
  icon?: string | null;
  priority?: string;
  slug?: string;
}

export interface SearchBarProps {
  data?: SearchItem[];
  onSelect?: (item: SearchItem) => void;
  placeholder?: string;
}
