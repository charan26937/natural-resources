export interface ClimateGridCell {
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

export interface ClimateGridResponse {
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

export interface LocalityClimatePoint {
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

const CACHE_TTL_MS = 15 * 60 * 1000;
const PERIOD_DAYS = 30;

let cachedGrid: { data: ClimateGridResponse; expiresAt: number } | null = null;
let gridPromise: Promise<ClimateGridResponse> | null = null;
const pointCache = new Map<string, { data: Omit<LocalityClimatePoint, 'key' | 'latitude' | 'longitude'>; expiresAt: number }>();

function getRollingWindow(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - (PERIOD_DAYS - 1) * 86400000);
  const startDate = start.toISOString().slice(0, 10);
  return { startDate, endDate };
}

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

interface OpenMeteoDailyPayload {
  latitude: number;
  longitude: number;
  daily?: {
    time?: string[];
    temperature_2m_mean?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
}

function summarizeLiveWindow(
  item: OpenMeteoDailyPayload,
  fallbackEndDate: string
): {
  meanTempC: number;
  latestTempC: number;
  periodPrecipMm: number;
  latestPrecipMm: number;
  latestDate: string;
} | null {
  const times = item.daily?.time ?? [];
  const rawTemps = item.daily?.temperature_2m_mean ?? [];
  const rawPrecips = item.daily?.precipitation_sum ?? [];

  const validTemps: Array<{ val: number; date: string }> = [];
  for (let i = 0; i < rawTemps.length; i++) {
    const v = rawTemps[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      validTemps.push({ val: v, date: times[i] || fallbackEndDate });
    }
  }

  const validPrecips: Array<{ val: number; date: string }> = [];
  for (let i = 0; i < rawPrecips.length; i++) {
    const v = rawPrecips[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      validPrecips.push({ val: v, date: times[i] || fallbackEndDate });
    }
  }

  if (validTemps.length === 0 && validPrecips.length === 0) return null;

  const meanTempC =
    validTemps.length > 0
      ? Number((validTemps.reduce((a, b) => a + b.val, 0) / validTemps.length).toFixed(1))
      : 0;
  const latestTemp = validTemps[validTemps.length - 1];
  const latestTempC = latestTemp ? Number(latestTemp.val.toFixed(1)) : meanTempC;

  const periodPrecipMm =
    validPrecips.length > 0
      ? Number(validPrecips.reduce((a, b) => a + b.val, 0).toFixed(1))
      : 0;
  const latestPrecip = validPrecips[validPrecips.length - 1];
  const latestPrecipMm = latestPrecip ? Number(latestPrecip.val.toFixed(1)) : 0;

  const latestDate = latestTemp?.date || latestPrecip?.date || fallbackEndDate;

  return { meanTempC, latestTempC, periodPrecipMm, latestPrecipMm, latestDate };
}

async function fetchOpenMeteoLiveBatch(
  coords: Array<{ lat: number; lon: number }>,
  startDate: string,
  endDate: string
): Promise<OpenMeteoDailyPayload[]> {
  if (coords.length === 0) return [];
  const lats = coords.map((c) => c.lat.toFixed(2)).join(',');
  const lons = coords.map((c) => c.lon.toFixed(2)).join(',');
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lats}&longitude=${lons}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum&timezone=UTC`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(14000),
  });

  if (res.status === 429) {
    throw new Error('Open-Meteo climate API rate limit reached. Please retry in a moment.');
  }
  if (!res.ok) {
    throw new Error(`Open-Meteo climate API returned HTTP ${res.status}`);
  }

  const raw = (await res.json()) as OpenMeteoDailyPayload | OpenMeteoDailyPayload[];
  return Array.isArray(raw) ? raw : [raw];
}

export async function getGlobalClimateGrid(forceRefresh = false): Promise<ClimateGridResponse> {
  if (!forceRefresh && cachedGrid && cachedGrid.expiresAt > Date.now()) {
    return cachedGrid.data;
  }
  if (!forceRefresh && gridPromise) {
    return gridPromise;
  }

  gridPromise = (async () => {
    const { startDate, endDate } = getRollingWindow();
    const latSpan = 20;
    const lonSpan = 36;
    const lats = [-50, -30, -10, 10, 30, 50, 70];
    const lons = [-162, -126, -90, -54, -18, 18, 54, 90, 126, 162];

    const coords: Array<{ lat: number; lon: number }> = [];
    for (const lat of lats) {
      for (const lon of lons) {
        coords.push({ lat, lon });
      }
    }

    const flatPayloads = await fetchOpenMeteoLiveBatch(coords, startDate, endDate);

    const cells: ClimateGridCell[] = [];
    let latestObservedDate = startDate;
    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      const payload = flatPayloads[i];
      if (!payload) continue;
      const summary = summarizeLiveWindow(payload, endDate);
      if (!summary) continue;
      if (summary.latestDate > latestObservedDate) {
        latestObservedDate = summary.latestDate;
      }

      cells.push({
        lat: coord.lat,
        lon: coord.lon,
        latSpan,
        lonSpan,
        meanTempC: summary.meanTempC,
        latestTempC: summary.latestTempC,
        periodPrecipMm: summary.periodPrecipMm,
        latestPrecipMm: summary.latestPrecipMm,
        latestDate: summary.latestDate,
      });
    }

    const result: ClimateGridResponse = {
      source: 'Open-Meteo ERA5 / IFS Reanalysis API',
      dataset: '30-Day Mean 2m Temperature & Accumulated Precipitation',
      startDate,
      endDate,
      latestDate: latestObservedDate,
      periodDays: PERIOD_DAYS,
      fetchedAt: new Date().toISOString(),
      isLive: true,
      cells,
    };

    if (cells.length > 0) {
      cachedGrid = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
    }
    return result;
  })().finally(() => {
    gridPromise = null;
  });

  return gridPromise;
}

export async function getClimateForPoints(
  points: Array<{ latitude: number; longitude: number }>,
  forceRefresh = false
): Promise<{
  points: LocalityClimatePoint[];
  startDate: string;
  endDate: string;
  latestDate: string;
  fetchedAt: string;
}> {
  const { startDate, endDate } = getRollingWindow();
  const uniqueMap = new Map<string, { lat: number; lon: number }>();
  for (const pt of points.slice(0, 30)) {
    if (!Number.isFinite(pt.latitude) || !Number.isFinite(pt.longitude)) continue;
    const key = coordKey(pt.latitude, pt.longitude);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { lat: pt.latitude, lon: pt.longitude });
    }
  }

  const missing: Array<{ key: string; lat: number; lon: number }> = [];
  const results: LocalityClimatePoint[] = [];
  const now = Date.now();

  for (const [key, coord] of uniqueMap.entries()) {
    const cached = !forceRefresh ? pointCache.get(key) : undefined;
    if (cached && cached.expiresAt > now) {
      results.push({
        key,
        latitude: coord.lat,
        longitude: coord.lon,
        ...cached.data,
      });
    } else {
      missing.push({ key, lat: coord.lat, lon: coord.lon });
    }
  }

  if (missing.length > 0) {
    const batch = await fetchOpenMeteoLiveBatch(
      missing.map((m) => ({ lat: m.lat, lon: m.lon })),
      startDate,
      endDate
    );
    for (let i = 0; i < missing.length; i++) {
      const m = missing[i];
      const payload = batch[i];
      if (!payload) continue;
      const summary = summarizeLiveWindow(payload, endDate);
      if (!summary) continue;
      const entryData = {
        ...summary,
        startDate,
        endDate,
      };
      pointCache.set(m.key, { data: entryData, expiresAt: now + CACHE_TTL_MS });
      results.push({
        key: m.key,
        latitude: m.lat,
        longitude: m.lon,
        ...entryData,
      });
    }
  }

  const latestDate = results.reduce(
    (max, pt) => (pt.latestDate > max ? pt.latestDate : max),
    startDate
  );

  return {
    points: results,
    startDate,
    endDate,
    latestDate: results.length > 0 ? latestDate : endDate,
    fetchedAt: new Date().toISOString(),
  };
}
