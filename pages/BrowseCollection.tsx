import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Row } from '../components/Row';
import { api } from '../services/api';
import { Category, Video } from '../types';

interface BrowseCollectionProps {
  title: string;
  subtitle: string;
  includeVideo: (video: Video) => boolean;
}

export const BrowseCollection: React.FC<BrowseCollectionProps> = ({ title, subtitle, includeVideo }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getHomeData();
        setCategories(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        videos: category.videos.filter(includeVideo)
      }))
      .filter((category) => category.videos.length > 0);
  }, [categories, includeVideo]);

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar />

      <header className="px-4 md:px-12 pt-28 md:pt-32 pb-6">
        <h1 className="text-white text-3xl md:text-5xl font-extrabold">{title}</h1>
        <p className="text-gray-300 mt-3 max-w-2xl">{subtitle}</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="px-4 md:px-12 text-gray-400">Aucun contenu disponible pour cette section.</div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <Row key={category.id} title={category.title} videos={category.videos} isLarge={category.slug === 'featured'} />
          ))}
        </div>
      )}
    </div>
  );
};
