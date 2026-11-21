import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  resourceOccurrences,
  resources,
  savedResources,
  scanHistory,
} from './src/db/schema.ts';
import { RESOURCE_CATEGORIES } from './src/data/curatedResources.ts';
import { ensureCuratedSeeded } from './src/db/seed.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { type AuthRequest, requireAuth } from './src/middleware/auth.ts';
import { analyzeSpecimenImage, GeminiScannerError } from './src/services/geminiScanner.ts';
import {
  fetchLiveResourceData,
  fetchResourceImageGallery,
  toSlug,
  upsertLiveDiscoveredResource,
} from './src/services/liveResourceFetcher.ts';
import {
  getClimateForPoints,
  getGlobalClimateGrid,
} from './src/services/climateService.ts';
import {
  getGlobalLiveCommodityBoard,
  getLiveLocalityDailySeries,
  getLiveResourceMarketBenchmark,
} from './src/services/liveAnalyticsService.ts';
import {
  ResourceAiError,
  runLiveResourceChat,
  transcribeVoiceAudio,
} from './src/services/resourceChatService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Location Geocoding endpoint (Open-Meteo Geocoding API + OpenStreetMap Nominatim fallback)
  app.get('/api/geocode', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Location search query "q" must be at least 2 characters.' });
    }

    try {
      const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=5&language=en&format=json`;
      const omRes = await fetch(omUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5500),
      });

      if (omRes.ok) {
        const omJson = (await omRes.json()) as {
          results?: Array<{
            name?: string;
            admin1?: string;
            country?: string;
            latitude?: number;
            longitude?: number;
          }>;
        };
        if (Array.isArray(omJson.results) && omJson.results.length > 0) {
          const mapped = omJson.results
            .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
            .map((r) => ({
              latitude: r.latitude as number,
              longitude: r.longitude as number,
              label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
            }));
          if (mapped.length > 0) {
            return res.json({ results: mapped });
          }
        }
      }

      // Fallback to OpenStreetMap Nominatim
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=5`;
      const nomRes = await fetch(nomUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GlobalNaturalResourcesExplorer/1.0',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (nomRes.ok) {
        const nomJson = (await nomRes.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
        }>;
        const mapped = nomJson
          .map((item) => ({
            latitude: Number.parseFloat(item.lat || ''),
            longitude: Number.parseFloat(item.lon || ''),
            label: item.display_name || q,
          }))
          .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
        return res.json({ results: mapped });
      }

      res.json({ results: [] });
    } catch (error: unknown) {
      console.error('GET /api/geocode error:', error);
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Unable to look up geographic location.',
      });
    }
  });

  // Same-origin cached map tile proxy using free, unauthenticated basemap providers
  const tileCache = new Map<string, { body: Buffer; contentType: string; cachedAt: number }>();
  const TILE_PROVIDERS: Record<string, (z: number, x: number, y: number) => string[]> = {
    topo: (z, x, y) => [
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    ],
    osm: (z, x, y) => [
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
    ],
    light: (z, x, y) => [
      `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    ],
  };

  app.get('/api/tiles/:provider/:z/:x/:y.png', async (req, res) => {
    const provider = req.params.provider;
    const z = Number.parseInt(req.params.z, 10);
    const x = Number.parseInt(req.params.x, 10);
    const y = Number.parseInt(req.params.y, 10);

    const buildUrls = TILE_PROVIDERS[provider];
    if (
      !buildUrls ||
      !Number.isInteger(z) ||
      z < 0 ||
      z > 19 ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= 2 ** z ||
      y >= 2 ** z
    ) {
      return res.status(400).send('Invalid tile parameters');
    }

    const cacheKey = `${provider}/${z}/${x}/${y}`;
    const hit = tileCache.get(cacheKey);
    if (hit && Date.now() - hit.cachedAt < 24 * 60 * 60 * 1000) {
      res.setHeader('Content-Type', hit.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(hit.body);
    }

    const urls = buildUrls(z, x, y);
    for (const url of urls) {
      try {
        const upstream = await fetch(url, {
          headers: {
            'User-Agent': 'GlobalNaturalResourcesExplorer/1.0',
            Accept: 'image/png,image/jpeg,image/*,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(7000),
        });
        if (!upstream.ok) continue;
        const etag = upstream.headers.get('etag') || '';
        if (etag.includes('wm-')) continue;
        const arrBuf = await upstream.arrayBuffer();
        const body = Buffer.from(arrBuf);
        if (body.length < 200) continue;
        const contentType = upstream.headers.get('content-type') || 'image/png';

        if (tileCache.size >= 800) {
          const oldestKey = tileCache.keys().next().value;
          if (oldestKey) tileCache.delete(oldestKey);
        }
        tileCache.set(cacheKey, { body, contentType, cachedAt: Date.now() });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(body);
      } catch {
        // Try next mirror URL
      }
    }

    res.status(502).send('Upstream tile unavailable');
  });

  // List all resources (with occurrences) from Cloud SQL PostgreSQL
  app.get('/api/resources', async (req, res) => {
    try {
      await ensureCuratedSeeded();
      const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim() : '';

      const resourceRows = categoryFilter && categoryFilter !== 'All'
        ? await db.select().from(resources).where(eq(resources.category, categoryFilter))
        : await db.select().from(resources);

      const allOccurrences = await db.select().from(resourceOccurrences);
      const occByResource = new Map<number, typeof allOccurrences>();
      for (const occ of allOccurrences) {
        const list = occByResource.get(occ.resourceId) ?? [];
        list.push(occ);
        occByResource.set(occ.resourceId, list);
      }

      const payload = resourceRows.map((r) => ({
        ...r,
        occurrences: occByResource.get(r.id) ?? [],
      }));

      res.json({ resources: payload, total: payload.length });
    } catch (error: unknown) {
      console.error('GET /api/resources error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load resources from database.',
      });
    }
  });

  // Smart Live Search: Queries Cloud SQL AND live external scientific APIs simultaneously
  app.get('/api/resources/search', async (req, res) => {
    try {
      await ensureCuratedSeeded();
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const skipLive = req.query.live === '0';

      if (!q) {
        return res.status(400).json({ error: 'Search query parameter "q" is required.' });
      }

      const pattern = `%${q}%`;
      const slugGuess = toSlug(q);

      const dbMatches = await db
        .select()
        .from(resources)
        .where(
          or(
            eq(resources.slug, slugGuess),
            ilike(resources.name, pattern),
            ilike(resources.category, pattern),
            ilike(resources.subcategory, pattern),
            ilike(resources.chemicalFormula, pattern)
          )
        );

      const primaryMatch =
        dbMatches.find((m) => m.name.toLowerCase() === q.toLowerCase() || m.slug === slugGuess) ??
        dbMatches[0] ??
        null;

      if (skipLive) {
        const occurrences = primaryMatch
          ? await db
              .select()
              .from(resourceOccurrences)
              .where(eq(resourceOccurrences.resourceId, primaryMatch.id))
          : [];
        return res.json({
          query: q,
          resource: primaryMatch ? { ...primaryMatch, occurrences } : null,
          matches: dbMatches,
          liveEnrichment: null,
        });
      }

      // Execute live external API fetching (Wikipedia, Wikidata SPARQL, Macrostrat, PubChem, World Bank, GBIF)
      const liveEnrichment = await fetchLiveResourceData(
        primaryMatch?.name || q,
        primaryMatch?.category
      );

      let finalResource = primaryMatch;
      if (!finalResource) {
        const createdId = await upsertLiveDiscoveredResource(q, liveEnrichment);
        if (createdId) {
          const [created] = await db
            .select()
            .from(resources)
            .where(eq(resources.id, createdId));
          finalResource = created ?? null;
        }
      } else if (liveEnrichment.liveOccurrences.length > 0) {
        // Persist newly discovered live occurrences to Cloud SQL without duplicates
        await upsertLiveDiscoveredResource(finalResource.name, liveEnrichment, finalResource.id);
      }

      const occurrences = finalResource
        ? await db
            .select()
            .from(resourceOccurrences)
            .where(eq(resourceOccurrences.resourceId, finalResource.id))
        : [];

      // Merge any live occurrences not yet in DB for immediate map feedback
      const seen = new Set(occurrences.map((o) => `${o.latitude.toFixed(2)},${o.longitude.toFixed(2)}`));
      const combinedOccurrences = [
        ...occurrences,
        ...liveEnrichment.liveOccurrences
          .filter((lo) => !seen.has(`${lo.latitude.toFixed(2)},${lo.longitude.toFixed(2)}`))
          .map((lo, idx) => ({
            id: -(idx + 1),
            resourceId: finalResource?.id ?? 0,
            siteName: lo.siteName,
            country: lo.country,
            region: lo.region,
            latitude: lo.latitude,
            longitude: lo.longitude,
            verificationTier: lo.verificationTier,
            depositType: lo.depositType,
            sourceName: lo.sourceName,
            sourceUrl: lo.sourceUrl ?? null,
            observedYear: lo.observedYear ?? new Date().getFullYear(),
            createdAt: new Date(),
          })),
      ];

      res.json({
        query: q,
        resource: finalResource
          ? {
              ...finalResource,
              occurrences: combinedOccurrences,
            }
          : null,
        matches: dbMatches,
        liveEnrichment,
      });
    } catch (error: unknown) {
      console.error('GET /api/resources/search error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Online search failed.',
      });
    }
  });

  // Live Resource Image Gallery endpoint (Wikipedia + Wikimedia Commons)
  app.get('/api/resources/images', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const title = typeof req.query.title === 'string' ? req.query.title.trim() : undefined;
      if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required.' });
      }
      const result = await fetchResourceImageGallery(q, title);
      res.json({ query: q, images: result.images, telemetry: result.telemetry });
    } catch (error: unknown) {
      console.error('GET /api/resources/images error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch resource gallery images.',
      });
    }
  });

  // Live Resource Analytics (Real-Time Commodity Market Trend + Rolling 30-Day Open-Meteo Locality Series)
  app.get('/api/resources/analytics', async (req, res) => {
    try {
      const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
      const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
      const siteName = typeof req.query.siteName === 'string' ? req.query.siteName.trim() : '';
      const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';
      const lat = typeof req.query.lat === 'string' ? Number.parseFloat(req.query.lat) : NaN;
      const lon = typeof req.query.lon === 'string' ? Number.parseFloat(req.query.lon) : NaN;
      const forceRefresh = req.query.refresh === '1';

      if (!name) {
        return res.status(400).json({ error: 'Query parameter "name" is required.' });
      }

      const [market, climateSeries] = await Promise.all([
        getLiveResourceMarketBenchmark(name, category, forceRefresh),
        Number.isFinite(lat) && Number.isFinite(lon)
          ? getLiveLocalityDailySeries(
              lat,
              lon,
              siteName || `${name} Primary Locality`,
              country || 'Global',
              forceRefresh
            )
          : Promise.resolve(null),
      ]);

      res.json({
        market,
        climateSeries,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error('GET /api/resources/analytics error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch resource analytics.',
      });
    }
  });

  app.get('/api/analytics/market-overview', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1';
      const benchmarks = await getGlobalLiveCommodityBoard(forceRefresh);
      res.json({
        benchmarks,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error('GET /api/analytics/market-overview error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load commodity benchmarks.',
      });
    }
  });

  // Resource details by slug (with optional ?live=1 refresh)
  app.get('/api/resources/:slug', async (req, res) => {
    try {
      await ensureCuratedSeeded();
      const slug = req.params.slug.trim().toLowerCase();
      const [item] = await db.select().from(resources).where(eq(resources.slug, slug));

      if (!item) {
        return res.status(404).json({ error: `Resource "${slug}" not found.` });
      }

      let occurrences = await db
        .select()
        .from(resourceOccurrences)
        .where(eq(resourceOccurrences.resourceId, item.id));

      let liveEnrichment = null;
      if (req.query.live === '1') {
        liveEnrichment = await fetchLiveResourceData(item.name, item.category);
        if (liveEnrichment.liveOccurrences.length > 0) {
          await upsertLiveDiscoveredResource(item.name, liveEnrichment, item.id);
          occurrences = await db
            .select()
            .from(resourceOccurrences)
            .where(eq(resourceOccurrences.resourceId, item.id));
        }
      }

      res.json({
        resource: { ...item, occurrences },
        liveEnrichment,
      });
    } catch (error: unknown) {
      console.error('GET /api/resources/:slug error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load resource details.',
      });
    }
  });

  // AI Resource Image Scanner (Gemini Vision server-side)
  app.post('/api/scan', async (req, res) => {
    try {
      const { imageBase64, mimeType, fieldNotes } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        fieldNotes?: string;
      };

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: 'imageBase64 and mimeType are required.' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({
          error: `Unsupported image type "${mimeType}". Please upload JPEG, PNG, or WebP.`,
        });
      }

      const result = await analyzeSpecimenImage(imageBase64, mimeType, fieldNotes);

      // Optional persistence when user is authenticated with Firebase Auth
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded.uid) {
            await db.insert(scanHistory).values({
              userUid: decoded.uid,
              predictedName: result.predictedName,
              category: result.category,
              confidenceLabel: result.confidenceLevel,
              confidencePct: result.confidencePct,
              analysisJson: result as unknown as Record<string, unknown>,
            });
          }
        } catch (authErr) {
          console.warn('Scan completed without saving to user history:', authErr);
        }
      }

      res.json({ scan: result });
    } catch (error: unknown) {
      console.error('POST /api/scan error:', error);
      const statusCode = error instanceof GeminiScannerError ? error.statusCode : 500;
      res.status(statusCode).json({
        error:
          error instanceof Error
            ? error.message
            : 'AI specimen analysis failed. Please try another photograph.',
      });
    }
  });

  // Authenticated User Routes (Cloud SQL PostgreSQL + Firebase Auth)
  app.get('/api/user/saved', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const items = await db
        .select()
        .from(savedResources)
        .where(eq(savedResources.userUid, uid))
        .orderBy(desc(savedResources.createdAt));
      res.json({ saved: items });
    } catch (error: unknown) {
      console.error('GET /api/user/saved error:', error);
      res.status(500).json({ error: 'Failed to retrieve saved resources.' });
    }
  });

  app.post('/api/user/saved', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { resourceSlug, resourceName, category, notes } = req.body as {
        resourceSlug?: string;
        resourceName?: string;
        category?: string;
        notes?: string;
      };

      if (!resourceSlug || !resourceName || !category) {
        return res.status(400).json({ error: 'resourceSlug, resourceName, and category are required.' });
      }

      const existing = await db
        .select()
        .from(savedResources)
        .where(and(eq(savedResources.userUid, uid), eq(savedResources.resourceSlug, resourceSlug)));

      if (existing.length > 0) {
        return res.json({ saved: existing[0], alreadySaved: true });
      }

      const [inserted] = await db
        .insert(savedResources)
        .values({
          userUid: uid,
          resourceSlug,
          resourceName,
          category,
          notes: notes ?? null,
        })
        .returning();

      res.status(201).json({ saved: inserted });
    } catch (error: unknown) {
      console.error('POST /api/user/saved error:', error);
      res.status(500).json({ error: 'Failed to save resource bookmark.' });
    }
  });

  app.delete('/api/user/saved/:slug', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const slug = req.params.slug;
      await db
        .delete(savedResources)
        .where(and(eq(savedResources.userUid, uid), eq(savedResources.resourceSlug, slug)));
      res.json({ removed: true, slug });
    } catch (error: unknown) {
      console.error('DELETE /api/user/saved/:slug error:', error);
      res.status(500).json({ error: 'Failed to remove saved resource.' });
    }
  });

  app.get('/api/user/scans', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const scans = await db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.userUid, uid))
        .orderBy(desc(scanHistory.createdAt))
        .limit(20);
      res.json({ scans });
    } catch (error: unknown) {
      console.error('GET /api/user/scans error:', error);
      res.status(500).json({ error: 'Failed to load scan history.' });
    }
  });

  // Voice Transcription (Gemini 3.5 Transcribe server-side)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required.' });
      }
      const transcript = await transcribeVoiceAudio(audioBase64, mimeType || 'audio/webm');
      res.json({ transcript });
    } catch (error: unknown) {
      console.error('POST /api/transcribe error:', error);
      const statusCode = error instanceof ResourceAiError ? error.statusCode : 500;
      res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Voice transcription failed.',
      });
    }
  });

  // Multimodal Live Resource Chat (Live APIs + Google Search Grounding + Step-by-Step Guide)
  app.post('/api/resources/chat', async (req, res) => {
    try {
      await ensureCuratedSeeded();
      const {
        slug,
        resourceName,
        strictScope,
        message,
        userLocation,
        imageBase64,
        imageMimeType,
        videoBase64,
        videoMimeType,
        history,
      } = req.body as {
        slug?: string;
        resourceName?: string;
        strictScope?: boolean;
        message?: string;
        userLocation?: { latitude: number; longitude: number; label?: string } | null;
        imageBase64?: string;
        imageMimeType?: string;
        videoBase64?: string;
        videoMimeType?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      };

      const cleanMessage = (message || '').trim() ||
        (videoBase64
          ? 'Analyze this recorded video specimen/question and explain scientific data, mapping, uses, agriculture, research, and student guide step by step.'
          : imageBase64
          ? 'Analyze this uploaded specimen photo in context of this resource and explain everything step by step.'
          : 'Provide a complete scientific data, mapping, global data, uses, agricultural, research, and student guide.');

      const targetSlug = (slug || toSlug(resourceName || '')).trim().toLowerCase();
      let dbResource = targetSlug
        ? (await db.select().from(resources).where(eq(resources.slug, targetSlug)))[0]
        : undefined;

      if (!dbResource && resourceName) {
        const pattern = `%${resourceName.trim()}%`;
        dbResource = (
          await db.select().from(resources).where(ilike(resources.name, pattern)).limit(1)
        )[0];
      }

      const existingOccs = dbResource
        ? await db
            .select()
            .from(resourceOccurrences)
            .where(eq(resourceOccurrences.resourceId, dbResource.id))
        : [];

      const resourceContext = dbResource
        ? { ...dbResource, occurrences: existingOccs }
        : { name: resourceName || slug || 'Natural Resource', occurrences: [] };

      const isCategoryOrUniversalSlug =
        targetSlug === 'all-natural-resources' ||
        RESOURCE_CATEGORIES.some(
          (cat) =>
            cat.name.toLowerCase().replace(/\s+/g, '-') === targetSlug ||
            cat.name.toLowerCase() === targetSlug
        );
      const enforceStrictScope = strictScope === true || (!isCategoryOrUniversalSlug && Boolean(dbResource));

      const allCatalogNames = enforceStrictScope
        ? (await db.select({ name: resources.name }).from(resources)).map((r) => r.name)
        : [];

      const chatResult = await runLiveResourceChat({
        resource: resourceContext,
        userMessage: cleanMessage,
        strictScope: enforceStrictScope,
        knownResourceNames: allCatalogNames,
        userLocation: userLocation ?? null,
        imageBase64,
        imageMimeType,
        videoBase64,
        videoMimeType,
        history,
      });

      let updatedResource = null;
      if (dbResource) {
        const freshOccs = await db
          .select()
          .from(resourceOccurrences)
          .where(eq(resourceOccurrences.resourceId, dbResource.id));
        updatedResource = { ...dbResource, occurrences: freshOccs };
      }

      res.json({
        ...chatResult,
        updatedResource,
      });
    } catch (error: unknown) {
      console.error('POST /api/resources/chat error:', error);
      const statusCode = error instanceof ResourceAiError ? error.statusCode : 500;
      res.status(statusCode).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process resource chat query.',
      });
    }
  });

  // Open-Meteo ERA5 / IFS Rolling 30-Day Observation Grid & Locality Correlation
  app.get('/api/climate/grid', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1';
      const grid = await getGlobalClimateGrid(forceRefresh);
      res.json(grid);
    } catch (error: unknown) {
      console.error('GET /api/climate/grid error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch climate grid data.';
      const status = message.toLowerCase().includes('rate limit') ? 429 : 502;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/climate/localities', async (req, res) => {
    try {
      const { points, refresh } = req.body as {
        points?: Array<{ latitude: number; longitude: number }>;
        refresh?: boolean;
      };
      if (!Array.isArray(points) || points.length === 0) {
        return res.json({ points: [] });
      }
      const payload = await getClimateForPoints(points, Boolean(refresh));
      res.json({
        source: 'Open-Meteo ERA5 / IFS Reanalysis API',
        isLive: true,
        ...payload,
      });
    } catch (error: unknown) {
      console.error('POST /api/climate/localities error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch locality climate data.';
      const status = message.toLowerCase().includes('rate limit') ? 429 : 502;
      res.status(status).json({ error: message });
    }
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Global Natural Resources Explorer listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
