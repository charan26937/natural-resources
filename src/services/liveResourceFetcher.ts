import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  type PhysicalPropertiesMap,
  type ProducerMetric,
  resourceOccurrences,
  resources,
} from '../db/schema.ts';

export interface ApiSourceTelemetry {
  provider: string;
  endpoint: string;
  status: 'ok' | 'not_found' | 'rate_limited' | 'timeout' | 'error';
  latencyMs: number;
  recordsFound: number;
  message?: string;
}

export interface LiveGeoOccurrence {
  siteName: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  verificationTier: 'verified_deposit' | 'reported_occurrence' | 'estimated_distribution';
  depositType: string;
  sourceName: string;
  sourceUrl?: string;
  observedYear?: number;
}

export interface WorldBankIndicatorRow {
  country: string;
  iso3: string;
  value: number;
  year: number;
  indicatorName: string;
  indicatorCode: string;
  source: string;
}

export interface ResourceGalleryImage {
  url: string;
  title: string;
  caption?: string;
  attribution?: string;
  sourceUrl?: string;
}

export interface LiveEnrichmentResult {
  fetchedAt: string;
  query: string;
  wikipedia?: {
    title: string;
    description?: string;
    extract: string;
    thumbnailUrl?: string;
    pageUrl: string;
  };
  macrostrat?: {
    mineralName: string;
    mineralType?: string;
    formula?: string;
    hardnessMin?: number;
    hardnessMax?: number;
    crystalForm?: string;
    lustre?: string;
    color?: string;
  };
  pubchem?: {
    cid: number;
    molecularFormula?: string;
    molecularWeight?: string;
    iupacName?: string;
    url: string;
  };
  wikidata?: {
    entityId: string;
    label: string;
    description?: string;
    chemicalFormula?: string;
    crystalSystem?: string;
    mohsHardness?: string;
    density?: string;
    casNumber?: string;
    url: string;
  };
  liveOccurrences: LiveGeoOccurrence[];
  worldBankStats: WorldBankIndicatorRow[];
  galleryImages: ResourceGalleryImage[];
  telemetry: ApiSourceTelemetry[];
}

const REQUEST_TIMEOUT_MS = 7000;

async function fetchJsonWithStatus<T>(
  url: string,
  headers: Record<string, string> = {}
): Promise<{
  ok: boolean;
  status: number;
  data?: T;
  errorType?: 'not_found' | 'rate_limited' | 'timeout' | 'error';
  message?: string;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GlobalNaturalResourcesExplorer/1.0 (https://geoatlas.org; support@geoatlas.org)',
        ...headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return { ok: false, status: 404, errorType: 'not_found', message: 'No matching record', latencyMs };
    }
    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        errorType: 'rate_limited',
        message: 'Upstream API rate limit reached',
        latencyMs,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        errorType: 'error',
        message: `HTTP ${res.status}`,
        latencyMs,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data, latencyMs };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      ok: false,
      status: 0,
      errorType: isTimeout ? 'timeout' : 'error',
      message: isTimeout ? 'Request timed out' : err instanceof Error ? err.message : 'Network error',
      latencyMs,
    };
  }
}

async function fetchWikipediaSummary(query: string): Promise<{
  result?: LiveEnrichmentResult['wikipedia'];
  telemetry: ApiSourceTelemetry;
}> {
  const normalized = query.trim().replace(/\s+/g, '_');
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalized)}`;
  const res = await fetchJsonWithStatus<{
    type?: string;
    title?: string;
    description?: string;
    extract?: string;
    thumbnail?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  }>(url);

  if (res.ok && res.data && res.data.type !== 'disambiguation' && res.data.extract) {
    return {
      result: {
        title: res.data.title || query,
        description: res.data.description?.replace(/\bWikipedia\b/gi, 'Online Reference'),
        extract: res.data.extract.replace(/\bWikipedia\b/gi, 'Online Reference'),
        thumbnailUrl: res.data.thumbnail?.source,
        pageUrl: res.data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(normalized)}`,
      },
      telemetry: {
        provider: 'Online Scientific Reference API',
        endpoint: url,
        status: 'ok',
        latencyMs: res.latencyMs,
        recordsFound: 1,
      },
    };
  }

  // Fallback to online article search if direct title hits 404 or disambiguation
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query.trim()
  )}&srlimit=4&format=json`;
  const searchRes = await fetchJsonWithStatus<{
    query?: { search?: Array<{ title?: string; snippet?: string }> };
  }>(searchUrl);

  const candidates = (searchRes.data?.query?.search ?? []).filter(
    (s) => s.title && !(s.snippet || '').toLowerCase().includes('may refer to')
  );
  for (const cand of candidates.slice(0, 2)) {
    const candNorm = cand.title!.trim().replace(/\s+/g, '_');
    const candUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candNorm)}`;
    const candRes = await fetchJsonWithStatus<{
      type?: string;
      title?: string;
      description?: string;
      extract?: string;
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    }>(candUrl);
    if (candRes.ok && candRes.data && candRes.data.type !== 'disambiguation' && candRes.data.extract) {
      return {
        result: {
          title: candRes.data.title || cand.title!,
          description: candRes.data.description?.replace(/\bWikipedia\b/gi, 'Online Reference'),
          extract: candRes.data.extract.replace(/\bWikipedia\b/gi, 'Online Reference'),
          thumbnailUrl: candRes.data.thumbnail?.source,
          pageUrl:
            candRes.data.content_urls?.desktop?.page ||
            `https://en.wikipedia.org/wiki/${encodeURIComponent(candNorm)}`,
        },
        telemetry: {
          provider: 'Online Scientific Reference API',
          endpoint: candUrl,
          status: 'ok',
          latencyMs: res.latencyMs + searchRes.latencyMs + candRes.latencyMs,
          recordsFound: 1,
        },
      };
    }
  }

  return {
    telemetry: {
      provider: 'Online Scientific Reference API',
      endpoint: url,
      status: res.errorType ?? 'not_found',
      latencyMs: res.latencyMs,
      recordsFound: 0,
      message: res.message ?? 'Disambiguation or missing summary',
    },
  };
}

