import React, { useCallback } from 'react';
import { BrowseCollection } from './BrowseCollection';
import { Video } from '../types';

export const NewPopular = () => {
  const includeVideo = useCallback((video: Video) => video.year >= 2024, []);

  return (
    <BrowseCollection
      title="New & Popular"
      subtitle="Les nouveautés et les contenus les plus consultés du moment." 
      includeVideo={includeVideo}
    />
  );
};
