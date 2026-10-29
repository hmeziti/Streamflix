import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Play, Plus } from 'lucide-react';
import { Video } from '../types';
import { useMyList } from '../services/library';
import { formatVideoMeta } from '../utils/format';
import { Thumbnail } from './Thumbnail';

interface VideoCardProps {
  video: Video;
  /** Numéro d'épisode affiché en grand à gauche (rangée programme) */
  number?: number;
  /** Progression de lecture entre 0 et 1 */
  progress?: number;
  /** Remplace la ligne durée · genre sous le titre */
  caption?: string;
  className?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, number, progress, caption, className = 'w-[260px] md:w-[300px]' }) => {
  const myList = useMyList();
  const inList = myList.has(video.id);

  return (
    <div className={`group relative flex flex-none items-end gap-1 ${className}`}>
      {number !== undefined && (
        <span
          aria-hidden="true"
          className={`flex-none font-display font-extrabold leading-[0.78] text-outline ${
            number >= 10 ? 'text-[72px] tracking-[-0.08em] md:text-[84px]' : 'w-[58px] text-[80px] tracking-[-0.06em] md:w-[74px] md:text-[96px]'
          }`}
        >
          {number}
        </span>
      )}

      <div className="relative min-w-0 flex-1">
        <Link to={`/watch/${video.slug}`} className="flex flex-col gap-2.5 rounded-xl">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-surface ring-1 ring-white/5 transition duration-300 group-hover:ring-white/25">
            <Thumbnail video={video} className="transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-background">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
              </span>
            </div>
            {progress !== undefined && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[15px] font-semibold leading-snug">{video.title}</span>
            <span className="text-[13px] text-muted">{caption ?? formatVideoMeta(video)}</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => myList.toggle(video.id)}
          aria-pressed={inList}
          aria-label={inList ? `Retirer « ${video.title} » de ma liste` : `Ajouter « ${video.title} » à ma liste`}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition hover:bg-black/80 focus-visible:opacity-100 pointer-coarse:h-11 pointer-coarse:w-11 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
        >
          {inList ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};
