import { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItemsByRole: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Écoles', href: '/schools', icon: 'School' },
    { label: 'Abonnements', href: '/subscriptions', icon: 'CreditCard' },
    { label: 'Paramètres', href: '/settings', icon: 'Settings' },
  ],
  school_admin: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Parents', href: '/parents', icon: 'Users' },
    { label: 'Enseignants', href: '/teachers', icon: 'UserCog' },
    { label: 'Classes', href: '/classes', icon: 'School' },
    { label: 'Présences', href: '/attendance', icon: 'CheckSquare' },
    { label: 'Notes', href: '/grades', icon: 'ClipboardList' },
    { label: 'Paiements', href: '/payments', icon: 'Wallet' },
    { label: 'Communication', href: '/communication', icon: 'MessageSquare' },
    { label: 'Paramètres', href: '/settings', icon: 'Settings' },
  ],
  secretary: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Parents', href: '/parents', icon: 'Users' },
    { label: 'Classes', href: '/classes', icon: 'School' },
    { label: 'Communication', href: '/communication', icon: 'MessageSquare' },
  ],
  accountant: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Paiements', href: '/payments', icon: 'Wallet' },
    { label: 'Élèves', href: '/students', icon: 'GraduationCap' },
    { label: 'Rapports', href: '/reports', icon: 'BarChart3' },
  ],
  teacher: [
    { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Mes classes', href: '/classes', icon: 'School' },
    { label: 'Présences', href: '/attendance', icon: 'CheckSquare' },
    { label: 'Notes', href: '/grades', icon: 'ClipboardList' },
    { label: 'Communication', href: '/communication', icon: 'MessageSquare' },
  ],
  parent: [
    { label: 'Accueil', href: '/dashboard', icon: 'Home' },
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
