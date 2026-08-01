# FAT — Kelasi — Document de Test d'Acceptation Fonctionnelle v1.1

## Informations du document

| Champ | Valeur |
|---|---|
| **Projet** | Kelasi — Gestion Scolaire |
| **Client** | Digitech SARL |
| **Version** | 1.1 |
| **Date** | 26 juillet 2026 |
| **Auteur** | Équipe Digitech |
| **Environnement** | Frontend (Next.js 14, React 18, Tailwind CSS) + Backend (Supabase Postgres, Auth, RLS) |
| **URL de test** | http://localhost:3000 |
| **Base de données** | Supabase (Postgres 15) — 20 tables, 80 politiques RLS |
| **Authentification** | Supabase Auth (email/mot de passe, sessions persistantes) |

## Comptes utilisateurs de test

Ces comptes sont créés dans la base de données Supabase (table `auth.users` + table `public.users`). Chaque compte a un profil avec un rôle verrouillé — le rôle ne peut pas être modifié côté client.

| Rôle | Nom | Email | Mot de passe | École | Cas de test |
|---|---|---|---|---|---|
| Directeur (school_admin) | Joseph Kabasele | joseph.kabasele@kelasi.com | Admin@2026 | École Mixte Lumumba | TC-01 à TC-20, TC-96 à TC-100 |
| Secrétaire (secretary) | Marie Kalala | marie.kalala@kelasi.com | Secret@2026 | École Mixte Lumumba | TC-21 à TC-30 |
| Comptable (accountant) | Pierre Mbuyi | pierre.mbuyi@kelasi.com | Compta@2026 | École Mixte Lumumba | TC-31 à TC-40 |
| Enseignant (teacher) | Esther Tshala | esther.tshala@kelasi.com | Prof@2026 | École Mixte Lumumba | TC-41 à TC-55 |
| Parent (parent) | Jean Mukendi | jean.mukendi@kelasi.com | Parent@2026 | École Mixte Lumumba | TC-56 à TC-60 |

### Données de démonstration en base

| Entité | Quantité | Détails |
|---|---|---|
| Écoles | 1 | École Mixte Lumumba (Brazzaville) |
| Années scolaires | 2 | 2026-2027 (active), 2025-2026 (archivée) |
| Trimestres | 3 | Trimestre 1, 2, 3 (année 2026-2027) |
| Matières | 9 | Mathématiques, Français, Histoire-Géo, Sciences, Anglais, EPS, Informatique, Religion, Éducation artistique |
| Enseignants | 5 | Tshala Esther, Mpeza David, Nkulu Sarah, Bakwa Michel, Mbuyi Jeanne |
| Classes | 5 | 6ème A, 5ème A, 4ème A, 3ème A, 6ème B |
| Élèves | 50 | Matricules EL0001 à EL0050 |
| Parents | 15 | Jean Mukendi, Adèle Kabongo, Félix Mwamba, etc. |
| Liens élève-parent | 60 | 1 à 2 parents par élève |
| Présences | 50 | Enregistrements du jour (présent, absent, retard, justifié) |
| Évaluations | 12 | Devoirs, interrogations, examens (Trimestre 1) |
| Notes | 124 | Notes sur 20 avec statuts (brouillon, validé, publié) |
| Factures | 50 | Scolarité, inscription, cantine, transport, autre |
| Paiements | 29 | Espèces, mobile money, virement, chèque |
| Reçus | 29 | Reçus générés avec référence REC-000001 à REC-000050 |
| Notifications | 10 | Paiement, absence, annonce, bulletin, nouvel élève |
| Annonces | 6 | Réunion, paiement, sortie pédagogique, conseil de classe, vacances, rattrapage |

## Légende des statuts

| Statut | Symbole | Description |
|---|---|---|
| Pass | ✅ | Test réussi — comportement conforme |
| Fail | ❌ | Test échoué — comportement non conforme |
| Blocked | ⛔ | Test bloqué — dépendance non disponible |
| N/A | — | Non applicable à ce rôle |

---

## Module 1 — Authentification & Compte

### TC-01: Connexion avec identifiants valides (Directeur)

| Champ | Valeur |
|---|---|
| **ID** | TC-01 |
| **Module** | Authentification |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Application accessible, compte directeur existant dans Supabase Auth |
| **Étapes** | 1. Naviguer vers `/` (page de connexion)<br>2. Sélectionner le rôle "Directeur"<br>3. Saisir `joseph.kabasele@kelasi.com` dans le champ Email<br>4. Saisir `Admin@2026` dans le champ Mot de passe<br>5. Cliquer sur "Se connecter" |
| **Résultat attendu** | Redirection vers `/dashboard` — le tableau de bord s'affiche avec les statistiques de l'école chargées depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-02: Connexion avec mot de passe incorrect

| Champ | Valeur |
|---|---|
| **ID** | TC-02 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Application accessible |
| **Étapes** | 1. Naviguer vers `/`<br>2. Sélectionner un rôle<br>3. Saisir un email valide<br>4. Saisir un mot de passe incorrect (ex: `wrongpass`)<br>5. Cliquer sur "Se connecter" |
| **Résultat attendu** | Message d'erreur affiché par Supabase Auth — aucune redirection |
| **Résultat obtenu** | |
| **Statut** | |

### TC-03: Sélection de rôle sur la page de connexion

| Champ | Valeur |
|---|---|
| **ID** | TC-03 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Page de connexion affichée |
| **Étapes** | 1. Observer les 5 boutons de rôle (Directeur, Secrétaire, Comptable, Enseignant, Parent)<br>2. Cliquer sur chaque rôle successivement<br>3. Vérifier le surlignage visuel (bordure bleue + fond) |
| **Résultat attendu** | Chaque rôle est sélectionnable visuellement — la sélection est cosmétique uniquement, le vrai rôle est déterminé par le profil Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-04: Création de compte (Signup) — Étape 1

| Champ | Valeur |
|---|---|
| **ID** | TC-04 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Application accessible |
| **Étapes** | 1. Naviguer vers `/signup`<br>2. Vérifier l'affichage du formulaire en 2 étapes<br>3. Remplir: Nom, Email, Téléphone, Mot de passe, Confirmation<br>4. Cliquer "Continuer" |
| **Résultat attendu** | Passage à l'étape 2 — barre de progression affiche 2/2 |
| **Résultat obtenu** | |
| **Statut** | |

### TC-05: Création de compte (Signup) — Validation mots de passe

| Champ | Valeur |
|---|---|
| **ID** | TC-05 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Page `/signup` affichée |
| **Étapes** | 1. Saisir un mot de passe<br>2. Saisir une confirmation différente<br>3. Cliquer "Continuer" |
| **Résultat attendu** | Message d'erreur "Les mots de passe ne correspondent pas" — aucune progression |
| **Résultat obtenu** | |
| **Statut** | |

### TC-06: Création de compte (Signup) — Étape 2 (Rôle + Établissement)

