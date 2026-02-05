
import { MOCK_CATEGORIES, MOCK_VIDEOS } from '../constants';
import { Category, Video } from '../types';
import { isMockMode } from './supabase';

const WORKER_URL = 'https://ton-worker.workers.dev'; 
const DB_NAME = 'StreamFlixDB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';
const STORE_CATEGORIES = 'categories';

const LOCAL_STORAGE_KEY = 'streamflix-mock-catalog';

const loadCatalogFromLocalStorage = (): { videos: Video[]; categories: Category[] } | null => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { videos?: Video[]; categories?: Category[] };
    if (!Array.isArray(parsed.videos) || !Array.isArray(parsed.categories)) return null;
    return { videos: parsed.videos, categories: parsed.categories };
  } catch {
    return null;
  }
};

const saveCatalogToLocalStorage = (videos: Video[], categories: Category[]): void => {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ videos, categories }));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
};


// --- Gestionnaire IndexedDB pour le mode Mock ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
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
};

const performTransaction = async <T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);
    
    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      transaction.oncomplete = () => resolve(undefined as T);
      transaction.onerror = () => reject(transaction.error);
    }
  });
};

const getInitialData = async () => {
  const videos = await performTransaction<Video[]>(STORE_VIDEOS, 'readonly', (s) => s.getAll());
  const categories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());

  if (videos.length > 0 || categories.length > 0) {
    saveCatalogToLocalStorage(videos, categories);
    return { videos, categories };
  }

  const localCatalog = loadCatalogFromLocalStorage();
  if (localCatalog) {
    const db = await openDB();
    const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readwrite');
    localCatalog.videos.forEach(v => tx.objectStore(STORE_VIDEOS).put(v));
    localCatalog.categories.forEach(c => tx.objectStore(STORE_CATEGORIES).put(c));
    return localCatalog;
  }

  // Premier démarrage : on peuple avec les mocks
  const db = await openDB();
  const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readwrite');
  MOCK_VIDEOS.forEach(v => tx.objectStore(STORE_VIDEOS).add(v));
  MOCK_CATEGORIES.forEach(c => tx.objectStore(STORE_CATEGORIES).add(c));
  saveCatalogToLocalStorage(MOCK_VIDEOS, MOCK_CATEGORIES);
  return { videos: MOCK_VIDEOS, categories: MOCK_CATEGORIES };
};

// --- API Implementation ---

export const api = {
  getHomeData: async (): Promise<Category[]> => {
    if (isMockMode) {
      await new Promise(r => setTimeout(r, 300));
      const { videos, categories } = await getInitialData();
      
      // On s'assure que les catégories renvoient les dernières versions des vidéos par ID
      return categories.map((cat: Category) => ({
        ...cat,
        videos: cat.videos.map((v: Video) => videos.find((rv: Video) => rv.id === v.id) || v)
      }));
    }
    const res = await fetch(`${WORKER_URL}/api/videos/home`);
    return res.json();
  },

  getVideoDetails: async (slug: string): Promise<Video | null> => {
    if (isMockMode) {
      const { videos } = await getInitialData();
      return videos.find((v: Video) => v.slug === slug) || null;
    }
    const res = await fetch(`${WORKER_URL}/api/videos/${slug}`);
    return res.json();
  },

  getPlaybackUrl: async (slug: string): Promise<string> => {
    const video = await api.getVideoDetails(slug);
    if (!video) return '';

    if (video.source_type === 'vidmoly') {
      let key = video.video_key.trim();
      if (key.startsWith('http')) return key;
      const cleanId = key.replace(/https?:\/\/vidmoly\.(net|to)\//, '').replace('embed-', '').replace('.html', '');
      return `https://vidmoly.net/embed-${cleanId}.html`;
    }
    
    if (isMockMode) {
       if (video?.source_type === 'drive') {
         return `https://drive.google.com/uc?export=download&id=${video.video_key}`;
       }
       return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }
    return `${WORKER_URL}/api/play/${slug}`;
  },

  adminGetVideos: async (): Promise<Video[]> => {
    if (isMockMode) {
      const { videos } = await getInitialData();
      return videos;
    }
    const res = await fetch(`${WORKER_URL}/api/admin/videos`);
    return res.json();
  },

  adminCreateVideo: async (video: Partial<Video>): Promise<Video> => {
    if (isMockMode) {
      const newVideo = { 
        ...video, 
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      } as Video;
      
      await performTransaction(STORE_VIDEOS, 'readwrite', (s) => s.add(newVideo));
      
      // En mode mock, on l'ajoute à la première catégorie
      const categories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
      if (categories.length > 0) {
        categories[0].videos.unshift(newVideo);
        await performTransaction(STORE_CATEGORIES, 'readwrite', (s) => s.put(categories[0]));
      }

      const latestVideos = await performTransaction<Video[]>(STORE_VIDEOS, 'readonly', (s) => s.getAll());
      const latestCategories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
      saveCatalogToLocalStorage(latestVideos, latestCategories);

      return newVideo;
    }
    const res = await fetch(`${WORKER_URL}/api/admin/videos`, {
      method: 'POST',
      body: JSON.stringify(video),
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  adminUpdateVideo: async (id: string, videoData: Partial<Video>): Promise<void> => {
    if (isMockMode) {
      const video = await performTransaction<Video>(STORE_VIDEOS, 'readonly', (s) => s.get(id));
      if (video) {
        const updated = { ...video, ...videoData };
        await performTransaction(STORE_VIDEOS, 'readwrite', (s) => s.put(updated));
        
        // Mise à jour optionnelle dans les objets catégories pour la consistance immédiate
        const categories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
        for (const cat of categories) {
          const index = cat.videos.findIndex(v => v.id === id);
          if (index !== -1) {
            cat.videos[index] = { ...cat.videos[index], ...videoData };
            await performTransaction(STORE_CATEGORIES, 'readwrite', (s) => s.put(cat));
          }
        }
        const latestVideos = await performTransaction<Video[]>(STORE_VIDEOS, 'readonly', (s) => s.getAll());
        saveCatalogToLocalStorage(latestVideos, categories);
      }
      return;
    }
    await fetch(`${WORKER_URL}/api/admin/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(videoData),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  adminDeleteVideo: async (id: string): Promise<void> => {
    if (isMockMode) {
      await performTransaction(STORE_VIDEOS, 'readwrite', (s) => s.delete(id));
      const categories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
      for (const cat of categories) {
        cat.videos = cat.videos.filter(v => v.id !== id);
        await performTransaction(STORE_CATEGORIES, 'readwrite', (s) => s.put(cat));
      }
      const latestVideos = await performTransaction<Video[]>(STORE_VIDEOS, 'readonly', (s) => s.getAll());
      const latestCategories = await performTransaction<Category[]>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
      saveCatalogToLocalStorage(latestVideos, latestCategories);
      return;
    }
    await fetch(`${WORKER_URL}/api/admin/videos/${id}`, { method: 'DELETE' });
  },

  uploadThumbnail: async (file: File): Promise<string> => {
    if (isMockMode) {
       return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onloadend = () => resolve(reader.result as string);
         reader.onerror = reject;
         reader.readAsDataURL(file);
       });
    }
    return '';
  }
};
