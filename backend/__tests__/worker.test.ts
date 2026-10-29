import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { Env, sanitizeVideoInput } from '../worker';

const SUPABASE_URL = 'https://db.test';
const ctx = { waitUntil: () => {} };

const videoRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Structure 1',
  description: null,
  thumbnail_url: 'https://img.test/1.jpg',
  video_key: 'abc123def',
  source_type: 'vidmoly',
  duration: 3600,
  year: 2024,
  slug: 'structure-1',
  rating: null,
  genre: ['Trading'],
  ...overrides,
});

type Route = (url: URL, init: RequestInit) => Response | Promise<Response>;

// Simule Supabase / Drive : chaque test fournit ses réponses par motif d'URL
const mockFetch = (routes: [RegExp, Route][]) => {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit = {}) => {
    calls.push({ url: input, init });
    const url = new URL(input);
    const route = routes.find(([pattern]) => pattern.test(`${init.method || 'GET'} ${url.pathname}${url.search}`));
    if (!route) throw new Error(`Unexpected fetch ${init.method || 'GET'} ${input}`);
    return route[1](url, init);
  }));
  return calls;
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const makeEnv = (overrides: Partial<Env> = {}): Env => ({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  ...overrides,
});

const call = (path: string, init: RequestInit = {}, env = makeEnv()) =>
  worker.fetch(new Request(`https://api.test${path}`, init), env, ctx);