| Champ | Valeur |
|---|---|
| **ID** | TC-06 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Étape 1 validée |
| **Étapes** | 1. Sélectionner un rôle (5 choix)<br>2. Sélectionner un établissement dans le menu déroulant (chargé depuis Supabase)<br>3. Cocher "J'accepte les conditions d'utilisation"<br>4. Cliquer "Créer mon compte" |
| **Résultat attendu** | Compte créé dans Supabase Auth + profil inséré dans la table `users` — redirection vers la page de connexion |
| **Résultat obtenu** | |
| **Statut** | |

### TC-07: Lien "Créer un compte" depuis la page de connexion

| Champ | Valeur |
|---|---|
| **ID** | TC-07 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Moyenne |
| **Préconditions** | Page de connexion affichée |
| **Étapes** | 1. Cliquer sur "Créer un compte" en bas de page |
| **Résultat attendu** | Redirection vers `/signup` |
| **Résultat obtenu** | |
| **Statut** | |

### TC-08: Lien "Retour à la connexion" depuis la page d'inscription

| Champ | Valeur |
|---|---|
| **ID** | TC-08 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/signup` affichée |
| **Étapes** | 1. Cliquer sur "Retour à la connexion" en haut du formulaire |
| **Résultat attendu** | Redirection vers `/` (page de connexion) |
| **Résultat obtenu** | |
| **Statut** | |

### TC-09: Redirection automatique si déjà connecté

| Champ | Valeur |
|---|---|
| **ID** | TC-09 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Utilisateur déjà connecté avec une session Supabase active |
| **Étapes** | 1. Naviguer vers `/` (page de connexion) alors qu'on est déjà connecté |
| **Résultat attendu** | Redirection automatique vers `/dashboard` — la page de connexion ne s'affiche pas |
| **Résultat obtenu** | |
| **Statut** | |

### TC-10: Déconnexion

| Champ | Valeur |
|---|---|
| **ID** | TC-10 |
| **Module** | Authentification |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Utilisateur connecté |
| **Étapes** | 1. Cliquer sur l'icône de déconnexion dans la sidebar<br>2. Vérifier la redirection vers `/` |
| **Résultat attendu** | Session Supabase détruite — redirection vers la page de connexion |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 2 — Navigation & Layout

### TC-11: Sidebar de navigation (Desktop)

| Champ | Valeur |
|---|---|
| **ID** | TC-11 |
| **Module** | Navigation |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Connecté en tant que directeur, viewport ≥ 1024px |
| **Étapes** | 1. Vérifier l'affichage de la sidebar à gauche (largeur 64)<br>2. Vérifier le logo "Kelasi" en haut<br>3. Vérifier le nom de l'établissement affiché<br>4. Vérifier les liens de navigation adaptés au rôle (Dashboard, Élèves, Classes, etc.)<br>5. Vérifier les infos utilisateur en bas (nom, rôle, bouton déconnexion) |
| **Résultat attendu** | Sidebar complète avec logo, nom d'école, navigation par rôle et profil utilisateur avec déconnexion |
| **Résultat obtenu** | |
| **Statut** | |

### TC-12: Bottom nav (Mobile)

| Champ | Valeur |
|---|---|
| **ID** | TC-12 |
| **Module** | Navigation |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Connecté, viewport < 1024px (mode mobile) |
| **Étapes** | 1. Vérifier que la sidebar est masquée<br>2. Vérifier l'affichage de la bottom nav fixe<br>3. Vérifier que 5 icônes maximum sont affichées<br>4. Vérifier que chaque icône a un label court<br>5. Cliquer sur chaque icône et vérifier la navigation |
| **Résultat attendu** | Bottom nav fixe en bas d'écran avec icônes uniquement — navigation fonctionnelle |
| **Résultat obtenu** | |
| **Statut** | |

### TC-13: Header — Recherche (Desktop)

| Champ | Valeur |
|---|---|
| **ID** | TC-13 |
| **Module** | Navigation |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Connecté, viewport ≥ 768px |
| **Étapes** | 1. Vérifier la barre de recherche dans le header<br>2. Saisir "Mukendi" dans le champ<br>3. Vérifier le placeholder "Rechercher un élève, une classe..." |
| **Résultat attendu** | Barre de recherche visible avec icône loupe et placeholder approprié |
| **Résultat obtenu** | |
| **Statut** | |

### TC-14: Header — Notifications (chargement Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-14 |
| **Module** | Navigation |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Connecté |
| **Étapes** | 1. Cliquer sur l'icône cloche dans le header<br>2. Vérifier l'ouverture du panneau de notifications<br>3. Vérifier le spinner de chargement (Loader2)<br>4. Vérifier l'affichage des notifications chargées depuis Supabase<br>5. Vérifier le point rouge (badge) sur la cloche<br>6. Cliquer sur "Voir tout" |
| **Résultat attendu** | Panneau de notifications avec spinner pendant le chargement, puis liste des notifications depuis la base de données |
| **Résultat obtenu** | |
| **Statut** | |

### TC-15: Navigation entre modules

| Champ | Valeur |
|---|---|
| **ID** | TC-15 |
| **Module** | Navigation |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Connecté |
| **Étapes** | 1. Cliquer sur "Dashboard" → vérifier `/dashboard`<br>2. Cliquer sur "Élèves" → vérifier `/students`<br>3. Cliquer sur "Classes" → vérifier `/classes`<br>4. Cliquer sur "Présences" → vérifier `/attendance`<br>5. Cliquer sur "Notes" → vérifier `/grades`<br>6. Cliquer sur "Paiements" → vérifier `/payments`<br>7. Cliquer sur "Parents" → vérifier `/parents`<br>8. Cliquer sur "Enseignants" → vérifier `/teachers`<br>9. Cliquer sur "Communication" → vérifier `/communication`<br>10. Cliquer sur "Rapports" → vérifier `/reports`<br>11. Cliquer sur "Paramètres" → vérifier `/settings` |
| **Résultat attendu** | Chaque lien navigue vers la bonne URL — la page active est surlignée dans la sidebar |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 3 — Tableau de bord

### TC-16: Affichage des cartes de statistiques (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-16 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/dashboard` |
| **Étapes** | 1. Vérifier le spinner de chargement (Loader2) pendant la récupération des données<br>2. Vérifier l'affichage de 8 cartes statistiques<br>3. Vérifier les valeurs calculées depuis Supabase: Effectif total (50), Présents, Absents, Retards<br>4. Vérifier les montants formatés en FC (Paiements du jour, Impayés, Recettes)<br>5. Vérifier les icônes colorées et tendances |
| **Résultat attendu** | 8 cartes avec données réelles de Supabase, montants en FC, spinner pendant le chargement |
| **Résultat obtenu** | |
| **Statut** | |

### TC-17: Graphique — Recettes mensuelles

| Champ | Valeur |
|---|---|
| **ID** | TC-17 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Vérifier l'affichage du graphique en aires (AreaChart)<br>2. Vérifier les 6 mois sur l'axe X (calculés depuis les paiements Supabase)<br>3. Vérifier le tooltip au survol<br>4. Vérifier le défilement horizontal sur petit écran |
| **Résultat attendu** | Graphique en aires avec gradient bleu, données des 6 derniers mois depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-18: Graphique — Présences par classe

