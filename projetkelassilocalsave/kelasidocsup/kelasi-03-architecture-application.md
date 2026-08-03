# Architecture de l'Application — Kelasi

## 0. Standard appliqué

**RDS v1.0** intégral. Contrairement à Livrex, Kelasi a un vrai backend : `RDS-Database`, `RDS-API`, `RDS-Cloud` et `RDS-Security` (multi-tenant + RBAC) sont **actifs**, pas en N/A.

## 1. Stack (hypothèse à valider avec le porteur technique)

| Composant | Choix | Justification |
|---|---|---|
| Frontend | Next.js + TypeScript | Mobile friendly, SSR/SEO utile pour les pages publiques (inscription, portail parent futur) |
| Backend | Node.js (NestJS) | Architecture modulaire native, adaptée au multi-tenant et aux permissions par route (`RDS-Architecture`) |
| Base de données | PostgreSQL | Relationnel, adapté aux entités fortement liées (École/Élève/Classe/Paiement) |
| Auth | JWT + OAuth2, RBAC | Rôles : Super Admin, School Admin, Secretary, Accountant, Teacher, Parent |
| Génération PDF | Service dédié (ex. Puppeteer/PDFKit côté backend) | Reçus, bulletins, certificats, cartes scolaires |
| Notifications | Service SMS/Email découplé (queue asynchrone) | Découplage des déclencheurs (paiement, absence, annonce...) |

## 2. Principe d'architecture : API First, Clean Architecture, Multi-tenant

```
┌───────────────────────────────┐
│     Frontend (Next.js)         │  ← ne parle QU'à l'API, jamais à la base
├───────────────────────────────┤
│         API (NestJS)           │
│  Format de réponse unique :    │
│  { success, message, data }    │
├───────────────────────────────┤
│   Couche Permissions (RBAC)    │  ← chaque route vérifie une permission
│   ex: students.read,           │
│       payments.create,         │
│       grades.publish           │
├───────────────────────────────┤
│   Couche métier (Domain)       │  ← règles Kelasi (workflows)
├───────────────────────────────┤
│  Couche Multi-tenant           │  ← injecte/valide school_id sur CHAQUE requête
├───────────────────────────────┤
│      PostgreSQL (par école)     │
└───────────────────────────────┘
```

## 3. Multi-tenant : règle absolue

- Chaque requête entrante porte un `school_id` (issu du token/session, jamais du body librement modifiable par le client).
- Chaque requête vers la base est automatiquement filtrée par `school_id` (au niveau ORM ou via Row Level Security PostgreSQL).
- Aucune jointure ne doit pouvoir traverser les écoles.
- Le Super Admin (Digitech) est le seul rôle à opérer transversalement, via des routes explicitement dédiées et auditées.

## 4. Permissions (RBAC)

Chaque route API porte une permission explicite (reprise du document source) :
`students.read`, `students.create`, `students.update`, `students.delete`, `payments.create`, `payments.read`, `attendance.create`, `grades.publish`, `settings.manage`, etc.

Principe : un rôle n'a accès qu'aux permissions qui lui sont explicitement attribuées — pas d'accès implicite par défaut.

## 5. Format API unique

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Toutes les réponses de l'API suivent ce format, y compris les erreurs (`success: false`, `message` explicite).

## 6. Découpage modulaire (feature-first)

- `modules/auth/`
- `modules/dashboard/`
- `modules/students/`, `modules/parents/`, `modules/teachers/`
- `modules/classes/`, `modules/subjects/`
- `modules/attendance/`
- `modules/grades/` (évaluations, notes, bulletins)
- `modules/payments/` (frais, paiements, reçus, rapports financiers)
- `modules/communication/` (notifications, SMS, emails, annonces)
- `modules/reports/`
- `modules/settings/`
- `core/tenant/` — résolution et validation du `school_id`
- `core/permissions/` — vérification RBAC centralisée
- `core/pdf/` — génération de documents

## 7. Sécurité (`RDS-Security` + OWASP)

- HTTPS obligatoire, TLS 1.3
- Validation stricte des entrées sur chaque route (surtout création paiement/note, sensibles)
- Chiffrement des données sensibles au repos (téléphones, adresses)
- Logs d'audit sur les actions critiques (paiement, publication de notes, suppression d'élève)
- Rate limiting sur les routes d'authentification

## 8. Observabilité minimale MVP

- Logs d'erreurs centralisés côté backend
- Health check API de base
- Monitoring plus poussé (Sentry/Prometheus) à introduire en V1.1 quand le nombre d'écoles clientes augmente

*Section à ajuster dès validation de la stack réelle par le porteur technique de Kelasi.*
