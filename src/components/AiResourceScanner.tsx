import React, { useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Camera, Loader2, ShieldAlert, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { SpecimenScanResult } from '../types/resource';

interface AiResourceScannerProps {
  onOpenResourceSlug: (slug: string) => void;
  onLiveSearchName: (name: string) => void;
}

export const AiResourceScanner: React.FC<AiResourceScannerProps> = ({
  onOpenResourceSlug,
  onLiveSearchName,
}) => {
  const { getIdToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [fieldNotes, setFieldNotes] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpecimenScanResult | null>(null);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds 10 MB limit. Please upload a smaller specimen photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxEdge = 1024;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        if (scale === 1 && file.size <= 350 * 1024) {
          setMimeType(file.type || 'image/jpeg');
          setPreviewUrl(rawDataUrl);
          setImageBase64(rawDataUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setMimeType('image/jpeg');
          setPreviewUrl(compressed);
          setImageBase64(compressed);
        } else {
          setMimeType(file.type || 'image/jpeg');
          setPreviewUrl(rawDataUrl);
          setImageBase64(rawDataUrl);
        }
      };
      img.onerror = () => {
        setMimeType(file.type || 'image/jpeg');
        setPreviewUrl(rawDataUrl);
        setImageBase64(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setScanning(true);
    setError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64,
          mimeType,
          fieldNotes: fieldNotes.trim() || undefined,
        }),
      });

      const rawText = await res.text();
      let data: { scan?: SpecimenScanResult; error?: string } | null = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText) as { scan?: SpecimenScanResult; error?: string };
        } catch {
          data = null;
        }
      }
      if (!res.ok || !data?.scan) {
        throw new Error(data?.error || `Specimen analysis failed (HTTP ${res.status}).`);
      }
      setResult(data.scan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to analyze specimen image.');
    } finally {
      setScanning(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setImageBase64(null);
    setFieldNotes('');
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section id="scanner" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-teal-800">
            AI Specimen Vision Triage · Multimodal Analysis
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1">
            AI Resource Image Scanner
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Upload a clear photograph of a rock, mineral, gemstone, ore, or soil profile to predict candidate identities, inspect morphological cues, and review confirmatory field tests.
          </p>
        </div>
        <div className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Visual screening estimates morphological matches only and never replaces laboratory XRD, petrographic thin-section, or geochemical assay.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
        {/* Left Upload Column */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className="border border-dashed border-slate-300 hover:border-teal-700 bg-slate-50/70 rounded-xl p-5 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            {previewUrl ? (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Uploaded natural resource specimen"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover rounded-lg border border-slate-200"
                />
                <p className="text-xs text-slate-500">Click or drop another image to replace</p>
              </div>
            ) : (
              <div className="py-8 space-y-3">
                <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center mx-auto text-teal-800">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Upload specimen photograph
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag & drop or click to select JPEG, PNG, or WebP (max 10 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="field-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Optional Field Context (locality, streak, magnetism, hardness)
            </label>
            <input
              id="field-notes"
              type="text"
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              placeholder="e.g., Scratches glass, found in pegmatite vein"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!imageBase64 || scanning}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Specimen…</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Identify Specimen</span>
                </>
              )}
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleClear}
                disabled={scanning}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Result Column */}
        <div className="lg:col-span-7">
          {!result && !scanning && (
            <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                Awaiting specimen image
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Once analyzed, you will receive a predicted mineral/rock/resource match, calibrated visual confidence score, observed crystal or grain cues, similar lookalikes, and recommended field verification tests.
              </p>
            </div>
          )}

          {scanning && (
            <div className="border border-slate-200 rounded-xl p-8 space-y-4">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                <span>Inspecting optical habit, luster, texture, and color cues…</span>
              </div>
              <div className="space-y-2.5">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
              </div>
            </div>
          )}

          {result && (
            <div className="border border-slate-200 rounded-xl p-6 space-y-5">
              {/* Top Prediction Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-500">
                    <span>{result.category}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{result.subcategory}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono text-slate-700">{result.chemicalFormula}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {result.predictedName}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium text-slate-600">{result.confidenceLevel}</div>
                  <div className="text-2xl font-mono font-bold text-teal-800 tabular-nums">
                    {result.confidencePct}%
                  </div>
                </div>
              </div>

              {/* Confidence Meter + Uncertainty Disclaimer */}
              <div className="space-y-2.5">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full"
                    style={{ width: `${result.confidencePct}%` }}
                  />
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <span>{result.uncertaintyDisclaimer}</span>
                </div>
              </div>

              {/* Visual Cues & Physical Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Visual Cues Observed
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {result.visualCuesObserved.map((cue, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-teal-700 font-bold">·</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 text-xs">
                  <h4 className="text-xs font-semibold text-slate-800">
                    Estimated Physical Profile & Confirmatory Tests
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500 block">Est. Hardness</span>
                      <span className="font-mono font-medium text-slate-900">
                        {result.physicalProperties.estimatedHardness}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Luster</span>
                      <span className="font-medium text-slate-900">
                        {result.physicalProperties.luster}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block">Recommended Field Tests</span>
                    <span className="text-slate-700 leading-relaxed">
                      {result.physicalProperties.diagnosticFieldTests}
                    </span>
                  </div>
                </div>
              </div>

              {/* Applications & Similar Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Common Applications
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {result.commonApplications.map((app, idx) => (
                      <li key={idx}>· {app}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Visually Similar Lookalikes
                  </h4>
                  <div className="space-y-2">
                    {result.similarResources.map((sim, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-semibold text-slate-800">{sim.name}: </span>
                        <span className="text-slate-600">{sim.distinguishingFeature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Continue into the full geological atlas & external API dataset
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (result.matchedSlug) {
                      onOpenResourceSlug(result.matchedSlug);
                    } else {
                      onLiveSearchName(result.predictedName);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Explore {result.predictedName} & Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
