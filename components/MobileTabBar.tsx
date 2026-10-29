import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Bookmark, House, Search } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

const TabLink: React.FC<{ to: string; active: boolean; label: string; icon: React.ReactNode }> = ({ to, active, label, icon }) => (
  <Link
    to={to}
    aria-current={active ? 'page' : undefined}
    className={`flex min-h-11 flex-col items-center gap-1 py-1.5 text-[11px] ${active ? 'font-semibold text-foreground' : 'font-medium text-muted'}`}
  >
    {icon}
    {label}
  </Link>
);

/** Navigation principale sur téléphone (remplace les liens de l'en-tête sous md). */
export const MobileTabBar = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');
  const iconClass = 'h-[22px] w-[22px]';

  return (
    <nav
      aria-label="Onglets"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-surface-2 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur md:hidden"
    >
      <TabLink to="/" active={location.pathname === '/' && !section} label="Accueil" icon={<House className={iconClass} aria-hidden="true" />} />
      <TabLink to="/search" active={location.pathname === '/search'} label="Rechercher" icon={<Search className={iconClass} aria-hidden="true" />} />
      <TabLink to="/?section=ma-liste" active={section === 'ma-liste'} label="Ma liste" icon={<Bookmark className={iconClass} aria-hidden="true" />} />
      <ProfileMenu variant="tab" />
    </nav>
  );
};
