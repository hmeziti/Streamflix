/**
 * CLOUDFLARE WORKER - API + PROXY STREAMING STREAMFLIX
 *
 * Public (réponses JSON mises en cache à l'edge) :
 *   GET    /api/health
 *   GET    /api/videos/home              catégories ordonnées + leurs vidéos (1 seule requête Supabase)
 *   GET    /api/videos/:slug             détail d'une vidéo
 *   GET    /api/play/:slug               streaming R2 / Google Drive (Range => seeking), redirection VidMoly
 *   GET    /api/media/thumbnails/:file   miniatures uploadées (R2, cache immutable)
 *
 * Admin (Authorization: Bearer <access token Supabase> + profiles.is_admin) :
 *   GET    /api/admin/videos
 *   POST   /api/admin/videos
 *   PUT    /api/admin/videos/:id
 *   DELETE /api/admin/videos/:id
 *   POST   /api/admin/thumbnails         corps brut = image
 *
 * Supabase est interrogé directement via PostgREST (fetch) : pas de SDK à charger,
 * bundle de quelques Ko et cold start minimal.
 */

import type { Category, Video } from '../types';
import { getVidmolyEmbedUrl, resolveThumbnailUrl } from '../utils/media';
import { slugify } from '../utils/slug';

// --- Types Cloudflare (sous-ensemble utilisé, évite une dépendance à @cloudflare/workers-types) ---

interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

interface R2Object {
  size: number;
  httpEtag: string;
  range?: R2Range;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface R2Bucket {
  get(key: string, options?: { range?: Headers; onlyIf?: Headers }): Promise<R2Object | R2ObjectBody | null>;
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Origines autorisées séparées par des virgules ("*" par défaut). */
  ALLOWED_ORIGINS?: string;
  GOOGLE_DRIVE_API_KEY?: string;
  VIDEOS?: R2Bucket;
}

type SourceType = Video['source_type'];

interface VideoRow {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_key: string;
  source_type: SourceType;
  duration: number | null;
  year: number | null;
  slug: string;
  rating: string | null;
  genre: string[] | null;
}

interface CategoryRow {
  id: number;
  title: string;
  slug: string;
  video_categories: { position: number; videos: VideoRow | null }[];
}

// --- Constantes ---

const VIDEO_COLUMNS = 'id,title,description,thumbnail_url,video_key,source_type,duration,year,slug,rating,genre';
const SOURCE_TYPES: readonly SourceType[] = ['r2', 'drive', 'vidmoly'];
const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=120';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PLAYBACK_LOOKUP_TTL_MS = 5 * 60_000;
const ADMIN_SESSION_TTL_MS = 60_000;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const THUMBNAIL_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

// --- Caches mémoire (par isolate, survivent entre requêtes) ---

// Un lecteur vidéo émet des dizaines de requêtes Range pendant le seeking :
// on évite un aller-retour Supabase à chacune.
const playbackLookupCache = new Map<string, { source: Pick<VideoRow, 'source_type' | 'video_key'>; expires: number }>();
const adminSessionCache = new Map<string, number>();

// --- Helpers HTTP ---

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });

const getCorsHeaders = (request: Request, env: Env): Record<string, string> => {
  const configured = (env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = configured.length > 0 ? configured : ['*'];
  const requestOrigin = request.headers.get('Origin') || '';
  const allowOrigin = allowedOrigins.includes('*')
    ? '*'
    : allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, ETag',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const withHeaders = (response: Response, headers: Record<string, string>) => {
  const res = new Response(response.body, response);
  Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value));
  return res;
};

const getEdgeCache = (): Cache | undefined =>
  typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;

// Les entrées de cache sont stockées sans en-têtes CORS (ajoutés à la sortie selon l'origine).
const cacheKey = (request: Request, path: string) => new Request(new URL(path, request.url).toString());

