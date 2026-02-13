# Streamflix

Streamflix est une application web de streaming fictive utilisée comme vitrine pour afficher des vidéos, des catégories et une page de lecture dédiée. Le projet sert de base de travail pour un catalogue vidéo local (mock) et des pages de navigation, avec un rendu responsive typé en TypeScript.

## Fonctionnalités principales

- **Page d’accueil** avec sections de contenus et mise en avant d’une vidéo.
- **Page de lecture (Watch)** pour afficher la vidéo sélectionnée.
- **Catalogue mock** configurable dans `constants.ts` (vidéos + catégories).
- **Interface d’administration** pour gérer les vidéos en local.

## Structure du projet (aperçu)

- `pages/` : pages principales (accueil, watch, admin).
- `components/` : composants réutilisables (rows, cards, etc.).
- `services/` : logique d’accès aux données locales et helpers.
- `constants.ts` : données mock (vidéos et catégories).

## Lancer le projet en local

### Prérequis

- Node.js

### Installation et démarrage

```bash
npm install
npm run dev
```

L’application est ensuite accessible sur `http://localhost:5173`.

## Configuration optionnelle

Si vous utilisez des services externes (ex. Gemini), ajoutez une variable dans `.env.local` :

```
GEMINI_API_KEY=...
```

## Notes

Le projet est conçu pour fonctionner même sans backend externe grâce aux données mock et au stockage local.
