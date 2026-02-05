import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Video } from '../types';

export const Watch = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const videoData = await api.getVideoDetails(slug);
        setVideo(videoData);
        
        const playbackUrl = await api.getPlaybackUrl(slug);
        setUrl(playbackUrl);
      } catch (err) {
        setError('Impossible de charger la vidéo.');
      }
    };
    fetchData();
  }, [slug]);

  const handleBack = () => {
    navigate(-1);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4 text-white">
        <h2 className="text-xl font-bold">Oups !</h2>
        <p className="text-gray-400">{error}</p>
        <button onClick={handleBack} className="bg-white text-black px-6 py-2 rounded font-bold">Retour</button>
      </div>
    );
  }

  // Rendu spécifique pour VidMoly (Iframe)
  if (video?.source_type === 'vidmoly' && url) {
    return (
      <div className="bg-black h-screen w-screen overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-full p-6 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-4">
          <button onClick={handleBack} className="text-white hover:scale-110 transition">
             <ArrowLeft className="w-8 h-8" />
          </button>
          <h1 className="text-white font-medium text-lg">{video?.title}</h1>
        </div>
        
        <iframe 
          src={url}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen"
          title={video.title}
        />
      </div>
    );
  }

  return (
    <div className="bg-black h-screen w-screen overflow-hidden relative group">
       <div className="absolute top-0 left-0 w-full p-6 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-4">
          <button onClick={handleBack} className="text-white hover:scale-110 transition">
             <ArrowLeft className="w-8 h-8" />
          </button>
          <h1 className="text-white font-medium text-lg">{video?.title}</h1>
       </div>

       {url ? (
         <video 
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onError={() => setError("Erreur de lecture du fichier.")}
            controlsList="nodownload"
         />
       ) : (
         <div className="flex items-center justify-center h-full flex-col gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse">Chargement du lecteur...</p>
         </div>
       )}
    </div>
  );
};