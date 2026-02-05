import React, { useCallback } from 'react';
import { BrowseCollection } from './BrowseCollection';
import { Video } from '../types';

export const Series = () => {
  const includeVideo = useCallback((video: Video) => video.duration >= 3600, []);

  return (
    <BrowseCollection
      title="Series"
      subtitle="Retrouve les programmes longs, épisodes complets et masterclass." 
      includeVideo={includeVideo}
    />
  );
};
