import { createLocalStore } from '../utils/localStore';

// « Ma liste » et l'historique de lecture sont propres à l'appareil (localStorage).

export interface HistoryEntry {
  videoId: string;
  watchedAt: number;
  /** Position en secondes : connue seulement pour le lecteur HTML5 (R2 / Drive), pas pour l'iframe VidMoly. */
  position?: number;
  duration?: number;
}

const MAX_HISTORY = 20;
// Au-delà, la vidéo est considérée comme terminée et sort de « Reprendre la lecture »
const COMPLETION_RATIO = 0.95;

const myListStore = createLocalStore<string[]>('streamflix-my-list', []);
const historyStore = createLocalStore<HistoryEntry[]>('streamflix-history', []);

const isCompleted = (entry: HistoryEntry) =>
  Boolean(entry.position && entry.duration && entry.position / entry.duration >= COMPLETION_RATIO);

export const useMyList = () => {
  const ids = myListStore.useValue();
  return {
    ids,
    has: (videoId: string) => ids.includes(videoId),
    toggle: (videoId: string) => {
      const current = myListStore.get();
      myListStore.set(current.includes(videoId) ? current.filter((id) => id !== videoId) : [videoId, ...current]);
    },
  };
};

export const recordView = (videoId: string): void => {
  const history = historyStore.get();
  const previous = history.find((entry) => entry.videoId === videoId);
  historyStore.set(
    [{ ...previous, videoId, watchedAt: Date.now() }, ...history.filter((entry) => entry.videoId !== videoId)].slice(0, MAX_HISTORY)
  );
};

export const saveProgress = (videoId: string, position: number, duration: number): void => {
  historyStore.set(
    historyStore.get().map((entry) => (entry.videoId === videoId ? { ...entry, position, duration } : entry))
  );
};

/** Position à laquelle reprendre la lecture (0 si inconnue ou vidéo terminée). */
export const getResumePosition = (videoId: string): number => {
  const entry = historyStore.get().find((candidate) => candidate.videoId === videoId);
  return entry && !isCompleted(entry) ? entry.position || 0 : 0;
};

export const useContinueWatching = (): HistoryEntry[] => historyStore.useValue().filter((entry) => !isCompleted(entry));
