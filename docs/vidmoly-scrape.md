# Scraper un dossier Vidmoly

Ce script aide à extraire rapidement la liste des vidéos (titre + id embed + URL embed) depuis une page dossier Vidmoly.

## Commandes

```bash
node scripts/scrape_vidmoly.mjs --url "https://vidmoly.net/<votre-page-dossier>" --cookie "cf_clearance=...; PHPSESSID=..."
```

Ou à partir d'un HTML déjà téléchargé :

```bash
node scripts/scrape_vidmoly.mjs --file ./vidmoly-page.html
```

## Sorties

Par défaut, le script génère :

- `vidmoly-videos.json`
- `vidmoly-videos.csv`

Avec les colonnes/champs :

- `title`
- `id`
- `embed` (format `https://vidmoly.net/embed-<id>.html`)

## Optionnel

```bash
node scripts/scrape_vidmoly.mjs \
  --url "https://vidmoly.net/<...>" \
  --cookie "..." \
  --out ./exports/mes-videos.json \
  --csv ./exports/mes-videos.csv
```

## Remarques

- Certaines pages Vidmoly nécessitent une session active : d'où `--cookie`.
- Le parser est tolérant (plusieurs patterns HTML) mais le HTML Vidmoly peut évoluer.
