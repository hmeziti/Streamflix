/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du Worker (ex. https://streamflix-api.<compte>.workers.dev). Vide = même origine. */
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
