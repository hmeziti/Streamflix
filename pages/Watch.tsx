import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { getResumePosition, recordView, saveProgress } from '../services/library';
import { Video } from '../types';
import { formatDuration } from '../utils/format';

// Intervalle minimal entre deux sauvegardes de la position de lecture
const PROGRESS_SAVE_INTERVAL_S = 5;

export const Watch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [video, setVideo] = useState<Video | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSavedPosition = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const videoData = await api.getVideoDetails(slug);
        if (!videoData) {
          setError('Vidéo introuvable.');
          return;
        }
        setVideo(videoData);
        setUrl(api.getPlaybackUrl(videoData));
        recordView(videoData.id);
      } catch (err) {
        setError('Impossible de charger la vidéo.');
      }
    };
    fetchData();
  }, [slug]);

  // Arrivée directe sur /watch/... : pas de page précédente dans l'app
  const handleBack = () => (location.key === 'default' ? navigate('/') : navigate(-1));

  const persistPosition = (element: HTMLVideoElement, force = false) => {
    if (!video || !Number.isFinite(element.duration)) return;
    if (!force && Math.abs(element.currentTime - lastSavedPosition.current) < PROGRESS_SAVE_INTERVAL_S) return;
    lastSavedPosition.current = element.currentTime;
    saveProgress(video.id, element.currentTime, element.duration);
  };

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-bold">Oups !</h1>
        <p className="text-muted">{error}</p>
        <button type="button" onClick={handleBack} className="h-11 rounded-[10px] bg-white px-6 font-semibold text-background">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-black">
      <header className="flex h-16 flex-none items-center gap-3 border-b border-white/5 bg-background px-2 md:px-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Retour"
          className="grid h-11 w-11 flex-none place-items-center rounded-full transition hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        {video && (
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-base font-bold md:text-lg">{video.title}</h1>
            <span className="truncate text-xs text-muted">
              {[formatDuration(video.duration), video.genre?.join(' · ')].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        {!url || !video ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Chargement du lecteur" />
          </div>
        ) : video.source_type === 'vidmoly' ? (
          <iframe src={url} className="h-full w-full border-0" allowFullScreen allow="autoplay; fullscreen" title={video.title} />
        ) : (
          <video
            src={url}
            className="h-full w-full object-contain"
            controls
            autoPlay
            controlsList="nodownload"
            onLoadedMetadata={(e) => {
              const resumeAt = getResumePosition(video.id);
              if (resumeAt > 0) e.currentTarget.currentTime = resumeAt;
              lastSavedPosition.current = resumeAt;
            }}
            onTimeUpdate={(e) => persistPosition(e.currentTarget)}
            onPause={(e) => persistPosition(e.currentTarget, true)}
            onEnded={(e) => persistPosition(e.currentTarget, true)}
            onError={() => setError('Erreur de lecture du fichier.')}
          />
        )}
      </div>
    </div>
  );
};
