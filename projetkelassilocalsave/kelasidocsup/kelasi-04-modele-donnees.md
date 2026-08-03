# Modèle de Données — Kelasi

> Base relationnelle (PostgreSQL, hypothèse — voir `03-architecture-application.md`). **Toutes les entités métier portent un `schoolId`** (sauf `School` elle-même et les entités globales Digitech).

## 1. Entités principales (reprises et détaillées du document source)

### `School`
`id, nom, logo, adresse, telephone, statutAbonnement, dateCreation`

### `AcademicYear` (Année scolaire) — scope `schoolId`
`id, schoolId, libelle (ex. 2026-2027), dateDebut, dateFin, statut (active/archivee)`

### `Term` (Trimestre/Semestre) — scope `schoolId`
`id, schoolId, academicYearId, libelle, dateDebut, dateFin`

### `User` — scope `schoolId` (sauf Super Admin)
`id, schoolId (nullable pour Super Admin), nom, email, telephone, motDePasseHash, statut`

### `Role`
`id, nom (super_admin, school_admin, secretary, accountant, teacher, parent), permissions[]`

### `Student` (Élève) — scope `schoolId`
`id, schoolId, matricule, nom, prenom, dateNaissance, photo, classroomId, statut (actif/inactif), documents[]`

### `Parent` — scope `schoolId`
`id, schoolId, nom, telephone, adresse, profession, studentIds[] (multi-enfants)`

### `Teacher` (Enseignant) — scope `schoolId`
`id, schoolId, userId, nom, matieres[], classes[], statut`

### `Classroom` (Classe) — scope `schoolId`
`id, schoolId, niveau, nom, salle, enseignantPrincipalId, studentIds[]`

### `Subject` (Matière) — scope `schoolId`
`id, schoolId, nom, coefficient`

### `Enrollment` (Inscription) — scope `schoolId`
`id, schoolId, studentId, classroomId, academicYearId, dateInscription, statut`

### `Attendance` (Présence) — scope `schoolId`
`id, schoolId, studentId, classroomId, date, statut (present/absent/retard/justifie)`

### `Assessment` (Évaluation) — scope `schoolId`
`id, schoolId, subjectId, classroomId, termId, libelle, date, coefficient`

### `Grade` (Note) — scope `schoolId`
`id, schoolId, assessmentId, studentId, note, statutValidation (brouillon/valide/publie)`

### `Invoice` (Facture/Frais) — scope `schoolId`
`id, schoolId, studentId, typeFrais, montantTotal, montantPaye, resteAPayer, dateEmission`

### `Payment` (Paiement) — scope `schoolId`
`id, schoolId, invoiceId, montant, datePaiement, modePaiement, partiel (bool)`

### `Receipt` (Reçu) — scope `schoolId`
`id, schoolId, paymentId, referencePdf, dateGeneration`

### `Notification` — scope `schoolId`
`id, schoolId, type (paiement/absence/annonce/bulletin/nouvel_enseignant/nouvel_eleve), destinataireId, canal (sms/email/in-app), statut`

### `Announcement` (Annonce) — scope `schoolId`
`id, schoolId, auteurId, cible (parents/enseignants/classe), contenu, datePublication`

## 2. Relations principales

```
School (1) ──< AcademicYear ──< Term
School (1) ──< Classroom ──< Student
School (1) ──< Teacher
Student (N) ──< Enrollment >── (1) Classroom
Classroom (1) ──< Attendance >── (1) Student
Classroom (1) ──< Subject (via Assessment)
Assessment (1) ──< Grade >── (1) Student
Student (1) ──< Invoice ──< Payment ──< Receipt
Parent (1) ──< Student (plusieurs enfants possibles)
```

## 3. Règles d'intégrité multi-tenant (impératif)

1. **Aucune requête ne doit pouvoir retourner des données d'un `schoolId` différent** de celui de l'utilisateur authentifié (sauf Super Admin, via routes dédiées).
2. Toute clé étrangère référencée (ex. `classroomId` sur un `Student`) doit être validée comme appartenant au **même** `schoolId`.
3. Un `Payment` ne peut excéder le `resteAPayer` de la `Invoice` associée.
4. Une `Grade` ne peut être `publie` que si son statut précédent est `valide`.
5. Une `Attendance` = statut `absent` doit déclencher une `Notification` vers le(s) `Parent` de l'élève.

## 4. Index recommandés (performance)

- `Student(schoolId, classroomId)`
- `Attendance(schoolId, studentId, date)`
- `Payment(schoolId, invoiceId)`
- `Grade(schoolId, studentId, assessmentId)`

*Modèle à affiner une fois la stack backend validée (ORM cible, choix RLS PostgreSQL natif vs filtrage applicatif systématique).*
