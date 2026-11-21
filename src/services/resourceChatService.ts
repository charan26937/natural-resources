import { type GenerateContentResponse, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { CURATED_RESOURCES } from '../data/curatedResources.ts';
import type {
  GroundingSource,
  LiveEnrichmentResult,
  LiveMarketSeriesPayload,
  ResourceChatStep,
  ResourceOccurrence,
  UserGeoLocation,
} from '../types/resource.ts';
import { getLiveResourceMarketBenchmark } from './liveAnalyticsService.ts';
import { fetchLiveResourceData, upsertLiveDiscoveredResource } from './liveResourceFetcher.ts';

export class ResourceAiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ResourceAiError';
    this.statusCode = statusCode;
  }
}

interface CachedChatReply {
  replyMarkdown: string;
  steps: ResourceChatStep[];
  groundingSources: GroundingSource[];
  liveEnrichment: LiveEnrichmentResult;
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  modelUsed: string;
  fetchedAt: string;
  expiresAt: number;
}

const CHAT_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CHAT_CACHE_SIZE = 120;
const chatReplyCache = new Map<string, CachedChatReply>();
let geminiChatCooldownUntil = 0;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function isNearbyLocationIntent(message: string): boolean {
  const q = message.toLowerCase();
  return /\b(near|nearly|nearby|nearest|closest|around me|my location|in my area|close to me|near me|how far|distance)\b/.test(
    q
  );
}

async function discoverRegionalOccurrencesNearUser(
  resourceName: string,
  userLocation: UserGeoLocation
): Promise<ResourceOccurrence[]> {
  const results: ResourceOccurrence[] = [];
  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.latitude.toFixed(
      4
    )}&lon=${userLocation.longitude.toFixed(4)}&format=json&zoom=8`;
    const revRes = await fetch(revUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GlobalNaturalResourcesExplorer/1.0',
      },
      signal: AbortSignal.timeout(4500),
    });

    let regionHint = userLocation.label || '';
    let countryHint = '';
    if (revRes.ok) {
      const revJson = (await revRes.json()) as {
        address?: { state?: string; region?: string; country?: string; county?: string };
      };
      const addr = revJson.address;
      regionHint = addr?.state || addr?.region || addr?.county || regionHint;
      countryHint = addr?.country || '';
    }

    const areaQuery = [regionHint, countryHint].filter(Boolean).join(', ');
    if (areaQuery) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        `${resourceName} ${regionHint || countryHint} (mine OR deposit OR quarry OR belt OR basin OR reserve)`
      )}&gsrlimit=8&prop=coordinates|description&colimit=8&format=json`;
      const wpRes = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GlobalNaturalResourcesExplorer/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (wpRes.ok) {
        const wpJson = (await wpRes.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                title?: string;
                description?: string;
                coordinates?: Array<{ lat?: number; lon?: number }>;
              }
            >;
          };
        };
        const pages = Object.values(wpJson.query?.pages ?? {});
        const badWords = [
          'university', 'company', 'airport', 'museum', 'person', 'hospital', 'school',
          'irrigation', 'scheme', 'canal', 'bridge', 'temple', 'church', 'mosque',
          'fort', 'palace', 'monument', 'railway', 'station', 'highway', 'stadium',
          'dam', 'barrages', 'electoral', 'constituency', 'politician',
        ];
        let idx = 0;
        for (const p of pages) {
          const coord = p.coordinates?.[0];
          if (!coord || typeof coord.lat !== 'number' || typeof coord.lon !== 'number') continue;
          const titleLower = (p.title || '').toLowerCase();
          const desc = p.description || '';
          const descLower = desc.toLowerCase();
          if (badWords.some((w) => titleLower.includes(w) || descLower.includes(w))) continue;
          idx += 1;
          results.push({
            id: -(500 + idx),
            resourceId: 0,
            siteName: p.title || `${resourceName} Regional Site`,
            country: countryHint || regionHint || 'Regional',
            region: regionHint || desc || 'Regional Occurrence',
            latitude: coord.lat,
            longitude: coord.lon,
            verificationTier: 'reported_occurrence',
            depositType: desc || `Documented regional ${resourceName} occurrence`,
            sourceName: 'Online Spatial Index',
            sourceUrl: null,
            observedYear: new Date().getFullYear(),
          });
        }
      }
    }
  } catch {
    // Non-fatal: fall back to catalog + live occurrences
  }
  return results;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ResourceAiError(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      400
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiError(err: unknown): { code: number; message: string; status: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const statusProp =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : NaN;

  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; message?: string; status?: string };
    };
    if (parsed?.error) {
      return {
        code: Number(parsed.error.code) || (Number.isFinite(statusProp) ? statusProp : 500),
        message: parsed.error.message || raw,
        status: parsed.error.status || 'UNKNOWN',
      };
    }
  } catch {
    // Plain error string
  }

  return {
    code: Number.isFinite(statusProp) ? statusProp : 500,
    message: raw,
    status: 'UNKNOWN',
  };
}

export async function transcribeVoiceAudio(
  base64Audio: string,
  mimeType: string
): Promise<string> {
  const ai = getAiClient();
  const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;

  if (!cleanBase64) {
    throw new ResourceAiError('Audio payload is empty.', 400);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe the spoken natural-resource, mineral, soil, or geological question verbatim. Return only the spoken text cleanly.',
          },
        ],
      },
    });

    const transcript = (response.text ?? '').trim();
    if (!transcript) {
      throw new ResourceAiError('No speech detected in the recording. Please try again.', 400);
    }
    return transcript;
  } catch (err: unknown) {
    if (err instanceof ResourceAiError) throw err;
    const parsed = parseGeminiError(err);
    if (parsed.code === 400 || parsed.code === 403) {
      throw new ResourceAiError(
        'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.',
        parsed.code
      );
    }
    if (parsed.code === 429) {
      throw new ResourceAiError(
        'Gemini API rate limit reached during transcription. Please try again shortly.',
        429
      );
    }
    if (parsed.code === 503) {
      throw new ResourceAiError(
        'Voice transcription service is experiencing temporary high demand. Please retry in a moment.',
        503
      );
    }
    throw new ResourceAiError(parsed.message || 'Voice transcription failed.', parsed.code);
  }
}

