import type { SyntheticEvent } from 'react';
import { Video } from '../types';

export const getPreferredThumbnailUrl = (video: Video): string => {
  if (video.source_type === 'vidmoly') {
    return `/${video.video_key}.jpg`;
  }

  return video.thumbnail_url;
};

export const fallbackToVideoThumbnail = (
  event: SyntheticEvent<HTMLImageElement>,
  fallbackUrl: string,
  onFallbackFailure: () => void,
) => {
  const image = event.currentTarget;

  if (image.src === fallbackUrl || image.dataset.fallbackApplied === 'true') {
    onFallbackFailure();
    return;
  }

  image.dataset.fallbackApplied = 'true';
  image.src = fallbackUrl;
};