| Champ | Valeur |
|---|---|
| **ID** | TC-18 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Vérifier l'affichage du graphique en barres (BarChart)<br>2. Vérifier les 5 classes sur l'axe X<br>3. Vérifier les 4 séries (Présent, Absent, Retard, Justifié)<br>4. Vérifier la légende |
| **Résultat attendu** | Graphique en barres groupées avec 4 séries colorées et légende |
| **Résultat obtenu** | |
| **Statut** | |

### TC-19: Graphique — Répartition des effectifs

| Champ | Valeur |
|---|---|
| **ID** | TC-19 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Vérifier l'affichage du graphique en anneau (PieChart)<br>2. Vérifier les niveaux (6ème, 5ème, 4ème, 3ème)<br>3. Vérifier la légende |
| **Résultat attendu** | Graphique en anneau avec segments colorés et légende |
| **Résultat obtenu** | |
| **Statut** | |

### TC-20: Section — Activité récente

| Champ | Valeur |
|---|---|
| **ID** | TC-20 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Vérifier l'affichage de la liste d'activités<br>2. Vérifier les 5 entrées minimum<br>3. Vérifier les icônes colorées par type<br>4. Vérifier le défilement vertical (scrollbar-thin) |
| **Résultat attendu** | Liste défilante d'activités avec icônes, texte tronqué et timestamps |
| **Résultat obtenu** | |
| **Statut** | |

### TC-21: Boutons d'action rapide

| Champ | Valeur |
|---|---|
| **ID** | TC-21 |
| **Module** | Dashboard |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Cliquer sur "Faire l'appel" → vérifier redirection `/attendance`<br>2. Retour au dashboard<br>3. Cliquer sur "Inscrire un élève" → vérifier redirection `/students/new` |
| **Résultat attendu** | Les deux boutons redirigent vers les bonnes pages |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 4 — Gestion des élèves

### TC-22: Liste des élèves — Affichage tableau (Desktop, données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-22 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/students`, viewport ≥ 768px |
| **Étapes** | 1. Vérifier le spinner de chargement pendant la récupération Supabase<br>2. Vérifier l'affichage du tableau avec colonnes (Élève, Matricule, Classe, Parent, Statut, Actions)<br>3. Vérifier 50 élèves chargés depuis Supabase<br>4. Vérifier les avatars avec initiales<br>5. Vérifier les badges de statut (Actif/Inactif)<br>6. Vérifier les boutons d'action (Voir, Éditer, Supprimer) |
| **Résultat attendu** | Tableau avec 50 lignes depuis Supabase, avatars, badges et actions — scroll horizontal si nécessaire |
| **Résultat obtenu** | |
| **Statut** | |

### TC-23: Liste des élèves — Affichage cartes (Mobile)

| Champ | Valeur |
|---|---|
| **ID** | TC-23 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/students`, viewport < 768px |
| **Étapes** | 1. Vérifier que le tableau est masqué<br>2. Vérifier l'affichage des cartes mobile<br>3. Vérifier le nom, matricule, classe et parent sur chaque carte<br>4. Vérifier la troncature du texte (truncate)<br>5. Taper sur une carte pour ouvrir le détail |
| **Résultat attendu** | Cartes mobile avec informations tronquées — navigation vers détail au tap |
| **Résultat obtenu** | |
| **Statut** | |

### TC-24: Recherche d'élève par nom

| Champ | Valeur |
|---|---|
| **ID** | TC-24 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Critique |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Saisir "Mukendi" dans la barre de recherche<br>2. Vérifier le filtrage en temps réel<br>3. Vider la recherche et vérifier le retour à 50 élèves |
| **Résultat attendu** | Filtrage instantané par nom — la liste se met à jour à chaque frappe |
| **Résultat obtenu** | |
| **Statut** | |

### TC-25: Recherche d'élève par matricule

| Champ | Valeur |
|---|---|
| **ID** | TC-25 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Haute |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Saisir "EL0001" dans la barre de recherche<br>2. Vérifier le filtrage<br>3. Vérifier qu'un seul résultat s'affiche |
| **Résultat attendu** | Filtrage par matricule — un seul résultat correspondant |
| **Résultat obtenu** | |
| **Statut** | |

### TC-26: Filtres par classe et statut

| Champ | Valeur |
|---|---|
| **ID** | TC-26 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Haute |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Cliquer sur "Filtres"<br>2. Sélectionner "6ème A" dans le filtre classe (chargé depuis Supabase)<br>3. Vérifier le filtrage (12 élèves)<br>4. Sélectionner "Actif" dans le filtre statut<br>5. Vérifier le filtrage combiné |
| **Résultat attendu** | Filtres combinés fonctionnels — le nombre d'élèves affichés se met à jour |
| **Résultat obtenu** | |
| **Statut** | |

### TC-27: Fiche détaillée d'un élève

| Champ | Valeur |
|---|---|
| **ID** | TC-27 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Critique |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Cliquer sur le bouton "Voir" (icône œil) d'un élève<br>2. Vérifier la redirection vers `/students/[id]`<br>3. Vérifier les onglets (Infos, Scolarité, Notes, Présences, Parents, Documents)<br>4. Vérifier les informations personnelles chargées depuis Supabase<br>5. Vérifier la liste des parents<br>6. Vérifier l'historique des paiements |
| **Résultat attendu** | Page de détail avec onglets, infos complètes depuis Supabase et listes défilantes |
| **Résultat obtenu** | |
| **Statut** | |

### TC-28: Création d'un nouvel élève (écriture Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-28 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Critique |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Cliquer sur "Nouvel élève"<br>2. Vérifier la redirection vers `/students/new`<br>3. Vérifier que les classes et parents sont chargés depuis Supabase<br>4. Remplir le formulaire (prénom, nom, date de naissance, classe)<br>5. Sélectionner un parent<br>6. Cliquer sur "Créer l'élève"<br>7. Vérifier le spinner pendant la sauvegarde |
| **Résultat attendu** | Élève créé dans Supabase — redirection vers `/students` après création |
| **Résultat obtenu** | |
| **Statut** | |

### TC-29: Modification d'un élève

| Champ | Valeur |
|---|---|
| **ID** | TC-29 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Haute |
| **Préconditions** | Page de détail d'un élève |
| **Étapes** | 1. Cliquer sur "Modifier"<br>2. Vérifier la redirection vers `/students/[id]/edit`<br>3. Vérifier que les champs sont pré-remplis depuis Supabase<br>4. Modifier le prénom<br>5. Cliquer sur "Enregistrer" |
| **Résultat attendu** | Formulaire pré-rempli depuis Supabase — redirection vers `/students` après sauvegarde |
| **Résultat obtenu** | |
| **Statut** | |

### TC-30: État vide — Aucun élève trouvé

| Champ | Valeur |
|---|---|
| **ID** | TC-30 |
| **Module** | Élèves |
| **Rôle** | Secrétaire |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/students` |
| **Étapes** | 1. Saisir "zzzzzz" dans la barre de recherche<br>2. Vérifier l'affichage de l'état vide |
| **Résultat attendu** | Message "Aucun élève trouvé" avec icône GraduationCap |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 5 — Paiements