const withEdgeCache = async (request: Request, ctx: ExecutionContext, produce: () => Promise<Response>) => {
  const cache = getEdgeCache();
  const key = cacheKey(request, new URL(request.url).pathname);
  const hit = await cache?.match(key);
  if (hit) return hit;

  const response = await produce();
  if (cache && response.status === 200) ctx.waitUntil(cache.put(key, response.clone()));
  return response;
};

const purgeVideoCaches = async (request: Request, slugs: (string | undefined)[]) => {
  const cache = getEdgeCache();
  const uniqueSlugs = [...new Set(slugs.filter((slug): slug is string => Boolean(slug)))];
  uniqueSlugs.forEach((slug) => playbackLookupCache.delete(slug));
  if (!cache) return;
  const paths = ['/api/videos/home', ...uniqueSlugs.map((slug) => `/api/videos/${encodeURIComponent(slug)}`)];
  await Promise.all(paths.map((path) => cache.delete(cacheKey(request, path))));
};

// --- Supabase (PostgREST) ---

const supabaseFetch = async <T>(env: Env, path: string, init: RequestInit = {}): Promise<T> => {
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase ${response.status} on ${path}: ${detail}`);
    if (response.status === 409) throw new HttpError(409, 'Ce slug est déjà utilisé');
    // 400 = contrainte SQL violée par le payload ; le reste (auth, schéma, panne) est un problème serveur
    if (response.status === 400) throw new HttpError(400, 'Données refusées par la base');
    throw new HttpError(502, 'Base de données indisponible');
  }

  // `Prefer: return=minimal` => 201/204 sans corps
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

const toVideo = (row: VideoRow): Video => ({
  id: String(row.id),
  title: row.title,
  description: row.description || '',
  thumbnail_url: row.thumbnail_url || '',
  video_key: row.video_key,
  source_type: row.source_type,
  duration: row.duration || 0,
  year: row.year || 0,
  slug: row.slug,
  rating: row.rating || undefined,
  genre: row.genre || [],
});

const findVideoBySlug = async (env: Env, slug: string): Promise<VideoRow | null> => {
  const rows = await supabaseFetch<VideoRow[]>(
    env,
    `videos?select=${VIDEO_COLUMNS}&slug=eq.${encodeURIComponent(slug)}&limit=1`
  );
  return rows[0] || null;
};

const findVideoById = async (env: Env, id: string): Promise<VideoRow> => {
  const rows = await supabaseFetch<VideoRow[]>(env, `videos?select=${VIDEO_COLUMNS}&id=eq.${id}&limit=1`);
  if (!rows[0]) throw new HttpError(404, 'Vidéo introuvable');
  return rows[0];
};

// --- Auth admin ---

const requireAdmin = async (request: Request, env: Env) => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Authentification requise');

  const cachedUntil = adminSessionCache.get(token);
  if (cachedUntil && cachedUntil > Date.now()) return;

  const userResponse = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) throw new HttpError(401, 'Session invalide ou expirée');
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) throw new HttpError(401, 'Session invalide ou expirée');

  const profiles = await supabaseFetch<{ is_admin: boolean }[]>(
    env,
    `profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  if (!profiles[0]?.is_admin) throw new HttpError(403, 'Accès administrateur requis');

  if (adminSessionCache.size > 1000) adminSessionCache.clear();
  adminSessionCache.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
};

// --- Validation des payloads admin ---

type VideoInput = Partial<Omit<VideoRow, 'id'>>;

const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // traité ci-dessous
  }
  throw new HttpError(400, 'Corps JSON invalide');
};

const toOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export const sanitizeVideoInput = (input: Record<string, unknown>): VideoInput => {
  const output: VideoInput = {};

  for (const field of ['title', 'description', 'thumbnail_url', 'video_key', 'rating'] as const) {
    if (typeof input[field] === 'string') output[field] = (input[field] as string).trim();
  }

  if (input.source_type !== undefined) {
    if (!SOURCE_TYPES.includes(input.source_type as SourceType)) throw new HttpError(400, 'source_type invalide');
    output.source_type = input.source_type as SourceType;
  }

  const duration = toOptionalInt(input.duration);
  if (duration !== undefined) output.duration = duration;
  const year = toOptionalInt(input.year);
  if (year !== undefined) output.year = year;

  if (Array.isArray(input.genre)) {
    output.genre = input.genre.filter((g): g is string => typeof g === 'string').map((g) => g.trim()).filter(Boolean);
  }

  if (typeof input.slug === 'string' && input.slug.trim()) output.slug = slugify(input.slug);

  return output;
};

const assertCompleteVideo = (video: VideoInput) => {
  if (!video.title) throw new HttpError(400, 'Le titre est obligatoire');
  if (!video.video_key) throw new HttpError(400, 'La clé / ID vidéo est obligatoire');
  if (!video.slug) throw new HttpError(400, 'Slug invalide');
};

// --- Handlers ---

interface RouteContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  params: string[];
}

const getHome = ({ request, env, ctx }: RouteContext) =>
  withEdgeCache(request, ctx, async () => {
    // Une seule requête : catégories -> table de liaison (ordonnée) -> vidéos
    const rows = await supabaseFetch<CategoryRow[]>(
      env,
      `categories?select=id,title,slug,video_categories(position,videos(${VIDEO_COLUMNS}))` +
        '&order=position.asc,id.asc&video_categories.order=position.asc'
    );

    const categories: Category[] = rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      slug: row.slug,
      videos: row.video_categories
        .map((link) => link.videos)
        .filter((video): video is VideoRow => video !== null)
        .map(toVideo),
    }));

    return json(categories, 200, { 'Cache-Control': PUBLIC_CACHE_CONTROL });
  });

const getVideo = ({ request, env, ctx, params }: RouteContext) =>
  withEdgeCache(request, ctx, async () => {
    const video = await findVideoBySlug(env, params[0]);
    if (!video) throw new HttpError(404, 'Vidéo introuvable');
    return json(toVideo(video), 200, { 'Cache-Control': PUBLIC_CACHE_CONTROL });
  });

const formatContentRange = (range: R2Range, size: number) => {
  const start = range.suffix !== undefined ? size - range.suffix : range.offset ?? 0;
  const end = range.length !== undefined && range.suffix === undefined ? start + range.length - 1 : size - 1;
  return `bytes ${start}-${end}/${size}`;
};

const streamFromR2 = async (request: Request, bucket: R2Bucket, key: string, cacheControl?: string) => {
  const object = await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) throw new HttpError(404, 'Fichier introuvable');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  if (!('body' in object)) {
    // Précondition (If-None-Match, If-Match...) non satisfaite : R2 ne renvoie pas de corps
    const isConditionalGet = request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since');
    return new Response(null, { status: isConditionalGet ? 304 : 412, headers });
  }

  const isPartial = request.headers.has('Range') && object.range !== undefined;
  if (isPartial) headers.set('Content-Range', formatContentRange(object.range!, object.size));
  return new Response(object.body, { status: isPartial ? 206 : 200, headers });
};

const DRIVE_FORWARDED_HEADERS = ['Range', 'If-None-Match', 'If-Modified-Since'];
const DRIVE_EXPOSED_HEADERS = ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag', 'Last-Modified'];

