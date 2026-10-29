import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Hero } from '../components/Hero';
import { MobileTabBar } from '../components/MobileTabBar';
import { HEADER_OFFSET_CLASS, Navbar } from '../components/Navbar';
import { Row } from '../components/Row';
import { VideoCard } from '../components/VideoCard';
import { api } from '../services/api';
import { useContinueWatching, useMyList } from '../services/library';
import { Category, Video } from '../types';
import { formatDuration, formatRemaining } from '../utils/format';
import { searchVideos } from '../utils/search';
import { getSectionVideos, getUniqueVideos, isSectionId, SECTIONS } from '../utils/sections';

const HERO_VIDEO_COUNT = 4;

const VideoGrid: React.FC<{ videos: Video[]; numbered?: boolean }> = ({ videos, numbered = false }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-x-5 gap-y-8">
    {videos.map((video, index) => (
      <VideoCard key={video.id} video={video} number={numbered ? index + 1 : undefined} className="w-full" />
    ))}
  </div>
);

const EmptyState: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center">
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    <p className="max-w-md text-muted">{text}</p>
  </div>
);

export const Home = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const myList = useMyList();
  const history = useContinueWatching();

  const isSearchPage = location.pathname === '/search';
  const query = (searchParams.get('q') || '').trim();
  const sectionParam = searchParams.get('section');
  const section = isSectionId(sectionParam) ? sectionParam : 'home';
  const isBrowsing = !isSearchPage && !query && section === 'home';

  const loadCatalog = () => {
    setLoading(true);
    setLoadError(false);
    api
      .getHomeData()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadCatalog, []);

  const allVideos = useMemo(() => getUniqueVideos(categories), [categories]);

  const heroVideos = useMemo(() => {
    const programme = categories[0]?.videos.slice(0, HERO_VIDEO_COUNT) || [];
    const selected = slug ? allVideos.find((video) => video.slug === slug) : undefined;
    return selected ? [selected, ...programme.filter((video) => video.id !== selected.id)].slice(0, HERO_VIDEO_COUNT) : programme;
  }, [allVideos, categories, slug]);

  const continueWatching = useMemo(() => {
    const videosById = new Map<string, Video>(allVideos.map((video) => [video.id, video]));
    return history.flatMap(({ videoId, position, duration }) => {
      const video = videosById.get(videoId);
      if (!video) return [];
      // Position inconnue pour l'iframe VidMoly : on affiche la durée à la place
      const hasProgress = position !== undefined && duration !== undefined && duration > 0;
      return [{
        video,
        progress: hasProgress ? position / duration : undefined,
        caption: hasProgress ? formatRemaining(duration - position) : formatDuration(video.duration),
      }];
    });
  }, [allVideos, history]);

  const listing = useMemo(() => {
    if (isSearchPage || query) {
      return { title: query ? `Résultats pour « ${query} »` : 'Rechercher', videos: query ? searchVideos(allVideos, query) : [] };
    }
    const label = SECTIONS.find((candidate) => candidate.id === section)?.label || '';
    return { title: label, videos: getSectionVideos(section, categories, myList.ids) };
  }, [allVideos, categories, isSearchPage, myList.ids, query, section]);

  const getHeroKicker = (video: Video, index: number) => {
    const programme = categories[0];
    const position = programme?.videos.findIndex((candidate) => candidate.id === video.id) ?? -1;
    if (programme && position >= 0) return `${programme.title} · Épisode ${String(position + 1).padStart(2, '0')}`;
    return video.genre?.[0] || (index === 0 ? 'À la une' : '');
  };

  const renderListing = () => {
    if (isSearchPage && !query) {
      return <EmptyState title="Que veux-tu regarder ?" text="Cherche un titre, un thème (nutrition, structure…) ou un chapitre." />;
    }
    if (listing.videos.length > 0) return <VideoGrid videos={listing.videos} numbered={section === 'programmes' && !query} />;
    if (query) return <EmptyState title="Aucun résultat" text="Essaie un autre mot-clé ou retourne à l'accueil." />;
    if (section === 'ma-liste') {
      return <EmptyState title="Ta liste est vide" text="Ajoute des vidéos avec le bouton + pour les retrouver ici." />;
    }
    return <EmptyState title="Rien ici pour l'instant" text="Aucune vidéo n'est encore rattachée à cette section." />;
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />

      {loading ? (
        <div className={`flex min-h-screen items-center justify-center ${HEADER_OFFSET_CLASS}`}>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Chargement" />
        </div>
      ) : loadError ? (
        <main className={`px-4 pb-20 md:px-14 ${HEADER_OFFSET_CLASS}`}>
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-16 text-center">
            <h1 className="font-display text-2xl font-bold">Impossible de charger le catalogue</h1>
            <p className="text-muted">Vérifie ta connexion puis réessaie.</p>
            <button type="button" onClick={loadCatalog} className="h-11 rounded-[10px] bg-white px-6 font-semibold text-background">
              Réessayer
            </button>
          </div>
        </main>
      ) : isBrowsing ? (
        <>
          <Hero key={heroVideos[0]?.id} videos={heroVideos} getKicker={getHeroKicker} />
          <main className="flex flex-col gap-12 pb-20 pt-2">
            {continueWatching.length > 0 && (
              <Row title="Reprendre la lecture">
                {continueWatching.map(({ video, progress, caption }) => (
                  <VideoCard key={video.id} video={video} progress={progress} caption={caption} className="w-[280px] md:w-[340px]" />
                ))}
              </Row>
            )}
            {categories.map((category, index) => (
              <Row key={category.id} title={category.title} subtitle={index === 0 ? `${category.videos.length} épisodes` : undefined}>
                {category.videos.map((video, position) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    number={index === 0 ? position + 1 : undefined}
                    className={index === 0 ? 'w-[300px] md:w-[360px]' : undefined}
                  />
                ))}
              </Row>
            ))}
          </main>
          <footer className="flex flex-wrap justify-between gap-3 border-t border-surface-2 px-4 py-7 text-[13px] text-muted md:px-14">
            <span>© StreamFLIX</span>
          </footer>
        </>
      ) : (
        <main className={`px-4 pb-20 md:px-14 ${HEADER_OFFSET_CLASS}`}>
          <div className="flex flex-col gap-6 pt-6 md:pt-10">
            {isSearchPage && (
              <form
                role="search"
                className="md:hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = new FormData(e.currentTarget).get('q')?.toString().trim() || '';
                  navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
                }}
              >
                <label className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-surface px-4 text-muted focus-within:border-zinc-500">
                  <Search className="h-5 w-5 flex-none" aria-hidden="true" />
                  <span className="sr-only">Rechercher</span>
                  <input
                    key={query}
                    name="q"
                    type="search"
                    defaultValue={query}
                    autoFocus={!query}
                    placeholder="Titres, thèmes, chapitres"
                    className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-muted"
                  />
                </label>
              </form>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">{listing.title}</h1>
              {listing.videos.length > 0 && (
                <span className="text-sm text-muted">
                  {listing.videos.length} vidéo{listing.videos.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {renderListing()}
          </div>
        </main>
      )}

      <MobileTabBar />
    </div>
  );
};
