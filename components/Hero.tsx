import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info, Play, Plus } from 'lucide-react';
import { Video } from '../types';
import { useMyList } from '../services/library';
import { formatDuration, formatRating } from '../utils/format';
import { HEADER_OFFSET_CLASS } from './Navbar';
import { getUsableThumbnail, Thumbnail } from './Thumbnail';

interface HeroProps {
  /** Vidéos mises en avant ; les points sous l'aperçu permettent de passer de l'une à l'autre. */
  videos: Video[];
  getKicker?: (video: Video, index: number) => string;
}

const Dot = () => <span aria-hidden="true" className="h-1 w-1 rounded-full bg-subtle" />;

export const Hero: React.FC<HeroProps> = ({ videos, getKicker }) => {
  const [index, setIndex] = useState(0);
  const myList = useMyList();
  const activeIndex = Math.min(index, videos.length - 1);
  const video = videos[activeIndex];
  if (!video) return null;

  const backdrop = getUsableThumbnail(video);
  const inList = myList.has(video.id);
  const kicker = getKicker?.(video, activeIndex);
  const rating = formatRating(video.rating);

  return (
    <section aria-labelledby="hero-title" className={`relative overflow-hidden ${HEADER_OFFSET_CLASS}`}>
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover blur-[48px] brightness-[0.38] saturate-[0.6]"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-55% to-background" />

      {/* Empilé (aperçu en premier) sous lg, côte à côte au-delà */}
      <div className="relative flex flex-col gap-8 px-4 pb-12 pt-6 md:px-14 md:pb-[72px] md:pt-10 lg:flex-row lg:items-center lg:gap-14 lg:pt-14">
        <div key={video.id} className="flex max-w-[560px] animate-fade-in flex-col gap-4 md:gap-5 lg:flex-[1_1_420px]">
          {kicker && (
            <span className="self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
              {kicker}
            </span>
          )}
          <h1 id="hero-title" className="font-display text-[clamp(36px,5vw,68px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            {video.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-sm text-zinc-300">
            {video.year > 0 && <span>{video.year}</span>}
            {video.duration > 0 && (
              <>
                <Dot />
                <span>{formatDuration(video.duration)}</span>
              </>
            )}
            {video.genre && video.genre.length > 0 && (
              <>
                <Dot />
                <span>{video.genre.join(' · ')}</span>
              </>
            )}
            {rating && <span className="rounded border border-zinc-600 px-1.5 py-px text-xs">{rating}</span>}
          </div>
          {video.description && (
            <p className="line-clamp-2 text-base leading-relaxed text-zinc-300 md:line-clamp-3 md:text-[17px]">{video.description}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3">
            <Link
              to={`/watch/${video.slug}`}
              className="inline-flex h-[52px] flex-1 items-center justify-center gap-2.5 rounded-[10px] bg-white px-7 text-base font-semibold text-background transition hover:bg-zinc-200 sm:flex-none"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              Lecture
            </Link>
            <button
              type="button"
              onClick={() => myList.toggle(video.id)}
              aria-pressed={inList}
              className="inline-flex h-[52px] items-center gap-2.5 rounded-[10px] border border-white/20 bg-white/10 px-5 text-base font-semibold transition hover:bg-white/15"
            >
              {inList ? <Check className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
              Ma liste
            </button>
            <Link
              to={`/title/${video.slug}`}
              aria-label={`Plus d'informations sur « ${video.title} »`}
              className="grid h-[52px] w-[52px] place-items-center rounded-[10px] border border-white/20 bg-white/10 transition hover:bg-white/15"
            >
              <Info className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative order-first min-w-0 lg:order-none lg:flex-[1_1_520px]">
          <Link
            to={`/watch/${video.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block aspect-video overflow-hidden rounded-[18px] shadow-[0_40px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
          >
            <Thumbnail video={video} size="lg" eager />
          </Link>
          {videos.length > 1 && (
            <div className="absolute bottom-3 left-4 flex gap-1">
              {videos.map((candidate, candidateIndex) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setIndex(candidateIndex)}
                  aria-label={`Mettre en avant « ${candidate.title} »`}
                  aria-current={candidateIndex === activeIndex}
                  className="grid h-6 place-items-center px-1"
                >
                  <span
                    className={`block h-1 rounded-full transition-all ${
                      candidateIndex === activeIndex ? 'w-7 bg-white' : 'w-3 bg-white/40'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
