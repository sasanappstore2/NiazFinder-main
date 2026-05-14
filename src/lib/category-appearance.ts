// ============ Shared Category Appearance Utilities ============
// Used by NeedsHomepage, QuickView, HeaderSearchBar, and other components

import type { LucideIcon } from 'lucide-react';
import {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench,
  GraduationCap, Bot, Briefcase, Scale, Heart, Star, Server,
  Car, Laptop, Armchair, Shirt, Dices, Users,
} from 'lucide-react';

export { Car as CarIcon, Laptop as LaptopIcon, Armchair as ArmchairIcon, Shirt as ShirtIcon, Dices as DicesIcon, Users as UsersIcon };

// ─── Icon Mapping (DB stores Lucide icon name strings) ───────────────────
export const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench,
  GraduationCap, Bot, Briefcase, Scale, Heart, Star, Server,
  Car, Laptop, Armchair, Shirt, Dices, Users,
  Layout: Monitor, Layers: Smartphone, Apple: Smartphone,
  Sparkles: Star, Megaphone: Pen, Brush: Palette,
  Code: Monitor, Database: Server, Shield: Scale, Stethoscope: Heart,
};

export function getCategoryIconByName(iconName?: string | null): LucideIcon {
  if (!iconName) return Globe;
  return ICON_MAP[iconName] || Globe;
}

// ─── Category Appearance (name → icon + color) ───────────────────
export const CATEGORY_APPEARANCE: Record<string, { icon: LucideIcon; color: string }> = {
  'املاک':               { icon: Home,      color: '#3b82f6' },
  'وسایل نقلیه':         { icon: Car,        color: '#ef4444' },
  'لوازم الکترونیکی':    { icon: Laptop,     color: '#06b6d4' },
  'لوازم خانگی':         { icon: Armchair,   color: '#f97316' },
  'خدمات':               { icon: Wrench,     color: '#8b5cf6' },
  'وسایل شخصی':         { icon: Shirt,      color: '#ec4899' },
  'سرگرمی':              { icon: Dices,      color: '#eab308' },
  'سرگرمی و فراغت':     { icon: Dices,      color: '#eab308' },
  'اجتماعی':             { icon: Users,      color: '#10b981' },
  'استخدام':             { icon: Briefcase,  color: '#6366f1' },
  'استخدام و کاریابی':  { icon: Briefcase,  color: '#6366f1' },
  'طراحی و توسعه وب':    { icon: Monitor,    color: '#06b6d4' },
  'اپلیکیشن موبایل':    { icon: Smartphone, color: '#3b82f6' },
  'تولید محتوا':        { icon: Pen,        color: '#f97316' },
  'طراحی گرافیک':       { icon: Palette,    color: '#ec4899' },
  'خدمات خانگی':        { icon: Home,       color: '#f97316' },
  'تعمیرات':            { icon: Wrench,     color: '#8b5cf6' },
  'مشاوره و آموزش':     { icon: GraduationCap, color: '#8b5cf6' },
  'هوش مصنوعی':         { icon: Bot,        color: '#6366f1' },
};

export const DEFAULT_APPEARANCE = { icon: Globe as LucideIcon, color: '#6b7280' };

export function getCategoryAppearance(categoryName?: string | null) {
  if (!categoryName) return DEFAULT_APPEARANCE;
  return CATEGORY_APPEARANCE[categoryName] || DEFAULT_APPEARANCE;
}

// ─── Avatar color generator ──
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

export function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
