import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Row } from '../components/Row';
import { api } from '../services/api';
import { Category, Video } from '../types';
import { fallbackToVideoThumbnail, getPreferredThumbnailUrl } from '../services/thumbnails';

export const Home = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getHomeData();
        setCategories(data);
        setActiveCategoryId(data[0]?.id ?? null);
        if (data.length > 0 && data[0].videos.length > 0) {
          setFeaturedVideo(data[0].videos[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar />
      
      {/* Hero Section */}
      {featuredVideo && (
        <div className="relative h-[56.25vw] md:h-[85vh] w-full">
           <div className="absolute top-0 left-0 w-full h-full">
             <img 
                src={getPreferredThumbnailUrl(featuredVideo)} 
                alt={featuredVideo.title}
                className="w-full h-full object-cover"
                onError={(event) => fallbackToVideoThumbnail(event, featuredVideo.thumbnail_url, () => {})}
             />
             <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
           </div>

           <div className="absolute top-[30%] md:top-[40%] left-4 md:left-12 max-w-xl space-y-4">
              <h1 className="text-3xl md:text-6xl font-extrabold drop-shadow-lg text-white">
                {featuredVideo.title}
              </h1>
              <p className="text-white text-sm md:text-lg drop-shadow-md line-clamp-3">
                {featuredVideo.description}
              </p>
              <div className="flex space-x-3 mt-4">
                 <button 
                  onClick={() => navigate(`/watch/${featuredVideo.slug}`)}
                  className="flex items-center gap-2 bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-gray-200 transition"
                 >
                   <Play className="w-5 h-5 fill-current" /> Play
                 </button>
                 <button 
                  onClick={() => navigate(`/title/${featuredVideo.slug}`)}
                  className="flex items-center gap-2 bg-gray-500/70 text-white px-6 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-gray-500/50 transition backdrop-blur-sm"
                 >
                   <Info className="w-5 h-5" /> More Info
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="-mt-10 md:-mt-32 relative z-10 pl-4 md:pl-0 space-y-8">
        <div className="flex flex-wrap gap-2 px-4 md:px-12">
          {categories.map((category) => {
            const isActive = category.id === activeCategory?.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-200 hover:bg-white/20'
                }`}
              >
                {category.title}
              </button>
            );
          })}
        </div>
        {activeCategory && (
          <Row
            key={activeCategory.id}
            title={activeCategory.title}
            videos={activeCategory.videos}
            isLarge={activeCategory.slug === 'trending'}
          />
        )}
      </div>
    </div>
  );
};