function stripHtmlTags(raw = ''): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const IMAGE_SKIP_TITLE_TERMS = [
  'flag_of_', 'flag of ', 'commons-logo', 'symbol_', 'crystal_clear', 'gtk-',
  'padlock', 'question_book', 'ambox_', 'edit-', 'wiki', 'red_pog', 'blue_pog',
  'locator_', 'location_map', 'blank_map', 'world_map', 'logo', 'icon', 'badge',
  'signature', 'coat_of_arms', 'seal_of', 'emblem',
];

const GALLERY_CACHE_TTL_MS = 30 * 60 * 1000;
const galleryCache = new Map<string, { images: ResourceGalleryImage[]; expiresAt: number }>();

export async function fetchResourceImageGallery(
  query: string,
  wikiTitle?: string,
  primaryThumb?: string
): Promise<{
  images: ResourceGalleryImage[];
  telemetry: ApiSourceTelemetry;
}> {
  const cleanQuery = query.trim();
  const targetTitle = (wikiTitle || cleanQuery).trim();
  const cacheKey = `${cleanQuery.toLowerCase()}::${targetTitle.toLowerCase()}`;
  const cached = galleryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && cached.images.length > 0) {
    return {
      images: cached.images,
      telemetry: {
        provider: 'Online Specimen Media Archive',
        endpoint: 'cache',
        status: 'ok',
        latencyMs: 1,
        recordsFound: cached.images.length,
      },
    };
  }

  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    cleanQuery
  )}&gsrlimit=12&prop=imageinfo&iiprop=url|mime|extmetadata|size&iiurlwidth=960&format=json`;
  const wpImgUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(
    targetTitle
  )}&gimlimit=12&prop=imageinfo&iiprop=url|mime|extmetadata|size&iiurlwidth=960&redirects=1&format=json`;

  interface MediaPage {
    title?: string;
    imageinfo?: Array<{
      url?: string;
      thumburl?: string;
      descriptionurl?: string;
      mime?: string;
      width?: number;
      height?: number;
      extmetadata?: {
        ImageDescription?: { value?: string };
        Artist?: { value?: string };
        LicenseShortName?: { value?: string };
      };
    }>;
  }
  interface MediaResponse {
    query?: { pages?: Record<string, MediaPage> };
  }

  const [wpRes, commonsRes] = await Promise.all([
    fetchJsonWithStatus<MediaResponse>(wpImgUrl),
    fetchJsonWithStatus<MediaResponse>(commonsUrl),
  ]);

  const seenUrls = new Set<string>();
  const seenFileNames = new Set<string>();
  const images: ResourceGalleryImage[] = [];

  if (primaryThumb) {
    const baseKey = primaryThumb.split('?')[0].split('/').pop()?.toLowerCase() || primaryThumb;
    seenUrls.add(primaryThumb);
    seenFileNames.add(baseKey);
    images.push({
      url: primaryThumb,
      title: targetTitle,
      caption: `Primary reference photograph for ${targetTitle}`,
      attribution: 'Public Specimen Archive',
    });
  }

  const collectPages = (pages: MediaPage[], defaultSourceLabel: string) => {
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const mime = (info.mime || '').toLowerCase();
      if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/webp') continue;
      if ((info.width ?? 0) < 280 || (info.height ?? 0) < 180) continue;

      const rawTitle = (p.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, '');
      const lowerTitle = rawTitle.toLowerCase();
      if (IMAGE_SKIP_TITLE_TERMS.some((term) => lowerTitle.includes(term))) continue;

      const imgUrl = info.thumburl || info.url;
      if (!imgUrl) continue;
      const fileKey = imgUrl.split('?')[0].split('/').pop()?.toLowerCase() || imgUrl;
      if (seenUrls.has(imgUrl) || seenFileNames.has(fileKey)) continue;

      seenUrls.add(imgUrl);
      seenFileNames.add(fileKey);

      const rawDesc = stripHtmlTags(info.extmetadata?.ImageDescription?.value || '').replace(/\bWikipedia\b/gi, 'Online Reference');
      const rawArtist = stripHtmlTags(info.extmetadata?.Artist?.value || '').replace(/\bWikipedia\b/gi, 'Online Reference');
      const license = stripHtmlTags(info.extmetadata?.LicenseShortName?.value || '');
      const attributionParts = [rawArtist, license].filter(Boolean).slice(0, 2);

      images.push({
        url: imgUrl,
        title: rawTitle.replace(/_/g, ' '),
        caption: rawDesc ? rawDesc.slice(0, 140) : rawTitle.replace(/_/g, ' '),
        attribution: attributionParts.length > 0 ? attributionParts.join(' · ') : defaultSourceLabel,
        sourceUrl: info.descriptionurl,
      });

      if (images.length >= 8) break;
    }
  };

  collectPages(Object.values(wpRes.data?.query?.pages ?? {}), 'Online Specimen Archive');
  if (images.length < 8) {
    collectPages(Object.values(commonsRes.data?.query?.pages ?? {}), 'Public Specimen Archive');
  }

  if (images.length > 0) {
    galleryCache.set(cacheKey, {
      images,
      expiresAt: Date.now() + GALLERY_CACHE_TTL_MS,
    });
  }

  return {
    images,
    telemetry: {
      provider: 'Online Specimen Media Archive',
      endpoint: commonsUrl,
      status: wpRes.ok || commonsRes.ok ? (images.length > 0 ? 'ok' : 'not_found') : 'error',
      latencyMs: Math.max(wpRes.latencyMs, commonsRes.latencyMs),
      recordsFound: images.length,
    },
  };
}

function inferCountryFromGeoDesc(title: string, desc = '', isoCode?: string): string {
  const lower = desc.toLowerCase();
  if (lower.startsWith('country in ') || lower.startsWith('sovereign state') || lower.startsWith('island country')) {
    return title;
  }
  if (lower.includes('u.s. state') || lower.includes('united states')) return 'United States';
  if (lower.includes('province of canada') || lower.includes('canada')) return 'Canada';
  if (lower.includes('australia')) return 'Australia';
  if (lower.includes('india')) return 'India';
  if (lower.includes('china')) return 'China';
  if (lower.includes('russia')) return 'Russia';
  if (lower.includes('brazil')) return 'Brazil';
  if (lower.includes('chile')) return 'Chile';
  if (lower.includes('peru')) return 'Peru';
  if (lower.includes('italy')) return 'Italy';
  if (lower.includes('germany')) return 'Germany';
  if (lower.includes('south africa')) return 'South Africa';
  if (lower.includes('drc') || lower.includes('democratic republic of the congo')) return 'DR Congo';
  const parts = desc.split(',');
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].trim();
    if (tail.length >= 2 && tail.length <= 36) return tail;
  }
  return isoCode || 'International';
}

