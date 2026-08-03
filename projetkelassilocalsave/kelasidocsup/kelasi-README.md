# Kelasi — Plateforme SaaS de Gestion Scolaire (Digitech)

## À propos de ce dépôt

Documentation de spécification de Kelasi, éclatée en documents thématiques (même modèle que Livrex) pour faciliter le travail de développement, limiter la consommation de tokens par requête, et permettre à chaque collaborateur de charger uniquement le document pertinent à sa tâche.

## Structure des documents

| Fichier | Contenu |
|---|---|
| `01-vision-projet.md` | Contexte, mission, principes produit, vision long terme |
| `02-catalogue-fonctionnalites.md` | Catalogue complet des modules et fonctionnalités (par version) |
| `03-architecture-application.md` | Architecture technique — API-first, multi-tenant, backend réel |
| `04-modele-donnees.md` | Entités, relations, multi-tenant |
| `05-design-system.md` | Système de design (via skill `ui-ux-pro-max`) |
| `06-roadmap-developpement.md` | Roadmap MVP → V3.0 |

## Standard d'ingénierie appliqué

**RDS v1.0** (Reisch Development Standard) s'applique intégralement à ce projet. Contrairement à Livrex (frontend-only), Kelasi a un vrai backend et une vraie base de données : les sections `RDS-Database`, `RDS-API`, `RDS-Cloud` et `RDS-Security`/`RDS-Multitenant` sont donc **actives** (pas en N/A).

## Hypothèse de stack (à valider)

En l'absence de précision contraire, je pars de l'exemple donné dans le RDS pour un projet avec backend réel :

- Frontend : **Next.js + TypeScript**
- Backend : **Node.js (NestJS)** — architecture modulaire adaptée au multi-tenant et aux permissions par route
- Base de données : **PostgreSQL**
- Auth : **JWT + OAuth2**, RBAC par rôle (Super Admin, School Admin, Secretary, Accountant, Teacher, Parent)
- API : REST, format de réponse unique `{ success, message, data }` (imposé par le document source)

Dis-moi si le porteur technique de Kelasi impose autre chose (comme pour Livrex) — je mettrai les documents à jour en conséquence.

## Règle de fonctionnement pour les collaborateurs

1. Avant de commencer : relire ce README + le document thématique concerné.
2. En cours de travail : une info = un seul document source, pas de duplication.
3. À la fin d'une session : mettre à jour *État d'avancement* et *Reste à faire* ci-dessous.

## État d'avancement

- [x] Documentation de spécification initiale éclatée en 6 documents
- [ ] Stack technique validée par le porteur technique
- [ ] Design system généré (`ui-ux-pro-max`)
- [ ] Modèle de données implémenté (multi-tenant)
- [ ] Modules MVP développés (Auth, Dashboard, Élèves, Parents, Classes, Paiements, Présences, Notes, Bulletins)

## Reste à faire

- Valider la stack technique (section ci-dessus)
- Générer et persister le design system (`design-system/MASTER.md`)
- Définir la stratégie d'isolation multi-tenant au niveau base de données (RLS PostgreSQL vs filtrage applicatif systématique par `school_id`)

## Système de communication

Mots-clés (`TLDR:`, `SPEC:`, `OPTIONS:`, `CRITIQUE:`, etc.) toujours en vigueur pour ce projet.
