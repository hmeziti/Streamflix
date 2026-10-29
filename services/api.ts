import { MOCK_CATEGORIES, MOCK_VIDEOS } from '../constants';
import { Category, Video } from '../types';
import { getVidmolyEmbedUrl, resolveThumbnailUrl } from '../utils/media';
import { isMockMode, supabase } from './supabase';

// Vide = même origine (Worker branché sur une route du domaine du front)
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const MOCK_SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const HOME_DATA_TTL_MS = 5 * 60_000;

// --- Client HTTP (mode connecté) ---

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const request = async <T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> => {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const message = await response.json().then((body) => body?.error).catch(() => '');
    throw new ApiError(response.status, message || `Erreur HTTP ${response.status}`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
};

// --- Mode démo : catalogue local (IndexedDB + miroir localStorage) ---

interface Catalog {
  videos: Video[];
  categories: Category[];
}

const DB_NAME = 'StreamFlixDB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';
const STORE_CATEGORIES = 'categories';
const LOCAL_STORAGE_KEY = 'streamflix-mock-catalog';
// Vidéos par défaut supprimées depuis l'admin : sans ça, la fusion avec MOCK_VIDEOS les recrée au rechargement
const DELETED_IDS_KEY = 'streamflix-mock-deleted-ids';

const readLocalStorage = <T>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
};

const loadCatalogFromLocalStorage = (): Catalog | null => {
  const parsed = readLocalStorage<Partial<Catalog>>(LOCAL_STORAGE_KEY);
  if (!parsed || !Array.isArray(parsed.videos) || !Array.isArray(parsed.categories)) return null;
  return { videos: parsed.videos, categories: parsed.categories };
};

const MOCK_CATEGORY_ORDER = new Map(MOCK_CATEGORIES.map((category, index) => [category.id, index]));

// Ajoute au catalogue stocké les vidéos / catégories ajoutées depuis dans constants.ts
const mergeMockCatalog = (current: Catalog, deletedIds: Set<string>): { catalog: Catalog; changed: boolean } => {
  const videoMap = new Map(current.videos.map((video) => [video.id, video]));
  let changed = false;

  for (const mockVideo of MOCK_VIDEOS) {
    if (!videoMap.has(mockVideo.id) && !deletedIds.has(mockVideo.id)) {
      videoMap.set(mockVideo.id, mockVideo);
      changed = true;
    }
  }

  const categoryMap = new Map(current.categories.map((category) => [category.id, category]));

  for (const mockCategory of MOCK_CATEGORIES) {
    const existingCategory = categoryMap.get(mockCategory.id);
    const existingVideoIds = new Set(existingCategory?.videos.map((video) => video.id));
    const missingVideos = mockCategory.videos
      .filter((video) => !existingVideoIds.has(video.id) && !deletedIds.has(video.id))
      .map((video) => videoMap.get(video.id) || video);

    if (!existingCategory) {
      categoryMap.set(mockCategory.id, { ...mockCategory, videos: missingVideos });
      changed = true;
    } else if (missingVideos.length > 0) {
      categoryMap.set(mockCategory.id, { ...existingCategory, videos: [...existingCategory.videos, ...missingVideos] });
      changed = true;
    }
  }

  // IndexedDB renvoie les catégories triées par id : on rétablit l'ordre défini dans constants.ts
  const categories = Array.from(categoryMap.values()).sort(
    (a, b) =>
      (MOCK_CATEGORY_ORDER.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (MOCK_CATEGORY_ORDER.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  return { catalog: { videos: Array.from(videoMap.values()), categories }, changed };
};

// Une seule connexion IndexedDB pour toute la session
let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
          db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
};

const readStores = async (): Promise<Catalog> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readonly');
    const videosRequest = tx.objectStore(STORE_VIDEOS).getAll();
    const categoriesRequest = tx.objectStore(STORE_CATEGORIES).getAll();
    tx.oncomplete = () => resolve({ videos: videosRequest.result, categories: categoriesRequest.result });
    tx.onerror = () => reject(tx.error);
  });
};

// Réécrit tout le catalogue en une transaction atomique
const writeStores = async ({ videos, categories }: Catalog): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readwrite');
    const videoStore = tx.objectStore(STORE_VIDEOS);
    const categoryStore = tx.objectStore(STORE_CATEGORIES);
    videoStore.clear();
    categoryStore.clear();
    videos.forEach((video) => videoStore.put(video));
    categories.forEach((category) => categoryStore.put(category));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const persistCatalog = async (catalog: Catalog): Promise<void> => {
  writeLocalStorage(LOCAL_STORAGE_KEY, catalog);
  await writeStores(catalog).catch((error) => console.warn('IndexedDB indisponible, catalogue conservé en localStorage', error));
};

// Chargé une fois par session puis gardé en mémoire ; les mutations le mettent à jour et le persistent
let catalogPromise: Promise<Catalog> | null = null;

