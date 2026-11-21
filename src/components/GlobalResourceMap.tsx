import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CloudRain,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Thermometer,
} from 'lucide-react';
import type { ResourceItem, ResourceOccurrence, UserGeoLocation } from '../types/resource';

interface MapMarkerEntry {
  occurrence: ResourceOccurrence;
  resourceName: string;
  resourceSlug: string;
  category: string;
}

type ClimateLayerMode = 'off' | 'temperature' | 'precipitation';

interface ClimateGridCell {
  lat: number;
  lon: number;
  latSpan: number;
  lonSpan: number;
  meanTempC: number;
  latestTempC: number;
  periodPrecipMm: number;
  latestPrecipMm: number;
  latestDate: string;
}

interface ClimateGridPayload {
  source: string;
  dataset: string;
  startDate: string;
  endDate: string;
  latestDate: string;
  periodDays: number;
  fetchedAt: string;
  isLive: boolean;
  cells: ClimateGridCell[];
}

interface LocalityClimatePoint {
  key: string;
  latitude: number;
  longitude: number;
  meanTempC: number;
  latestTempC: number;
  periodPrecipMm: number;
  latestPrecipMm: number;
  latestDate: string;
  startDate: string;
  endDate: string;
}

type BasemapProvider = 'topo' | 'osm' | 'light';

const BASEMAP_CONFIG: Record<BasemapProvider, { label: string; attribution: string }> = {
  topo: {
    label: 'World Topographic',
    attribution: '&copy; Esri, USGS, NOAA, OpenStreetMap contributors',
  },
  osm: {
    label: 'OpenStreetMap',
    attribution: '&copy; OpenStreetMap contributors',
  },
  light: {
    label: 'Light Scientific Atlas',
    attribution: '&copy; Esri Light Gray Canvas',
  },
};

export interface MapFocusPoint {
  latitude: number;
  longitude: number;
  zoom?: number;
  ts?: number;
}

interface GlobalResourceMapProps {
  resources: ResourceItem[];
  focusedResource?: ResourceItem | null;
  focusPoint?: MapFocusPoint | null;
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  onSelectResource?: (slug: string) => void;
  heightClass?: string;
  isLoading?: boolean;
}

interface CategoryMarkerStyle {
  label: string;
  shortLabel: string;
  fill: string;
  stroke: string;
}

const DEFAULT_CATEGORY_STYLE: CategoryMarkerStyle = {
  label: 'Natural Resource',
  shortLabel: 'Resource',
  fill: '#0d9488',
  stroke: '#115e59',
};

const CATEGORY_MARKER_STYLES: Record<string, CategoryMarkerStyle> = {
  Rocks: {
    label: 'Rocks',
    shortLabel: 'Rocks',
    fill: '#4f46e5',
    stroke: '#312e81',
  },
  Minerals: {
    label: 'Minerals',
    shortLabel: 'Minerals',
    fill: '#06b6d4',
    stroke: '#0e7490',
  },
  Metals: {
    label: 'Metals',
    shortLabel: 'Metals',
    fill: '#f97316',
    stroke: '#9a3412',
  },
  Gemstones: {
    label: 'Gemstones',
    shortLabel: 'Gemstones',
    fill: '#e11d48',
    stroke: '#9f1239',
  },
  'Chemical Elements & Compounds': {
    label: 'Chemical Elements & Compounds',
    shortLabel: 'Elements',
    fill: '#8b5cf6',
    stroke: '#5b21b6',
  },
  Soil: {
    label: 'Soil',
    shortLabel: 'Soil',
    fill: '#f59e0b',
    stroke: '#92400e',
  },
  'Water Resources': {
    label: 'Water Resources',
    shortLabel: 'Water',
    fill: '#0284c7',
    stroke: '#075985',
  },
  'Energy Resources': {
    label: 'Energy Resources',
    shortLabel: 'Energy',
    fill: '#ec4899',
    stroke: '#9d174d',
  },
  'Forest Resources': {
    label: 'Forest Resources',
    shortLabel: 'Forests',
    fill: '#10b981',
    stroke: '#065f46',
  },
};

