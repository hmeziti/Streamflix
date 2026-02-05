
import { MOCK_CATEGORIES, MOCK_VIDEOS } from '../constants';
import { Category, Video } from '../types';
import { isMockMode } from './supabase';

const WORKER_URL = 'https://ton-worker.workers.dev'; 
const DB_NAME = 'StreamFlixDB';
const DB_VERSION = 1;
const STORE_VIDEOS = 'videos';
const STORE_CATEGORIES = 'categories';

const requestJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
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
  
  if (videos.length === 0 && categories.length === 0) {
    // Premier démarrage : on peuple avec les mocks
    const db = await openDB();
    const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readwrite');
    MOCK_VIDEOS.forEach(v => tx.objectStore(STORE_VIDEOS).add(v));
    MOCK_CATEGORIES.forEach(c => tx.objectStore(STORE_CATEGORIES).add(c));
    return { videos: MOCK_VIDEOS, categories: MOCK_CATEGORIES };
  }
  
  return { videos, categories };
};

// --- API Implementation ---

export const api = {
  getHomeData: async (): Promise<Category[]> => {
    if (isMockMode) {
      await new Promise(r => setTimeout(r, 300));
      const { videos, categories } = await getInitialData();
      const videosById = new Map(videos.map((video) => [video.id, video]));
      
      // On s'assure que les catégories renvoient les dernières versions des vidéos par ID
      return categories.map((cat: Category) => ({
        ...cat,
        videos: cat.videos.map((v: Video) => videosById.get(v.id) || v)
      }));
    }
    return requestJson<Category[]>(`${WORKER_URL}/api/videos/home`);
  },

  getVideoDetails: async (slug: string): Promise<Video | null> => {
    if (isMockMode) {
      const { videos } = await getInitialData();
      return videos.find((v: Video) => v.slug === slug) || null;
    }
    return requestJson<Video | null>(`${WORKER_URL}/api/videos/${slug}`);
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
    return requestJson<Video[]>(`${WORKER_URL}/api/admin/videos`);
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
      
      return newVideo;
    }
    return requestJson<Video>(`${WORKER_URL}/api/admin/videos`, {
      method: 'POST',
      body: JSON.stringify(video),
      headers: { 'Content-Type': 'application/json' }
    });
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
      }
      return;
    }
    await requestJson(`${WORKER_URL}/api/admin/videos/${id}`, {
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
      return;
    }
    await requestJson(`${WORKER_URL}/api/admin/videos/${id}`, { method: 'DELETE' });
  },

  adminSyncCatalog: async (): Promise<void> => {
    if (isMockMode) {
      const db = await openDB();
      const tx = db.transaction([STORE_VIDEOS, STORE_CATEGORIES], 'readwrite');
      tx.objectStore(STORE_VIDEOS).clear();
      tx.objectStore(STORE_CATEGORIES).clear();
      window.location.reload();
      return;
    }
    await requestJson(`${WORKER_URL}/api/admin/sync`, { method: 'POST' });
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
