import React, { useState } from 'react';
import { Video } from '../types';
import { FALLBACK_THUMBNAIL } from '../utils/media';
import { getCoverChartPoints, getCoverLabel } from '../utils/format';

type CoverSize = 'sm' | 'md' | 'lg';

const COVER_STYLES: Record<CoverSize, { box: string; kicker: string; number: string; title: string }> = {
  sm: { box: 'p-3', kicker: 'text-[10px]', number: 'text-3xl', title: 'text-lg' },
  md: { box: 'p-4', kicker: 'text-[10px]', number: 'text-4xl', title: 'text-xl' },
  lg: { box: 'p-6 md:p-8', kicker: 'text-xs', number: 'text-6xl md:text-7xl', title: 'text-3xl md:text-4xl' },
};

/** La miniature générique de secours est remplacée par une couverture typographique. */
export const getUsableThumbnail = (video: Video): string =>
  video.thumbnail_url && video.thumbnail_url !== FALLBACK_THUMBNAIL ? video.thumbnail_url : '';

export const Cover: React.FC<{ video: Video; size?: CoverSize }> = ({ video, size = 'md' }) => {
  const { kicker, big, isNumber } = getCoverLabel(video);
  const styles = COVER_STYLES[size];

  return (
    <div aria-hidden="true" className={`relative flex h-full w-full flex-col justify-end bg-tile ${styles.box}`}>
      <svg viewBox="0 0 160 90" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline
          points={getCoverChartPoints(video.id)}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {kicker && (
        <span className={`relative truncate font-semibold tracking-[0.14em] text-muted ${styles.kicker}`}>{kicker}</span>
      )}
      <span
        className={`relative font-display font-extrabold leading-none tracking-[-0.03em] ${
          isNumber ? styles.number : `line-clamp-2 leading-[1.05] ${styles.title}`
        }`}
      >
        {big}
      </span>
    </div>
  );
};

interface ThumbnailProps {
  video: Video;
  size?: CoverSize;
  alt?: string;
  eager?: boolean;
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({ video, size = 'md', alt = '', eager = false, className = '' }) => {
  const src = getUsableThumbnail(video);
  const [failedSrc, setFailedSrc] = useState('');

  if (!src || failedSrc === src) return <Cover video={video} size={size} />;

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`block h-full w-full object-cover ${className}`}
    />
  );
};
