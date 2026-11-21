export interface PhysicalPropertiesMap {
  hardness?: string;
  density?: string;
  color?: string;
  crystalSystem?: string;
  luster?: string;
  cleavage?: string;
  meltingPoint?: string;
  boilingPoint?: string;
  phRange?: string;
  texture?: string;
  stateAtSTP?: string;
  specificGravity?: string;
  calorificValue?: string;
  [key: string]: string | undefined;
}

export interface ProducerMetric {
  country: string;
  iso3: string;
  sharePct?: number;
  annualOutput?: number;
  unit: string;
  year: number;
  status: 'verified' | 'reported' | 'estimated';
  source: string;
}

export interface AvailabilityMetric {
  globalReservesText: string;
  renewability: string;
  scarcityIndex: number;
  reserveLifeYears?: number | null;
  unit?: string;
  source: string;
  year: number;
}

export interface HistoricalPricePoint {
  year: number;
  price: number;
  unit: string;
  source: string;
  status: 'verified' | 'estimated';
}

export interface ApplicationShare {
  sector: string;
  sharePct: number;
  source: string;
}

export interface ResourceOccurrence {
  id: number;
  resourceId: number;
  siteName: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  verificationTier: 'verified_deposit' | 'reported_occurrence' | 'estimated_distribution';
  depositType: string;
  sourceName: string;
  sourceUrl?: string | null;
  observedYear?: number | null;
  distanceKm?: number;
}

export interface ResourceItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  chemicalFormula: string;
  summary: string;
  physicalProperties: PhysicalPropertiesMap;
  formationOrigin: string;
  industrialApplications: string[];
  agriculturalApplications: string[];
  environmentalImportance: string;
  majorProducers: ProducerMetric[];
  availabilityMetrics: AvailabilityMetric;
  historicalPrices: HistoricalPricePoint[];
  applicationBreakdown: ApplicationShare[];
  imageUrl?: string | null;
  imageAttribution?: string | null;
  dataOrigin: 'curated_verified' | 'live_api_fetched';
  sourceName: string;
  sourceUrl?: string | null;
  lastUpdated: string;
  occurrences: ResourceOccurrence[];
}

export interface ResourceGalleryImage {
  url: string;
  title: string;
  caption?: string;
  attribution?: string;
  sourceUrl?: string;
}

export interface ApiSourceTelemetry {
  provider: string;
  endpoint: string;
  status: 'ok' | 'not_found' | 'rate_limited' | 'timeout' | 'error';
  latencyMs: number;
  recordsFound: number;
  message?: string;
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
  liveOccurrences: Array<{
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
  }>;
  worldBankStats: WorldBankIndicatorRow[];
  galleryImages?: ResourceGalleryImage[];
  telemetry: ApiSourceTelemetry[];
}

export interface SpecimenScanResult {
  predictedName: string;
  matchedSlug: string | null;
  category: string;
  subcategory: string;
  chemicalFormula: string;
  confidenceLevel: 'High Visual Match' | 'Moderate Visual Match' | 'Low Confidence — Ambiguous Features';
  confidencePct: number;
  uncertaintyDisclaimer: string;
  visualCuesObserved: string[];
  physicalProperties: {
    estimatedHardness: string;
    luster: string;
    colorAndHabit: string;
    diagnosticFieldTests: string;
  };
  commonApplications: string[];
  similarResources: Array<{
    name: string;
    distinguishingFeature: string;
  }>;
}

export interface SavedResourceRecord {
  id: number;
  userUid: string;
  resourceSlug: string;
  resourceName: string;
  category: string;
  notes?: string | null;
  createdAt: string;
}

export interface ScanHistoryRecord {
  id: number;
  userUid: string;
  predictedName: string;
  category: string;
  confidenceLabel: string;
  confidencePct: number;
  analysisJson: SpecimenScanResult;
  createdAt: string;
}

export interface ResourceChatStep {
  stepNumber: number;
  title: string;
  audience: string;
  content: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface UserGeoLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface ResourceChatResponse {
  replyMarkdown: string;
  steps: ResourceChatStep[];
  groundingSources: GroundingSource[];
  liveEnrichment: LiveEnrichmentResult;
  updatedResource?: ResourceItem | null;
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  modelUsed: string;
  fetchedAt: string;
}

export interface LiveMarketSeriesPayload {
  symbol: string;
  instrumentName: string;
  matchType: 'exact_commodity_spot' | 'resource_sector_index';
  unit: string;
  currentPrice: number;
  previousPrice: number;
  changePct: number;
  asOfDate: string;
  fetchedAt: string;
  source: string;
  points: Array<{ date: string; price: number }>;
}

export interface LiveLocalityClimateSeries {
  siteName: string;
  country: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  latestDate: string;
  latestTempC: number;
  latestPrecipMm: number;
  source: string;
  days: Array<{ date: string; tempC: number; precipMm: number }>;
}

export interface ResourceLiveAnalyticsResponse {
  market: LiveMarketSeriesPayload | null;
  climateSeries: LiveLocalityClimateSeries | null;
  fetchedAt: string;
}

