import type { Page } from '../App';

export interface MobileNavItem {
  id: Page;
  label: string;
  shortLabel?: string;
  color: string;
  description: string;
  icon: string;
  group?: 'daily' | 'growth' | 'life' | 'insight';
}

export const MOBILE_PRIMARY_NAV: MobileNavItem[] = [
  { id: 'dashboard', label: 'الرئيسية', color: '#10b981', description: 'نظرة شاملة على يومك', icon: 'home' },
  { id: 'tasks', label: 'المهام', color: '#3b82f6', description: 'مهامك اليومية', icon: 'check-square' },
  { id: 'habits', label: 'العادات', color: '#8b5cf6', description: 'تابع عاداتك واستمراريتك', icon: 'activity' },
  { id: 'goals', label: 'الأهداف', color: '#ec4899', description: 'تقدم أهدافك', icon: 'target' },
  { id: 'account', label: 'حسابي', color: '#10b981', description: 'الحساب والإعدادات', icon: 'user' },
];

export const MOBILE_SECTION_ITEMS: MobileNavItem[] = [
  { id: 'tasks', label: 'المهام اليومية', shortLabel: 'المهام', color: '#3b82f6', description: 'نظّم ما يجب إنجازه اليوم', icon: 'check-square', group: 'daily' },
  { id: 'habits', label: 'العادات', color: '#8b5cf6', description: 'ابنِ عادات ثابتة وتتبع تقدمك', icon: 'activity', group: 'daily' },
  { id: 'goals', label: 'الأهداف', color: '#ec4899', description: 'حوّل خططك إلى تقدم واضح', icon: 'target', group: 'daily' },
  { id: 'events', label: 'الأحداث والتذكيرات', shortLabel: 'الأحداث', color: '#6366f1', description: 'مواعيدك وأحداثك القادمة', icon: 'calendar', group: 'daily' },
  { id: 'religious', label: 'التقدم الديني', color: '#f59e0b', description: 'تابع وردك وتقدمك الروحي', icon: 'book-open', group: 'growth' },
  { id: 'fitness', label: 'اللياقة البدنية', color: '#ef4444', description: 'تمارينك ونشاطك البدني', icon: 'dumbbell', group: 'growth' },
  { id: 'languages', label: 'تعلم اللغات', color: '#06b6d4', description: 'خطتك وممارستك للغات', icon: 'languages', group: 'growth' },
  { id: 'skills', label: 'تطوير المهارات', color: '#f97316', description: 'مهاراتك ومسارات التطوير', icon: 'zap', group: 'growth' },
  { id: 'study', label: 'الدراسة', color: '#14b8a6', description: 'موادك وخطة الدراسة', icon: 'graduation-cap', group: 'growth' },
  { id: 'finance', label: 'الإدارة المالية', shortLabel: 'المالية', color: '#22c55e', description: 'دخل، مصروف، ميزانيات وأهداف', icon: 'wallet', group: 'life' },
  { id: 'journal', label: 'المذكرة اليومية', shortLabel: 'المذكرة', color: '#f59e0b', description: 'دوّن يومك وأفكارك', icon: 'notebook-pen', group: 'life' },
  { id: 'agreements', label: 'الاتفاقيات والالتزامات', shortLabel: 'الالتزامات', color: '#84cc16', description: 'تابع التزاماتك واتفاقياتك', icon: 'handshake', group: 'life' },
  { id: 'documents', label: 'خزنة الوثائق', color: '#f97316', description: 'وثائقك المهمة في مكان واحد', icon: 'folder-lock', group: 'life' },
  { id: 'analytics', label: 'التحليلات', color: '#10b981', description: 'افهم تقدمك بالأرقام', icon: 'bar-chart-3', group: 'insight' },
  { id: 'ai', label: 'المساعد الذكي', color: '#8b5cf6', description: 'استنتاجات ومساعدة من بياناتك', icon: 'bot', group: 'insight' },
  { id: 'future', label: 'رؤية المستقبل', color: '#06b6d4', description: 'احتفظ برؤيتك بعيدة المدى', icon: 'eye', group: 'insight' },
];

export const MOBILE_GROUPS = [
  { id: 'daily' as const, label: 'يومي' },
  { id: 'growth' as const, label: 'النمو والتطوير' },
  { id: 'life' as const, label: 'إدارة الحياة' },
  { id: 'insight' as const, label: 'الرؤية والتحليل' },
];
