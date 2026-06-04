# Avancement — Project Manager

> Dernière mise à jour : 04/06/2026

---

## Statut global

**Phase actuelle :** v1.0 — Fonctionnalités de base livrées  
**Environnement :** Développement (`http://localhost:5175`)  
**Build :** ✅ Stable — 1 863 modules, aucune erreur TypeScript

---

## Ce qui est fait

### Infrastructure & configuration

- [x] Monorepo Turborepo avec `apps/web` et `packages/ui`
- [x] React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- [x] Radix UI (primitives accessibles : Dialog, Checkbox, Select, Progress, Label)
- [x] Dark mode / Light mode avec persistance localStorage
- [x] Alias `@workspace/ui` pour le partage de composants UI

### Composants UI (`packages/ui`)

- [x] `Button` — variantes default, outline, secondary, ghost, destructive, link
- [x] `Input` — champ texte stylisé
- [x] `Textarea` — zone de texte multi-lignes
- [x] `Label` — libellé accessible (Radix Label)
- [x] `Card` — conteneur avec CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- [x] `Badge` — variantes default, secondary, destructive, success, warning, info, outline
- [x] `Progress` — barre de progression (Radix Progress)
- [x] `Checkbox` — case à cocher accessible (Radix Checkbox)
- [x] `Select` — liste déroulante accessible (Radix Select)
- [x] `Dialog` — modale accessible (Radix Dialog) avec overlay, titre, description, footer

### Modèles de données (`apps/web/src/types.ts`)

- [x] `Project` — id, nom, description, statut, priorité, type, couleur, langages, frameworks, outils, tags, dates, todoLists
- [x] `TodoList` — id, titre, date de création, items
- [x] `TodoItem` — id, texte, complété, priorité, dates de création/complétion
- [x] Types : `Priority`, `ProjectStatus`, `ProjectType`, `ItemPriority`

### Persistance (`apps/web/src/hooks/useProjects.ts`)

- [x] CRUD complet des projets (créer, lire, modifier, supprimer)
- [x] CRUD des todo lists (ajouter, supprimer)
- [x] CRUD des items (ajouter, cocher/décocher, modifier, supprimer)
- [x] Persistance automatique dans `localStorage` (clé `pm_projects`)
- [x] Parseur de texte numéroté (`parseTodoText`) — première ligne = titre, reste = items
- [x] Parseur CSV (`parseCsvText`) — première ligne = titre, reste = items

### Dashboard (`apps/web/src/components/Dashboard.tsx`)

- [x] Header avec logo et bouton "Nouveau projet"
- [x] Barre de statistiques : total, actifs, terminés, tâches complétées + progression globale
- [x] Recherche texte (nom, description, tags, langages)
- [x] Filtres : statut, type de projet, priorité
- [x] Tri : récemment modifié, nom A→Z, priorité, progression
- [x] Grille de cartes projet (1-3 colonnes selon viewport)
- [x] État vide avec call-to-action
- [x] Toggle dark/light mode

### Carte projet (inline dans Dashboard)

- [x] Bande de couleur du projet
- [x] Icône de type (Web, Mobile, API, Desktop, Data, DevOps, Design, Autre)
- [x] Nom, type, statut (badge coloré)
- [x] Description tronquée (2 lignes)
- [x] Barre de progression tâches
- [x] Compteur tâches et listes
- [x] Badges langages (3 max + indicateur de surplus)
- [x] Date d'échéance avec alerte "En retard" si dépassée
- [x] Indicateur de priorité haute/critique
- [x] Menu contextuel (modifier, supprimer) avec confirmation

### Création / Édition de projet (`apps/web/src/components/CreateProjectModal.tsx`)

- [x] Sélecteur de couleur (12 couleurs prédéfinies)
- [x] Champs : nom, description, type, statut, priorité
- [x] Sélecteurs de date : début, échéance
- [x] Tag input pour : langages, frameworks, outils, tags (Entrée pour valider)
- [x] Mode "créer" et mode "modifier" (pré-remplissage des données)

### Détail projet (`apps/web/src/components/ProjectDetail.tsx`)

- [x] Header sticky avec navigation retour, statut, actions modifier/supprimer
- [x] Info card : icône, nom, priorité, description
- [x] Dates avec indicateur "En retard"
- [x] Barre de progression globale (toutes listes confondues)
- [x] Tags du projet
- [x] Section stack technologique : langages, frameworks, outils
- [x] Liste de toutes les todo lists du projet
- [x] Bouton "Ajouter une liste"
- [x] État vide avec call-to-action

