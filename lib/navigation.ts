import { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItemsByRole: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Écoles', href: '/schools', icon: 'School' },
    { label: 'Abonnements', href: '/subscriptions', icon: 'CreditCard' },
    { label: 'Administrateurs', href: '/super-admins', icon: 'ShieldCheck' },
  ],
  school_admin: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Parents', href: '/parents', icon: 'Users' },
    { label: 'Enseignants', href: '/teachers', icon: 'UserCog' },
    { label: 'Classes', href: '/classes', icon: 'School' },
    { label: 'Emploi du temps', href: '/timetable', icon: 'CalendarDays' },
    { label: 'Présences', href: '/attendance', icon: 'CheckSquare' },
    { label: 'Notes', href: '/grades', icon: 'ClipboardList' },
    { label: 'Paiements', href: '/payments', icon: 'Wallet' },
    { label: 'Suivi des heures', href: '/hours', icon: 'Clock' },
    { label: 'Communication', href: '/communication', icon: 'MessageSquare' },
    { label: 'Paramètres', href: '/settings', icon: 'Settings' },
  ],
  secretary: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Parents', href: '/parents', icon: 'Users' },
    { label: 'Enseignants', href: '/teachers', icon: 'UserCog' },
    { label: 'Classes', href: '/classes', icon: 'School' },
    { label: 'Emploi du temps', href: '/timetable', icon: 'CalendarDays' },
    { label: 'Présences', href: '/attendance', icon: 'CheckSquare' },
    { label: 'Notes', href: '/grades', icon: 'ClipboardList' },
    { label: 'Suivi des heures', href: '/hours', icon: 'Clock' },
    { label: 'Rapports', href: '/reports', icon: 'BarChart3' },
    { label: 'Communication', href: '/communication', icon: 'MessageSquare' },
    { label: 'Paramètres', href: '/settings', icon: 'Settings' },
  ],
  accountant: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Paiements', href: '/payments', icon: 'Wallet' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Suivi des heures', href: '/hours', icon: 'Clock' },
    { label: 'Rapports', href: '/reports', icon: 'BarChart3' },
  ],
  teacher: [
    { label: 'Accueil', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Mes classes', href: '/classes', icon: 'School' },
    { label: 'Mes horaires', href: '/timetable', icon: 'CalendarDays' },
    { label: 'Présences', href: '/attendance', icon: 'CheckSquare' },
    { label: 'Notes', href: '/grades', icon: 'ClipboardList' },
  ],
  parent: [
    { label: 'Accueil', href: '/parent', icon: 'Home' },
    { label: 'Mes enfants', href: '/parent/students', icon: 'GraduationCap' },
    { label: 'Paiements', href: '/parent/payments', icon: 'Wallet' },
    { label: 'Bulletins', href: '/parent/bulletins', icon: 'FileText' },
    { label: 'Annonces', href: '/communication', icon: 'MessageSquare' },
  ],
};

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'Directeur',
  secretary: 'Secrétariat',
  accountant: 'Comptable',
  teacher: 'Enseignant',
  parent: 'Parent',
};

export function getDefaultRouteForRole(role?: Role): string {
  switch (role) {
    case 'super_admin':
      return '/schools';
    case 'school_admin':
      return '/dashboard';
    case 'secretary':
      return '/students';
    case 'accountant':
      return '/payments';
    case 'teacher':
      return '/dashboard';
    case 'parent':
      return '/parent';
    default:
      return '/dashboard';
  }
}