async function fetchWikipediaGeoOccurrences(
  query: string,
  wikiTitle?: string
): Promise<{
  occurrences: LiveGeoOccurrence[];
  telemetry: ApiSourceTelemetry;
}> {
  const targetTitle = (wikiTitle || query).trim();
  const mineSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    `${query.trim()} (mine OR deposit OR ore OR reserve)`
  )}&gsrlimit=12&prop=coordinates|description&colimit=12&format=json`;
  const linksUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=links&gpllimit=500&gplnamespace=0&titles=${encodeURIComponent(
    targetTitle
  )}&prop=coordinates|description&colimit=500&format=json&redirects=1`;

  interface WpGeoPage {
    title?: string;
    description?: string;
    coordinates?: Array<{ lat?: number; lon?: number; country?: string }>;
  }
  interface WpGeoResponse {
    query?: { pages?: Record<string, WpGeoPage> };
  }

  const [mineRes, linksRes] = await Promise.all([
    fetchJsonWithStatus<WpGeoResponse>(mineSearchUrl),
    fetchJsonWithStatus<WpGeoResponse>(linksUrl),
  ]);

  const badDescWords = [
    'observatory', 'institute', 'agency', 'university', 'museum', 'laboratory',
    'society', 'journal', 'award', 'prize', 'corporation', 'company', 'band',
    'album', 'film', 'person', 'chemist', 'physicist', 'telescope', 'spacecraft',
    'satellite', 'asteroid', 'planet', 'moon', 'star', 'comet', 'meteor',
    'station', 'airport', 'hospital', 'church', 'cathedral', 'monument',
    'ship', 'vessel', 'warship', 'school', 'college',
  ];
  const geoDescWords = [
    'mine', 'deposit', 'quarry', 'ore', 'field', 'basin', 'lake', 'river',
    'sea', 'gulf', 'island', 'peninsula', 'archipelago', 'plateau', 'plain',
    'steppe', 'desert', 'forest', 'valley', 'mountain', 'range', 'ridge',
    'canyon', 'crater', 'formation', 'province', 'state', 'country',
    'sovereign', 'republic', 'kingdom', 'city', 'town', 'village', 'settlement',
    'region', 'district', 'county', 'municipality', 'prefecture', 'oblast',
    'krai', 'territory', 'parish', 'department', 'canton', 'federal',
    'autonomous', 'waterfall', 'glacier', 'strait', 'delta', 'wetland',
    'swamp', 'marsh', 'park', 'reserve',
  ];

  const seenCoords = new Set<string>();
  const specificPlaces: LiveGeoOccurrence[] = [];
  const countryPlaces: LiveGeoOccurrence[] = [];

  const minePages = Object.values(mineRes.data?.query?.pages ?? {});
  for (const p of minePages) {
    const coord = p.coordinates?.[0];
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lon !== 'number') continue;
    const desc = p.description || '';
    const lowerDesc = desc.toLowerCase();
    if (badDescWords.some((w) => lowerDesc.includes(w))) continue;
    const key = `${coord.lat.toFixed(2)},${coord.lon.toFixed(2)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);

    const title = p.title || `${query} Deposit`;
    specificPlaces.push({
      siteName: title,
      country: inferCountryFromGeoDesc(title, desc, coord.country),
      region: desc || 'Georeferenced Mine / Deposit',
      latitude: coord.lat,
      longitude: coord.lon,
      verificationTier: 'reported_occurrence',
      depositType: desc || `Documented ${query} occurrence / mining locality`,
      sourceName: 'Online Spatial Index',
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
      observedYear: new Date().getFullYear(),
    });
  }

  const linkPages = Object.values(linksRes.data?.query?.pages ?? {});
  for (const p of linkPages) {
    const coord = p.coordinates?.[0];
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lon !== 'number') continue;
    const desc = p.description || '';
    const lowerDesc = desc.toLowerCase();
    if (badDescWords.some((w) => lowerDesc.includes(w))) continue;
    if (!geoDescWords.some((w) => lowerDesc.includes(w))) continue;
    const key = `${coord.lat.toFixed(2)},${coord.lon.toFixed(2)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);

    const title = p.title || `${query} Locality`;
    const isBroadCountry =
      lowerDesc.startsWith('country in ') ||
      lowerDesc.startsWith('sovereign state') ||
      lowerDesc.startsWith('island country');

    const entry: LiveGeoOccurrence = {
      siteName: title,
      country: inferCountryFromGeoDesc(title, desc, coord.country),
      region: desc || 'Geological Reference Locality',
      latitude: coord.lat,
      longitude: coord.lon,
      verificationTier: isBroadCountry ? 'estimated_distribution' : 'reported_occurrence',
      depositType: desc || `Referenced ${query} occurrence locality`,
      sourceName: 'Online Coordinate Registry',
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
      observedYear: new Date().getFullYear(),
    };

    if (isBroadCountry) {
      countryPlaces.push(entry);
    } else {
      specificPlaces.push(entry);
    }
  }

  // Prefer specific places/mines/basins, falling back to documented producing countries if needed
  const combined =
    specificPlaces.length >= 3
      ? [...specificPlaces.slice(0, 10), ...countryPlaces.slice(0, 3)]
      : [...specificPlaces, ...countryPlaces].slice(0, 12);

  return {
    occurrences: combined,
    telemetry: {
      provider: 'Online GeoCoordinates & Mine Search',
      endpoint: linksUrl,
      status: mineRes.ok || linksRes.ok ? (combined.length > 0 ? 'ok' : 'not_found') : 'error',
      latencyMs: Math.max(mineRes.latencyMs, linksRes.latencyMs),
      recordsFound: combined.length,
    },
  };
}

