import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Loader2,
  MoveHorizontal,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import type { ResourceGalleryImage } from '../types/resource';

interface ResourceImageCarouselProps {
  resourceName: string;
  initialImages?: ResourceGalleryImage[];
  autoFetchQuery?: string;
  stageClassName?: string;
  showThumbnails?: boolean;
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  actionLabel?: string;
  onSlideAction?: (slide: ResourceGalleryImage) => void;
}

export const ResourceImageCarousel: React.FC<ResourceImageCarouselProps> = ({
  resourceName,
  initialImages = [],
  autoFetchQuery,
  stageClassName = 'h-64 sm:h-72',
  showThumbnails = true,
  autoPlay = true,
  autoPlayIntervalMs = 5000,
  actionLabel,
  onSlideAction,
}) => {
  const [fetchedImages, setFetchedImages] = useState<ResourceGalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Interactive 360° specimen turntable state
  const [view360, setView360] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [autoRotate360, setAutoRotate360] = useState(true);
  const [isDragging360, setIsDragging360] = useState(false);
  const dragStartRef = useRef<{ x: number; startDeg: number } | null>(null);

  // Merge initial slides + Wikimedia fetched slides without duplicates or broken URLs
  const slides = useMemo(() => {
    const merged: ResourceGalleryImage[] = [];
    const seen = new Set<string>();

    for (const img of [...initialImages, ...fetchedImages]) {
      if (!img?.url || brokenUrls.has(img.url)) continue;
      const normalized = img.url.split('?')[0];
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(img);
    }
    return merged;
  }, [initialImages, fetchedImages, brokenUrls]);

  // Reset active slide and 360 rotation when resource query changes
  useEffect(() => {
    setActiveIndex(0);
    setRotationDeg(0);
    setFetchedImages([]);
    setBrokenUrls(new Set());
  }, [resourceName, autoFetchQuery]);

  // Keep activeIndex in bounds if slides shrink
  useEffect(() => {
    if (slides.length > 0 && activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  // Automatically fetch multi-angle gallery when enabled & <= 1 initial images exist
  useEffect(() => {
    if (!autoFetchQuery) return;
    const validInitial = initialImages.filter((i) => i?.url && !brokenUrls.has(i.url));
    if (validInitial.length >= 4) return;

    let cancelled = false;
    setLoadingGallery(true);

    fetch(`/api/resources/images?q=${encodeURIComponent(autoFetchQuery)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { images?: ResourceGalleryImage[] };
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          setFetchedImages(data.images);
        }
      })
      .catch(() => {
        // Non-fatal: keep initialImages if gallery fetch fails
      })
      .finally(() => {
        if (!cancelled) setLoadingGallery(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoFetchQuery, initialImages.length]);

  // Auto-advance standard slideshow
  useEffect(() => {
    if (view360 || !autoPlay || isPaused || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, autoPlayIntervalMs);
    return () => window.clearInterval(id);
  }, [view360, autoPlay, isPaused, slides.length, autoPlayIntervalMs]);

  // Smooth continuous 360° turntable auto-rotation when active
  useEffect(() => {
    if (!view360 || !autoRotate360 || isDragging360 || slides.length === 0) return;
    const id = window.setInterval(() => {
      setRotationDeg((prev) => (prev + 1.5) % 360);
    }, 40);
    return () => window.clearInterval(id);
  }, [view360, autoRotate360, isDragging360, slides.length]);

  // Compute slide index & 3D perspective angle corresponding to current 360° angle
  const effectiveIndex = useMemo(() => {
    if (!view360 || slides.length <= 1) return activeIndex;
    const sectorSize = 360 / slides.length;
    const normalizedDeg = rotationDeg >= 360 ? rotationDeg % 360 : rotationDeg;
    return Math.floor(normalizedDeg / sectorSize) % slides.length;
  }, [view360, rotationDeg, slides.length, activeIndex]);

  const currentSlide = slides[effectiveIndex] ?? slides[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (slides.length <= 1) return;
    if (view360) {
      const step = Math.round(360 / slides.length);
      setRotationDeg((prev) => (prev - step + 360) % 360);
      return;
    }
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (slides.length <= 1) return;
    if (view360) {
      const step = Math.round(360 / slides.length);
      setRotationDeg((prev) => (prev + step) % 360);
      return;
    }
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const handleImageError = (url: string) => {
    setBrokenUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  // Pointer drag handlers for 360° rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!view360 || slides.length === 0) return;
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging360(true);
    dragStartRef.current = { x: e.clientX, startDeg: rotationDeg };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!view360 || !isDragging360 || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const nextDeg = (dragStartRef.current.startDeg + dx * 0.75) % 360;
    setRotationDeg(nextDeg < 0 ? nextDeg + 360 : nextDeg);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging360) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging360(false);
    dragStartRef.current = null;
  };

  // Compute gentle 3D turntable yaw and lighting offset within current angle sector
  const sectorProgress = useMemo(() => {
    if (!view360) return 0;
    const sectorSize = 360 / Math.max(1, slides.length);
    const localDeg = rotationDeg % sectorSize;
    return localDeg / sectorSize - 0.5; // -0.5 to +0.5
  }, [view360, rotationDeg, slides.length]);

  const rotateYDeg = view360 ? sectorProgress * 22 : 0;
  const panXPercent = view360 ? 50 + Math.sin((rotationDeg * Math.PI) / 180) * 14 : 50;
  const sheenOffsetPct = view360 ? 50 + sectorProgress * 70 : 50;

  return (
    <div
      className="flex flex-col bg-slate-100 select-none outline-none"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
      }}
      aria-label={`${resourceName} image viewer`}
    >
      {/* Main Carousel / 360° Turntable Stage */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full overflow-hidden bg-slate-900 ${stageClassName} ${
          view360 ? (isDragging360 ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        style={view360 ? { touchAction: 'none' } : undefined}
      >
        {currentSlide ? (
          <>
            <div
              className="w-full h-full transition-transform duration-75 will-change-transform"
              style={
                view360
                  ? {
                      transform: `perspective(1100px) rotateY(${rotateYDeg.toFixed(2)}deg) scale(1.08)`,
                    }
                  : undefined
              }
            >
              <img
                key={currentSlide.url}
                src={currentSlide.url}
                alt={currentSlide.caption || currentSlide.title || resourceName}
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => handleImageError(currentSlide.url)}
                className="w-full h-full object-cover transition-opacity duration-300"
                style={
                  view360
                    ? { objectPosition: `${panXPercent.toFixed(1)}% 50%` }
                    : undefined
                }
              />
            </div>
            {view360 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at ${sheenOffsetPct.toFixed(1)}% 38%, rgba(255,255,255,0.16), transparent 55%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-slate-950/25 pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
            <Globe2 className="w-9 h-9 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">{resourceName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {loadingGallery ? 'Loading specimen photographs…' : 'Scientific Atlas Specimen'}
            </p>
          </div>
        )}

        {/* Top Left Slide Counter & Angle / Gallery Status */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-md bg-slate-950/75 backdrop-blur-xs text-white text-[11px] font-mono tabular-nums">
            {view360
              ? `360° · ${Math.round(rotationDeg)}°`
              : slides.length > 0
              ? `${effectiveIndex + 1} / ${slides.length}`
              : '0 / 0'}
          </span>
          {view360 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950/70 text-teal-200 text-[10px] font-medium">
              <MoveHorizontal className="w-3 h-3" />
              <span>Drag to orbit</span>
            </span>
          )}
          {loadingGallery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-900/80 text-white text-[10px] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading gallery</span>
            </span>
          )}
        </div>

        {/* Top Right Controls: 360° Toggle + Auto/Pause */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {slides.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView360((v) => !v);
              }}
              title={view360 ? 'Switch to standard photo view' : 'Switch to interactive 360° view'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                view360
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
                  : 'bg-slate-950/75 hover:bg-slate-950/90 text-white'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>{view360 ? '360° Active' : '360° View'}</span>
            </button>
          )}

          {view360 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoRotate360((r) => !r);
                }}
                title={autoRotate360 ? 'Pause 360° rotation' : 'Resume 360° rotation'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950/75 hover:bg-slate-950/90 text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                {autoRotate360 ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoRotate360 ? 'Pause' : 'Spin'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRotationDeg(0);
                }}
                title="Reset 360° angle to 0°"
                className="inline-flex items-center justify-center p-1 rounded-md bg-slate-950/75 hover:bg-slate-950/90 text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </>
          ) : (
            slides.length > 1 && (
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                title={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950/75 hover:bg-slate-950/90 text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? 'Play' : 'Auto'}</span>
              </button>
            )
          )}
        </div>

        {/* Prev / Next Navigation Buttons */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous resource image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-950/65 hover:bg-slate-950/90 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next resource image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-950/65 hover:bg-slate-950/90 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom Caption, Attribution & Optional Slide Action */}
        {currentSlide && (
          <div className="absolute bottom-0 inset-x-0 z-10 px-4 py-3 flex items-end justify-between gap-3 text-white pointer-events-auto">
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">
                {currentSlide.title || resourceName}
              </div>
              {currentSlide.caption && (
                <p className="text-[11px] text-slate-200 line-clamp-1 mt-0.5">
                  {currentSlide.caption}
                </p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                {currentSlide.attribution && (
                  <span className="truncate max-w-[220px]">{currentSlide.attribution}</span>
                )}
                {currentSlide.sourceUrl && (
                  <a
                    href={currentSlide.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-teal-300 hover:underline shrink-0"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            {onSlideAction && actionLabel && (
              <button
                type="button"
                onClick={() => onSlideAction(currentSlide)}
                className="px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 360° Degree Scrubber Bar (shown in 360° mode) */}
      {view360 && slides.length > 0 && (
        <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center gap-3 text-[11px] text-slate-300">
          <span className="font-mono text-teal-300 shrink-0 tabular-nums w-12">
            {Math.round(rotationDeg)}°
          </span>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.min(360, Math.round(rotationDeg))}
            onChange={(e) => {
              setAutoRotate360(false);
              setRotationDeg(Number(e.target.value));
            }}
            aria-label={`Rotate ${resourceName} 360 degree view`}
            className="flex-1 accent-teal-500 cursor-pointer h-1.5"
          />
          <span className="font-mono text-[10px] text-slate-400 shrink-0">0°–360°</span>
        </div>
      )}

      {/* Thumbnail Strip */}
      {showThumbnails && slides.length > 1 && (
        <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          {slides.map((slide, idx) => {
            const active = idx === effectiveIndex;
            return (
              <button
                key={`${slide.url}-${idx}`}
                type="button"
                onClick={() => {
                  if (view360) {
                    setAutoRotate360(false);
                    setRotationDeg(Math.round((idx / slides.length) * 360));
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                title={slide.title}
                className={`relative w-12 h-9 rounded overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  active
                    ? 'border-teal-400 scale-105 opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-95'
                }`}
              >
                <img
                  src={slide.url}
                  alt={slide.title || `${resourceName} thumbnail ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() => handleImageError(slide.url)}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

