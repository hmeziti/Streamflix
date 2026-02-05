import React, { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Plus, ImageOff } from 'lucide-react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  isLarge?: boolean;
}

const VideoCardComponent: React.FC<VideoCardProps> = ({ video, isLarge = false }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleWatchNavigation = useCallback(() => {
    navigate(`/watch/${video.slug}`);
  }, [navigate, video.slug]);

  const handleInfoNavigation = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(`/title/${video.slug}`);
  }, [navigate, video.slug]);

  return (
    <div 
      className={`group relative flex-none bg-[#1f1f1f] rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:z-10 hover:scale-110 ${isLarge ? 'w-48 h-72' : 'w-72 h-40'}`}
      onClick={handleWatchNavigation}
    >
      {imgError ? (
        <div className="w-full h-full bg-[#1f1f1f] border border-gray-800 flex flex-col items-center justify-center p-4">
           <ImageOff className="w-8 h-8 text-gray-600 mb-2" />
           <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest text-center line-clamp-2">{video.title}</span>
        </div>
      ) : (
        <img 
          src={video.thumbnail_url} 
          alt={video.title} 
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      
      {/* Hover Info Overlay */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4">
        <div className="flex gap-3 mb-2 scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
          <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
          <button className="w-8 h-8 rounded-full border-2 border-gray-400 text-gray-400 flex items-center justify-center hover:border-white hover:text-white">
            <Plus className="w-4 h-4" />
          </button>
          <button 
            className="w-8 h-8 rounded-full border-2 border-gray-400 text-gray-400 flex items-center justify-center hover:border-white hover:text-white"
            onClick={handleInfoNavigation}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <h3 className="text-white font-bold text-sm text-center line-clamp-2 px-2 leading-tight">{video.title}</h3>
        <div className="flex gap-2 text-[10px] text-gray-300 mt-2 items-center">
           <span className="text-green-400 font-bold">98% Match</span>
           <span className="border border-gray-500 px-1 rounded">{video.rating || '16+'}</span>
           <span>{Math.floor(video.duration / 60)}m</span>
        </div>
      </div>
    </div>
  );
};

export const VideoCard = memo(VideoCardComponent);
