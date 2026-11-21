import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AiResourceScanner } from './components/AiResourceScanner';
import { BrandLogo } from './components/BrandLogo';
import { CategoryExplorerView } from './components/CategoryExplorerView';
import { GlobalResourceMap, type MapFocusPoint } from './components/GlobalResourceMap';
import { ResourceDetailsView } from './components/ResourceDetailsView';
import { ResourceImageCarousel } from './components/ResourceImageCarousel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RESOURCE_CATEGORIES } from './data/curatedResources';
import type {
  LiveEnrichmentResult,
  LiveMarketSeriesPayload,
  ResourceGalleryImage,
  ResourceItem,
  SavedResourceRecord,
  ScanHistoryRecord,
} from './types/resource';

type ActiveView = 'home' | 'details' | 'saved' | 'category';

const QUICK_SEARCHES = ['Gold', 'Red Soil', 'Quartz', 'Diamond', 'Lithium', 'Bamboo'];

const HERO_SHOWCASE_SLIDES: Array<ResourceGalleryImage & { categoryTarget?: string; slugTarget?: string }> = [
  {
    url: '/src/assets/images/category_rocks_petrology_1795022913942.jpg',
    title: 'Global Petrology & Rocks',
    caption: 'Granite, marble, basalt, limestone + unlimited online Scientific Archive, Wikidata & USGS discovery',
    attribution: 'GeoAtlas Petrology Reference Plate',
    categoryTarget: 'Rocks',
  },
  {
    url: '/src/assets/images/category_minerals_crystals_1795022914352.jpg',
    title: 'Crystalline Minerals & Silicates',
    caption: 'Quartz crystals, selenite gypsum, muscovite mica, and orthoclase feldspar',
    attribution: 'GeoAtlas Mineralogical Specimen Plate',
    categoryTarget: 'Minerals',
  },
  {
    url: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    title: 'Metallic Ores & Rare Elements',
    caption: 'Gold, copper, lithium, rubidium, tungsten, and critical industrial deposits',
    attribution: 'Global Ore Collection',
    categoryTarget: 'Metals',
  },
  {
    url: '/src/assets/images/category_gemstones_specimens_1795022915103.jpg',
    title: 'Precious Gemstones & Crystals',
    caption: 'Octahedral diamond, crimson ruby, hexagonal emerald, and royal sapphire',
    attribution: 'GeoAtlas Gemological Specimen Plate',
    categoryTarget: 'Gemstones',
  },
  {
    url: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
    title: 'Chemical Elements & Compounds',
    caption: 'Hydrogen, oxygen, carbon allotropes, and atmospheric reference species',
    attribution: 'GeoAtlas Chemical & Element Plate',
    categoryTarget: 'Chemical Elements & Compounds',
  },
  {
    url: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
    title: 'Soil Horizons & Agricultural Earths',
    caption: 'Black soil (Chernozem / Vertisol), red soil, alluvial plains, and laterite horizons',
    attribution: 'GeoAtlas Pedology Profile Plate',
    categoryTarget: 'Soil',
  },
  {
    url: '/src/assets/images/category_water_resources_1795022583595.jpg',
    title: 'Water Resources & Continental Basins',
    caption: 'Major river corridors, freshwater rift lakes, and deep subterranean aquifers',
    attribution: 'GeoAtlas Hydrological Basin Plate',
    categoryTarget: 'Water Resources',
  },
  {
    url: '/src/assets/images/category_energy_resources_1795022584749.jpg',
    title: 'Energy Resources & Sedimentary Reserves',
    caption: 'Coal basins, crude petroleum reservoirs, and conventional natural gas plays',
    attribution: 'GeoAtlas Energy & Sedimentary Plate',
    categoryTarget: 'Energy Resources',
  },
  {
    url: '/src/assets/images/category_forest_resources_1795022583901.jpg',
    title: 'Forest Resources & Botanical Stocks',
    caption: 'Structural timberlands, rapid-growth bamboo groves, and medicinal flora biomes',
    attribution: 'GeoAtlas Forestry & Canopy Plate',
    categoryTarget: 'Forest Resources',
  },
];

