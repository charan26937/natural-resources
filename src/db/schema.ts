import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  chemicalFormula: text('chemical_formula').notNull(),
  summary: text('summary').notNull(),
  physicalProperties: jsonb('physical_properties').$type<PhysicalPropertiesMap>().notNull(),
  formationOrigin: text('formation_origin').notNull(),
  industrialApplications: jsonb('industrial_applications').$type<string[]>().notNull(),
  agriculturalApplications: jsonb('agricultural_applications').$type<string[]>().notNull(),
  environmentalImportance: text('environmental_importance').notNull(),
  majorProducers: jsonb('major_producers').$type<ProducerMetric[]>().notNull(),
  availabilityMetrics: jsonb('availability_metrics').$type<AvailabilityMetric>().notNull(),
  historicalPrices: jsonb('historical_prices').$type<HistoricalPricePoint[]>().notNull(),
  applicationBreakdown: jsonb('application_breakdown').$type<ApplicationShare[]>().notNull(),
  imageUrl: text('image_url'),
  imageAttribution: text('image_attribution'),
  dataOrigin: text('data_origin').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  lastUpdated: text('last_updated').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const resourceOccurrences = pgTable('resource_occurrences', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id')
    .references(() => resources.id, { onDelete: 'cascade' })
    .notNull(),
  siteName: text('site_name').notNull(),
  country: text('country').notNull(),
  region: text('region').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  verificationTier: text('verification_tier').notNull(),
  depositType: text('deposit_type').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  observedYear: integer('observed_year'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedResources = pgTable('saved_resources', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  resourceSlug: text('resource_slug').notNull(),
  resourceName: text('resource_name').notNull(),
  category: text('category').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scanHistory = pgTable('scan_history', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  predictedName: text('predicted_name').notNull(),
  category: text('category').notNull(),
  confidenceLabel: text('confidence_label').notNull(),
  confidencePct: integer('confidence_pct').notNull(),
  analysisJson: jsonb('analysis_json').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const resourcesRelations = relations(resources, ({ many }) => ({
  occurrences: many(resourceOccurrences),
}));

export const resourceOccurrencesRelations = relations(resourceOccurrences, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceOccurrences.resourceId],
    references: [resources.id],
  }),
}));
