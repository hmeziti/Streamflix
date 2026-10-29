import type { Video } from '../types';

/** 3600 -> "1 h", 2820 -> "47 min", 3900 -> "1 h 05" */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')}`;
};

export const formatRemaining = (seconds: number): string =>
  seconds < 60 ? 'Presque terminé' : `Reste ${formatDuration(seconds)}`;

const RATING_LABELS: Record<string, string> = { G: 'Tous publics' };

export const formatRating = (rating?: string): string => (rating ? RATING_LABELS[rating] ?? rating : '');

/** Ligne affichée sous les cartes : "1 h · Entraînement" */
export const formatVideoMeta = (video: Video): string =>
  [formatDuration(video.duration), video.genre?.[0]].filter(Boolean).join(' · ');

export interface CoverLabel {
  kicker: string;
  big: string;
  isNumber: boolean;
}

/**
 * Couverture typographique pour les vidéos sans miniature :
 * "STRUCTURE 4" -> STRUCTURE / 04, "Chapitre 1" -> CHAPITRE / 01, sinon le titre en grand.
 */
export const getCoverLabel = (video: Pick<Video, 'title' | 'genre'>): CoverLabel => {
  const title = video.title.trim();
  const genre = (video.genre?.[0] || '').toUpperCase();
  const match = title.match(/^(.*?)\b(\d{1,3})\b(.*)$/);

  if (match) {
    const rest = `${match[1]} ${match[3]}`.replace(/\s+/g, ' ').trim().toUpperCase();
    return { kicker: rest || genre, big: match[2].padStart(2, '0'), isNumber: true };
  }
  return { kicker: genre, big: title, isNumber: false };
};

/** Courbe décorative stable pour une même vidéo (viewBox 160 x 90). */
export const getCoverChartPoints = (seed: string): string => {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);

  const points: string[] = [];
  for (let i = 0; i < 9; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    points.push(`${i * 20},${14 + ((state >>> 24) % 58)}`);
  }
  return points.join(' ');
};