// Auth admin : chaque test utilise un token distinct (le Worker met les sessions en cache)
const adminRoutes = (token: string, isAdmin = true): [RegExp, Route][] => [
  [/^GET \/auth\/v1\/user$/, (_url, init) =>
    new Headers(init.headers).get('Authorization') === `Bearer ${token}`
      ? jsonResponse({ id: `user-${token}` })
      : jsonResponse({ msg: 'invalid' }, 401)],
  [/^GET \/rest\/v1\/profiles/, () => jsonResponse([{ is_admin: isAdmin }])],
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker: routes publiques', () => {
  it('répond au preflight CORS', async () => {
    const res = await call('/api/videos/home', { method: 'OPTIONS', headers: { Origin: 'https://app.test' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
  });

  it('restreint CORS aux origines configurées', async () => {
    const env = makeEnv({ ALLOWED_ORIGINS: 'https://a.test, https://b.test' });
    const allowed = await call('/api/health', { headers: { Origin: 'https://b.test' } }, env);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://b.test');
    const other = await call('/api/health', { headers: { Origin: 'https://evil.test' } }, env);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBe('https://a.test');
  });

  it('renvoie l\'accueil en une requête, vidéos ordonnées et ids en string', async () => {
    const calls = mockFetch([
      [/^GET \/rest\/v1\/categories/, () => jsonResponse([
        {
          id: 3,
          title: 'Programme',
          slug: 'featured',
          video_categories: [
            { position: 0, videos: videoRow({ id: 7, slug: 'a' }) },
            { position: 1, videos: null },
            { position: 2, videos: videoRow({ id: 8, slug: 'b', genre: null, description: null }) },
          ],
        },
      ])],
    ]);

    const res = await call('/api/videos/home');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage');
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('3');
    expect(body[0].videos.map((v: { id: string }) => v.id)).toEqual(['7', '8']);
    expect(body[0].videos[1]).toMatchObject({ genre: [], description: '' });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.searchParams.get('video_categories.order')).toBe('position.asc');
    expect(new Headers(calls[0].init.headers).get('apikey')).toBe('service-key');
  });

  it('renvoie 404 pour un slug inconnu', async () => {
    mockFetch([[/^GET \/rest\/v1\/videos/, () => jsonResponse([])]]);
    const res = await call('/api/videos/inconnu');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Vidéo introuvable' });
  });

  it('masque les détails des erreurs Supabase', async () => {
    mockFetch([[/^GET \/rest\/v1\/videos/, () => new Response('relation does not exist', { status: 500 })]]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('/api/videos/x');
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('relation');
  });

  it('renvoie 404 / 405 pour les routes inconnues ou mauvaises méthodes', async () => {
    expect((await call('/nope')).status).toBe(404);
    expect((await call('/api/videos/home', { method: 'POST' })).status).toBe(405);
  });
});

describe('worker: streaming', () => {
  const r2Bucket = (size = 1000) => {
    const get = vi.fn(async (_key: string, options: { range?: Headers }) => {
      const hasRange = options.range?.has('Range');
      return {
        size,
        httpEtag: '"etag"',
        range: hasRange ? { offset: 100, length: 200 } : undefined,
        body: new Blob(['x']).stream(),
        writeHttpMetadata: (headers: Headers) => headers.set('Content-Type', 'video/mp4'),
      };
    });
    return { get, put: vi.fn() };
  };

  it('sert un fichier R2 en 206 avec Content-Range et met le lookup en cache', async () => {
    const calls = mockFetch([
      [/^GET \/rest\/v1\/videos/, () => jsonResponse([videoRow({ source_type: 'r2', video_key: 'films/a.mp4', slug: 'r2-film' })])],
    ]);
    const bucket = r2Bucket();
    const env = makeEnv({ VIDEOS: bucket });

    const res = await call('/api/play/r2-film', { headers: { Range: 'bytes=100-299' } }, env);
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 100-299/1000');
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('Content-Range');
    expect(bucket.get).toHaveBeenCalledWith('films/a.mp4', expect.anything());

    const full = await call('/api/play/r2-film', {}, env);
    expect(full.status).toBe(200);
    expect(calls).toHaveLength(1); // 2e requête servie sans repasser par Supabase
  });

  it('relaie Google Drive avec le header Range et la clé API', async () => {
    const calls = mockFetch([
      [/^GET \/rest\/v1\/videos/, () => jsonResponse([videoRow({ source_type: 'drive', video_key: 'drive-id', slug: 'drive-film' })])],
      [/^GET \/drive\/v3\/files\/drive-id/, () => new Response('bytes', {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-4/10', 'Content-Type': 'video/mp4', 'Set-Cookie': 'secret=1' },
      })],
    ]);

    const res = await call('/api/play/drive-film', { headers: { Range: 'bytes=0-4' } }, makeEnv({ GOOGLE_DRIVE_API_KEY: 'gkey' }));
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-4/10');
    expect(res.headers.get('Set-Cookie')).toBeNull();

    const driveCall = calls[1];
    expect(new URL(driveCall.url).searchParams.get('key')).toBe('gkey');
    expect(new Headers(driveCall.init.headers).get('Range')).toBe('bytes=0-4');
  });

  it('redirige les vidéos VidMoly vers l\'embed', async () => {
    mockFetch([[/^GET \/rest\/v1\/videos/, () => jsonResponse([videoRow({ slug: 'moly' })])]]);
    const res = await call('/api/play/moly');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://vidmoly.net/embed-abc123def.html');
  });
});

describe('worker: admin', () => {
  it('exige un token', async () => {
    const res = await call('/api/admin/videos');
    expect(res.status).toBe(401);
  });

  it('refuse un utilisateur non admin', async () => {
    mockFetch(adminRoutes('user-token', false));
    const res = await call('/api/admin/videos', { headers: { Authorization: 'Bearer user-token' } });
    expect(res.status).toBe(403);
  });

  it('crée une vidéo nettoyée, slugifiée et placée en tête de la 1re catégorie', async () => {
    let insertedVideo: Record<string, unknown> = {};
    let insertedLink: Record<string, unknown> = {};
    mockFetch([
      ...adminRoutes('create-token'),
      [/^POST \/rest\/v1\/videos/, (_url, init) => {
        insertedVideo = JSON.parse(init.body as string);
        return jsonResponse([videoRow({ ...insertedVideo, id: 42 })], 201);
      }],
      [/^GET \/rest\/v1\/categories/, () => jsonResponse([{ id: 5 }])],
      [/^GET \/rest\/v1\/video_categories/, () => jsonResponse([{ position: -3 }])],
      [/^POST \/rest\/v1\/video_categories/, (_url, init) => {
        insertedLink = JSON.parse(init.body as string);
        return new Response(null, { status: 201 });
      }],
    ]);

    const res = await call('/api/admin/videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer create-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '  8 SUPPLY & DEMAND 2 ',
        video_key: 'dlycxv6mk5ko',
        source_type: 'drive',
        year: '2024',
        duration: 'abc',
        is_admin: true,
        thumbnail_url: '',
      }),
    });

    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe('42');
    expect(insertedVideo).toMatchObject({
      title: '8 SUPPLY & DEMAND 2',
      slug: '8-supply-demand-2',
      year: 2024,
      source_type: 'drive',
      thumbnail_url: 'https://drive.google.com/thumbnail?id=dlycxv6mk5ko&sz=w1280',
    });
    expect(insertedVideo).not.toHaveProperty('is_admin');
    expect(insertedVideo).not.toHaveProperty('duration');
    expect(insertedLink).toEqual({ video_id: 42, category_id: 5, position: -4 });
  });

  it('rejette un source_type invalide', async () => {
    mockFetch(adminRoutes('bad-source-token'));
    const res = await call('/api/admin/videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad-source-token' },
      body: JSON.stringify({ title: 'x', video_key: 'y', source_type: 'ftp' }),
    });
    expect(res.status).toBe(400);
  });

  it('remonte un conflit de slug en 409', async () => {
    mockFetch([
      ...adminRoutes('conflict-token'),
      [/^POST \/rest\/v1\/videos/, () => new Response('duplicate key', { status: 409 })],
    ]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('/api/admin/videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer conflict-token' },
      body: JSON.stringify({ title: 'Doublon', video_key: 'y', thumbnail_url: 'https://img.test/x.jpg' }),
    });
    expect(res.status).toBe(409);
  });

  it('supprime une vidéo et renvoie 404 si elle n\'existe pas', async () => {
    mockFetch([
      ...adminRoutes('delete-token'),
      [/^DELETE \/rest\/v1\/videos\?id=eq\.1&/, () => jsonResponse([{ slug: 'structure-1' }])],
      [/^DELETE \/rest\/v1\/videos\?id=eq\.2&/, () => jsonResponse([])],
    ]);
    const headers = { Authorization: 'Bearer delete-token' };
    expect((await call('/api/admin/videos/1', { method: 'DELETE', headers })).status).toBe(204);
    expect((await call('/api/admin/videos/2', { method: 'DELETE', headers })).status).toBe(404);
  });

  it('stocke une miniature dans R2 et renvoie son URL publique', async () => {
    mockFetch(adminRoutes('upload-token'));
    const bucket = { get: vi.fn(), put: vi.fn(async () => ({})) };
    const res = await call('/api/admin/thumbnails', {
      method: 'POST',
      headers: { Authorization: 'Bearer upload-token', 'Content-Type': 'image/png' },
      body: new Uint8Array([1, 2, 3]),
    }, makeEnv({ VIDEOS: bucket }));

    expect(res.status).toBe(201);
    const { url } = await res.json();
    expect(url).toMatch(/^https:\/\/api\.test\/api\/media\/thumbnails\/[\w-]+\.png$/);
    expect(bucket.put).toHaveBeenCalledWith(
      expect.stringMatching(/^thumbnails\/[\w-]+\.png$/),
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: 'image/png' } }
    );
  });
});

describe('sanitizeVideoInput', () => {
  it('ne garde que les champs éditables', () => {
    expect(sanitizeVideoInput({ title: ' A ', genre: ['x', 1, ' '], id: 9, slug: 'Été Fort' })).toEqual({
      title: 'A',
      genre: ['x'],
      slug: 'ete-fort',
    });
  });
});