const streamFromDrive = async (request: Request, env: Env, fileId: string) => {
  const driveUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  driveUrl.searchParams.set('alt', 'media');
  driveUrl.searchParams.set('supportsAllDrives', 'true');
  if (env.GOOGLE_DRIVE_API_KEY) driveUrl.searchParams.set('key', env.GOOGLE_DRIVE_API_KEY);

  const upstreamHeaders = new Headers();
  for (const name of DRIVE_FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }

  const upstream = await fetch(driveUrl.toString(), { headers: upstreamHeaders });

  // On ne relaie que les en-têtes utiles au lecteur (pas de cookies / en-têtes Google internes)
  const headers = new Headers({ 'Accept-Ranges': 'bytes' });
  for (const name of DRIVE_EXPOSED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
};

const play = async ({ request, env, params }: RouteContext) => {
  const slug = params[0];
  const cached = playbackLookupCache.get(slug);
  let source = cached && cached.expires > Date.now() ? cached.source : null;

  if (!source) {
    const video = await findVideoBySlug(env, slug);
    if (!video) throw new HttpError(404, 'Vidéo introuvable');
    source = { source_type: video.source_type, video_key: video.video_key };
    playbackLookupCache.set(slug, { source, expires: Date.now() + PLAYBACK_LOOKUP_TTL_MS });
  }

  switch (source.source_type) {
    case 'r2':
      if (!env.VIDEOS) throw new HttpError(501, 'Bucket R2 non configuré (binding VIDEOS)');
      return streamFromR2(request, env.VIDEOS, source.video_key);
    case 'drive':
      return streamFromDrive(request, env, source.video_key);
    case 'vidmoly':
      return Response.redirect(getVidmolyEmbedUrl(source.video_key), 302);
    default:
      throw new HttpError(400, 'Type de source non supporté');
  }
};

const getThumbnail = ({ request, env, ctx, params }: RouteContext) => {
  const bucket = env.VIDEOS;
  if (!bucket) throw new HttpError(501, 'Bucket R2 non configuré (binding VIDEOS)');
  return withEdgeCache(request, ctx, () => streamFromR2(request, bucket, `thumbnails/${params[0]}`, IMMUTABLE_CACHE_CONTROL));
};

const adminListVideos = async ({ request, env }: RouteContext) => {
  await requireAdmin(request, env);
  const rows = await supabaseFetch<VideoRow[]>(env, `videos?select=${VIDEO_COLUMNS}&order=created_at.desc`);
  return json(rows.map(toVideo), 200, { 'Cache-Control': 'no-store' });
};

const attachToFirstCategory = async (env: Env, videoId: number) => {
  const [firstCategory] = await supabaseFetch<{ id: number }[]>(
    env,
    'categories?select=id&order=position.asc,id.asc&limit=1'
  );
  if (!firstCategory) return;

  // Comme en mode démo : la nouvelle vidéo arrive en tête de la première catégorie
  const [top] = await supabaseFetch<{ position: number }[]>(
    env,
    `video_categories?select=position&category_id=eq.${firstCategory.id}&order=position.asc&limit=1`
  );
  await supabaseFetch(env, 'video_categories', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ video_id: videoId, category_id: firstCategory.id, position: (top?.position ?? 1) - 1 }),
  });
};

const adminCreateVideo = async ({ request, env }: RouteContext) => {
  await requireAdmin(request, env);
  const input = sanitizeVideoInput(await readJsonBody(request));
  const video: VideoInput = {
    source_type: 'vidmoly',
    ...input,
    slug: input.slug || slugify(input.title || ''),
  };
  assertCompleteVideo(video);
  video.thumbnail_url = await resolveThumbnailUrl(video);

  const [created] = await supabaseFetch<VideoRow[]>(env, `videos?select=${VIDEO_COLUMNS}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(video),
  });
  await attachToFirstCategory(env, created.id);
  await purgeVideoCaches(request, [created.slug]);
  return json(toVideo(created), 201);
};

const adminUpdateVideo = async ({ request, env, params }: RouteContext) => {
  await requireAdmin(request, env);
  const [id] = params;
  const input = sanitizeVideoInput(await readJsonBody(request));
  const existing = await findVideoById(env, id);

  const merged: VideoInput = { ...existing, ...input };
  assertCompleteVideo(merged);
  // Miniature vidée : on la régénère depuis la source
  if (!merged.thumbnail_url) input.thumbnail_url = await resolveThumbnailUrl(merged);
  if (Object.keys(input).length === 0) return json(toVideo(existing));

  const [updated] = await supabaseFetch<VideoRow[]>(env, `videos?id=eq.${id}&select=${VIDEO_COLUMNS}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(input),
  });
  await purgeVideoCaches(request, [existing.slug, updated.slug]);
  return json(toVideo(updated));
};

