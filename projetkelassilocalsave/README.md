# Kelasi — Interface Frontend (Statut & Handover)

## Design system

- **Esthétique**: iOS-style moderne — coins arrondis (`rounded-2xl`), ombres douces en couches (`shadow-card`, `shadow-card-hover`), glassmorphism sur header/sidebar (`backdrop-blur`), transitions fluides (`cubic-bezier`)
- **Palette**: primaire bleu `hsl(211 100% 50%)`, sémantique: success (vert), warning (orange), destructive (rouge), info (bleu foncé) — chaque couleur avec variante `light` pour fonds subtils
- **Font**: Inter avec antialiasing et font features
- **Dark mode**: supporté via CSS variables + `.dark` class
- **Responsive mobile-first**:
  - Sidebar: desktop pleine largeur (64), masquée sur mobile → bottom nav fixe avec icônes uniquement
  - Header: recherche en overlay plein écran sur mobile, icônes uniquement sur petits écrans
  - Tableaux: scroll horizontal (`overflow-x-auto scrollbar-thin`) avec `min-w-[Xpx]`, bascule vers cartes sur mobile
  - Boutons: texte masqué sur mobile (`hidden sm:inline`), icônes uniquement
  - Truncation: `truncate` et `truncate-2` (clamp 2 lignes) sur tout texte susceptible de déborder
  - Espacement adaptatif: `gap-3 sm:gap-4`, `p-4 sm:p-5`, `text-xl sm:text-2xl`
- **Animations**: `fade-in`, `slide-up`, `scale-in`, `slide-in-right` avec courbes `cubic-bezier(0.16, 1, 0.3, 1)`
- **Interactions**: `active:scale-[0.97]` sur boutons (effet tactile iOS), `hover:-translate-y-0.5` sur cartes

## Comptes utilisateurs de démonstration

| Rôle | Nom | Email | Mot de passe |
|---|---|---|---|
| Admin école | Joseph Kabasele | joseph.kabasele@kelasi.com | Admin@2026 |
| Secrétaire | Marie Kalala | marie.kalala@kelasi.com | Secret@2026 |
| Comptable | Pierre Mbuyi | pierre.mbuyi@kelasi.com | Compta@2026 |
| Enseignant | Esther Tshala | esther.tshala@kelasi.com | Prof@2026 |
| Parent | Jean Mukendi | jean.mukendi@kelasi.com | Parent@2026 |

## Données mock enrichies

- **50 élèves** répartis sur 5 classes (6ème A, 5ème A, 4ème A, 3ème A, 6ème B)
- **15 parents** avec professions et adresses variées
- **5 enseignants** avec matières et classes assignées
- **9 matières** avec coefficients
- **12 évaluations** (devoirs, interrogations, TP, examens)
- **~130 notes** générées avec statuts de validation (brouillon, validé, publié)
- **50 factures** avec statuts variés (payé, partiel, impayé)
- **~20 paiements** avec 4 modes (espèces, mobile money, virement, chèque)
- **50 enregistrements de présence** (présent, absent, retard, justifié)
- **10 notifications** et **6 annonces** avec types et canaux variés
- **2 écoles**, **2 années scolaires**, **3 trimestres**

## État d'avancement

### Terminé (Frontend MVP + V1.1)

