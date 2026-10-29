import { describe, expect, it } from 'vitest';
import { formatDuration, formatRemaining, formatVideoMeta, getCoverChartPoints, getCoverLabel } from '../format';
import { getSectionVideos, getUniqueVideos } from '../sections';
import { searchVideos } from '../search';
import { Category, Video } from '../../types';

const mkVideo = (overrides: Partial<Video>): Video => ({
  id: overrides.id || 'id',
  title: overrides.title || '',
  description: '',
  thumbnail_url: '',
  video_key: '',
  source_type: 'vidmoly',
  duration: overrides.duration ?? 3600,
  year: overrides.year ?? 2024,
  slug: overrides.slug || 'slug',
  genre: overrides.genre || [],
});

describe('format', () => {
  it('formate les durées', () => {
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(2800)).toBe('47 min');
    expect(formatDuration(3900)).toBe('1 h 05');
    expect(formatDuration(20)).toBe('1 min');
    expect(formatDuration(0)).toBe('');
    expect(formatRemaining(1740)).toBe('Reste 29 min');
    expect(formatRemaining(30)).toBe('Presque terminé');
  });

  it('construit la ligne de métadonnées', () => {
    expect(formatVideoMeta(mkVideo({ duration: 3120, genre: ['Nutrition', 'Lifestyle'] }))).toBe('52 min · Nutrition');
  });

  it('dérive le libellé des couvertures générées', () => {
    expect(getCoverLabel({ title: 'STRUCTURE 4', genre: ['Trading'] })).toEqual({ kicker: 'STRUCTURE', big: '04', isNumber: true });
    expect(getCoverLabel({ title: 'STRUCTURE 2 Fractalité' })).toEqual({ kicker: 'STRUCTURE FRACTALITÉ', big: '02', isNumber: true });
    expect(getCoverLabel({ title: 'Le Jeûne Intermittent', genre: ['Nutrition'] })).toEqual({
      kicker: 'NUTRITION',
      big: 'Le Jeûne Intermittent',
      isNumber: false,
    });
  });

  it('génère une courbe stable par vidéo', () => {
    const points = getCoverChartPoints('z2h-11');
    expect(points).toBe(getCoverChartPoints('z2h-11'));
    expect(points).not.toBe(getCoverChartPoints('z2h-12'));
    expect(points.split(' ')).toHaveLength(9);
  });
});

describe('sections & recherche', () => {
  const intensification = mkVideo({ id: '1', title: "Les Techniques d'Intensification", genre: ['Entraînement', 'Musculation'] });
  const structure = mkVideo({ id: '2', title: 'STRUCTURE 1', genre: ['Trading', 'Structure'], year: 2023 });
  const hormones = mkVideo({ id: '3', title: 'Santé, Hormones, Énergie', genre: ['Santé', 'Hormones'] });
  const categories: Category[] = [
    { id: 'a', title: 'Programme Zero to Hero', slug: 'featured', videos: [intensification, structure] },
    { id: 'b', title: 'Santé', slug: 'health', videos: [hormones, intensification] },
  ];

  it('déduplique les vidéos du catalogue', () => {
    expect(getUniqueVideos(categories).map((v) => v.id)).toEqual(['1', '2', '3']);
  });

  it('filtre les sections par genre, sans accents', () => {
    expect(getSectionVideos('entrainement', categories, []).map((v) => v.id)).toEqual(['1']);
    expect(getSectionVideos('sante', categories, []).map((v) => v.id)).toEqual(['3']);
    expect(getSectionVideos('trading', categories, []).map((v) => v.id)).toEqual(['2']);
    expect(getSectionVideos('programmes', categories, []).map((v) => v.id)).toEqual(['1', '2']);
  });

  it('respecte l\'ordre de « Ma liste » et ignore les vidéos supprimées', () => {
    expect(getSectionVideos('ma-liste', categories, ['3', 'disparue', '1']).map((v) => v.id)).toEqual(['3', '1']);
  });

  it('classe la recherche globale par pertinence', () => {
    const videos = getUniqueVideos(categories);
    expect(searchVideos(videos, 'structure').map((v) => v.id)).toEqual(['2']);
    expect(searchVideos(videos, 'energie').map((v) => v.id)).toEqual(['3']);
    expect(searchVideos(videos, '   ')).toEqual([]);
  });
});
