import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceState, SettingsState } from '../types';
import { POLLY_VOICES } from '../data/pollyVoices';

// Shared singleton AudioContext for zero-latency wake chime synthesis
let sharedChimeAudioCtx: AudioContext | null = null;

const playWakeChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedChimeAudioCtx || sharedChimeAudioCtx.state === 'closed') {
      sharedChimeAudioCtx = new AudioContextClass();
    }
    const ctx = sharedChimeAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.14); // D6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {
    // Ignore audio context error if blocked by browser policy
  }
};

// Ordered from longest/most specific to shortest so prefix stripping is clean
const WAKE_PATTERNS = [
  'hey the dharshini',
  'hey the dharshu',
  'hey the darshu',
  'hey the tharshu',
  'hey the dashu',
  'the dharshu',
  'the darshu',
  'the tharshu',
  'the dashu',
  'hey dharshini',
  'hey darshini',
  'hey dharshu',
  'hey darshu',
  'hey tharshu',
  'hey dharsu',
  'hey darsu',
  'hey dashu',
  'hey dasu',
  'hey tashu',
  'hey dushu',
  'hey jashu',
  'hey jasa',
  'hey jaasa',
  'hey jasha',
  'hey rashu',
  'hey ashu',
  'hey the shoe',
  'hey dash',
  'hello dharshu',
  'hello darshu',
  'hello dashu',
  'hello jasa',
  'hi dharshu',
  'hi darshu',
  'hi dashu',
  'hi jasa',
  'okay dharshu',
  'okay dashu',
  'okay jasa',
  'ok dharshu',
  'ok darshu',
  'ok dashu',
  'ok jasa',
  'ei dharshu',
  'aei dharshu',
  'ay dharshu',
  'ey dashu',
  'eh dashu',
  'a dashu',
  'hey alexa',
  'ஹே தர்ஷு',
  'ஹே டஷு',
  'வணக்கம் தர்ஷு',
  'தர்ஷு',
  'டஷு',
  'dharshini',
  'darshini',
  'dharshu',
  'darshu',
  'tharshu',
  'dharsu',
  'darsu',
  'dashu',
  'dasu',
  'tashu',
  'jasa',
  'jaasa',
  'jasha',
  'alexa',
];

// Pre-compiled wake regexes for fast O(1) matching per pattern without re-instantiating RegExp on every interim speech frame
const COMPILED_WAKE_PATTERNS = WAKE_PATTERNS.map((pattern) => {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    pattern,
    lowerPattern: pattern.toLowerCase(),
    regex: new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i'),
  };
});

const MALE_VOICE_NAMES = [
  'alex',
  'daniel',
  'fred',
  'rishi',
  'oliver',
  'aaron',
  'arthur',
  'albert',
  'bruce',
  'junior',
  'ralph',
  'thomas',
  'jorge',
  'yuri',
  'xander',
  'reed',
  'rocko',
  'eddy',
  'grandpa',
  'david',
  'mark',
  'george',
  'james',
  'richard',
  'guy',
];

// Client-side LRU cache for TTS Audio Blobs (up to 40 entries) for instant 0ms playback on repeated phrases
const clientTtsBlobCache = new Map<string, Blob>();
const MAX_CLIENT_TTS_CACHE = 40;

function getCachedClientAudioBlob(key: string): Blob | undefined {
  const blob = clientTtsBlobCache.get(key);
  if (blob) {
    clientTtsBlobCache.delete(key);
    clientTtsBlobCache.set(key, blob);
  }
  return blob;
}

function setCachedClientAudioBlob(key: string, blob: Blob) {
  if (clientTtsBlobCache.size >= MAX_CLIENT_TTS_CACHE) {
    const oldest = clientTtsBlobCache.keys().next().value;
    if (oldest) clientTtsBlobCache.delete(oldest);
  }
  clientTtsBlobCache.set(key, blob);
}

function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,.?!:;'"~`\-()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findWakeWordAndExtractCommand(rawText: string): {
  matchedWakeWord: string | null;
  commandAfterWake: string;
} {
  const normalized = normalizeSpeechText(rawText);
  if (!normalized) {
    return { matchedWakeWord: null, commandAfterWake: '' };
  }

  for (const { pattern, lowerPattern, regex } of COMPILED_WAKE_PATTERNS) {
    const match = regex.exec(normalized);
    if (match) {
      const idx = match.index + match[0].indexOf(lowerPattern);
      const after = normalized.slice(idx + pattern.length).trim();
      return {
        matchedWakeWord: pattern,
        commandAfterWake: after,
      };
    }
  }

  return { matchedWakeWord: null, commandAfterWake: '' };
}

// Clean and format text for smooth, expressive, stutter-free speech
export function prepareTextForNaturalSpeech(rawText: string): string {
  return rawText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_~>|]/g, '')
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/;/g, ',')
    .replace(/\.{2,}/g, '... ')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Automatically compute natural speaking speed based on sentence length, emotion, and script