function getCategoryMarkerStyle(category: string): CategoryMarkerStyle {
  return CATEGORY_MARKER_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}

function renderCircleSvg(
  fill: string,
  outlineColor: string,
  sizePx = 20,
  dashed = false,
  opacity = 0.96
): string {
  const dashAttr = dashed ? 'stroke-dasharray="3.2 2"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="${fill}" fill-opacity="${opacity}" stroke="${outlineColor}" stroke-width="2" ${dashAttr} /><circle cx="9.2" cy="9.2" r="2.1" fill="#ffffff" fill-opacity="0.38" stroke="none" /></svg>`;
}

const TIER_STYLES: Record<
  ResourceOccurrence['verificationTier'],
  { color: string; fillColor: string; label: string; outlineColor: string; dashed: boolean }
> = {
  verified_deposit: {
    color: '#0f766e',
    fillColor: '#10b981',
    label: 'Verified Deposit',
    outlineColor: '#ffffff',
    dashed: false,
  },
  reported_occurrence: {
    color: '#b45309',
    fillColor: '#f59e0b',
    label: 'Reported Occurrence',
    outlineColor: '#fef08a',
    dashed: false,
  },
  estimated_distribution: {
    color: '#1d4ed8',
    fillColor: '#3b82f6',
    label: 'Estimated Distribution Area',
    outlineColor: '#e0f2fe',
    dashed: true,
  },
};

const TEMP_SCALE = [
  { max: -5, color: '#1e3a8a', label: '< -5 °C' },
  { max: 5, color: '#0284c7', label: '-5–5 °C' },
  { max: 15, color: '#14b8a6', label: '5–15 °C' },
  { max: 24, color: '#f59e0b', label: '15–24 °C' },
  { max: Infinity, color: '#dc2626', label: '> 24 °C' },
];

const PRECIP_SCALE = [
  { max: 15, color: '#d97706', label: '< 15 mm' },
  { max: 45, color: '#eab308', label: '15–45 mm' },
  { max: 100, color: '#14b8a6', label: '45–100 mm' },
  { max: 200, color: '#0284c7', label: '100–200 mm' },
  { max: Infinity, color: '#1e3a8a', label: '> 200 mm' },
];

function getTemperatureColor(tempC: number): string {
  for (const step of TEMP_SCALE) {
    if (tempC < step.max) return step.color;
  }
  return TEMP_SCALE[TEMP_SCALE.length - 1].color;
}

function getPrecipitationColor(precipMm: number): string {
  for (const step of PRECIP_SCALE) {
    if (precipMm < step.max) return step.color;
  }
  return PRECIP_SCALE[PRECIP_SCALE.length - 1].color;
}

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function classifyClimateCorrelation(
  temps: number[],
  precips: number[],
  resource?: ResourceItem | null
): string {
  if (temps.length === 0 || precips.length === 0) {
    return 'Awaiting ERA5 locality sampling…';
  }
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const meanT = temps.reduce((a, b) => a + b, 0) / temps.length;
  const minP = Math.min(...precips);
  const maxP = Math.max(...precips);
  const meanP = precips.reduce((a, b) => a + b, 0) / precips.length;

  const isSurfaceClimateDriven =
    resource &&
    ['Soil', 'Water Resources', 'Forest Resources'].includes(resource.category);
  const isEvaporite = resource?.slug === 'gypsum';

  if (isEvaporite && meanP < 50) {
    return 'Dry evaporative basin conditions (<50 mm over last 30 days) favoring sulfate stability.';
  }
  if (isSurfaceClimateDriven && meanT >= 20 && meanP >= 95) {
    return 'Warm humid tropical/monsoonal regime driving active chemical weathering and moisture flux.';
  }
  if (isSurfaceClimateDriven && meanT < 15) {
    return 'Cool temperate to boreal current regime regulating organic accumulation and low evapotranspiration.';
  }
  if (maxT - minT > 18 || maxP - minP > 120) {
    return 'Broad multi-climate distribution; primary formation is governed by tectonic, magmatic, or sedimentary history rather than current weather.';
  }
  return `Observed localities average ${meanT.toFixed(1)} °C and ${Math.round(meanP).toLocaleString()} mm rainfall over the 30-day window.`;
}