| Module | Pages | Statut |
|---|---|---|
| Authentification | `/` (login avec sélection de rôle), `/signup` (création de compte en 2 étapes) | ✅ |
| Dashboard | `/dashboard` (8 cartes indicateurs, 4 graphiques, actions rapides, fil d'activité) | ✅ |
| Élèves | `/students` (liste filtrable + import CSV), `/students/[id]` (fiche complète), `/students/new`, `/students/[id]/edit` | ✅ |
| Parents | `/parents` (cartes avec contact + enfants liés) | ✅ |
| Enseignants | `/teachers` (cartes avec matières + classes) | ✅ |
| Classes & Matières | `/classes` (onglets classes + matières) | ✅ |
| Présences | `/attendance` (appel quotidien un clic, mobile-optimized, "tous présents") | ✅ |
| Notes & Bulletins | `/grades` (évaluations, saisie de notes, aperçu bulletin PDF complet avec moyennes pondérées) | ✅ |
| Paiements | `/payments` (factures, formulaire de paiement avec calcul reste à payer, reçu PDF) | ✅ |
| Rapports | `/reports` (financier, présences, notes — graphiques + tableaux) | ✅ |
| Communication | `/communication` (annonces + notifications, formulaire de publication) | ✅ |
| Paramètres | `/settings` (établissement, utilisateurs, années scolaires, sécurité) | ✅ |

**17 pages compilées avec succès. Build: `npm run build` → ✓**

**Design upgrade final appliqué:**
- iOS-style cards avec ombres douces et coins arrondis (`rounded-2xl`)
- Glassmorphism sur header et sidebar (`backdrop-blur`)
- Mobile bottom nav (icônes uniquement) + sidebar desktop
- Scroll horizontal sur tous les tableaux (`overflow-x-auto scrollbar-thin`)
- Truncation systématique (`truncate`, `truncate-2`)
- Boutons adaptatifs (icônes sur mobile, texte sur sm+)
- Animations fluides `cubic-bezier` + `active:scale` tactile

---

## Comment le frontend a été construit

### Architecture

```
app/
├── page.tsx                    → Login (sélection de rôle)
├── layout.tsx                  → Layout racine (font Inter)
├── globals.css                 → Design system (CSS variables, dark mode)
├── dashboard/                  → Dashboard admin
├── students/                   → Liste, détail, création, édition
├── parents/                   → Liste des parents
├── teachers/                   → Liste des enseignants
├── classes/                   → Classes + matières
├── attendance/                 → Appel quotidien
├── grades/                    → Évaluations + bulletins
├── payments/                  → Factures + paiements + reçus
├── reports/                   → Rapports (financier, présence, notes)
├── communication/             → Annonces + notifications
└── settings/                  → Paramètres (école, users, années, sécurité)

components/
├── app-shell.tsx               → Wrapper: Sidebar + Header + content
├── sidebar.tsx                → Navigation role-based + school switcher
├── header.tsx                 → Search + notifications + user
├── student-form-content.tsx   → Formulaire create/edit partagé
└── ui/                        → shadcn/ui components

lib/
├── types.ts                   → TOUS les types TypeScript du modèle de données
├── mock-data.ts               → DONNÉES MOCK (à remplacer par appels API)
├── navigation.ts              → Navigation par rôle + labels
├── app-context.tsx            → Context: role, schoolId, sidebar state
└── utils.ts                   → cn() helper
```

### Design system

- **Esthétique**: iOS-style moderne — coins arrondis, ombres douces, glassmorphism, transitions fluides
- **Palette**: primaire bleu `hsl(211 100% 50%)`, sémantique: success (vert), warning (orange), destructive (rouge), info (bleu foncé)
- **Font**: Inter
- **Dark mode**: supporté via CSS variables + `.dark` class
- **Responsive mobile-first**:
  - Sidebar desktop pleine largeur, bottom nav fixe avec icônes sur mobile
  - Tableaux: scroll horizontal, bascule vers cartes sur mobile
  - Boutons: icônes uniquement sur mobile, texte sur sm+
  - Truncation systématique sur tout texte susceptible de déborder
- **Animations**: fade-in, slide-up, scale-in avec courbes cubic-bezier
- **Interactions**: active:scale (effet tactile iOS), hover lift sur cartes

### Rôles gérés

6 rôles avec navigation adaptée: `super_admin`, `school_admin`, `secretary`, `accountant`, `teacher`, `parent`

---

## Ce que le développeur backend doit faire

### 1. Remplacer les données mock par des appels API

Toutes les données sont dans `lib/mock-data.ts`. Chaque export doit être remplacé par un appel API:

```typescript
// AVANT (mock)
import { students } from '@/lib/mock-data';

// APRÈS (API)
const { data } = await fetch('/api/students').then(r => r.json());
// Format de réponse attendu: { success: boolean, message: string, data: T[] }
```

**Fichiers à modifier:**
- `lib/mock-data.ts` → Remplacer par un `lib/api.ts` avec fonctions `fetchStudents()`, `fetchInvoices()`, etc.
- Tous les `*-content.tsx` qui importent depuis `mock-data.ts`

### 2. Implémenter l'API (format de réponse unique)

Toutes les routes API doivent retourner:
```json
{ "success": true, "message": "", "data": {} }
```

**Routes nécessaires (MVP):**

| Route | Méthode | Description |
|---|---|---|
| `/api/auth/login` | POST | Authentification + JWT |
| `/api/auth/me` | GET | Utilisateur courant |
| `/api/schools` | GET | Liste des écoles (pour le switcher) |
| `/api/students` | GET, POST | Liste + création d'élèves |
| `/api/students/:id` | GET, PUT, DELETE | Détail + modification + suppression |
| `/api/students/import` | POST | Import CSV/Excel |
| `/api/parents` | GET, POST | Liste + création parents |
| `/api/teachers` | GET, POST | Liste + création enseignants |
| `/api/classrooms` | GET, POST | Liste + création classes |
| `/api/subjects` | GET, POST | Liste + création matières |
| `/api/attendance` | GET, POST | Lecture + enregistrement appel |
| `/api/assessments` | GET, POST | Liste + création évaluations |
| `/api/grades` | GET, POST, PUT | Saisie + validation + publication notes |
| `/api/invoices` | GET, POST | Liste + création factures |
| `/api/payments` | GET, POST | Enregistrement paiements |
| `/api/receipts/:id` | GET | Reçu PDF |
| `/api/bulletins/:studentId` | GET | Bulletin PDF |
| `/api/notifications` | GET | Liste notifications |
| `/api/announcements` | GET, POST | Liste + publication annonces |
| `/api/reports/financial` | GET | Rapport financier |
| `/api/reports/attendance` | GET | Rapport de présence |
| `/api/reports/grades` | GET | Rapport de notes |
| `/api/settings/school` | GET, PUT | Infos établissement |
| `/api/settings/users` | GET, POST | Gestion utilisateurs |
| `/api/settings/years` | GET, POST | Années scolaires |

### 3. Implémenter le multi-tenant

- Chaque requête doit porter un `school_id` (issu du JWT, jamais du body)
- Toutes les requêtes DB filtrées par `school_id`
- Voir `04-modele-donnees.md` section 3 pour les règles d'intégrité

### 4. Implémenter le RBAC

- Chaque route API porte une permission explicite: `students.read`, `payments.create`, `grades.publish`, etc.
- Voir `03-architecture-application.md` section 4
- Rôles: super_admin, school_admin, secretary, accountant, teacher, parent

### 5. Génération PDF

Le frontend a des boutons "Exporter PDF" sur:
- Les bulletins (`/grades` → vue bulletin)
- Les reçus (`/payments` → vue reçu)
- Les rapports (`/reports`)
- Le certificat de scolarité (bouton sur `/students/[id]`)

Le backend doit générer ces PDF (Puppeteer/PDFKit) et les servir via les routes API ci-dessus.

### 6. Notifications automatiques

Le frontend affiche les notifications mais ne les crée pas. Le backend doit déclencher:
- Notification `absence` → parent quand statut = absent
- Notification `paiement` → parent après paiement
- Notification `bulletin` → parent après publication

### 7. Authentification réelle

Le login (`/`) redirige vers `/dashboard` sans vérification. Le backend doit:
- Valider email/password → JWT
- Injecter `school_id` et `role` dans le token
- Le frontend stockera le token et l'envera dans les headers `Authorization`

---

## Tâches frontend restantes (post-backend)

| Tâche | Version | Description |
|---|---|---|
| Connexion API réelle | Dès que backend prêt | Remplacer `mock-data.ts` par appels API |
| Gestion d'erreurs API | Dès que backend prêt | Loading states, error states, retry |
| Portail Parent | V1.2 | Vues dédiées parent (`/parent/*`) |
| Calendrier | V1.1 | Page calendrier scolaire |
| Documents partagés | V1.1 | Upload/download de documents |
| Carte scolaire PDF | V1.1 | Bouton déjà en place, PDF à générer côté backend |
| Certificat de scolarité PDF | V1.1 | Bouton déjà en place, PDF à générer côté backend |
| Mobile Money | V2.0 | Intégration paiement Mobile Money |
| Filtres avancés | V1.1 | Filtres par date, par matière, par statut sur tous les tableaux |
| Export Excel | V1.1 | Export des listes en XLSX |
| Recherche globale | V1.1 | La barre de recherche du header est visuelle, à connecter |

---

## Stack technique

- **Framework**: Next.js 13.5 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Icons**: lucide-react
- **Charts**: recharts
- **Forms**: react-hook-form + zod
- **Toasts**: sonner

## Démarrage

```bash
npm install
npm run dev    # Dev server (déjà configuré)
npm run build  # Build production
```