const STEP_AUDIENCE_DEFAULTS: Record<number, string> = {
  1: 'Overview & Properties',
  2: 'Global Data & Mapping',
  3: 'Uses & Where Used',
  4: 'Agriculture & Soil Farmers',
  5: 'Scientists & Researchers',
  6: 'Students & Easy Learning',
};

function parseStructuredSteps(markdownText: string): ResourceChatStep[] {
  const stepRegex =
    /(?:^|\n)#{2,3}\s*Step\s*(\d+)\s*[:\-–]\s*([^\n]+)\n([\s\S]*?)(?=(?:\n#{2,3}\s*Step\s*\d+\s*[:\-–])|$)/gi;

  const steps: ResourceChatStep[] = [];
  let match: RegExpExecArray | null;
  while ((match = stepRegex.exec(markdownText)) !== null) {
    const stepNumber = Number.parseInt(match[1], 10);
    const title = match[2].trim().replace(/\*\*/g, '');
    const content = match[3].trim();
    if (!content) continue;
    steps.push({
      stepNumber,
      title,
      audience: STEP_AUDIENCE_DEFAULTS[stepNumber] || 'Guided Section',
      content,
    });
  }

  return steps.sort((a, b) => a.stepNumber - b.stepNumber);
}

export interface ResourceChatContext {
  id?: number;
  slug?: string;
  name: string;
  category?: string;
  subcategory?: string;
  chemicalFormula?: string;
  summary?: string;
  formationOrigin?: string;
  environmentalImportance?: string;
  physicalProperties?: Record<string, string | undefined>;
  industrialApplications?: string[];
  agriculturalApplications?: string[];
  historicalPrices?: Array<{
    year: number;
    price: number;
    unit: string;
    source: string;
    status: string;
  }>;
  occurrences?: Array<{
    id?: number;
    resourceId?: number;
    siteName: string;
    country: string;
    region: string;
    latitude: number;
    longitude: number;
    verificationTier?: string;
    depositType: string;
    sourceName?: string;
    sourceUrl?: string | null;
    observedYear?: number | null;
  }>;
}

function buildResourceContextText(
  resource: ResourceChatContext,
  live: LiveEnrichmentResult,
  market: LiveMarketSeriesPayload | null,
  userLocation?: UserGeoLocation | null,
  nearestOccurrences: ResourceOccurrence[] = []
): string {
  const lines: string[] = [];
  lines.push(`RESOURCE: ${resource.name || live.query} (${resource.category || 'Natural Resource'} / ${resource.subcategory || 'Reference'})`);
  if (resource.chemicalFormula) lines.push(`CHEMICAL FORMULA / COMPOSITION: ${resource.chemicalFormula}`);
  if (resource.summary) lines.push(`SUMMARY: ${resource.summary}`);

  if (market) {
    lines.push(
      `CURRENT COMMODITY MARKET FEED (${market.symbol}): ${market.instrumentName} = $${market.currentPrice.toLocaleString()} (${market.unit}, 1Y change ${market.changePct >= 0 ? '+' : ''}${market.changePct}%, as of ${market.asOfDate}, source: ${market.source})`
    );
  }
  if (resource.historicalPrices?.length) {
    const latestHist = resource.historicalPrices[resource.historicalPrices.length - 1];
    lines.push(
      `DOCUMENTED REFERENCE PRICE (${latestHist.year}): $${latestHist.price.toLocaleString()} per ${latestHist.unit} (${latestHist.status}, source: ${latestHist.source})`
    );
  }

  if (resource.physicalProperties && Object.keys(resource.physicalProperties).length > 0) {
    const props = Object.entries(resource.physicalProperties)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    lines.push(`PHYSICAL PROPERTIES: ${props}`);
  }

  if (resource.industrialApplications?.length) {
    lines.push(`KNOWN INDUSTRIAL USES: ${resource.industrialApplications.join('; ')}`);
  }
  if (resource.agriculturalApplications?.length) {
    lines.push(`KNOWN AGRICULTURAL USES: ${resource.agriculturalApplications.join('; ')}`);
  }

  if (userLocation && nearestOccurrences.length > 0) {
    lines.push(
      `NEAREST AVAILABLE SITES TO USER LOCATION (${userLocation.label || `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}`}): ` +
        nearestOccurrences
          .slice(0, 8)
          .map(
            (o) =>
              `${o.siteName} (${o.country}, ~${o.distanceKm ?? '?'} km away [${o.latitude.toFixed(2)}, ${o.longitude.toFixed(2)}] - ${o.depositType})`
          )
          .join(' | ')
    );
  }

  const allOccurrences = [
    ...(resource.occurrences || []).map((o) => ({
      site: o.siteName,
      country: o.country,
      region: o.region,
      lat: o.latitude,
      lon: o.longitude,
      type: o.depositType,
    })),
    ...live.liveOccurrences.map((o) => ({
      site: o.siteName,
      country: o.country,
      region: o.region,
      lat: o.latitude,
      lon: o.longitude,
      type: o.depositType,
    })),
  ].slice(0, 20);

  if (allOccurrences.length > 0) {
    lines.push(
      `VERIFIED MAPPED LOCALITIES (${allOccurrences.length} shown): ` +
        allOccurrences
          .map(
            (o) =>
              `${o.site} (${o.country}, ${o.region} [${o.lat.toFixed(2)}, ${o.lon.toFixed(2)}] - ${o.type})`
          )
          .join(' | ')
    );
  }

  if (live.wikipedia?.extract) {
    lines.push(`ONLINE REFERENCE (${live.wikipedia.title}): ${live.wikipedia.extract}`);
  }
  if (live.wikidata) {
    lines.push(
      `WIKIDATA (${live.wikidata.entityId}): formula=${live.wikidata.chemicalFormula || 'n/a'}, crystal=${live.wikidata.crystalSystem || 'n/a'}, hardness=${live.wikidata.mohsHardness || 'n/a'}, density=${live.wikidata.density || 'n/a'}`
    );
  }
  if (live.macrostrat) {
    lines.push(
      `MACROSTRAT: mineral=${live.macrostrat.mineralName}, type=${live.macrostrat.mineralType || 'n/a'}, formula=${live.macrostrat.formula || 'n/a'}, lustre=${live.macrostrat.lustre || 'n/a'}`
    );
  }
  if (live.pubchem) {
    lines.push(
      `PUBCHEM (CID ${live.pubchem.cid}): formula=${live.pubchem.molecularFormula || 'n/a'}, weight=${live.pubchem.molecularWeight || 'n/a'}`
    );
  }
  if (live.worldBankStats.length > 0) {
    lines.push(
      `WORLD BANK (${live.worldBankStats[0].indicatorName}): ` +
        live.worldBankStats
          .slice(0, 6)
          .map((w) => `${w.country} (${w.year}: ${w.value}%)`)
          .join(', ')
    );
  }

  return lines.join('\n');
}

