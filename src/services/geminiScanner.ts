import { type GenerateContentResponse, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
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

const KNOWN_CATALOG_SLUGS = [
  'granite', 'marble', 'basalt', 'limestone',
  'quartz', 'gypsum', 'mica', 'feldspar',
  'gold', 'silver', 'iron', 'copper', 'platinum', 'mercury',
  'diamond', 'ruby', 'emerald', 'sapphire',
  'hydrogen', 'oxygen', 'carbon', 'carbon-dioxide',
  'red-soil', 'black-soil', 'alluvial-soil', 'laterite-soil',
  'rivers', 'lakes', 'groundwater',
  'coal', 'petroleum', 'natural-gas',
  'timber', 'bamboo', 'medicinal-plants',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiScannerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GeminiScannerError';
    this.statusCode = statusCode;
  }
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
    // Not raw JSON
  }

  return {
    code: Number.isFinite(statusProp) ? statusProp : 500,
    message: raw,
    status: 'UNKNOWN',
  };
}

export async function analyzeSpecimenImage(
  base64Data: string,
  mimeType: string,
  fieldNotes?: string
): Promise<SpecimenScanResult> {
  const ai = getAiClient();

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const prompt = [
    'You are an earth-sciences and mineralogy visual triage assistant.',
    'Analyze the uploaded photograph of a rock, mineral, metal ore, gemstone, soil horizon, energy sample, or forest/botanical resource.',
    'CRITICAL SCIENTIFIC INTEGRITY RULES:',
    '1. Never claim laboratory-grade or definitive identification from an ordinary photograph. Always articulate optical ambiguity (e.g., colorless quartz vs. calcite vs. topaz; gold vs. pyrite/chalcopyrite; basalt vs. gabbro).',
    '2. Calibrate confidencePct conservatively (maximum 92, typically 45–85 for clear specimens, lower for weathered or blurry samples).',
    `3. If the predicted resource matches one of these catalog slugs (${KNOWN_CATALOG_SLUGS.join(', ')}), set matchedSlug to that exact slug; otherwise set matchedSlug to null.`,
    fieldNotes ? `User field context / observation notes: ${fieldNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      predictedName: { type: Type.STRING },
      matchedSlug: { type: Type.STRING, nullable: true },
      category: { type: Type.STRING },
      subcategory: { type: Type.STRING },
      chemicalFormula: { type: Type.STRING },
      confidenceLevel: {
        type: Type.STRING,
        enum: [
          'High Visual Match',
          'Moderate Visual Match',
          'Low Confidence — Ambiguous Features',
        ],
      },
      confidencePct: { type: Type.INTEGER },
      uncertaintyDisclaimer: { type: Type.STRING },
      visualCuesObserved: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      physicalProperties: {
        type: Type.OBJECT,
        properties: {
          estimatedHardness: { type: Type.STRING },
          luster: { type: Type.STRING },
          colorAndHabit: { type: Type.STRING },
          diagnosticFieldTests: { type: Type.STRING },
        },
        required: ['estimatedHardness', 'luster', 'colorAndHabit', 'diagnosticFieldTests'],
      },
      commonApplications: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      similarResources: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            distinguishingFeature: { type: Type.STRING },
          },
          required: ['name', 'distinguishingFeature'],
        },
      },
    },
    required: [
      'predictedName',
      'category',
      'subcategory',
      'chemicalFormula',
      'confidenceLevel',
      'confidencePct',
      'uncertaintyDisclaimer',
      'visualCuesObserved',
      'physicalProperties',
      'commonApplications',
      'similarResources',
    ],
  };

  const modelsToTry: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: { code: number; message: string; status: string } | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const candidate = modelsToTry[i];
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: candidate.model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
          systemInstruction:
            'Respond strictly with valid JSON matching the schema. Be scientifically rigorous, concise, and transparent about photographic uncertainty.',
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text) as SpecimenScanResult;
      // Clamp confidencePct to never claim 100% laboratory certainty
      parsed.confidencePct = Math.min(92, Math.max(5, Number(parsed.confidencePct) || 50));
      return parsed;
    } catch (err: unknown) {
      const parsedErr = parseGeminiError(err);
      lastError = parsedErr;

      // Key/permission errors won't resolve with another model
      if (parsedErr.code === 400 || parsedErr.code === 403) {
        throw new GeminiScannerError(
          'Gemini API authentication failed. Please check your GEMINI_API_KEY in Settings > Secrets.',
          parsedErr.code
        );
      }

      // Transient high demand (503) or rate-limit (429): brief backoff then try next model
      if ((parsedErr.code === 503 || parsedErr.code === 429 || parsedErr.code === 404) && i < modelsToTry.length - 1) {
        await sleep(1000);
        continue;
      }
    }
  }

  if (lastError?.code === 429) {
    throw new GeminiScannerError(
      'Gemini API quota limit reached. You can retry shortly or select a billing-enabled key in Settings > Secrets.',
      429
    );
  }
  if (lastError?.code === 503) {
    throw new GeminiScannerError(
      'The Gemini vision service is experiencing temporary high demand. Please retry in a few seconds.',
      503
    );
  }

  throw new GeminiScannerError(
    lastError?.message || 'AI specimen analysis failed. Please try another photograph.',
    lastError?.code && lastError.code >= 400 ? lastError.code : 500
  );
}
