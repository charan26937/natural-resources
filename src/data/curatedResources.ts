import type {
  ApplicationShare,
  AvailabilityMetric,
  HistoricalPricePoint,
  PhysicalPropertiesMap,
  ProducerMetric,
} from '../db/schema.ts';

export interface CuratedOccurrenceInput {
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

export interface CuratedResourceInput {
  slug: string;
  name: string;
  category:
    | 'Rocks'
    | 'Minerals'
    | 'Metals'
    | 'Gemstones'
    | 'Chemical Elements & Compounds'
    | 'Soil'
    | 'Water Resources'
    | 'Energy Resources'
    | 'Forest Resources';
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
  imageUrl: string;
  imageAttribution: string;
  dataOrigin: 'curated_verified' | 'live_api_fetched';
  sourceName: string;
  sourceUrl: string;
  lastUpdated: string;
  occurrences: CuratedOccurrenceInput[];
}

export const RESOURCE_CATEGORIES = [
  {
    name: 'Rocks',
    subtitle: 'Igneous, metamorphic, and sedimentary lithologies',
    examples: ['Granite', 'Marble', 'Basalt', 'Limestone'],
    imageUrl: '/src/assets/images/category_rocks_petrology_1795022913942.jpg',
  },
  {
    name: 'Minerals',
    subtitle: 'Naturally occurring crystalline inorganic solids',
    examples: ['Quartz', 'Gypsum', 'Mica', 'Feldspar'],
    imageUrl: '/src/assets/images/category_minerals_crystals_1795022914352.jpg',
  },
  {
    name: 'Metals',
    subtitle: 'Native elements and primary metallic ore systems',
    examples: ['Gold', 'Silver', 'Iron', 'Copper', 'Platinum', 'Mercury'],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
  },
  {
    name: 'Gemstones',
    subtitle: 'Rare high-value mineral crystals and allotropes',
    examples: ['Diamond', 'Ruby', 'Emerald', 'Sapphire'],
    imageUrl: '/src/assets/images/category_gemstones_specimens_1795022915103.jpg',
  },
  {
    name: 'Chemical Elements & Compounds',
    subtitle: 'Fundamental atmospheric, crustal, and molecular species',
    examples: ['Hydrogen', 'Oxygen', 'Carbon', 'Carbon Dioxide'],
    imageUrl: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
  },
  {
    name: 'Soil',
    subtitle: 'Pedogenic horizons supporting terrestrial biomes and crops',
    examples: ['Red Soil', 'Black Soil', 'Alluvial Soil', 'Laterite Soil'],
    imageUrl: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
  },
  {
    name: 'Water Resources',
    subtitle: 'Continental surface basins and subterranean aquifers',
    examples: ['Rivers', 'Lakes', 'Groundwater'],
    imageUrl: '/src/assets/images/category_water_resources_1795022583595.jpg',
  },
  {
    name: 'Energy Resources',
    subtitle: 'Sedimentary hydrocarbons and carbon fuel reserves',
    examples: ['Coal', 'Petroleum', 'Natural Gas'],
    imageUrl: '/src/assets/images/category_energy_resources_1795022584749.jpg',
  },
  {
    name: 'Forest Resources',
    subtitle: 'Renewable lignocellulosic, bamboo, and botanical stocks',
    examples: ['Timber', 'Bamboo', 'Medicinal Plants'],
    imageUrl: '/src/assets/images/category_forest_resources_1795022583901.jpg',
  },
] as const;

export const CURATED_RESOURCES: CuratedResourceInput[] = [
  // ================= ROCKS =================
  {
    slug: 'granite',
    name: 'Granite',
    category: 'Rocks',
    subcategory: 'Felsic Intrusive Igneous Rock',
    chemicalFormula: 'SiO₂ (70–77%) + Al₂O₃ + K₂O + Na₂O',
    summary:
      'Coarse-grained phaneritic intrusive igneous rock composed predominantly of quartz, alkali feldspar, and plagioclase feldspar, forming major continental cratons and batholiths.',
    physicalProperties: {
      hardness: '6.0–7.0 Mohs',
      density: '2.65–2.75 g/cm³',
      color: 'Pink, white, grey, or speckled',
      texture: 'Phaneritic (coarse-grained)',
      meltingPoint: '1,215–1,260 °C (dry)',
      cleavage: 'None (rock aggregate)',
    },
    formationOrigin:
      'Slow crystallization of silica-rich magma deep within continental crust (plutons and batholiths) during orogenic subduction and continental collision events.',
    industrialApplications: [
      'Dimension stone for architectural facades, monuments, and precision optical metrology tables',
      'Crushed aggregate for railway ballast, highway sub-bases, and structural concrete',
      'Acid-resistant industrial flooring and laboratory benchtops',
    ],
    agriculturalApplications: [
      'Finely ground granite quarry dust used as a slow-release potassium and trace-mineral soil remineralizer',
    ],
    environmentalImportance:
      'Forms resilient continental bedrock resistant to chemical weathering; granite terrains regulate watershed pH (often mildly acidic) and host critical groundwater fracture networks.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 34, unit: '% global dimension stone', year: 2023, status: 'estimated', source: 'USGS Dimension Stone / Stone Update' },
      { country: 'India', iso3: 'IND', sharePct: 21, unit: '% global dimension stone', year: 2023, status: 'reported', source: 'Indian Bureau of Mines' },
      { country: 'Brazil', iso3: 'BRA', sharePct: 12, unit: '% global dimension stone', year: 2023, status: 'reported', source: 'ANM Brazil' },
      { country: 'Italy', iso3: 'ITA', sharePct: 6, unit: '% global dimension stone', year: 2023, status: 'reported', source: 'USGS' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Abundant throughout continental shields (>40% upper continental crust volume)',
      renewability: 'Non-renewable (geological timescale >10⁶ years)',
      scarcityIndex: 8,
      reserveLifeYears: null,
      source: 'USGS Mineral Commodity Summaries',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Crushed Aggregate & Civil Infrastructure', sharePct: 62, source: 'USGS Crushed Stone' },
      { sector: 'Architectural Dimension Stone', sharePct: 28, source: 'USGS Dimension Stone' },
      { sector: 'Monuments & Precision Surfaces', sharePct: 10, source: 'Industry Reference' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Bianco_Sardo_Granit_mit_polierter_Oberfl%C3%A4che.jpg/960px-Bianco_Sardo_Granit_mit_polierter_Oberfl%C3%A4che.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Granite Petrology Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & Mindat Geological Reference',
    sourceUrl: 'https://www.usgs.gov/centers/national-minerals-information-center/dimension-stone-statistics-and-information',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Barre Granite Quarries, Vermont', country: 'United States', region: 'North America', latitude: 44.1489, longitude: -72.4787, verificationTier: 'verified_deposit', depositType: 'Devonian Pluton Batholith', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Ongole-Chimakurthy Granite Belt', country: 'India', region: 'South Asia', latitude: 15.5818, longitude: 79.8655, verificationTier: 'verified_deposit', depositType: 'Precambrian Batholith', sourceName: 'Indian Bureau of Mines', observedYear: 2023 },
      { siteName: 'Espírito Santo Dimension Stone Belt', country: 'Brazil', region: 'South America', latitude: -20.8489, longitude: -41.1128, verificationTier: 'reported_occurrence', depositType: 'Neoproterozoic Granitoid', sourceName: 'ANM Brazil', observedYear: 2023 },
      { siteName: 'Aberdeen Rubislaw Pluton', country: 'United Kingdom', region: 'Europe', latitude: 57.1456, longitude: -2.1483, verificationTier: 'verified_deposit', depositType: 'Caledonian Granite Intrusion', sourceName: 'BGS GeoIndex', observedYear: 2022 },
    ],
  },
  {
    slug: 'marble',
    name: 'Marble',
    category: 'Rocks',
    subcategory: 'Non-Foliated Metamorphic Rock',
    chemicalFormula: 'CaCO₃ (recrystallized calcite / dolomite)',
    summary:
      'Metamorphic carbonate rock formed by thermal and pressure recrystallization of limestone or dolostone, characterized by interlocking calcite crystals and low porosity.',
    physicalProperties: {
      hardness: '3.0–4.0 Mohs',
      density: '2.68–2.73 g/cm³',
      color: 'White, cream, grey, green, veined',
      texture: 'Granoblastic interlocking crystalline',
      luster: 'Vitreous to pearly on cleavage faces',
    },
    formationOrigin:
      'Regional or contact metamorphism of sedimentary limestone protoliths under elevated temperature and lithostatic pressure near igneous intrusions or mountain belts.',
    industrialApplications: [
      'Sculptural and architectural dimension stone',
      'Ultra-fine ground calcium carbonate (GCC) filler in paper, plastics, and coatings',
      'Flue-gas desulfurization and acid neutralization in chemical plants',
    ],
    agriculturalApplications: [
      'Pulverized agricultural lime (aglime) to raise soil pH and supply calcium/magnesium',
    ],
    environmentalImportance:
      'Carbonate bedrock buffers acid rain and creates karst aquifers, though marble monuments remain sensitive to atmospheric SO₂/acid dissolution.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 30, unit: '% global marble output', year: 2023, status: 'estimated', source: 'USGS Dimension Stone' },
      { country: 'Italy', iso3: 'ITA', sharePct: 16, unit: '% global marble output', year: 2023, status: 'reported', source: 'USGS / Carrara Chamber' },
      { country: 'Turkey', iso3: 'TUR', sharePct: 15, unit: '% global marble output', year: 2023, status: 'reported', source: 'MTA Turkey' },
      { country: 'India', iso3: 'IND', sharePct: 12, unit: '% global marble output', year: 2023, status: 'reported', source: 'IBM India' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Widespread along orogenic carbonate belts across Mediterranean, Himalayas, and Appalachians',
      renewability: 'Non-renewable',
      scarcityIndex: 14,
      reserveLifeYears: null,
      source: 'USGS Dimension Stone Review',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Architectural Cladding & Flooring', sharePct: 54, source: 'Global Stone Report' },
      { sector: 'Ground Calcium Carbonate Fillers', sharePct: 31, source: 'USGS Industrial Minerals' },
      { sector: 'Sculpture & Agricultural Lime', sharePct: 15, source: 'Industry Reference' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Marmo_z17.JPG/960px-Marmo_z17.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Metamorphic Marble Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & BGS Lithology Database',
    sourceUrl: 'https://www.usgs.gov/centers/national-minerals-information-center',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Carrara Apuan Alps Quarries', country: 'Italy', region: 'Europe', latitude: 44.0853, longitude: 10.1045, verificationTier: 'verified_deposit', depositType: 'Jurassic Metamorphic Carbonate', sourceName: 'ISPRA Italy', observedYear: 2023 },
      { siteName: 'Makrana Marble Belt, Rajasthan', country: 'India', region: 'South Asia', latitude: 27.0411, longitude: 74.7186, verificationTier: 'verified_deposit', depositType: 'Proterozoic Delhi Supergroup', sourceName: 'Geological Survey of India', observedYear: 2023 },
      { siteName: 'Marmara Island Quarries', country: 'Turkey', region: 'West Asia', latitude: 40.6208, longitude: 27.6144, verificationTier: 'verified_deposit', depositType: 'Metamorphic Marble Massif', sourceName: 'MTA Turkey', observedYear: 2023 },
      { siteName: 'Yule Marble Quarry, Colorado', country: 'United States', region: 'North America', latitude: 39.0486, longitude: -107.1753, verificationTier: 'verified_deposit', depositType: 'Contact Metamorphosed Mississippian Limestone', sourceName: 'USGS MRDS', observedYear: 2022 },
    ],
  },
  {
    slug: 'basalt',
    name: 'Basalt',
    category: 'Rocks',
    subcategory: 'Mafic Extrusive Igneous Rock',
    chemicalFormula: 'SiO₂ (45–52%) + FeO + MgO + CaO',
    summary:
      'Fine-grained dark aphanitic volcanic rock formed from rapid cooling of low-viscosity mafic lava rich in magnesium and iron silicates (plagioclase, pyroxene, olivine).',
    physicalProperties: {
      hardness: '5.5–6.5 Mohs',
      density: '2.85–3.05 g/cm³',
      color: 'Dark grey to charcoal black',
      texture: 'Aphanitic to vesicular',
      meltingPoint: '1,100–1,250 °C',
    },
    formationOrigin:
      'Eruption of mantle-derived mafic magmas at mid-ocean ridges, continental flood basalt provinces, and shield volcanoes.',
    industrialApplications: [
      'Continuous basalt fiber (CBF) reinforcement composites and thermal insulation rockwool',
      'High-strength skid-resistant highway aggregate and railway ballast',
      'In-situ carbon dioxide mineral carbonation reservoirs (CarbFix sequestration)',
    ],
    agriculturalApplications: [
      'Crushed basalt rock dust used in enhanced rock weathering (ERW) for CO₂ drawdown and trace nutrient release',
    ],
    environmentalImportance:
      'Makes up >90% of oceanic crust; reactive Ca/Mg silicates in basalt naturally sequester atmospheric CO₂ via carbonate mineralization.',
    majorProducers: [
      { country: 'United States', iso3: 'USA', sharePct: 18, unit: '% global crushed traprock', year: 2023, status: 'reported', source: 'USGS Crushed Stone' },
      { country: 'India', iso3: 'IND', sharePct: 17, unit: '% global Deccan trap aggregate', year: 2023, status: 'estimated', source: 'IBM India' },
      { country: 'China', iso3: 'CHN', sharePct: 24, unit: '% global basalt fiber & aggregate', year: 2023, status: 'estimated', source: 'USGS' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Most abundant volcanic rock on Earth (oceanic crust + flood basalt provinces)',
      renewability: 'Non-renewable (continuously generated at mid-ocean ridges)',
      scarcityIndex: 4,
      reserveLifeYears: null,
      source: 'USGS & Smithsonian Global Volcanism Program',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'High-Load Road & Rail Aggregate', sharePct: 71, source: 'USGS Crushed Stone' },
      { sector: 'Mineral Wool & Basalt Fiber', sharePct: 21, source: 'Industry Reference' },
      { sector: 'CO₂ Mineralization & Soil ERW', sharePct: 8, source: 'Scientific Literature' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Basalt_12_%2848674276333%29.jpg/960px-Basalt_12_%2848674276333%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Volcanic Basalt Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & Global Volcanism Program',
    sourceUrl: 'https://volcano.si.edu/',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Deccan Traps Flood Basalt Province', country: 'India', region: 'South Asia', latitude: 19.8762, longitude: 75.3433, verificationTier: 'verified_deposit', depositType: 'Cretaceous Flood Basalt', sourceName: 'GSI India', observedYear: 2023 },
      { siteName: 'Columbia River Basalt Group', country: 'United States', region: 'North America', latitude: 46.2396, longitude: -119.1006, verificationTier: 'verified_deposit', depositType: 'Miocene Flood Basalt', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Hellisheiði CarbFix Basalt Formation', country: 'Iceland', region: 'Europe', latitude: 64.0375, longitude: -21.4008, verificationTier: 'verified_deposit', depositType: 'Holocene Olivine Basalt', sourceName: 'Iceland GeoSurvey', observedYear: 2024 },
      { siteName: 'Giant’s Causeway Columnar Basalt', country: 'United Kingdom', region: 'Europe', latitude: 55.2408, longitude: -6.5116, verificationTier: 'verified_deposit', depositType: 'Paleogene Columnar Basalt', sourceName: 'BGS', observedYear: 2022 },
    ],
  },
  {
    slug: 'limestone',
    name: 'Limestone',
    category: 'Rocks',
    subcategory: 'Biochemical / Chemical Sedimentary Rock',
    chemicalFormula: 'CaCO₃ (calcite & aragonite)',
    summary:
      'Sedimentary rock composed primarily of skeletal fragments of marine organisms (corals, foraminifera, mollusks) and precipitated calcium carbonate.',
    physicalProperties: {
      hardness: '3.0 Mohs',
      density: '2.50–2.70 g/cm³',
      color: 'Buff, off-white, grey, tan',
      texture: 'Clastic, fossiliferous, or micritic',
    },
    formationOrigin:
      'Accumulation of biogenic marine carbonate shells and direct chemical precipitation in warm, shallow tropical epeiric seas and carbonate platforms.',
    industrialApplications: [
      'Primary feedstock for Portland cement clinker production',
      'Fluxing agent in blast-furnace iron and steel smelting',
      'Flue-gas desulfurization scrubbing and glass manufacturing',
    ],
    agriculturalApplications: [
      'Direct soil liming agent to neutralize acidic soils and improve fertilizer availability',
      'Calcium supplement in livestock and poultry feed',
    ],
    environmentalImportance:
      'Earth’s largest long-term geological carbon sink, storing millions of gigatons of carbon in sedimentary strata while hosting major karst freshwater aquifers.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 48, unit: '% global cement-grade limestone', year: 2023, status: 'estimated', source: 'USGS Cement / Crushed Stone' },
      { country: 'India', iso3: 'IND', sharePct: 10, unit: '% global limestone output', year: 2023, status: 'reported', source: 'IBM India' },
      { country: 'United States', iso3: 'USA', sharePct: 8, unit: '% global limestone output', year: 2023, status: 'reported', source: 'USGS' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Extremely abundant across continental sedimentary basins (~10% of sedimentary rock volume)',
      renewability: 'Non-renewable',
      scarcityIndex: 6,
      reserveLifeYears: null,
      source: 'USGS Mineral Commodity Summaries',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Cement & Quicklime Production', sharePct: 58, source: 'USGS' },
      { sector: 'Construction Aggregate', sharePct: 27, source: 'USGS' },
      { sector: 'Steel Flux & Agriculture', sharePct: 15, source: 'USGS' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/ElTorcal0408.jpg/960px-ElTorcal0408.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Karst Limestone Formation',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & Macrostrat Carbonate Database',
    sourceUrl: 'https://macrostrat.org/',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Indiana Bedford Oolitic Limestone Belt', country: 'United States', region: 'North America', latitude: 38.8612, longitude: -86.4872, verificationTier: 'verified_deposit', depositType: 'Mississippian Oolitic Limestone', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Solnhofen Plattenkalk Basin', country: 'Germany', region: 'Europe', latitude: 48.8936, longitude: 10.9922, verificationTier: 'verified_deposit', depositType: 'Upper Jurassic Lithographic Limestone', sourceName: 'BGR Germany', observedYear: 2022 },
      { siteName: 'Cuddapah Carbonate Basin', country: 'India', region: 'South Asia', latitude: 14.4673, longitude: 78.8242, verificationTier: 'verified_deposit', depositType: 'Proterozoic Sedimentary Basin', sourceName: 'IBM India', observedYear: 2023 },
      { siteName: 'White Cliffs Chalk Formations, Dover', country: 'United Kingdom', region: 'Europe', latitude: 51.1364, longitude: 1.3635, verificationTier: 'verified_deposit', depositType: 'Late Cretaceous Coccolith Chalk', sourceName: 'BGS', observedYear: 2023 },
    ],
  },

  // ================= MINERALS =================
  {
    slug: 'quartz',
    name: 'Quartz',
    category: 'Minerals',
    subcategory: 'Tectosilicate Mineral',
    chemicalFormula: 'SiO₂',
    summary:
      'Second most abundant mineral in Earth’s continental crust, consisting of a continuous framework of SiO₄ silicon–oxygen tetrahedra with piezoelectric and high thermal stability properties.',
    physicalProperties: {
      hardness: '7.0 Mohs',
      density: '2.65 g/cm³',
      color: 'Colorless, white, smoky, rose, amethyst',
      crystalSystem: 'Trigonal (hexagonal scalenohedral)',
      luster: 'Vitreous',
      cleavage: 'Indiscernible; conchoidal fracture',
      meltingPoint: '1,713 °C (β-cristobalite)',
    },
    formationOrigin:
      'Crystallizes from cooling felsic magmas, hydrothermal veins, pegmatites, and diagenetic silica cementation in sedimentary sandstones.',
    industrialApplications: [
      'Ultra-high-purity quartz (HPQ) crucibles for monocrystalline silicon wafers and solar photovoltaics',
      'Piezoelectric quartz crystal oscillators for precision clocks, radios, and telecommunications',
      'Flat glass, fiber optics, foundry sand, and engineered stone surfaces',
    ],
    agriculturalApplications: [
      'Sandy quartz-rich soil fractions regulate drainage and root aeration',
    ],
    environmentalImportance:
      'Chemically inert bedrock constituent; high-purity quartz underpins global solar photovoltaic and semiconductor decarbonization supply chains.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 110000, unit: 'metric tons (industrial silica/quartz)', year: 2023, status: 'estimated', source: 'USGS Industrial Sand & Gravel' },
      { country: 'United States', iso3: 'USA', annualOutput: 85000, unit: 'metric tons (industrial silica)', year: 2023, status: 'reported', source: 'USGS' },
      { country: 'Brazil', iso3: 'BRA', annualOutput: 25000, unit: 'metric tons (crystal & silica)', year: 2023, status: 'reported', source: 'ANM Brazil' },
      { country: 'Norway', iso3: 'NOR', annualOutput: 1800, unit: 'metric tons (high-purity quartz)', year: 2023, status: 'reported', source: 'NGU Norway' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Silica sand abundant globally; ultra-high-purity quartz (HPQ <20 ppm impurities) concentrated in Spruce Pine & Brazil',
      renewability: 'Non-renewable',
      scarcityIndex: 18,
      reserveLifeYears: null,
      source: 'USGS & NGU',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Glass & Optical Fibers', sharePct: 44, source: 'USGS Silica Report' },
      { sector: 'Semiconductor & Solar Silicon Feedstock', sharePct: 26, source: 'USGS / IEA' },
      { sector: 'Foundry, Frac Sand & Ceramics', sharePct: 30, source: 'USGS' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Quartz_Br%C3%A9sil.jpg/960px-Quartz_Br%C3%A9sil.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Quartz Crystal Cluster',
    dataOrigin: 'curated_verified',
    sourceName: 'Mindat / IMA & USGS',
    sourceUrl: 'https://www.mindat.org/min-3337.html',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Spruce Pine High-Purity Quartz District, NC', country: 'United States', region: 'North America', latitude: 35.9154, longitude: -82.0646, verificationTier: 'verified_deposit', depositType: 'Alaskite Pegmatite HPQ', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Diamantina Quartz Crystal Veins, Minas Gerais', country: 'Brazil', region: 'South America', latitude: -18.2414, longitude: -43.6003, verificationTier: 'verified_deposit', depositType: 'Hydrothermal Quartz Veins', sourceName: 'Mindat', observedYear: 2023 },
      { siteName: 'Hot Springs Ouachita Quartz Belt, Arkansas', country: 'United States', region: 'North America', latitude: 34.5037, longitude: -93.0552, verificationTier: 'verified_deposit', depositType: 'Hydrothermal Vein Swarm', sourceName: 'USGS', observedYear: 2022 },
      { siteName: 'Drag High-Purity Quartz Deposit', country: 'Norway', region: 'Europe', latitude: 68.0445, longitude: 16.0772, verificationTier: 'verified_deposit', depositType: 'Granitic Pegmatite', sourceName: 'NGU', observedYear: 2023 },
    ],
  },
  {
    slug: 'gypsum',
    name: 'Gypsum',
    category: 'Minerals',
    subcategory: 'Hydrous Sulfate Evaporite Mineral',
    chemicalFormula: 'CaSO₄·2H₂O',
    summary:
      'Soft evaporite sulfate mineral composed of calcium sulfate dihydrate, widely precipitated from evaporating saline basins and used as a primary construction plaster and soil amendment.',
    physicalProperties: {
      hardness: '2.0 Mohs (reference standard)',
      density: '2.31–2.33 g/cm³',
      color: 'Colorless, white, grey, amber (selenite)',
      crystalSystem: 'Monoclinic',
      luster: 'Vitreous to pearly or silky',
      cleavage: 'Perfect on {010}',
    },
    formationOrigin:
      'Evaporation of marine lagoons and hypersaline lakes, or hydration of subsurface anhydrite beds and oxidation of sulfide ores.',
    industrialApplications: [
      'Calcined plaster of Paris and prefabricated drywall / gypsum board',
      'Set-retarding additive (3–5%) in Portland cement manufacture',
      'Medical orthopedic casts and precision ceramic molds',
    ],
    agriculturalApplications: [
      'Calcium and sulfur fertilizer that flocculates sodic clay soils without altering pH',
    ],
    environmentalImportance:
      'Reclaims saline-sodic agricultural soils by displacing excess sodium ions and reduces phosphorus runoff from farmland.',
    majorProducers: [
      { country: 'United States', iso3: 'USA', annualOutput: 21000, unit: 'thousand metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Iran', iso3: 'IRN', annualOutput: 16000, unit: 'thousand metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 14000, unit: 'thousand metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Spain', iso3: 'ESP', annualOutput: 11000, unit: 'thousand metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Large global evaporite reserves (~150 million t/yr global mined output)',
      renewability: 'Non-renewable (also recovered via FGD synthetic gypsum)',
      scarcityIndex: 12,
      reserveLifeYears: null,
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 9.0, unit: 'USD / metric ton (crude USGS)', source: 'USGS MCS', status: 'verified' },
      { year: 2020, price: 9.2, unit: 'USD / metric ton (crude USGS)', source: 'USGS MCS', status: 'verified' },
      { year: 2021, price: 9.8, unit: 'USD / metric ton (crude USGS)', source: 'USGS MCS', status: 'verified' },
      { year: 2022, price: 11.5, unit: 'USD / metric ton (crude USGS)', source: 'USGS MCS', status: 'verified' },
      { year: 2023, price: 13.0, unit: 'USD / metric ton (crude USGS)', source: 'USGS MCS', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Wallboard & Plaster Products', sharePct: 68, source: 'USGS' },
      { sector: 'Cement Set Retarder', sharePct: 21, source: 'USGS' },
      { sector: 'Agricultural Soil Amendment', sharePct: 11, source: 'USGS' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Gypse_Caresse.jpg/960px-Gypse_Caresse.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Gypsum Mineral Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS Mineral Commodity Summaries 2024',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-gypsum.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Naica Selenite Cave System, Chihuahua', country: 'Mexico', region: 'North America', latitude: 27.8508, longitude: -105.4961, verificationTier: 'verified_deposit', depositType: 'Hydrothermal Selenite Cavern', sourceName: 'Mindat', observedYear: 2023 },
      { siteName: 'White Sands Gypsum Dunefield, NM', country: 'United States', region: 'North America', latitude: 32.7872, longitude: -106.3257, verificationTier: 'verified_deposit', depositType: 'Playa Evaporite Dune Basin', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Sorbas Evaporite Gypsum Karst, Almería', country: 'Spain', region: 'Europe', latitude: 37.0972, longitude: -2.1211, verificationTier: 'verified_deposit', depositType: 'Messinian Marine Evaporite', sourceName: 'IGME Spain', observedYear: 2023 },
    ],
  },
  {
    slug: 'mica',
    name: 'Mica',
    category: 'Minerals',
    subcategory: 'Phyllosilicate Sheet Mineral Group',
    chemicalFormula: 'KAl₂(AlSi₃O₁₀)(OH)₂ (Muscovite)',
    summary:
      'Group of sheet silicate minerals (muscovite, biotite, phlogopite) exhibiting near-perfect basal cleavage into flexible, electrically insulating transparent lamellae.',
    physicalProperties: {
      hardness: '2.0–3.0 Mohs',
      density: '2.77–2.88 g/cm³',
      color: 'Silvery white, pale brown, dark black (biotite)',
      crystalSystem: 'Monoclinic',
      luster: 'Pearly to vitreous',
      cleavage: 'Eminent basal {001}',
    },
    formationOrigin:
      'Crystallizes in granitic pegmatites, pelitic schists, and gneiss during regional metamorphism and late-stage hydrothermal differentiation.',
    industrialApplications: [
      'High-voltage dielectric insulators and thermal barriers in electronics and EV batteries',
      'Pearlescent mineral pigments in automotive coatings and cosmetics',
      'Joint compound filler and drilling mud additive',
    ],
    agriculturalApplications: [
      'Weathering of biotite and muscovite supplies natural potassium (K⁺) to developing soils',
    ],
    environmentalImportance:
      'Key potassium-bearing mineral in continental soil ecosystems; responsible artisanal sourcing prevents ecological degradation in pegmatite belts.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 100000, unit: 'metric tons (scrap & flake)', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Finland', iso3: 'FIN', annualOutput: 65000, unit: 'metric tons (flake)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'United States', iso3: 'USA', annualOutput: 36000, unit: 'metric tons (scrap & flake)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Madagascar', iso3: 'MDG', annualOutput: 28000, unit: 'metric tons (sheet & phlogopite)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Very large global flake mica resources; high-grade sheet mica reserves more localized',
      renewability: 'Non-renewable',
      scarcityIndex: 22,
      reserveLifeYears: null,
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Paints, Coatings & Plastics', sharePct: 45, source: 'USGS' },
      { sector: 'Joint Compounds & Construction', sharePct: 33, source: 'USGS' },
      { sector: 'Electrical & EV Thermal Insulation', sharePct: 22, source: 'USGS' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Mica_%286911818878%29.jpg/960px-Mica_%286911818878%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Muscovite Mica Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS Mineral Commodity Summaries 2024',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-mica.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Koderma-Giridih Mica Pegmatite Belt, Jharkhand', country: 'India', region: 'South Asia', latitude: 24.4676, longitude: 85.5936, verificationTier: 'verified_deposit', depositType: 'Precambrian Muscovite Pegmatite', sourceName: 'IBM India', observedYear: 2023 },
      { siteName: 'Siilinjärvi Phlogopite Carbonatite Complex', country: 'Finland', region: 'Europe', latitude: 63.1333, longitude: 27.7167, verificationTier: 'verified_deposit', depositType: 'Archean Carbonatite', sourceName: 'GTK Finland', observedYear: 2023 },
      { siteName: 'Benato-Ampandrandava Phlogopite Belt', country: 'Madagascar', region: 'Africa', latitude: -24.1667, longitude: 45.6167, verificationTier: 'reported_occurrence', depositType: 'Metamorphic Pyroxenite', sourceName: 'USGS', observedYear: 2023 },
    ],
  },
  {
    slug: 'feldspar',
    name: 'Feldspar',
    category: 'Minerals',
    subcategory: 'Aluminosilicate Tectosilicate Group',
    chemicalFormula: 'KAlSi₃O₈ – NaAlSi₃O₈ – CaAl₂Si₂O₈',
    summary:
      'Most abundant mineral group in Earth’s crust (~51–60% by volume), comprising potassium, sodium, and calcium aluminosilicates fundamental to igneous rocks, glassmaking, and ceramics.',
    physicalProperties: {
      hardness: '6.0–6.5 Mohs (orthoclase = 6)',
      density: '2.55–2.76 g/cm³',
      color: 'White, pink, salmon, cream, iridescent blue (labradorite)',
      crystalSystem: 'Monoclinic / Triclinic',
      luster: 'Vitreous to pearly on cleavage',
      cleavage: 'Two directions intersecting at ~90°',
    },
    formationOrigin:
      'Primary crystallization in intrusive and extrusive igneous rocks, pegmatites, and regional metamorphic gneisses.',
    industrialApplications: [
      'Alumina and alkali flux in container glass and flat glass production',
      'Vitrifying flux in porcelain tiles, sanitaryware, and electrical ceramics',
      'Functional mineral filler in paints, rubber, and polymer composites',
    ],
    agriculturalApplications: [
      'Hydrolysis of potassium feldspar forms clay minerals and releases plant-available K⁺ over geological cycles',
    ],
    environmentalImportance:
      'Chemical weathering of plagioclase feldspar consumes atmospheric CO₂ via the Urey silicate–carbonate reaction, stabilizing planetary climate over millions of years.',
    majorProducers: [
      { country: 'Turkey', iso3: 'TUR', annualOutput: 12000, unit: 'thousand metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'India', iso3: 'IND', annualOutput: 5400, unit: 'thousand metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 2500, unit: 'thousand metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Italy', iso3: 'ITA', annualOutput: 2200, unit: 'thousand metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Virtually inexhaustible crustal reserves (>50% of continental crust)',
      renewability: 'Non-renewable',
      scarcityIndex: 7,
      reserveLifeYears: null,
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Glass Manufacturing (Alkali Flux)', sharePct: 60, source: 'USGS' },
      { sector: 'Ceramics & Porcelain Tiles', sharePct: 32, source: 'USGS' },
      { sector: 'Fillers & Mild Abrasives', sharePct: 8, source: 'USGS' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Feldspar_diversity.png/960px-Feldspar_diversity.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Feldspar Mineral Specimens',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS Mineral Commodity Summaries 2024',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-feldspar.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Menderes Massif Albite Deposits, Aydın', country: 'Turkey', region: 'West Asia', latitude: 37.6534, longitude: 27.8542, verificationTier: 'verified_deposit', depositType: 'Metamorphic Albite Vein', sourceName: 'MTA Turkey', observedYear: 2023 },
      { siteName: 'Nain Anorthosite Labradorite Complex', country: 'Canada', region: 'North America', latitude: 56.5422, longitude: -61.6931, verificationTier: 'verified_deposit', depositType: 'Proterozoic Anorthosite', sourceName: 'NRCan', observedYear: 2022 },
      { siteName: 'Beawar Pegmatite Belt, Rajasthan', country: 'India', region: 'South Asia', latitude: 26.1011, longitude: 74.3189, verificationTier: 'verified_deposit', depositType: 'Potash Feldspar Pegmatite', sourceName: 'IBM India', observedYear: 2023 },
    ],
  },

  // ================= METALS =================
  {
    slug: 'gold',
    name: 'Gold',
    category: 'Metals',
    subcategory: 'Precious Native Transition Metal',
    chemicalFormula: 'Au',
    summary:
      'Dense, malleable, corrosion-resistant noble metal found natively in hydrothermal quartz veins, placer alluvium, and epithermal volcanic systems.',
    physicalProperties: {
      hardness: '2.5–3.0 Mohs',
      density: '19.32 g/cm³',
      color: 'Metallic golden yellow',
      crystalSystem: 'Isometric (cubic)',
      luster: 'Metallic',
      meltingPoint: '1,064.18 °C',
    },
    formationOrigin:
      'Precipitated from deep crustal hydrothermal fluids along fault zones (orogenic gold), paleoplacer conglomerates, and porphyry copper–gold systems.',
    industrialApplications: [
      'Corrosion-proof microelectronic bonding wires, PCB contacts, and aerospace connectors',
      'Infrared radiation shielding on spacecraft visors and satellite thermal blankets',
      'Monetary bullion reserves, jewelry, and medical diagnostics/nanoparticles',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Primary environmental risks arise from artisanal mercury amalgamation and cyanide leach tailings management; closed-loop electronic recycling recovers high-purity Au with >95% lower emissions.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 370, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Australia', iso3: 'AUS', annualOutput: 310, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Russia', iso3: 'RUS', annualOutput: 310, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Canada', iso3: 'CAN', annualOutput: 200, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'United States', iso3: 'USA', annualOutput: 170, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~59,000 metric tons identified economic reserves globally',
      renewability: 'Non-renewable (highly recyclable; ~28% annual supply from recycling)',
      scarcityIndex: 76,
      reserveLifeYears: 19,
      unit: 'metric tons',
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 1392.6, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2020, price: 1769.6, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2021, price: 1798.6, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2022, price: 1800.1, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2023, price: 1940.5, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Jewelry Fabrication', sharePct: 49, source: 'World Gold Council' },
      { sector: 'Central Banks & Investment Bullion', sharePct: 44, source: 'World Gold Council' },
      { sector: 'Electronics, Aerospace & Dentistry', sharePct: 7, source: 'World Gold Council' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Metal Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & World Bank Commodity Data',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-gold.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Witwatersrand Gold Basin', country: 'South Africa', region: 'Africa', latitude: -26.2041, longitude: 28.0473, verificationTier: 'verified_deposit', depositType: 'Archean Paleoplacer Conglomerate', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Kalgoorlie Super Pit (Golden Mile)', country: 'Australia', region: 'Oceania', latitude: -30.7794, longitude: 121.5056, verificationTier: 'verified_deposit', depositType: 'Orogenic Archean Lode', sourceName: 'Geoscience Australia', observedYear: 2023 },
      { siteName: 'Carlin Trend Gold Belt, Nevada', country: 'United States', region: 'North America', latitude: 40.9619, longitude: -116.3328, verificationTier: 'verified_deposit', depositType: 'Carlin-Type Sediment-Hosted', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Muruntau Gold Deposit, Kyzylkum', country: 'Uzbekistan', region: 'Central Asia', latitude: 41.4981, longitude: 64.5719, verificationTier: 'verified_deposit', depositType: 'Orogenic Black Shale', sourceName: 'USGS', observedYear: 2023 },
    ],
  },
  {
    slug: 'silver',
    name: 'Silver',
    category: 'Metals',
    subcategory: 'Precious Coinage & Conductive Metal',
    chemicalFormula: 'Ag',
    summary:
      'Transition metal exhibiting the highest electrical and thermal conductivity of any element, recovered both from primary epithermal silver veins and as a byproduct of lead-zinc-copper smelting.',
    physicalProperties: {
      hardness: '2.5–3.0 Mohs',
      density: '10.49 g/cm³',
      color: 'Bright metallic silver-white',
      crystalSystem: 'Isometric',
      luster: 'Metallic',
      meltingPoint: '961.78 °C',
    },
    formationOrigin:
      'Epithermal hydrothermal veins, volcanogenic massive sulfide (VMS) deposits, and porphyry copper–molybdenum complexes.',
    industrialApplications: [
      'Photovoltaic silver paste for solar cell busbars and fingers',
      'High-reliability electrical contacts, switches, and automotive EV electronics',
      'Brazing alloys, antimicrobial medical coatings, and precision mirrors',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Critical energy-transition metal driving utility-scale solar photovoltaics; recycling from retired solar panels and electronics mitigates mining footprint.',
    majorProducers: [
      { country: 'Mexico', iso3: 'MEX', annualOutput: 6400, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 3400, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Peru', iso3: 'PER', annualOutput: 3100, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Chile', iso3: 'CHL', annualOutput: 1400, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~610,000 metric tons identified global reserves',
      renewability: 'Non-renewable (recyclable)',
      scarcityIndex: 68,
      reserveLifeYears: 23,
      unit: 'metric tons',
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 16.21, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2020, price: 20.54, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2021, price: 25.14, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2022, price: 21.73, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
      { year: 2023, price: 23.35, unit: 'USD / troy oz (annual avg)', source: 'World Bank / LBMA', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Electronics, Solar PV & Industrial', sharePct: 55, source: 'Silver Institute' },
      { sector: 'Jewelry & Silverware', sharePct: 24, source: 'Silver Institute' },
      { sector: 'Bars & Coinage', sharePct: 21, source: 'Silver Institute' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Metal Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS Mineral Commodity Summaries 2024',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-silver.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Fresnillo Epithermal Silver Belt, Zacatecas', country: 'Mexico', region: 'North America', latitude: 23.1753, longitude: -102.8686, verificationTier: 'verified_deposit', depositType: 'Epithermal Ag-Pb-Zn Vein', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Cerro de Pasco Polymetallic District', country: 'Peru', region: 'South America', latitude: -10.6836, longitude: -76.2625, verificationTier: 'verified_deposit', depositType: 'Cordilleran Polymetallic Replacement', sourceName: 'INGEMMET Peru', observedYear: 2023 },
      { siteName: 'Kongsberg Native Silver Mines', country: 'Norway', region: 'Europe', latitude: 59.6689, longitude: 9.6502, verificationTier: 'verified_deposit', depositType: 'Hydrothermal Calcite-Silver Vein', sourceName: 'NGU Norway', observedYear: 2022 },
    ],
  },
  {
    slug: 'iron',
    name: 'Iron',
    category: 'Metals',
    subcategory: 'Ferrous Base Metal (Hematite & Magnetite Ores)',
    chemicalFormula: 'Fe (ores: Fe₂O₃, Fe₃O₄)',
    summary:
      'Fourth most abundant element in Earth’s crust and the foundational structural metal of global civilization, predominantly extracted from Precambrian banded iron formations (BIFs).',
    physicalProperties: {
      hardness: '4.0 Mohs (pure Fe); Hematite 5.5–6.5',
      density: '7.874 g/cm³ (pure Fe)',
      color: 'Lustrous silvery-grey (metallic); red-grey (hematite)',
      crystalSystem: 'Body-centered cubic (α-Fe)',
      meltingPoint: '1,538 °C',
    },
    formationOrigin:
      'Primarily precipitated in Archean–Paleoproterozoic oceans as Banded Iron Formations (BIFs) during the Great Oxidation Event ~2.4–1.8 billion years ago.',
    industrialApplications: [
      'Steel production (>98% of mined iron ore) for construction, rail, shipping, and wind turbines',
      'Cast iron machinery, engine blocks, and municipal water pipelines',
      'Iron-oxide pigments and lithium-iron-phosphate (LFP) battery cathodes',
    ],
    agriculturalApplications: [
      'Iron chelate micronutrients for chlorophyll synthesis in alkaline crops',
    ],
    environmentalImportance:
      'Steelmaking accounts for ~7–8% of global CO₂ emissions; green hydrogen direct reduction (H₂-DRI) and electric-arc steel recycling are major decarbonization pathways.',
    majorProducers: [
      { country: 'Australia', iso3: 'AUS', annualOutput: 960, unit: 'million metric tons (usable ore)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Brazil', iso3: 'BRA', annualOutput: 440, unit: 'million metric tons (usable ore)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 280, unit: 'million metric tons (usable ore)', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'India', iso3: 'IND', annualOutput: 270, unit: 'million metric tons (usable ore)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~190 billion metric tons crude iron ore (~87 billion t contained iron)',
      renewability: 'Non-renewable (highly recycled via steel scrap)',
      scarcityIndex: 21,
      reserveLifeYears: 76,
      unit: 'million metric tons',
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 93.8, unit: 'USD / dry metric ton (62% Fe CFR China)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 108.9, unit: 'USD / dry metric ton (62% Fe CFR China)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 161.7, unit: 'USD / dry metric ton (62% Fe CFR China)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 121.3, unit: 'USD / dry metric ton (62% Fe CFR China)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 120.6, unit: 'USD / dry metric ton (62% Fe CFR China)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Construction & Infrastructure Steel', sharePct: 52, source: 'World Steel Association' },
      { sector: 'Mechanical Equipment & Machinery', sharePct: 16, source: 'World Steel Association' },
      { sector: 'Automotive, Rail & Shipbuilding', sharePct: 17, source: 'World Steel Association' },
      { sector: 'Appliances, Energy & Other', sharePct: 15, source: 'World Steel Association' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Ore Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & World Bank Pink Sheet',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-iron-ore.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Hamersley Range Iron Ore Province, Pilbara', country: 'Australia', region: 'Oceania', latitude: -22.7106, longitude: 117.7867, verificationTier: 'verified_deposit', depositType: 'Banded Iron Formation (BIF)', sourceName: 'Geoscience Australia', observedYear: 2023 },
      { siteName: 'Carajás Iron Ore District, Pará', country: 'Brazil', region: 'South America', latitude: -6.0592, longitude: -50.1753, verificationTier: 'verified_deposit', depositType: 'Supergene Enriched BIF', sourceName: 'ANM Brazil', observedYear: 2023 },
      { siteName: 'Kiruna Magnetite Orebody', country: 'Sweden', region: 'Europe', latitude: 67.8558, longitude: 20.2253, verificationTier: 'verified_deposit', depositType: 'Kiruna-Type Apatite Magnetite', sourceName: 'SGU Sweden', observedYear: 2023 },
      { siteName: 'Bailadila Iron Ore Range, Chhattisgarh', country: 'India', region: 'South Asia', latitude: 18.7167, longitude: 81.2333, verificationTier: 'verified_deposit', depositType: 'Hematite BIF', sourceName: 'IBM India', observedYear: 2023 },
    ],
  },
  {
    slug: 'copper',
    name: 'Copper',
    category: 'Metals',
    subcategory: 'Non-Ferrous Conductive Base Metal',
    chemicalFormula: 'Cu (primary ore: CuFeS₂)',
    summary:
      'Ductile reddish-orange transition metal essential to electrical power transmission, electric vehicles, and renewable energy grids, mined largely from Andean porphyry and sediment-hosted copper belts.',
    physicalProperties: {
      hardness: '2.5–3.0 Mohs',
      density: '8.96 g/cm³',
      color: 'Metallic reddish-orange',
      crystalSystem: 'Face-centered cubic',
      meltingPoint: '1,084.62 °C',
    },
    formationOrigin:
      'Magmatic-hydrothermal porphyry intrusions along convergent subduction arcs (Andes, Pacific Rim) and sediment-hosted stratiform basins (Central African Copperbelt).',
    industrialApplications: [
      'Power grid cables, transformer windings, and electric vehicle stator motors',
      'Plumbing, HVAC heat exchangers, and brass/bronze engineering alloys',
      'Data center power distribution and antimicrobial architectural hardware',
    ],
    agriculturalApplications: [
      'Copper sulfate and copper hydroxide fungicides for vineyards and orchard crops',
    ],
    environmentalImportance:
      'Cornerstone electrification metal; high-grade recycling saves ~85% energy compared to primary smelting, while tailings acidification requires strict hydrogeological containment.',
    majorProducers: [
      { country: 'Chile', iso3: 'CHL', annualOutput: 5000, unit: 'thousand metric tons (mine)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Peru', iso3: 'PER', annualOutput: 2600, unit: 'thousand metric tons (mine)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'DR Congo', iso3: 'COD', annualOutput: 2500, unit: 'thousand metric tons (mine)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 1700, unit: 'thousand metric tons (mine)', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'United States', iso3: 'USA', annualOutput: 1100, unit: 'thousand metric tons (mine)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~1.0 billion metric tons identified reserves (~2.1B t identified resources)',
      renewability: 'Non-renewable (infinitely recyclable without property loss)',
      scarcityIndex: 54,
      reserveLifeYears: 45,
      unit: 'thousand metric tons',
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 6010, unit: 'USD / metric ton (LME annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 6174, unit: 'USD / metric ton (LME annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 9317, unit: 'USD / metric ton (LME annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 8822, unit: 'USD / metric ton (LME annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 8490, unit: 'USD / metric ton (LME annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Electrical Grid & Telecommunications', sharePct: 33, source: 'ICSG' },
      { sector: 'Building Construction & Plumbing', sharePct: 27, source: 'ICSG' },
      { sector: 'EVs, Transport & Industrial Machinery', sharePct: 26, source: 'ICSG' },
      { sector: 'Consumer Electronics & Alloys', sharePct: 14, source: 'ICSG' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Metal Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & International Copper Study Group',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-copper.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Escondida Porphyry Copper Mine, Atacama', country: 'Chile', region: 'South America', latitude: -24.2683, longitude: -69.0706, verificationTier: 'verified_deposit', depositType: 'Porphyry Copper-Molybdenum', sourceName: 'SERNAGEOMIN Chile', observedYear: 2023 },
      { siteName: 'Chuquicamata Porphyry Complex', country: 'Chile', region: 'South America', latitude: -22.2889, longitude: -68.9022, verificationTier: 'verified_deposit', depositType: 'Porphyry Copper', sourceName: 'USGS MRDS', observedYear: 2023 },
      { siteName: 'Bingham Canyon Mine, Utah', country: 'United States', region: 'North America', latitude: 40.5231, longitude: -112.1508, verificationTier: 'verified_deposit', depositType: 'Porphyry Cu-Au-Mo', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Katanga Copperbelt (Kolwezi)', country: 'DR Congo', region: 'Africa', latitude: -10.7147, longitude: 25.4667, verificationTier: 'verified_deposit', depositType: 'Stratiform Sediment-Hosted Cu-Co', sourceName: 'USGS', observedYear: 2023 },
    ],
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    category: 'Metals',
    subcategory: 'Platinum-Group Noble Metal (PGM)',
    chemicalFormula: 'Pt',
    summary:
      'Dense, silvery-white catalytic noble metal concentrated in layered mafic-ultramafic igneous complexes, vital for hydrogen fuel cells, PEM electrolyzers, and emission control catalysts.',
    physicalProperties: {
      hardness: '4.0–4.5 Mohs',
      density: '21.45 g/cm³',
      color: 'Tin-white to steel-grey',
      crystalSystem: 'Isometric',
      meltingPoint: '1,768.3 °C',
    },
    formationOrigin:
      'Magmatic sulfide segregation within layered mafic–ultramafic intrusions such as the Bushveld Igneous Complex and Norilsk-Talnakh.',
    industrialApplications: [
      'PEM hydrogen fuel-cell and green hydrogen electrolyzer electrocatalysts',
      'Automotive catalytic converters reducing NOₓ, CO, and hydrocarbons',
      'Chemotherapy compounds (cisplatin), glass fiber bushings, and thermocouples',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Critical clean-air and green-hydrogen catalyst metal; ultra-scarce crustal concentration (~0.005 ppm) makes closed-loop autocatalyst recycling essential.',
    majorProducers: [
      { country: 'South Africa', iso3: 'ZAF', annualOutput: 120, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Russia', iso3: 'RUS', annualOutput: 23, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Zimbabwe', iso3: 'ZWE', annualOutput: 19, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Canada', iso3: 'CAN', annualOutput: 5.5, unit: 'metric tons', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~71,000 metric tons PGM reserves globally (>80% in South Africa)',
      renewability: 'Non-renewable (highly recycled from catalytic converters)',
      scarcityIndex: 88,
      reserveLifeYears: 115,
      unit: 'metric tons',
      source: 'USGS Mineral Commodity Summaries 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 863, unit: 'USD / troy oz (annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 883, unit: 'USD / troy oz (annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 1091, unit: 'USD / troy oz (annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 962, unit: 'USD / troy oz (annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 966, unit: 'USD / troy oz (annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Autocatalysts & Emissions Control', sharePct: 41, source: 'WPIC' },
      { sector: 'Chemical, Glass & Hydrogen Catalysts', sharePct: 31, source: 'WPIC' },
      { sector: 'Jewelry & Investment', sharePct: 28, source: 'WPIC' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Metal Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & World Platinum Investment Council',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-platinum.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Bushveld Igneous Complex (Merensky Reef)', country: 'South Africa', region: 'Africa', latitude: -25.4328, longitude: 27.3264, verificationTier: 'verified_deposit', depositType: 'Layered Mafic-Ultramafic Intrusion', sourceName: 'Council for Geoscience SA', observedYear: 2023 },
      { siteName: 'Great Dyke Platinum Belt (Zimplats)', country: 'Zimbabwe', region: 'Africa', latitude: -18.7025, longitude: 30.3547, verificationTier: 'verified_deposit', depositType: 'Layered Ultramafic Intrusion', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Stillwater Layered Complex, Montana', country: 'United States', region: 'North America', latitude: 45.3833, longitude: -109.8833, verificationTier: 'verified_deposit', depositType: 'Archean Mafic Intrusion', sourceName: 'USGS MRDS', observedYear: 2023 },
    ],
  },
  {
    slug: 'mercury',
    name: 'Mercury',
    category: 'Metals',
    subcategory: 'Liquid Post-Transition Metal (Cinnabar Ore)',
    chemicalFormula: 'Hg (primary ore: HgS)',
    summary:
      'Only metallic element that is liquid at standard temperature and pressure, predominantly extracted from hydrothermal cinnabar (HgS) deposits and tightly regulated globally under the Minamata Convention.',
    physicalProperties: {
      density: '13.534 g/cm³ (at 25 °C)',
      color: 'Silvery-white liquid metal; cinnabar ore is crimson red',
      stateAtSTP: 'Liquid',
      meltingPoint: '-38.83 °C',
      boilingPoint: '356.73 °C',
    },
    formationOrigin:
      'Low-temperature epithermal hydrothermal veins and hot-spring deposits near volcanic arcs, forming cinnabar (HgS) precipitates.',
    industrialApplications: [
      'Legacy scientific barometers, reference electrodes, and fluorescent discharge lamps (phasing down under Minamata Convention)',
      'Vinyl chloride monomer (VCM) catalysts in legacy chemical plants (subject to global phase-out)',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Persistent bioaccumulative neurotoxin (methylmercury); the UNEP Minamata Convention restricts primary mercury mining and bans new mercury-added products worldwide.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 2000, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Tajikistan', iso3: 'TJK', annualOutput: 120, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Mexico', iso3: 'MEX', annualOutput: 80, unit: 'metric tons', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Primary production declining due to UNEP Minamata Convention phase-out',
      renewability: 'Non-renewable (strictly controlled hazardous metal)',
      scarcityIndex: 62,
      reserveLifeYears: null,
      source: 'USGS MCS 2024 & UNEP Minamata Convention',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'VCM Catalysis (Phasing Out)', sharePct: 48, source: 'UNEP Global Mercury Assessment' },
      { sector: 'Artisanal Gold Processing (Restricted)', sharePct: 37, source: 'UNEP' },
      { sector: 'Specialty Calibration & Lighting', sharePct: 15, source: 'USGS' },
    ],
    imageUrl: '/src/assets/images/specimen_metals_ores_1794920308915.jpg',
    imageAttribution: 'GeoAtlas Curated Ore Reference',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & UNEP Minamata Convention',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-mercury.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Almadén Historic Cinnabar Deposit (Closed 2003)', country: 'Spain', region: 'Europe', latitude: 38.7756, longitude: -4.8358, verificationTier: 'verified_deposit', depositType: 'Silurian Hydrothermal Cinnabar', sourceName: 'IGME / UNESCO', observedYear: 2022 },
      { siteName: 'Wanshan Mercury District, Guizhou', country: 'China', region: 'East Asia', latitude: 27.5153, longitude: 109.2089, verificationTier: 'reported_occurrence', depositType: 'Carbonate-Hosted Cinnabar', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Idrija Historic Mercury Deposit (Closed)', country: 'Slovenia', region: 'Europe', latitude: 46.0028, longitude: 14.0275, verificationTier: 'verified_deposit', depositType: 'Triassic Syngenetic-Hydrothermal', sourceName: 'UNESCO', observedYear: 2022 },
    ],
  },

  // ================= GEMSTONES =================
  {
    slug: 'diamond',
    name: 'Diamond',
    category: 'Gemstones',
    subcategory: 'Cubic Carbon Allotrope Gemstone & Abrasive',
    chemicalFormula: 'C (sp³ tetrahedral lattice)',
    summary:
      'Metastable high-pressure allotrope of carbon possessing the highest natural thermal conductivity and Mohs hardness (10), brought to Earth’s surface through deep mantle kimberlite and lamproite pipes.',
    physicalProperties: {
      hardness: '10.0 Mohs (absolute reference)',
      density: '3.515 g/cm³',
      color: 'Colorless, yellow, brown, rare blue/pink',
      crystalSystem: 'Isometric (cubic octahedron)',
      luster: 'Adamantine',
      cleavage: 'Perfect on {111}',
    },
    formationOrigin:
      'Crystallizes 140–190 km deep within sub-continental lithospheric mantle roots at 4.5–6.0 GPa pressure and 900–1,300 °C, rapidly transported by volatile-rich kimberlite magma.',
    industrialApplications: [
      'Precision diamond-tipped cutting saws, oil/geothermal drill bits, and CNC grinding wheels',
      'Optical windows for high-power lasers and heat spreaders in power semiconductors',
      'Gemstone jewelry (~20% of mined natural output by weight, >90% by value)',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Kimberlite tailings weather rapidly via carbonation, offering potential CO₂ mineralization capacity; responsible mining governs alluvial watershed protection.',
    majorProducers: [
      { country: 'Russia', iso3: 'RUS', annualOutput: 37.3, unit: 'million carats (natural)', year: 2023, status: 'estimated', source: 'Kimberley Process / USGS' },
      { country: 'Botswana', iso3: 'BWA', annualOutput: 25.1, unit: 'million carats (natural)', year: 2023, status: 'reported', source: 'Kimberley Process / USGS' },
      { country: 'Canada', iso3: 'CAN', annualOutput: 16.0, unit: 'million carats (natural)', year: 2023, status: 'reported', source: 'NRCan / USGS' },
      { country: 'DR Congo', iso3: 'COD', annualOutput: 8.3, unit: 'million carats (natural)', year: 2023, status: 'reported', source: 'Kimberley Process' },
      { country: 'South Africa', iso3: 'ZAF', annualOutput: 5.9, unit: 'million carats (natural)', year: 2023, status: 'reported', source: 'Kimberley Process' },
    ],
    availabilityMetrics: {
      globalReservesText: '~1.3 billion carats natural reserves (industrial + gem); synthetic CVD/HPHT now dominates industrial abrasives',
      renewability: 'Non-renewable (natural); industrial stones synthesized at scale',
      scarcityIndex: 82,
      reserveLifeYears: 14,
      unit: 'million carats',
      source: 'USGS MCS 2024 & Kimberley Process',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Gemstone Jewelry (by economic value)', sharePct: 78, source: 'USGS / Bain' },
      { sector: 'Precision Drilling, Sawing & Abrasives', sharePct: 18, source: 'USGS Industrial Diamond' },
      { sector: 'Optics & Thermal Electronics', sharePct: 4, source: 'Industry Reference' },
    ],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Rough_Diamond.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled',
    imageAttribution: 'Wikimedia Commons · Rough Octahedral Diamond',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS & Kimberley Process Statistics',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-diamond-industrial.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Jwaneng Kimberlite Pipe', country: 'Botswana', region: 'Africa', latitude: -24.5244, longitude: 24.7031, verificationTier: 'verified_deposit', depositType: 'Kimberlite Pipe', sourceName: 'USGS / Debswana', observedYear: 2023 },
      { siteName: 'Diavik & Ekati Kimberlite Cluster, NWT', country: 'Canada', region: 'North America', latitude: 64.4961, longitude: -110.2775, verificationTier: 'verified_deposit', depositType: 'Eocene Kimberlite Pipes', sourceName: 'NRCan', observedYear: 2023 },
      { siteName: 'Argyle Lamproite Pipe (Historic Pink Diamond)', country: 'Australia', region: 'Oceania', latitude: -16.7128, longitude: 128.3911, verificationTier: 'verified_deposit', depositType: 'Olivine Lamproite Pipe', sourceName: 'Geoscience Australia', observedYear: 2021 },
      { siteName: 'Kimberley Big Hole Historic Pipe', country: 'South Africa', region: 'Africa', latitude: -28.7383, longitude: 24.7586, verificationTier: 'verified_deposit', depositType: 'Type Kimberlite Pipe', sourceName: 'Mindat', observedYear: 2022 },
    ],
  },
  {
    slug: 'ruby',
    name: 'Ruby',
    category: 'Gemstones',
    subcategory: 'Chromium-Doped Corundum Gemstone',
    chemicalFormula: 'Al₂O₃:Cr³⁺',
    summary:
      'Red gem variety of the mineral corundum (aluminum oxide), colored by trace chromium (Cr³⁺) ions substituting for aluminum within a trigonal crystal lattice.',
    physicalProperties: {
      hardness: '9.0 Mohs',
      density: '3.98–4.02 g/cm³',
      color: 'Crimson to pigeon-blood red (fluoresces under UV)',
      crystalSystem: 'Trigonal (hexagonal)',
      luster: 'Vitreous to sub-adamantine',
      meltingPoint: '2,044 °C',
    },
    formationOrigin:
      'High-grade regional metamorphism of silica-poor marbles (e.g., Mogok Belt, Montepuez) or alkali basaltic volcanism.',
    industrialApplications: [
      'Fine gemstone jewelry (primary natural use)',
      'Synthetic ruby crystals used in solid-state ruby lasers, watch bearings, and CMM probe tips',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Artisanal gemstone pits require alluvial silt stabilization and post-mining habitat restoration in biodiverse tropical corridors.',
    majorProducers: [
      { country: 'Mozambique', iso3: 'MOZ', sharePct: 42, unit: '% global gem ruby supply', year: 2023, status: 'estimated', source: 'GIA / USGS Gemstones' },
      { country: 'Myanmar', iso3: 'MMR', sharePct: 20, unit: '% global gem ruby supply', year: 2023, status: 'estimated', source: 'GIA' },
      { country: 'Madagascar', iso3: 'MDG', sharePct: 14, unit: '% global gem ruby supply', year: 2023, status: 'estimated', source: 'USGS' },
      { country: 'Thailand', iso3: 'THA', sharePct: 9, unit: '% global gem ruby supply', year: 2023, status: 'estimated', source: 'GIA' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Rare high-grade gem deposits restricted to metamorphic marble and amphibolite belts',
      renewability: 'Non-renewable',
      scarcityIndex: 89,
      reserveLifeYears: null,
      source: 'USGS Gemstones & GIA',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'High-Value Gemstone Jewelry', sharePct: 86, source: 'GIA' },
      { sector: 'Synthetic Corundum Optics & Bearings', sharePct: 14, source: 'Industry Reference' },
    ],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Corundum-215330.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled',
    imageAttribution: 'Wikimedia Commons · Ruby Corundum Crystal',
    dataOrigin: 'curated_verified',
    sourceName: 'GIA & Mindat Gemological Database',
    sourceUrl: 'https://www.mindat.org/min-3473.html',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Mogok Stone Tract Marble Belt', country: 'Myanmar', region: 'Southeast Asia', latitude: 22.9219, longitude: 96.5056, verificationTier: 'verified_deposit', depositType: 'Marble-Hosted Corundum', sourceName: 'GIA / Mindat', observedYear: 2023 },
      { siteName: 'Montepuez Ruby Deposit, Cabo Delgado', country: 'Mozambique', region: 'Africa', latitude: -13.1289, longitude: 39.0014, verificationTier: 'verified_deposit', depositType: 'Amphibolite-Hosted Primary & Secondary', sourceName: 'GIA', observedYear: 2023 },
      { siteName: 'Winza Ruby-Sapphire Deposit', country: 'Tanzania', region: 'Africa', latitude: -6.8261, longitude: 36.4167, verificationTier: 'reported_occurrence', depositType: 'Metamorphic Dyke', sourceName: 'Mindat', observedYear: 2022 },
    ],
  },
  {
    slug: 'emerald',
    name: 'Emerald',
    category: 'Gemstones',
    subcategory: 'Chromium/Vanadium Beryl Gemstone',
    chemicalFormula: 'Be₃Al₂(SiO₃)₆:Cr,V',
    summary:
      'Deep green gem variety of beryl (beryllium aluminum cyclosilicate) colored by trace chromium and vanadium, formed where beryllium-rich fluids interact with Cr-bearing rocks.',
    physicalProperties: {
      hardness: '7.5–8.0 Mohs',
      density: '2.67–2.78 g/cm³',
      color: 'Vivid bluish-green to grass green',
      crystalSystem: 'Hexagonal',
      luster: 'Vitreous',
      cleavage: 'Imperfect basal {0001}',
    },
    formationOrigin:
      'Hydrothermal fluid circulation in black organic shales (Colombian model) or tectonic juxtaposition of granitic pegmatites with ultramafic chromium-rich schists (Zambian/Brazilian model).',
    industrialApplications: [
      'Precious gemstone jewelry and museum mineral specimens',
      'Hydrothermal synthetic emerald used sparingly in specialized microwave/maser research',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Tectonic suture emerald mines require careful control of underground acid rock drainage and artisanal river siltation.',
    majorProducers: [
      { country: 'Colombia', iso3: 'COL', sharePct: 45, unit: '% global gem emerald value', year: 2023, status: 'reported', source: 'USGS / ANM Colombia' },
      { country: 'Zambia', iso3: 'ZMB', sharePct: 28, unit: '% global gem emerald value', year: 2023, status: 'reported', source: 'USGS / Kagem' },
      { country: 'Brazil', iso3: 'BRA', sharePct: 14, unit: '% global gem emerald value', year: 2023, status: 'reported', source: 'ANM Brazil' },
      { country: 'Ethiopia', iso3: 'ETH', sharePct: 5, unit: '% global gem emerald value', year: 2023, status: 'estimated', source: 'GIA' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Geochemically rare because Be (continental crust) and Cr/V (mantle/shale) rarely coincide',
      renewability: 'Non-renewable',
      scarcityIndex: 91,
      reserveLifeYears: null,
      source: 'USGS Gemstones & GIA',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Fine Gemstone Jewelry', sharePct: 95, source: 'GIA' },
      { sector: 'Mineralogical Collections & Research', sharePct: 5, source: 'Industry Reference' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/B%C3%A9ryl_var._%C3%A9meraude_sur_gangue_%28Muzo_Mine_Boyaca_-_Colombie%29_2.jpg/960px-B%C3%A9ryl_var._%C3%A9meraude_sur_gangue_%28Muzo_Mine_Boyaca_-_Colombie%29_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Colombian Emerald Crystal',
    dataOrigin: 'curated_verified',
    sourceName: 'GIA & Mindat',
    sourceUrl: 'https://www.mindat.org/min-1375.html',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Muzo Emerald District, Boyacá', country: 'Colombia', region: 'South America', latitude: 5.5356, longitude: -74.1078, verificationTier: 'verified_deposit', depositType: 'Hydrothermal Black Shale Vein', sourceName: 'SGC Colombia / Mindat', observedYear: 2023 },
      { siteName: 'Kafubu Emerald Field (Kagem)', country: 'Zambia', region: 'Africa', latitude: -13.0631, longitude: 28.1489, verificationTier: 'verified_deposit', depositType: 'Talc-Magnetite Schist Pegmatite', sourceName: 'USGS / GIA', observedYear: 2023 },
      { siteName: 'Itabira–Nova Era Emerald Belt, MG', country: 'Brazil', region: 'South America', latitude: -19.7547, longitude: -43.0406, verificationTier: 'verified_deposit', depositType: 'Phlogopite Schist Deposit', sourceName: 'ANM Brazil', observedYear: 2023 },
    ],
  },
  {
    slug: 'sapphire',
    name: 'Sapphire',
    category: 'Gemstones',
    subcategory: 'Iron-Titanium Corundum Gemstone',
    chemicalFormula: 'Al₂O₃ (trace Fe²⁺, Ti⁴⁺)',
    summary:
      'All gem-quality corundum colors other than red—most famously royal blue produced by Fe²⁺–Ti⁴⁺ intervalence charge transfer—prized both in fine jewelry and high-durability optics.',
    physicalProperties: {
      hardness: '9.0 Mohs',
      density: '3.98–4.02 g/cm³',
      color: 'Royal blue, padparadscha pink-orange, yellow, colorless',
      crystalSystem: 'Trigonal',
      luster: 'Vitreous to adamantine',
    },
    formationOrigin:
      'High-temperature metamorphic skarns and granulites or xenocrystic transport from deep crust in alkali basaltic magmas, frequently concentrated in alluvial placers.',
    industrialApplications: [
      'Scratch-proof watch crystals, smartphone camera lenses, and infrared military optics',
      'Epitaxial sapphire wafer substrates for GaN blue/white LEDs',
      'Gemstone jewelry',
    ],
    agriculturalApplications: [],
    environmentalImportance:
      'Alluvial placer extraction requires sediment settling ponds and riparian corridor restoration; synthetic Verneuil/Czochralski sapphire meets nearly 100% of industrial wafer demand.',
    majorProducers: [
      { country: 'Madagascar', iso3: 'MDG', sharePct: 35, unit: '% global natural gem sapphire', year: 2023, status: 'estimated', source: 'GIA / USGS' },
      { country: 'Sri Lanka', iso3: 'LKA', sharePct: 25, unit: '% global natural gem sapphire', year: 2023, status: 'reported', source: 'NGJA Sri Lanka' },
      { country: 'Australia', iso3: 'AUS', sharePct: 16, unit: '% global natural gem sapphire', year: 2023, status: 'reported', source: 'Geoscience Australia' },
      { country: 'Thailand', iso3: 'THA', sharePct: 8, unit: '% global natural gem sapphire', year: 2023, status: 'estimated', source: 'GIA' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Localized natural gem placers across Gondwanan metamorphic belts; synthetic sapphire unlimited',
      renewability: 'Non-renewable (natural)',
      scarcityIndex: 84,
      reserveLifeYears: null,
      source: 'USGS & GIA',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Natural Gemstone Jewelry', sharePct: 74, source: 'GIA' },
      { sector: 'Synthetic LED Substrates & Optics', sharePct: 26, source: 'Industry Reference' },
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Logan_Sapphire_10956420_cropped.png/960px-Logan_Sapphire_10956420_cropped.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail',
    imageAttribution: 'Wikimedia Commons · Smithsonian Sapphire Specimen',
    dataOrigin: 'curated_verified',
    sourceName: 'GIA & Mindat',
    sourceUrl: 'https://www.mindat.org/min-3529.html',
    lastUpdated: '2024-02-01',
    occurrences: [
      { siteName: 'Ratnapura Alluvial Gem Basin', country: 'Sri Lanka', region: 'South Asia', latitude: 6.6828, longitude: 80.3992, verificationTier: 'verified_deposit', depositType: 'Granulite-Derived Alluvial Placer', sourceName: 'NGJA / Mindat', observedYear: 2023 },
      { siteName: 'Ilakaka Paleo-Placer Sapphire Field', country: 'Madagascar', region: 'Africa', latitude: -22.6819, longitude: 45.2186, verificationTier: 'verified_deposit', depositType: 'Isalo Sandstone Placer', sourceName: 'GIA', observedYear: 2023 },
      { siteName: 'Yogo Gulch Lamprophyre Dyke, Montana', country: 'United States', region: 'North America', latitude: 46.7872, longitude: -110.3289, verificationTier: 'verified_deposit', depositType: 'Primary Lamprophyre Intrusion', sourceName: 'USGS MRDS', observedYear: 2022 },
    ],
  },

  // ================= CHEMICAL ELEMENTS & COMPOUNDS =================
  {
    slug: 'hydrogen',
    name: 'Hydrogen',
    category: 'Chemical Elements & Compounds',
    subcategory: 'Lightest Chemical Element (Z = 1)',
    chemicalFormula: 'H₂ (elemental H)',
    summary:
      'Most abundant chemical element in the universe and a critical energy carrier and chemical feedstock on Earth, locked primarily in water (H₂O), hydrocarbons, and nascent geologic white-hydrogen reservoirs.',
    physicalProperties: {
      density: '0.08988 g/L (STP gas)',
      color: 'Colorless, odorless gas',
      stateAtSTP: 'Diatomic gas',
      meltingPoint: '-259.16 °C',
      boilingPoint: '-252.87 °C',
      calorificValue: '120–142 MJ/kg (HHV)',
    },
    formationOrigin:
      'Primordial Big Bang nucleosynthesis; terrestrially bound in hydrosphere water, organic biomass, and generated geologically via serpentinization of ultramafic rocks.',
    industrialApplications: [
      'Haber–Bosch ammonia synthesis for global nitrogen fertilizers (~55% of industrial H₂)',
      'Petroleum hydrocracking and desulfurization refining',
      'Clean fuel-cell mobility, green steel direct reduction (H₂-DRI), and long-duration energy storage',
    ],
    agriculturalApplications: [
      'Primary hydrogen feedstock for synthetic ammonia (NH₃) and urea fertilizers supporting ~50% of global food production',
    ],
    environmentalImportance:
      'Electrolytic green hydrogen powered by renewables enables deep decarbonization of steel, shipping, and ammonia; natural geologic hydrogen exploration is emerging.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 33, unit: 'million metric tons H₂ (industrial)', year: 2023, status: 'estimated', source: 'IEA Global Hydrogen Review 2024' },
      { country: 'United States', iso3: 'USA', annualOutput: 11, unit: 'million metric tons H₂ (industrial)', year: 2023, status: 'reported', source: 'IEA Global Hydrogen Review 2024' },
      { country: 'India', iso3: 'IND', annualOutput: 6.5, unit: 'million metric tons H₂ (industrial)', year: 2023, status: 'estimated', source: 'IEA' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Virtually unlimited in ocean water (H₂O); ~97 Mt/yr current global industrial demand',
      renewability: 'Renewable when produced via water electrolysis with clean electricity',
      scarcityIndex: 5,
      reserveLifeYears: null,
      source: 'IEA Global Hydrogen Review & PubChem',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Petroleum Refining & Desulfurization', sharePct: 43, source: 'IEA' },
      { sector: 'Ammonia & Fertilizer Synthesis', sharePct: 34, source: 'IEA' },
      { sector: 'Methanol & Direct-Reduced Iron', sharePct: 23, source: 'IEA' },
    ],
    imageUrl: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
    imageAttribution: 'GeoAtlas Chemical & Mineral Reference',
    dataOrigin: 'curated_verified',
    sourceName: 'PubChem & IEA Global Hydrogen Review',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/Hydrogen',
    lastUpdated: '2024-03-01',
    occurrences: [
      { siteName: 'Bourakébougou Natural Geologic H₂ Field', country: 'Mali', region: 'Africa', latitude: 13.0792, longitude: -8.3814, verificationTier: 'verified_deposit', depositType: 'Natural Subsurface White Hydrogen Reservoir', sourceName: 'Int. Journal of Hydrogen Energy', observedYear: 2023 },
      { siteName: 'Lorraine Coal-Bed Geologic H₂ Seep', country: 'France', region: 'Europe', latitude: 49.1193, longitude: 6.7208, verificationTier: 'reported_occurrence', depositType: 'Deep Carbonaceous Aquifers', sourceName: 'CNRS / GeoRessources', observedYear: 2023 },
      { siteName: 'Semail Ophiolite Serpentinization Springs', country: 'Oman', region: 'West Asia', latitude: 22.8856, longitude: 58.3931, verificationTier: 'verified_deposit', depositType: 'Ultramafic Serpentinization H₂ Flux', sourceName: 'USGS / Sultan Qaboos Univ.', observedYear: 2023 },
    ],
  },
  {
    slug: 'oxygen',
    name: 'Oxygen',
    category: 'Chemical Elements & Compounds',
    subcategory: 'Chalcogen Element & Crustal Oxide Matrix (Z = 8)',
    chemicalFormula: 'O₂ (crustal: O²⁻)',
    summary:
      'Most abundant chemical element by mass in Earth’s crust (~46.1%), forming silicate rocks and water while sustaining aerobic respiration as 20.95% of Earth’s atmosphere.',
    physicalProperties: {
      density: '1.429 g/L (STP gas)',
      color: 'Colorless gas; pale blue liquid',
      stateAtSTP: 'Diatomic paramagnetic gas',
      meltingPoint: '-218.79 °C',
      boilingPoint: '-182.96 °C',
    },
    formationOrigin:
      'Stellar nucleosynthesis; free atmospheric O₂ accumulated ~2.4 billion years ago via oxygenic photosynthesis by marine cyanobacteria and terrestrial flora.',
    industrialApplications: [
      'Basic oxygen steelmaking (BOF) and oxy-fuel high-temperature smelting',
      'Medical respiratory therapy and hospital life-support systems',
      'Liquid oxygen (LOX) rocket propellant oxidizer and ozone water purification',
    ],
    agriculturalApplications: [
      'Root-zone dissolved oxygen (DO) critical for aerobic soil microbes and hydroponic nutrient uptake',
    ],
    environmentalImportance:
      'Stratospheric ozone (O₃) shields terrestrial life from UV-B radiation, while marine dissolved oxygen sustains pelagic ecosystems.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 31, unit: '% global cryogenic ASU capacity', year: 2023, status: 'estimated', source: 'Industrial Gas Reference' },
      { country: 'United States', iso3: 'USA', sharePct: 21, unit: '% global cryogenic ASU capacity', year: 2023, status: 'estimated', source: 'Industrial Gas Reference' },
      { country: 'European Union', iso3: 'EUR', sharePct: 18, unit: '% global cryogenic ASU capacity', year: 2023, status: 'estimated', source: 'Industrial Gas Reference' },
    ],
    availabilityMetrics: {
      globalReservesText: '~1.2 × 10¹⁵ metric tons in atmosphere; 46.1% of crustal rock mass',
      renewability: 'Continuously regenerated by oceanic phytoplankton and terrestrial forests',
      scarcityIndex: 1,
      reserveLifeYears: null,
      source: 'NOAA / NASA Earth Fact Sheet & PubChem',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Steel & Non-Ferrous Metallurgy', sharePct: 55, source: 'Industrial Gases Review' },
      { sector: 'Chemical Synthesis & Refining', sharePct: 24, source: 'Industrial Gases Review' },
      { sector: 'Healthcare, Aerospace & Water Treatment', sharePct: 21, source: 'Industrial Gases Review' },
    ],
    imageUrl: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
    imageAttribution: 'GeoAtlas Chemical & Atmospheric Reference',
    dataOrigin: 'curated_verified',
    sourceName: 'NOAA Earth System & PubChem',
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/Oxygen',
    lastUpdated: '2024-03-01',
    occurrences: [
      { siteName: 'Amazon Rainforest Photosynthetic Sink', country: 'Brazil', region: 'South America', latitude: -3.4653, longitude: -62.2159, verificationTier: 'estimated_distribution', depositType: 'Terrestrial Photosynthetic Flux Zone', sourceName: 'NASA Earth Observatory', observedYear: 2024 },
      { siteName: 'North Atlantic Phytoplankton Bloom Zone', country: 'International Waters', region: 'Atlantic Ocean', latitude: 52.5, longitude: -25.0, verificationTier: 'estimated_distribution', depositType: 'Marine Oxygenic Photosynthesis', sourceName: 'NOAA Ocean Atlas', observedYear: 2024 },
    ],
  },
  {
    slug: 'carbon',
    name: 'Carbon',
    category: 'Chemical Elements & Compounds',
    subcategory: 'Tetravalent Non-Metal Element (Z = 6)',
    chemicalFormula: 'C (Graphite, Diamond, Organic)',
    summary:
      'Chemical backbone of all known organic life and a primary industrial material in crystalline graphite, diamond, activated carbon, and carbon-fiber composites.',
    physicalProperties: {
      hardness: '1–2 Mohs (Graphite); 10 Mohs (Diamond)',
      density: '2.26 g/cm³ (Graphite); 3.51 g/cm³ (Diamond)',
      color: 'Metallic black (graphite); colorless (diamond)',
      crystalSystem: 'Hexagonal (graphite) / Cubic (diamond)',
      meltingPoint: '3,642 °C (sublimes)',
    },
    formationOrigin:
      'Deep mantle crystallization (diamond), regional metamorphism of organic-rich sediments (natural flake graphite), and biological carbon fixation.',
    industrialApplications: [
      'Battery-grade natural and synthetic graphite anodes for lithium-ion EV batteries',
      'Steelmaking recarburizers, electric-arc electrodes, and high-temperature refractories',
      'Aerospace carbon-fiber composites and activated carbon water/air filtration',
    ],
    agriculturalApplications: [
      'Soil organic carbon (SOC) and biochar enhance soil cation exchange capacity, water retention, and microbial fertility',
    ],
    environmentalImportance:
      'Earth’s biogeochemical carbon cycle distributes ~40,000 GtC across oceans, permafrost, soils, forests, and carbonate rocks.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 1230, unit: 'thousand metric tons (natural graphite)', year: 2023, status: 'estimated', source: 'USGS MCS 2024' },
      { country: 'Madagascar', iso3: 'MDG', annualOutput: 100, unit: 'thousand metric tons (natural graphite)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Mozambique', iso3: 'MOZ', annualOutput: 96, unit: 'thousand metric tons (natural graphite)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
      { country: 'Brazil', iso3: 'BRA', annualOutput: 73, unit: 'thousand metric tons (natural graphite)', year: 2023, status: 'reported', source: 'USGS MCS 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~280 million metric tons natural graphite reserves; >65,000,000 GtC in crustal carbonates',
      renewability: 'Cyclic biogeochemical element; crystalline graphite non-renewable',
      scarcityIndex: 28,
      reserveLifeYears: 175,
      unit: 'thousand metric tons (graphite)',
      source: 'USGS Graphite MCS 2024 & IPCC',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Li-Ion Battery Anodes', sharePct: 38, source: 'USGS / Benchmark' },
      { sector: 'Refractories & Foundry', sharePct: 32, source: 'USGS' },
      { sector: 'Lubricants, Composites & Filtration', sharePct: 30, source: 'USGS' },
    ],
    imageUrl: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
    imageAttribution: 'GeoAtlas Element & Mineral Reference',
    dataOrigin: 'curated_verified',
    sourceName: 'USGS Graphite & PubChem',
    sourceUrl: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-graphite.pdf',
    lastUpdated: '2024-01-31',
    occurrences: [
      { siteName: 'Jixi Flake Graphite Belt, Heilongjiang', country: 'China', region: 'East Asia', latitude: 45.2953, longitude: 130.9692, verificationTier: 'verified_deposit', depositType: 'Metamorphic Crystalline Flake Graphite', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Balama Graphite Deposit, Cabo Delgado', country: 'Mozambique', region: 'Africa', latitude: -13.3489, longitude: 38.5736, verificationTier: 'verified_deposit', depositType: 'Proterozoic Graphitic Schist', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Bogala Vein Graphite Mine', country: 'Sri Lanka', region: 'South Asia', latitude: 7.1103, longitude: 80.2897, verificationTier: 'verified_deposit', depositType: 'High-Purity Hydrothermal Lump Graphite', sourceName: 'Mindat', observedYear: 2023 },
    ],
  },
  {
    slug: 'carbon-dioxide',
    name: 'Carbon Dioxide',
    category: 'Chemical Elements & Compounds',
    subcategory: 'Atmospheric Trace Gas & Supercritical Fluid',
    chemicalFormula: 'CO₂',
    summary:
      'Linear triatomic molecular compound essential to planetary photosynthesis and greenhouse radiative balance; captured industrially for enhanced oil recovery, food carbonation, and geological carbon sequestration.',
    physicalProperties: {
      density: '1.977 g/L (STP gas); 1.562 g/cm³ (dry ice)',
      color: 'Colorless gas; white solid (dry ice)',
      stateAtSTP: 'Gas (sublimes at -78.46 °C)',
      meltingPoint: '-56.56 °C (at 5.185 bar triple point)',
    },
    formationOrigin:
      'Volcanic outgassing, cellular respiration, carbonate rock metamorphism, and anthropogenic combustion of fossil hydrocarbons and cement calcination.',
    industrialApplications: [
      'Food & beverage carbonation and dry-ice cryogenic cold-chain transport',
      'Supercritical CO₂ decaffeination, chemical urea synthesis, and greenhouse enrichment',
      'Geological Carbon Capture & Storage (CCS) in deep saline aquifers and basalt formations',
    ],
    agriculturalApplications: [
      'Primary carbon substrate assimilated by crops during photosynthesis; injected in controlled greenhouses (800–1,000 ppm) to accelerate biomass growth',
    ],
    environmentalImportance:
      'Primary long-lived anthropogenic greenhouse gas (~422 ppm global atmospheric baseline in 2024 per NOAA Mauna Loa Observatory) and driver of ocean acidification.',
    majorProducers: [
      { country: 'Global Baseline (Mauna Loa Obs.)', iso3: 'WLD', annualOutput: 422, unit: 'ppm atmospheric concentration', year: 2024, status: 'verified', source: 'NOAA Global Monitoring Lab' },
    ],
    availabilityMetrics: {
      globalReservesText: '~422 ppm atmospheric mean (~3,200 GtCO₂ in atmosphere); >10,000 GtCO₂ geological storage capacity',
      renewability: 'Continuous planetary biogeochemical flux',
      scarcityIndex: 2,
      reserveLifeYears: null,
      source: 'NOAA Global Monitoring Laboratory',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Urea & Chemical Synthesis', sharePct: 42, source: 'IEA CO₂ Utilization' },
      { sector: 'Enhanced Oil Recovery & Storage', sharePct: 36, source: 'IEA' },
      { sector: 'Food Carbonation, Dry Ice & Greenhouses', sharePct: 22, source: 'Industrial Gases' },
    ],
    imageUrl: '/src/assets/images/category_chemical_elements_1795022586157.jpg',
    imageAttribution: 'GeoAtlas Chemical & Atmospheric Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'NOAA Global Monitoring Lab & PubChem',
    sourceUrl: 'https://gml.noaa.gov/ccgg/trends/',
    lastUpdated: '2024-05-01',
    occurrences: [
      { siteName: 'Mauna Loa Atmospheric Baseline Observatory', country: 'United States', region: 'Pacific', latitude: 19.5362, longitude: -155.5763, verificationTier: 'verified_deposit', depositType: 'Reference Atmospheric Monitoring Station', sourceName: 'NOAA GML', observedYear: 2024 },
      { siteName: 'Sleipner Saline Aquifer CO₂ Storage Site', country: 'Norway', region: 'Europe', latitude: 58.3686, longitude: 1.9089, verificationTier: 'verified_deposit', depositType: 'Utsira Formation Subsea CCS Reservoir', sourceName: 'Equinor / IEA', observedYear: 2024 },
      { siteName: 'Bravo Dome Natural CO₂ Reservoir, NM', country: 'United States', region: 'North America', latitude: 35.8742, longitude: -103.5244, verificationTier: 'verified_deposit', depositType: 'Natural Subsurface CO₂ Field', sourceName: 'USGS', observedYear: 2023 },
    ],
  },

  // ================= SOIL =================
  {
    slug: 'red-soil',
    name: 'Red Soil',
    category: 'Soil',
    subcategory: 'Ferric-Oxide Alfisol / Ultisol / Oxisol',
    chemicalFormula: 'SiO₂ + Al₂O₃ + Fe₂O₃ (hematite coating)',
    summary:
      'Porous, friable weathered soil characterized by reddish hue from ferric oxide (Fe₂O₃) coatings on clay and silt grains, widespread across crystalline granite-gneiss plateaus in tropical and subtropical zones.',
    physicalProperties: {
      color: 'Brick red to reddish-brown',
      phRange: '5.5–6.8 (mildly acidic to neutral)',
      texture: 'Sandy loam to clay loam, well-drained',
      density: '1.35–1.55 g/cm³ (bulk)',
    },
    formationOrigin:
      'In-situ prolonged chemical weathering of ancient crystalline metamorphic and granitic igneous bedrock under warm, seasonal monsoonal or Mediterranean climates.',
    industrialApplications: [
      'Fired clay brick manufacture and terracotta pottery',
      'Compacted earthen embankment fill in civil works',
    ],
    agriculturalApplications: [
      'Supports groundnuts, millets, pulses, tobacco, cotton, and orchard crops with balanced N-P-K and organic compost amendments',
      'Excellent internal drainage prevents root waterlogging in monsoon regions',
    ],
    environmentalImportance:
      'Supports semi-arid savanna and dry deciduous forest biomes; susceptible to sheet erosion on deforested slopes without contour bunding.',
    majorProducers: [
      { country: 'Brazil', iso3: 'BRA', sharePct: 24, unit: '% global red/oxisol extent (est.)', year: 2023, status: 'estimated', source: 'FAO SoilGrids' },
      { country: 'India', iso3: 'IND', sharePct: 18, unit: '% arable red soil belt (~18.5% land area)', year: 2023, status: 'reported', source: 'ICAR-NBSS&LUP' },
      { country: 'China', iso3: 'CHN', sharePct: 16, unit: '% South China red earth zone', year: 2023, status: 'reported', source: 'FAO Harmonized World Soil Database' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Covers ~13% of Earth’s ice-free land surface across South Asia, South America, Sub-Saharan Africa, and South China',
      renewability: 'Slowly renewable (100–500 years per cm of topsoil)',
      scarcityIndex: 31,
      reserveLifeYears: null,
      source: 'FAO Harmonized World Soil Database',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Rainfed & Irrigated Agriculture', sharePct: 78, source: 'FAO' },
      { sector: 'Natural Savanna & Forest Carbon Sink', sharePct: 17, source: 'FAO' },
      { sector: 'Terracotta Ceramics & Brickmaking', sharePct: 5, source: 'Industry Reference' },
    ],
    imageUrl: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
    imageAttribution: 'GeoAtlas Pedology Profile Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'FAO HWSD & ICAR Soil Atlas',
    sourceUrl: 'https://www.fao.org/soils-portal/data-hub/soil-maps-and-databases/harmonized-world-soil-database-v20/en/',
    lastUpdated: '2023-11-15',
    occurrences: [
      { siteName: 'Bengaluru–Mysuru Gneissic Red Soil Plateau (Karnataka)', country: 'India', region: 'South Asia', latitude: 12.9716, longitude: 77.5946, verificationTier: 'verified_deposit', depositType: 'Gneissic Alfisol Belt', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Salem–Madurai Red Loam Tract (Tamil Nadu)', country: 'India', region: 'South Asia', latitude: 11.6643, longitude: 78.146, verificationTier: 'verified_deposit', depositType: 'Ferruginous Alfisol', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Rayalaseema–Anantapur Red Earth Basin (Andhra Pradesh)', country: 'India', region: 'South Asia', latitude: 14.6819, longitude: 77.6006, verificationTier: 'verified_deposit', depositType: 'Semi-Arid Red Sandy Loam', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Ranchi–Chota Nagpur Red Soil Plateau (Jharkhand)', country: 'India', region: 'South Asia', latitude: 23.3441, longitude: 85.3096, verificationTier: 'verified_deposit', depositType: 'Granitic Red Loam', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Cerrado Red Latosol Zone, Curvelo (Minas Gerais)', country: 'Brazil', region: 'South America', latitude: -18.7564, longitude: -44.4308, verificationTier: 'verified_deposit', depositType: 'Ferric Oxisol (Latossolo Vermelho)', sourceName: 'EMBRAPA / FAO', observedYear: 2023 },
      { siteName: 'Ribeirão Preto Terra Roxa Belt (São Paulo)', country: 'Brazil', region: 'South America', latitude: -21.1704, longitude: -47.8103, verificationTier: 'verified_deposit', depositType: 'Basaltic Purple-Red Oxisol', sourceName: 'EMBRAPA', observedYear: 2023 },
      { siteName: 'Nanchang–Ganzhou Red Earth Hills (Jiangxi)', country: 'China', region: 'East Asia', latitude: 25.8318, longitude: 114.935, verificationTier: 'estimated_distribution', depositType: 'Subtropical Ultisol', sourceName: 'FAO HWSD', observedYear: 2023 },
      { siteName: 'Atlanta–Athens Piedmont Red Clay Belt (Georgia)', country: 'United States', region: 'North America', latitude: 33.9519, longitude: -83.3576, verificationTier: 'verified_deposit', depositType: 'Ultisol (Cecil Series)', sourceName: 'USDA NRCS', observedYear: 2023 },
    ],
  },
  {
    slug: 'black-soil',
    name: 'Black Soil',
    category: 'Soil',
    subcategory: 'Smectite-Rich Vertisol (Regur) & Chernozem / Mollisol',
    chemicalFormula: 'Montmorillonite clay + CaCO₃ + Humus (SOC)',
    summary:
      'Dark, moisture-retentive clay-rich soil encompassing tropical basalt-derived Vertisols (Regur / Black Cotton Soil) and temperate humus-rich Chernozems and Mollisols across Eurasia, South Asia, North & South America, Australia, and East Africa.',
    physicalProperties: {
      color: 'Deep charcoal black to dark brown',
      phRange: '6.8–8.2 (neutral to mildly alkaline)',
      texture: 'Heavy smectitic clay (30–65% clay, deep desiccation cracks)',
      density: '1.15–1.35 g/cm³ (dry bulk)',
    },
    formationOrigin:
      'Weathering of mafic continental flood basalts in semi-arid climates (Deccan & East African Vertisols) or thick steppe/prairie grassland humus accumulation atop calcareous loess plains (Chernozems and Mollisols).',
    industrialApplications: [
      'Montmorillonite and bentonite clay extraction from allied weathered basaltic profiles for drilling fluids and geotechnical liners',
      'Subgrade engineering studies for shrink-swell foundation stabilization',
    ],
    agriculturalApplications: [
      'Premier agricultural belt for cotton, soybean, winter wheat, sorghum, chickpea, sugarcane, and sunflower',
      'High cation exchange capacity (CEC) and deep moisture storage supporting rainfed cropping across dry spells',
    ],
    environmentalImportance:
      'Global black soils (Chernozems, Kastanozems, Vertisols) store ~8.2% of global soil organic carbon despite covering ~5.6–6.9% of ice-free land, making zero-tillage and residue retention vital for climate mitigation.',
    majorProducers: [
      { country: 'Russia', iso3: 'RUS', sharePct: 45, unit: '% global Chernozem/black soil extent (~327M ha)', year: 2023, status: 'reported', source: 'FAO Global Black Soils Map 2022/23' },
      { country: 'Kazakhstan', iso3: 'KAZ', sharePct: 15, unit: '% Eurasian Steppe black soil (~108M ha)', year: 2023, status: 'reported', source: 'FAO Global Black Soils Map' },
      { country: 'China', iso3: 'CHN', sharePct: 7, unit: '% Northeast Songnen-Sanjiang Mollisols (~50M ha)', year: 2023, status: 'reported', source: 'FAO / Chinese Academy of Sciences' },
      { country: 'Ukraine', iso3: 'UKR', sharePct: 5, unit: '% Pontic Chernozem steppe (~34M ha, >60% of arable land)', year: 2023, status: 'reported', source: 'FAO Global Black Soils Map' },
      { country: 'India', iso3: 'IND', sharePct: 8, unit: '% Deccan Regur Vertisol (~54.6M ha across MH, MP, GJ, KA, TG)', year: 2023, status: 'reported', source: 'ICAR-NBSS&LUP / FAO' },
      { country: 'United States', iso3: 'USA', sharePct: 7, unit: '% Midwest Mollisols & Texas Blackland Vertisols', year: 2023, status: 'reported', source: 'USDA NRCS' },
      { country: 'Argentina', iso3: 'ARG', sharePct: 5, unit: '% Humid Pampas Mollisol belt', year: 2023, status: 'reported', source: 'FAO / INTA Argentina' },
      { country: 'Australia', iso3: 'AUS', sharePct: 4, unit: '% Cracking Clay Vertosols (QLD / NSW)', year: 2023, status: 'reported', source: 'CSIRO / ASRIS' },
    ],
    availabilityMetrics: {
      globalReservesText: '~725–916 million hectares (~5.6–6.9% of Earth’s ice-free land) spanning 60+ countries',
      renewability: 'Slowly renewable; highly vulnerable to humus mineralization and sheet/gully erosion',
      scarcityIndex: 44,
      reserveLifeYears: null,
      source: 'FAO Global Status of Black Soils',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Cereals, Oilseeds & Cotton Cropping', sharePct: 86, source: 'FAO' },
      { sector: 'Terrestrial Soil Carbon Storage', sharePct: 14, source: 'FAO' },
    ],
    imageUrl: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
    imageAttribution: 'GeoAtlas Pedology Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'FAO Global Black Soils, ICAR-NBSS&LUP & USDA NRCS',
    sourceUrl: 'https://www.fao.org/global-soil-partnership/areas-of-work/black-soils/en/',
    lastUpdated: '2023-11-15',
    occurrences: [
      // India - exact places across 5 states
      { siteName: 'Akola–Amravati Vidarbha Cotton Belt (Maharashtra)', country: 'India', region: 'Maharashtra · South Asia', latitude: 20.7002, longitude: 77.0082, verificationTier: 'verified_deposit', depositType: 'Deep Basalt-Derived Vertisol (Regur)', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Nagpur–Wardha Deccan Trap Basin (Maharashtra)', country: 'India', region: 'Maharashtra · South Asia', latitude: 21.1458, longitude: 79.0882, verificationTier: 'verified_deposit', depositType: 'Type Smectitic Vertisol (ICAR Benchmark)', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Indore–Ujjain Malwa Plateau (Madhya Pradesh)', country: 'India', region: 'Madhya Pradesh · South Asia', latitude: 22.7196, longitude: 75.8577, verificationTier: 'verified_deposit', depositType: 'Deep Black Cotton Vertisol', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Rajkot–Junagadh Saurashtra Belt (Gujarat)', country: 'India', region: 'Gujarat · South Asia', latitude: 22.3039, longitude: 70.8022, verificationTier: 'verified_deposit', depositType: 'Medium-Deep Calcareous Vertisol', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Dharwad–Raichur Black Cotton Plain (Karnataka)', country: 'India', region: 'Karnataka · South Asia', latitude: 15.4589, longitude: 75.0078, verificationTier: 'verified_deposit', depositType: 'Semi-Arid Regur Vertisol', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      { siteName: 'Adilabad–Warangal Godavari Basin (Telangana)', country: 'India', region: 'Telangana · South Asia', latitude: 19.6641, longitude: 78.532, verificationTier: 'verified_deposit', depositType: 'Basaltic & Alluvial-Colluvial Vertisol', sourceName: 'ICAR-NBSS&LUP', observedYear: 2023 },
      // Ukraine - exact oblast places
      { siteName: 'Poltava Steppe Chernozem Zone (Poltava Oblast)', country: 'Ukraine', region: 'Central Ukraine · Europe', latitude: 49.5883, longitude: 34.5514, verificationTier: 'verified_deposit', depositType: 'Deep Typical Chernozem (1.0–1.5 m humus)', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      { siteName: 'Vinnytsia–Cherkasy Podolian Forest-Steppe (Vinnytsia Oblast)', country: 'Ukraine', region: 'Central-West Ukraine · Europe', latitude: 49.2331, longitude: 28.4682, verificationTier: 'verified_deposit', depositType: 'Podzolized & Typical Chernozem', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      { siteName: 'Kharkiv–Dnipro Left-Bank Steppe (Kharkiv Oblast)', country: 'Ukraine', region: 'Eastern Ukraine · Europe', latitude: 49.9935, longitude: 36.2304, verificationTier: 'verified_deposit', depositType: 'Ordinary Steppe Chernozem', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      // Russia - exact oblast/krai places
      { siteName: 'Kursk Central Chernozem Biosphere Reserve (Kursk Oblast)', country: 'Russia', region: 'Central Black Earth · Europe', latitude: 51.7304, longitude: 36.1926, verificationTier: 'verified_deposit', depositType: 'Virgin Meadow-Steppe Typical Chernozem', sourceName: 'FAO / Dokuchaev Soil Institute', observedYear: 2023 },
      { siteName: 'Voronezh–Kamennaya Steppe (Voronezh Oblast)', country: 'Russia', region: 'Central Black Earth · Europe', latitude: 51.0333, longitude: 40.7167, verificationTier: 'verified_deposit', depositType: 'Deep Leached Chernozem', sourceName: 'Dokuchaev Soil Institute', observedYear: 2023 },
      { siteName: 'Krasnodar–Kuban Alluvial-Steppe Plain (Krasnodar Krai)', country: 'Russia', region: 'North Caucasus · Europe', latitude: 45.0355, longitude: 38.9753, verificationTier: 'verified_deposit', depositType: 'Ciscaucasian Super-Thick Chernozem', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      // China - exact northeast places
      { siteName: 'Hailun–Suihua Songnen Plain (Heilongjiang)', country: 'China', region: 'Northeast China · East Asia', latitude: 47.4608, longitude: 126.9689, verificationTier: 'verified_deposit', depositType: 'Isohumosol / Mollisol Phaeozem', sourceName: 'CAS Black Soil Station', observedYear: 2023 },
      { siteName: 'Lishu–Changchun Central Black Soil Belt (Jilin)', country: 'China', region: 'Northeast China · East Asia', latitude: 43.307, longitude: 124.336, verificationTier: 'verified_deposit', depositType: 'Typical Black Earth (Phaeozem)', sourceName: 'FAO / CAS', observedYear: 2023 },
      { siteName: 'Jiamusi–Sanjiang Plain (Heilongjiang)', country: 'China', region: 'Northeast China · East Asia', latitude: 46.8, longitude: 130.32, verificationTier: 'verified_deposit', depositType: 'Meadow Black Soil & Albic Black Soil', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      // United States - exact prairie & blackland cities
      { siteName: 'Fargo–Red River Valley Lacustrine Plain (North Dakota)', country: 'United States', region: 'Northern Plains · North America', latitude: 46.8772, longitude: -96.7898, verificationTier: 'verified_deposit', depositType: 'Calcareous Aquoll / Mollisol (Fargo Clay)', sourceName: 'USDA NRCS', observedYear: 2023 },
      { siteName: 'Ames–Des Moines Lobe Prairie (Iowa)', country: 'United States', region: 'Midwest Corn Belt · North America', latitude: 42.0308, longitude: -93.6319, verificationTier: 'verified_deposit', depositType: 'Clarion–Nicollet–Webster Mollisol', sourceName: 'USDA NRCS', observedYear: 2023 },
      { siteName: 'Waco–Temple Texas Blackland Prairie (Texas)', country: 'United States', region: 'Southern Plains · North America', latitude: 31.5493, longitude: -97.1467, verificationTier: 'verified_deposit', depositType: 'Houston Black Vertisol (Texas State Soil)', sourceName: 'USDA NRCS', observedYear: 2023 },
      // Canada
      { siteName: 'Regina Heavy Clay Lacustrine Plain (Saskatchewan)', country: 'Canada', region: 'Canadian Prairies · North America', latitude: 50.4452, longitude: -104.6189, verificationTier: 'verified_deposit', depositType: 'Dark Brown / Black Chernozemic Vertisol', sourceName: 'AAFC Canada Soil Survey', observedYear: 2023 },
      { siteName: 'Portage la Prairie–Red River Plain (Manitoba)', country: 'Canada', region: 'Canadian Prairies · North America', latitude: 49.9728, longitude: -98.2926, verificationTier: 'verified_deposit', depositType: 'Black Chernozem Loam', sourceName: 'AAFC Canada Soil Survey', observedYear: 2023 },
      // Argentina
      { siteName: 'Pergamino–Rosario Pampa Ondulada (Buenos Aires / Santa Fe)', country: 'Argentina', region: 'Humid Pampas · South America', latitude: -33.89, longitude: -60.5736, verificationTier: 'verified_deposit', depositType: 'Typic Argiudoll (Pampas Mollisol)', sourceName: 'INTA Argentina / FAO', observedYear: 2023 },
      { siteName: 'Marcos Juárez Loess Plain (Córdoba)', country: 'Argentina', region: 'Humid Pampas · South America', latitude: -32.6978, longitude: -62.1067, verificationTier: 'verified_deposit', depositType: 'Chernozemic Mollisol', sourceName: 'INTA Argentina', observedYear: 2023 },
      // Kazakhstan
      { siteName: 'Kostanay–Tobol Steppe Belt (Kostanay Region)', country: 'Kazakhstan', region: 'Northern Steppe · Central Asia', latitude: 53.2144, longitude: 63.6246, verificationTier: 'verified_deposit', depositType: 'Southern Chernozem & Dark Chestnut Soil', sourceName: 'FAO Global Black Soils', observedYear: 2023 },
      // Australia
      { siteName: 'Darling Downs–Toowoomba Clay Plains (Queensland)', country: 'Australia', region: 'Eastern Plains · Oceania', latitude: -27.5598, longitude: 151.9507, verificationTier: 'verified_deposit', depositType: 'Basaltic Self-Mulching Black Vertosol', sourceName: 'CSIRO / ASRIS', observedYear: 2023 },
      { siteName: 'Liverpool Plains–Gunnedah Basin (New South Wales)', country: 'Australia', region: 'Eastern Plains · Oceania', latitude: -30.98, longitude: 150.25, verificationTier: 'verified_deposit', depositType: 'Black Cracking Clay Vertosol', sourceName: 'CSIRO / NSW DPI', observedYear: 2023 },
      // East Africa
      { siteName: 'Wad Madani–Gezira Clay Plain (Gezira State)', country: 'Sudan', region: 'Nile Basin · Africa', latitude: 14.4012, longitude: 33.5199, verificationTier: 'verified_deposit', depositType: 'Alluvial-Basaltic Smectite Vertisol', sourceName: 'FAO / ARC Sudan', observedYear: 2023 },
      { siteName: 'Bishoftu (Debre Zeit) Highland Vertisol Plain (Oromia)', country: 'Ethiopia', region: 'Ethiopian Highlands · Africa', latitude: 8.7522, longitude: 38.9785, verificationTier: 'verified_deposit', depositType: 'Pellic Highland Vertisol', sourceName: 'FAO / EIAR Ethiopia', observedYear: 2023 },
    ],
  },
  {
    slug: 'alluvial-soil',
    name: 'Alluvial Soil',
    category: 'Soil',
    subcategory: 'Fluvial Fluvisol / Entisol & Inceptisol',
    chemicalFormula: 'Quartz silt + Illite/Kaolinite + Organic silt',
    summary:
      'Young, fertile stratified soil deposited by flowing river systems along floodplains, river terraces, and coastal deltas, supporting the highest agricultural population densities on Earth.',
    physicalProperties: {
      color: 'Light ash-grey to yellowish-brown',
      phRange: '6.5–7.8 (neutral to slightly alkaline)',
      texture: 'Loam, sandy loam, and silty clay',
    },
    formationOrigin:
      'Repeated Holocene fluvial erosion, transport, and overbank flood deposition of mineral-rich mountain sediments.',
    industrialApplications: [
      'Riverbed construction sand and brick-earth clay (regulated to prevent riverbank destabilization)',
    ],
    agriculturalApplications: [
      'Supports intensive rice, wheat, maize, sugarcane, and jute cultivation across major global breadbaskets',
      'Rich in potash, phosphoric acid, and lime with favorable tilth',
    ],
    environmentalImportance:
      'Deltaic alluvial wetlands buffer coastal storm surges, recharge shallow aquifers, and sustain freshwater fisheries; upstream dams trap sediment needed to counter delta subsidence.',
    majorProducers: [
      { country: 'Indo-Gangetic Plain (India/Bangladesh/Pakistan)', iso3: 'IND', sharePct: 24, unit: '% major intensive alluvial plains', year: 2023, status: 'estimated', source: 'FAO' },
      { country: 'China (North China & Yangtze Plains)', iso3: 'CHN', sharePct: 21, unit: '% major alluvial plains', year: 2023, status: 'estimated', source: 'FAO' },
      { country: 'United States (Mississippi Alluvial Valley)', iso3: 'USA', sharePct: 12, unit: '% major alluvial plains', year: 2023, status: 'reported', source: 'USDA NRCS' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Extensive along major continental river basins (~40% of global irrigated crop output)',
      renewability: 'Naturally replenished during seasonal fluvial sedimentation',
      scarcityIndex: 25,
      reserveLifeYears: null,
      source: 'FAO Soil Portal',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Intensive Irrigated Food Grains', sharePct: 84, source: 'FAO' },
      { sector: 'Floodplain Wetlands & Aquifer Recharge', sharePct: 16, source: 'FAO' },
    ],
    imageUrl: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
    imageAttribution: 'GeoAtlas Pedology & Alluvial Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'FAO HWSD & USDA NRCS',
    sourceUrl: 'https://www.fao.org/soils-portal/en/',
    lastUpdated: '2023-11-15',
    occurrences: [
      { siteName: 'Lucknow–Kanpur Central Ganga Plain (Uttar Pradesh)', country: 'India', region: 'South Asia', latitude: 26.8467, longitude: 80.9462, verificationTier: 'verified_deposit', depositType: 'Quaternary Fluvial Alluvium (Bhangar & Khadar)', sourceName: 'ICAR', observedYear: 2023 },
      { siteName: 'Ludhiana–Amritsar Sutlej-Beas Doab (Punjab)', country: 'India', region: 'South Asia', latitude: 30.901, longitude: 75.8573, verificationTier: 'verified_deposit', depositType: 'Calcareous Indo-Gangetic Alluvium', sourceName: 'ICAR', observedYear: 2023 },
      { siteName: 'Tanta–Mansoura Nile River Delta (Dakahlia)', country: 'Egypt', region: 'Africa', latitude: 30.8025, longitude: 31.0004, verificationTier: 'verified_deposit', depositType: 'Holocene Deltaic Fluvisol', sourceName: 'FAO', observedYear: 2023 },
      { siteName: 'Clarksdale–Greenville Mississippi Delta (Mississippi)', country: 'United States', region: 'North America', latitude: 34.2001, longitude: -90.5709, verificationTier: 'verified_deposit', depositType: 'Fluvial Floodplain Alluvium', sourceName: 'USDA NRCS', observedYear: 2023 },
      { siteName: 'Cần Thơ–Mekong River Delta (Mekong Basin)', country: 'Vietnam', region: 'Southeast Asia', latitude: 10.0452, longitude: 105.7469, verificationTier: 'verified_deposit', depositType: 'Estuarine & Fluvial Alluvial Fluvisol', sourceName: 'FAO', observedYear: 2023 },
      { siteName: 'Zhengzhou–Kaifeng North China Alluvial Plain (Henan)', country: 'China', region: 'East Asia', latitude: 34.7466, longitude: 113.6253, verificationTier: 'verified_deposit', depositType: 'Yellow River Fluvial Alluvium', sourceName: 'FAO', observedYear: 2023 },
    ],
  },
  {
    slug: 'laterite-soil',
    name: 'Laterite Soil',
    category: 'Soil',
    subcategory: 'Leached Iron-Aluminum Duricrust (Plinthosol / Oxisol)',
    chemicalFormula: 'Fe₂O₃ + Al₂O₃·nH₂O + Kaolinite',
    summary:
      'Deeply weathered tropical soil enriched in insoluble iron and aluminum hydroxides after intense monsoon leaching of silica and soluble bases; hardens irreversibly into brick-like duricrust when exposed.',
    physicalProperties: {
      color: 'Rusty brick-red to ochre',
      phRange: '4.5–5.8 (acidic, low base saturation)',
      texture: 'Vesicular porous gravel to clay',
    },
    formationOrigin:
      'Intense alternating wet-and-dry tropical weathering (laterization) that leaches silica, calcium, and potassium downward, concentrating Fe and Al oxides.',
    industrialApplications: [
      'Quarried laterite masonry blocks in tropical architecture',
      'Supergene residual source of bauxite (aluminum ore) and lateritic nickel-cobalt ores',
    ],
    agriculturalApplications: [
      'Supports tea, coffee, cashew, rubber, and coconut plantations with lime and organic manure management',
    ],
    environmentalImportance:
      'Caprock laterites regulate tropical plateau hydrology; bauxite and nickel-laterite strip mining requires strict overburden rehabilitation.',
    majorProducers: [
      { country: 'Australia / Guinea (Bauxite Laterite)', iso3: 'GIN', sharePct: 26, unit: '% global bauxite laterite reserves', year: 2023, status: 'reported', source: 'USGS Bauxite MCS' },
      { country: 'Indonesia (Nickel Laterite)', iso3: 'IDN', sharePct: 48, unit: '% global Ni-laterite output', year: 2023, status: 'reported', source: 'USGS Nickel MCS' },
      { country: 'India (Western Ghats Laterite)', iso3: 'IND', sharePct: 12, unit: '% agricultural & masonry laterite', year: 2023, status: 'reported', source: 'ICAR' },
    ],
    availabilityMetrics: {
      globalReservesText: 'Widespread across humid tropical zones between 30°N and 30°S',
      renewability: 'Non-renewable on human timescales',
      scarcityIndex: 24,
      reserveLifeYears: null,
      source: 'FAO Soil Portal & USGS',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Plantation Agriculture & Agroforestry', sharePct: 62, source: 'FAO' },
      { sector: 'Bauxite & Nickel Laterite Ore Extraction', sharePct: 24, source: 'USGS' },
      { sector: 'Laterite Masonry Building Blocks', sharePct: 14, source: 'Regional Construction' },
    ],
    imageUrl: '/src/assets/images/category_soil_horizons_1795022582821.jpg',
    imageAttribution: 'GeoAtlas Pedology Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'FAO HWSD & USGS Laterite Studies',
    sourceUrl: 'https://www.fao.org/soils-portal/en/',
    lastUpdated: '2023-11-15',
    occurrences: [
      { siteName: 'Angadipuram–Malappuram Type Laterite Locality (Kerala)', country: 'India', region: 'South Asia', latitude: 10.9794, longitude: 76.2028, verificationTier: 'verified_deposit', depositType: 'Buchanan 1807 Type Ferricrete Laterite', sourceName: 'GSI / ICAR', observedYear: 2023 },
      { siteName: 'Ratnagiri–Sindhudurg Konkan Laterite Plateau (Maharashtra)', country: 'India', region: 'South Asia', latitude: 16.9902, longitude: 73.312, verificationTier: 'verified_deposit', depositType: 'Coastal Laterite Duricrust', sourceName: 'ICAR', observedYear: 2023 },
      { siteName: 'Sangaredi–Boké Bauxite Laterite Plateau (Boké Region)', country: 'Guinea', region: 'West Africa', latitude: 11.0875, longitude: -13.7972, verificationTier: 'verified_deposit', depositType: 'Aluminous Laterite (Bauxite)', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Morowali Nickel Laterite Belt (Central Sulawesi)', country: 'Indonesia', region: 'Southeast Asia', latitude: -2.8114, longitude: 122.1447, verificationTier: 'verified_deposit', depositType: 'Ultramafic Ni-Co Laterite', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Weipa–Cape York Bauxite Laterite Plateau (Queensland)', country: 'Australia', region: 'Oceania', latitude: -12.6333, longitude: 141.8833, verificationTier: 'verified_deposit', depositType: 'Pisolitic Bauxite Laterite', sourceName: 'Geoscience Australia', observedYear: 2023 },
    ],
  },

  // ================= WATER RESOURCES =================
  {
    slug: 'rivers',
    name: 'Rivers',
    category: 'Water Resources',
    subcategory: 'Renewable Continental Lotic Freshwater Systems',
    chemicalFormula: 'H₂O (dissolved Ca²⁺, HCO₃⁻, SiO₂)',
    summary:
      'Dynamic flowing freshwater corridors draining continental watersheds, supplying ~60% of global human surface water withdrawals, hydropower generation, and fluvial sediment transport.',
    physicalProperties: {
      density: '1.000 g/cm³ (at 4 °C)',
      stateAtSTP: 'Liquid freshwater (<0.5 ppt salinity)',
      phRange: '6.5–8.5 (typical natural rivers)',
    },
    formationOrigin:
      'Precipitation runoff, snowpack/glacial meltwater, and groundwater baseflow converging along topographically incised drainage basins.',
    industrialApplications: [
      'Hydroelectric power generation (~15% of global electricity)',
      'Industrial cooling water, inland barge logistics, and municipal drinking treatment',
    ],
    agriculturalApplications: [
      'Canal and gravity-fed irrigation systems watering ~275 million hectares of global cropland',
    ],
    environmentalImportance:
      'Sustain riparian biodiversity, estuarine nutrient cycles, and delta ecosystems; vulnerable to dams, thermal pollution, and glacial retreat.',
    majorProducers: [
      { country: 'Amazon Basin (Brazil/Peru)', iso3: 'BRA', annualOutput: 209000, unit: 'm³/s mean discharge', year: 2023, status: 'verified', source: 'GRDC / ANA Brazil' },
      { country: 'Congo Basin (DR Congo)', iso3: 'COD', annualOutput: 41200, unit: 'm³/s mean discharge', year: 2023, status: 'verified', source: 'GRDC' },
      { country: 'Ganges-Brahmaputra-Meghna', iso3: 'BGD', annualOutput: 38100, unit: 'm³/s mean discharge', year: 2023, status: 'verified', source: 'GRDC / FAO AQUASTAT' },
      { country: 'Yangtze Basin (China)', iso3: 'CHN', annualOutput: 30146, unit: 'm³/s mean discharge', year: 2023, status: 'verified', source: 'GRDC' },
    ],
    availabilityMetrics: {
      globalReservesText: '~2,120 km³ instantaneous channel volume; ~42,000 km³/yr total renewable runoff',
      renewability: 'Annually renewable via hydrological cycle',
      scarcityIndex: 47,
      reserveLifeYears: null,
      source: 'UNESCO WWAP & FAO AQUASTAT',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Agricultural Irrigation', sharePct: 70, source: 'FAO AQUASTAT' },
      { sector: 'Industry, Cooling & Hydropower', sharePct: 19, source: 'FAO AQUASTAT' },
      { sector: 'Municipal & Domestic Supply', sharePct: 11, source: 'FAO AQUASTAT' },
    ],
    imageUrl: '/src/assets/images/category_water_resources_1795022583595.jpg',
    imageAttribution: 'GeoAtlas Hydrological Basin Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'GRDC & FAO AQUASTAT',
    sourceUrl: 'https://www.fao.org/aquastat/en/',
    lastUpdated: '2024-03-01',
    occurrences: [
      { siteName: 'Amazon River Mainstem (Óbidos Gauge)', country: 'Brazil', region: 'South America', latitude: -1.9189, longitude: -55.5142, verificationTier: 'verified_deposit', depositType: 'Tropical Mega-Watershed', sourceName: 'GRDC / ANA', observedYear: 2023 },
      { siteName: 'Ganges-Brahmaputra Confluence (Goalundo)', country: 'Bangladesh', region: 'South Asia', latitude: 23.8067, longitude: 89.7764, verificationTier: 'verified_deposit', depositType: 'Himalayan Glacio-Monsoon River', sourceName: 'GRDC', observedYear: 2023 },
      { siteName: 'Nile River (Aswan Gauge)', country: 'Egypt', region: 'Africa', latitude: 23.9706, longitude: 32.8772, verificationTier: 'verified_deposit', depositType: 'Transboundary Perennial River', sourceName: 'FAO AQUASTAT', observedYear: 2023 },
      { siteName: 'Mississippi River (Vicksburg Gauge)', country: 'United States', region: 'North America', latitude: 32.3156, longitude: -90.9056, verificationTier: 'verified_deposit', depositType: 'Continental Drainage Basin', sourceName: 'USGS NWIS', observedYear: 2024 },
    ],
  },
  {
    slug: 'lakes',
    name: 'Lakes',
    category: 'Water Resources',
    subcategory: 'Lentic Continental Surface Reservoirs',
    chemicalFormula: 'H₂O (freshwater to saline brines)',
    summary:
      'Inland surface water basins storing ~87% of Earth’s liquid surface freshwater, including tectonic rift lakes (Baikal, Tanganyika), glacial basins (Laurentian Great Lakes), and lithium-rich Andean salars.',
    physicalProperties: {
      density: '1.000–1.240 g/cm³ (fresh to hypersaline brine)',
      stateAtSTP: 'Liquid surface basin',
      phRange: '6.0–9.5 (freshwater to soda lakes)',
    },
    formationOrigin:
      'Glacial scouring (Great Lakes), continental tectonic rifting (Baikal, East African Rift), volcanic calderas, and endorheic tectonic basins.',
    industrialApplications: [
      'Municipal freshwater supply and Great Lakes bulk maritime shipping',
      'Endorheic salt-lake brine extraction of lithium, potash, and boron (Salar de Atacama, Dead Sea)',
    ],
    agriculturalApplications: [
      'Supplemental irrigation reservoirs and inland freshwater aquaculture',
    ],
    environmentalImportance:
      'Lake Baikal alone holds ~20% of unfrozen surface freshwater; warming water temperatures and nutrient eutrophication threaten dissolved oxygen stability.',
    majorProducers: [
      { country: 'Russia (Lake Baikal)', iso3: 'RUS', annualOutput: 23615, unit: 'km³ stored volume', year: 2023, status: 'verified', source: 'UNESCO / HydroSHEDS' },
      { country: 'USA & Canada (Great Lakes)', iso3: 'CAN', annualOutput: 22671, unit: 'km³ stored volume', year: 2023, status: 'verified', source: 'NOAA GLERL' },
      { country: 'East Africa (Lake Tanganyika)', iso3: 'TZA', annualOutput: 18900, unit: 'km³ stored volume', year: 2023, status: 'verified', source: 'HydroLAKES' },
    ],
    availabilityMetrics: {
      globalReservesText: '~176,400 km³ total global lake volume (~91,000 km³ freshwater + ~85,400 km³ saline)',
      renewability: 'Renewable (residence times vary from 1 year to >300 years in Baikal)',
      scarcityIndex: 39,
      reserveLifeYears: null,
      source: 'HydroLAKES & UNESCO',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Ecosystem Habitat & Thermal Buffering', sharePct: 48, source: 'UNEP' },
      { sector: 'Municipal Water & Navigation', sharePct: 31, source: 'NOAA' },
      { sector: 'Irrigation & Brine Mineral Recovery', sharePct: 21, source: 'USGS / FAO' },
    ],
    imageUrl: '/src/assets/images/category_water_resources_1795022583595.jpg',
    imageAttribution: 'GeoAtlas Limnology Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'HydroLAKES & NOAA GLERL',
    sourceUrl: 'https://www.hydrosheds.org/products/hydrolakes',
    lastUpdated: '2024-03-01',
    occurrences: [
      { siteName: 'Lake Baikal Tectonic Rift Basin', country: 'Russia', region: 'North Asia', latitude: 53.5587, longitude: 108.165, verificationTier: 'verified_deposit', depositType: 'Deepest Freshwater Rift Lake (1,642 m)', sourceName: 'UNESCO', observedYear: 2023 },
      { siteName: 'Lake Superior (Laurentian Great Lakes)', country: 'United States / Canada', region: 'North America', latitude: 47.7231, longitude: -87.5305, verificationTier: 'verified_deposit', depositType: 'Glacial Tectonic Freshwater Lake', sourceName: 'NOAA GLERL', observedYear: 2024 },
      { siteName: 'Lake Tanganyika Rift Basin', country: 'Tanzania / DR Congo', region: 'Africa', latitude: -6.25, longitude: 29.55, verificationTier: 'verified_deposit', depositType: 'East African Rift Freshwater Lake', sourceName: 'HydroLAKES', observedYear: 2023 },
    ],
  },
  {
    slug: 'groundwater',
    name: 'Groundwater',
    category: 'Water Resources',
    subcategory: 'Subsurface Phreatic & Confined Aquifers',
    chemicalFormula: 'H₂O (mineralized TDS 50–1,000 mg/L)',
    summary:
      'Water saturating subsurface pore spaces and rock fractures within aquifers, representing ~99% of all liquid freshwater on Earth and supplying drinking water to over 2 billion people.',
    physicalProperties: {
      density: '1.000–1.002 g/cm³',
      stateAtSTP: 'Subsurface liquid porewater',
      phRange: '6.0–8.5 (controlled by host lithology)',
    },
    formationOrigin:
      'Infiltration of rain and snowmelt through unsaturated vadose zones into permeable sandstone, limestone karst, and unconsolidated alluvial gravel aquifers.',
    industrialApplications: [
      'Potable municipal water supply, beverage bottling, and semiconductor ultrapure water feed',
      'Geothermal heat-pump exchange systems',
    ],
    agriculturalApplications: [
      'Supplies ~40% of global irrigated food production via tube wells and center-pivot systems',
    ],
    environmentalImportance:
      'Sustains river baseflow and wetlands during droughts; over-extraction in fossil aquifers (Ogallala, North China Plain, NW India) causes land subsidence and saltwater intrusion.',
    majorProducers: [
      { country: 'India', iso3: 'IND', annualOutput: 251, unit: 'km³/yr groundwater withdrawal', year: 2023, status: 'reported', source: 'CGWB / UNESCO WWDR' },
      { country: 'China', iso3: 'CHN', annualOutput: 112, unit: 'km³/yr groundwater withdrawal', year: 2023, status: 'reported', source: 'UNESCO WWDR' },
      { country: 'United States', iso3: 'USA', annualOutput: 111, unit: 'km³/yr groundwater withdrawal', year: 2023, status: 'reported', source: 'USGS Water Use' },
      { country: 'Pakistan', iso3: 'PAK', annualOutput: 65, unit: 'km³/yr groundwater withdrawal', year: 2023, status: 'estimated', source: 'FAO AQUASTAT' },
    ],
    availabilityMetrics: {
      globalReservesText: '~23.4 million km³ total crustal groundwater (~10.5 million km³ fresh, largely deep fossil)',
      renewability: 'Partially renewable (shallow aquifers recharge annually; fossil aquifers non-renewable)',
      scarcityIndex: 66,
      reserveLifeYears: null,
      source: 'UNESCO World Water Development Report',
      year: 2024,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Agricultural Irrigation', sharePct: 69, source: 'UNESCO WWDR' },
      { sector: 'Municipal & Rural Drinking Water', sharePct: 22, source: 'UNESCO WWDR' },
      { sector: 'Industrial & Mining Processes', sharePct: 9, source: 'UNESCO WWDR' },
    ],
    imageUrl: '/src/assets/images/category_water_resources_1795022583595.jpg',
    imageAttribution: 'GeoAtlas Hydrogeology Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'UNESCO WWDR & USGS Groundwater',
    sourceUrl: 'https://www.unesco.org/reports/wwdr/2022/en/groundwater',
    lastUpdated: '2024-03-01',
    occurrences: [
      { siteName: 'Ogallala (High Plains) Aquifer', country: 'United States', region: 'North America', latitude: 36.75, longitude: -101.25, verificationTier: 'verified_deposit', depositType: 'Unconfined Alluvial Fossil/Semi-Renewable Aquifer', sourceName: 'USGS', observedYear: 2023 },
      { siteName: 'Great Artesian Basin', country: 'Australia', region: 'Oceania', latitude: -24.5, longitude: 141.0, verificationTier: 'verified_deposit', depositType: 'Confined Mesozoic Sandstone Aquifer', sourceName: 'Geoscience Australia', observedYear: 2023 },
      { siteName: 'Nubian Sandstone Aquifer System', country: 'Egypt / Libya / Sudan', region: 'Africa', latitude: 22.8, longitude: 26.5, verificationTier: 'verified_deposit', depositType: 'Transboundary Fossil Aquifer', sourceName: 'IGRAC / UNESCO', observedYear: 2023 },
      { siteName: 'Indo-Gangetic Basin Aquifer System', country: 'India', region: 'South Asia', latitude: 28.98, longitude: 77.7, verificationTier: 'verified_deposit', depositType: 'Thick Quaternary Alluvial Aquifer', sourceName: 'CGWB India', observedYear: 2023 },
    ],
  },

  // ================= ENERGY RESOURCES =================
  {
    slug: 'coal',
    name: 'Coal',
    category: 'Energy Resources',
    subcategory: 'Carbonaceous Sedimentary Fossil Fuel',
    chemicalFormula: 'C (60–95% wt) + H + O + N + S',
    summary:
      'Combustible black or brownish-black sedimentary rock formed from compressed Carboniferous and Permian peatlands, classified by thermal maturity into lignite, sub-bituminous, bituminous, and anthracite.',
    physicalProperties: {
      hardness: '0.5–2.5 Mohs (anthracite up to 3.0)',
      density: '1.1–1.5 g/cm³',
      color: 'Dull brown-black to lustrous jet black',
      calorificValue: '15–33 MJ/kg',
    },
    formationOrigin:
      'Accumulation of terrestrial vascular plant biomass in anoxic peat swamps followed by burial diagenesis and geothermal coalification over millions of years.',
    industrialApplications: [
      'Thermal baseload electricity generation',
      'Metallurgical coking coal for blast-furnace primary steelmaking',
      'Cement kiln heat and coal-to-chemicals synthesis',
    ],
    agriculturalApplications: [
      'Leonardite (oxidized lignite) yields humic acids used as soil organic conditioners',
    ],
    environmentalImportance:
      'Highest carbon intensity among major fossil fuels (~95–105 g CO₂/MJ); combustion also releases SO₂, NOₓ, mercury, and PM2.5 unless scrubbed.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', annualOutput: 4710, unit: 'million metric tons', year: 2023, status: 'reported', source: 'Energy Institute Statistical Review 2024' },
      { country: 'India', iso3: 'IND', annualOutput: 1011, unit: 'million metric tons', year: 2023, status: 'reported', source: 'Energy Institute / Ministry of Coal' },
      { country: 'Indonesia', iso3: 'IDN', annualOutput: 775, unit: 'million metric tons', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
      { country: 'United States', iso3: 'USA', annualOutput: 526, unit: 'million metric tons', year: 2023, status: 'reported', source: 'US EIA' },
      { country: 'Australia', iso3: 'AUS', annualOutput: 456, unit: 'million metric tons', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~1,074 billion metric tons proved recoverable global reserves',
      renewability: 'Non-renewable fossil resource',
      scarcityIndex: 29,
      reserveLifeYears: 132,
      unit: 'million metric tons',
      source: 'Energy Institute Statistical Review 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 77.9, unit: 'USD / metric ton (Australian thermal)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 60.8, unit: 'USD / metric ton (Australian thermal)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 138.1, unit: 'USD / metric ton (Australian thermal)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 344.9, unit: 'USD / metric ton (Australian thermal)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 172.8, unit: 'USD / metric ton (Australian thermal)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Thermal Electricity & District Heat', sharePct: 68, source: 'IEA Coal Report' },
      { sector: 'Metallurgical Steel & Ironmaking', sharePct: 16, source: 'IEA' },
      { sector: 'Cement, Chemicals & Industrial Boilers', sharePct: 16, source: 'IEA' },
    ],
    imageUrl: '/src/assets/images/category_energy_resources_1795022584749.jpg',
    imageAttribution: 'GeoAtlas Sedimentary Energy Basin Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'Energy Institute & World Bank Pink Sheet',
    sourceUrl: 'https://www.energyinst.org/statistical-review',
    lastUpdated: '2024-06-20',
    occurrences: [
      { siteName: 'Powder River Basin, Wyoming', country: 'United States', region: 'North America', latitude: 44.2911, longitude: -105.5022, verificationTier: 'verified_deposit', depositType: 'Sub-Bituminous Coal Basin', sourceName: 'USGS / EIA', observedYear: 2023 },
      { siteName: 'Bowen Basin Metallurgical Coal Belt, QLD', country: 'Australia', region: 'Oceania', latitude: -22.2483, longitude: 148.2036, verificationTier: 'verified_deposit', depositType: 'Permian Bituminous Coal', sourceName: 'Geoscience Australia', observedYear: 2023 },
      { siteName: 'Jharia-Raniganj Coalfield, Jharkhand', country: 'India', region: 'South Asia', latitude: 23.7433, longitude: 86.4125, verificationTier: 'verified_deposit', depositType: 'Gondwana Bituminous Coalfield', sourceName: 'CMPDI / GSI', observedYear: 2023 },
      { siteName: 'Ordos Basin Coalfield, Inner Mongolia', country: 'China', region: 'East Asia', latitude: 39.6083, longitude: 109.7814, verificationTier: 'verified_deposit', depositType: 'Jurassic-Permian Coal Basin', sourceName: 'IEA', observedYear: 2023 },
    ],
  },
  {
    slug: 'petroleum',
    name: 'Petroleum',
    category: 'Energy Resources',
    subcategory: 'Liquid Crude Hydrocarbon Resource',
    chemicalFormula: 'CₙH₂ₙ₊₂ / Cycloalkanes / Aromatics',
    summary:
      'Complex liquid mixture of hydrocarbons trapped in porous sedimentary reservoirs, refined into transport fuels, lubricants, and essential petrochemical feedstocks for plastics and pharmaceuticals.',
    physicalProperties: {
      density: '0.78–0.97 g/cm³ (API gravity 10°–50°)',
      color: 'Amber-green to viscous black',
      stateAtSTP: 'Liquid',
      calorificValue: '42–45 MJ/kg',
    },
    formationOrigin:
      'Thermal maturation of marine planktonic kerogen in anoxic source shales (60–150 °C oil window) followed by upward migration into sealed anticline or stratigraphic traps.',
    industrialApplications: [
      'Refined transport fuels: aviation jet fuel, diesel, and gasoline',
      'Petrochemical ethylene/propylene feedstocks for medical plastics, synthetic fibers, and pharmaceuticals',
      'Asphalt road paving and industrial lubricants',
    ],
    agriculturalApplications: [
      'Mechanized tractor diesel fuel and synthetic crop protection intermediates',
    ],
    environmentalImportance:
      'Major contributor to global energy CO₂ emissions and marine oil-spill hazards; petrochemical circularity and transport electrification aim to curb primary crude demand.',
    majorProducers: [
      { country: 'United States', iso3: 'USA', annualOutput: 19.3, unit: 'million barrels/day (total liquids)', year: 2023, status: 'reported', source: 'Energy Institute / EIA 2024' },
      { country: 'Saudi Arabia', iso3: 'SAU', annualOutput: 11.1, unit: 'million barrels/day', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
      { country: 'Russia', iso3: 'RUS', annualOutput: 11.0, unit: 'million barrels/day', year: 2023, status: 'estimated', source: 'Energy Institute 2024' },
      { country: 'Canada', iso3: 'CAN', annualOutput: 5.7, unit: 'million barrels/day', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
      { country: 'Iraq', iso3: 'IRQ', annualOutput: 4.3, unit: 'million barrels/day', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~1.73 trillion barrels proved global oil reserves',
      renewability: 'Non-renewable fossil resource',
      scarcityIndex: 49,
      reserveLifeYears: 53,
      unit: 'million barrels/day',
      source: 'Energy Institute Statistical Review 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 64.0, unit: 'USD / barrel (Brent annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 42.3, unit: 'USD / barrel (Brent annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 70.4, unit: 'USD / barrel (Brent annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 99.8, unit: 'USD / barrel (Brent annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 82.6, unit: 'USD / barrel (Brent annual avg)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Road, Maritime & Aviation Transport', sharePct: 60, source: 'IEA Oil Market Report' },
      { sector: 'Petrochemicals & Plastics Feedstock', sharePct: 16, source: 'IEA' },
      { sector: 'Industry, Power & Heating', sharePct: 24, source: 'IEA' },
    ],
    imageUrl: '/src/assets/images/category_energy_resources_1795022584749.jpg',
    imageAttribution: 'GeoAtlas Petroleum Geology Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'Energy Institute, US EIA & World Bank',
    sourceUrl: 'https://www.eia.gov/international/data/world',
    lastUpdated: '2024-06-20',
    occurrences: [
      { siteName: 'Ghawar Conventional Oil Field', country: 'Saudi Arabia', region: 'West Asia', latitude: 25.4306, longitude: 49.6228, verificationTier: 'verified_deposit', depositType: 'Jurassic Carbonate Anticline', sourceName: 'USGS World Petroleum Assessment', observedYear: 2023 },
      { siteName: 'Permian Basin Tight Oil & Conventional', country: 'United States', region: 'North America', latitude: 31.8457, longitude: -102.3676, verificationTier: 'verified_deposit', depositType: 'Paleozoic Shale & Carbonate Basin', sourceName: 'US EIA', observedYear: 2024 },
      { siteName: 'Athabasca Bitumen Oil Sands', country: 'Canada', region: 'North America', latitude: 57.0333, longitude: -111.5833, verificationTier: 'verified_deposit', depositType: 'Cretaceous Heavy Bitumen Sandstone', sourceName: 'Alberta Energy Regulator', observedYear: 2023 },
      { siteName: 'Orinoco Heavy Oil Belt', country: 'Venezuela', region: 'South America', latitude: 8.5, longitude: -64.5, verificationTier: 'verified_deposit', depositType: 'Extra-Heavy Oil Sandstone', sourceName: 'USGS', observedYear: 2023 },
    ],
  },
  {
    slug: 'natural-gas',
    name: 'Natural Gas',
    category: 'Energy Resources',
    subcategory: 'Gaseous Hydrocarbon Resource (Methane)',
    chemicalFormula: 'CH₄ (70–95%) + C₂H₆ + C₃H₈',
    summary:
      'Naturally occurring subsurface hydrocarbon gas mixture dominated by methane, occurring in conventional reservoirs, tight shales, and coalbed formations.',
    physicalProperties: {
      density: '0.68–0.75 kg/m³ (STP)',
      color: 'Colorless gas',
      stateAtSTP: 'Gas',
      calorificValue: '37–40 MJ/m³ (~50–55 MJ/kg)',
    },
    formationOrigin:
      'Thermogenic cracking of deep organic kerogen (>150 °C gas window) or shallow microbial methanogenesis in anoxic sediments.',
    industrialApplications: [
      'Combined-cycle gas turbine (CCGT) dispatchable power and industrial process heat',
      'Steam methane reforming (SMR) for hydrogen, ammonia fertilizer, and methanol production',
      'Liquefied Natural Gas (LNG) maritime energy trade and residential heating',
    ],
    agriculturalApplications: [
      'Primary feedstock and fuel for nitrogenous ammonia and urea fertilizer production',
    ],
    environmentalImportance:
      'Emits ~45–50% less CO₂ per MWh than coal upon combustion, but fugitive methane (CH₄) leaks carry ~28–80× the 100/20-year global warming potential of CO₂.',
    majorProducers: [
      { country: 'United States', iso3: 'USA', annualOutput: 1035, unit: 'billion cubic meters (bcm)', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
      { country: 'Russia', iso3: 'RUS', annualOutput: 586, unit: 'billion cubic meters (bcm)', year: 2023, status: 'estimated', source: 'Energy Institute 2024' },
      { country: 'Iran', iso3: 'IRN', annualOutput: 252, unit: 'billion cubic meters (bcm)', year: 2023, status: 'estimated', source: 'Energy Institute 2024' },
      { country: 'China', iso3: 'CHN', annualOutput: 234, unit: 'billion cubic meters (bcm)', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
      { country: 'Qatar', iso3: 'QAT', annualOutput: 181, unit: 'billion cubic meters (bcm)', year: 2023, status: 'reported', source: 'Energy Institute 2024' },
    ],
    availabilityMetrics: {
      globalReservesText: '~188 trillion cubic meters proved conventional gas reserves',
      renewability: 'Non-renewable fossil resource (biomethane renewable analog)',
      scarcityIndex: 43,
      reserveLifeYears: 49,
      unit: 'billion cubic meters',
      source: 'Energy Institute Statistical Review 2024',
      year: 2024,
    },
    historicalPrices: [
      { year: 2019, price: 2.57, unit: 'USD / MMBtu (US Henry Hub avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 2.01, unit: 'USD / MMBtu (US Henry Hub avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 3.85, unit: 'USD / MMBtu (US Henry Hub avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 6.37, unit: 'USD / MMBtu (US Henry Hub avg)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 2.54, unit: 'USD / MMBtu (US Henry Hub avg)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Electric Power Generation', sharePct: 39, source: 'IEA Gas Market Report' },
      { sector: 'Industrial Heat & Ammonia/Chemicals', sharePct: 34, source: 'IEA' },
      { sector: 'Residential & Commercial Heating', sharePct: 27, source: 'IEA' },
    ],
    imageUrl: '/src/assets/images/category_energy_resources_1795022584749.jpg',
    imageAttribution: 'GeoAtlas Hydrocarbon Basin Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'Energy Institute & World Bank',
    sourceUrl: 'https://www.energyinst.org/statistical-review',
    lastUpdated: '2024-06-20',
    occurrences: [
      { siteName: 'South Pars / North Dome Gas-Condensate Field', country: 'Qatar / Iran', region: 'West Asia', latitude: 26.25, longitude: 52.15, verificationTier: 'verified_deposit', depositType: 'Permian-Triassic Khuff Carbonate Reservoir', sourceName: 'USGS / IEA', observedYear: 2023 },
      { siteName: 'Marcellus Shale Gas Play, Pennsylvania', country: 'United States', region: 'North America', latitude: 41.2033, longitude: -77.1945, verificationTier: 'verified_deposit', depositType: 'Devonian Unconventional Shale Gas', sourceName: 'US EIA', observedYear: 2024 },
      { siteName: 'Troll Gas Field (North Sea)', country: 'Norway', region: 'Europe', latitude: 60.6458, longitude: 3.7267, verificationTier: 'verified_deposit', depositType: 'Offshore Jurassic Sandstone', sourceName: 'Norwegian Offshore Directorate', observedYear: 2023 },
    ],
  },

  // ================= FOREST RESOURCES =================
  {
    slug: 'timber',
    name: 'Timber',
    category: 'Forest Resources',
    subcategory: 'Structural Hardwood & Softwood Lignocellulose',
    chemicalFormula: 'Cellulose (C₆H₁₀O₅)ₙ + Lignin + Hemicellulose',
    summary:
      'Renewable lignocellulosic structural biomass harvested from boreal, temperate, and tropical forests for mass timber architecture, paper pulp, and furniture.',
    physicalProperties: {
      density: '0.40–0.95 g/cm³ (species dependent)',
      color: 'Pale pine cream to deep mahogany brown',
      calorificValue: '18–20 MJ/kg (oven-dry)',
    },
    formationOrigin:
      'Biological carbon fixation via photosynthesis producing secondary xylem tissue across managed silvicultural plantations and natural forest biomes.',
    industrialApplications: [
      'Cross-laminated timber (CLT) and structural lumber for low-carbon construction',
      'Dissolving pulp, packaging paperboard, and sustainable textiles (lyocell/viscose)',
      'Furniture, railway sleepers, and bioenergy wood pellets',
    ],
    agriculturalApplications: [
      'Agroforestry windbreaks, orchard stakes, and composted woodchip mulch',
    ],
    environmentalImportance:
      'Living forests sequester ~2.6 billion tonnes of CO₂ annually; FSC/PEFC certified sustainable forestry prevents primary rainforest deforestation and biodiversity loss.',
    majorProducers: [
      { country: 'United States', iso3: 'USA', annualOutput: 396, unit: 'million m³ industrial roundwood', year: 2022, status: 'reported', source: 'FAOSTAT Forestry' },
      { country: 'China', iso3: 'CHN', annualOutput: 190, unit: 'million m³ industrial roundwood', year: 2022, status: 'reported', source: 'FAOSTAT Forestry' },
      { country: 'Brazil', iso3: 'BRA', annualOutput: 162, unit: 'million m³ industrial roundwood', year: 2022, status: 'reported', source: 'FAOSTAT Forestry' },
      { country: 'Canada', iso3: 'CAN', annualOutput: 138, unit: 'million m³ industrial roundwood', year: 2022, status: 'reported', source: 'FAOSTAT Forestry' },
    ],
    availabilityMetrics: {
      globalReservesText: '~4.06 billion hectares global forest area (~31% of Earth’s land area)',
      renewability: 'Renewable when managed under sustained-yield silviculture',
      scarcityIndex: 35,
      reserveLifeYears: null,
      unit: 'million m³',
      source: 'FAO Global Forest Resources Assessment',
      year: 2023,
    },
    historicalPrices: [
      { year: 2019, price: 294, unit: 'USD / m³ (sawnwood softwood index)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2020, price: 329, unit: 'USD / m³ (sawnwood softwood index)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2021, price: 455, unit: 'USD / m³ (sawnwood softwood index)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2022, price: 378, unit: 'USD / m³ (sawnwood softwood index)', source: 'World Bank Pink Sheet', status: 'verified' },
      { year: 2023, price: 304, unit: 'USD / m³ (sawnwood softwood index)', source: 'World Bank Pink Sheet', status: 'verified' },
    ],
    applicationBreakdown: [
      { sector: 'Construction Sawnwood & Mass Timber', sharePct: 48, source: 'FAOSTAT' },
      { sector: 'Pulp, Paper & Packaging', sharePct: 33, source: 'FAOSTAT' },
      { sector: 'Wood Panels, Furniture & Bioenergy', sharePct: 19, source: 'FAOSTAT' },
    ],
    imageUrl: '/src/assets/images/category_forest_resources_1795022583901.jpg',
    imageAttribution: 'GeoAtlas Forestry & Canopy Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'FAOSTAT & Global Forest Watch',
    sourceUrl: 'https://www.fao.org/forestry/statistics/en/',
    lastUpdated: '2024-02-15',
    occurrences: [
      { siteName: 'Boreal Taiga Conifer Belt, British Columbia', country: 'Canada', region: 'North America', latitude: 53.7267, longitude: -127.6476, verificationTier: 'verified_deposit', depositType: 'Temperate/Boreal Conifer Forest', sourceName: 'NRCan / FAO', observedYear: 2023 },
      { siteName: 'Fennoscandian Managed Pine-Spruce Belt', country: 'Finland / Sweden', region: 'Europe', latitude: 63.8258, longitude: 20.263, verificationTier: 'verified_deposit', depositType: 'Sustained-Yield Boreal Timber', sourceName: 'Luke Finland', observedYear: 2023 },
      { siteName: 'Mato Grosso Eucalyptus-Teak Forestry Zone', country: 'Brazil', region: 'South America', latitude: -12.6819, longitude: -55.8992, verificationTier: 'reported_occurrence', depositType: 'Managed Tropical Plantation', sourceName: 'FAO', observedYear: 2023 },
    ],
  },
  {
    slug: 'bamboo',
    name: 'Bamboo',
    category: 'Forest Resources',
    subcategory: 'Fast-Growing Woody Grass (Bambusoideae)',
    chemicalFormula: 'Cellulose + Lignin + Biogenic Silica (SiO₂)',
    summary:
      'Fastest-growing woody perennial grass family on Earth (up to 91 cm/day in giant species), offering tensile strength comparable to mild steel along the fiber axis and rapid carbon sequestration.',
    physicalProperties: {
      density: '0.60–0.85 g/cm³ (dry culm)',
      color: 'Natural green turning golden tan when seasoned',
      texture: 'Hollow segmented internodal culm',
    },
    formationOrigin:
      'Rhizomatous perennial grass systems thriving in humid tropical, subtropical, and warm temperate mountain valleys across Asia, Latin America, and Africa.',
    industrialApplications: [
      'Engineered laminated bamboo structural beams, flooring, and scaffolding',
      'Pulp, tissue paper, woven textiles, and biodegradable food packaging',
      'Activated bamboo charcoal and biochar',
    ],
    agriculturalApplications: [
      'Erosion-controlling riparian buffers, livestock fodder, and crop trellising poles',
    ],
    environmentalImportance:
      'Regenerates from intact root rhizomes after selective culm harvesting without replanting, stabilizing steep hillsides and capturing carbon rapidly.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 54, unit: '% global commercial bamboo output', year: 2023, status: 'reported', source: 'INBAR' },
      { country: 'India', iso3: 'IND', sharePct: 19, unit: '% global bamboo area (~15M ha)', year: 2023, status: 'reported', source: 'National Bamboo Mission / INBAR' },
      { country: 'Vietnam', iso3: 'VNM', sharePct: 8, unit: '% global bamboo trade', year: 2023, status: 'estimated', source: 'INBAR' },
    ],
    availabilityMetrics: {
      globalReservesText: '~35 million hectares global bamboo forest cover (dominated by Moso & Dendrocalamus)',
      renewability: 'Highly renewable (3–5 year culm harvest cycle)',
      scarcityIndex: 11,
      reserveLifeYears: null,
      source: 'INBAR & FAO FRA',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Engineered Construction & Scaffolding', sharePct: 44, source: 'INBAR' },
      { sector: 'Pulp, Paper & Biodegradable Packaging', sharePct: 31, source: 'INBAR' },
      { sector: 'Handicrafts, Shoots & Biochar', sharePct: 25, source: 'INBAR' },
    ],
    imageUrl: '/src/assets/images/category_forest_resources_1795022583901.jpg',
    imageAttribution: 'GeoAtlas Bamboo & Silviculture Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'INBAR & GBIF Bambusoideae Records',
    sourceUrl: 'https://www.inbar.int/',
    lastUpdated: '2024-02-15',
    occurrences: [
      { siteName: 'Anji Moso Bamboo Forest Belt, Zhejiang', country: 'China', region: 'East Asia', latitude: 30.6383, longitude: 119.6808, verificationTier: 'verified_deposit', depositType: 'Phyllostachys edulis (Moso) Stand', sourceName: 'INBAR', observedYear: 2023 },
      { siteName: 'Northeast India Bamboo Corridor (Assam-Mizoram)', country: 'India', region: 'South Asia', latitude: 23.7271, longitude: 92.7176, verificationTier: 'verified_deposit', depositType: 'Dendrocalamus & Melocanna Forests', sourceName: 'Forest Survey of India', observedYear: 2023 },
      { siteName: 'Guadua Bamboo Zone, Eje Cafetero', country: 'Colombia', region: 'South America', latitude: 4.8133, longitude: -75.6961, verificationTier: 'verified_deposit', depositType: 'Guadua angustifolia Riparian Stand', sourceName: 'GBIF / INBAR', observedYear: 2023 },
    ],
  },
  {
    slug: 'medicinal-plants',
    name: 'Medicinal Plants',
    category: 'Forest Resources',
    subcategory: 'Phytochemical & Ethnobotanical Forest Flora',
    chemicalFormula: 'Alkaloids, Terpenoids, Glycosides, Polyphenols',
    summary:
      'Diverse forest, alpine, and wetland botanical species synthesizing bioactive secondary metabolites—such as artemisinin, paclitaxel, quinine, and ashwagandha withanolides—fundamental to global pharmacology.',
    physicalProperties: {
      texture: 'Herbaceous leaves, roots, bark, and resinous exudates',
    },
    formationOrigin:
      'Evolutionary plant biosynthesis of secondary defense metabolites across tropical rainforests, Himalayan alpine meadows, and Mediterranean scrublands.',
    industrialApplications: [
      'Active pharmaceutical ingredients (APIs) and standardized botanical extracts (~25% of modern prescription drugs derive from or model plant compounds)',
      'Essential oils, cosmeceuticals, and natural antimicrobial preservatives',
    ],
    agriculturalApplications: [
      'Neem (azadirachtin) and pyrethrum botanical biopesticides for integrated pest management',
    ],
    environmentalImportance:
      'Over-harvesting threatens wild Himalayan and rainforest medicinal taxa; CITES conservation and cultivated agroforestry protect wild genetic diversity.',
    majorProducers: [
      { country: 'China', iso3: 'CHN', sharePct: 38, unit: '% global medicinal botanical exports', year: 2023, status: 'reported', source: 'UN Comtrade / IUCN' },
      { country: 'India', iso3: 'IND', sharePct: 16, unit: '% global medicinal botanical exports', year: 2023, status: 'reported', source: 'NMPB India / UN Comtrade' },
      { country: 'Germany (Processing & Extracts)', iso3: 'DEU', sharePct: 9, unit: '% global botanical extract trade', year: 2023, status: 'reported', source: 'UN Comtrade' },
    ],
    availabilityMetrics: {
      globalReservesText: '~28,000+ documented medicinal plant species globally (Kew State of the World’s Plants)',
      renewability: 'Renewable if cultivated or sustainably wild-harvested under CITES',
      scarcityIndex: 52,
      reserveLifeYears: null,
      source: 'Royal Botanic Gardens Kew & WHO',
      year: 2023,
    },
    historicalPrices: [],
    applicationBreakdown: [
      { sector: 'Pharmaceuticals & Herbal Medicine', sharePct: 62, source: 'WHO / Kew' },
      { sector: 'Nutraceuticals & Essential Oils', sharePct: 28, source: 'Trade Reference' },
      { sector: 'Botanical Biopesticides', sharePct: 10, source: 'FAO' },
    ],
    imageUrl: '/src/assets/images/category_forest_resources_1795022583901.jpg',
    imageAttribution: 'GeoAtlas Botanical Biodiversity Plate',
    dataOrigin: 'curated_verified',
    sourceName: 'Kew MPNS & GBIF Occurrence Network',
    sourceUrl: 'https://mpns.science.kew.org/',
    lastUpdated: '2024-02-15',
    occurrences: [
      { siteName: 'Western Himalayas Medicinal Flora Corridor, Uttarakhand', country: 'India', region: 'South Asia', latitude: 30.4598, longitude: 79.3189, verificationTier: 'verified_deposit', depositType: 'Alpine-Subalpine Botanical Habitat', sourceName: 'BSI / GBIF', observedYear: 2023 },
      { siteName: 'Sichuan–Yunnan Alpine Medicinal Belt', country: 'China', region: 'East Asia', latitude: 27.8167, longitude: 100.2286, verificationTier: 'verified_deposit', depositType: 'Montane Biodiversity Hotspot', sourceName: 'GBIF', observedYear: 2023 },
      { siteName: 'Upper Amazon Ethnobotanical Corridor, Loreto', country: 'Peru', region: 'South America', latitude: -3.7437, longitude: -73.2516, verificationTier: 'reported_occurrence', depositType: 'Tropical Rainforest Canopy & Understory', sourceName: 'Kew / GBIF', observedYear: 2023 },
    ],
  },
];