const KNOWN_GEO_PLACES: string[] = [
  // Major producing countries
  'Australia', 'Brazil', 'Canada', 'Chile', 'China', 'DR Congo', 'Democratic Republic of the Congo',
  'Finland', 'France', 'Germany', 'Ghana', 'Guinea', 'India', 'Indonesia', 'Iran', 'Italy',
  'Japan', 'Kazakhstan', 'Madagascar', 'Malaysia', 'Mexico', 'Mongolia', 'Morocco', 'Myanmar',
  'Namibia', 'Nigeria', 'Norway', 'Oman', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Russia', 'Saudi Arabia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Tanzania', 'Thailand', 'Turkey', 'Ukraine', 'United Kingdom',
  'United States', 'Uzbekistan', 'Vietnam', 'Zambia', 'Zimbabwe', 'Argentina', 'Bolivia',
  'Colombia', 'Ecuador', 'Egypt', 'Ethiopia', 'Greece', 'Greenland', 'Iceland', 'Ireland',
  'Kenya', 'Laos', 'New Zealand', 'Pakistan', 'Papua New Guinea', 'Romania', 'Serbia',
  // Major geological/mining provinces & basins
  'Manitoba', 'Ontario', 'Quebec', 'British Columbia', 'Western Australia', 'Queensland',
  'South Australia', 'New South Wales', 'Tasmania', 'Siberia', 'Ural Mountains', 'Kola Peninsula',
  'Sichuan', 'Yunnan', 'Inner Mongolia', 'Xinjiang', 'Hunan', 'Jiangxi', 'Shandong',
  'Minas Gerais', 'Atacama', 'Saxony', 'Bavaria', 'Cornwall', 'Sardinia', 'Sicily',
  'Odisha', 'Jharkhand', 'Rajasthan', 'Karnataka', 'Maharashtra', 'Gujarat', 'Madhya Pradesh',
  'Tamil Nadu', 'Andhra Pradesh', 'Nevada', 'Arizona', 'Utah', 'Colorado', 'Alaska',
  'California', 'Montana', 'Wyoming', 'New Mexico', 'Texas', 'Arkansas', 'North Carolina',
];

async function fetchWikipediaExtractRegionOccurrences(
  query: string,
  wikiTitle?: string
): Promise<{
  occurrences: LiveGeoOccurrence[];
  telemetry?: ApiSourceTelemetry;
}> {
  const targetTitle = (wikiTitle || query).trim();
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=6500&titles=${encodeURIComponent(
    targetTitle
  )}&redirects=1&format=json`;

  const extractRes = await fetchJsonWithStatus<{
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  }>(extractUrl);

  const page = Object.values(extractRes.data?.query?.pages ?? {})[0];
  const fullText = page?.extract || '';
  if (!fullText) {
    return { occurrences: [] };
  }

  // Extract documented countries/provinces mentioned in scientific Wikipedia article text
  const matchedPlaces: string[] = [];
  for (const place of KNOWN_GEO_PLACES) {
    const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(fullText)) {
      const canonical = place === 'Democratic Republic of the Congo' ? 'DR Congo' : place;
      if (!matchedPlaces.includes(canonical)) {
        matchedPlaces.push(canonical);
      }
      if (matchedPlaces.length >= 10) break;
    }
  }

  if (matchedPlaces.length === 0) {
    return { occurrences: [] };
  }

  const batchCoordUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    matchedPlaces.join('|')
  )}&prop=coordinates|description&redirects=1&format=json`;
  const coordRes = await fetchJsonWithStatus<{
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          description?: string;
          coordinates?: Array<{ lat?: number; lon?: number; country?: string }>;
        }
      >;
    };
  }>(batchCoordUrl);

  const pages = Object.values(coordRes.data?.query?.pages ?? {});
  const seen = new Set<string>();
  const occurrences: LiveGeoOccurrence[] = [];

  for (const p of pages) {
    const coord = p.coordinates?.[0];
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lon !== 'number') continue;
    const key = `${coord.lat.toFixed(2)},${coord.lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const placeName = p.title || query;
    const desc = p.description || '';
    occurrences.push({
      siteName: `${placeName} (${targetTitle} Documented Region)`,
      country: inferCountryFromGeoDesc(placeName, desc, coord.country),
      region: desc || 'Documented region in online reference archive',
      latitude: coord.lat,
      longitude: coord.lon,
      verificationTier: 'estimated_distribution',
      depositType: `Documented geographic occurrence / production region (${targetTitle})`,
      sourceName: 'Online Reference Registry',
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(targetTitle.replace(/\s+/g, '_'))}`,
      observedYear: new Date().getFullYear(),
    });
  }

  return {
    occurrences,
    telemetry: {
      provider: 'Online Regional Occurrence Geocoder',
      endpoint: extractUrl,
      status: occurrences.length > 0 ? 'ok' : 'not_found',
      latencyMs: extractRes.latencyMs + coordRes.latencyMs,
      recordsFound: occurrences.length,
    },
  };
}

async function fetchMacrostratMineral(query: string): Promise<{
  result?: LiveEnrichmentResult['macrostrat'];
  telemetry: ApiSourceTelemetry;
}> {
  const url = `https://macrostrat.org/api/v2/defs/minerals?mineral=${encodeURIComponent(query.trim())}`;
  const res = await fetchJsonWithStatus<{
    success?: {
      data?: Array<{
        mineral?: string;
        mineral_type?: string;
        formula?: string;
        hardness_min?: number;
        hardness_max?: number;
        crystal_form?: string;
        lustre?: string;
        mineral_color?: string;
      }>;
    };
  }>(url);

  const row = res.data?.success?.data?.[0];
  if (res.ok && row && row.mineral) {
    return {
      result: {
        mineralName: row.mineral,
        mineralType: row.mineral_type,
        formula: row.formula,
        hardnessMin: row.hardness_min,
        hardnessMax: row.hardness_max,
        crystalForm: row.crystal_form,
        lustre: row.lustre,
        color: row.mineral_color,
      },
      telemetry: {
        provider: 'Macrostrat Geological API',
        endpoint: url,
        status: 'ok',
        latencyMs: res.latencyMs,
        recordsFound: res.data?.success?.data?.length ?? 1,
      },
    };
  }

  return {
    telemetry: {
      provider: 'Macrostrat Geological API',
      endpoint: url,
      status: res.ok ? 'not_found' : res.errorType ?? 'error',
      latencyMs: res.latencyMs,
      recordsFound: 0,
      message: res.message ?? 'Not listed in Macrostrat mineral glossary',
    },
  };
}