### TC-31: Liste des factures — Affichage tableau (Desktop, données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-31 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/payments`, viewport ≥ 768px |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier l'affichage du tableau (Élève, Type, Montant, Payé, Reste, Statut, Actions)<br>3. Vérifier 50 factures chargées depuis Supabase<br>4. Vérifier les badges de statut (Payé, Partiel, Impayé)<br>5. Vérifier les montants formatés (FC) |
| **Résultat attendu** | Tableau avec 50 factures depuis Supabase, badges colorés et montants formatés |
| **Résultat obtenu** | |
| **Statut** | |

### TC-32: Cartes de statistiques de paiement

| Champ | Valeur |
|---|---|
| **ID** | TC-32 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Haute |
| **Préconditions** | Page `/payments` |
| **Étapes** | 1. Vérifier l'affichage des cartes de statistiques<br>2. Vérifier: Total facturé, Total encaissé, Impayés (calculés depuis Supabase)<br>3. Vérifier le format des montants en FC |
| **Résultat attendu** | Cartes résumé avec montants formatés en FC, calculés depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-33: Enregistrement d'un paiement (écriture Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-33 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Critique |
| **Préconditions** | Page `/payments` |
| **Étapes** | 1. Cliquer sur "Encaisser" pour une facture impayée<br>2. Vérifier l'ouverture du formulaire de paiement<br>3. Saisir le montant<br>4. Sélectionner le mode de paiement (Espèces, Mobile Money, Virement, Chèque)<br>5. Valider le paiement |
| **Résultat attendu** | Paiement enregistré dans Supabase — mise à jour de la facture |
| **Résultat obtenu** | |
| **Statut** | |

### TC-34: Affichage d'un reçu

| Champ | Valeur |
|---|---|
| **ID** | TC-34 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Haute |
| **Préconditions** | Page `/payments`, paiement existant |
| **Étapes** | 1. Cliquer sur "Reçu" pour un paiement complété<br>2. Vérifier l'affichage du reçu<br>3. Vérifier les informations (élève, montant, date, mode) |
| **Résultat attendu** | Reçu détaillé avec toutes les informations du paiement depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-35: Filtres des paiements

| Champ | Valeur |
|---|---|
| **ID** | TC-35 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Haute |
| **Préconditions** | Page `/payments` |
| **Étapes** | 1. Saisir un nom dans la recherche<br>2. Filtrer par statut (Payé, Partiel, Impayé)<br>3. Vérifier la mise à jour de la liste |
| **Résultat attendu** | Filtrage par recherche et statut fonctionnel |
| **Résultat obtenu** | |
| **Statut** | |

### TC-36: Affichage mobile des paiements (Cartes)

| Champ | Valeur |
|---|---|
| **ID** | TC-36 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Haute |
| **Préconditions** | Page `/payments`, viewport < 768px |
| **Étapes** | 1. Vérifier que le tableau est masqué sur mobile<br>2. Vérifier l'affichage des cartes mobile<br>3. Vérifier la troncature des noms et types<br>4. Vérifier les badges de statut |
| **Résultat attendu** | Cartes mobile avec informations tronquées et badges |
| **Résultat obtenu** | |
| **Statut** | |

### TC-37: Sélecteur de mode de paiement

| Champ | Valeur |
|---|---|
| **ID** | TC-37 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Moyenne |
| **Préconditions** | Formulaire de paiement ouvert |
| **Étapes** | 1. Vérifier 4 options: Espèces, Mobile Money, Virement, Chèque<br>2. Cliquer sur chaque option<br>3. Vérifier le surlignage visuel (ring + shadow) |
| **Résultat attendu** | 4 cartes de mode sélectionnables avec effet visuel au clic |
| **Résultat obtenu** | |
| **Statut** | |

### TC-38: Format des montants (FC)

| Champ | Valeur |
|---|---|
| **ID** | TC-38 |
| **Module** | Paiements |
| **Rôle** | Comptable |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/payments` |
| **Étapes** | 1. Vérifier que tous les montants affichent "FC" comme suffixe<br>2. Vérifier les séparateurs de milliers (ex: 250.000 FC) |
| **Résultat attendu** | Montants formatés avec séparateurs et suffixe FC |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 6 — Notes & Évaluations

### TC-39: Liste des évaluations (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-39 |
| **Module** | Notes |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/grades` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier l'affichage des cartes d'évaluation<br>3. Vérifier 12 évaluations chargées depuis Supabase<br>4. Vérifier les badges de statut (Brouillon, Validé, Publié)<br>5. Vérifier les informations (matière, classe, date, coefficient) |
| **Résultat attendu** | Cartes d'évaluation avec données Supabase, badges et informations — responsive grid |
| **Résultat obtenu** | |
| **Statut** | |

### TC-40: Saisie des notes

| Champ | Valeur |
|---|---|
| **ID** | TC-40 |
| **Module** | Notes |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Page `/grades` |
| **Étapes** | 1. Cliquer sur une évaluation<br>2. Vérifier l'affichage de la liste des élèves<br>3. Vérifier les champs de saisie de notes (/20)<br>4. Vérifier le défilement vertical (max-h-500px)<br>5. Saisir une note et vérifier la couleur (vert ≥10, rouge <10) |
| **Résultat attendu** | Liste défilante d'élèves avec champs de notes colorés selon la valeur |
| **Résultat obtenu** | |
| **Statut** | |

### TC-41: Génération du bulletin

| Champ | Valeur |
|---|---|
| **ID** | TC-41 |
| **Module** | Notes |
| **Rôle** | Enseignant |
| **Priorité** | Haute |
| **Préconditions** | Page `/grades` |
| **Étapes** | 1. Naviguer vers l'onglet "Bulletin"<br>2. Sélectionner une classe et un élève<br>3. Vérifier l'affichage du bulletin<br>4. Vérifier le tableau avec les matières, notes et coefficients<br>5. Vérifier la moyenne générale |
| **Résultat attendu** | Bulletin avec tableau des matières, calcul de la moyenne et scroll horizontal |
| **Résultat obtenu** | |
| **Statut** | |

### TC-42: Filtres des évaluations

| Champ | Valeur |
|---|---|
| **ID** | TC-42 |
| **Module** | Notes |
| **Rôle** | Enseignant |
| **Priorité** | Haute |
| **Préconditions** | Page `/grades` |
| **Étapes** | 1. Filtrer par classe<br>2. Filtrer par matière<br>3. Filtrer par statut<br>4. Vérifier la mise à jour des cartes |
| **Résultat attendu** | Filtrage combiné fonctionnel — les cartes se mettent à jour |
| **Résultat obtenu** | |
| **Statut** | |

### TC-43: Statut de validation des notes

