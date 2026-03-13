import { describe, expect, it } from 'vitest';
import { filterCategoriesBySearch, getSearchTokens, getVideoSearchScore, normalizeSearchText } from '../search';
import { Category, Video } from '../../types';

const mkVideo = (overrides: Partial<Video>): Video => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  title: overrides.title || '',
  description: overrides.description || '',
  thumbnail_url: overrides.thumbnail_url || '',
  video_key: overrides.video_key || '',
  source_type: overrides.source_type || 'vidmoly',
  duration: overrides.duration || 60,
  year: overrides.year || 2024,
  slug: overrides.slug || 'slug',
  rating: overrides.rating || 'G',
  genre: overrides.genre || [],
});

describe('search utils', () => {
  it('normalizes accents and case', () => {
    expect(normalizeSearchText('Fractalité Énergie')).toBe('fractalite energie');
  });

  it('tokenizes query safely', () => {
    expect(getSearchTokens('  supply   demand  ')).toEqual(['supply', 'demand']);
  });

  it('scores title matches above genre and description', () => {
    const titleHit = mkVideo({ title: 'Supply Masterclass' });
    const genreHit = mkVideo({ genre: ['Supply Zone'] });
    const descHit = mkVideo({ description: 'all about supply' });
    const tokens = ['supply'];

    expect(getVideoSearchScore(titleHit, tokens)).toBeGreaterThan(getVideoSearchScore(genreHit, tokens));
    expect(getVideoSearchScore(genreHit, tokens)).toBeGreaterThan(getVideoSearchScore(descHit, tokens));
  });

  it('filters and sorts results by score then year', () => {
    const cat: Category = {
      id: 'cat1',
      title: 'Trading',
      slug: 'trading',
      videos: [
        mkVideo({ id: 'a', title: 'Structure Supply', year: 2022 }),
        mkVideo({ id: 'b', genre: ['Supply'], year: 2024 }),
        mkVideo({ id: 'c', title: 'Supply', year: 2025 }),
      ],
    };

    const out = filterCategoriesBySearch([cat], 'supply');
    expect(out).toHaveLength(1);
    expect(out[0].videos.map((v) => v.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns empty when no matches found', () => {
    const cat: Category = {
      id: 'cat1',
      title: 'Trading',
      slug: 'trading',
      videos: [mkVideo({ id: 'x', title: 'Momentum' })],
    };

    expect(filterCategoriesBySearch([cat], 'fractalite')).toEqual([]);
  });
});