// 15-minute client cache for the global live observation grid
const CLIENT_CLIMATE_TTL_MS = 15 * 60 * 1000;
let clientGridCache: { data: ClimateGridPayload; expiresAt: number } | null = null;

export const GlobalResourceMap: React.FC<GlobalResourceMapProps> = ({
  resources,
  focusedResource,
  focusPoint,
  userLocation,
  nearestOccurrences,
  onSelectResource,
  heightClass = 'h-[480px]',
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const proximityLayerRef = useRef<L.LayerGroup | null>(null);
  const climateLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByCoordRef = useRef<Map<string, L.Marker>>(new Map());
  const [expanded, setExpanded] = useState(false);
  const [basemap, setBasemap] = useState<BasemapProvider>('topo');

  const resolvedHeightPx = expanded ? 640 : heightClass.includes('440') ? 440 : 480;

  const [visibleTiers, setVisibleTiers] = useState<
    Record<ResourceOccurrence['verificationTier'], boolean>
  >({
    verified_deposit: true,
    reported_occurrence: true,
    estimated_distribution: true,
  });

  const [climateMode, setClimateMode] = useState<ClimateLayerMode>('off');
  const [climateGrid, setClimateGrid] = useState<ClimateGridPayload | null>(
    clientGridCache && clientGridCache.expiresAt > Date.now() ? clientGridCache.data : null
  );
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateError, setClimateError] = useState<string | null>(null);
  const [climateRefreshNonce, setClimateRefreshNonce] = useState(0);
  const [localityClimateMap, setLocalityClimateMap] = useState<
    Record<string, LocalityClimatePoint>
  >({});

  const markers = useMemo<MapMarkerEntry[]>(() => {
    const sourceList = focusedResource ? [focusedResource] : resources;
    const entries: MapMarkerEntry[] = [];
    const nearestDistByCoord = new Map<string, number>();
    for (const n of nearestOccurrences || []) {
      if (typeof n.distanceKm === 'number') {
        nearestDistByCoord.set(coordKey(n.latitude, n.longitude), n.distanceKm);
      }
    }

    const seenKeys = new Set<string>();
    for (const r of sourceList) {
      for (const occ of r.occurrences || []) {
        if (
          typeof occ.latitude === 'number' &&
          Number.isFinite(occ.latitude) &&
          typeof occ.longitude === 'number' &&
          Number.isFinite(occ.longitude) &&
          visibleTiers[occ.verificationTier]
        ) {
          seenKeys.add(coordKey(occ.latitude, occ.longitude));
          const dist = occ.distanceKm ?? nearestDistByCoord.get(coordKey(occ.latitude, occ.longitude));
          entries.push({
            occurrence: typeof dist === 'number' ? { ...occ, distanceKm: dist } : occ,
            resourceName: r.name,
            resourceSlug: r.slug,
            category: r.category,
          });
        }
      }
    }

    if (focusedResource && nearestOccurrences?.length) {
      for (const nOcc of nearestOccurrences) {
        const cKey = coordKey(nOcc.latitude, nOcc.longitude);
        if (
          typeof nOcc.latitude === 'number' &&
          typeof nOcc.longitude === 'number' &&
          visibleTiers[nOcc.verificationTier] &&
          !seenKeys.has(cKey)
        ) {
          seenKeys.add(cKey);
          entries.push({
            occurrence: nOcc,
            resourceName: focusedResource.name,
            resourceSlug: focusedResource.slug,
            category: focusedResource.category,
          });
        }
      }
    }

    return entries;
  }, [resources, focusedResource, visibleTiers, nearestOccurrences]);

  // Initialize Leaflet map, ResizeObserver, and dedicated climate pane once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [20, 12],
      zoom: 2,
      minZoom: 2,
      maxZoom: 15,
      worldCopyJump: true,
    });

    const climatePane = map.createPane('climatePane');
    climatePane.style.zIndex = '250';
    climatePane.style.pointerEvents = 'auto';

    const climateGroup = L.layerGroup().addTo(map);
    const proximityGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    climateLayerRef.current = climateGroup;
    proximityLayerRef.current = proximityGroup;
    markerLayerRef.current = markerGroup;

    // Ensure Leaflet recalculates container dimensions after layout/fonts/scroll settle
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 500);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false });
          })
        : null;
    ro?.observe(el);

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              map.invalidateSize({ animate: false });
            }
          })
        : null;
    io?.observe(el);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      io?.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      climateLayerRef.current = null;
      proximityLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  // Keep basemap tile layer synchronized with same-origin proxy + automatic fallback
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    let errorCount = 0;
    const layer = L.tileLayer(`/api/tiles/${basemap}/{z}/{x}/{y}.png`, {
      attribution: BASEMAP_CONFIG[basemap].attribution,
      maxZoom: 18,
    });

    layer.on('tileerror', () => {
      errorCount += 1;
      if (errorCount >= 4 && basemap === 'topo') {
        setBasemap('osm');
      } else if (errorCount >= 4 && basemap === 'osm') {
        setBasemap('light');
      }
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
    map.invalidateSize({ animate: false });
  }, [basemap]);

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 180);
    return () => clearTimeout(timer);
  }, [expanded, heightClass]);

  // Fetch live global ERA5 / IFS climate grid & locality observations when climate layer is turned on
  useEffect(() => {
    if (climateMode === 'off') {
      setClimateError(null);
      return;
    }

    let cancelled = false;
    const forceRefresh = climateRefreshNonce > 0;

    const loadClimateData = async () => {
      setClimateLoading(true);
      setClimateError(null);
      try {
        const requests: Promise<void>[] = [];

        const validCache =
          !forceRefresh && clientGridCache && clientGridCache.expiresAt > Date.now();
        if (!validCache) {
          requests.push(
            fetch(`/api/climate/grid${forceRefresh ? '?refresh=1' : ''}`)
              .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load climate grid.');
                const payload = data as ClimateGridPayload;
                clientGridCache = {
                  data: payload,
                  expiresAt: Date.now() + CLIENT_CLIMATE_TTL_MS,
                };
                if (!cancelled) setClimateGrid(payload);
              })
          );
        }

        const pointCoords = markers.slice(0, 30).map((m) => ({
          latitude: m.occurrence.latitude,
          longitude: m.occurrence.longitude,
        }));

        if (pointCoords.length > 0) {
          requests.push(
            fetch('/api/climate/localities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ points: pointCoords, refresh: forceRefresh }),
            }).then(async (res) => {
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed to load locality climate.');
              if (!cancelled && Array.isArray(data.points)) {
                setLocalityClimateMap((prev) => {
                  const next = { ...prev };
                  for (const pt of data.points as LocalityClimatePoint[]) {
                    next[pt.key] = pt;
                  }
                  return next;
                });
              }
            })
          );
        }

        await Promise.all(requests);
      } catch (err: unknown) {
        if (!cancelled) {
          setClimateError(
            err instanceof Error ? err.message : 'Unable to fetch climate overlay.'
          );
        }
      } finally {
        if (!cancelled) setClimateLoading(false);
      }
    };

    loadClimateData();
    return () => {
      cancelled = true;
    };
  }, [climateMode, markers, climateRefreshNonce]);

  // Render live climate overlay layer
  useEffect(() => {
    const group = climateLayerRef.current;
    if (!group) return;

    group.clearLayers();
    if (climateMode === 'off' || !climateGrid) return;

    for (const cell of climateGrid.cells) {
      const halfLat = cell.latSpan / 2;
      const halfLon = cell.lonSpan / 2;
      const fillColor =
        climateMode === 'temperature'
          ? getTemperatureColor(cell.latestTempC)
          : getPrecipitationColor(cell.periodPrecipMm);

      const rect = L.rectangle(
        [
          [cell.lat - halfLat, cell.lon - halfLon],
          [cell.lat + halfLat, cell.lon + halfLon],
        ],
        {
          pane: 'climatePane',
          stroke: false,
          fillColor,
          fillOpacity: 0.34,
        }
      );

      rect.bindPopup(
        `<div style="min-width:210px;">
          <div style="font-size:11px;font-weight:600;color:#0f766e;">ERA5 / IFS Observation (${cell.latestDate})</div>
          <div style="font-size:12px;font-family:JetBrains Mono,monospace;margin-top:4px;color:#0f172a;">
            ${cell.lat.toFixed(1)}°, ${cell.lon.toFixed(1)}°
          </div>
          <div style="font-size:12px;margin-top:6px;color:#334155;">
            Latest Day Temp: <strong style="font-family:JetBrains Mono,monospace;">${cell.latestTempC.toFixed(1)} °C</strong><br/>
            30-Day Mean Temp: <strong style="font-family:JetBrains Mono,monospace;">${cell.meanTempC.toFixed(1)} °C</strong><br/>
            30-Day Precip Total: <strong style="font-family:JetBrains Mono,monospace;">${cell.periodPrecipMm.toFixed(1)} mm</strong>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px;">
            Window: ${climateGrid.startDate} → ${climateGrid.endDate}
          </div>
        </div>`
      );

      rect.addTo(group);
    }
  }, [climateMode, climateGrid]);

  // Render resource locality markers & popups
  useEffect(() => {
    const map = mapRef.current;
    const group = markerLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    markerByCoordRef.current.clear();
    const bounds: L.LatLngExpression[] = [];

    for (const entry of markers) {
      const { occurrence, resourceName, resourceSlug, category } = entry;
      const tier = TIER_STYLES[occurrence.verificationTier] ?? TIER_STYLES.reported_occurrence;
      const catStyle = getCategoryMarkerStyle(category);
      const latlng: L.LatLngExpression = [occurrence.latitude, occurrence.longitude];
      bounds.push(latlng);

      if (occurrence.verificationTier === 'estimated_distribution') {
        L.circle(latlng, {
          radius: 420000,
          color: catStyle.stroke,
          weight: 1.25,
          opacity: 0.62,
          fillColor: catStyle.fill,
          fillOpacity: 0.14,
          dashArray: '4 4',
        }).addTo(group);
      }

      const iconSize = focusedResource ? 22 : 18;
      const markerIcon = L.divIcon({
        className: 'geo-atlas-pin',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
        popupAnchor: [0, -(iconSize / 2)],
        html: renderCircleSvg(
          catStyle.fill,
          tier.outlineColor,
          iconSize,
          tier.dashed,
          occurrence.verificationTier === 'estimated_distribution' ? 0.86 : 0.98
        ),
      });

      const marker = L.marker(latlng, {
        icon: markerIcon,
        title: `${resourceName} — ${occurrence.siteName}`,
      });

      const ptClimate =
        localityClimateMap[coordKey(occurrence.latitude, occurrence.longitude)];

      const climateHtml =
        climateMode !== 'off' && ptClimate
          ? `<div style="margin-top:6px;padding:5px 7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;color:#0f172a;">
              <div style="font-weight:600;color:#0369a1;">Weather & Climate (${ptClimate.latestDate})</div>
              <div style="font-family:JetBrains Mono,monospace;margin-top:2px;">
                Latest: ${ptClimate.latestTempC.toFixed(1)} °C · 30d Avg: ${ptClimate.meanTempC.toFixed(1)} °C · ${ptClimate.periodPrecipMm.toFixed(1)} mm (30d)
              </div>
            </div>`
          : '';

      const distanceBadgeHtml =
        typeof occurrence.distanceKm === 'number'
          ? `<div style="margin-top:4px;padding:3px 6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:11px;font-weight:700;color:#1d4ed8;font-family:JetBrains Mono,monospace;">~${occurrence.distanceKm.toLocaleString()} km from your location</div>`
          : '';

      const popupContainer = document.createElement('div');
      popupContainer.className = 'min-w-[225px] space-y-1.5';
      popupContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:${catStyle.stroke};">
          <span style="display:inline-flex;align-items:center;">${renderCircleSvg(catStyle.fill, '#ffffff', 14, false, 1)}</span>
          <span>${escapeHtml(category)} · ${tier.label}</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(occurrence.siteName)}</div>
        <div style="font-size:12px;color:#475569;">${escapeHtml(resourceName)} · ${escapeHtml(occurrence.country)}</div>
        ${distanceBadgeHtml}
        <div style="font-size:11px;color:#64748b;font-family:JetBrains Mono,monospace;">
          ${occurrence.latitude.toFixed(4)}°, ${occurrence.longitude.toFixed(4)}°
        </div>
        <div style="font-size:11px;color:#334155;">${escapeHtml(occurrence.depositType)}</div>
        ${climateHtml}
        <div style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;">
          Source: ${escapeHtml(occurrence.sourceName)}${occurrence.observedYear ? ` (${occurrence.observedYear})` : ''}
        </div>
      `;

      if (onSelectResource && !focusedResource) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = `Open ${resourceName} Profile →`;
        btn.style.cssText =
          'margin-top:6px;width:100%;padding:5px 8px;background:#0f766e;color:#ffffff;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;';
        btn.onclick = () => onSelectResource(resourceSlug);
        popupContainer.appendChild(btn);
      }

      marker.bindPopup(popupContainer);
      marker.addTo(group);
      markerByCoordRef.current.set(coordKey(occurrence.latitude, occurrence.longitude), marker);
    }

    if (focusedResource && bounds.length > 0 && !focusPoint && !userLocation) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 5, { animate: true });
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 5, animate: true });
      }
    }
  }, [markers, focusedResource, focusPoint, userLocation, onSelectResource, climateMode, localityClimateMap]);

  // Render User Location pin & dashed distance lines to nearest resource sites
  useEffect(() => {
    const map = mapRef.current;
    const proxGroup = proximityLayerRef.current;
    if (!map || !proxGroup) return;

    proxGroup.clearLayers();
    if (!userLocation) return;

    const userLatLng: L.LatLngExpression = [userLocation.latitude, userLocation.longitude];

    const userIcon = L.divIcon({
      className: 'geo-user-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#2563eb" fill-opacity="0.22" stroke="#2563eb" stroke-width="1.5"/><circle cx="14" cy="14" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/></svg>`,
    });

    const userMarker = L.marker(userLatLng, {
      icon: userIcon,
      title: userLocation.label || 'Your Location',
      zIndexOffset: 1000,
    });

    const nearestSummary =
      nearestOccurrences && nearestOccurrences.length > 0
        ? `<div style="margin-top:6px;padding-top:5px;border-top:1px solid #e2e8f0;font-size:11px;color:#0f172a;">
            Nearest match: <strong>${escapeHtml(nearestOccurrences[0].siteName)}</strong> (~${(nearestOccurrences[0].distanceKm ?? 0).toLocaleString()} km)
          </div>`
        : '';

    userMarker.bindPopup(
      `<div style="min-width:200px;">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;">YOUR LOCATION</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${escapeHtml(
          userLocation.label || 'Current Coordinates'
        )}</div>
        <div style="font-size:11px;color:#64748b;font-family:JetBrains Mono,monospace;margin-top:2px;">
          ${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}°
        </div>
        ${nearestSummary}
      </div>`
    );
    userMarker.addTo(proxGroup);

    const proxBounds: L.LatLngExpression[] = [userLatLng];
    const topNearest = (nearestOccurrences || []).slice(0, 5);
    for (const occ of topNearest) {
      const targetLatLng: L.LatLngExpression = [occ.latitude, occ.longitude];
      proxBounds.push(targetLatLng);

      const line = L.polyline([userLatLng, targetLatLng], {
        color: '#2563eb',
        weight: 2,
        opacity: 0.72,
        dashArray: '6 5',
      });
      if (typeof occ.distanceKm === 'number') {
        line.bindTooltip(`${occ.siteName}: ~${occ.distanceKm.toLocaleString()} km`, {
          sticky: true,
        });
      }
      line.addTo(proxGroup);
    }

    let popupTimer: number | null = null;
    if (!focusPoint) {
      try {
        if (proxBounds.length === 1) {
          map.setView(userLatLng, 7, { animate: true });
        } else {
          const focusSubset = proxBounds.slice(0, 4);
          map.fitBounds(L.latLngBounds(focusSubset), { padding: [56, 56], maxZoom: 8, animate: true });
        }
      } catch {
        // Ignore transient map transition errors
      }
      popupTimer = window.setTimeout(() => {
        if (mapRef.current && proxGroup.hasLayer(userMarker)) {
          userMarker.openPopup();
        }
      }, 250);
    }

    return () => {
      if (popupTimer !== null) window.clearTimeout(popupTimer);
    };
  }, [userLocation, nearestOccurrences, focusPoint]);

  // Clear marker ref cache before populating in above effect? Ensure cleanup
  useEffect(() => {
    if (
      !focusPoint ||
      !mapRef.current ||
      !Number.isFinite(focusPoint.latitude) ||
      !Number.isFinite(focusPoint.longitude)
    ) {
      return;
    }
    const map = mapRef.current;
    try {
      map.setView([focusPoint.latitude, focusPoint.longitude], focusPoint.zoom ?? 7, {
        animate: true,
      });
    } catch {
      // Ignore transient map transition errors
    }
    const matchedMarker = markerByCoordRef.current.get(
      coordKey(focusPoint.latitude, focusPoint.longitude)
    );
    if (!matchedMarker) return;
    const timer = window.setTimeout(() => {
      if (mapRef.current && markerLayerRef.current?.hasLayer(matchedMarker)) {
        matchedMarker.openPopup();
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [focusPoint]);

  const correlationStats = useMemo(() => {
    if (climateMode === 'off') return null;
    const temps: number[] = [];
    const precips: number[] = [];
    for (const m of markers) {
      const pt = localityClimateMap[coordKey(m.occurrence.latitude, m.occurrence.longitude)];
      if (pt) {
        temps.push(pt.latestTempC);
        precips.push(pt.periodPrecipMm);
      }
    }
    if (temps.length === 0) return null;
    return {
      count: temps.length,
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      meanTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      minPrecip: Math.min(...precips),
      maxPrecip: Math.max(...precips),
      meanPrecip: precips.reduce((a, b) => a + b, 0) / precips.length,
      interpretation: classifyClimateCorrelation(temps, precips, focusedResource),
    };
  }, [climateMode, markers, localityClimateMap, focusedResource]);

  const handleResetView = () => {
    mapRef.current?.setView([20, 12], 2, { animate: true });
  };

  const toggleTier = (tier: ResourceOccurrence['verificationTier']) => {
    setVisibleTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
            {focusedResource ? `${focusedResource.name} Spatial Distribution` : 'Global Resource Distribution'}
          </span>
          <span className="text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
            {markers.length} {markers.length === 1 ? 'locality' : 'localities'} plotted
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Climate Layer Segmented Toggle */}
          <div
            className="inline-flex items-center gap-0.5 p-0.5 bg-slate-200/75 rounded-lg"
            role="group"
            aria-label="Climate layer overlay toggle"
          >
            <button
              type="button"
              onClick={() => setClimateMode('off')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                climateMode === 'off'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              No Climate
            </button>
            <button
              type="button"
              onClick={() => setClimateMode('temperature')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                climateMode === 'temperature'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-amber-600" />
              <span>Avg Temp (°C)</span>
            </button>
            <button
              type="button"
              onClick={() => setClimateMode('precipitation')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                climateMode === 'precipitation'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-700" />
              <span>Precipitation (mm)</span>
            </button>
          </div>

          <select
            aria-label="Basemap style"
            value={basemap}
            onChange={(e) => setBasemap(e.target.value as BasemapProvider)}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <option value="topo">World Topographic</option>
            <option value="osm">OpenStreetMap</option>
            <option value="light">Light Scientific Atlas</option>
          </select>

          <button
            type="button"
            onClick={handleResetView}
            title="Reset global view"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse map' : 'Expand map'}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{expanded ? 'Compact' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* Verification Tier Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 bg-white text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Occurrence layers:</span>
          {(Object.keys(TIER_STYLES) as Array<ResourceOccurrence['verificationTier']>).map((tierKey) => {
            const cfg = TIER_STYLES[tierKey];
            const active = visibleTiers[tierKey];
            return (
              <button
                key={tierKey}
                type="button"
                onClick={() => toggleTier(tierKey)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                <span
                  className="inline-flex items-center justify-center shrink-0"
                  dangerouslySetInnerHTML={{
                    __html: renderCircleSvg(
                      active ? cfg.fillColor : '#cbd5e1',
                      active ? '#ffffff' : '#e2e8f0',
                      13,
                      cfg.dashed,
                      1
                    ),
                  }}
                />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {(climateLoading || isLoading) && (
          <span className="inline-flex items-center gap-1.5 text-xs text-teal-800 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{climateLoading ? 'Loading climate overlay…' : 'Loading localities…'}</span>
          </span>
        )}
      </div>

      {/* Map Viewport with explicit fallback height so Leaflet container never collapses */}
      <div
        className={`relative w-full ${expanded ? 'h-[640px]' : heightClass}`}
        style={{ height: `${resolvedHeightPx}px`, minHeight: `${resolvedHeightPx}px` }}
      >
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ height: `${resolvedHeightPx}px`, minHeight: `${resolvedHeightPx}px`, width: '100%' }}
        />

        {markers.length === 0 && !isLoading && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-900/15 backdrop-blur-[1px] pointer-events-none p-4">
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 max-w-md text-center shadow-sm pointer-events-auto">
              <p className="text-sm font-semibold text-slate-900">
                No verified coordinate records visible
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {focusedResource
                  ? 'Upstream public APIs returned 0 georeferenced coordinates for this query, or all verification layers are toggled off. Coordinates are never fabricated.'
                  : 'Enable at least one verification layer above to display mapped localities.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Climate Legend & Resource-Climate Correlation Strip */}
      {climateMode !== 'off' && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {climateError ? (
            <div className="flex items-center justify-between gap-3 text-xs text-rose-700">
              <span>{climateError}</span>
              <button
                type="button"
                onClick={() => setClimateRefreshNonce((n) => n + 1)}
                className="px-2.5 py-1 bg-white border border-rose-300 rounded font-medium hover:bg-rose-50 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-800">
                    {climateMode === 'temperature'
                      ? 'Latest Temp (°C):'
                      : '30-Day Precip Total (mm):'}
                  </span>
                  {(climateMode === 'temperature' ? TEMP_SCALE : PRECIP_SCALE).map((step) => (
                    <span key={step.label} className="inline-flex items-center gap-1.5 text-slate-700 font-mono">
                      <span
                        className="w-3 h-3 rounded-sm border border-slate-300/60 shrink-0"
                        style={{ backgroundColor: step.color, opacity: 0.72 }}
                      />
                      <span>{step.label}</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-slate-600 font-mono">
                    {climateGrid
                      ? `ERA5 / IFS · ${climateGrid.startDate} → ${climateGrid.latestDate}`
                      : 'Fetching ERA5 / IFS…'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setClimateRefreshNonce((n) => n + 1)}
                    disabled={climateLoading}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-teal-800 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${climateLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {correlationStats && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-baseline justify-between gap-3 text-xs">
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-900">Climate–Resource Correlation: </span>
                    <span>{correlationStats.interpretation}</span>
                  </div>
                  <div className="font-mono text-slate-600 tabular-nums shrink-0">
                    {correlationStats.minTemp.toFixed(1)}–{correlationStats.maxTemp.toFixed(1)} °C ·{' '}
                    {Math.round(correlationStats.minPrecip).toLocaleString()}–
                    {Math.round(correlationStats.maxPrecip).toLocaleString()} mm / 30d (n={correlationStats.count})
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Category Circle Color Legend Strip */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <span className="font-semibold text-slate-700 shrink-0">Circle Colors by Category:</span>
        {Object.values(CATEGORY_MARKER_STYLES).map((cat) => (
          <span
            key={cat.label}
            className="inline-flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap"
          >
            <span
              className="inline-flex items-center justify-center shrink-0"
              dangerouslySetInnerHTML={{
                __html: renderCircleSvg(cat.fill, '#ffffff', 14, false, 1),
              }}
            />
            <span>{cat.shortLabel}</span>
          </span>
        ))}
      </div>

      {/* Map Footer */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Basemap: {BASEMAP_CONFIG[basemap].label} · Solid outline = Verified · Gold halo = Reported · Dashed ring = Estimated area
        </span>
        <span className="font-mono">Zoom / Pan enabled</span>
      </div>
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