| Champ | Valeur |
|---|---|
| **ID** | TC-43 |
| **Module** | Notes |
| **Rôle** | Enseignant |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/grades` |
| **Étapes** | 1. Vérifier les 3 statuts: Brouillon, Validé, Publié<br>2. Vérifier les badges colorés correspondants |
| **Résultat attendu** | 3 badges de statut avec couleurs distinctes (gris, bleu, vert) |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 7 — Présences

### TC-44: Faire l'appel — Sélection de classe (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-44 |
| **Module** | Présences |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Connecté, page `/attendance` |
| **Étapes** | 1. Vérifier le sélecteur de classe en haut (classes chargées depuis Supabase)<br>2. Sélectionner "6ème A"<br>3. Vérifier le chargement des élèves<br>4. Vérifier la date du jour affichée |
| **Résultat attendu** | Liste des élèves de la classe sélectionée depuis Supabase avec date du jour |
| **Résultat obtenu** | |
| **Statut** | |

### TC-45: Marquer les présences

| Champ | Valeur |
|---|---|
| **ID** | TC-45 |
| **Module** | Présences |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Classe sélectionnée, élèves affichés |
| **Étapes** | 1. Pour chaque élève, cliquer sur un statut (Présent, Absent, Retard, Justifié)<br>2. Vérifier le surlignage du bouton actif<br>3. Vérifier l'effet `active:scale-95`<br>4. Cliquer sur "Marquer tous présents" |
| **Résultat attendu** | Statuts modifiables individuellement — bouton "tous présents" fonctionnel |
| **Résultat obtenu** | |
| **Statut** | |

### TC-46: Résumé des présences

| Champ | Valeur |
|---|---|
| **ID** | TC-46 |
| **Module** | Présences |
| **Rôle** | Enseignant |
| **Priorité** | Haute |
| **Préconditions** | Présences marquées |
| **Étapes** | 1. Vérifier les 4 cartes de résumé (Présents, Absents, Retards, Justifiés)<br>2. Vérifier les compteurs en temps réel<br>3. Vérifier les couleurs (vert, rouge, orange, gris) |
| **Résultat attendu** | 4 cartes résumé avec compteurs en temps réel et couleurs sémantiques |
| **Résultat obtenu** | |
| **Statut** | |

### TC-47: Sauvegarde de l'appel (écriture Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-47 |
| **Module** | Présences |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Présences marquées |
| **Étapes** | 1. Cliquer sur "Enregistrer"<br>2. Vérifier la confirmation visuelle<br>3. Vérifier que les présences sont enregistrées dans Supabase |
| **Résultat attendu** | Sauvegarde effectuée dans Supabase avec confirmation |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 8 — Communication

### TC-48: Onglets Annonces / Notifications (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-48 |
| **Module** | Communication |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/communication` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier les 2 onglets: Annonces et Notifications<br>3. Basculer entre les onglets<br>4. Vérifier le contenu chargé depuis Supabase |
| **Résultat attendu** | 2 onglets fonctionnels avec contenu depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-49: Liste des annonces

| Champ | Valeur |
|---|---|
| **ID** | TC-49 |
| **Module** | Communication |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "Annonces" actif |
| **Étapes** | 1. Vérifier l'affichage de 6 annonces depuis Supabase<br>2. Vérifier les informations (titre, contenu, auteur, date)<br>3. Vérifier les badges de cible (Tous, Parents, Enseignants, Classe)<br>4. Vérifier le défilement |
| **Résultat attendu** | Liste de 6 annonces depuis Supabase avec badges de cible et défilement |
| **Résultat obtenu** | |
| **Statut** | |

### TC-50: Création d'une annonce (écriture Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-50 |
| **Module** | Communication |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Page `/communication` |
| **Étapes** | 1. Cliquer sur "Nouvelle annonce"<br>2. Vérifier le formulaire (titre, contenu, cible)<br>3. Saisir le titre et le contenu<br>4. Sélectionner la cible<br>5. Publier |
| **Résultat attendu** | Annonce créée dans Supabase — affichage dans la liste |
| **Résultat obtenu** | |
| **Statut** | |

### TC-51: Liste des notifications

| Champ | Valeur |
|---|---|
| **ID** | TC-51 |
| **Module** | Communication |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "Notifications" actif |
| **Étapes** | 1. Vérifier l'affichage de 10 notifications depuis Supabase<br>2. Vérifier les badges de type (Paiement, Absence, Annonce, Bulletin, Nouvel élève)<br>3. Vérifier les badges de canal (SMS, Email, In-app)<br>4. Vérifier les badges de statut (Envoyé, En attente, Échec) |
| **Résultat attendu** | 10 notifications depuis Supabase avec badges de type, canal et statut |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 9 — Rapports

### TC-52: Sélecteur de type de rapport

| Champ | Valeur |
|---|---|
| **ID** | TC-52 |
| **Module** | Rapports |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/reports` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier les cartes de type de rapport (Financier, Présences, Notes, Élèves, Personnel)<br>3. Cliquer sur chaque type<br>4. Vérifier le surlignage actif |
| **Résultat attendu** | Cartes de type sélectionnables avec données Supabase et effet visuel au clic |
| **Résultat obtenu** | |
| **Statut** | |

### TC-53: Rapport financier — Graphiques

| Champ | Valeur |
|---|---|
| **ID** | TC-53 |
| **Module** | Rapports |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Rapport financier sélectionné |
| **Étapes** | 1. Vérifier l'affichage des graphiques avec données Supabase<br>2. Vérifier le scroll horizontal (overflow-x-auto)<br>3. Vérifier le minWidth (280px) sur ResponsiveContainer<br>4. Vérifier les cartes de statistiques |
| **Résultat attendu** | Graphiques avec données Supabase, scroll horizontal et cartes de statistiques |
| **Résultat obtenu** | |
| **Statut** | |

### TC-54: Filtre de période

| Champ | Valeur |
|---|---|
| **ID** | TC-54 |
| **Module** | Rapports |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/reports` |
| **Étapes** | 1. Vérifier le sélecteur de période<br>2. Sélectionner une période<br>3. Vérifier la mise à jour des données |
| **Résultat attendu** | Filtre de période fonctionnel avec mise à jour des graphiques |
| **Résultat obtenu** | |
| **Statut** | |

### TC-55: Export de rapport

| Champ | Valeur |
|---|---|
| **ID** | TC-55 |
| **Module** | Rapports |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Rapport affiché |
| **Étapes** | 1. Vérifier la présence d'un bouton "Exporter"<br>2. Vérifier que le texte est masqué sur mobile |
| **Résultat attendu** | Bouton Exporter visible — texte caché sur mobile |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 10 — Paramètres

