# Catalogue des Fonctionnalités — Kelasi

Légende : ✅ MVP · 🟡 V1.1 · 🟠 V1.2 · 🔵 V2.0 · 🟣 V3.0

## 1. Authentification & Rôles
| Fonctionnalité | Détail | Version |
|---|---|---|
| Connexion par rôle | Super Admin, School Admin, Secretary, Accountant, Teacher, Parent | ✅ |
| Permissions par route API | Ex. `students.read`, `payments.create`, `grades.publish` | ✅ |
| Gestion des utilisateurs/permissions | Depuis Paramètres | ✅ |

## 2. Dashboard
| Fonctionnalité | Détail | Version |
|---|---|---|
| Widgets clés | Effectif total, présents aujourd'hui, paiements du jour, impayés, nouveaux élèves, recettes mensuelles | ✅ |
| Graphiques | Vision instantanée de l'école | ✅ |

## 3. Élèves
| Fonctionnalité | Détail | Version |
|---|---|---|
| CRUD élève | Créer, modifier, supprimer | ✅ |
| Import/Export | Liste d'élèves | ✅ |
| Photo, documents, historique, statut | Fiche complète | ✅ |

## 4. Parents
| Fonctionnalité | Détail | Version |
|---|---|---|
| Fiche parent | Téléphone, adresse, profession | ✅ |
| Lien multi-enfants | Un parent lié à plusieurs élèves | ✅ |
| Portail Parent dédié (appli/consultation) | Accès enrichi aux infos de ses enfants | 🟠 |

## 5. Enseignants
| Fonctionnalité | Détail | Version |
|---|---|---|
| Fiche enseignant | Infos, matières, classes, statut | ✅ |
| Accès restreint | Uniquement ses classes/matières/notes/présences | ✅ |

## 6. Classes & Matières
| Fonctionnalité | Détail | Version |
|---|---|---|
| Gestion classe | Niveau, nom, salle, enseignant principal, liste élèves | ✅ |
| Gestion matières | Créer/modifier/supprimer, coefficient | ✅ |

## 7. Présences
| Fonctionnalité | Détail | Version |
|---|---|---|
| Appel quotidien | Présent / Absent / Retard / Justifié | ✅ |
| Statistiques de présence | Par classe/élève | ✅ |
| Notification parent en cas d'absence | Déclencheur automatique | ✅ |

## 8. Notes & Bulletins
| Fonctionnalité | Détail | Version |
|---|---|---|
| Créer évaluation, saisie notes | | ✅ |
| Calcul automatique de moyenne, classement | | ✅ |
| Validation + publication | | ✅ |
| Génération bulletin PDF | | ✅ |

## 9. Paiements
| Fonctionnalité | Détail | Version |
|---|---|---|
| Types de frais, paiement, paiement partiel | Reste à payer suivi | ✅ |
| Historique, reçu PDF | | ✅ |
| Rapports financiers | | ✅ |
| Paiement Mobile Money intégré | | 🔵 |
| Module Comptabilité complet | | 🔵 |

## 10. Communication
| Fonctionnalité | Détail | Version |
|---|---|---|
| Notifications (déclencheurs : paiement, absence, annonce, bulletin, nouvel enseignant/élève) | | 🟡 |
| SMS, Emails, Annonces (parents, enseignants, classes) | | 🟡 |
| Calendrier | | 🟡 |
| Documents partagés | | 🟡 |

## 11. Rapports
| Fonctionnalité | Détail | Version |
|---|---|---|
| Rapports de base (financiers, notes, présences) | | ✅ |
| Rapports avancés | | 🟡 |

## 12. Paramètres
| Fonctionnalité | Détail | Version |
|---|---|---|
| Logo, informations école, années scolaires | | ✅ |
| Gestion utilisateurs/permissions | | ✅ |

## 13. Génération PDF
| Document | Version |
|---|---|
| Reçu de paiement | ✅ |
| Bulletin | ✅ |
| Liste d'élèves | ✅ |
| Rapport financier | ✅ |
| Certificat de scolarité | 🟡 |
| Carte scolaire | 🟡 |

## 14. Fonctionnalités futures (V2.0 → V3.0)
| Fonctionnalité | Version |
|---|---|
| Application Parent dédiée | 🟠 V1.2 |
| Mobile Money, Comptabilité, RH, Bibliothèque, Cantine, Transport | 🔵 V2.0 |
| Assistant administratif IA | 🟣 V3.0 |
| Prévisions financières IA | 🟣 V3.0 |
| Détection des risques d'abandon scolaire (IA) | 🟣 V3.0 |
| Recommandations personnalisées (IA) | 🟣 V3.0 |

## 15. Règle de gestion transverse : Multi-tenant

Toutes les données appartiennent à une école (`school_id`). Aucune donnée ne peut être visible par une autre école — cette contrainte s'applique à **chaque** fonctionnalité ci-dessus, sans exception.