const loadCatalog = (): Promise<Catalog> => {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const stored = await readStores().catch((): Catalog => ({ videos: [], categories: [] }));
      const hasStoredData = stored.videos.length > 0 || stored.categories.length > 0;
      const base = hasStoredData ? stored : loadCatalogFromLocalStorage() || { videos: [], categories: [] };
      const deletedIds = new Set(readLocalStorage<string[]>(DELETED_IDS_KEY) || []);
      const { catalog, changed } = mergeMockCatalog(base, deletedIds);
      if (changed || !hasStoredData) await persistCatalog(catalog);
      return catalog;
    })();
  }
  return catalogPromise;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const mockApi = {
  getHomeData: async (): Promise<Category[]> => {
    const { videos, categories } = await loadCatalog();
    const videosById = new Map(videos.map((video) => [video.id, video]));
    // Les catégories embarquent des copies : on renvoie toujours la dernière version de chaque vidéo
    return categories.map((category) => ({
      ...category,
      videos: category.videos.map((video) => videosById.get(video.id) || video),
    }));
  },

  getVideoBySlug: async (slug: string): Promise<Video | null> => {
    const { videos } = await loadCatalog();
    return videos.find((video) => video.slug === slug) || null;
  },

  listVideos: async (): Promise<Video[]> => [...(await loadCatalog()).videos],

  createVideo: async (video: Partial<Video>): Promise<Video> => {
    const thumbnail_url = await resolveThumbnailUrl(video);
    const catalog = await loadCatalog();
    const newVideo = {
      ...video,
      thumbnail_url,
      id: Math.random().toString(36).slice(2, 11),
      created_at: new Date().toISOString(),
    } as Video;

    catalog.videos = [...catalog.videos, newVideo];
    // En mode démo, la vidéo est ajoutée en tête de la première catégorie
    const [firstCategory, ...otherCategories] = catalog.categories;
    if (firstCategory) {
      catalog.categories = [{ ...firstCategory, videos: [newVideo, ...firstCategory.videos] }, ...otherCategories];
    }
    await persistCatalog(catalog);
    return newVideo;
  },

  updateVideo: async (id: string, videoData: Partial<Video>): Promise<Video | null> => {
    const catalog = await loadCatalog();
    const current = catalog.videos.find((video) => video.id === id);
    if (!current) return null;

    const merged = { ...current, ...videoData };
    const updated = { ...merged, thumbnail_url: await resolveThumbnailUrl(merged) };
    const replace = (video: Video) => (video.id === id ? updated : video);
    catalog.videos = catalog.videos.map(replace);
    catalog.categories = catalog.categories.map((category) => ({ ...category, videos: category.videos.map(replace) }));
    await persistCatalog(catalog);
    return updated;
  },

  deleteVideo: async (id: string): Promise<void> => {
    const catalog = await loadCatalog();
    catalog.videos = catalog.videos.filter((video) => video.id !== id);
    catalog.categories = catalog.categories.map((category) => ({
      ...category,
      videos: category.videos.filter((video) => video.id !== id),
    }));

    if (MOCK_VIDEOS.some((video) => video.id === id)) {
      const deletedIds = new Set(readLocalStorage<string[]>(DELETED_IDS_KEY) || []);
      deletedIds.add(id);
      writeLocalStorage(DELETED_IDS_KEY, Array.from(deletedIds));
    }
    await persistCatalog(catalog);
  },
};

// --- API Implementation ---

// Accueil mis en cache en mémoire : changer de section / chercher ne refait pas d'appel réseau
let homeData: { promise: Promise<Category[]>; expires: number } | null = null;

const invalidateHomeData = () => {
  homeData = null;
};

export const api = {
  getHomeData: (): Promise<Category[]> => {
    if (!homeData || homeData.expires < Date.now()) {
      const promise = isMockMode ? mockApi.getHomeData() : request<Category[]>('/api/videos/home');
      const entry = { promise, expires: Date.now() + HOME_DATA_TTL_MS };
      homeData = entry;
      promise.catch(() => {
        if (homeData === entry) invalidateHomeData();
      });
    }
    return homeData.promise;
  },

  getVideoDetails: async (slug: string): Promise<Video | null> => {
    if (isMockMode) return mockApi.getVideoBySlug(slug);

    // Arrivée depuis l'accueil : la vidéo est déjà en mémoire, pas d'aller-retour réseau
    if (homeData) {
      const categories = await homeData.promise.catch((): Category[] => []);
      for (const category of categories) {
        const video = category.videos.find((candidate) => candidate.slug === slug);
        if (video) return video;
      }
    }

    try {
      return await request<Video>(`/api/videos/${encodeURIComponent(slug)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  getPlaybackUrl: (video: Video): string => {
    if (video.source_type === 'vidmoly') {
      return getVidmolyEmbedUrl(video.video_key);
    }

    if (isMockMode) {
      if (video.source_type === 'drive') {
        return `https://drive.google.com/uc?export=download&id=${video.video_key}`;
      }
      return MOCK_SAMPLE_VIDEO;
    }
    return `${API_URL}/api/play/${encodeURIComponent(video.slug)}`;
  },

  adminGetVideos: (): Promise<Video[]> =>
    isMockMode ? mockApi.listVideos() : request<Video[]>('/api/admin/videos', {}, true),

  // En mode connecté, le Worker résout lui-même la miniature manquante (aucun blocage CORS côté serveur)
  adminCreateVideo: async (video: Partial<Video>): Promise<Video> => {
    const created = isMockMode
      ? await mockApi.createVideo(video)
      : await request<Video>('/api/admin/videos', { method: 'POST', body: JSON.stringify(video) }, true);
    invalidateHomeData();
    return created;
  },

  adminUpdateVideo: async (id: string, videoData: Partial<Video>): Promise<Video | null> => {
    const updated = isMockMode
      ? await mockApi.updateVideo(id, videoData)
      : await request<Video>(
          `/api/admin/videos/${encodeURIComponent(id)}`,
          { method: 'PUT', body: JSON.stringify(videoData) },
          true
        );
    invalidateHomeData();
    return updated;
  },

  adminDeleteVideo: async (id: string): Promise<void> => {
    if (isMockMode) {
      await mockApi.deleteVideo(id);
    } else {
      await request<void>(`/api/admin/videos/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
    }
    invalidateHomeData();
  },

  uploadThumbnail: async (file: File): Promise<string> => {
    if (isMockMode) return readFileAsDataUrl(file);
    const { url } = await request<{ url: string }>(
      '/api/admin/thumbnails',
      { method: 'POST', body: file, headers: { 'Content-Type': file.type } },
      true
    );
    return url;
  },
};