async function safeReadJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function ExplorerShell() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    logout,
    getIdToken,
  } = useAuth();

  const [view, setView] = useState<ActiveView>('home');
  const [categoryPageName, setCategoryPageName] = useState<string>('All');
  const [catalog, setCatalog] = useState<ResourceItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [focusedResource, setFocusedResource] = useState<ResourceItem | null>(null);
  const [focusedSpot, setFocusedSpot] = useState<MapFocusPoint | null>(null);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('All');
  const [detailResource, setDetailResource] = useState<ResourceItem | null>(null);
  const [liveEnrichment, setLiveEnrichment] = useState<LiveEnrichmentResult | null>(null);

  const [savedItems, setSavedItems] = useState<SavedResourceRecord[]>([]);
  const [scanHistoryItems, setScanHistoryItems] = useState<ScanHistoryRecord[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [marketBenchmarks, setMarketBenchmarks] = useState<LiveMarketSeriesPayload[]>([]);
  const [marketFetchedAt, setMarketFetchedAt] = useState<string | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const loadMarketBenchmarks = useCallback(async (forceRefresh = false) => {
    setMarketLoading(true);
    try {
      const res = await fetch(`/api/analytics/market-overview${forceRefresh ? '?refresh=1' : ''}`);
      if (!res.ok) return;
      const json = await safeReadJson<{
        benchmarks?: LiveMarketSeriesPayload[];
        fetchedAt?: string;
      }>(res);
      if (json && Array.isArray(json.benchmarks)) {
        setMarketBenchmarks(json.benchmarks);
        setMarketFetchedAt(json.fetchedAt || null);
      }
    } catch {
      // Non-fatal
    } finally {
      setMarketLoading(false);
    }
  }, []);

  // Load curated + discovered catalog from Cloud SQL PostgreSQL
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await fetch('/api/resources');
      const data = await safeReadJson<{ resources?: ResourceItem[]; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error || `Failed to load resource catalog (HTTP ${res.status}).`);
      }
      setCatalog(data?.resources || []);
    } catch (err: unknown) {
      setCatalogError(err instanceof Error ? err.message : 'Unable to reach server.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const syncBrowserUrl = useCallback(
    (
      nextView: ActiveView,
      opts?: { slug?: string; category?: string; replace?: boolean }
    ) => {
      const url = new URL(window.location.href);
      url.searchParams.delete('resource');
      url.searchParams.delete('category');
      url.searchParams.delete('view');

      if (nextView === 'details' && opts?.slug) {
        url.searchParams.set('resource', opts.slug);
      } else if (nextView === 'category' && opts?.category) {
        url.searchParams.set('category', opts.category);
      } else if (nextView === 'saved') {
        url.searchParams.set('view', 'saved');
      }

      const nextRelative = `${url.pathname}${url.search}${url.hash}`;
      const currentRelative = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextRelative === currentRelative) return;

      if (opts?.replace) {
        window.history.replaceState(null, '', nextRelative);
      } else {
        window.history.pushState(null, '', nextRelative);
      }
    },
    []
  );

  useEffect(() => {
    loadCatalog();
    loadMarketBenchmarks(false);
  }, [loadCatalog, loadMarketBenchmarks]);

  // Load user's Cloud SQL saved bookmarks & AI scan history when authenticated
  const loadUserWorkspace = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      setScanHistoryItems([]);
      return;
    }
    setUserLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [savedRes, scansRes] = await Promise.all([
        fetch('/api/user/saved', { headers }),
        fetch('/api/user/scans', { headers }),
      ]);

      if (savedRes.ok) {
        const sData = await safeReadJson<{ saved?: SavedResourceRecord[] }>(savedRes);
        setSavedItems(sData?.saved || []);
      }
      if (scansRes.ok) {
        const scData = await safeReadJson<{ scans?: ScanHistoryRecord[] }>(scansRes);
        setScanHistoryItems(scData?.scans || []);
      }
    } catch (err) {
      console.error('Failed to load user workspace:', err);
    } finally {
      setUserLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    loadUserWorkspace();
  }, [loadUserWorkspace]);

  const savedSlugs = useMemo(
    () => new Set(savedItems.map((item) => item.resourceSlug)),
    [savedItems]
  );

  // Filtered catalog for the map & directory
  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'All') return catalog;
    return catalog.filter((r) => r.category === selectedCategory);
  }, [catalog, selectedCategory]);

  // Global analytics summary aggregated from PostgreSQL catalog
  const categoryAnalytics = useMemo(() => {
    return RESOURCE_CATEGORIES.map((cat) => {
      const items = catalog.filter((r) => r.category === cat.name);
      const totalSites = items.reduce((acc, r) => acc + (r.occurrences?.length || 0), 0);
      const avgScarcity =
        items.length > 0
          ? Math.round(
              items.reduce((acc, r) => acc + (r.availabilityMetrics?.scarcityIndex || 0), 0) /
                items.length
            )
          : 0;
      return {
        category: cat.name.replace('Chemical Elements & Compounds', 'Elements & Compounds'),
        resources: items.length,
        localities: totalSites,
        scarcity: avgScarcity,
      };
    });
  }, [catalog]);

  // Execute live search against backend + external scientific APIs
  const executeLiveSearch = async (queryText: string, openDetailsAfter = false) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    setSearchQuery(trimmed);
    setSearching(true);
    setSearchError(null);
    setAuthNotice(null);

    try {
      const res = await fetch(`/api/resources/search?q=${encodeURIComponent(trimmed)}`);
      const data = await safeReadJson<{
        resource?: ResourceItem;
        liveEnrichment?: LiveEnrichmentResult | null;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data?.error || `Resource search failed (HTTP ${res.status}).`);
      }

      setLiveEnrichment(data?.liveEnrichment || null);

      if (data?.resource) {
        const found: ResourceItem = data.resource;
        setFocusedResource(found);
        setFocusedSpot(null);
        setSelectedCountryFilter('All');
        setSelectedCategory('All');

        // Merge newly discovered or enriched resource into catalog state
        setCatalog((prev) => {
          const exists = prev.some((item) => item.slug === found.slug);
          if (exists) {
            return prev.map((item) => (item.slug === found.slug ? found : item));
          }
          return [found, ...prev];
        });

        if (openDetailsAfter) {
          setDetailResource(found);
          setView('details');
          syncBrowserUrl('details', { slug: found.slug });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        setFocusedResource(null);
        setSearchError(
          `No verified scientific record matched "${trimmed}" across Cloud SQL, online scientific references, Wikidata, Macrostrat, or PubChem.`
        );
      }
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Online search encountered a network or rate-limit issue.'
      );
    } finally {
      setSearching(false);
    }
  };

  const openResourceBySlug = useCallback(
    async (slug: string, fetchLive = false, options?: { skipPushState?: boolean }) => {
      setSearchError(null);
      const localMatch = catalog.find((r) => r.slug === slug);
      const shouldFetchLive = fetchLive || !localMatch || localMatch.occurrences.length === 0;
      if (localMatch) {
        setDetailResource(localMatch);
        setFocusedResource(localMatch);
        setLiveEnrichment(null);
        setView('details');
        if (!options?.skipPushState) {
          syncBrowserUrl('details', { slug: localMatch.slug });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      try {
        const url = `/api/resources/${encodeURIComponent(slug)}${shouldFetchLive ? '?live=1' : ''}`;
        const res = await fetch(url);
        const data = await safeReadJson<{
          resource?: ResourceItem;
          liveEnrichment?: LiveEnrichmentResult | null;
          error?: string;
        }>(res);
        if (!res.ok || !data?.resource) {
          throw new Error(data?.error || `Could not load resource profile (HTTP ${res.status}).`);
        }
        setDetailResource(data.resource);
        setFocusedResource(data.resource);
        setCatalog((prev) =>
          prev.some((item) => item.slug === data.resource!.slug)
            ? prev.map((item) => (item.slug === data.resource!.slug ? data.resource! : item))
            : [data.resource!, ...prev]
        );
        if (data.liveEnrichment) {
          setLiveEnrichment(data.liveEnrichment);
        }
        if (!localMatch) {
          setView('details');
          if (!options?.skipPushState) {
            syncBrowserUrl('details', { slug: data.resource.slug });
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err: unknown) {
        if (!localMatch) {
          setSearchError(err instanceof Error ? err.message : 'Unable to open resource.');
        }
      }
    },
    [catalog, syncBrowserUrl]
  );

  // Restore view from URL query parameters on initial load & browser Back/Forward
  useEffect(() => {
    const applyLocationRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const resourceSlug = params.get('resource');
      const categoryParam = params.get('category');
      const viewParam = params.get('view');

      if (resourceSlug) {
        void openResourceBySlug(resourceSlug, false, { skipPushState: true });
      } else if (categoryParam) {
        setCategoryPageName(categoryParam);
        setView('category');
      } else if (viewParam === 'saved') {
        setView('saved');
      } else {
        setView('home');
      }
    };

    applyLocationRoute();
    window.addEventListener('popstate', applyLocationRoute);
    return () => window.removeEventListener('popstate', applyLocationRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshLiveOnDetails = async (resourceName: string) => {
    await executeLiveSearch(resourceName, true);
  };

  const handleChatLiveUpdate = (
    updatedResource: ResourceItem | null,
    enrichment: LiveEnrichmentResult
  ) => {
    setLiveEnrichment(enrichment);
    if (updatedResource) {
      setDetailResource(updatedResource);
      setFocusedResource(updatedResource);
      setCatalog((prev) =>
        prev.some((item) => item.slug === updatedResource.slug)
          ? prev.map((item) => (item.slug === updatedResource.slug ? updatedResource : item))
          : [updatedResource, ...prev]
      );
    }
  };

  const openCategoryExplorer = (catName: string) => {
    setCategoryPageName(catName);
    setView('category');
    syncBrowserUrl('category', { category: catName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateHome = () => {
    setView('home');
    syncBrowserUrl('home');
  };

  const navigateSaved = () => {
    setView('saved');
    syncBrowserUrl('saved');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSave = async (resource: ResourceItem) => {
    setAuthNotice(null);
    if (!user) {
      setAuthNotice('Sign in with Google to save resources to your Cloud SQL atlas.');
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setAuthNotice('Unable to verify your session token. Please sign in again to save bookmarks.');
        return;
      }

      if (savedSlugs.has(resource.slug)) {
        const res = await fetch(`/api/user/saved/${encodeURIComponent(resource.slug)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await safeReadJson<{ error?: string }>(res);
          throw new Error(errData?.error || 'Could not remove saved bookmark.');
        }
        setSavedItems((prev) => prev.filter((item) => item.resourceSlug !== resource.slug));
      } else {
        const res = await fetch('/api/user/saved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            resourceSlug: resource.slug,
            resourceName: resource.name,
            category: resource.category,
          }),
        });
        if (!res.ok) {
          const errData = await safeReadJson<{ error?: string }>(res);
          throw new Error(errData?.error || 'Could not save bookmark.');
        }
        await loadUserWorkspace();
      }
    } catch (err: unknown) {
      setAuthNotice(err instanceof Error ? err.message : 'Unable to update saved resource.');
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (view !== 'home') {
      navigateHome();
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearFocus = () => {
    setFocusedResource(null);
    setFocusedSpot(null);
    setSelectedCountryFilter('All');
    setLiveEnrichment(null);
    setSearchQuery('');
    setSearchError(null);
  };

  const focusedCountryGroups = useMemo(() => {
    if (!focusedResource) return [];
    const groups = new Map<string, ResourceItem['occurrences']>();
    for (const occ of focusedResource.occurrences || []) {
      const country = occ.country || 'International';
      const list = groups.get(country) ?? [];
      list.push(occ);
      groups.set(country, list);
    }
    return Array.from(groups.entries()).map(([country, sites]) => ({
      country,
      sites,
    }));
  }, [focusedResource]);

  const mapFocusedResource = useMemo(() => {
    if (!focusedResource) return null;
    if (selectedCountryFilter === 'All') return focusedResource;
    return {
      ...focusedResource,
      occurrences: (focusedResource.occurrences || []).filter(
        (o) => (o.country || 'International') === selectedCountryFilter
      ),
    };
  }, [focusedResource, selectedCountryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand logo emblem + wordmark */}
          <button
            type="button"
            onClick={() => {
              navigateHome();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base lg:text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer group"
          >
            <BrandLogo size={34} className="transition-transform duration-200 group-hover:scale-105" />
            <span>Global Natural Resources Explorer</span>
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('categories')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('global-map')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Global Map
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('scanner')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI Scanner
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('analytics')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={navigateSaved}
              className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'saved' ? 'text-teal-800 font-semibold' : ''
              }`}
            >
              Saved
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {authLoading ? (
              <span className="text-xs text-slate-400 whitespace-nowrap">Loading…</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="max-w-[140px] truncate">{user.displayName || user.email}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthNotice(null);
                  void signInWithGoogle();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile navigation strip */}
        <nav className="flex md:hidden items-center gap-4 overflow-x-auto px-6 py-2 border-t border-slate-100 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => scrollToSection('categories')}
            className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Explore
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('global-map')}
            className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Global Map
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('scanner')}
            className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI Scanner
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('analytics')}
            className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={navigateSaved}
            className={`hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'saved' ? 'text-teal-800 font-semibold' : ''
            }`}
          >
            Saved
          </button>
        </nav>
      </header>

      {(authError || authNotice) && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3 max-w-full">
          <span>{authError || authNotice}</span>
          <button
            type="button"
            onClick={() => {
              setAuthNotice(null);
              clearAuthError();
            }}
            aria-label="Dismiss notice"
            className="text-amber-700 hover:text-amber-900 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8">
        {view === 'details' && detailResource ? (
          <ResourceDetailsView
            resource={detailResource}
            liveEnrichment={liveEnrichment}
            isSaved={savedSlugs.has(detailResource.slug)}
            onToggleSave={handleToggleSave}
            onRefreshLive={handleRefreshLiveOnDetails}
            onResourceUpdated={handleChatLiveUpdate}
            onBack={navigateHome}
          />
        ) : view === 'category' ? (
          <CategoryExplorerView
            categoryName={categoryPageName}
            catalog={catalog}
            onOpenResourceSlug={(slug) => openResourceBySlug(slug, true)}
            onLiveSearchOpen={async (query) => {
              await executeLiveSearch(query, true);
            }}
            onSelectCategory={(catName) => {
              setCategoryPageName(catName);
              syncBrowserUrl('category', { category: catName });
            }}
            onLiveUpdate={handleChatLiveUpdate}
            onBack={navigateHome}
          />
        ) : view === 'saved' ? (
          <section className="space-y-8 pb-16">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  Saved Atlas Bookmarks & AI Scan Log
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Persisted in Cloud SQL PostgreSQL for your authenticated field research account.
                </p>
              </div>
              <button
                type="button"
                onClick={navigateHome}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Back to Explorer
              </button>
            </div>

            {!user ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4 max-w-xl mx-auto">
                <Bookmark className="w-8 h-8 text-teal-700 mx-auto" />
                <h2 className="text-lg font-bold text-slate-900">
                  Sign in to sync saved resources & specimen scans
                </h2>
                <p className="text-sm text-slate-600">
                  Authenticate with Google to bookmark geological deposits, minerals, and AI scanner identifications to your personal PostgreSQL workspace.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthNotice(null);
                    void signInWithGoogle();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : userLoading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                <span>Loading saved records from Cloud SQL…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Saved Resources</h2>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {savedItems.length} saved
                    </span>
                  </div>
                  {savedItems.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      No resources bookmarked yet. Open any resource profile and click &ldquo;Save Resource&rdquo;.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {savedItems.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => openResourceBySlug(item.resourceSlug)}
                              className="text-sm font-semibold text-slate-900 hover:text-teal-800 transition-colors text-left cursor-pointer"
                            >
                              {item.resourceName}
                            </button>
                            <div className="text-xs text-slate-500">
                              {item.category} · Saved {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openResourceBySlug(item.resourceSlug)}
                              className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const token = await getIdToken();
                                  if (!token) {
                                    setAuthNotice('Please sign in again to manage bookmarks.');
                                    return;
                                  }
                                  const res = await fetch(
                                    `/api/user/saved/${encodeURIComponent(item.resourceSlug)}`,
                                    {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${token}` },
                                    }
                                  );
                                  if (!res.ok) {
                                    const errData = await safeReadJson<{ error?: string }>(res);
                                    throw new Error(
                                      errData?.error || 'Could not remove saved bookmark.'
                                    );
                                  }
                                  setSavedItems((prev) =>
                                    prev.filter((s) => s.resourceSlug !== item.resourceSlug)
                                  );
                                } catch (err: unknown) {
                                  setAuthNotice(
                                    err instanceof Error
                                      ? err.message
                                      : 'Unable to remove saved bookmark.'
                                  );
                                }
                              }}
                              title="Remove bookmark"
                              className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">AI Scanner Log</h2>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {scanHistoryItems.length} scans
                    </span>
                  </div>
                  {scanHistoryItems.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      No AI specimen scans logged while signed in yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {scanHistoryItems.map((scan) => (
                        <div key={scan.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {scan.predictedName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {scan.category} · {scan.confidenceLabel} ({scan.confidencePct}%)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (scan.analysisJson?.matchedSlug) {
                                openResourceBySlug(scan.analysisJson.matchedSlug);
                              } else {
                                navigateHome();
                                executeLiveSearch(scan.predictedName, true);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* HOMEPAGE EXPLORER */
          <div className="space-y-12 pb-16">
            {/* Hero + Smart Resource Search */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-7 p-6 lg:p-10 flex flex-col justify-between space-y-7">
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-teal-800">
                      Unified Earth Sciences Observatory · USGS, Wikidata, Macrostrat, PubChem & World Bank
                    </p>
                    <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 leading-[1.12] [text-wrap:balance]">
                      Explore, identify, and map Earth’s natural resources.
                    </h1>
                    <p className="text-sm lg:text-base text-slate-600 leading-relaxed max-w-2xl">
                      Search verified geological deposits, mineral properties, soil horizons, freshwater basins, energy reserves, and forest systems—or scan field specimens with AI visual triage.
                    </p>
                  </div>

                  {/* Smart Global Search Form */}
                  <div className="space-y-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        executeLiveSearch(searchQuery, false);
                      }}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search any resource or mineral (e.g., Gold, Red Soil, Quartz, Lithium, Malachite)…"
                          aria-label="Search global natural resources"
                          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {searching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Searching…</span>
                          </>
                        ) : (
                          <span>Search</span>
                        )}
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500">Quick searches:</span>
                      {QUICK_SEARCHES.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => executeLiveSearch(term, false)}
                          className="px-2.5 py-1 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>

                    {searchError && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{searchError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between">
                  <ResourceImageCarousel
                    resourceName="Earth Natural Resources"
                    initialImages={HERO_SHOWCASE_SLIDES}
                    stageClassName="h-64 sm:h-72 lg:h-[320px]"
                    showThumbnails={true}
                    autoPlay={true}
                    autoPlayIntervalMs={4500}
                    actionLabel="Explore →"
                    onSlideAction={(slide) => {
                      const heroMeta = HERO_SHOWCASE_SLIDES.find((h) => h.url === slide.url);
                      if (heroMeta?.slugTarget) {
                        openResourceBySlug(heroMeta.slugTarget, true);
                      } else if (heroMeta?.categoryTarget) {
                        openCategoryExplorer(heroMeta.categoryTarget);
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Live Search Result Summary Banner (when a live search has focused a resource) */}
            {focusedResource && (
              <section className="bg-white border border-teal-700/40 rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-teal-800">Search Focus</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{focusedResource.category}</span>
                        {focusedResource.chemicalFormula && (
                          <>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span className="font-mono">{focusedResource.chemicalFormula}</span>
                          </>
                        )}
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>
                          {focusedResource.occurrences.length} mapped{' '}
                          {focusedResource.occurrences.length === 1 ? 'locality' : 'localities'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mt-1">
                        {focusedResource.name}
                      </h2>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                        {focusedResource.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailResource(focusedResource);
                          setView('details');
                          syncBrowserUrl('details', { slug: focusedResource.slug });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>Open Full Profile, Chat & Media Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFocus}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Show All
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-5 rounded-xl overflow-hidden border border-slate-200">
                    <ResourceImageCarousel
                      resourceName={focusedResource.name}
                      initialImages={[
                        ...(focusedResource.imageUrl
                          ? [
                              {
                                url: focusedResource.imageUrl,
                                title: focusedResource.name,
                                caption: focusedResource.subcategory || focusedResource.category,
                                attribution:
                                  focusedResource.imageAttribution || 'Verified Reference Specimen',
                                sourceUrl: focusedResource.sourceUrl || undefined,
                              },
                            ]
                          : []),
                        ...(liveEnrichment?.galleryImages || []),
                      ]}
                      autoFetchQuery={focusedResource.name}
                      stageClassName="h-56 sm:h-60"
                      showThumbnails={true}
                      autoPlay={true}
                    />
                  </div>
                </div>

                {focusedCountryGroups.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Countries & Exact Places Mapped ({focusedCountryGroups.length}{' '}
                          {focusedCountryGroups.length === 1 ? 'country' : 'countries'} ·{' '}
                          {focusedResource.occurrences.length} exact localities)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Select a country to filter or click any exact place to zoom the map directly to its coordinates.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCountryFilter('All');
                            setFocusedSpot(null);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            selectedCountryFilter === 'All'
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          All Countries ({focusedCountryGroups.length})
                        </button>
                        {focusedCountryGroups.map((g) => (
                          <button
                            key={g.country}
                            type="button"
                            onClick={() => {
                              setSelectedCountryFilter(g.country);
                              setFocusedSpot(null);
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                              selectedCountryFilter === g.country
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {g.country} ({g.sites.length})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {focusedCountryGroups
                        .filter(
                          (g) =>
                            selectedCountryFilter === 'All' || g.country === selectedCountryFilter
                        )
                        .map((g) => (
                          <div
                            key={g.country}
                            className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-bold text-slate-900">{g.country}</span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {g.sites.length} {g.sites.length === 1 ? 'place' : 'places'}
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {g.sites.map((site, idx) => (
                                <li key={`${site.id}-${idx}`}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFocusedSpot({
                                        latitude: site.latitude,
                                        longitude: site.longitude,
                                        zoom: 7,
                                        ts: Date.now(),
                                      });
                                      document
                                        .getElementById('global-map')
                                        ?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full text-left group flex items-start gap-2 rounded-md p-1.5 hover:bg-white hover:shadow-xs transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-slate-800 group-hover:text-teal-800 leading-snug">
                                        {site.siteName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 leading-snug">
                                        {site.depositType} ·{' '}
                                        <span className="font-mono">
                                          {Number.isFinite(site.latitude) && Number.isFinite(site.longitude)
                                            ? `${site.latitude.toFixed(2)}°, ${site.longitude.toFixed(2)}°`
                                            : 'Coordinates pending'}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {liveEnrichment &&
                  liveEnrichment.telemetry.some((t) => t.status === 'ok' && t.recordsFound > 0) && (
                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Verified Reference Sources:</span>
                      {liveEnrichment.telemetry
                        .filter((t) => t.status === 'ok' && t.recordsFound > 0)
                        .map((t) => (
                          <span key={t.provider} className="font-mono text-teal-800">
                            {t.provider} ({t.recordsFound})
                          </span>
                        ))}
                    </div>
                  )}
              </section>
            )}

            {/* Interactive Global Map Preview */}
            <section id="global-map" className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Interactive Global Distribution Map
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Inspect verified deposits, reported occurrences, and estimated distribution zones. Click any site marker for coordinates and primary source provenance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedResource(null);
                      setSelectedCategory('All');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      !focusedResource && selectedCategory === 'All'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({catalog.length})
                  </button>
                  {RESOURCE_CATEGORIES.slice(0, 5).map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setFocusedResource(null);
                        setSelectedCategory(cat.name);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        !focusedResource && selectedCategory === cat.name
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.name === 'Chemical Elements & Compounds' ? 'Elements' : cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <GlobalResourceMap
                resources={filteredCatalog}
                focusedResource={mapFocusedResource}
                focusPoint={focusedSpot}
                onSelectResource={(slug) => openResourceBySlug(slug)}
                heightClass="h-[480px]"
                isLoading={catalogLoading}
              />
            </section>

            {/* 9 Natural Resource Category Cards */}
            <section id="categories" className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Explore Natural Resource Categories
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Open any category or individual resource button below—or launch the Universal Studio to chat, record voice, record video, or upload a photo for any resource on Earth.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {catalogLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synchronizing Cloud SQL catalog…</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openCategoryExplorer('All')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Open Universal All-Resources Studio (Chat · Voice · Video · Photo)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {catalogError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-3">
                  <span>{catalogError}</span>
                  <button
                    type="button"
                    onClick={loadCatalog}
                    className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {RESOURCE_CATEGORIES.map((cat) => {
                  const catItems = catalog.filter((r) => r.category === cat.name);
                  const isActive = selectedCategory === cat.name;
                  const entries =
                    catItems.length > 0
                      ? catItems.map((item) => ({
                          name: item.name,
                          slug: item.slug,
                        }))
                      : cat.examples.map((ex) => ({
                          name: ex,
                          slug: ex.toLowerCase().replace(/\s+/g, '-'),
                        }));

                  return (
                    <div
                      key={cat.name}
                      className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                        isActive ? 'border-teal-700' : 'border-slate-200'
                      }`}
                    >
                      <div className="h-36 bg-slate-100 relative overflow-hidden">
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between gap-2 text-white">
                          <h3 className="text-lg font-bold leading-tight">{cat.name}</h3>
                          <span className="text-xs font-mono text-slate-200 tabular-nums shrink-0">
                            {entries.length} entries
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          <p className="text-xs text-slate-600 leading-relaxed">{cat.subtitle}</p>

                          <div className="text-[11px] font-medium text-slate-500">
                            Click any resource for full page, chat, voice, video & photo:
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {entries.map((entry) => (
                              <button
                                key={entry.slug}
                                type="button"
                                onClick={() => openResourceBySlug(entry.slug, true)}
                                className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 shadow-xs hover:bg-teal-700 hover:text-white hover:border-teal-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <span>{entry.name}</span>
                                <ArrowRight className="w-3 h-3 text-teal-700 group-hover:text-white shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedResource(null);
                              setSelectedCategory(cat.name);
                              scrollToSection('global-map');
                            }}
                            className="px-2.5 py-1.5 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Map
                          </button>
                          <button
                            type="button"
                            onClick={() => openCategoryExplorer(cat.name)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>Explore All {cat.name === 'Chemical Elements & Compounds' ? 'Elements' : cat.name}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* AI Resource Image Scanner */}
            <AiResourceScanner
              onOpenResourceSlug={(slug) => openResourceBySlug(slug)}
              onLiveSearchName={(name) => executeLiveSearch(name, true)}
            />

            {/* Global Statistics & Analytics Preview */}
            <section id="analytics" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Global Atlas Coverage & Scarcity Analytics
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Real-time aggregation across the Cloud SQL PostgreSQL repository showing mapped localities and relative supply scarcity indices by resource category.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Total catalog entries: {catalog.length}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Mapped Verified Localities by Category
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Count of georeferenced deposits, gauges, and field occurrences stored in PostgreSQL
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryAnalytics}
                        margin={{ top: 8, right: 12, left: 0, bottom: 32 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="category"
                          angle={-22}
                          textAnchor="end"
                          interval={0}
                          height={56}
                          tick={{ fontSize: 10, fill: '#475569' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="localities" name="Mapped Localities" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Mean Relative Supply Scarcity Index (0–100)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Comparative geological rarity & reserve concentration index across categories
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryAnalytics}
                        margin={{ top: 8, right: 12, left: 0, bottom: 32 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="category"
                          angle={-22}
                          textAnchor="end"
                          interval={0}
                          height={56}
                          tick={{ fontSize: 10, fill: '#475569' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="scarcity" name="Mean Scarcity Index" fill="#0369a1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Live Global Commodity & Resource Sector Benchmarks (Today) */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Global Resource & Commodity Market Benchmarks (Current)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time futures & sector indices (Yahoo Finance feed) showing current spot/index pricing and 52-week trend as of{' '}
                      <span className="font-mono">
                        {marketBenchmarks[0]?.asOfDate || new Date().toISOString().slice(0, 10)}
                      </span>
                      {marketFetchedAt ? ` · Synced ${new Date(marketFetchedAt).toLocaleTimeString()}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadMarketBenchmarks(true)}
                    disabled={marketLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${marketLoading ? 'animate-spin' : ''}`} />
                    <span>{marketLoading ? 'Refreshing…' : 'Refresh Markets'}</span>
                  </button>
                </div>

                {marketBenchmarks.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
                      {marketBenchmarks.map((b) => (
                        <div
                          key={b.symbol}
                          className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-mono font-bold text-slate-600">
                              {b.symbol}
                            </span>
                            <span
                              className={`text-[11px] font-mono font-semibold ${
                                b.changePct >= 0 ? 'text-teal-700' : 'text-rose-700'
                              }`}
                            >
                              {b.changePct >= 0 ? '+' : ''}
                              {b.changePct}%
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {b.instrumentName}
                          </div>
                          <div className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                            ${b.currentPrice.toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              {b.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-7">
                      <div className="text-xs font-semibold text-slate-800 mb-2">
                        52-Week Price Change (%) Ending {marketBenchmarks[0]?.asOfDate}
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={marketBenchmarks}
                            margin={{ top: 8, right: 12, left: 0, bottom: 32 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="symbol"
                              tick={{ fontSize: 11, fill: '#334155', fontFamily: 'JetBrains Mono' }}
                            />
                            <YAxis
                              tickFormatter={(v: number) => `${v}%`}
                              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                              width={44}
                            />
                            <Tooltip
                              formatter={(
                                val: unknown,
                                _name: unknown,
                                item: { payload?: LiveMarketSeriesPayload }
                              ) => [
                                `${val}% ($${item?.payload?.currentPrice.toLocaleString()} ${item?.payload?.unit})`,
                                item?.payload?.instrumentName || '1Y Change',
                              ]}
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="changePct" name="1Y % Change" radius={[4, 4, 0, 0]}>
                              {marketBenchmarks.map((entry) => (
                                <Cell
                                  key={entry.symbol}
                                  fill={entry.changePct >= 0 ? '#0f766e' : '#e11d48'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
                    {marketLoading ? 'Loading current 2026 commodity benchmarks…' : 'Market feed unavailable right now.'}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Online feeds: Yahoo Finance Commodity Futures & Sector ETFs ({new Date().getFullYear()}) · Open-Meteo ERA5/IFS · Wikidata/GBIF · Reference baselines: USGS, FAO & World Bank
                </span>
                <button
                  type="button"
                  onClick={() => openResourceBySlug('gold', true)}
                  className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline cursor-pointer"
                >
                  <span>Inspect Gold Analytics</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <BrandLogo size={22} />
            <span className="font-medium text-slate-700">Global Natural Resources Explorer</span>
          </div>
          <div>
            Verified & reported geological, hydrological, pedological, and botanical reference platform
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExplorerShell />
    </AuthProvider>
  );
}