async function fetchPubChemCompound(query: string): Promise<{
  result?: LiveEnrichmentResult['pubchem'];
  telemetry: ApiSourceTelemetry;
}> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    query.trim()
  )}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;
  const res = await fetchJsonWithStatus<{
    PropertyTable?: {
      Properties?: Array<{
        CID: number;
        MolecularFormula?: string;
        MolecularWeight?: string;
        IUPACName?: string;
      }>;
    };
  }>(url);

  const prop = res.data?.PropertyTable?.Properties?.[0];
  if (res.ok && prop) {
    return {
      result: {
        cid: prop.CID,
        molecularFormula: prop.MolecularFormula,
        molecularWeight: prop.MolecularWeight ? `${prop.MolecularWeight} g/mol` : undefined,
        iupacName: prop.IUPACName,
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${prop.CID}`,
      },
      telemetry: {
        provider: 'NIH PubChem PUG REST',
        endpoint: url,
        status: 'ok',
        latencyMs: res.latencyMs,
        recordsFound: 1,
      },
    };
  }

  return {
    telemetry: {
      provider: 'NIH PubChem PUG REST',
      endpoint: url,
      status: res.ok ? 'not_found' : res.errorType ?? 'error',
      latencyMs: res.latencyMs,
      recordsFound: 0,
      message: res.message ?? 'No matching PubChem compound entry',
    },
  };
}

async function fetchWikidataAndGeoOccurrences(query: string): Promise<{
  entity?: LiveEnrichmentResult['wikidata'];
  occurrences: LiveGeoOccurrence[];
  telemetry: ApiSourceTelemetry;
}> {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query.trim()
  )}&language=en&limit=4&format=json`;
  const searchRes = await fetchJsonWithStatus<{
    search?: Array<{ id: string; label?: string; description?: string }>;
  }>(searchUrl);

  if (!searchRes.ok || !searchRes.data?.search?.length) {
    return {
      occurrences: [],
      telemetry: {
        provider: 'Wikidata Knowledge Graph & SPARQL',
        endpoint: searchUrl,
        status: searchRes.ok ? 'not_found' : searchRes.errorType ?? 'error',
        latencyMs: searchRes.latencyMs,
        recordsFound: 0,
        message: searchRes.message ?? 'No Wikidata entity match',
      },
    };
  }

  // Prefer geological / mineral / chemical / natural resource entity matches
  const keywords = ['mineral', 'rock', 'metal', 'element', 'gemstone', 'soil', 'ore', 'compound', 'hydrocarbon', 'gas', 'plant', 'grass'];
  const bestMatch =
    searchRes.data.search.find((s) =>
      keywords.some((kw) => (s.description || '').toLowerCase().includes(kw))
    ) || searchRes.data.search[0];

  const qid = bestMatch.id;
  const sparql = `
SELECT DISTINCT ?formula ?hardness ?density ?cas ?crystalLabel ?place ?placeLabel ?countryLabel ?coord WHERE {
  OPTIONAL { wd:${qid} wdt:P274 ?formula. }
  OPTIONAL { wd:${qid} wdt:P1088 ?hardness. }
  OPTIONAL { wd:${qid} wdt:P2054 ?density. }
  OPTIONAL { wd:${qid} wdt:P231 ?cas. }
  OPTIONAL { wd:${qid} wdt:P556 ?crystal. }
  OPTIONAL {
    {
      { ?place wdt:P186 wd:${qid}. } UNION
      { ?place wdt:P2170 wd:${qid}. } UNION
      { wd:${qid} wdt:P1071 ?place. } UNION
      { wd:${qid} wdt:P189 ?place. } UNION
      { wd:${qid} wdt:P138 ?place. } UNION
      { ?place wdt:P31/wdt:P279* wd:Q820477; wdt:P366 wd:${qid}. }
      ?place wdt:P625 ?coord.
      OPTIONAL { ?place wdt:P17 ?country. }
    } UNION {
      wd:${qid} wdt:P495 ?country.
      ?country wdt:P625 ?coord.
      BIND(?country AS ?place)
    }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 15`;

  const sparqlUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const sparqlRes = await fetchJsonWithStatus<{
    results?: {
      bindings?: Array<Record<string, { value: string }>>;
    };
  }>(sparqlUrl, { Accept: 'application/sparql-results+json' });

  const bindings = sparqlRes.data?.results?.bindings ?? [];
  const first = bindings[0] ?? {};

  const seenCoords = new Set<string>();
  const occurrences: LiveGeoOccurrence[] = [];
  for (const row of bindings) {
    const coordStr = row.coord?.value;
    if (!coordStr) continue;
    const match = coordStr.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!match) continue;
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);

    occurrences.push({
      siteName: row.placeLabel?.value || `${bestMatch.label || query} Locality`,
      country: row.countryLabel?.value || 'International',
      region: 'Wikidata Verified Locality',
      latitude: lat,
      longitude: lng,
      verificationTier: 'reported_occurrence',
      depositType: 'Wikidata Georeferenced Locality / Mine',
      sourceName: 'Wikidata SPARQL',
      sourceUrl: row.place?.value || `https://www.wikidata.org/wiki/${qid}`,
      observedYear: new Date().getFullYear(),
    });
  }

  return {
    entity: {
      entityId: qid,
      label: bestMatch.label || query,
      description: bestMatch.description,
      chemicalFormula: first.formula?.value,
      crystalSystem: first.crystalLabel?.value,
      mohsHardness: first.hardness?.value ? `${first.hardness.value} Mohs` : undefined,
      density: first.density?.value ? `${first.density.value} g/cm³` : undefined,
      casNumber: first.cas?.value,
      url: `https://www.wikidata.org/wiki/${qid}`,
    },
    occurrences,
    telemetry: {
      provider: 'Wikidata Knowledge Graph & SPARQL',
      endpoint: `https://www.wikidata.org/wiki/${qid}`,
      status: sparqlRes.ok ? 'ok' : sparqlRes.errorType ?? 'ok',
      latencyMs: searchRes.latencyMs + sparqlRes.latencyMs,
      recordsFound: 1 + occurrences.length,
      message: sparqlRes.ok ? undefined : sparqlRes.message,
    },
  };
}

