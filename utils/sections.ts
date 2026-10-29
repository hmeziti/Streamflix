import type { Category, Video } from '../types';
import { normalizeSearchText } from './search';

export type SectionId = 'home' | 'programmes' | 'nutrition' | 'entrainement' | 'sante' | 'trading' | 'ma-liste';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'entrainement', label: 'Entraînement' },
  { id: 'sante', label: 'Santé' },
  { id: 'trading', label: 'Trading' },
  { id: 'ma-liste', label: 'Ma liste' },
];

// Les sections thématiques regroupent les vidéos par genre (comparaison sans accents ni casse)
const SECTION_GENRES: Partial<Record<SectionId, string[]>> = {
  nutrition: ['nutrition'],
  entrainement: ['entrainement', 'musculation', 'theorie', 'fondamentaux'],
  sante: ['sante', 'hormones'],
  trading: ['trading', 'structure', 'supply', 'fractalite'],
};

export const isSectionId = (value: string | null): value is SectionId =>
  SECTIONS.some((section) => section.id === value);

export const getSectionLink = (section: SectionId) => (section === 'home' ? '/' : `/?section=${section}`);

export const getUniqueVideos = (categories: Category[]): Video[] => {
  const videos = new Map<string, Video>();
  categories.forEach((category) => category.videos.forEach((video) => videos.set(video.id, video)));
  return Array.from(videos.values());
};

const isProgrammeCategory = (category: Category) =>
  category.slug === 'featured' || normalizeSearchText(category.title).includes('programme');

export const getSectionVideos = (section: SectionId, categories: Category[], myListIds: string[]): Video[] => {
  if (section === 'programmes') return getUniqueVideos(categories.filter(isProgrammeCategory));

  const videos = getUniqueVideos(categories);

  if (section === 'ma-liste') {
    const videosById = new Map(videos.map((video) => [video.id, video]));
    return myListIds.map((id) => videosById.get(id)).filter((video): video is Video => Boolean(video));
  }

  const genres = SECTION_GENRES[section];
  if (!genres) return videos;
  return videos.filter((video) =>
    (video.genre || []).some((genre) => {
      const normalized = normalizeSearchText(genre);
      return genres.some((token) => normalized.includes(token));
    })
  );
};
