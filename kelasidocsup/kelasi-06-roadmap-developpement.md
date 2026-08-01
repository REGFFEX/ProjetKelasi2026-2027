# Roadmap de Développement — Kelasi

## Phase 0 — Cadrage
- [ ] Valider la stack technique (Next.js/NestJS/PostgreSQL — hypothèse en `03-architecture-application.md`)
- [ ] Générer le design system via `ui-ux-pro-max` (`design-system/MASTER.md`)
- [ ] Initialiser le repo GitHub, structure modulaire feature-first
- [ ] Poser la stratégie multi-tenant (RLS PostgreSQL vs filtrage applicatif)

## Phase 1 — Fondations (`RDS-Architecture`, `RDS-Security`)
- [ ] `core/tenant` (résolution/validation `school_id` sur chaque requête)
- [ ] `core/permissions` (RBAC par route)
- [ ] Authentification (JWT + OAuth2), rôles : Super Admin, School Admin, Secretary, Accountant, Teacher, Parent
- [ ] Format de réponse API unique `{ success, message, data }`

## Phase 2 — Modules cœur MVP
- [ ] Élèves (CRUD, import/export, photo, documents, historique, statut)
- [ ] Parents (fiche, lien multi-enfants)
- [ ] Classes & Matières
- [ ] Enseignants (accès restreint à leurs classes/matières)
- [ ] Dashboard (widgets clés + graphiques)

## Phase 3 — Présences & Notes
- [ ] Appel quotidien (présent/absent/retard/justifié)
- [ ] Notification automatique aux parents en cas d'absence
- [ ] Évaluations, saisie notes, calcul moyenne/classement
- [ ] Validation + publication des notes
- [ ] Génération bulletin PDF

## Phase 4 — Paiements
- [ ] Types de frais, paiement, paiement partiel, reste à payer
- [ ] Historique + reçu PDF
- [ ] Rapports financiers de base

## Phase 5 — Finitions MVP & conformité
- [ ] `RDS-Testing` : unit + integration sur les workflows critiques (inscription, paiement, publication de notes)
- [ ] `RDS-A11y` : passe WCAG 2.2 AA
- [ ] Revue sécurité (`RDS-Security`/OWASP) — en particulier isolation multi-tenant
- [ ] Mise à jour finale du README (état d'avancement + reste à faire)

## V1.1 — Communication & Rapports avancés
- [ ] Notifications (SMS, Email, Annonces)
- [ ] Calendrier, documents partagés
- [ ] Rapports avancés
- [ ] Observabilité renforcée (logs structurés, monitoring)

## V1.2 — Application Parent

## V2.0 — Extension métier
- [ ] Mobile Money
- [ ] Comptabilité
- [ ] RH
- [ ] Bibliothèque, Cantine, Transport

## V3.0 — Intelligence Artificielle
- [ ] Assistant administratif
- [ ] Prévisions financières
- [ ] Détection des risques d'abandon scolaire
- [ ] Recommandations personnalisées

*Chaque case cochée doit être répercutée dans l'"État d'avancement" du `README.md` racine de Kelasi.*
