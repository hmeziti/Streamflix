import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getSectionLink, isSectionId, SECTIONS } from '../utils/sections';
import { ProfileMenu } from './ProfileMenu';

// Hauteur de l'en-tête fixe : ligne principale (56 / 84 px) + puces de sections sous xl (48 px)
export const HEADER_OFFSET_CLASS = 'pt-[104px] md:pt-[132px] xl:pt-[84px]';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const navigate = useNavigate();
  const location = useLocation();

  const sectionParam = searchParams.get('section');
  const activeSection = location.pathname === '/' ? (isSectionId(sectionParam) ? sectionParam : 'home') : null;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Le champ suit l'URL (retour arrière, clic sur le logo...)
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/');
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        isScrolled ? 'border-b border-white/5 bg-background/95 backdrop-blur' : 'bg-linear-to-b from-background/80 to-transparent'
      }`}
    >
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:h-[84px] md:px-14">
        <div className="flex items-center gap-9">
          <Link to="/" className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-primary md:text-[26px]">
            STREAMFLIX
          </Link>
          <nav aria-label="Navigation principale" className="hidden xl:block">
            <ul className="flex gap-6 text-sm font-medium">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <Link
                      to={getSectionLink(section.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`whitespace-nowrap transition ${isActive ? 'font-semibold text-foreground' : 'text-muted hover:text-foreground'}`}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <form role="search" onSubmit={handleSearch}>
            <label className="flex h-11 w-[280px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-muted transition focus-within:border-zinc-500">
              <Search className="h-[18px] w-[18px] flex-none" aria-hidden="true" />
              <span className="sr-only">Rechercher</span>
              <input
                type="search"
                placeholder="Titres, thèmes, chapitres"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted"
              />
            </label>
          </form>
          <ProfileMenu />
        </div>
      </div>

      <nav aria-label="Sections" className="no-scrollbar flex h-12 items-center gap-2 overflow-x-auto px-4 md:px-14 xl:hidden">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Link
              key={section.id}
              to={getSectionLink(section.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex h-9 flex-none items-center rounded-full px-4 text-sm transition ${
                isActive ? 'bg-foreground font-semibold text-background' : 'border border-line font-medium text-foreground hover:border-zinc-500'
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
