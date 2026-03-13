import { Category, Video } from '../types';

export const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getSearchTokens = (query: string) =>
  normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const getVideoSearchScore = (video: Video, tokens: string[]) => {
  const title = normalizeSearchText(video.title || '');
  const description = normalizeSearchText(video.description || '');
  const genres = (video.genre || []).map((genre) => normalizeSearchText(genre));

  let score = 0;

  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (genres.some((genre) => genre.includes(token))) score += 3;
    if (description.includes(token)) score += 1;
  }

  return score;
};

export const filterCategoriesBySearch = (allCategories: Category[], query: string): Category[] => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return allCategories;

  const tokens = getSearchTokens(normalizedQuery);
  if (tokens.length === 0) return allCategories;

  return allCategories
    .map((category) => {
      const scoredVideos = category.videos
        .map((video) => ({
          video,
          score: getVideoSearchScore(video, tokens),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.video.year - a.video.year)
        .map((item) => item.video);

      return {
        ...category,
        videos: scoredVideos,
      };
    })
    .filter((category) => category.videos.length > 0);
};