export function computeDynamicSpeakingRate(text: string, baseRate = 1.0): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  const isQuestion = text.trim().endsWith('?');
  const isExclamation = text.trim().endsWith('!');
  const isGentleOrPoetic = /\b(sorry|breathe|relax|calm|okay|sleep|dream|kavithai|heart|feel)\b/i.test(text);

  let multiplier = 1.0;

  if (hasTamil) {
    multiplier *= 0.96;
  } else if (isGentleOrPoetic) {
    multiplier *= 0.95;
  } else if (wordCount <= 7 && (isQuestion || isExclamation)) {
    multiplier *= 0.98;
  } else if (wordCount > 35) {
    multiplier *= 1.03;
  }

  const finalRate = baseRate * multiplier;
  return Math.max(0.75, Math.min(1.35, Number(finalRate.toFixed(2))));
}

// Split text into conversational sentences for expressive prosody and fast first-chunk TTS pipelining
function splitIntoConversationalSentences(text: string, maxChunkChars = 180): string[] {
  const rawChunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const sentences: string[] = [];
  let buffer = '';

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    // Keep the very first sentence short so first-byte audio plays as fast as possible
    const limit = sentences.length === 0 ? Math.min(130, maxChunkChars) : maxChunkChars;
    if (buffer && (buffer + ' ' + trimmed).length <= limit) {
      buffer = buffer + ' ' + trimmed;
    } else {
      if (buffer) sentences.push(buffer);
      buffer = trimmed;
    }
  }
  if (buffer) sentences.push(buffer);
  return sentences.length > 0 ? sentences : [text];
}

