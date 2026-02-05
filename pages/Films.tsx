import React, { useCallback } from 'react';
import { BrowseCollection } from './BrowseCollection';
import { Video } from '../types';

export const Films = () => {
  const includeVideo = useCallback((video: Video) => video.duration < 3600, []);

  return (
    <BrowseCollection
      title="Films"
      subtitle="Une sélection de contenus plus courts à regarder en une session." 
      includeVideo={includeVideo}
    />
  );
};
