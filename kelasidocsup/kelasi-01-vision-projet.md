# Vision du Projet — Kelasi

## 1. Le problème

Les écoles primaires, collèges et lycées en Afrique gèrent aujourd'hui leur administration de façon fragmentée : cahiers papier pour les présences, carnets pour les notes, reçus manuels pour les paiements, communication informelle avec les parents (SMS individuels, bouche-à-oreille). Cela génère des pertes d'information, des erreurs de calcul de moyennes, des impayés non suivis, et aucune vision consolidée pour la direction.

## 2. Ce qu'est Kelasi

Kelasi est une plateforme SaaS **multi-école (multi-tenant)** qui centralise, pour un établissement scolaire, la gestion : des élèves, enseignants, classes, paiements, évaluations, présences et communication — depuis un seul outil, accessible à chaque rôle (direction, secrétariat, comptabilité, enseignants, parents) selon ses permissions.

## 3. Principes produit (non négociables)

Chaque fonctionnalité livrée doit respecter :

- **Simple à utiliser** — utilisable sans formation poussée
- **Rapide** — pas de friction, temps de réponse court
- **Mobile Friendly** — utilisable depuis un téléphone
- **Multi-école (multi-tenant)** — données strictement cloisonnées par école
- **Sécurisée** — accès protégé, permissions par rôle
- **API First** — le frontend ne parle qu'à l'API, jamais directement à la base
- **Évolutive** — ne doit pas bloquer les évolutions futures (paiement mobile, IA, etc.)

> Règle produit : aucune fonctionnalité ne doit compliquer inutilement le produit.

## 4. Proposition de valeur par rôle

| Rôle | Valeur apportée |
|---|---|
| Digitech (Super Admin) | Pilotage de toutes les écoles clientes et de leurs abonnements depuis une seule interface |
| Directeur (School Admin) | Vision complète et instantanée de son établissement |
| Secrétariat | Gestion administrative simplifiée (inscriptions, documents) |
| Comptabilité | Suivi fiable des frais, paiements, impayés, reçus |
| Enseignant | Accès rapide à ses classes, ses notes, ses présences |
| Parent | Visibilité claire sur la scolarité de son/ses enfant(s) |

## 5. Objectifs du MVP

1. Remplacer la gestion papier/informelle par un outil numérique fiable pour les opérations critiques : inscription, présence, notes, paiement.
2. Garantir l'étanchéité totale des données entre écoles (multi-tenant).
3. Donner à chaque rôle un accès strictement limité à son périmètre.
4. Générer les documents officiels (reçus, bulletins) automatiquement en PDF.

## 6. Chaque nouvelle fonctionnalité doit répondre à 3 questions

1. Résout-elle un vrai problème pour une école ?
2. Est-elle suffisamment simple pour être utilisée sans formation complexe ?
3. Apporte-t-elle une valeur mesurable à l'établissement ?

Si la réponse est non à l'une de ces questions, la fonctionnalité ne doit pas être développée.

## 7. Vision long terme

Kelasi n'est pas seulement un logiciel de gestion scolaire : à terme, il doit devenir **le système d'exploitation numérique des établissements scolaires africains**, en intégrant progressivement portail parent, portail élève, application enseignant, paiement Mobile Money, bibliothèque numérique, e-learning, examens en ligne, comptabilité scolaire, RH, transport, cantine, IA pour l'administration et la réussite scolaire, et une API publique pour les intégrations (ministères, banques, partenaires).

## 8. Indicateurs de succès (KPIs) suggérés

- Nombre d'écoles actives sur la plateforme
- Taux d'adoption par rôle (secrétariat, comptabilité, enseignants, parents)
- Taux d'impayés détectés vs réellement recouvrés
- Temps moyen de génération d'un bulletin
- Taux de présence renseigné quotidiennement (adoption de l'appel numérique)

*Ce document suit le même modèle que celui utilisé pour Livrex.*
