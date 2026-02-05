import React, { useCallback } from 'react';
import { BrowseCollection } from './BrowseCollection';
import { Video } from '../types';

export const MyList = () => {
  const includeVideo = useCallback((video: Video) => {
    const tagList = video.genre?.join(' ').toLowerCase() || '';
    return tagList.includes('nutrition') || tagList.includes('santé');
  }, []);

  return (
    <BrowseCollection
      title="My List"
      subtitle="Ta sélection personnalisée. (Ici: contenus santé et nutrition en priorité.)" 
      includeVideo={includeVideo}
    />
  );
};