async function fetchWorldBankResourceStats(categoryHint: string): Promise<{
  rows: WorldBankIndicatorRow[];
  telemetry: ApiSourceTelemetry;
}> {
  const lower = categoryHint.toLowerCase();
  let indicator = 'NY.GDP.MINR.RT.ZS';
  let indicatorName = 'Mineral rents (% of GDP)';

  if (lower.includes('forest') || lower.includes('timber') || lower.includes('bamboo') || lower.includes('plant')) {
    indicator = 'AG.LND.FRST.ZS';
    indicatorName = 'Forest area (% of land area)';
  } else if (lower.includes('soil') || lower.includes('chernozem') || lower.includes('laterite') || lower.includes('loam') || lower.includes('peat')) {
    indicator = 'NV.AGR.TOTL.ZS';
    indicatorName = 'Agriculture, forestry, and fishing value added (% of GDP)';
  } else if (lower.includes('coal')) {
    indicator = 'NY.GDP.COAL.RT.ZS';
    indicatorName = 'Coal rents (% of GDP)';
  } else if (lower.includes('petroleum') || lower.includes('oil')) {
    indicator = 'NY.GDP.PETR.RT.ZS';
    indicatorName = 'Oil rents (% of GDP)';
  } else if (lower.includes('natural gas') || lower.includes('gas')) {
    indicator = 'NY.GDP.NGAS.RT.ZS';
    indicatorName = 'Natural gas rents (% of GDP)';
  } else if (lower.includes('water') || lower.includes('river') || lower.includes('lake') || lower.includes('groundwater')) {
    indicator = 'ER.H2O.FWTL.ZS';
    indicatorName = 'Annual freshwater withdrawals (% of internal resources)';
  }

  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&mrv=1&per_page=150`;
  const res = await fetchJsonWithStatus<
    [
      { page: number },
      Array<{
        country: { id: string; value: string };
        countryiso3code: string;
        date: string;
        value: number | null;
      }>
    ]
  >(url);

  const list = Array.isArray(res.data) ? res.data[1] : undefined;
  if (!res.ok || !Array.isArray(list)) {
    return {
      rows: [],
      telemetry: {
        provider: 'World Bank Open Data API',
        endpoint: url,
        status: res.errorType ?? 'error',
        latencyMs: res.latencyMs,
        recordsFound: 0,
        message: res.message ?? 'Unable to retrieve World Bank indicator',
      },
    };
  }

  // Filter out regional aggregates (keep sovereign countries with ISO3 and non-null positive value)
  const excludeIds = new Set(['WLD', 'AFE', 'AFW', 'ARB', 'CSS', 'CEB', 'EAR', 'EAS', 'EAP', 'TEA', 'EMU', 'ECS', 'ECA', 'TEC', 'EUU', 'FCS', 'HPC', 'HIC', 'IBD', 'IBT', 'IDB', 'IDX', 'IDA', 'LTE', 'LCN', 'LAC', 'TLA', 'LDC', 'LMY', 'LIC', 'LMC', 'MEA', 'MNA', 'TMN', 'MIC', 'NAC', 'INX', 'OED', 'OSS', 'PSS', 'PST', 'PRE', 'SST', 'SAS', 'TSA', 'SSF', 'SSA', 'TSS', 'UMC']);
  const rows: WorldBankIndicatorRow[] = list
    .filter((item) => item.value !== null && item.value > 0 && item.countryiso3code && !excludeIds.has(item.countryiso3code))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)
    .map((item) => ({
      country: item.country.value,
      iso3: item.countryiso3code,
      value: Number((item.value ?? 0).toFixed(2)),
      year: Number(item.date) || 2022,
      indicatorName,
      indicatorCode: indicator,
      source: 'World Bank Open Data API',
    }));

  return {
    rows,
    telemetry: {
      provider: 'World Bank Open Data API',
      endpoint: url,
      status: 'ok',
      latencyMs: res.latencyMs,
      recordsFound: rows.length,
    },
  };
}

async function fetchGbifOccurrences(query: string): Promise<{
  occurrences: LiveGeoOccurrence[];
  telemetry: ApiSourceTelemetry;
}> {
  const url = `https://api.gbif.org/v1/occurrence/search?q=${encodeURIComponent(query.trim())}&hasCoordinate=true&limit=10`;
  const res = await fetchJsonWithStatus<{
    results?: Array<{
      key: number;
      scientificName?: string;
      species?: string;
      country?: string;
      continent?: string;
      decimalLatitude?: number;
      decimalLongitude?: number;
      year?: number;
    }>;
  }>(url);

  const items = res.data?.results ?? [];
  const occurrences: LiveGeoOccurrence[] = items
    .filter((r) => typeof r.decimalLatitude === 'number' && typeof r.decimalLongitude === 'number')
    .slice(0, 8)
    .map((r) => ({
      siteName: `${r.species || r.scientificName || query} GBIF Specimen #${r.key}`,
      country: r.country || 'Unknown',
      region: r.continent || 'GBIF Occurrence',
      latitude: r.decimalLatitude as number,
      longitude: r.decimalLongitude as number,
      verificationTier: 'verified_deposit',
      depositType: 'GBIF Georeferenced Biological Occurrence',
      sourceName: 'GBIF Occurrence Network',
      sourceUrl: `https://www.gbif.org/occurrence/${r.key}`,
      observedYear: r.year,
    }));

  return {
    occurrences,
    telemetry: {
      provider: 'GBIF Biodiversity API',
      endpoint: url,
      status: res.ok ? (occurrences.length > 0 ? 'ok' : 'not_found') : res.errorType ?? 'error',
      latencyMs: res.latencyMs,
      recordsFound: occurrences.length,
      message: res.message,
    },
  };
}

