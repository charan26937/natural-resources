import { eq, ilike, or } from 'drizzle-orm';
import { CURATED_RESOURCES } from '../data/curatedResources.ts';
import { db } from './index.ts';
import { resourceOccurrences, resources } from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureCuratedSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  try {
    const existing = await db
      .select({
        id: resources.id,
        slug: resources.slug,
        dataOrigin: resources.dataOrigin,
        imageUrl: resources.imageUrl,
      })
      .from(resources);
    const existingBySlug = new Map(existing.map((r) => [r.slug, r]));

    const allExistingOccurrences = await db
      .select({
        resourceId: resourceOccurrences.resourceId,
        siteName: resourceOccurrences.siteName,
        latitude: resourceOccurrences.latitude,
        longitude: resourceOccurrences.longitude,
      })
      .from(resourceOccurrences);

    const occKeySetByResource = new Map<number, Set<string>>();
    for (const row of allExistingOccurrences) {
      const set = occKeySetByResource.get(row.resourceId) ?? new Set<string>();
      set.add(`${row.latitude.toFixed(3)},${row.longitude.toFixed(3)}`);
      set.add(row.siteName.toLowerCase());
      occKeySetByResource.set(row.resourceId, set);
    }

    for (const item of CURATED_RESOURCES) {
      const match = existingBySlug.get(item.slug);
      let resourceId = match?.id;

      if (!match) {
        const [inserted] = await db
          .insert(resources)
          .values({
            slug: item.slug,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            chemicalFormula: item.chemicalFormula,
            summary: item.summary,
            physicalProperties: item.physicalProperties,
            formationOrigin: item.formationOrigin,
            industrialApplications: item.industrialApplications,
            agriculturalApplications: item.agriculturalApplications,
            environmentalImportance: item.environmentalImportance,
            majorProducers: item.majorProducers,
            availabilityMetrics: item.availabilityMetrics,
            historicalPrices: item.historicalPrices,
            applicationBreakdown: item.applicationBreakdown,
            imageUrl: item.imageUrl,
            imageAttribution: item.imageAttribution,
            dataOrigin: item.dataOrigin,
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl,
            lastUpdated: item.lastUpdated,
          })
          .onConflictDoNothing({ target: resources.slug })
          .returning({ id: resources.id });

        resourceId = inserted?.id;
        if (!resourceId) {
          const [found] = await db
            .select({ id: resources.id })
            .from(resources)
            .where(eq(resources.slug, item.slug));
          resourceId = found?.id;
        }
      } else if (match.dataOrigin === 'curated_verified') {
        const currentSet = occKeySetByResource.get(match.id);
        const hasMissingOccurrence = item.occurrences.some(
          (occ) =>
            !currentSet?.has(`${occ.latitude.toFixed(3)},${occ.longitude.toFixed(3)}`) &&
            !currentSet?.has(occ.siteName.toLowerCase())
        );

        if (hasMissingOccurrence || match.imageUrl !== item.imageUrl) {
          await db
            .update(resources)
            .set({
              subcategory: item.subcategory,
              chemicalFormula: item.chemicalFormula,
              summary: item.summary,
              physicalProperties: item.physicalProperties,
              formationOrigin: item.formationOrigin,
              industrialApplications: item.industrialApplications,
              agriculturalApplications: item.agriculturalApplications,
              environmentalImportance: item.environmentalImportance,
              majorProducers: item.majorProducers,
              availabilityMetrics: item.availabilityMetrics,
              imageUrl: item.imageUrl,
              imageAttribution: item.imageAttribution,
              sourceName: item.sourceName,
            })
            .where(eq(resources.id, match.id));
        }
      }

      if (resourceId && item.occurrences.length > 0) {
        const currentSet = occKeySetByResource.get(resourceId) ?? new Set<string>();
        const toInsert = item.occurrences.filter(
          (occ) =>
            !currentSet.has(`${occ.latitude.toFixed(3)},${occ.longitude.toFixed(3)}`) &&
            !currentSet.has(occ.siteName.toLowerCase())
        );

        if (toInsert.length > 0) {
          await db.insert(resourceOccurrences).values(
            toInsert.map((occ) => ({
              resourceId: resourceId as number,
              siteName: occ.siteName,
              country: occ.country,
              region: occ.region,
              latitude: occ.latitude,
              longitude: occ.longitude,
              verificationTier: occ.verificationTier,
              depositType: occ.depositType,
              sourceName: occ.sourceName,
              sourceUrl: occ.sourceUrl ?? item.sourceUrl,
              observedYear: occ.observedYear ?? 2023,
            }))
          );
        }
      }
    }

    // Sanitize any previously persisted records so "Wikipedia" and "live" labels are not shown in UI
    const sanitizeDisplayText = (val: string | null | undefined, fallbackReplacement = 'Online Reference'): string => {
      if (!val) return '';
      return val
        .replace(/Wikimedia Commons via Wikipedia REST API/gi, 'Public Specimen Reference Archive')
        .replace(/Wikipedia GeoSearch/gi, 'Online Spatial Index')
        .replace(/Wikipedia GeoCoordinates/gi, 'Online Coordinate Registry')
        .replace(/Wikipedia Reference Extract/gi, 'Online Reference Registry')
        .replace(/Wikipedia Georeferenced Mine \/ Deposit/gi, 'Georeferenced Mine / Deposit')
        .replace(/Wikipedia Geological Reference Locality/gi, 'Geological Reference Locality')
        .replace(/Documented region in Wikipedia reference article/gi, 'Documented region in online reference archive')
        .replace(/\bWikipedia\b/gi, fallbackReplacement)
        .replace(/\bLive-Fetched Mineral Specimen\b/gi, 'Online-Fetched Mineral Specimen')
        .replace(/\bLive-retrieved scientific record\b/gi, 'Online-retrieved scientific record')
        .replace(/\bLive external API record\b/gi, 'External API record')
        .replace(/\bLive Online Scientific APIs\b/gi, 'Online Scientific APIs')
        .replace(/\bretrieved live from online registries\b/gi, 'retrieved from online registries')
        .replace(/\bvia live online scientific\b/gi, 'via online scientific')
        .replace(/\blive\b/gi, 'online');
    };

    const allResourcesForSanitization = await db
      .select({
        id: resources.id,
        subcategory: resources.subcategory,
        sourceName: resources.sourceName,
        imageAttribution: resources.imageAttribution,
        formationOrigin: resources.formationOrigin,
        summary: resources.summary,
        environmentalImportance: resources.environmentalImportance,
        availabilityMetrics: resources.availabilityMetrics,
      })
      .from(resources);

    for (const row of allResourcesForSanitization) {
      const hasDirtyAvail = Boolean(
        row.availabilityMetrics?.source && /(wikipedia|\blive\b)/i.test(row.availabilityMetrics.source)
      ) || Boolean(
        row.availabilityMetrics?.globalReservesText && /\blive\b/i.test(row.availabilityMetrics.globalReservesText)
      );
      const hasDirtyText =
        /(wikipedia|\blive\b)/i.test(row.sourceName || '') ||
        /(wikipedia|\blive\b)/i.test(row.imageAttribution || '') ||
        /(wikipedia|\blive\b)/i.test(row.formationOrigin || '') ||
        /(wikipedia|\blive\b)/i.test(row.summary || '') ||
        /\blive\b/i.test(row.subcategory || '') ||
        /\blive\b/i.test(row.environmentalImportance || '');

      if (!hasDirtyAvail && !hasDirtyText) continue;

      const updatedAvail =
        row.availabilityMetrics && hasDirtyAvail
          ? {
              ...row.availabilityMetrics,
              globalReservesText: sanitizeDisplayText(row.availabilityMetrics.globalReservesText),
              source: sanitizeDisplayText(row.availabilityMetrics.source, 'Online Scientific APIs'),
            }
          : row.availabilityMetrics;

      await db
        .update(resources)
        .set({
          subcategory: sanitizeDisplayText(row.subcategory),
          sourceName: sanitizeDisplayText(row.sourceName, 'Online Scientific Reference'),
          imageAttribution: sanitizeDisplayText(row.imageAttribution, 'Public Specimen Reference Archive'),
          formationOrigin: sanitizeDisplayText(row.formationOrigin, 'online scientific'),
          summary: sanitizeDisplayText(row.summary, 'online scientific reference'),
          environmentalImportance: sanitizeDisplayText(row.environmentalImportance),
          availabilityMetrics: updatedAvail,
        })
        .where(eq(resources.id, row.id));
    }

    const dirtyOccurrences = await db
      .select({
        id: resourceOccurrences.id,
        sourceName: resourceOccurrences.sourceName,
        region: resourceOccurrences.region,
        depositType: resourceOccurrences.depositType,
      })
      .from(resourceOccurrences)
      .where(
        or(
          ilike(resourceOccurrences.sourceName, '%wikipedia%'),
          ilike(resourceOccurrences.region, '%wikipedia%'),
          ilike(resourceOccurrences.depositType, '%wikipedia%')
        )
      );

    for (const occ of dirtyOccurrences) {
      await db
        .update(resourceOccurrences)
        .set({
          sourceName: sanitizeDisplayText(occ.sourceName, 'Online Coordinate Registry'),
          region: sanitizeDisplayText(occ.region, 'online reference'),
          depositType: sanitizeDisplayText(occ.depositType, 'online reference'),
        })
        .where(eq(resourceOccurrences.id, occ.id));
    }
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize resource catalog in Cloud SQL.', { cause: error });
  }
}
