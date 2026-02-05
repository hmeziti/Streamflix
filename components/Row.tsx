import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoCard } from './VideoCard';
import { Video } from '../types';

interface RowProps {
  title: string;
  videos: Video[];
  isLarge?: boolean;
}

export const Row: React.FC<RowProps> = ({ title, videos, isLarge = false }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClick = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-2 mb-8 group px-4 md:px-12">
      <h2 className="text-lg md:text-xl font-semibold text-gray-200 hover:text-white transition cursor-pointer inline-block">
        {title}
      </h2>
      <div className="relative group/row">
        <div 
          className={`absolute top-0 bottom-0 left-0 bg-black/50 z-40 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 cursor-pointer transition-opacity hover:bg-black/70 rounded-r-md`}
          onClick={() => handleClick('left')}
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </div>

        <div 
          ref={rowRef}
          className="flex items-center space-x-2 md:space-x-4 overflow-x-scroll no-scrollbar scroll-smooth py-4"
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} isLarge={isLarge} />
          ))}
        </div>

        <div 
          className={`absolute top-0 bottom-0 right-0 bg-black/50 z-40 w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 cursor-pointer transition-opacity hover:bg-black/70 rounded-l-md`}
          onClick={() => handleClick('right')}
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};