const EXTRA_DISTINCT_RESOURCE_NAMES = [
  'diamond', 'ruby', 'emerald', 'sapphire', 'amethyst', 'topaz', 'opal', 'jade', 'garnet', 'pearl',
  'amber', 'turquoise', 'aquamarine', 'peridot', 'zircon', 'obsidian', 'pumice', 'shale', 'sandstone',
  'slate', 'gneiss', 'schist', 'quartzite', 'dolomite', 'calcite', 'halite', 'pyrite', 'galena',
  'bauxite', 'hematite', 'magnetite', 'malachite', 'azurite', 'fluorite', 'apatite', 'talc', 'corundum',
  'vermiculite', 'feldspar', 'gypsum', 'mica', 'quartz', 'granite', 'marble', 'basalt', 'limestone',
  'gold', 'silver', 'iron', 'copper', 'platinum', 'mercury', 'lithium', 'cobalt', 'nickel', 'zinc',
  'tungsten', 'rubidium', 'caesium', 'cesium', 'scandium', 'titanium', 'uranium', 'thorium', 'aluminum',
  'aluminium', 'tin', 'lead', 'chromium', 'manganese', 'magnesium', 'potassium', 'sodium', 'phosphorus',
  'sulfur', 'sulphur', 'silicon', 'boron', 'helium', 'neon', 'argon', 'nitrogen', 'chlorine',
  'hydrogen', 'oxygen', 'carbon', 'carbon dioxide', 'methane', 'coal', 'petroleum', 'natural gas',
  'peat', 'lignite', 'anthracite', 'timber', 'bamboo', 'medicinal plants', 'red soil', 'black soil',
  'alluvial soil', 'laterite soil', 'chernozem', 'rivers', 'lakes', 'groundwater',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectOffTopicResourceRequest(
  userMessage: string,
  currentResourceName: string,
  knownResourceNames: string[] = []
): string | null {
  const msgLower = userMessage.trim().toLowerCase();
  const currentLower = currentResourceName.trim().toLowerCase();
  if (!msgLower || !currentLower) return null;

  // If the user explicitly names the current resource (e.g. "compare marble uses"), do not hijack
  if (msgLower.includes(currentLower)) {
    return null;
  }

  const currentWords = new Set(
    currentLower
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3)
  );

  // Exclude generic non-resource question words or intrinsic domain nouns
  const genericDomainTerms = new Set([
    'water', 'soil', 'carbon', 'oxygen', 'hydrogen', 'nitrogen', 'calcium', 'iron', 'magnesium',
    'silicon', 'timber', 'mineral', 'minerals', 'rock', 'rocks', 'metal', 'metals', 'gemstone',
    'gemstones', 'energy', 'forest', 'crystal', 'crystals',
  ]);

  const candidates = Array.from(
    new Set([
      ...CURATED_RESOURCES.map((r) => r.name.toLowerCase()),
      ...knownResourceNames.map((n) => n.trim().toLowerCase()),
      ...EXTRA_DISTINCT_RESOURCE_NAMES,
    ])
  )
    .filter((name) => {
      if (!name || name === currentLower) return false;
      if (currentLower.includes(name) || name.includes(currentLower)) return false;
      if (currentWords.has(name)) return false;
      // Avoid false positives when "water" or "soil" appears in a normal sentence about Marble
      const words = msgLower.split(/\s+/);
      if (genericDomainTerms.has(name) && words.length > 2) return false;
      return true;
    })
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    const regex = new RegExp(`\\b${escapeRegex(candidate)}s?\\b`, 'i');
    if (regex.test(msgLower)) {
      return candidate.replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
  }

  return null;
}