function inferCategoryFromExternal(
  query: string,
  wikiDesc = '',
  hasMacrostrat = false,
  hasPubchem = false
): { category: string; subcategory: string } {
  const text = `${query} ${wikiDesc}`.toLowerCase();
  if (hasMacrostrat || text.includes('mineral') || text.includes('silicate') || text.includes('sulfide') || text.includes('oxide') || text.includes('carbonate')) {
    return { category: 'Minerals', subcategory: wikiDesc || 'Online-Fetched Mineral Specimen' };
  }
  if (text.includes('gem') || text.includes('beryl') || text.includes('corundum') || text.includes('garnet') || text.includes('topaz') || text.includes('opal') || text.includes('jade')) {
    return { category: 'Gemstones', subcategory: wikiDesc || 'Gemstone Variety' };
  }
  if (text.includes('rock') || text.includes('igneous') || text.includes('metamorphic') || text.includes('sedimentary') || text.includes('sandstone') || text.includes('shale') || text.includes('gneiss') || text.includes('obsidian')) {
    return { category: 'Rocks', subcategory: wikiDesc || 'Geological Rock Formation' };
  }
  if (text.includes('metal') || text.includes('lithium') || text.includes('cobalt') || text.includes('nickel') || text.includes('titanium') || text.includes('zinc') || text.includes('uranium') || text.includes('bauxite')) {
    return { category: 'Metals', subcategory: wikiDesc || 'Metallic Element / Ore' };
  }
  if (text.includes('soil') || text.includes('loam') || text.includes('clay') || text.includes('peat')) {
    return { category: 'Soil', subcategory: wikiDesc || 'Pedogenic Soil Order' };
  }
  if (text.includes('river') || text.includes('lake') || text.includes('aquifer') || text.includes('water')) {
    return { category: 'Water Resources', subcategory: wikiDesc || 'Hydrological Resource' };
  }
  if (text.includes('coal') || text.includes('oil') || text.includes('petroleum') || text.includes('gas') || text.includes('geothermal')) {
    return { category: 'Energy Resources', subcategory: wikiDesc || 'Energy Resource' };
  }
  if (text.includes('tree') || text.includes('plant') || text.includes('wood') || text.includes('timber') || text.includes('bamboo') || text.includes('herb')) {
    return { category: 'Forest Resources', subcategory: wikiDesc || 'Botanical Resource' };
  }
  if (hasPubchem || text.includes('chemical') || text.includes('element') || text.includes('compound')) {
    return { category: 'Chemical Elements & Compounds', subcategory: wikiDesc || 'Chemical Species' };
  }
  return { category: 'Minerals', subcategory: wikiDesc || 'Natural Resource Record' };
}

