import type { Video } from '../types';

// Partagé entre le front et le Worker : ne doit importer aucun asset (jpg, css...).

export const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80';

const THUMBNAIL_LOOKUP_TIMEOUT_MS = 4000;

/** Accepte un ID VidMoly brut, "embed-<id>.html" ou une URL complète. */
export const getVidmolyEmbedUrl = (videoKey: string): string => {
  const key = videoKey.trim();
  if (!key) return '';
  if (key.startsWith('http')) return key;
  const cleanId = key.replace('embed-', '').replace('.html', '');
  return `https://vidmoly.net/embed-${cleanId}.html`;
};

/** Le lecteur VidMoly déclare son poster via `image: "..."` dans sa config JS. */
export const extractVidmolyThumbnail = (html: string, embedUrl: string): string => {
  const rawUrl = html.match(/image\s*:\s*["']([^"']+)["']/i)?.[1]?.trim();
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl, embedUrl).href;
  } catch {
    return '';
  }
};

type ThumbnailSource = Partial<Pick<Video, 'source_type' | 'video_key'>> & { thumbnail_url?: string | null };

export const resolveThumbnailUrl = async (video: ThumbnailSource): Promise<string> => {
  const currentThumbnail = video.thumbnail_url?.trim();
  if (currentThumbnail) return currentThumbnail;

  const key = video.video_key?.trim() || '';

  if (video.source_type === 'vidmoly' && key) {
    const embedUrl = getVidmolyEmbedUrl(key);
    try {
      const response = await fetch(embedUrl, { signal: AbortSignal.timeout(THUMBNAIL_LOOKUP_TIMEOUT_MS) });
      if (response.ok) {
        const thumbnail = extractVidmolyThumbnail(await response.text(), embedUrl);
        if (thumbnail) return thumbnail;
      }
    } catch {
      // Réseau, timeout ou CORS (navigateur) : on retombe sur les miniatures par défaut
    }
  }

  if (video.source_type === 'drive' && key) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(key)}&sz=w1280`;
  }

  return FALLBACK_THUMBNAIL;
};