const adminDeleteVideo = async ({ request, env, params }: RouteContext) => {
  await requireAdmin(request, env);
  const deleted = await supabaseFetch<{ slug: string }[]>(env, `videos?id=eq.${params[0]}&select=slug`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
  if (deleted.length === 0) throw new HttpError(404, 'Vidéo introuvable');
  await purgeVideoCaches(request, deleted.map((row) => row.slug));
  return new Response(null, { status: 204 });
};

const adminUploadThumbnail = async ({ request, env }: RouteContext) => {
  await requireAdmin(request, env);
  if (!env.VIDEOS) throw new HttpError(501, 'Bucket R2 non configuré (binding VIDEOS)');

  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const extension = THUMBNAIL_EXTENSIONS[contentType];
  if (!extension) throw new HttpError(415, 'Format d\'image non supporté (jpg, png, webp, avif, gif)');
  if (Number(request.headers.get('Content-Length') || 0) > MAX_THUMBNAIL_BYTES) {
    throw new HttpError(413, 'Image trop lourde (5 Mo max)');
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) throw new HttpError(400, 'Image vide');
  if (body.byteLength > MAX_THUMBNAIL_BYTES) throw new HttpError(413, 'Image trop lourde (5 Mo max)');

  const fileName = `${crypto.randomUUID()}.${extension}`;
  await env.VIDEOS.put(`thumbnails/${fileName}`, body, { httpMetadata: { contentType } });
  return json({ url: new URL(`/api/media/thumbnails/${fileName}`, request.url).toString() }, 201);
};

// --- Routeur ---

type Handler = (context: RouteContext) => Promise<Response>;

const routes: [method: string, pattern: RegExp, handler: Handler][] = [
  ['GET', /^\/api\/health$/, async () => json({ status: 'ok' }, 200, { 'Cache-Control': 'no-store' })],
  ['GET', /^\/api\/videos\/home$/, getHome],
  ['GET', /^\/api\/videos\/([^/]+)$/, getVideo],
  ['GET', /^\/api\/play\/([^/]+)$/, play],
  ['GET', /^\/api\/media\/thumbnails\/([\w-]+\.[a-z]+)$/, getThumbnail],
  ['GET', /^\/api\/admin\/videos$/, adminListVideos],
  ['POST', /^\/api\/admin\/videos$/, adminCreateVideo],
  ['PUT', /^\/api\/admin\/videos\/(\d+)$/, adminUpdateVideo],
  ['DELETE', /^\/api\/admin\/videos\/(\d+)$/, adminDeleteVideo],
  ['POST', /^\/api\/admin\/thumbnails$/, adminUploadThumbnail],
];

const decodeParam = (param: string) => {
  try {
    return decodeURIComponent(param);
  } catch {
    throw new HttpError(400, 'URL invalide');
  }
};

const route = (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
  const { pathname } = new URL(request.url);
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  let pathMatched = false;

  for (const [routeMethod, pattern, handler] of routes) {
    const match = pathname.match(pattern);
    if (!match) continue;
    pathMatched = true;
    if (routeMethod !== method) continue;
    const params = match.slice(1).map(decodeParam);
    return handler({ request, env, ctx, params });
  }

  throw pathMatched ? new HttpError(405, 'Méthode non autorisée') : new HttpError(404, 'Route inconnue');
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
      return withHeaders(await route(request, env, ctx), corsHeaders);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, corsHeaders);
      console.error(error);
      return json({ error: 'Erreur interne' }, 500, corsHeaders);
    }
  },
};
