# StreamFLIX

Plateforme de streaming type Netflix : front React (Vite), catalogue Supabase, API et streaming via un Worker Cloudflare (R2, Google Drive, VidMoly).

## Démarrage rapide (mode démo)

Sans aucune variable d'environnement, l'app tourne en **mode démo** : le catalogue de `constants.ts` est stocké dans le navigateur (IndexedDB + localStorage) et l'admin fonctionne localement.

```bash
npm install
npm run dev
```

## Mode connecté (Supabase + Worker)

### 1. Base Supabase

Exécuter `backend/schema.sql` dans l'éditeur SQL Supabase (le script est rejouable pour mettre à niveau une base existante), puis, après votre inscription :

```sql
update public.profiles set is_admin = true where email = 'vous@exemple.com';
```

### 2. Worker Cloudflare

Renseigner `SUPABASE_URL` (et `ALLOWED_ORIGINS` en production) dans `backend/wrangler.toml`, puis :

```bash
cd backend
npx wrangler r2 bucket create streamflix-videos
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GOOGLE_DRIVE_API_KEY   # optionnel
npx wrangler deploy
```

En local : copier `backend/.dev.vars.example` en `backend/.dev.vars`, puis `npm run worker:dev`.

### 3. Front

Copier `.env.example` en `.env.local` et renseigner `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_API_URL` (URL du Worker).

## API du Worker

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/videos/home` | Catégories ordonnées + vidéos (cache edge 2 min) |
| GET | `/api/videos/:slug` | Détail d'une vidéo (cache edge 2 min) |
| GET | `/api/play/:slug` | Streaming R2 / Drive avec Range, redirection VidMoly |
| GET | `/api/media/thumbnails/:file` | Miniatures uploadées (cache immutable) |
| GET / POST | `/api/admin/videos` | Liste / création (admin) |
| PUT / DELETE | `/api/admin/videos/:id` | Modification / suppression (admin) |
| POST | `/api/admin/thumbnails` | Upload d'une miniature vers R2 (admin) |

Les routes admin exigent `Authorization: Bearer <access token Supabase>` d'un utilisateur dont `profiles.is_admin = true`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de dev Vite (port 3000) |
| `npm run build` | Build de production |
| `npm test` | Tests (front + Worker) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run worker:dev` / `worker:deploy` | Worker en local / déploiement |
| `npm run scrape:vidmoly` | Extraction d'un dossier VidMoly ([doc](docs/vidmoly-scrape.md)) |