function wantsFullStepGuide(message: string): boolean {
  const q = message.trim().toLowerCase();
  if (!q) return false;
  return /\b(complete step-by-step|full guide|all details|everything about|comprehensive guide|step-by-step guide)\b/.test(
    q
  );
}

function buildFocusedFallbackReply(
  r: ResourceChatContext,
  userMessage: string,
  live: LiveEnrichmentResult,
  uniqueSites: string[],
  priceLines: string[],
  props: string,
  indUses: string,
  agUses: string,
  userLocation?: UserGeoLocation | null,
  nearestOccurrences: ResourceOccurrence[] = []
): string {
  const q = userMessage.toLowerCase();
  const sections: string[] = [];

  const asksAg = /\b(agri\w*|farm\w*|crop\w*|soil\w*|fertiliz\w*|irrigation|mulch\w*|compost\w*|agro\w*)\b/.test(
    q
  );
  const asksPrice = /\b(price\w*|value\w*|cost\w*|market\w*|rate\w*|usd|worth|economic\w*|trade\w*)\b/.test(
    q
  );
  const asksNearbyOrMap =
    Boolean(userLocation && nearestOccurrences.length > 0 && isNearbyLocationIntent(userMessage)) ||
    /\b(near|nearly|nearby|nearest|closest|around me|my location|where|country|countries|map\w*|location\w*|found|region\w*|deposit\w*|mine\w*|quarry|quarries)\b/.test(
      q
    );
  const asksIndustry =
    /\b(industr\w*|everyday|use|uses|useful\w*|usage|application\w*|product\w*|build\w*|construct\w*|manufactur\w*)\b/.test(
      q
    ) && !asksAg;
  const asksProps =
    /\b(propert\w*|formula\w*|chemical\w*|hardness|density|luster|lustre|color\w*|crystal\w*|what is)\b/.test(
      q
    );
  const asksScience =
    /\b(scien\w*|research\w*|lab\w*|xrd|xrf|icp|origin\w*|formation\w*|geolog\w*|environment\w*)\b/.test(
      q
    );
  const asksStudent = /\b(student\w*|simple|easy|learn\w*|study|studying|explain\w*|exam\w*)\b/.test(
    q
  );

  if (asksAg) {
    sections.push(
      `### ${r.name} — Agriculture & Farming Uses\n` +
        (agUses ||
          `- No direct primary agricultural application is documented for **${r.name}** in baseline records; indirect suitability depends on local soil chemistry and processing.`)
    );
  }

  if (asksPrice) {
    sections.push(
      `### ${r.name} — Market & Reference Price Value\n` +
        (priceLines.length > 0
          ? priceLines.join('\n')
          : `- Pricing for **${r.name}** varies by commercial grade, purity, and regional market volume.`)
    );
  }

  if (asksNearbyOrMap) {
    const locHeader =
      userLocation && nearestOccurrences.length > 0
        ? `Nearest documented **${r.name}** sites around **${
            userLocation.label || `${userLocation.latitude.toFixed(2)}°, ${userLocation.longitude.toFixed(2)}°`
          }** (also pinned on the map below):`
        : `Documented **${r.name}** localities & regions:`;
    sections.push(
      `### ${r.name} — Available Locations\n${locHeader}\n` +
        (uniqueSites.length > 0
          ? uniqueSites.join('\n')
          : `- Consult the distribution map on this page for mapped **${r.name}** sites.`)
    );
  }

  if (asksIndustry) {
    sections.push(
      `### ${r.name} — Uses & Applications\n` +
        (indUses ||
          `- Practical uses for **${r.name}** depend on grade, processing, and structural specifications.`)
    );
  }

  if (asksProps) {
    sections.push(
      `### ${r.name} — Composition & Properties\n` +
        `${r.summary || live.wikipedia?.extract || ''}\n` +
        (r.chemicalFormula ? `- **Composition / Formula**: ${r.chemicalFormula}\n` : '') +
        (props || '')
    );
  }

  if (asksScience) {
    const sciLines = [
      r.formationOrigin ? `- **Formation / Origin**: ${r.formationOrigin}` : '',
      r.environmentalImportance ? `- **Environmental Role**: ${r.environmentalImportance}` : '',
      live.wikidata?.entityId
        ? `- **Wikidata Entity**: ${live.wikidata.entityId}${
            live.wikidata.crystalSystem ? ` (${live.wikidata.crystalSystem})` : ''
          }`
        : '',
      live.macrostrat
        ? `- **Macrostrat Classification**: ${live.macrostrat.mineralType || 'Mineral'}`
        : '',
      live.pubchem ? `- **NIH PubChem CID**: ${live.pubchem.cid}` : '',
    ].filter(Boolean);
    sections.push(`### ${r.name} — Scientific & Research Details\n` + sciLines.join('\n'));
  }

  if (asksStudent) {
    sections.push(
      `### ${r.name} — Student Guide\n` +
        `1. **Category**: ${r.name} belongs to **${r.category || 'Natural Resources'}** (${r.subcategory || 'General'}).\n` +
        `2. **Composition**: ${r.chemicalFormula || 'Variable natural composition'}.\n` +
        `3. **Summary**: ${r.summary || `Key natural resource in ${r.category || 'Earth sciences'}.`}`
    );
  }

  if (sections.length === 0) {
    sections.push(
      `### ${r.name}\n` +
        `${r.summary || live.wikipedia?.extract || `Verified reference profile for ${r.name}.`}\n` +
        (r.chemicalFormula ? `\n- **Composition / Formula**: ${r.chemicalFormula}` : '') +
        (priceLines.length > 0 ? `\n${priceLines.join('\n')}` : '') +
        (props ? `\n${props}` : '')
    );
  }

  return sections.join('\n\n').trim();
}