export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchLiveResourceData(query: string, categoryHint?: string): Promise<LiveEnrichmentResult> {
  const cleanQuery = query.trim();
  const lower = `${cleanQuery} ${categoryHint || ''}`.toLowerCase();
  const isBiological =
    lower.includes('forest') ||
    lower.includes('timber') ||
    lower.includes('bamboo') ||
    lower.includes('medicinal') ||
    lower.includes('plant') ||
    lower.includes('tree');

  const [wikiRes, macroRes, pubchemRes, wikidataRes, wbRes, gbifRes] = await Promise.all([
    fetchWikipediaSummary(cleanQuery),
    fetchMacrostratMineral(cleanQuery),
    fetchPubChemCompound(cleanQuery),
    fetchWikidataAndGeoOccurrences(cleanQuery),
    fetchWorldBankResourceStats(categoryHint || cleanQuery),
    isBiological ? fetchGbifOccurrences(cleanQuery) : Promise.resolve(null),
  ]);

  const resolvedTitle = wikiRes.result?.title || wikidataRes.entity?.label || cleanQuery;
  const [wikiGeoRes, galleryRes] = await Promise.all([
    fetchWikipediaGeoOccurrences(cleanQuery, resolvedTitle),
    fetchResourceImageGallery(cleanQuery, resolvedTitle, wikiRes.result?.thumbnailUrl),
  ]);

  const telemetry: ApiSourceTelemetry[] = [
    wikiRes.telemetry,
    wikiGeoRes.telemetry,
    galleryRes.telemetry,
    macroRes.telemetry,
    pubchemRes.telemetry,
    wikidataRes.telemetry,
    wbRes.telemetry,
  ];
  if (gbifRes) {
    telemetry.push(gbifRes.telemetry);
  }

  // Deduplicate live coordinates across Wikidata, Wikipedia Geo, and GBIF
  const mergedOccurrences: LiveGeoOccurrence[] = [];
  const coordSeen = new Set<string>();
  for (const occ of [
    ...wikidataRes.occurrences,
    ...wikiGeoRes.occurrences,
    ...(gbifRes?.occurrences ?? []),
  ]) {
    const key = `${occ.latitude.toFixed(2)},${occ.longitude.toFixed(2)}`;
    if (coordSeen.has(key)) continue;
    coordSeen.add(key);
    mergedOccurrences.push(occ);
  }

  // Secondary fallback: if fewer than 2 coordinates found, geocode regions explicitly documented in Wikipedia's article text
  if (mergedOccurrences.length < 2) {
    const extractGeoRes = await fetchWikipediaExtractRegionOccurrences(cleanQuery, resolvedTitle);
    if (extractGeoRes.telemetry) {
      telemetry.push(extractGeoRes.telemetry);
    }
    for (const occ of extractGeoRes.occurrences) {
      const key = `${occ.latitude.toFixed(2)},${occ.longitude.toFixed(2)}`;
      if (coordSeen.has(key)) continue;
      coordSeen.add(key);
      mergedOccurrences.push(occ);
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    query: cleanQuery,
    wikipedia: wikiRes.result,
    macrostrat: macroRes.result,
    pubchem: pubchemRes.result,
    wikidata: wikidataRes.entity,
    liveOccurrences: mergedOccurrences,
    worldBankStats: wbRes.rows,
    galleryImages: galleryRes.images,
    telemetry,
  };
}

export async function upsertLiveDiscoveredResource(
  query: string,
  enrichment: LiveEnrichmentResult,
  targetResourceId?: number
): Promise<number | null> {
  if (
    !targetResourceId &&
    !enrichment.wikipedia &&
    !enrichment.macrostrat &&
    !enrichment.wikidata &&
    !enrichment.pubchem
  ) {
    return null;
  }

  const title =
    enrichment.wikipedia?.title ||
    enrichment.macrostrat?.mineralName ||
    enrichment.wikidata?.label ||
    query.trim();
  const slug = toSlug(title);
  const querySlug = toSlug(query);
  if (!slug && !querySlug && !targetResourceId) return null;

  let existing: Array<{ id: number }> = [];
  if (targetResourceId) {
    existing = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.id, targetResourceId));
  }
  if (existing.length === 0 && slug) {
    existing = await db.select({ id: resources.id }).from(resources).where(eq(resources.slug, slug));
  }
  if (existing.length === 0 && querySlug && querySlug !== slug) {
    existing = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.slug, querySlug));
  }

  if (existing.length > 0) {
    // Append any new live occurrences that don't overlap
    const resId = existing[0].id;
    if (enrichment.liveOccurrences.length > 0) {
      const currentOcc = await db
        .select({ lat: resourceOccurrences.latitude, lng: resourceOccurrences.longitude })
        .from(resourceOccurrences)
        .where(eq(resourceOccurrences.resourceId, resId));

      const existingKeys = new Set(currentOcc.map((o) => `${o.lat.toFixed(2)},${o.lng.toFixed(2)}`));
      const newOnes = enrichment.liveOccurrences.filter(
        (o) => !existingKeys.has(`${o.latitude.toFixed(2)},${o.longitude.toFixed(2)}`)
      );

      if (newOnes.length > 0) {
        await db.insert(resourceOccurrences).values(
          newOnes.slice(0, 12).map((occ) => ({
            resourceId: resId,
            siteName: occ.siteName,
            country: occ.country,
            region: occ.region,
            latitude: occ.latitude,
            longitude: occ.longitude,
            verificationTier: occ.verificationTier,
            depositType: occ.depositType,
            sourceName: occ.sourceName,
            sourceUrl: occ.sourceUrl,
            observedYear: occ.observedYear ?? new Date().getFullYear(),
          }))
        );
      }
    }
    return resId;
  }

  const { category, subcategory } = inferCategoryFromExternal(
    title,
    enrichment.wikipedia?.description || enrichment.wikidata?.description,
    Boolean(enrichment.macrostrat),
    Boolean(enrichment.pubchem)
  );

  const formula =
    enrichment.macrostrat?.formula ||
    enrichment.wikidata?.chemicalFormula ||
    enrichment.pubchem?.molecularFormula ||
    'Formula not reported in upstream APIs';

  const physicalProperties: PhysicalPropertiesMap = {};
  if (enrichment.macrostrat?.hardnessMin || enrichment.macrostrat?.hardnessMax) {
    physicalProperties.hardness = `${enrichment.macrostrat.hardnessMin ?? '?'}–${enrichment.macrostrat.hardnessMax ?? '?'} Mohs`;
  } else if (enrichment.wikidata?.mohsHardness) {
    physicalProperties.hardness = enrichment.wikidata.mohsHardness;
  }
  if (enrichment.wikidata?.density) physicalProperties.density = enrichment.wikidata.density;
  if (enrichment.macrostrat?.crystalForm || enrichment.wikidata?.crystalSystem) {
    physicalProperties.crystalSystem = enrichment.macrostrat?.crystalForm || enrichment.wikidata?.crystalSystem;
  }
  if (enrichment.macrostrat?.lustre) physicalProperties.luster = enrichment.macrostrat.lustre;
  if (enrichment.macrostrat?.color) physicalProperties.color = enrichment.macrostrat.color;
  if (enrichment.pubchem?.molecularWeight) physicalProperties.molecularWeight = enrichment.pubchem.molecularWeight;
  if (enrichment.wikidata?.casNumber) physicalProperties.casRegistry = enrichment.wikidata.casNumber;

  const majorProducers: ProducerMetric[] = enrichment.worldBankStats.slice(0, 5).map((wb) => ({
    country: wb.country,
    iso3: wb.iso3,
    annualOutput: wb.value,
    unit: wb.indicatorName,
    year: wb.year,
    status: 'reported',
    source: wb.source,
  }));

  const [inserted] = await db
    .insert(resources)
    .values({
      slug,
      name: title,
      category,
      subcategory,
      chemicalFormula: formula,
      summary:
        enrichment.wikipedia?.extract ||
        enrichment.wikidata?.description ||
        `Online-retrieved scientific record for ${title}.`,
      physicalProperties,
      formationOrigin:
        enrichment.wikipedia?.extract ||
        'Retrieved via online scientific & geological APIs; geological origin details vary by host formation.',
      industrialApplications: [
        enrichment.wikipedia?.description
          ? `Documented classification: ${enrichment.wikipedia.description}`
          : 'Refer to upstream Macrostrat / PubChem scientific record for industrial specifications',
      ],
      agriculturalApplications: [],
      environmentalImportance:
        'External API record. Environmental stewardship depends on extraction method, tailings containment, and local watershed regulation.',
      majorProducers,
      availabilityMetrics: {
        globalReservesText:
          enrichment.liveOccurrences.length > 0
            ? `${enrichment.liveOccurrences.length} verified/reported localities retrieved from online registries`
            : 'No reserve tonnage figure reported by public APIs for this query',
        renewability: category === 'Forest Resources' ? 'Potentially renewable under sustainable management' : 'Non-renewable geological resource',
        scarcityIndex: 50,
        reserveLifeYears: null,
        source: 'Online Scientific APIs (Wikidata / Macrostrat / PubChem / World Bank)',
        year: new Date().getFullYear(),
      },
      historicalPrices: [],
      applicationBreakdown: [],
      imageUrl: enrichment.wikipedia?.thumbnailUrl || '/src/assets/images/specimen_minerals_quartz_1794920307836.jpg',
      imageAttribution: enrichment.wikipedia?.thumbnailUrl ? 'Public Specimen Reference Archive' : 'GeoAtlas Fallback Specimen Plate',
      dataOrigin: 'live_api_fetched',
      sourceName: [
        enrichment.wikipedia ? 'Online Scientific Reference' : null,
        enrichment.wikidata ? 'Wikidata' : null,
        enrichment.macrostrat ? 'Macrostrat' : null,
        enrichment.pubchem ? 'PubChem' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      sourceUrl: enrichment.wikidata?.url || enrichment.pubchem?.url || '',
      lastUpdated: new Date().toISOString().slice(0, 10),
    })
    .returning({ id: resources.id });

  if (inserted?.id && enrichment.liveOccurrences.length > 0) {
    await db.insert(resourceOccurrences).values(
      enrichment.liveOccurrences.map((occ) => ({
        resourceId: inserted.id,
        siteName: occ.siteName,
        country: occ.country,
        region: occ.region,
        latitude: occ.latitude,
        longitude: occ.longitude,
        verificationTier: occ.verificationTier,
        depositType: occ.depositType,
        sourceName: occ.sourceName,
        sourceUrl: occ.sourceUrl,
        observedYear: occ.observedYear ?? new Date().getFullYear(),
      }))
    );
  }

  return inserted?.id ?? null;
}
