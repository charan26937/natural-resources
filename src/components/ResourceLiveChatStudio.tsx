import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  Crosshair,
  ExternalLink,
  FlaskConical,
  Globe2,
  Loader2,
  MapPin,
  Mic,
  Send,
  Sprout,
  Square,
  Upload,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import type {
  GroundingSource,
  LiveEnrichmentResult,
  ResourceChatResponse,
  ResourceChatStep,
  ResourceItem,
  ResourceOccurrence,
  UserGeoLocation,
} from '../types/resource';

interface ResourceLiveChatStudioProps {
  resource: {
    slug: string;
    name: string;
    category?: string;
  };
  strictScope?: boolean;
  onLiveUpdate?: (updatedResource: ResourceItem | null, liveEnrichment: LiveEnrichmentResult) => void;
  onNearestMapResult?: (userLocation: UserGeoLocation, nearestOccurrences: ResourceOccurrence[]) => void;
  onJumpToMap?: () => void;
}

interface ChatTurn {
  id: string;
  userText: string;
  photoPreviewUrl?: string | null;
  videoPreviewUrl?: string | null;
  steps: ResourceChatStep[];
  replyMarkdown: string;
  groundingSources: GroundingSource[];
  userLocation?: UserGeoLocation | null;
  nearestOccurrences?: ResourceOccurrence[];
  modelUsed: string;
  fetchedAt: string;
}

const QUICK_PROMPTS = [
  {
    label: 'Complete Step-by-Step Guide',
    prompt:
      'Give me a complete step-by-step guide with current scientific data, pricing, exact global mapping places, practical uses, agriculture usefulness, scientist/research methods, and simple student understanding.',
  },
  {
    label: 'Nearest to My Location',
    prompt:
      'Find the nearest available sites and deposits around my location and show them on the map with distance.',
  },
  {
    label: 'Price & Market Value',
    prompt:
      'What is the current market price value, pricing unit, and economic demand worldwide for this resource?',
  },
  {
    label: 'Agriculture & Farmers',
    prompt:
      'Give the uses of agriculture, soil quality, crop growth, or farming tools for this resource.',
  },
  {
    label: 'Scientists & Researchers',
    prompt:
      'Explain laboratory identification methods, chemical/geological parameters, instrumentation, and active research topics for scientists and researchers.',
  },
  {
    label: 'Students: Easy Guide',
    prompt:
      'Explain this resource in simple, memorable language for students with key study takeaways.',
  },
];

const STEP_ICONS: Record<number, React.ReactNode> = {
  1: <Globe2 className="w-4 h-4 text-teal-700 shrink-0" />,
  2: <MapPin className="w-4 h-4 text-sky-700 shrink-0" />,
  3: <Wrench className="w-4 h-4 text-amber-700 shrink-0" />,
  4: <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />,
  5: <FlaskConical className="w-4 h-4 text-indigo-700 shrink-0" />,
  6: <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />,
};

const MAX_VIDEO_RECORD_SECONDS = 20;

function resizeImageToJpeg(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Unable to initialize image canvas.');
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] || '';
        URL.revokeObjectURL(objectUrl);
        resolve({ base64, mimeType: 'image/jpeg', dataUrl });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode uploaded photo. Please choose a JPEG, PNG, or WebP image.'));
    };

    img.src = objectUrl;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(b64);
    };
    reader.onerror = () => reject(new Error('Failed to encode media recording.'));
    reader.readAsDataURL(blob);
  });
}

function renderFormattedInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function StepBodyRenderer({ content }: { content: string }) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        const cleanedBullet = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
        const isList = /^([-*•]|\d+\.)\s+/.test(line);
        if (isList) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-teal-700 font-bold mt-0.5 shrink-0">·</span>
              <span>{renderFormattedInline(cleanedBullet)}</span>
            </div>
          );
        }
        return <p key={i}>{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function FocusedMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return null;

        if (/^###\s+/.test(line)) {
          return (
            <h3 key={idx} className="text-sm font-bold text-slate-900 pt-1">
              {renderFormattedInline(line.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        if (/^##\s+/.test(line)) {
          return (
            <h2 key={idx} className="text-sm font-bold text-slate-900 pt-1">
              {renderFormattedInline(line.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        if (/^([-*•]|\d+\.)\s+/.test(line)) {
          const cleaned = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-teal-700 font-bold mt-0.5 shrink-0">·</span>
              <span>{renderFormattedInline(cleaned)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function isNearbyQuestion(text: string): boolean {
  return /\b(near|nearly|nearby|nearest|closest|around me|my location|in my area|close to me|near me|how far|distance)\b/i.test(
    text
  );
}

async function safeReadJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const USER_LOCATION_STORAGE_KEY = 'gnre_user_location_v1';

export const ResourceLiveChatStudio: React.FC<ResourceLiveChatStudioProps> = ({
  resource,
  strictScope = false,
  onLiveUpdate,
  onNearestMapResult,
  onJumpToMap,
}) => {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User location state for nearby mapping
  const [userLocation, setUserLocation] = useState<UserGeoLocation | null>(() => {
    try {
      const saved = window.sessionStorage.getItem(USER_LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserGeoLocation;
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    return null;
  });
  const [showLocationBox, setShowLocationBox] = useState(false);
  const [locationPromptMsg, setLocationPromptMsg] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [pendingNearbyPrompt, setPendingNearbyPrompt] = useState<string | null>(null);

  // Photo attachment state
  const [attachedPhoto, setAttachedPhoto] = useState<{
    base64: string;
    mimeType: string;
    dataUrl: string;
    name: string;
  } | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Video attachment & recording state
  const [attachedVideo, setAttachedVideo] = useState<{
    base64: string;
    mimeType: string;
    objectUrl: string;
    name: string;
  } | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const videoPreviewElRef = useRef<HTMLVideoElement | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<number | null>(null);
  const videoCancelledRef = useRef(false);

  // Voice recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<number | null>(null);
  const mapJumpTimerRef = useRef<number | null>(null);
  const videoPreviewTimerRef = useRef<number | null>(null);

  // Reset conversation when switching to a different resource
  useEffect(() => {
    setTurns([]);
    setInput('');
    setAttachedPhoto(null);
    setAttachedVideo((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
    setErrorMsg(null);
    setLocationPromptMsg(null);
    setPendingNearbyPrompt(null);
  }, [resource.slug]);

  useEffect(() => {
    return () => {
      if (audioTimerRef.current) window.clearInterval(audioTimerRef.current);
      if (videoTimerRef.current) window.clearInterval(videoTimerRef.current);
      if (mapJumpTimerRef.current) window.clearTimeout(mapJumpTimerRef.current);
      if (videoPreviewTimerRef.current) window.clearTimeout(videoPreviewTimerRef.current);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const persistUserLocation = (loc: UserGeoLocation | null) => {
    setUserLocation(loc);
    try {
      if (loc) {
        window.sessionStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(loc));
      } else {
        window.sessionStorage.removeItem(USER_LOCATION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  };

  const requestBrowserGpsLocation = (): Promise<UserGeoLocation | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserGeoLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: `Your GPS (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
          };
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 300000 }
      );
    });
  };

  const handleUseGpsClick = async () => {
    setLocating(true);
    setErrorMsg(null);
    setLocationPromptMsg(null);
    const gpsLoc = await requestBrowserGpsLocation();
    setLocating(false);
    if (!gpsLoc) {
      setLocationPromptMsg(
        'Browser GPS permission is unavailable here. Enter your city, state, or country below to locate nearby deposits.'
      );
      setShowLocationBox(true);
      return;
    }
    persistUserLocation(gpsLoc);
    setShowLocationBox(false);
    setLocationPromptMsg(null);
    if (pendingNearbyPrompt) {
      const q = pendingNearbyPrompt;
      setPendingNearbyPrompt(null);
      await submitChatQuery(q, gpsLoc);
    }
  };

  const handleCityGeocodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = cityQuery.trim();
    if (q.length < 2) return;
    setLocating(true);
    setErrorMsg(null);
    setLocationPromptMsg(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await safeReadJson<{
        results?: UserGeoLocation[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data?.error || `Could not find that location (HTTP ${res.status}).`);
      }
      const best = data?.results?.[0];
      if (!best) {
        setLocationPromptMsg(
          `No matching coordinates found for "${q}". Try a nearby major city or country name.`
        );
        return;
      }
      persistUserLocation(best);
      setCityQuery('');
      setShowLocationBox(false);
      setLocationPromptMsg(null);
      if (pendingNearbyPrompt) {
        const queued = pendingNearbyPrompt;
        setPendingNearbyPrompt(null);
        await submitChatQuery(queued, best);
      } else if (onNearestMapResult) {
        await submitChatQuery(
          `Find nearest available ${resource.name} sites near ${best.label} and plot them on the map.`,
          best
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to locate address.');
    } finally {
      setLocating(false);
    }
  };

  const submitChatQuery = async (
    overrideMessage?: string,
    explicitLocation?: UserGeoLocation | null
  ) => {
    const promptToSend = (overrideMessage ?? input).trim();
    if (!promptToSend && !attachedPhoto && !attachedVideo) return;

    const asksNearby = isNearbyQuestion(promptToSend);
    let activeLocation = explicitLocation ?? userLocation;

    if (asksNearby && !activeLocation) {
      setLocating(true);
      const gps = await requestBrowserGpsLocation();
      setLocating(false);
      if (gps) {
        persistUserLocation(gps);
        setLocationPromptMsg(null);
        activeLocation = gps;
      } else {
        setPendingNearbyPrompt(promptToSend);
        setShowLocationBox(true);
        setErrorMsg(null);
        setLocationPromptMsg(
          `Enter your city or click "Use GPS" below so the map can show the nearest ${resource.name} sites to your location.`
        );
        return;
      }
    }

    setSending(true);
    setErrorMsg(null);
    const photoSnap = attachedPhoto;
    const videoSnap = attachedVideo;

    if (!overrideMessage) {
      setInput('');
    }
    setAttachedPhoto(null);
    setAttachedVideo(null);

    const history = turns.slice(-3).flatMap((t) => [
      { role: 'user' as const, text: t.userText },
      { role: 'assistant' as const, text: t.replyMarkdown.slice(0, 600) },
    ]);

    try {
      const res = await fetch('/api/resources/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: resource.slug,
          resourceName: resource.name,
          strictScope,
          message:
            promptToSend ||
            (videoSnap
              ? `Examine this recorded video of ${resource.name} and present a complete step-by-step breakdown.`
              : `Examine this uploaded photo of ${resource.name} and present a complete step-by-step breakdown.`),
          userLocation: activeLocation ?? undefined,
          imageBase64: photoSnap?.base64,
          imageMimeType: photoSnap?.mimeType,
          videoBase64: videoSnap?.base64,
          videoMimeType: videoSnap?.mimeType,
          history,
        }),
      });

      const data = await safeReadJson<ResourceChatResponse & { error?: string }>(res);
      if (!res.ok || !data) {
        throw new Error(data?.error || `Failed to fetch resource answer (HTTP ${res.status}).`);
      }

      if (onLiveUpdate && data.liveEnrichment) {
        onLiveUpdate(data.updatedResource ?? null, data.liveEnrichment);
      }

      if (
        data.userLocation &&
        data.nearestOccurrences &&
        data.nearestOccurrences.length > 0 &&
        onNearestMapResult
      ) {
        onNearestMapResult(data.userLocation, data.nearestOccurrences);
        if (asksNearby && onJumpToMap) {
          if (mapJumpTimerRef.current) window.clearTimeout(mapJumpTimerRef.current);
          mapJumpTimerRef.current = window.setTimeout(() => onJumpToMap(), 180);
        }
      }

      const newTurn: ChatTurn = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userText:
          promptToSend ||
          (videoSnap
            ? `Recorded video (${videoSnap.name}) for ${resource.name}`
            : `Uploaded specimen photo (${photoSnap?.name || 'image'}) for ${resource.name}`),
        photoPreviewUrl: photoSnap?.dataUrl ?? null,
        videoPreviewUrl: videoSnap?.objectUrl ?? null,
        steps: data.steps || [],
        replyMarkdown: data.replyMarkdown || '',
        groundingSources: data.groundingSources || [],
        userLocation: data.userLocation ?? null,
        nearestOccurrences: data.nearestOccurrences ?? [],
        modelUsed: data.modelUsed || 'gemini-4-hydrogen',
        fetchedAt: data.fetchedAt || new Date().toISOString(),
      };

      setTurns((prev) => [...prev, newTurn]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send chat query.');
    } finally {
      setSending(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    try {
      const resized = await resizeImageToJpeg(file);
      setAttachedPhoto({ ...resized, name: file.name });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not process selected photo.');
    }
  };

  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Video clip exceeds 12 MB limit. Please record or upload a shorter clip (max 20s).');
      return;
    }

    try {
      const base64 = await blobToBase64(file);
      const objectUrl = URL.createObjectURL(file);
      setAttachedVideo((prev) => {
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return {
          base64,
          mimeType: file.type || 'video/webm',
          objectUrl,
          name: file.name,
        };
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load video file.');
    }
  };

  // Audio voice recorder
  const startAudioRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (audioTimerRef.current) {
          window.clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];

        if (audioBlob.size < 250) {
          setErrorMsg('Voice recording was too short. Hold and speak for a second or two.');
          return;
        }

        setTranscribing(true);
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const cleanMime = (recorder.mimeType || 'audio/webm').split(';')[0];
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: cleanMime,
            }),
          });
          const data = await safeReadJson<{ transcript?: string; error?: string }>(res);
          if (!res.ok || !data) {
            throw new Error(data?.error || `Voice transcription failed (HTTP ${res.status}).`);
          }
          const transcript = String(data.transcript || '').trim();
          if (transcript) {
            if (!input.trim()) {
              setInput(transcript);
              await submitChatQuery(transcript);
              setInput('');
            } else {
              setInput((prev) => `${prev.trim()} ${transcript}`.trim());
            }
          }
        } catch (err: unknown) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Unable to transcribe recorded audio.'
          );
        } finally {
          setTranscribing(false);
        }
      };

      audioRecorderRef.current = recorder;
      recorder.start();
      setAudioSeconds(0);
      setIsRecordingAudio(true);
      audioTimerRef.current = window.setInterval(() => {
        setAudioSeconds((s) => s + 1);
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow mic access in browser settings or type your question.'
          : 'Unable to access microphone device.'
      );
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  // Live Camera Video Recorder
  const startVideoRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera video recording is not supported in this browser. You can still upload a video file.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
      } catch {
        // Retry without audio if microphone is blocked/missing
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
      }

      videoStreamRef.current = stream;
      videoChunksRef.current = [];
      videoCancelledRef.current = false;

      const mimeOptions = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const chosenMime = mimeOptions.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 450000 })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          videoChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (videoTimerRef.current) {
          window.clearInterval(videoTimerRef.current);
          videoTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        videoStreamRef.current = null;
        setIsRecordingVideo(false);

        if (videoCancelledRef.current) {
          videoChunksRef.current = [];
          return;
        }

        const vidBlob = new Blob(videoChunksRef.current, {
          type: (recorder.mimeType || 'video/webm').split(';')[0],
        });
        videoChunksRef.current = [];

        if (vidBlob.size < 1000) {
          setErrorMsg('Video recording was too short. Please record for at least 1–2 seconds.');
          return;
        }
        if (vidBlob.size > 12 * 1024 * 1024) {
          setErrorMsg('Recorded video exceeded 12 MB. Please keep clips under 20 seconds.');
          return;
        }

        try {
          const base64 = await blobToBase64(vidBlob);
          const objectUrl = URL.createObjectURL(vidBlob);
          setAttachedVideo((prev) => {
            if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
            return {
              base64,
              mimeType: (recorder.mimeType || 'video/webm').split(';')[0],
              objectUrl,
              name: `recorded-video-${new Date().toISOString().slice(11, 19)}.webm`,
            };
          });
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to encode recorded video.');
        }
      };

      videoRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setVideoSeconds(0);
      recorder.start(500);

      // Attach live stream once video viewfinder element renders
      if (videoPreviewTimerRef.current) window.clearTimeout(videoPreviewTimerRef.current);
      videoPreviewTimerRef.current = window.setTimeout(() => {
        if (videoPreviewElRef.current) {
          videoPreviewElRef.current.srcObject = stream;
          videoPreviewElRef.current.play().catch(() => {});
        }
      }, 60);

      videoTimerRef.current = window.setInterval(() => {
        setVideoSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_VIDEO_RECORD_SECONDS) {
            if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
              videoRecorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or click Upload Video instead.'
          : 'No active camera device detected. You can upload a recorded video clip or photo instead.'
      );
    }
  };

  const stopVideoRecording = (cancel = false) => {
    videoCancelledRef.current = cancel;
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    } else {
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecordingVideo(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50/85 p-5 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Interactive {resource.name} Research Chat · Text, Voice, Video Record & Photo Upload
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {strictScope
              ? `Locked to ${resource.name} only — ask about pricing, nearby locations on map, properties, uses, agriculture, or upload a photo/video.`
              : 'Send a message, record voice, record camera video, or upload a photo to fetch online data, pricing, mapping, global statistics, uses, agriculture, scientist/research analysis, and student steps.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userLocation ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-[11px] font-medium text-blue-900">
              <MapPin className="w-3 h-3 text-blue-700 shrink-0" />
              <span className="max-w-[180px] truncate">{userLocation.label || 'Location Set'}</span>
              <button
                type="button"
                onClick={() => setShowLocationBox((v) => !v)}
                className="text-blue-700 hover:underline ml-1 cursor-pointer"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => persistUserLocation(null)}
                title="Clear your location"
                className="text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLocationBox((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-600 rounded-md text-[11px] font-semibold text-slate-700 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-700" />
              <span>Set My Location</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-teal-800 whitespace-nowrap">
            {strictScope ? `Locked to ${resource.name}` : 'Online Search + Federated APIs'}
          </span>
        </div>
      </div>

      {/* Inline User Location Chooser (GPS or City/Country Lookup) */}
      {showLocationBox && (
        <div className="bg-white border border-blue-200 rounded-lg p-3.5 space-y-2.5">
          {locationPromptMsg && (
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900">
              <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
              <span>{locationPromptMsg}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleUseGpsClick}
              disabled={locating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
              <span>Use GPS</span>
            </button>

            <form onSubmit={handleCityGeocodeSubmit} className="flex flex-1 min-w-[220px] items-center gap-2">
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Or enter city, state, or country (e.g. Hyderabad, Denver, Perth)…"
                aria-label="Enter city or place for nearby mapping"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
              />
              <button
                type="submit"
                disabled={locating || cityQuery.trim().length < 2}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md whitespace-nowrap disabled:opacity-50 cursor-pointer"
              >
                Locate &amp; Map
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setShowLocationBox(false);
                setLocationPromptMsg(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Close location panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Live Video Recording Viewfinder */}
      {isRecordingVideo && (
        <div className="bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-700 max-w-md">
          <div className="flex items-center justify-between text-xs text-white">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Recording Video Specimen / Question</span>
            </span>
            <span className="font-mono tabular-nums text-rose-300">
              {formatTimer(videoSeconds)} / 0:{MAX_VIDEO_RECORD_SECONDS}
            </span>
          </div>
          <video
            ref={videoPreviewElRef}
            muted
            playsInline
            className="w-full h-48 object-cover rounded-lg bg-black"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => stopVideoRecording(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => stopVideoRecording(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop & Attach Video</span>
            </button>
          </div>
        </div>
      )}

      {/* Attached Photo or Video Previews */}
      {(attachedPhoto || attachedVideo) && (
        <div className="flex flex-wrap items-center gap-3">
          {attachedPhoto && (
            <div className="inline-flex items-center gap-3 p-2 pr-3 bg-white border border-slate-300 rounded-lg">
              <img
                src={attachedPhoto.dataUrl}
                alt="Attached specimen preview"
                className="w-11 h-11 rounded object-cover border border-slate-200"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-800 max-w-[180px] truncate">
                  {attachedPhoto.name}
                </div>
                <div className="text-[11px] text-slate-500">Photo attached</div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedPhoto(null)}
                title="Remove photo"
                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {attachedVideo && (
            <div className="inline-flex items-center gap-3 p-2 pr-3 bg-white border border-slate-300 rounded-lg">
              <video
                src={attachedVideo.objectUrl}
                controls
                className="w-20 h-12 rounded object-cover border border-slate-200 bg-black"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-800 max-w-[180px] truncate">
                  {attachedVideo.name}
                </div>
                <div className="text-[11px] text-slate-500">Video clip ready for analysis</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(attachedVideo.objectUrl);
                  setAttachedVideo(null);
                }}
                title="Remove video"
                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unified Chat Bar + Voice Record + Video Record + Video Upload + Photo Upload */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitChatQuery();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || transcribing}
          placeholder={`Ask anything about ${resource.name} (scientific data, mapping, uses, agriculture, scientists, students)…`}
          aria-label={`Ask about ${resource.name}`}
          className="flex-1 min-w-[220px] px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 disabled:bg-slate-100"
        />

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-label="Upload specimen photo"
        />
        <input
          ref={videoUploadInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleVideoFileSelect}
          className="hidden"
          aria-label="Upload video clip"
        />

        {/* Voice Record */}
        <button
          type="button"
          onClick={() => (isRecordingAudio ? stopAudioRecording() : startAudioRecording())}
          disabled={sending || transcribing || isRecordingVideo}
          title={isRecordingAudio ? 'Stop voice recording' : 'Record voice question'}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isRecordingAudio
              ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          {transcribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>Transcribing…</span>
            </>
          ) : isRecordingAudio ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono tabular-nums">Stop {formatTimer(audioSeconds)}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-teal-700" />
              <span>Voice</span>
            </>
          )}
        </button>

        {/* Video Record */}
        <button
          type="button"
          onClick={() => (isRecordingVideo ? stopVideoRecording(false) : startVideoRecording())}
          disabled={sending || transcribing || isRecordingAudio}
          title={isRecordingVideo ? 'Stop camera video' : 'Record camera video'}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isRecordingVideo
              ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          <Video className={`w-4 h-4 ${isRecordingVideo ? 'text-white' : 'text-teal-700'}`} />
          <span>{isRecordingVideo ? `Rec ${formatTimer(videoSeconds)}` : 'Video Record'}</span>
        </button>

        {/* Upload Video Clip */}
        <button
          type="button"
          onClick={() => videoUploadInputRef.current?.click()}
          disabled={sending || transcribing || isRecordingVideo}
          title="Upload existing video clip"
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-teal-700" />
          <span>Video File</span>
        </button>

        {/* Photo Upload */}
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={sending || transcribing}
          title="Upload specimen or field photo"
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-teal-700" />
          <span>Photo</span>
        </button>

        <button
          type="submit"
          disabled={sending || transcribing || (!input.trim() && !attachedPhoto && !attachedVideo)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching…</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </>
          )}
        </button>
      </form>

      {/* Quick-Ask Guide Prompts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-500 mr-1">Quick ask:</span>
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={sending || transcribing}
            onClick={() => submitChatQuery(q.prompt)}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-teal-700 hover:text-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {q.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {sending && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-xs text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700 shrink-0" />
          <span>
            Querying online reference databases, Wikidata, Macrostrat, PubChem, World Bank &amp; multimodal AI to prepare your answer for <strong>{resource.name}</strong>…
          </span>
        </div>
      )}

      {/* Structured Step-by-Step Conversation Responses */}
      {turns.length > 0 && (
        <div className="space-y-6 pt-2">
          {turns.map((turn) => (
            <div key={turn.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              {/* Asked Question Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  {turn.photoPreviewUrl && (
                    <img
                      src={turn.photoPreviewUrl}
                      alt="Uploaded query specimen"
                      className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  {turn.videoPreviewUrl && (
                    <video
                      src={turn.videoPreviewUrl}
                      controls
                      className="w-24 h-14 rounded-md object-cover border border-slate-200 bg-black shrink-0"
                    />
                  )}
                  <div>
                    <div className="text-[11px] font-semibold text-teal-800">Your Question</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {turn.userText}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Synced · {new Date(turn.fetchedAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Parsed 6-Step Grid or Markdown Fallback */}
              {turn.steps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {turn.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {STEP_ICONS[step.stepNumber] ?? (
                              <Globe2 className="w-4 h-4 text-teal-700 shrink-0" />
                            )}
                            <h3 className="text-xs font-bold text-slate-900">
                              Step {step.stepNumber}: {step.title}
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                            {step.audience}
                          </span>
                        </div>
                        <StepBodyRenderer content={step.content} />
                      </div>

                      {step.stepNumber === 2 && (onJumpToMap || turn.nearestOccurrences?.length) && (
                        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                turn.userLocation &&
                                turn.nearestOccurrences &&
                                turn.nearestOccurrences.length > 0 &&
                                onNearestMapResult
                              ) {
                                onNearestMapResult(turn.userLocation, turn.nearestOccurrences);
                              }
                              onJumpToMap?.();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>
                              {turn.nearestOccurrences?.length
                                ? `Plot Nearest ${resource.name} Sites & Your Location on Map ↓`
                                : 'View Exact Mapped Places on Interactive Map ↓'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-3">
                  <FocusedMarkdownRenderer content={turn.replyMarkdown} />
                  {(turn.nearestOccurrences?.length || isNearbyQuestion(turn.userText)) &&
                    (onJumpToMap || turn.nearestOccurrences?.length) && (
                      <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              turn.userLocation &&
                              turn.nearestOccurrences &&
                              turn.nearestOccurrences.length > 0 &&
                              onNearestMapResult
                            ) {
                              onNearestMapResult(turn.userLocation, turn.nearestOccurrences);
                            }
                            onJumpToMap?.();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>
                            {turn.nearestOccurrences?.length
                              ? `Plot Nearest ${resource.name} Sites & Your Location on Map ↓`
                              : 'View Exact Mapped Places on Interactive Map ↓'}
                          </span>
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* Live Web Grounding Sources */}
              {turn.groundingSources.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700">
                    Reference &amp; Grounding Citations:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {turn.groundingSources.map((src) => (
                      <a
                        key={src.url}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 hover:border-teal-700 rounded text-[11px] text-teal-800 hover:underline"
                      >
                        <span className="max-w-[220px] truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
