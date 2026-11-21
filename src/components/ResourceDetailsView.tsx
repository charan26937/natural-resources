import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calculator,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  LiveEnrichmentResult,
  LiveMarketSeriesPayload,
  ResourceGalleryImage,
  ResourceItem,
  ResourceLiveAnalyticsResponse,
  ResourceOccurrence,
  UserGeoLocation,
} from '../types/resource';
import { GlobalResourceMap, type MapFocusPoint } from './GlobalResourceMap';
import { ResourceAnalyticsPanel } from './ResourceAnalyticsPanel';
import { ResourceImageCarousel } from './ResourceImageCarousel';
import { ResourceLiveChatStudio } from './ResourceLiveChatStudio';

interface ResourceDetailsViewProps {
  resource: ResourceItem;
  liveEnrichment: LiveEnrichmentResult | null;
  isSaved: boolean;
  onToggleSave: (resource: ResourceItem) => Promise<void>;
  onRefreshLive: (resourceName: string) => Promise<void>;
  onResourceUpdated?: (resource: ResourceItem | null, enrichment: LiveEnrichmentResult) => void;
  onBack: () => void;
}

export const ResourceDetailsView: React.FC<ResourceDetailsViewProps> = ({
  resource,
  liveEnrichment,
  isSaved,
  onToggleSave,
  onRefreshLive,
  onResourceUpdated,
  onBack,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [focusPoint, setFocusPoint] = useState<MapFocusPoint | null>(null);

  // Market & Reference Price Value state
  const [marketPrice, setMarketPrice] = useState<LiveMarketSeriesPayload | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [calcQty, setCalcQty] = useState<string>('1');

  // Nearby User Location Map state
  const [userLocation, setUserLocation] = useState<UserGeoLocation | null>(null);
  const [nearestOccurrences, setNearestOccurrences] = useState<ResourceOccurrence[]>([]);

  useEffect(() => {
    setCountryFilter('All');
    setFocusPoint(null);
    setUserLocation(null);
    setNearestOccurrences([]);
    setCalcQty('1');
  }, [resource.slug]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPrice(true);
    setMarketPrice(null);
    const params = new URLSearchParams({
      name: resource.name,
      category: resource.category,
    });
    fetch(`/api/resources/analytics?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) return;
        const text = await res.text();
        if (!text) return;
        const json = JSON.parse(text) as ResourceLiveAnalyticsResponse;
        if (!cancelled) setMarketPrice(json.market ?? null);
      })
      .catch(() => {
        // Non-fatal: fallback to historicalPrices if available
      })
      .finally(() => {
        if (!cancelled) setLoadingPrice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource.name, resource.category]);

  const initialCarouselImages: ResourceGalleryImage[] = [
    ...(resource.imageUrl
      ? [
          {
            url: resource.imageUrl,
            title: resource.name,
            caption: resource.subcategory || resource.category,
            attribution: resource.imageAttribution || 'Verified Reference Specimen',
            sourceUrl: resource.sourceUrl || undefined,
          },
        ]
      : []),
    ...(liveEnrichment?.galleryImages || []),
  ];

  // Merge database occurrences with any discovered nearestOccurrences + sort closest first if userLocation active
  const mergedOccurrences = useMemo(() => {
    const coordKey = (lat: number, lng: number) =>
      Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(2)},${lng.toFixed(2)}` : '';

    const distByCoord = new Map<string, number>();
    for (const n of nearestOccurrences) {
      const k = coordKey(n.latitude, n.longitude);
      if (k && typeof n.distanceKm === 'number' && Number.isFinite(n.distanceKm)) {
        distByCoord.set(k, n.distanceKm);
      }
    }

    const baseList = (resource.occurrences || [])
      .filter((occ) => Number.isFinite(occ.latitude) && Number.isFinite(occ.longitude))
      .map((occ) => {
        const k = coordKey(occ.latitude, occ.longitude);
        const dist = occ.distanceKm ?? (k ? distByCoord.get(k) : undefined);
        return typeof dist === 'number' && Number.isFinite(dist)
          ? { ...occ, distanceKm: dist }
          : occ;
      });

    const seen = new Set(baseList.map((o) => coordKey(o.latitude, o.longitude)));
    for (const n of nearestOccurrences) {
      if (!Number.isFinite(n.latitude) || !Number.isFinite(n.longitude)) continue;
      const key = coordKey(n.latitude, n.longitude);
      if (key && !seen.has(key)) {
        seen.add(key);
        baseList.push(n);
      }
    }

    if (userLocation) {
      baseList.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return baseList;
  }, [resource.occurrences, nearestOccurrences, userLocation]);

  const countries = Array.from(
    new Set(mergedOccurrences.map((o) => o.country || 'International'))
  );
  const visibleOccurrences = mergedOccurrences.filter(
    (o) => countryFilter === 'All' || (o.country || 'International') === countryFilter
  );

  // Resolve primary valuation unit price (exact futures spot > documented reference price > sector benchmark)
  const latestHistoricalPrice =
    resource.historicalPrices && resource.historicalPrices.length > 0
      ? resource.historicalPrices[resource.historicalPrices.length - 1]
      : null;

  const primaryUnitPrice =
    marketPrice?.matchType === 'exact_commodity_spot'
      ? {
          price: marketPrice.currentPrice,
          unit: marketPrice.unit,
          label: marketPrice.instrumentName,
          changePct: marketPrice.changePct,
          source: `${marketPrice.source} · ${marketPrice.asOfDate}`,
        }
      : latestHistoricalPrice
      ? {
          price: latestHistoricalPrice.price,
          unit: `USD / ${latestHistoricalPrice.unit}`,
          label: `Reference Commodity Valuation (${latestHistoricalPrice.year})`,
          changePct: marketPrice?.changePct ?? null,
          source: latestHistoricalPrice.source,
        }
      : marketPrice
      ? {
          price: marketPrice.currentPrice,
          unit: marketPrice.unit,
          label: marketPrice.instrumentName,
          changePct: marketPrice.changePct,
          source: `${marketPrice.source} · ${marketPrice.asOfDate}`,
        }
      : null;

  const rawParsedQty = Number.parseFloat(calcQty);
  const parsedQty = Number.isFinite(rawParsedQty) ? Math.max(0, rawParsedQty) : 0;
  const estimatedTotal = primaryUnitPrice ? parsedQty * primaryUnitPrice.price : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshLive(resource.name);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onToggleSave(resource);
    } finally {
      setSaving(false);
    }
  };

  const propEntries = Object.entries(resource.physicalProperties || {}).filter(
    ([, val]) => Boolean(val)
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resource Explorer</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
            )}
            <span>{refreshing ? 'Querying Online APIs…' : 'Fetch External Data'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSaved
                ? 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved to Atlas' : 'Save Resource'}</span>
          </button>
        </div>
      </div>

      {/* Hero Resource Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-teal-800">{resource.category}</span>
                <span aria-hidden="true">·</span>
                <span>{resource.subcategory}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {resource.dataOrigin === 'live_api_fetched'
                    ? 'Online API Retrieved Record'
                    : 'Curated & Verified Reference'}
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-2">
                {resource.name}
              </h1>

              {resource.chemicalFormula && (
                <div className="mt-2 font-mono text-sm text-slate-700">
                  Composition / Formula: {resource.chemicalFormula}
                </div>
              )}

              <p className="text-sm lg:text-base text-slate-700 leading-relaxed mt-4">
                {resource.summary}
              </p>

              {/* Resource Market & Reference Price Value Card + Quick Estimator */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Market &amp; Reference Price Value</span>
                    </div>
                    {loadingPrice && !primaryUnitPrice ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                        <span>Checking commodity market pricing…</span>
                      </div>
                    ) : primaryUnitPrice ? (
                      <>
                        <div className="flex flex-wrap items-baseline gap-2.5 mt-1">
                          <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                            ${primaryUnitPrice.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-mono font-medium text-slate-600">
                            {primaryUnitPrice.unit}
                          </span>
                          {primaryUnitPrice.changePct !== null && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold ${
                                primaryUnitPrice.changePct >= 0 ? 'text-teal-700' : 'text-rose-700'
                              }`}
                            >
                              {primaryUnitPrice.changePct >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span>
                                {primaryUnitPrice.changePct >= 0 ? '+' : ''}
                                {primaryUnitPrice.changePct}% (1Y)
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {primaryUnitPrice.label} · Source: {primaryUnitPrice.source}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-600 mt-1">
                        Priced locally by quality grade, regional purity, and extraction volume.
                      </div>
                    )}
                  </div>

                  {primaryUnitPrice && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shrink-0">
                      <Calculator className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <label className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span>Qty:</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={calcQty}
                          onChange={(e) => setCalcQty(e.target.value)}
                          aria-label={`Quantity of ${resource.name} for price calculation`}
                          className="w-16 px-2 py-1 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                        />
                      </label>
                      <div className="text-right pl-2 border-l border-slate-200">
                        <div className="text-[10px] text-slate-500">Est. Value</div>
                        <div className="text-xs font-mono font-bold text-teal-800 tabular-nums">
                          $
                          {(estimatedTotal ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {marketPrice &&
                  marketPrice.matchType !== 'exact_commodity_spot' &&
                  latestHistoricalPrice && (
                    <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Related Sector Index ({marketPrice.instrumentName}):{' '}
                        <strong className="font-mono text-slate-800">
                          ${marketPrice.currentPrice.toLocaleString()}
                        </strong>{' '}
                        ({marketPrice.changePct >= 0 ? '+' : ''}
                        {marketPrice.changePct}% 1Y)
                      </span>
                      <span className="font-mono text-slate-500">{marketPrice.asOfDate}</span>
                    </div>
                  )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                <span>Primary Source: </span>
                <span className="font-medium text-slate-700">{resource.sourceName}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono">Updated {resource.lastUpdated}</span>
              </div>
              {resource.sourceUrl && (
                <a
                  href={resource.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-teal-800 hover:underline"
                >
                  <span>Inspect Primary Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between bg-slate-900">
            <ResourceImageCarousel
              resourceName={resource.name}
              initialImages={initialCarouselImages}
              autoFetchQuery={resource.name}
              stageClassName="h-64 sm:h-72 lg:h-[290px]"
              showThumbnails={true}
              autoPlay={true}
            />
          </div>
        </div>

        {/* Multimodal Chat Bar, Voice Record & Photo Upload directly below the Resource Image */}
        <ResourceLiveChatStudio
          resource={resource}
          strictScope={true}
          onLiveUpdate={onResourceUpdated}
          onNearestMapResult={(loc, nearest) => {
            setUserLocation(loc);
            setNearestOccurrences(nearest);
            setCountryFilter('All');
            setFocusPoint(null);
          }}
          onJumpToMap={() => {
            document.getElementById('details-map')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Verified Scientific Knowledge Summary (shown when live scientific enrichment was queried) */}
      {liveEnrichment &&
        (liveEnrichment.macrostrat ||
          liveEnrichment.pubchem ||
          liveEnrichment.wikidata ||
          liveEnrichment.liveOccurrences.length > 0) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Verified Scientific &amp; Geological Synthesis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized from scientific registries on{' '}
                  <span className="font-mono">
                    {new Date(liveEnrichment.fetchedAt).toLocaleDateString()}
                  </span>
                </p>
              </div>
              {liveEnrichment.liveOccurrences.length > 0 && (
                <span className="text-xs font-mono text-teal-800">
                  {liveEnrichment.liveOccurrences.length} georeferenced records mapped
                </span>
              )}
            </div>

            {(liveEnrichment.macrostrat || liveEnrichment.pubchem || liveEnrichment.wikidata) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                {liveEnrichment.wikidata && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="font-semibold text-slate-800 block">
                      Wikidata Knowledge Graph
                    </span>
                    <span className="text-slate-600 mt-1 block">
                      Entity {liveEnrichment.wikidata.entityId}
                      {liveEnrichment.wikidata.chemicalFormula
                        ? ` · Formula: ${liveEnrichment.wikidata.chemicalFormula}`
                        : ''}
                      {liveEnrichment.wikidata.crystalSystem
                        ? ` · ${liveEnrichment.wikidata.crystalSystem}`
                        : ''}
                    </span>
                  </div>
                )}
                {liveEnrichment.macrostrat && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="font-semibold text-slate-800 block">
                      Macrostrat Geological Glossary
                    </span>
                    <span className="text-slate-600 mt-1 block">
                      {liveEnrichment.macrostrat.mineralType || 'Mineral'}
                      {liveEnrichment.macrostrat.formula
                        ? ` · ${liveEnrichment.macrostrat.formula}`
                        : ''}
                      {liveEnrichment.macrostrat.lustre
                        ? ` · ${liveEnrichment.macrostrat.lustre}`
                        : ''}
                    </span>
                  </div>
                )}
                {liveEnrichment.pubchem && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="font-semibold text-slate-800 block">
                      NIH PubChem Chemical Registry
                    </span>
                    <span className="text-slate-600 mt-1 block">
                      CID {liveEnrichment.pubchem.cid}
                      {liveEnrichment.pubchem.molecularFormula
                        ? ` · ${liveEnrichment.pubchem.molecularFormula}`
                        : ''}
                      {liveEnrichment.pubchem.molecularWeight
                        ? ` · ${liveEnrichment.pubchem.molecularWeight}`
                        : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Physical Properties & Origin */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Physical & Chemical Properties</h2>
          {propEntries.length > 0 ? (
            <dl className="divide-y divide-slate-100">
              {propEntries.map(([key, value]) => (
                <div key={key} className="py-2.5 flex items-baseline justify-between gap-4 text-xs">
                  <dt className="text-slate-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </dt>
                  <dd className="font-mono font-medium text-slate-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-slate-500">
              Physical property table not reported by upstream scientific APIs.
            </p>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Formation & Geological Origin</h2>
            <p className="text-sm text-slate-700 leading-relaxed mt-2">
              {resource.formationOrigin}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Environmental Importance</h3>
            <p className="text-sm text-slate-700 leading-relaxed mt-1.5">
              {resource.environmentalImportance}
            </p>
          </div>
        </div>
      </div>

      {/* Industrial & Agricultural Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Industrial Applications</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {(resource.industrialApplications || []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-teal-700 font-bold mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Agricultural Applications</h2>
          {resource.agriculturalApplications && resource.agriculturalApplications.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {resource.agriculturalApplications.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-teal-700 font-bold mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No direct primary agricultural application documented for {resource.name}.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Distribution Map & Verified Coordinates Table */}
      <div id="details-map" className="space-y-4">
        {userLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-950">
              <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Mapping nearest available <strong>{resource.name}</strong> sites from{' '}
                <strong>
                  {userLocation.label ||
                    (Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)
                      ? `${userLocation.latitude.toFixed(2)}°, ${userLocation.longitude.toFixed(2)}°`
                      : 'Selected Location')}
                </strong>
                {nearestOccurrences.length > 0 && typeof nearestOccurrences[0].distanceKm === 'number'
                  ? ` — Closest: ${nearestOccurrences[0].siteName} (~${nearestOccurrences[0].distanceKm.toLocaleString()} km)`
                  : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUserLocation(null);
                setNearestOccurrences([]);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-100 rounded text-blue-800 font-medium cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Location Pin</span>
            </button>
          </div>
        )}

        <GlobalResourceMap
          resources={[resource]}
          focusedResource={
            countryFilter === 'All'
              ? { ...resource, occurrences: mergedOccurrences }
              : { ...resource, occurrences: visibleOccurrences }
          }
          focusPoint={focusPoint}
          userLocation={userLocation}
          nearestOccurrences={nearestOccurrences}
          heightClass="h-[440px]"
        />

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Exact Places & Georeferenced Records by Country
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {userLocation
                  ? 'Sorted nearest-first from your selected location. Click any locality row to zoom the map directly to that site.'
                  : 'Filter by country or click any exact locality row to zoom the map directly to that site.'}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {countries.length} {countries.length === 1 ? 'country' : 'countries'} ·{' '}
              {visibleOccurrences.length} exact places
            </span>
          </div>

          {countries.length > 1 && (
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCountryFilter('All');
                  setFocusPoint(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  countryFilter === 'All'
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Countries ({mergedOccurrences.length})
              </button>
              {countries.map((c) => {
                const count = mergedOccurrences.filter(
                  (o) => (o.country || 'International') === c
                ).length;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCountryFilter(c);
                      setFocusPoint(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      countryFilter === c
                        ? 'bg-teal-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {c} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {visibleOccurrences.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Exact Place / Locality</th>
                    <th className="py-2.5 px-4 font-medium">Country & Region</th>
                    {userLocation && <th className="py-2.5 px-4 font-medium">Distance</th>}
                    <th className="py-2.5 px-4 font-medium">Type / Formation</th>
                    <th className="py-2.5 px-4 font-medium">Coordinates</th>
                    <th className="py-2.5 px-4 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOccurrences.map((occ, idx) => (
                    <tr
                      key={`${occ.id}-${idx}`}
                      onClick={() => {
                        setFocusPoint({
                          latitude: occ.latitude,
                          longitude: occ.longitude,
                          zoom: 7,
                          ts: Date.now(),
                        });
                        document
                          .getElementById('details-map')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span>{occ.siteName}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {occ.country} · {occ.region}
                      </td>
                      {userLocation && (
                        <td className="py-2.5 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                          {typeof occ.distanceKm === 'number'
                            ? `~${occ.distanceKm.toLocaleString()} km`
                            : '—'}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-slate-700">{occ.depositType}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {Number.isFinite(occ.latitude) && Number.isFinite(occ.longitude)
                          ? `${occ.latitude.toFixed(4)}°, ${occ.longitude.toFixed(4)}°`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {occ.sourceName}
                        {occ.observedYear ? ` (${occ.observedYear})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No georeferenced coordinates returned by upstream APIs for this resource.
            </div>
          )}
        </div>
      </div>

      {/* Charts & Analytics */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Production, Trade & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every chart preserves exact physical/financial units, reference years, and original data attribution.
          </p>
        </div>
        <ResourceAnalyticsPanel resource={resource} liveEnrichment={liveEnrichment} />
      </div>
    </div>
  );
};