export function useVoice(
  settings: SettingsState,
  onVoiceCommand?: (command: string) => void
) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    status: 'idle',
    isListening: false,
    isSpeaking: false,
    isThinking: false,
    isSupported: false,
    permissionDenied: false,
    transcript: '',
    activeVoiceProfile: settings.pollyVoiceId || 'Joanna',
    audioVolume: 0,
    wakeWordDetected: false,
    isWakeWordStandby: false,
    isCommandListening: false,
    micActive: false,
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef<boolean>(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAbortControllerRef = useRef<AbortController | null>(null);

  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const isCommandListeningRef = useRef<boolean>(false);
  const permissionDeniedRef = useRef<boolean>(false);
  const userStoppedManuallyRef = useRef<boolean>(false);
  const hasServerPollyRef = useRef<boolean | null>(null);

  const lastWakeTriggerTimeRef = useRef<number>(0);
  const lastProcessedFinalResultRef = useRef<string>('');
  const lastProcessedFinalTimeRef = useRef<number>(0);
  const wakeGreetingTimerRef = useRef<number | null>(null);
  const interimSilenceTimerRef = useRef<number | null>(null);
  const commandWindowTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeRafRef = useRef<number | null>(null);
  const lastReportedVolumeRef = useRef<number>(0);

  const settingsRef = useRef<SettingsState>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const onVoiceCommandRef = useRef(onVoiceCommand);
  useEffect(() => {
    onVoiceCommandRef.current = onVoiceCommand;
  }, [onVoiceCommand]);

  // Check once on mount if server neural TTS credentials are present
  useEffect(() => {
    fetch('/api/tts/voices')
      .then((r) => r.json())
      .then((data) => {
        hasServerPollyRef.current = !!data.hasServerCredentials;
      })
      .catch(() => {
        hasServerPollyRef.current = false;
      });
  }, []);

  // Load Web Speech Synthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Select the most natural, soft, warm female voice available on macOS Chrome
  const selectBestVoice = useCallback(
    (text: string, selectedVoiceId: string): SpeechSynthesisVoice | null => {
      const voices =
        availableVoices.length > 0
          ? availableVoices
          : 'speechSynthesis' in window
          ? window.speechSynthesis.getVoices()
          : [];

      if (!voices || voices.length === 0) return null;

      if (settingsRef.current.preferredVoiceURI) {
        const custom = voices.find((v) => v.voiceURI === settingsRef.current.preferredVoiceURI);
        if (custom) return custom;
      }

      const hasTamilScript = /[\u0B80-\u0BFF]/.test(text);
      if (hasTamilScript) {
        const tamilFemale =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('ta') &&
              !MALE_VOICE_NAMES.some((m) => v.name.toLowerCase().includes(m))
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('ta')) ||
          voices.find(
            (v) =>
              v.lang.toLowerCase() === 'en-in' &&
              !MALE_VOICE_NAMES.some((m) => v.name.toLowerCase().includes(m))
          );
        if (tamilFemale) return tamilFemale;
      }

      if (selectedVoiceId === 'Matthew') {
        return (
          voices.find((v) =>
            ['matthew', 'alex', 'daniel', 'david', 'google us english', 'male'].some((k) =>
              v.name.toLowerCase().includes(k)
            )
          ) || voices[0]
        );
      }

      const femaleVoices = voices.filter(
        (v) => !MALE_VOICE_NAMES.some((maleName) => v.name.toLowerCase().includes(maleName))
      );

      const profilePriority: Record<string, string[]> = {
        Joanna: [
          'samantha (enhanced)',
          'ava (premium)',
          'ava',
          'samantha',
          'allison',
          'lekha',
          'google us english',
          'victoria',
          'karen',
          'zira',
        ],
        Danielle: ['ava', 'samantha', 'karen', 'danielle', 'fiona', 'google us english', 'victoria'],
        Kendra: ['allison', 'samantha', 'kendra', 'google us english', 'victoria'],
        Salli: ['victoria', 'samantha', 'salli', 'tessa', 'lekha'],
        Aditi: ['lekha', 'veena', 'vani', 'aditi', 'samantha', 'ava'],
        Kajal: ['lekha', 'veena', 'kajal', 'samantha', 'ava'],
      };

      const preferredNames = profilePriority[selectedVoiceId] || profilePriority.Joanna;

      for (const keyword of preferredNames) {
        const match = femaleVoices.find(
          (v) =>
            (v.lang.toLowerCase().startsWith('en') ||
              v.lang.toLowerCase().startsWith('ta') ||
              v.lang.toLowerCase().startsWith('hi')) &&
            (v.name.toLowerCase().includes(keyword) || v.voiceURI.toLowerCase().includes(keyword))
        );
        if (match) return match;
      }

      const englishFemale =
        femaleVoices.find((v) => v.lang.toLowerCase() === 'en-in') ||
        femaleVoices.find((v) => v.lang.toLowerCase() === 'en-us' && v.localService) ||
        femaleVoices.find((v) => v.lang.toLowerCase().startsWith('en'));

      return englishFemale || femaleVoices[0] || voices[0];
    },
    [availableVoices]
  );

  // Start Web Audio volume meter from MediaStream (throttled to avoid unnecessary React re-renders)
  const startAudioLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;

      const updateVolume = (timestamp: number) => {
        if (!analyserRef.current) return;
        if (timestamp - lastUpdate > 110) {
          lastUpdate = timestamp;
          if (isSpeakingRef.current) {
            if (lastReportedVolumeRef.current !== 0) {
              lastReportedVolumeRef.current = 0;
              setVoiceState((prev) => (prev.audioVolume === 0 ? prev : { ...prev, audioVolume: 0 }));
            }
          } else {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalizedVol = Math.min(100, Math.round((avg / 90) * 100));

            // Only update React state if volume changed significantly (>= 4 units) or settled to 0
            if (
              Math.abs(normalizedVol - lastReportedVolumeRef.current) >= 4 ||
              (normalizedVol === 0 && lastReportedVolumeRef.current !== 0)
            ) {
              lastReportedVolumeRef.current = normalizedVol;
              setVoiceState((prev) =>
                prev.audioVolume === normalizedVol ? prev : { ...prev, audioVolume: normalizedVol }
              );
            }
          }
        }
        volumeRafRef.current = requestAnimationFrame(updateVolume);
      };

      if (volumeRafRef.current) cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = requestAnimationFrame(updateVolume);
    } catch {
      // Ignore Web Audio analyser errors
    }
  }, []);

  // Request microphone permission via MediaDevices API
  const ensureMicrophoneAccess = useCallback(async (silent = false): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!silent) {
        setVoiceState((prev) => ({
          ...prev,
          errorMessage: 'MediaDevices microphone API is not supported in this browser. Please use Google Chrome.',
        }));
      }
      return false;
    }

    if (
      mediaStreamRef.current &&
      mediaStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live')
    ) {
      permissionDeniedRef.current = false;
      setVoiceState((prev) =>
        prev.micActive && !prev.permissionDenied
          ? prev
          : {
              ...prev,
              permissionDenied: false,
              micActive: true,
              errorMessage: undefined,
            }
      );
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      permissionDeniedRef.current = false;
      startAudioLevelMeter(stream);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          mediaStreamRef.current = null;
          setVoiceState((prev) => ({
            ...prev,
            micActive: false,
            errorMessage: 'Microphone was disconnected or interrupted. Reconnecting...',
          }));
        };
      }

      setVoiceState((prev) => ({
        ...prev,
        permissionDenied: false,
        micActive: true,
        errorMessage: undefined,
      }));
      return true;
    } catch (err: any) {
      const errName = err?.name || '';
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission')
      ) {
        permissionDeniedRef.current = true;
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isWakeWordStandby: false,
          isCommandListening: false,
          micActive: false,
          status: 'idle',
          permissionDenied: true,
          errorMessage:
            'Microphone access was denied. Click the site settings icon in your Chrome address bar, allow Microphone permission, and click "Talk Now" to resume.',
        }));
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setVoiceState((prev) => ({
          ...prev,
          micActive: false,
          status: 'idle',
          errorMessage: silent
            ? undefined
            : 'No microphone was found on your MacBook. Please check your audio input settings.',
        }));
      } else {
        setVoiceState((prev) => ({
          ...prev,
          micActive: false,
          errorMessage: silent
            ? undefined
            : `Microphone error: ${err?.message || 'Unable to access microphone'}`,
        }));
      }
      return false;
    }
  }, [startAudioLevelMeter]);

  // Safely start SpeechRecognition if not speaking/thinking
  const safeStartRecognition = useCallback(() => {
    if (
      !recognitionRef.current ||
      isRecognitionRunningRef.current ||
      isSpeakingRef.current ||
      isThinkingRef.current ||
      permissionDeniedRef.current ||
      document.visibilityState === 'hidden'
    ) {
      return;
    }

    try {
      const pref = settingsRef.current.languagePref;
      if (pref === 'tamil') {
        recognitionRef.current.lang = 'ta-IN';
      } else if (pref === 'english') {
        recognitionRef.current.lang = 'en-US';
      } else {
        recognitionRef.current.lang = 'en-IN';
      }

      recognitionRef.current.start();
      isRecognitionRunningRef.current = true;
    } catch (err: any) {
      if (err?.name === 'InvalidStateError') {
        isRecognitionRunningRef.current = true;
      }
    }
  }, []);

  // Safely pause SpeechRecognition while speaking or thinking so assistant never hears itself
  const pauseRecognitionForSpeech = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current && isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      isRecognitionRunningRef.current = false;
    }
  }, []);

  // Schedule transition from Active Command Mode back to Wake-Word Standby after silence
  const resetCommandWindowTimer = useCallback((durationMs = 14000) => {
    if (commandWindowTimerRef.current) {
      window.clearTimeout(commandWindowTimerRef.current);
    }
    commandWindowTimerRef.current = window.setTimeout(() => {
      if (!isSpeakingRef.current && !isThinkingRef.current) {
        isCommandListeningRef.current = false;
        setVoiceState((prev) => ({
          ...prev,
          isCommandListening: false,
          isListening: false,
          wakeWordDetected: false,
          transcript: '',
          status: 'idle',
          isWakeWordStandby: settingsRef.current.wakeWordEnabled && !userStoppedManuallyRef.current,
        }));
      }
    }, durationMs);
  }, []);

  // Resume listening rapidly after AI finishes speaking (220ms echo tail buffer)
  const resumeListeningAfterSpeech = useCallback(() => {
    window.setTimeout(() => {
      isSpeakingRef.current = false;

      if (userStoppedManuallyRef.current && !settingsRef.current.wakeWordEnabled) {
        setVoiceState((prev) => ({
          ...prev,
          isSpeaking: false,
          isListening: false,
          isCommandListening: false,
          isWakeWordStandby: false,
          status: 'idle',
        }));
        return;
      }

      userStoppedManuallyRef.current = false;
      isCommandListeningRef.current = true;
      resetCommandWindowTimer(15000);

      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        isListening: true,
        isCommandListening: true,
        isWakeWordStandby: settingsRef.current.wakeWordEnabled,
        status: 'listening',
        transcript: '',
      }));

      safeStartRecognition();
    }, 220);
  }, [resetCommandWindowTimer, safeStartRecognition]);

  // Instant Speech Interruption
  const stopSpeaking = useCallback(() => {
    if (wakeGreetingTimerRef.current) {
      window.clearTimeout(wakeGreetingTimerRef.current);
      wakeGreetingTimerRef.current = null;
    }
    if (speechAbortControllerRef.current) {
      speechAbortControllerRef.current.abort(new DOMException('Speech interrupted', 'AbortError'));
      speechAbortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    isSpeakingRef.current = false;

    const shouldListen = settingsRef.current.wakeWordEnabled || isCommandListeningRef.current;
    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: false,
      isListening: isCommandListeningRef.current,
      status: isCommandListeningRef.current
        ? 'listening'
        : prev.isThinking
        ? 'thinking'
        : 'idle',
    }));

    if (shouldListen && !isThinkingRef.current) {
      window.setTimeout(() => {
        safeStartRecognition();
      }, 150);
    }
  }, [safeStartRecognition]);

  // Expressive client-side multi-sentence speech synthesis fallback
  const speakWithExpressiveBrowserFallback = useCallback(
    (cleanText: string, selectedVoiceId: string, onComplete: () => void) => {
      if (!('speechSynthesis' in window)) {
        onComplete();
        return;
      }

      window.speechSynthesis.cancel();
      const sentences = splitIntoConversationalSentences(cleanText, 180);
      let currentIdx = 0;

      const speakNextSentence = () => {
        if (!isSpeakingRef.current || currentIdx >= sentences.length) {
          currentUtteranceRef.current = null;
          onComplete();
          return;
        }

        const sentence = sentences[currentIdx++];
        const utterance = new SpeechSynthesisUtterance(sentence);

        const baseRate = settingsRef.current.speechRate || 1.0;
        const basePitch = settingsRef.current.speechPitch || 1.05;

        const dynamicRate = computeDynamicSpeakingRate(sentence, baseRate);
        let dynamicPitch = basePitch;
        if (sentence.endsWith('?')) {
          dynamicPitch = Math.min(1.3, basePitch + 0.04);
        } else if (sentence.endsWith('!')) {
          dynamicPitch = Math.min(1.3, basePitch + 0.03);
        } else if (currentIdx % 2 === 0) {
          dynamicPitch = Math.max(0.85, basePitch - 0.02);
        }

        utterance.rate = dynamicRate;
        utterance.pitch = Number(dynamicPitch.toFixed(2));

        const matchedVoice = selectBestVoice(sentence, selectedVoiceId);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang;
        }

        currentUtteranceRef.current = utterance;

        utterance.onstart = () => {
          isSpeakingRef.current = true;
          pauseRecognitionForSpeech();
          setVoiceState((prev) => ({
            ...prev,
            isSpeaking: true,
            isListening: false,
            status: 'speaking',
          }));
        };

        utterance.onend = () => {
          if (isSpeakingRef.current && currentIdx < sentences.length) {
            speakNextSentence();
          } else {
            currentUtteranceRef.current = null;
            onComplete();
          }
        };

        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          onComplete();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNextSentence();
    },
    [pauseRecognitionForSpeech, selectBestVoice]
  );

  // Fetch a single TTS audio chunk with client-side Blob caching
  const fetchTtsChunkBlob = useCallback(
    async (
      chunkText: string,
      voiceId: string,
      personality: string,
      engine: string,
      signal: AbortSignal
    ): Promise<Blob | null> => {
      const cacheKey = `${voiceId}:${personality}:${chunkText}`;
      const cachedBlob = getCachedClientAudioBlob(cacheKey);
      if (cachedBlob) return cachedBlob;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chunkText,
          voiceId,
          personality,
          engine,
        }),
        signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('audio')) {
        const blob = await response.blob();
        setCachedClientAudioBlob(cacheKey, blob);
        return blob;
      }
      return null;
    },
    []
  );

  // High-Speed Pipelined Neural Text To Speech (plays first sentence immediately while pre-fetching remaining chunks in parallel)
  const speakText = useCallback(
    async (text: string) => {
      if (!settingsRef.current.voiceEnabled) {
        resumeListeningAfterSpeech();
        return;
      }

      const cleanText = prepareTextForNaturalSpeech(text);
      if (!cleanText) {
        resumeListeningAfterSpeech();
        return;
      }

      if (speechAbortControllerRef.current) {
        speechAbortControllerRef.current.abort(new DOMException('New speech started', 'AbortError'));
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      isSpeakingRef.current = true;
      isThinkingRef.current = false;
      pauseRecognitionForSpeech();

      const selectedPollyId = settingsRef.current.pollyVoiceId || 'Joanna';
      const pollyProfile = POLLY_VOICES.find((v) => v.id === selectedPollyId) || POLLY_VOICES[0];
      const personality = settingsRef.current.personality || 'friendly';

      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: true,
        isListening: false,
        isThinking: false,
        status: 'speaking',
        activeVoiceProfile: pollyProfile.name,
        audioVolume: 0,
      }));

      if (hasServerPollyRef.current === false) {
        speakWithExpressiveBrowserFallback(cleanText, selectedPollyId, resumeListeningAfterSpeech);
        return;
      }

      const abortController = new AbortController();
      speechAbortControllerRef.current = abortController;

      try {
        // Split longer responses into 1st sentence + remaining chunks so audio starts playing in half the time!
        const chunks =
          cleanText.length > 150
            ? splitIntoConversationalSentences(cleanText, 240)
            : [cleanText];

        // Kick off parallel pre-fetch promises for all chunks simultaneously
        const chunkPromises = chunks.map((chunk) =>
          fetchTtsChunkBlob(
            chunk,
            selectedPollyId,
            personality,
            pollyProfile.engine || 'neural',
            abortController.signal
          )
        );

        for (let i = 0; i < chunks.length; i++) {
          if (!isSpeakingRef.current || abortController.signal.aborted) {
            return;
          }

          const blob = await chunkPromises[i];
          if (!isSpeakingRef.current || abortController.signal.aborted) {
            return;
          }

          if (!blob) {
            // If server chunk failed, speak remaining chunks with browser fallback
            const remainingText = chunks.slice(i).join(' ');
            speakWithExpressiveBrowserFallback(
              remainingText,
              selectedPollyId,
              resumeListeningAfterSpeech
            );
            return;
          }

          await new Promise<void>((resolve, reject) => {
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            const dynamicRate = computeDynamicSpeakingRate(
              chunks[i],
              settingsRef.current.speechRate || 1.0
            );
            audio.playbackRate = dynamicRate;
            if ('preservesPitch' in audio) {
              (audio as any).preservesPitch = true;
            }

            currentAudioRef.current = audio;

            audio.onended = () => {
              currentAudioRef.current = null;
              URL.revokeObjectURL(audioUrl);
              resolve();
            };

            audio.onerror = (e) => {
              currentAudioRef.current = null;
              URL.revokeObjectURL(audioUrl);
              reject(e);
            };

            audio.play().catch((err) => {
              currentAudioRef.current = null;
              URL.revokeObjectURL(audioUrl);
              reject(err);
            });
          });
        }

        if (isSpeakingRef.current && !abortController.signal.aborted) {
          resumeListeningAfterSpeech();
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError' || !isSpeakingRef.current) {
          return;
        }
      }

      if (isSpeakingRef.current) {
        speakWithExpressiveBrowserFallback(cleanText, selectedPollyId, resumeListeningAfterSpeech);
      }
    },
    [
      fetchTtsChunkBlob,
      pauseRecognitionForSpeech,
      resumeListeningAfterSpeech,
      speakWithExpressiveBrowserFallback,
    ]
  );

  // Speak a brief warm wake acknowledgment when user says ONLY "Hey Dashu" or "Jasa" and pauses
  const speakWakeAcknowledgment = useCallback(() => {
    const ackPhrase =
      settingsRef.current.languagePref === 'tamil'
        ? 'சொல்லுங்க, நான் கேட்டுட்டு இருக்கேன்!'
        : settingsRef.current.languagePref === 'tanglish'
        ? 'Sollu, naan inga dhaan irukken! Enna matter?'
        : "Hi! I'm listening, tell me how I can help.";

    speakText(ackPhrase);
  }, [speakText]);

  // Setup SpeechRecognition instance & continuous wake-word lifecycle
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition && 'speechSynthesis' in window;

    setVoiceState((prev) => ({
      ...prev,
      isSupported,
      activeVoiceProfile:
        POLLY_VOICES.find((v) => v.id === (settings.pollyVoiceId || 'Joanna'))?.name ||
        'Dharshu (Kore Neural)',
      errorMessage: isSupported
        ? prev.errorMessage
        : 'Web Speech API is not supported in this browser. Please open this page in Google Chrome on macOS.',
    }));

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    if (settings.languagePref === 'tamil') {
      recognition.lang = 'ta-IN';
    } else if (settings.languagePref === 'english') {
      recognition.lang = 'en-US';
    } else {
      recognition.lang = 'en-IN';
    }

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
      permissionDeniedRef.current = false;
      setVoiceState((prev) => ({
        ...prev,
        permissionDenied: false,
        micActive: true,
        isWakeWordStandby: settingsRef.current.wakeWordEnabled && !userStoppedManuallyRef.current,
        isListening: isCommandListeningRef.current,
        isCommandListening: isCommandListeningRef.current,
        status: isSpeakingRef.current
          ? 'speaking'
          : isThinkingRef.current
          ? 'thinking'
          : isCommandListeningRef.current
          ? 'listening'
          : 'idle',
      }));
    };

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current || isThinkingRef.current) {
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';
      const allAlternativesText: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const primaryTranscript = res[0]?.transcript || '';

        for (let a = 0; a < res.length; a++) {
          if (res[a]?.transcript) {
            allAlternativesText.push(res[a].transcript);
          }
        }

        if (res.isFinal) {
          finalTranscript += primaryTranscript + ' ';
        } else {
          interimTranscript += primaryTranscript;
        }
      }

      const combinedRaw = (finalTranscript || interimTranscript).trim();
      if (!combinedRaw) return;

      if (wakeGreetingTimerRef.current) {
        window.clearTimeout(wakeGreetingTimerRef.current);
        wakeGreetingTimerRef.current = null;
      }
      if (interimSilenceTimerRef.current) {
        window.clearTimeout(interimSilenceTimerRef.current);
        interimSilenceTimerRef.current = null;
      }

      const dispatchRecognizedCommand = (cmdText: string) => {
        const cleanCmd = cmdText.trim();
        const dispatchTime = Date.now();
        if (
          cleanCmd.length > 1 &&
          (cleanCmd !== lastProcessedFinalResultRef.current ||
            dispatchTime - lastProcessedFinalTimeRef.current > 1800)
        ) {
          lastProcessedFinalResultRef.current = cleanCmd;
          lastProcessedFinalTimeRef.current = dispatchTime;

          isThinkingRef.current = true;
          pauseRecognitionForSpeech();

          setVoiceState((prev) => ({
            ...prev,
            transcript: '',
            isListening: false,
            isThinking: true,
            status: 'thinking',
          }));

          if (onVoiceCommandRef.current) {
            onVoiceCommandRef.current(cleanCmd);
          }
        }
      };

      let wakeMatch = findWakeWordAndExtractCommand(combinedRaw);
      if (!wakeMatch.matchedWakeWord) {
        for (const alt of allAlternativesText) {
          const altMatch = findWakeWordAndExtractCommand(alt);
          if (altMatch.matchedWakeWord) {
            wakeMatch = altMatch;
            break;
          }
        }
      }

      const now = Date.now();
      const wakeCooldownPassed = now - lastWakeTriggerTimeRef.current > 2200;

      // 1. Wake word ("Hey Darshu" / "Hey Dashu" / "Jasa") detected!
      if (wakeMatch.matchedWakeWord && settingsRef.current.wakeWordEnabled) {
        if (!isCommandListeningRef.current || wakeCooldownPassed) {
          if (wakeCooldownPassed) {
            lastWakeTriggerTimeRef.current = now;
            playWakeChime();
          }
          isCommandListeningRef.current = true;
          resetCommandWindowTimer(15000);

          setVoiceState((prev) => ({
            ...prev,
            isListening: true,
            isCommandListening: true,
            status: 'listening',
            wakeWordDetected: true,
            wakeWordText: wakeMatch.matchedWakeWord || 'Hey Darshu',
            transcript: wakeMatch.commandAfterWake || combinedRaw,
            errorMessage: undefined,
          }));
        }

        const commandAfterWake = wakeMatch.commandAfterWake.trim();
        if (finalTranscript.trim()) {
          if (commandAfterWake && commandAfterWake.length > 1) {
            dispatchRecognizedCommand(commandAfterWake);
          } else {
            wakeGreetingTimerRef.current = window.setTimeout(() => {
              if (!isSpeakingRef.current && !isThinkingRef.current) {
                speakWakeAcknowledgment();
              }
            }, 380);
          }
        } else if (commandAfterWake && commandAfterWake.length > 2) {
          // Auto-commit if Chrome keeps interim transcript open after 1200ms of silence
          interimSilenceTimerRef.current = window.setTimeout(() => {
            if (!isSpeakingRef.current && !isThinkingRef.current) {
              dispatchRecognizedCommand(commandAfterWake);
            }
          }, 1200);
        }
        return;
      }

      // 2. Active Command Listening Mode (after "Hey Darshu", clicking Talk, or follow-up turn)
      if (isCommandListeningRef.current) {
        resetCommandWindowTimer(15000);
        setVoiceState((prev) =>
          prev.transcript === combinedRaw && prev.isListening
            ? prev
            : {
                ...prev,
                transcript: combinedRaw,
                isListening: true,
                status: 'listening',
              }
        );

        if (finalTranscript.trim()) {
          dispatchRecognizedCommand(finalTranscript);
        } else if (interimTranscript.trim().length > 2) {
          const pendingInterim = interimTranscript.trim();
          interimSilenceTimerRef.current = window.setTimeout(() => {
            if (!isSpeakingRef.current && !isThinkingRef.current && isCommandListeningRef.current) {
              dispatchRecognizedCommand(pendingInterim);
            }
          }, 1200);
        }
      }
    };

    recognition.onerror = (event: any) => {
      const errorType = event?.error;

      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        isRecognitionRunningRef.current = false;
        permissionDeniedRef.current = true;
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isCommandListening: false,
          isWakeWordStandby: false,
          micActive: false,
          status: 'idle',
          permissionDenied: true,
          errorMessage:
            'Microphone permission denied. Please allow microphone access in Chrome address bar settings.',
        }));
      } else if (errorType === 'audio-capture') {
        isRecognitionRunningRef.current = false;
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          micActive: false,
          status: 'idle',
          errorMessage: 'Microphone unavailable or in use by another application.',
        }));
      } else if (errorType === 'network') {
        isRecognitionRunningRef.current = false;
        setVoiceState((prev) => ({
          ...prev,
          errorMessage: 'Speech recognition network hiccup. Reconnecting automatically...',
        }));
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;

      const shouldKeepListening =
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !permissionDeniedRef.current &&
        document.visibilityState === 'visible' &&
        ((settingsRef.current.wakeWordEnabled && !userStoppedManuallyRef.current) ||
          isCommandListeningRef.current);

      if (shouldKeepListening) {
        if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          safeStartRecognition();
        }, 120);
      } else if (!isSpeakingRef.current && !isThinkingRef.current) {
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isCommandListening: false,
          status: 'idle',
        }));
      }
    };

    recognitionRef.current = recognition;

    if (settings.wakeWordEnabled && !userStoppedManuallyRef.current) {
      ensureMicrophoneAccess(true).then((granted) => {
        if (granted) {
          safeStartRecognition();
        }
      });
    }

    return () => {
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      if (wakeGreetingTimerRef.current) window.clearTimeout(wakeGreetingTimerRef.current);
      try {
        recognition.abort();
      } catch {}
      isRecognitionRunningRef.current = false;
    };
  }, [
    settings.languagePref,
    settings.wakeWordEnabled,
    settings.pollyVoiceId,
    ensureMicrophoneAccess,
    pauseRecognitionForSpeech,
    resetCommandWindowTimer,
    safeStartRecognition,
    speakWakeAcknowledgment,
  ]);

  // Handle browser tab visibility changes and unlock on first user gesture if Chrome deferred mic startup
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseRecognitionForSpeech();
      } else if (
        document.visibilityState === 'visible' &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !permissionDeniedRef.current &&
        (settingsRef.current.wakeWordEnabled || isCommandListeningRef.current) &&
        !userStoppedManuallyRef.current
      ) {
        ensureMicrophoneAccess(true).then((ok) => {
          if (ok) safeStartRecognition();
        });
      }
    };

    const handleFirstUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      if (
        settingsRef.current.wakeWordEnabled &&
        !isRecognitionRunningRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !permissionDeniedRef.current &&
        !userStoppedManuallyRef.current
      ) {
        ensureMicrophoneAccess(true).then((ok) => {
          if (ok) safeStartRecognition();
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleFirstUserGesture, { passive: true });
    window.addEventListener('keydown', handleFirstUserGesture, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
    };
  }, [ensureMicrophoneAccess, pauseRecognitionForSpeech, safeStartRecognition]);

  // Cleanup media stream and audio context on unmount
  useEffect(() => {
    return () => {
      if (volumeRafRef.current) cancelAnimationFrame(volumeRafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const resetTranscript = useCallback(() => {
    setVoiceState((prev) => ({ ...prev, transcript: '', wakeWordDetected: false }));
  }, []);

  // Explicitly start active command listening
  const startListening = useCallback(async () => {
    stopSpeaking();
    userStoppedManuallyRef.current = false;

    const hasMic = await ensureMicrophoneAccess();
    if (!hasMic) return;

    playWakeChime();
    isCommandListeningRef.current = true;
    resetCommandWindowTimer(15000);

    setVoiceState((prev) => ({
      ...prev,
      isListening: true,
      isCommandListening: true,
      isWakeWordStandby: settingsRef.current.wakeWordEnabled,
      status: 'listening',
      transcript: '',
      wakeWordDetected: true,
      errorMessage: undefined,
    }));

    safeStartRecognition();
  }, [ensureMicrophoneAccess, resetCommandWindowTimer, safeStartRecognition, stopSpeaking]);

  // Stop active command listening
  const stopListening = useCallback(() => {
    if (commandWindowTimerRef.current) {
      window.clearTimeout(commandWindowTimerRef.current);
      commandWindowTimerRef.current = null;
    }

    isCommandListeningRef.current = false;

    if (!settingsRef.current.wakeWordEnabled) {
      userStoppedManuallyRef.current = true;
      pauseRecognitionForSpeech();
    }

    setVoiceState((prev) => ({
      ...prev,
      isListening: false,
      isCommandListening: false,
      isWakeWordStandby: settingsRef.current.wakeWordEnabled && !userStoppedManuallyRef.current,
      status: prev.isSpeaking ? 'speaking' : prev.isThinking ? 'thinking' : 'idle',
      transcript: '',
      wakeWordDetected: false,
    }));
  }, [pauseRecognitionForSpeech]);

  // Privacy control: completely stop microphone listening and hardware audio stream
  const muteMicrophoneCompletely = useCallback(() => {
    userStoppedManuallyRef.current = true;
    isCommandListeningRef.current = false;
    pauseRecognitionForSpeech();

    if (commandWindowTimerRef.current) {
      window.clearTimeout(commandWindowTimerRef.current);
      commandWindowTimerRef.current = null;
    }
    if (volumeRafRef.current) {
      cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setVoiceState((prev) => ({
      ...prev,
      isListening: false,
      isCommandListening: false,
      isWakeWordStandby: false,
      micActive: false,
      audioVolume: 0,
      status: prev.isSpeaking ? 'speaking' : prev.isThinking ? 'thinking' : 'idle',
      transcript: '',
      wakeWordDetected: false,
    }));
  }, [pauseRecognitionForSpeech]);

  // Sync AI thinking state with voice engine
  const setThinking = useCallback(
    (isThinking: boolean) => {
      isThinkingRef.current = isThinking;
      if (isThinking) {
        pauseRecognitionForSpeech();
      }
      setVoiceState((prev) => ({
        ...prev,
        isThinking,
        status: isThinking
          ? 'thinking'
          : prev.isSpeaking
          ? 'speaking'
          : isCommandListeningRef.current
          ? 'listening'
          : 'idle',
      }));
    },
    [pauseRecognitionForSpeech]
  );

  return {
    voiceState,
    availableVoices,
    startListening,
    stopListening,
    muteMicrophoneCompletely,
    resetTranscript,
    speakText,
    stopSpeaking,
    setThinking,
    ensureMicrophoneAccess,
  };
}
