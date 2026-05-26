import type { ElementType } from 'react';

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
}

export interface MegaMenuCategory {
  id: string;
  slug: string;
  name: string;
  value: string;
  label: string;
  title: string;
  icon: ElementType;
  color?: string;
  parent?: string | null;
  children?: MegaMenuCategory[];
  subCategories?: MegaMenuCategory[];
  specificFields?: FormFieldDefinition[];
}

export interface MegaMenuProps {
  categories: MegaMenuCategory[];
  onSelect?: (category: MegaMenuCategory) => void;
  getHref?: (category: MegaMenuCategory) => string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface CategorySelectorProps {
  isDesktop: boolean;
  nestedCategories: MegaMenuCategory[];
  onSelect: (category: MegaMenuCategory) => void;
  onClose: () => void;
  getIcon: (slug: string) => ElementType;
  getHref?: (category: MegaMenuCategory) => string;
}