### Todo lists (`apps/web/src/components/TodoListView.tsx`)

- [x] En-tête avec titre, progression (done/total), boutons exporter/supprimer
- [x] Collapse/expand de la liste
- [x] Items avec checkbox Radix (accessible), texte, badge priorité
- [x] Date de complétion au survol
- [x] Bouton suppression d'item au survol
- [x] Formulaire inline d'ajout (Entrée pour valider, sélecteur priorité)
- [x] Export en `.txt` (téléchargement direct)
- [x] Confirmation avant suppression de liste

### Import de todo list (`apps/web/src/components/AddTodoListModal.tsx`)

- [x] **Onglet "Coller du texte"** — textarea + bouton "Analyser" + aperçu parsé
- [x] **Onglet "Importer un fichier"** — zone drag-and-drop pour `.txt` et `.csv` + aperçu parsé
- [x] **Onglet "Saisie manuelle"** — titre + items dynamiques (Entrée pour en ajouter)
- [x] Section aperçu : affichage du titre détecté et de la liste des items avec compteur

---

## Ce qui reste à faire

### Priorité haute

- [ ] **Réorganisation des items** — drag-and-drop pour changer l'ordre des tâches et des listes
- [ ] **Édition inline des items** — double-clic sur le texte pour modifier sur place
- [ ] **Recherche dans les tâches** — barre de recherche dans le détail projet

### Priorité moyenne

- [ ] **Export projet complet** — exporter toutes les listes d'un projet en un seul fichier
- [ ] **Duplication de projet** — copier un projet existant avec ses métadonnées
- [ ] **Filtrage des items** — afficher uniquement les items non complétés / complétés
- [ ] **Notes par projet** — zone de texte libre pour des notes de suivi
- [ ] **Statistiques avancées** — graphique d'évolution, velocity, temps moyen de complétion

### Priorité basse / Améliorations futures

- [ ] **Notifications** — rappel d'échéance (navigateur ou in-app)
- [ ] **Import/export JSON** — sauvegarde complète et restauration des données
- [ ] **Thèmes personnalisés** — couleurs d'accent configurables
- [ ] **Raccourcis clavier** — navigation, création rapide de tâches
- [ ] **Vue Kanban** — tableau par statut en alternative à la liste
- [ ] **Collaboration locale** — synchronisation entre onglets via `storage` events

---

## Structure des fichiers

```
projects-manager/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── App.tsx                        # Routeur principal (dashboard / détail)
│       │   ├── main.tsx                       # Point d'entrée, ThemeProvider
│       │   ├── types.ts                       # Modèles de données
│       │   ├── hooks/
│       │   │   └── useProjects.ts             # CRUD localStorage + parseurs
│       │   └── components/
│       │       ├── theme-provider.tsx          # Gestion dark/light mode
│       │       ├── Dashboard.tsx              # Vue principale avec stats et grille
│       │       ├── ProjectDetail.tsx          # Vue détail d'un projet
│       │       ├── TodoListView.tsx           # Affichage d'une todo list
│       │       ├── CreateProjectModal.tsx     # Modale création/édition projet
│       │       └── AddTodoListModal.tsx       # Modale ajout de liste (3 modes)
│       └── index.html
└── packages/
    └── ui/
        └── src/
            ├── components/
            │   ├── button.tsx
            │   ├── input.tsx
            │   ├── textarea.tsx
            │   ├── label.tsx
            │   ├── card.tsx
            │   ├── badge.tsx
            │   ├── progress.tsx
            │   ├── checkbox.tsx
            │   ├── select.tsx
            │   └── dialog.tsx
            ├── lib/utils.ts
            └── styles/globals.css
```

---

## Stack technique

| Catégorie        | Technologie             | Version  |
|------------------|-------------------------|----------|
| Bundler          | Vite                    | 8.x      |
| Framework UI     | React                   | 19.x     |
| Langage          | TypeScript              | ~6.x     |
| Style            | Tailwind CSS            | 4.x      |
| Primitives UI    | Radix UI (`radix-ui`)   | 1.4.x    |
| Icônes           | Lucide React            | 1.17.x   |
| Utilitaires CSS  | clsx + tailwind-merge   | latest   |
| Variants CSS     | class-variance-authority| 0.7.x    |
| Monorepo         | Turborepo               | 2.9.x    |
| Persistance      | localStorage (natif)    | —        |
