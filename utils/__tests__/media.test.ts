import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractVidmolyThumbnail, FALLBACK_THUMBNAIL, getVidmolyEmbedUrl, resolveThumbnailUrl } from '../media';
import { slugify } from '../slug';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('media utils', () => {
  it('construit l\'URL embed VidMoly', () => {
    expect(getVidmolyEmbedUrl(' 4pvdbj19xv02 ')).toBe('https://vidmoly.net/embed-4pvdbj19xv02.html');
    expect(getVidmolyEmbedUrl('embed-abc.html')).toBe('https://vidmoly.net/embed-abc.html');
    expect(getVidmolyEmbedUrl('https://vidmoly.net/embed-x.html')).toBe('https://vidmoly.net/embed-x.html');
    expect(getVidmolyEmbedUrl('')).toBe('');
  });

  it('extrait le poster de la config du lecteur', () => {
    const embed = 'https://vidmoly.net/embed-x.html';
    expect(extractVidmolyThumbnail(`player({ image: "https://box.cloud/i/x.jpg" })`, embed)).toBe('https://box.cloud/i/x.jpg');
    expect(extractVidmolyThumbnail(`image:'/i/x.jpg'`, embed)).toBe('https://vidmoly.net/i/x.jpg');
    expect(extractVidmolyThumbnail('<html></html>', embed)).toBe('');
  });

  it('garde une miniature existante sans appel réseau', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await resolveThumbnailUrl({ thumbnail_url: ' https://x/y.jpg ', source_type: 'vidmoly', video_key: 'a' })).toBe('https://x/y.jpg');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retombe sur la miniature par défaut si VidMoly est injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('CORS')));
    expect(await resolveThumbnailUrl({ source_type: 'vidmoly', video_key: 'a' })).toBe(FALLBACK_THUMBNAIL);
  });

  it('slugifie accents et ponctuation', () => {
    expect(slugify("Les Techniques d'Intensification")).toBe('les-techniques-d-intensification');
    expect(slugify('  Santé, Hormones, Énergie ')).toBe('sante-hormones-energie');
  });
});
