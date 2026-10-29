import React, { useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RowProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const arrowClass =
  'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-background/85 text-foreground opacity-0 backdrop-blur transition hover:bg-surface focus-visible:opacity-100 group-hover/row:opacity-100 md:grid';

export const Row: React.FC<RowProps> = ({ title, subtitle, children }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const scroll = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby={headingId} className="group/row flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 px-4 md:px-14">
        <h2 id={headingId} className="font-display text-xl font-bold tracking-tight md:text-[22px]">
          {title}
        </h2>
        {subtitle && <span className="text-sm font-medium text-muted">{subtitle}</span>}
      </div>

      <div className="relative">
        <div ref={rowRef} className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1 md:gap-5 md:px-14">
          {children}
        </div>
        <button type="button" aria-label={`Défiler « ${title} » vers la gauche`} onClick={() => scroll(-1)} className={`${arrowClass} left-3`}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Défiler « ${title} » vers la droite`} onClick={() => scroll(1)} className={`${arrowClass} right-3`}>
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
