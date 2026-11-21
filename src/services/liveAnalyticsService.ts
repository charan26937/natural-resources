import type {
  LiveLocalityClimateSeries,
  LiveMarketSeriesPayload,
} from '../types/resource.ts';

const CACHE_TTL_MS = 15 * 60 * 1000;
const marketCache = new Map<string, { data: LiveMarketSeriesPayload; expiresAt: number }>();
const climateSeriesCache = new Map<string, { data: LiveLocalityClimateSeries; expiresAt: number }>();

interface SymbolConfig {
  symbol: string;
  label: string;
  unit: string;
  matchType: 'exact_commodity_spot' | 'resource_sector_index';
}

function resolveMarketSymbol(resourceName: string, category = ''): SymbolConfig {
  const q = `${resourceName} ${category}`.toLowerCase();

  if (/\bgold\b/.test(q)) {
    return { symbol: 'GC=F', label: 'COMEX Gold Futures', unit: 'USD / troy oz', matchType: 'exact_commodity_spot' };
  }
  if (/\bsilver\b/.test(q)) {
    return { symbol: 'SI=F', label: 'COMEX Silver Futures', unit: 'USD / troy oz', matchType: 'exact_commodity_spot' };
  }
  if (/\bcopper\b|\bmalachite\b|\bazurite\b/.test(q)) {
    return { symbol: 'HG=F', label: 'COMEX High-Grade Copper Futures', unit: 'USD / lb', matchType: 'exact_commodity_spot' };
  }
  if (/\bplatinum\b/.test(q)) {
    return { symbol: 'PL=F', label: 'NYMEX Platinum Futures', unit: 'USD / troy oz', matchType: 'exact_commodity_spot' };
  }
  if (/\bpalladium\b/.test(q)) {
    return { symbol: 'PA=F', label: 'NYMEX Palladium Futures', unit: 'USD / troy oz', matchType: 'exact_commodity_spot' };
  }
  if (/\bpetroleum\b|\bcrude oil\b|\boil\b/.test(q)) {
    return { symbol: 'CL=F', label: 'WTI Crude Oil Futures', unit: 'USD / barrel', matchType: 'exact_commodity_spot' };
  }
  if (/\bnatural gas\b|\bmethane\b/.test(q)) {
    return { symbol: 'NG=F', label: 'Henry Hub Natural Gas Futures', unit: 'USD / MMBtu', matchType: 'exact_commodity_spot' };
  }
  if (/\baluminum\b|\baluminium\b|\bbauxite\b/.test(q)) {
    return { symbol: 'ALI=F', label: 'COMEX Aluminum Futures', unit: 'USD / metric ton', matchType: 'exact_commodity_spot' };
  }
  if (/\blithium\b|\bcobalt\b|\bgraphite\b|\bnickel\b/.test(q)) {
    return { symbol: 'LIT', label: 'Global Lithium & Battery Metals Index', unit: 'USD index', matchType: 'resource_sector_index' };
  }
  if (/\buranium\b|\bthorium\b/.test(q)) {
    return { symbol: 'URA', label: 'Global Uranium Mining & Nuclear Index', unit: 'USD index', matchType: 'resource_sector_index' };
  }
  if (/\brubidium\b|\bcaesium\b|\bcesium\b|\bscandium\b|\btungsten\b|\brare earth\b|\bneodymium\b/.test(q)) {
    return { symbol: 'REMX', label: 'Rare Earth & Strategic Metals Benchmark', unit: 'USD index', matchType: 'resource_sector_index' };
  }
  if (category === 'Forest Resources' || /\btimber\b|\bbamboo\b|\bwood\b|\bmedicinal\b|\bplant\b/.test(q)) {
    return { symbol: 'WOOD', label: 'Global Timber & Forestry Benchmark', unit: 'USD index', matchType: 'resource_sector_index' };
  }
  if (category === 'Soil' || /\bsoil\b|\bchernozem\b|\blaterite\b|\bpeat\b|\bloam\b|\bphosphate\b|\bpotash\b/.test(q)) {
    return { symbol: 'MOO', label: 'Global Agribusiness & Soil Inputs Benchmark', unit: 'USD index', matchType: 'resource_sector_index' };
  }
  if (category === 'Water Resources' || /\bwater\b|\briver\b|\blake\b|\baquifer\b/.test(q)) {
    return { symbol: 'PHO', label: 'Global Water Resources Benchmark', unit: 'USD index', matchType: 'resource_sector_index' };
  }

  return {
    symbol: 'XME',
    label: 'S&P Metals & Mineral Extraction Benchmark',
    unit: 'USD index',
    matchType: 'resource_sector_index',
  };
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

async function fetchYahooSeries(cfg: SymbolConfig, forceRefresh = false): Promise<LiveMarketSeriesPayload | null> {
  const cached = !forceRefresh ? marketCache.get(cfg.symbol) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    cfg.symbol
  )}?range=1y&interval=1wk`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 GlobalNaturalResourcesExplorer/1.0',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as YahooChartResponse;
    const item = json.chart?.result?.[0];
    const timestamps = item?.timestamp ?? [];
    const closes = item?.indicators?.quote?.[0]?.close ?? [];

    const points: Array<{ date: string; price: number }> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c === 'number' && Number.isFinite(c)) {
        points.push({
          date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
          price: Number(c.toFixed(2)),
        });
      }
    }

    if (points.length === 0) return null;

    const currentPrice = Number(
      (item?.meta?.regularMarketPrice ?? points[points.length - 1].price).toFixed(2)
    );
    const firstPrice = points[0].price;
    const previousPrice = points.length >= 2 ? points[points.length - 2].price : firstPrice;
    const changePct =
      firstPrice > 0 ? Number((((currentPrice - firstPrice) / firstPrice) * 100).toFixed(2)) : 0;

    const payload: LiveMarketSeriesPayload = {
      symbol: cfg.symbol,
      instrumentName: cfg.label,
      matchType: cfg.matchType,
      unit: cfg.unit,
      currentPrice,
      previousPrice,
      changePct,
      asOfDate: points[points.length - 1].date,
      fetchedAt: new Date().toISOString(),
      source: `Yahoo Finance Market Feed (${cfg.symbol})`,
      points,
    };

    marketCache.set(cfg.symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return payload;
  } catch {
    return null;
  }
}

export async function getLiveResourceMarketBenchmark(
  resourceName: string,
  category = '',
  forceRefresh = false
): Promise<LiveMarketSeriesPayload | null> {
  const cfg = resolveMarketSymbol(resourceName, category);
  return fetchYahooSeries(cfg, forceRefresh);
}

export async function getGlobalLiveCommodityBoard(
  forceRefresh = false
): Promise<LiveMarketSeriesPayload[]> {
  const coreConfigs: SymbolConfig[] = [
    { symbol: 'GC=F', label: 'Gold (Spot Futures)', unit: 'USD / troy oz', matchType: 'exact_commodity_spot' },
    { symbol: 'HG=F', label: 'Copper (Spot Futures)', unit: 'USD / lb', matchType: 'exact_commodity_spot' },
    { symbol: 'CL=F', label: 'Crude Oil WTI', unit: 'USD / bbl', matchType: 'exact_commodity_spot' },
    { symbol: 'NG=F', label: 'Natural Gas', unit: 'USD / MMBtu', matchType: 'exact_commodity_spot' },
    { symbol: 'LIT', label: 'Lithium & Battery Index', unit: 'USD index', matchType: 'resource_sector_index' },
    { symbol: 'REMX', label: 'Rare Earth & Strategic Metals', unit: 'USD index', matchType: 'resource_sector_index' },
    { symbol: 'WOOD', label: 'Global Timber & Forestry', unit: 'USD index', matchType: 'resource_sector_index' },
    { symbol: 'MOO', label: 'Agribusiness & Soil Inputs', unit: 'USD index', matchType: 'resource_sector_index' },
  ];

  const settled = await Promise.all(coreConfigs.map((cfg) => fetchYahooSeries(cfg, forceRefresh)));
  return settled.filter((item): item is LiveMarketSeriesPayload => item !== null);
}

export async function getLiveLocalityDailySeries(
  latitude: number,
  longitude: number,
  siteName: string,
  country: string,
  forceRefresh = false
): Promise<LiveLocalityClimateSeries | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = !forceRefresh ? climateSeriesCache.get(key) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, siteName, country };
  }

  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude.toFixed(
    2
  )}&longitude=${longitude.toFixed(
    2
  )}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum&timezone=UTC`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_mean?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
      };
    };

    const times = json.daily?.time ?? [];
    const temps = json.daily?.temperature_2m_mean ?? [];
    const precips = json.daily?.precipitation_sum ?? [];

    const days: Array<{ date: string; tempC: number; precipMm: number }> = [];
    for (let i = 0; i < times.length; i++) {
      const t = temps[i];
      const p = precips[i];
      if (typeof t === 'number' && Number.isFinite(t)) {
        days.push({
          date: times[i],
          tempC: Number(t.toFixed(1)),
          precipMm: typeof p === 'number' && Number.isFinite(p) ? Number(p.toFixed(1)) : 0,
        });
      }
    }

    if (days.length === 0) return null;

    const latest = days[days.length - 1];
    const result: LiveLocalityClimateSeries = {
      siteName,
      country,
      latitude,
      longitude,
      startDate,
      endDate,
      latestDate: latest.date,
      latestTempC: latest.tempC,
      latestPrecipMm: latest.precipMm,
      source: 'Open-Meteo ERA5 / IFS Daily Archive',
      days,
    };

    climateSeriesCache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return null;
  }
}