### TC-56: Onglets de paramètres (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-56 |
| **Module** | Paramètres |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/settings` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier les 4 onglets: École, Utilisateurs, Années, Sécurité<br>3. Vérifier le scroll horizontal des onglets sur mobile (no-scrollbar)<br>4. Basculer entre les onglets |
| **Résultat attendu** | 4 onglets navigables avec données chargées depuis Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-57: Paramètres de l'école

| Champ | Valeur |
|---|---|
| **ID** | TC-57 |
| **Module** | Paramètres |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "École" actif |
| **Étapes** | 1. Vérifier le formulaire pré-rempli avec les données de l'école depuis Supabase<br>2. Vérifier la zone d'upload de logo<br>3. Modifier le nom de l'école<br>4. Cliquer sur "Enregistrer" |
| **Résultat attendu** | Formulaire d'école avec données Supabase, upload de logo et sauvegarde |
| **Résultat obtenu** | |
| **Statut** | |

### TC-58: Gestion des utilisateurs

| Champ | Valeur |
|---|---|
| **ID** | TC-58 |
| **Module** | Paramètres |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "Utilisateurs" actif |
| **Étapes** | 1. Vérifier le tableau des utilisateurs chargés depuis Supabase<br>2. Vérifier le scroll horizontal (min-w-640px)<br>3. Vérifier les 5 utilisateurs<br>4. Vérifier les avatars avec initiales<br>5. Vérifier les badges de rôle |
| **Résultat attendu** | Tableau des utilisateurs depuis Supabase avec scroll horizontal, avatars et badges |
| **Résultat obtenu** | |
| **Statut** | |

### TC-59: Années scolaires

| Champ | Valeur |
|---|---|
| **ID** | TC-59 |
| **Module** | Paramètres |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Onglet "Années" actif |
| **Étapes** | 1. Vérifier la liste des années scolaires depuis Supabase<br>2. Vérifier 2 années (2026-2027 active, 2025-2026 archivée)<br>3. Vérifier les badges de statut |
| **Résultat attendu** | Liste des années depuis Supabase avec badges de statut (Active, Archivée) |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 11 — Parents & Enseignants

### TC-60: Liste des parents (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-60 |
| **Module** | Parents |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/parents` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier la grille: 1 col mobile, 2 md, 3 lg<br>3. Vérifier 15 parents chargés depuis Supabase<br>4. Vérifier les cartes avec avatar, nom, profession, contact<br>5. Vérifier les badges d'enfants<br>6. Vérifier la troncature du texte<br>7. Vérifier l'effet hover (-translate-y-0.5) |
| **Résultat attendu** | Grille responsive de 15 cartes parents depuis Supabase avec hover lift et troncature |
| **Résultat obtenu** | |
| **Statut** | |

### TC-61: Recherche de parent

| Champ | Valeur |
|---|---|
| **ID** | TC-61 |
| **Module** | Parents |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/parents` |
| **Étapes** | 1. Saisir "Mukendi" dans la recherche<br>2. Vérifier le filtrage<br>3. Vérifier la troncature des résultats |
| **Résultat attendu** | Filtrage par nom avec résultats tronqués |
| **Résultat obtenu** | |
| **Statut** | |

### TC-62: Liste des enseignants (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-62 |
| **Module** | Enseignants |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/teachers` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier la grille responsive<br>3. Vérifier 5 enseignants chargés depuis Supabase<br>4. Vérifier les cartes avec avatar, nom, email, téléphone<br>5. Vérifier les badges de matières<br>6. Vérifier les badges de classes<br>7. Vérifier le statut (Actif/Inactif) |
| **Résultat attendu** | Grille de 5 cartes enseignants depuis Supabase avec badges et statut |
| **Résultat obtenu** | |
| **Statut** | |

### TC-63: Affichage des matières enseignées

| Champ | Valeur |
|---|---|
| **ID** | TC-63 |
| **Module** | Enseignants |
| **Rôle** | Directeur |
| **Priorité** | Moyenne |
| **Préconditions** | Page `/teachers` |
| **Étapes** | 1. Vérifier les badges de matières sur chaque carte<br>2. Vérifier le scroll vertical si la liste est longue (max-h-80px)<br>3. Vérifier les badges de classes |
| **Résultat attendu** | Badges de matières et classes avec scroll si débordement |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 12 — Classes & Matières

### TC-64: Onglets Classes / Matières (données Supabase)

