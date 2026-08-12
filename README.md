# StreamFLIX

Interface de catalogue et de lecture vidéo construite avec React, TypeScript et Vite. Sans configuration Supabase, l'application démarre en mode démonstration et conserve le catalogue dans IndexedDB.

## Démarrage local

**Prérequis :** Node.js 20 ou une version ultérieure.

```bash
npm install
cp .env.example .env.local
npm run dev
```

L'application est alors disponible sur <http://localhost:3000>.

## Configuration

Les variables accessibles au navigateur doivent porter le préfixe `VITE_` :

- `VITE_SUPABASE_URL` : URL du projet Supabase ;
- `VITE_SUPABASE_ANON_KEY` : clé publique anonyme Supabase ;
- `VITE_WORKER_URL` : URL du Worker qui expose l'API vidéo.

Ne placez jamais une clé Supabase `service_role` dans une variable `VITE_` : ces variables sont intégrées au bundle client. Les secrets du Worker se configurent avec Wrangler.

## Vérifications

```bash
npm test
npx tsc --noEmit
npm run build
```

## Worker Cloudflare

Le proxy vidéo se trouve dans `backend/worker.ts`. Configurez les secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement Cloudflare avant son déploiement.
