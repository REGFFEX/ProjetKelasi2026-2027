# Design System — Kelasi

## 1. Source du design system : skill `ui-ux-pro-max`

Même skill que pour Livrex (`nextlevelbuilder/ui-ux-pro-max-skill`), avec une requête adaptée au produit :

```
python3 skills/ui-ux-pro-max/scripts/search.py \
  "education school management SaaS multi-role dashboard" \
  --design-system \
  --stack react \
  --density 7 \
  -p "Kelasi" \
  --persist
```

- `--density 7` : un cran en dessous de Livrex — Kelasi a des écrans denses (dashboard, tableaux d'élèves/notes) mais aussi des écrans plus "humains" pour les parents (bulletins, annonces), donc un compromis.
- Persisté dans `design-system/MASTER.md`, à régénérer par page si besoin (`--page dashboard`, `--page bulletin`, etc.) vu la diversité des rôles/écrans.

## 2. Orientation visuelle par défaut (base avant génération réelle)

- **Ton** : institutionnel, rassurant, professionnel — Kelasi s'adresse à des directeurs d'école et des parents, pas seulement à des power users.
- **Palette** : une couleur primaire "identité Kelasi" + un système de couleurs sémantiques par statut :
  - Paiement à jour : vert · Impayé : rouge · Partiel : orange
  - Présent : vert · Absent : rouge · Retard : orange · Justifié : gris-bleu
- **Typographie** : lisible, formelle mais chaleureuse (le produit touche des enfants/familles, pas seulement du back-office pur).
- **Densité adaptative par rôle** : dashboard admin/comptabilité dense ; vues Parent et Enseignant plus aérées et guidées (moins de choix affichés à la fois).

## 3. Composants clés à couvrir

- Cartes indicateurs (dashboard école)
- Tableau élèves/notes/présences filtrable, avec appel quotidien rapide (present/absent/retard/justifié en un clic)
- Générateur de bulletin (aperçu + export PDF)
- Formulaire de paiement avec calcul automatique du reste à payer
- Fil de notifications/annonces
- Sélecteur de rôle/contexte (un directeur peut naviguer entre plusieurs écoles s'il en gère plusieurs — à valider)

## 4. Accessibilité et contexte d'usage

- Mobile-friendly impératif (principe produit Kelasi) — les enseignants font l'appel souvent depuis un téléphone.
- WCAG 2.2 AA — contraste suffisant pour un usage en extérieur/luminosité variable.
- Connexions parfois limitées selon les zones → mêmes précautions que Livrex (chargements progressifs, pas de blocage total).

## 5. Persistance du design system

`design-system/MASTER.md` (et ses variantes par page) devient la source de vérité visuelle — à relire avant toute session UI et à maintenir cohérent (règle README).

*Point de départ, à remplacer par la sortie réelle du skill une fois générée dans l'environnement de dev.*
