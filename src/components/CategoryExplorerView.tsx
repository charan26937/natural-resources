import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Search } from 'lucide-react';
import { RESOURCE_CATEGORIES } from '../data/curatedResources';
import type { LiveEnrichmentResult, ResourceGalleryImage, ResourceItem } from '../types/resource';
import { GlobalResourceMap } from './GlobalResourceMap';
import { ResourceImageCarousel } from './ResourceImageCarousel';
import { ResourceLiveChatStudio } from './ResourceLiveChatStudio';

interface CategoryExplorerViewProps {
  categoryName: string; // 'All' or one of RESOURCE_CATEGORIES[i].name
  catalog: ResourceItem[];
  onOpenResourceSlug: (slug: string) => void;
  onLiveSearchOpen: (query: string) => Promise<void>;
  onSelectCategory: (catName: string) => void;
  onLiveUpdate?: (updatedResource: ResourceItem | null, liveEnrichment: LiveEnrichmentResult) => void;
  onBack: () => void;
}

export const CategoryExplorerView: React.FC<CategoryExplorerViewProps> = ({
  categoryName,
  catalog,
  onOpenResourceSlug,
  onLiveSearchOpen,
  onSelectCategory,
  onLiveUpdate,
  onBack,
}) => {
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discovering, setDiscovering] = useState(false);

  const isAll = categoryName === 'All';
  const catMeta = RESOURCE_CATEGORIES.find((c) => c.name === categoryName);
  const title = isAll ? 'All Global Natural Resources' : categoryName;
  const subtitle = isAll
    ? 'Browse all verified geological, pedological, hydrological, energy, chemical, and forest resources—or use interactive chat, voice, video recording, photo upload, or online search for any resource on Earth.'
    : catMeta?.subtitle || `Explore all mapped resources and online scientific data for ${categoryName}.`;
  const bannerImage = isAll
    ? '/src/assets/images/category_rocks_petrology_1795022913942.jpg'
    : catMeta?.imageUrl || '/src/assets/images/category_minerals_crystals_1795022914352.jpg';

  const items = isAll ? catalog : catalog.filter((r) => r.category === categoryName);
  const totalSites = items.reduce((sum, r) => sum + (r.occurrences?.length || 0), 0);

  const categorySlides: ResourceGalleryImage[] = useMemo(() => {
    const slides: ResourceGalleryImage[] = [];
    const seen = new Set<string>();

    const pushImg = (slide: ResourceGalleryImage) => {
      if (!slide.url || seen.has(slide.url)) return;
      seen.add(slide.url);
      slides.push(slide);
    };

    for (const item of items) {
      if (item.imageUrl) {
        pushImg({
          url: item.imageUrl,
          title: item.name,
          caption: `${item.category} · ${item.chemicalFormula}`,
          attribution: item.imageAttribution || 'GeoAtlas Verified Reference',
          sourceUrl: item.sourceUrl || undefined,
        });
      }
      if (slides.length >= 10) break;
    }

    if (isAll) {
      for (const cat of RESOURCE_CATEGORIES) {
        pushImg({
          url: cat.imageUrl,
          title: cat.name,
          caption: cat.subtitle,
          attribution: 'GeoAtlas Category Reference',
        });
      }
    } else if (slides.length === 0) {
      pushImg({
        url: bannerImage,
        title,
        caption: subtitle,
        attribution: 'GeoAtlas Category Reference',
      });
    }

    return slides;
  }, [items, isAll, bannerImage, title, subtitle]);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = discoverQuery.trim();
    if (!trimmed) return;
    setDiscovering(true);
    try {
      await onLiveSearchOpen(trimmed);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Back Bar & Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resource Explorer</span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              isAll
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All ({catalog.length})
          </button>
          {RESOURCE_CATEGORIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelectCategory(c.name)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                categoryName === c.name
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {c.name === 'Chemical Elements & Compounds' ? 'Elements' : c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category Image Header + Below-Image Chat / Voice / Video Record / Photo Studio */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-5">
            <div>
              <div className="text-xs font-semibold text-teal-800">
                Category & Universal Research Studio
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-1.5">
                {title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">{subtitle}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono">
              <span>{items.length} cataloged resources</span>
              <span aria-hidden="true">·</span>
              <span>{totalSites} mapped localities</span>
              <span aria-hidden="true">·</span>
              <span>Unlimited online discovery enabled</span>
            </div>
          </div>

          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-900">
            <ResourceImageCarousel
              resourceName={title}
              initialImages={categorySlides}
              autoFetchQuery={items.length <= 1 ? title : undefined}
              stageClassName="h-60 sm:h-64"
              showThumbnails={true}
              autoPlay={true}
              actionLabel={items.length > 0 ? 'Open Resource' : undefined}
              onSlideAction={(slide) => {
                const matched = items.find((i) => i.name === slide.title);
                if (matched) onOpenResourceSlug(matched.slug);
              }}
            />
          </div>
        </div>

        {/* Full Multimodal Chat Bar, Voice Record, Video Record & Photo Upload directly below the image */}
        <ResourceLiveChatStudio
          resource={{
            slug: isAll ? 'all-natural-resources' : categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: title,
            category: isAll ? 'Natural Resources' : categoryName,
          }}
          onLiveUpdate={onLiveUpdate}
          onJumpToMap={() => {
            document.getElementById('category-map')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Discover & Open ANY Unlisted Mineral or Resource */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Open Any Mineral or Natural Resource Online (Not Limited to Listed Cards)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Enter any mineral, rock, soil, metal, compound, or plant (e.g., Calcite, Pyrite, Halite, Bauxite, Lithium, Dolomite, Magnetite, Peat) to fetch external scientific data & open its dedicated page.
          </p>
        </div>
        <form onSubmit={handleDiscover} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              placeholder={`Search or open any resource in ${title}…`}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>
          <button
            type="submit"
            disabled={discovering || !discoverQuery.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {discovering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching…</span>
              </>
            ) : (
              <>
                <span>Fetch & Open Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* All Resources in this Category */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            All Resources in {title} ({items.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click any card to open its full resource profile & studio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.slug}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-teal-700/70 transition-colors"
            >
              <div>
                <div className="h-36 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.imageUrl || bannerImage}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-baseline justify-between gap-2 text-white">
                    <h3 className="text-base font-bold leading-tight">{item.name}</h3>
                    <span className="text-[11px] font-mono text-slate-200 shrink-0">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {item.chemicalFormula}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-teal-700" />
                  <span>{item.occurrences?.length || 0} places mapped</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenResourceSlug(item.slug)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open Studio</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Distribution Map */}
      <div id="category-map" className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">
          {title} Global Distribution & Climate Overlay
        </h2>
        <GlobalResourceMap
          resources={items}
          onSelectResource={(slug) => onOpenResourceSlug(slug)}
          heightClass="h-[460px]"
        />
      </div>
    </div>
  );
};