| Champ | Valeur |
|---|---|
| **ID** | TC-64 |
| **Module** | Classes |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/classes` |
| **Étapes** | 1. Vérifier le spinner de chargement<br>2. Vérifier les 2 onglets: Classes et Matières<br>3. Vérifier le scroll horizontal des onglets sur mobile (no-scrollbar)<br>4. Basculer entre les onglets |
| **Résultat attendu** | 2 onglets navigables avec données Supabase |
| **Résultat obtenu** | |
| **Statut** | |

### TC-65: Grille de classes

| Champ | Valeur |
|---|---|
| **ID** | TC-65 |
| **Module** | Classes |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "Classes" actif |
| **Étapes** | 1. Vérifier 5 cartes de classes depuis Supabase<br>2. Vérifier les informations (nom, niveau, salle, enseignant principal, effectif)<br>3. Vérifier l'effet hover lift<br>4. Vérifier la troncature du nom de l'enseignant |
| **Résultat attendu** | 5 cartes de classes depuis Supabase avec hover lift et infos tronquées |
| **Résultat obtenu** | |
| **Statut** | |

### TC-66: Tableau des matières

| Champ | Valeur |
|---|---|
| **ID** | TC-66 |
| **Module** | Classes |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Onglet "Matières" actif |
| **Étapes** | 1. Vérifier le tableau des matières depuis Supabase<br>2. Vérifier le scroll horizontal (overflow-x-auto scrollbar-thin)<br>3. Vérifier 9 matières<br>4. Vérifier les badges de coefficient<br>5. Vérifier les icônes avatar par matière |
| **Résultat attendu** | Tableau de 9 matières depuis Supabase avec scroll horizontal, badges et avatars |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 13 — Sécurité & Contrôle d'Accès (NOUVEAU)

### TC-67: Isolation des rôles — Le rôle est verrouillé par le profil Supabase

| Champ | Valeur |
|---|---|
| **ID** | TC-67 |
| **Module** | Sécurité |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Comptes de test créés dans Supabase |
| **Étapes** | 1. Se connecter avec `esther.tshala@kelasi.com` (rôle enseignant)<br>2. Vérifier que la sidebar n'affiche que les modules enseignant (Dashboard, Classes, Présences, Notes, Communication)<br>3. Tenter d'accéder manuellement à `/payments`<br>4. Vérifier la redirection automatique vers `/dashboard` |
| **Résultat attendu** | Le rôle est déterminé par le profil Supabase — un enseignant ne peut pas accéder aux paiements, même en saisissant l'URL manuellement |
| **Résultat obtenu** | |
| **Statut** | |

### TC-68: Un enseignant ne peut pas se connecter en tant que directeur

| Champ | Valeur |
|---|---|
| **ID** | TC-68 |
| **Module** | Sécurité |
| **Rôle** | Enseignant |
| **Priorité** | Critique |
| **Préconditions** | Page de connexion |
| **Étapes** | 1. Sélectionner le rôle "Directeur" sur la page de connexion<br>2. Saisir `esther.tshala@kelasi.com` (email enseignant)<br>3. Saisir `Prof@2026` (mot de passe enseignant)<br>4. Cliquer sur "Se connecter" |
| **Résultat attendu** | L'utilisateur se connecte avec son vrai rôle (enseignant) — la sélection de rôle sur la page de connexion est cosmétique uniquement et ne change pas les permissions |
| **Résultat obtenu** | |
| **Statut** | |

### TC-69: Route guard — Redirection automatique pour rôle non autorisé

| Champ | Valeur |
|---|---|
| **ID** | TC-69 |
| **Module** | Sécurité |
| **Rôle** | Parent |
| **Priorité** | Critique |
| **Préconditions** | Connecté en tant que parent (`jean.mukendi@kelasi.com`) |
| **Étapes** | 1. Saisir `/teachers` dans la barre d'URL<br>2. Vérifier la redirection vers `/dashboard`<br>3. Saisir `/payments` dans la barre d'URL<br>4. Vérifier la redirection vers `/dashboard`<br>5. Saisir `/grades` dans la barre d'URL<br>6. Vérifier la redirection vers `/dashboard` |
| **Résultat attendu** | Un parent est automatiquement redirigé vers le dashboard s'il tente d'accéder à une page non autorisée |
| **Résultat obtenu** | |
| **Statut** | |

### TC-70: Protection des données par RLS — Isolation par école

| Champ | Valeur |
|---|---|
| **ID** | TC-70 |
| **Module** | Sécurité |
| **Rôle** | Directeur |
| **Priorité** | Critique |
| **Préconditions** | Connecté en tant que directeur |
| **Étapes** | 1. Vérifier que seules les données de l'École Mixte Lumumba sont visibles<br>2. Vérifier qu'aucune donnée d'une autre école n'apparaît<br>3. Vérifier que les politiques RLS bloquent l'accès inter-école |
| **Résultat attendu** | Les politiques RLS de Supabase garantissent qu'un utilisateur ne voit que les données de son école |
| **Résultat obtenu** | |
| **Statut** | |

### TC-71: Accès non authentifié — Redirection vers connexion

| Champ | Valeur |
|---|---|
| **ID** | TC-71 |
| **Module** | Sécurité |
| **Rôle** | Non authentifié |
| **Priorité** | Critique |
| **Préconditions** | Aucune session active |
| **Étapes** | 1. Naviguer vers `/dashboard` sans être connecté<br>2. Vérifier la redirection vers `/` |
| **Résultat attendu** | Un utilisateur non connecté est redirigé vers la page de connexion |
| **Résultat obtenu** | |
| **Statut** | |

### TC-72: Spinner de chargement pendant l'authentification

| Champ | Valeur |
|---|---|
| **ID** | TC-72 |
| **Module** | Sécurité |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Session en cours de validation |
| **Étapes** | 1. Se connecter<br>2. Vérifier l'affichage du spinner (Loader2) pendant le chargement du profil<br>3. Vérifier que les pages protégées affichent le spinner |
| **Résultat attendu** | Spinner visible pendant la vérification de session et le chargement du profil |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 14 — Responsive & Design

### TC-73: Responsive — Mobile (320px)

| Champ | Valeur |
|---|---|
| **ID** | TC-73 |
| **Module** | Responsive |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Viewport 320px (iPhone SE) |
| **Étapes** | 1. Naviguer sur chaque page<br>2. Vérifier qu'aucun contenu ne déborde horizontalement<br>3. Vérifier que tous les textes sont tronqués<br>4. Vérifier que les boutons sont en mode icône-only<br>5. Vérifier que la bottom nav est visible<br>6. Vérifier que le padding est adapté (p-4) |
| **Résultat attendu** | Toutes pages utilisables à 320px sans débordement horizontal |
| **Résultat obtenu** | |
| **Statut** | |

### TC-74: Responsive — Tablette (768px)

| Champ | Valeur |
|---|---|
| **ID** | TC-74 |
| **Module** | Responsive |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Viewport 768px (iPad) |
| **Étapes** | 1. Vérifier l'affichage des grilles en 2 colonnes<br>2. Vérifier que les boutons affichent le texte<br>3. Vérifier que la sidebar est visible<br>4. Vérifier les tableaux (scroll si nécessaire) |
| **Résultat attendu** | Layout en 2 colonnes, texte visible sur boutons, sidebar visible |
| **Résultat obtenu** | |
| **Statut** | |

### TC-75: Responsive — Desktop (1280px)

| Champ | Valeur |
|---|---|
| **ID** | TC-75 |
| **Module** | Responsive |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Viewport 1280px |
| **Étapes** | 1. Vérifier l'affichage des grilles en 3-4 colonnes<br>2. Vérifier que la sidebar est complète (64 de large)<br>3. Vérifier que le contenu est centré (max-w-1400px)<br>4. Vérifier les ombres et effets hover |
| **Résultat attendu** | Layout complet en 3-4 colonnes, sidebar pleine, contenu centré |
| **Résultat obtenu** | |
| **Statut** | |

### TC-76: Troncature du texte

| Champ | Valeur |
|---|---|
| **ID** | TC-76 |
| **Module** | Responsive |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Données avec textes longs |
| **Étapes** | 1. Vérifier que les noms longs sont tronqués (truncate)<br>2. Vérifier que les emails sont tronqués<br>3. Vérifier que les adresses utilisent truncate-2 (2 lignes max) |
| **Résultat attendu** | Tous les textes longs sont tronqués avec ellipsis |
| **Résultat obtenu** | |
| **Statut** | |

### TC-77: Scroll horizontal des tableaux

| Champ | Valeur |
|---|---|
| **ID** | TC-77 |
| **Module** | Responsive |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Page avec tableau, viewport < 768px |
| **Étapes** | 1. Vérifier que tous les tableaux ont un wrapper overflow-x-auto<br>2. Vérifier la classe scrollbar-thin<br>3. Vérifier la largeur minimale (min-w-[X]px)<br>4. Vérifier le scroll tactile fluide |
| **Résultat attendu** | Tous les tableaux sont défilables horizontalement avec scrollbar fine |
| **Résultat obtenu** | |
| **Statut** | |

### TC-78: Animations et transitions

| Champ | Valeur |
|---|---|
| **ID** | TC-78 |
| **Module** | Design |
| **Rôle** | Tous |
| **Priorité** | Moyenne |
| **Préconditions** | Application chargée |
| **Étapes** | 1. Naviguer entre les pages et vérifier l'animation fade-in<br>2. Survoler les cartes et vérifier l'effet hover (shadow + translate)<br>3. Cliquer sur les boutons et vérifier l'effet active:scale-[0.97]<br>4. Ouvrir les modals et vérifier l'animation scale-in<br>5. Vérifier les transitions de couleur sur les badges |
| **Résultat attendu** | Animations fluides avec courbes cubic-bezier sur toutes les transitions |
| **Résultat obtenu** | |
| **Statut** | |

### TC-79: Contraste des couleurs — Lisibilité

| Champ | Valeur |
|---|---|
| **ID** | TC-79 |
| **Module** | Design |
| **Rôle** | Tous |
| **Priorité** | Critique |
| **Préconditions** | Application chargée |
| **Étapes** | 1. Vérifier le contraste du texte sur fond blanc (foreground/background)<br>2. Vérifier le contraste du texte sur fond primary<br>3. Vérifier le contraste des badges (success, warning, destructive)<br>4. Vérifier le contraste sur la sidebar sombre<br>5. Vérifier la lisibilité pendant les transitions |
| **Résultat attendu** | Tous les textes sont lisibles avec un contraste suffisant (WCAG AA) |
| **Résultat obtenu** | |
| **Statut** | |

---

## Module 15 — Performance & Build

### TC-80: Build de production

| Champ | Valeur |
|---|---|
| **ID** | TC-80 |
| **Module** | Build |
| **Rôle** | — |
| **Priorité** | Critique |
| **Préconditions** | Environnement de développement |
| **Étapes** | 1. Exécuter `npm run build`<br>2. Vérifier l'absence d'erreurs TypeScript<br>3. Vérifier que toutes les 17 pages sont compilées<br>4. Vérifier la taille des bundles |
| **Résultat attendu** | Build réussi — 17 pages compilées sans erreur |
| **Résultat obtenu** | |
| **Statut** | |

### TC-81: Temps de chargement des pages

| Champ | Valeur |
|---|---|
| **ID** | TC-81 |
| **Module** | Performance |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Build de production exécuté |
| **Étapes** | 1. Naviguer sur chaque page<br>2. Vérifier que le First Load JS est inférieur à 400KB<br>3. Vérifier l'absence de retard visible |
| **Résultat attendu** | Toutes les pages chargent en moins de 400KB First Load JS |
| **Résultat obtenu** | |
| **Statut** | |

### TC-82: Chargement des données Supabase — Spinner visible

| Champ | Valeur |
|---|---|
| **ID** | TC-82 |
| **Module** | Performance |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Application chargée, utilisateur connecté |
| **Étapes** | 1. Naviguer vers `/students`<br>2. Vérifier l'affichage du spinner (Loader2) pendant le chargement<br>3. Vérifier que les 50 élèves se chargent depuis Supabase<br>4. Naviguer vers `/payments`<br>5. Vérifier le spinner puis les 50 factures<br>6. Vérifier l'absence de latence sur les filtres (filtrage client-side) |
| **Résultat attendu** | Spinner visible pendant chaque chargement Supabase, puis données affichées — filtres instantanés |
| **Résultat obtenu** | |
| **Statut** | |

### TC-83: Chargement parallèle des données (Promise.all)

| Champ | Valeur |
|---|---|
| **ID** | TC-83 |
| **Module** | Performance |
| **Rôle** | Directeur |
| **Priorité** | Haute |
| **Préconditions** | Page `/dashboard` |
| **Étapes** | 1. Ouvrir le DevTools Network<br>2. Naviguer vers `/dashboard`<br>3. Vérifier que les requêtes Supabase partent en parallèle (élèves, présences, factures, paiements, classes, notifications)<br>4. Vérifier le temps de chargement total |
| **Résultat attendu** | Requêtes Supabase exécutées en parallèle via Promise.all — temps de chargement optimisé |
| **Résultat obtenu** | |
| **Statut** | |

### TC-84: Absence d'erreurs console

| Champ | Valeur |
|---|---|
| **ID** | TC-84 |
| **Module** | Build |
| **Rôle** | Tous |
| **Priorité** | Haute |
| **Préconditions** | Navigateur avec DevTools ouvert |
| **Étapes** | 1. Naviguer sur toutes les pages<br>2. Vérifier l'absence d'erreurs dans la console<br>3. Vérifier l'absence de warnings React<br>4. Vérifier l'absence de warnings d'hydratation |
| **Résultat attendu** | Aucune erreur ou warning dans la console sur toutes les pages |
| **Résultat obtenu** | |
| **Statut** | |

### TC-85: Optimisation des re-renders (useMemo / useCallback)

| Champ | Valeur |
|---|---|
| **ID** | TC-85 |
| **Module** | Performance |
| **Rôle** | Tous |
| **Priorité** | Moyenne |
| **Préconditions** | Application chargée |
| **Étapes** | 1. Ouvrir le React DevTools Profiler<br>2. Ouvrir/fermer la sidebar<br>3. Vérifier que seuls les composants nécessaires re-rendent<br>4. Vérifier que le contexte d'auth est stable (useCallback) |
| **Résultat attendu** | Re-renders minimisés grâce à useMemo et useCallback — la sidebar n'entraîne pas de re-render global |
| **Résultat obtenu** | |
| **Statut** | |

---

## Récapitulatif d'exécution

### Synthèse par module

| Module | Total TC | Pass | Fail | Blocked | N/A | Taux de réussite |
|---|---|---|---|---|---|---|
| Authentification | 10 | | | | | |
| Navigation | 5 | | | | | |
| Dashboard | 6 | | | | | |
| Élèves | 9 | | | | | |
| Paiements | 8 | | | | | |
| Notes | 5 | | | | | |
| Présences | 4 | | | | | |
| Communication | 4 | | | | | |
| Rapports | 4 | | | | | |
| Paramètres | 4 | | | | | |
| Parents & Enseignants | 4 | | | | | |
| Classes | 3 | | | | | |
| Sécurité & Contrôle d'Accès | 6 | | | | | |
| Responsive & Design | 7 | | | | | |
| Performance & Build | 6 | | | | | |
| **TOTAL** | **85** | | | | | |

### Synthèse par priorité

| Priorité | Total TC | Pass | Fail | Taux de réussite |
|---|---|---|---|---|
| Critique | 22 | | | |
| Haute | 30 | | | |
| Moyenne | 25 | | | |
| Basse | 8 | | | |
| **TOTAL** | **85** | | | |

### Anomalies détectées

| ID Anomalie | TC associé | Sévérité | Description | Statut |
|---|---|---|---|---|
| | | | | |

### Validation finale

| Champ | Valeur |
|---|---|
| **Date de validation** | |
| **Validé par** | |
| **Statut global** | ☐ Validé ☐ Validé avec réserves ☐ Refusé |
| **Commentaires** | |

---

## Signatures

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Testeur | | | |
| Chef de projet | | | |
| Représentant client | | | |
| Développeur | | | |

---

## Annexe — Architecture technique

### Backend Supabase

| Composant | Détail |
|---|---|
| **Base de données** | Postgres 15 (Supabase) |
| **Tables** | 20 tables avec clés étrangères et index |
| **Sécurité** | Row Level Security (RLS) activée sur toutes les tables |
| **Polices RLS** | 80 polices (4 par table: SELECT, INSERT, UPDATE, DELETE) |
| **Isolation** | Par école (school_id) — un utilisateur ne voit que les données de son école |
| **Authentification** | Supabase Auth (email/mot de passe, sessions persistantes JWT) |
| **Rôles** | super_admin, school_admin, secretary, accountant, teacher, parent |

### Frontend Next.js

| Composant | Détail |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **UI** | React 18, Tailwind CSS, shadcn/ui, Lucide React |
| **Graphiques** | Recharts (AreaChart, BarChart, PieChart) |
| **Client Supabase** | @supabase/supabase-js (singleton, sessions persistantes) |
| **Route Guard** | Protection par rôle — redirection automatique si accès non autorisé |
| **Optimisation** | useMemo, useCallback, Promise.all pour réduire les re-renders et paralléliser les requêtes |