function buildStructuredScientificFallback(
  params: {
    resource: ResourceChatContext;
    userMessage: string;
    hasMedia?: boolean;
  },
  live: LiveEnrichmentResult,
  offTopicResource: string | null,
  market: LiveMarketSeriesPayload | null,
  userLocation?: UserGeoLocation | null,
  nearestOccurrences: ResourceOccurrence[] = []
): {
  replyMarkdown: string;
  steps: ResourceChatStep[];
  groundingSources: GroundingSource[];
  liveEnrichment: LiveEnrichmentResult;
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  modelUsed: string;
  fetchedAt: string;
} {
  const r = params.resource;
  const props = Object.entries(r.physicalProperties || {})
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `- **${k.replace(/([A-Z])/g, ' $1').trim()}**: ${v}`)
    .join('\n');

  const occSource =
    userLocation && nearestOccurrences.length > 0
      ? nearestOccurrences
      : [...(r.occurrences || []), ...(live.liveOccurrences || [])];

  const uniqueSites: string[] = [];
  const seenSiteNames = new Set<string>();
  for (const o of occSource) {
    const key = o.siteName.toLowerCase();
    if (!seenSiteNames.has(key)) {
      seenSiteNames.add(key);
      const distLabel =
        typeof (o as ResourceOccurrence).distanceKm === 'number'
          ? ` — **~${(o as ResourceOccurrence).distanceKm!.toLocaleString()} km from your location**`
          : '';
      uniqueSites.push(
        `- **${o.siteName}** (${o.country || 'International'}) — ${o.latitude.toFixed(3)}°, ${o.longitude.toFixed(3)}°${distLabel} (${o.depositType || o.region || 'Verified locality'})`
      );
    }
    if (uniqueSites.length >= 8) break;
  }

  const priceLines: string[] = [];
  if (market) {
    priceLines.push(
      `- **Market Benchmark (${market.instrumentName})**: $${market.currentPrice.toLocaleString()} (${market.unit}, ${market.changePct >= 0 ? '+' : ''}${market.changePct}% 1Y as of ${market.asOfDate})`
    );
  }
  if (r.historicalPrices?.length) {
    const latestHist = r.historicalPrices[r.historicalPrices.length - 1];
    priceLines.push(
      `- **Reference Commodity Price (${latestHist.year})**: $${latestHist.price.toLocaleString()} / ${latestHist.unit} (${latestHist.source})`
    );
  }

  const indUses = (r.industrialApplications || []).map((u) => `- ${u}`).join('\n');
  const agUses = (r.agriculturalApplications || []).map((u) => `- ${u}`).join('\n');

  const scopePrefix = offTopicResource
    ? `Note: This page only provides **${r.name}** content (not ${offTopicResource}). To view ${offTopicResource}, use the main Search bar or Explore section.\n\n`
    : '';
  const mediaNotice = params.hasMedia
    ? `*(AI vision capacity is temporarily throttled; below is the verified scientific profile for **${r.name}**.)*\n\n`
    : '';

  const isFullGuide = wantsFullStepGuide(params.userMessage);
  let replyMarkdown: string;

  if (!isFullGuide && !offTopicResource) {
    replyMarkdown =
      mediaNotice +
      buildFocusedFallbackReply(
        r,
        params.userMessage,
        live,
        uniqueSites,
        priceLines,
        props,
        indUses,
        agUses,
        userLocation,
        nearestOccurrences
      );
  } else {
    const nearbyHeadingNote =
      userLocation && nearestOccurrences.length > 0
        ? `Nearest documented sites around **${userLocation.label || `${userLocation.latitude.toFixed(2)}°, ${userLocation.longitude.toFixed(2)}°`}** (plotted on map below):\n`
        : '';

    replyMarkdown = [
      '## Step 1: Data Overview & Key Properties',
      `${scopePrefix}${mediaNotice}${r.summary || live.wikipedia?.extract || `Verified reference profile for ${r.name}.`}`,
      r.chemicalFormula ? `- **Composition / Formula**: ${r.chemicalFormula}` : '',
      ...priceLines,
      props || '- Refer to physical properties table on this profile.',
      '',
      '## Step 2: Global Data & Exact Mapping Regions',
      nearbyHeadingNote +
        (uniqueSites.length > 0
          ? uniqueSites.join('\n')
          : `- Consult the interactive distribution map on this page for documented **${r.name}** localities.`),
      '',
      '## Step 3: Everyday & Industrial Uses (Where & How It Is Used)',
      indUses || `- Industrial specifications for **${r.name}** depend on grade, purity, and host rock processing.`,
      '',
      '## Step 4: Agriculture & Farming Usefulness',
      agUses || `- No direct primary agricultural application is documented for **${r.name}** in baseline records; indirect use depends on local soil chemistry and mineral processing.`,
      '',
      '## Step 5: For Scientists & Researchers',
      `${r.formationOrigin || 'Geological formation varies by host basin and regional tectonics.'}`,
      live.wikidata?.entityId ? `- **Wikidata Entity**: ${live.wikidata.entityId}${live.wikidata.crystalSystem ? ` (${live.wikidata.crystalSystem})` : ''}` : '',
      live.macrostrat ? `- **Macrostrat Glossary**: ${live.macrostrat.mineralType || 'Mineral'}${live.macrostrat.lustre ? `, Luster: ${live.macrostrat.lustre}` : ''}` : '',
      live.pubchem ? `- **NIH PubChem CID**: ${live.pubchem.cid}${live.pubchem.molecularWeight ? ` (${live.pubchem.molecularWeight})` : ''}` : '',
      r.environmentalImportance ? `- **Environmental Note**: ${r.environmentalImportance}` : '',
      '',
      '## Step 6: For Students & Easy Step-by-Step Understanding',
      `1. **What it is**: ${r.name} belongs to **${r.category || 'Natural Resources'}** (${r.subcategory || 'General'}).`,
      `2. **Key formula / composition**: ${r.chemicalFormula || 'Variable natural composition'}.`,
      `3. **Where to find it on the map**: Check the ${uniqueSites.length} mapped sites listed in Step 2 above.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const groundingSources: GroundingSource[] = [];
  if (live.wikidata?.url) {
    groundingSources.push({ title: `Wikidata · ${r.name}`, url: live.wikidata.url });
  }
  if (live.pubchem?.url) {
    groundingSources.push({ title: `NIH PubChem · ${r.name}`, url: live.pubchem.url });
  }

  return {
    replyMarkdown,
    steps: parseStructuredSteps(replyMarkdown),
    groundingSources,
    liveEnrichment: live,
    userLocation: userLocation ?? null,
    nearestOccurrences,
    modelUsed: 'verified-scientific-synthesis',
    fetchedAt: new Date().toISOString(),
  };
}

export async function runLiveResourceChat(params: {
  resource: ResourceChatContext;
  userMessage: string;
  strictScope?: boolean;
  knownResourceNames?: string[];
  userLocation?: UserGeoLocation | null;
  imageBase64?: string;
  imageMimeType?: string;
  videoBase64?: string;
  videoMimeType?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<{
  replyMarkdown: string;
  steps: ResourceChatStep[];
  groundingSources: GroundingSource[];
  liveEnrichment: LiveEnrichmentResult;
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  modelUsed: string;
  fetchedAt: string;
}> {
  const ai = getAiClient();

  const isStrict = Boolean(params.strictScope);
  const offTopicResource =
    isStrict && !params.imageBase64 && !params.videoBase64
      ? detectOffTopicResourceRequest(
          params.userMessage,
          params.resource.name,
          params.knownResourceNames
        )
      : null;

  const hasValidUserLoc =
    params.userLocation &&
    typeof params.userLocation.latitude === 'number' &&
    typeof params.userLocation.longitude === 'number' &&
    Number.isFinite(params.userLocation.latitude) &&
    Number.isFinite(params.userLocation.longitude);
  const normalizedUserLoc: UserGeoLocation | null = hasValidUserLoc ? params.userLocation! : null;

  const isCacheableTextQuery =
    !params.imageBase64 &&
    !params.videoBase64 &&
    (!params.history || params.history.length === 0);
  const locCachePart = normalizedUserLoc
    ? `${normalizedUserLoc.latitude.toFixed(2)},${normalizedUserLoc.longitude.toFixed(2)}`
    : 'noloc';
  const cacheKey = isCacheableTextQuery
    ? `${(params.resource.slug || params.resource.name).toLowerCase()}::${isStrict}::${locCachePart}::${(offTopicResource ? `__offtopic__:${offTopicResource}` : params.userMessage.trim().toLowerCase())}`
    : '';

  if (cacheKey) {
    const cached = chatReplyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        replyMarkdown: cached.replyMarkdown,
        steps: cached.steps,
        groundingSources: cached.groundingSources,
        liveEnrichment: cached.liveEnrichment,
        userLocation: cached.userLocation,
        nearestOccurrences: cached.nearestOccurrences,
        modelUsed: cached.modelUsed,
        fetchedAt: cached.fetchedAt,
      };
    }
  }

  // Always fetch scientific data & current price benchmark in parallel
  const [liveEnrichment, marketBenchmark] = await Promise.all([
    fetchLiveResourceData(params.resource.name, params.resource.category),
    getLiveResourceMarketBenchmark(params.resource.name, params.resource.category || ''),
  ]);

  if (liveEnrichment.liveOccurrences.length > 0) {
    await upsertLiveDiscoveredResource(
      params.resource.name,
      liveEnrichment,
      params.resource.id
    ).catch((err) => {
      console.warn('Non-fatal occurrence persistence note:', err);
    });
  }

  // Compute nearest available resource localities if userLocation is provided
  let nearestOccurrences: ResourceOccurrence[] = [];
  if (normalizedUserLoc) {
    const combinedRaw: ResourceOccurrence[] = [
      ...(params.resource.occurrences || []).map((o, idx) => ({
        id: o.id ?? -(idx + 1),
        resourceId: o.resourceId ?? params.resource.id ?? 0,
        siteName: o.siteName,
        country: o.country,
        region: o.region,
        latitude: o.latitude,
        longitude: o.longitude,
        verificationTier: (o.verificationTier === 'verified_deposit' ||
        o.verificationTier === 'reported_occurrence' ||
        o.verificationTier === 'estimated_distribution'
          ? o.verificationTier
          : 'verified_deposit') as ResourceOccurrence['verificationTier'],
        depositType: o.depositType,
        sourceName: o.sourceName ?? 'Atlas Record',
        sourceUrl: o.sourceUrl ?? null,
        observedYear: o.observedYear ?? null,
      })),
      ...liveEnrichment.liveOccurrences.map((o, idx) => ({
        id: -(100 + idx),
        resourceId: params.resource.id ?? 0,
        siteName: o.siteName,
        country: o.country,
        region: o.region,
        latitude: o.latitude,
        longitude: o.longitude,
        verificationTier: o.verificationTier,
        depositType: o.depositType,
        sourceName: o.sourceName,
        sourceUrl: o.sourceUrl ?? null,
        observedYear: o.observedYear ?? new Date().getFullYear(),
      })),
    ];

    const hasCloseSite = combinedRaw.some(
      (o) =>
        haversineDistanceKm(
          normalizedUserLoc.latitude,
          normalizedUserLoc.longitude,
          o.latitude,
          o.longitude
        ) <= 350
    );

    if (!hasCloseSite || isNearbyLocationIntent(params.userMessage)) {
      const regionalFound = await discoverRegionalOccurrencesNearUser(
        params.resource.name,
        normalizedUserLoc
      );
      combinedRaw.push(...regionalFound);
    }

    const dedupMap = new Map<string, ResourceOccurrence>();
    for (const occ of combinedRaw) {
      if (!Number.isFinite(occ.latitude) || !Number.isFinite(occ.longitude)) continue;
      const dist = haversineDistanceKm(
        normalizedUserLoc.latitude,
        normalizedUserLoc.longitude,
        occ.latitude,
        occ.longitude
      );
      const coordKey = `${occ.latitude.toFixed(2)},${occ.longitude.toFixed(2)}`;
      if (!dedupMap.has(coordKey)) {
        dedupMap.set(coordKey, { ...occ, distanceKm: dist });
      }
    }

    nearestOccurrences = Array.from(dedupMap.values())
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 8);
  }

  if (Date.now() < geminiChatCooldownUntil) {
    return buildStructuredScientificFallback(
      {
        resource: params.resource,
        userMessage: params.userMessage,
        hasMedia: Boolean(params.imageBase64 || params.videoBase64),
      },
      liveEnrichment,
      offTopicResource,
      marketBenchmark,
      normalizedUserLoc,
      nearestOccurrences
    );
  }

  const contextBlock = buildResourceContextText(
    params.resource,
    liveEnrichment,
    marketBenchmark,
    normalizedUserLoc,
    nearestOccurrences
  );

  const effectiveUserQuestion = offTopicResource
    ? `Provide the complete verified data, pricing, mapping, uses, agriculture, research, and student guide strictly for ${params.resource.name} ONLY. Do NOT include any facts, properties, uses, or content about ${offTopicResource}.`
    : params.userMessage;

  const historyText = (offTopicResource ? [] : params.history || [])
    .slice(-4)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text.slice(0, 500)}`)
    .join('\n');

  const isFullGuide = wantsFullStepGuide(effectiveUserQuestion) && !offTopicResource;

  const promptText = [
    `You are an authoritative yet crystal-clear Earth Sciences, Mineralogy, Agriculture, and Resource Geography educator.`,
    isStrict
      ? `STRICT SINGLE-RESOURCE SCOPE RULE (NON-NEGOTIABLE): You are STRICTLY LOCKED to "${params.resource.name}" (${params.resource.category || 'Natural Resource'}) ONLY. You MUST ONLY provide content regarding "${params.resource.name}". NEVER switch topics to or provide content about any other mineral, rock, gemstone, metal, soil, water, energy, or chemical resource (for example Diamond, Gold, Quartz, Granite, etc.).`
      : `The user is exploring "${params.resource.name}" (${params.resource.category || 'Natural Resource'}).`,
    offTopicResource
      ? `IMPORTANT: The user typed "${params.userMessage}" (${offTopicResource}) while inside the "${params.resource.name}" page. Do NOT provide any content about ${offTopicResource}. In Step 1, begin with a crisp 1-sentence notice: "Note: This page only provides **${params.resource.name}** content (not ${offTopicResource}). To view ${offTopicResource}, use the main Search bar or Explore section." Then devote ALL 6 steps 100% exclusively to **${params.resource.name}**.`
      : `The user asked about "${params.resource.name}": "${effectiveUserQuestion}"`,
    normalizedUserLoc
      ? `USER LOCATION PROVIDED: ${normalizedUserLoc.label || 'Current Location'} (${normalizedUserLoc.latitude.toFixed(4)}°, ${normalizedUserLoc.longitude.toFixed(4)}°). Cite the nearest documented ${params.resource.name} sites with their distance in km from the user's location and note that they are pinned on the interactive map below.`
      : '',
    params.imageBase64
      ? `The user also attached a photograph. Examine the photo carefully and connect your visual observations strictly to ${params.resource.name}.`
      : '',
    params.videoBase64
      ? `The user also recorded/attached a video clip. Inspect the visual video frames AND audio track, and answer strictly in the context of ${params.resource.name}.`
      : '',
    '',
    'SCIENTIFIC, PRICING & DATABASE CONTEXT:',
    contextBlock,
    historyText ? `\nRECENT CONVERSATION:\n${historyText}` : '',
    '',
    ...(isFullGuide || offTopicResource
      ? [
          'RESPONSE FORMAT REQUIREMENTS (FULL GUIDE REQUESTED):',
          `Organize the full guide for "${params.resource.name}" into ALL 6 numbered headings below using exact "## Step N: Title" markdown syntax:`,
          '',
          '## Step 1: Data Overview & Key Properties',
          `- ${offTopicResource ? `First include the 1-sentence scope notice explaining this chat only provides ${params.resource.name} content (not ${offTopicResource}), then summarize` : 'Summarize'} the answer for ${params.resource.name} including current market/reference price value (if available), chemical composition, and physical traits.`,
          '## Step 2: Global Data & Exact Mapping Regions',
          normalizedUserLoc
            ? `- Start with the nearest available ${params.resource.name} occurrences to the user's location (${normalizedUserLoc.label || 'user coordinates'}) with km distances, followed by other major global places/deposits.`
            : `- List major countries AND exact places, regions, basins, or quarries/mines worldwide for ${params.resource.name}.`,
          '## Step 3: Everyday & Industrial Uses (Where & How It Is Used)',
          `- Explain clearly where ${params.resource.name} is used in real life, factories, construction, or daily products.`,
          '## Step 4: Agriculture & Farming Usefulness',
          `- Explain specifically how ${params.resource.name} helps (or affects) agriculture, crops, soil fertility, pH amendment, water conservation, fertilizers, or farm tools.`,
          '## Step 5: For Scientists & Researchers',
          `- Provide analytical detail for ${params.resource.name}: classification, lab & field instrumentation, environmental pathways, and research.`,
          '## Step 6: For Students & Easy Step-by-Step Understanding',
          `- Give a plain-language step-by-step breakdown of ${params.resource.name} with 3 quick study takeaways.`,
        ]
      : [
          'DIRECT QUESTION RESPONSE RULE (MANDATORY):',
          `- Answer ONLY what the user specifically asked ("${effectiveUserQuestion}") regarding "${params.resource.name}".`,
          '- Do NOT add unrequested sections such as global production tables, unrelated mapping lists, industrial uses (unless asked), scientist lab methods (unless asked), or student study guides (unless asked).',
          '- Format cleanly using Markdown (a concise `###` heading and clear bullet points or short paragraphs) focused 100% on the user’s exact question.',
        ]),
    '',
    `Be factual, cite real numbers/units strictly for ${params.resource.name}, never invent fake coordinates or prices, never output a guide for any other resource, and NEVER display or mention the name "Wikipedia" or the word "live" anywhere in your text.`,
  ]
    .filter(Boolean)
    .join('\n');

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (params.imageBase64 && params.imageMimeType) {
    const cleanImg = params.imageBase64.includes(',')
      ? params.imageBase64.split(',')[1]
      : params.imageBase64;
    if (cleanImg) {
      parts.push({
        inlineData: {
          mimeType: params.imageMimeType,
          data: cleanImg,
        },
      });
    }
  }
  if (params.videoBase64 && params.videoMimeType) {
    const cleanVid = params.videoBase64.includes(',')
      ? params.videoBase64.split(',')[1]
      : params.videoBase64;
    if (cleanVid) {
      parts.push({
        inlineData: {
          mimeType: params.videoMimeType.split(';')[0],
          data: cleanVid,
        },
      });
    }
  }
  parts.push({ text: promptText });

  const attempts: Array<{
    model: string;
    thinkingLevel: ThinkingLevel;
    useGoogleSearch: boolean;
  }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, useGoogleSearch: true },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, useGoogleSearch: true },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, useGoogleSearch: false },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, useGoogleSearch: false },
  ];

  let lastError: { code: number; message: string; status: string } | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const candidate = attempts[i];
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: candidate.model,
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
          ...(candidate.useGoogleSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const replyMarkdown = (response.text ?? '').trim();
      if (!replyMarkdown) {
        throw new Error('Empty response returned by Gemini.');
      }

      const steps = parseStructuredSteps(replyMarkdown);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seenUrls = new Set<string>();
      const groundingSources: GroundingSource[] = [];
      for (const ch of chunks) {
        const uri = ch.web?.uri;
        if (uri && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          const cleanTitle = (ch.web?.title || uri)
            .replace(/\s*[-–|·]\s*Wikipedia\b/gi, '')
            .replace(/\bWikipedia\b/gi, 'Online Reference')
            .trim();
          groundingSources.push({
            title: cleanTitle || 'Online Scientific Source',
            url: uri,
          });
        }
      }

      const chatResult = {
        replyMarkdown,
        steps,
        groundingSources: groundingSources.slice(0, 8),
        liveEnrichment,
        userLocation: normalizedUserLoc,
        nearestOccurrences,
        modelUsed: candidate.model,
        fetchedAt: new Date().toISOString(),
      };

      if (cacheKey) {
        if (chatReplyCache.size >= MAX_CHAT_CACHE_SIZE) {
          const oldestKey = chatReplyCache.keys().next().value;
          if (oldestKey) chatReplyCache.delete(oldestKey);
        }
        chatReplyCache.set(cacheKey, {
          ...chatResult,
          expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
        });
      }

      return chatResult;
    } catch (err: unknown) {
      const parsed = parseGeminiError(err);
      lastError = parsed;
      console.warn(
        `Gemini chat attempt failed (${candidate.model}, search=${candidate.useGoogleSearch}):`,
        parsed.code,
        parsed.message
      );

      if (parsed.code === 400 || parsed.code === 403) {
        throw new ResourceAiError(
          'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.',
          parsed.code
        );
      }

      if (parsed.code === 429) {
        geminiChatCooldownUntil = Date.now() + 45_000;
        return buildStructuredScientificFallback(
          {
            resource: params.resource,
            userMessage: params.userMessage,
            hasMedia: Boolean(params.imageBase64 || params.videoBase64),
          },
          liveEnrichment,
          offTopicResource,
          marketBenchmark,
          normalizedUserLoc,
          nearestOccurrences
        );
      }

      if ((parsed.code === 503 || parsed.code === 404) && i < attempts.length - 1) {
        await sleep(1200);
        continue;
      }
    }
  }

  if (lastError && lastError.code !== 400 && lastError.code !== 403) {
    return buildStructuredScientificFallback(
      {
        resource: params.resource,
        userMessage: params.userMessage,
        hasMedia: Boolean(params.imageBase64 || params.videoBase64),
      },
      liveEnrichment,
      offTopicResource,
      marketBenchmark,
      normalizedUserLoc,
      nearestOccurrences
    );
  }

  throw new ResourceAiError(
    lastError?.message || 'Unable to generate resource briefing.',
    lastError?.code && lastError.code >= 400 ? lastError.code : 500
  );
}
