import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, User } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ProfileMenuProps {
  /** "avatar" dans l'en-tête, "tab" dans la barre d'onglets mobile (menu ouvert vers le haut) */
  variant?: 'avatar' | 'tab';
}

const itemClass = 'flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-zinc-200 transition hover:bg-surface-2 hover:text-white';

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ variant = 'avatar' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };

  const isTab = variant === 'tab';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={isTab ? undefined : 'Mon profil'}
        className={
          isTab
            ? `flex min-h-11 w-full flex-col items-center gap-1 py-1.5 text-[11px] font-medium ${open ? 'text-foreground' : 'text-muted'}`
            : 'grid h-11 w-11 place-items-center rounded-full bg-[#2F6BFF] text-white transition hover:brightness-110'
        }
      >
        <User className={isTab ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px]'} aria-hidden="true" />
        {isTab && 'Profil'}
      </button>

      {open && (
        <div
          id={menuId}
          className={`absolute right-0 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-2xl ${
            isTab ? 'bottom-full mb-3' : 'top-full mt-2'
          }`}
        >
          <Link to="/admin" className={itemClass} onClick={() => setOpen(false)}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Console admin
          </Link>
          <button type="button" onClick={handleSignOut} className={itemClass}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
};
