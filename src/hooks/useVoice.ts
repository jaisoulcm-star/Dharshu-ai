import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceState, SettingsState, VoiceStatus } from '../types';
import { POLLY_VOICES } from '../data/pollyVoices';

// Synthesize pleasant smart-speaker chime with Web Audio API
const playWakeChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Dual-tone harmonious chime (Alexa style)
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
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
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
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const hasServerPollyRef = useRef<boolean | null>(null);

  // Check once on mount if server voice credentials are present
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

  // Sync ref
  useEffect(() => {
    isListeningRef.current = voiceState.isListening;
  }, [voiceState.isListening]);

  const resetTranscript = useCallback(() => {
    setVoiceState((prev) => ({ ...prev, transcript: '', wakeWordDetected: false }));
  }, []);

  // Instant Speech Interruption
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    setVoiceState((prev) => ({
      ...prev,
      isSpeaking: false,
      status: prev.isListening ? 'listening' : prev.isThinking ? 'thinking' : 'idle',
    }));
  }, []);

  // Initialize Speech Recognition & Synthesis check
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition && 'speechSynthesis' in window;

    setVoiceState((prev) => ({
      ...prev,
      isSupported,
      activeVoiceProfile: settings.pollyVoiceId || 'Joanna',
    }));

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Set recognition language based on settings
      if (settings.languagePref === 'tamil') {
        recognition.lang = 'ta-IN';
      } else if (settings.languagePref === 'english') {
        recognition.lang = 'en-US';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => {
        setVoiceState((prev) => ({
          ...prev,
          isListening: true,
          status: 'listening',
          permissionDenied: false,
          errorMessage: undefined,
          transcript: '',
        }));
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        const rawTranscript = currentTranscript.trim();
        setVoiceState((prev) => ({ ...prev, transcript: rawTranscript }));

        // Comprehensive Wake-Word & Phonetic Pattern Matching (handles "Hey the Dharshu", "Hey, the Dharshu", etc.)
        const normalized = rawTranscript
          .toLowerCase()
          .replace(/[,.?!:;'"~-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const WAKE_PATTERNS = [
          'hey the dharshu',
          'hey the darshu',
          'hey the tharshu',
          'hey the dharshini',
          'the dharshu',
          'the darshu',
          'the tharshu',
          'hey dharshu',
          'hey darshu',
          'hey tharshu',
          'hey dashu',
          'hey dharshini',
          'hello dharshu',
          'hello darshu',
          'hi dharshu',
          'hi darshu',
          'ok dharshu',
          'ok darshu',
          'ei dharshu',
          'aei dharshu',
          'ay dharshu',
          'hey alexa',
          'alexa',
          'dharshu',
          'darshu',
          'tharshu',
          'dharshini',
          'dashu'
        ];

        const matchedWakeWord = WAKE_PATTERNS.find((w) => normalized.includes(w));

        if (matchedWakeWord && settings.wakeWordEnabled) {
          playWakeChime();
          setVoiceState((prev) => ({
            ...prev,
            wakeWordDetected: true,
            wakeWordText: matchedWakeWord,
          }));

          // If speech is currently playing, interrupt immediately
          if (settings.voiceInterruptionEnabled) {
            stopSpeaking();
          }

          // Extract query part after the matched wake phrase
          const wakeIdx = normalized.indexOf(matchedWakeWord);
          const afterWake = normalized.slice(wakeIdx + matchedWakeWord.length).trim();

          if (isFinal) {
            if (afterWake && afterWake.length > 1 && onVoiceCommand) {
              onVoiceCommand(afterWake);
            } else if (onVoiceCommand) {
              // User called Dharshu directly ("Hey, the Dharshu" / "Hey Dharshu")
              onVoiceCommand("Hey Dharshu");
            }
            try {
              recognition.stop();
            } catch {}
          }
        } else if (isFinal && rawTranscript.length > 1 && onVoiceCommand) {
          onVoiceCommand(rawTranscript);
          try {
            recognition.stop();
          } catch {}
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            status: 'idle',
            permissionDenied: true,
            errorMessage: 'Microphone permission denied. Please enable microphone access in browser settings.',
          }));
        } else if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            status: 'idle',
            errorMessage: `Voice input error: ${event.error}`,
          }));
        } else {
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            status: 'idle',
          }));
        }
      };

      recognition.onend = () => {
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          status: prev.isSpeaking ? 'speaking' : prev.isThinking ? 'thinking' : 'idle',
        }));
      };

      recognitionRef.current = recognition;
    }

    // Load Web Speech Voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [settings.languagePref, settings.wakeWordEnabled, settings.voiceInterruptionEnabled, settings.pollyVoiceId, onVoiceCommand, stopSpeaking]);

  // Start listening (with automatic speech interruption)
  const startListening = useCallback(() => {
    // Interrupt any current speech
    stopSpeaking();

    if (recognitionRef.current && !isListeningRef.current) {
      try {
        if (settings.languagePref === 'tamil') {
          recognitionRef.current.lang = 'ta-IN';
        } else if (settings.languagePref === 'english') {
          recognitionRef.current.lang = 'en-US';
        } else {
          recognitionRef.current.lang = 'en-IN';
        }

        recognitionRef.current.start();
        setVoiceState((prev) => ({
          ...prev,
          isListening: true,
          status: 'listening',
          transcript: '',
          wakeWordDetected: false,
        }));
      } catch (err: any) {
        console.warn('Failed to start recognition:', err);
      }
    }
  }, [settings.languagePref, stopSpeaking]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Failed to stop recognition:', err);
      }
    }
  }, []);

  // Text To Speech (TTS) supporting server synthesis + high-fidelity browser fallback
  const speakText = useCallback(
    async (text: string) => {
      // Clean markdown tags and URLs for natural speech delivery
      const cleanText = text
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!cleanText) return;

      // Interrupt any existing speech
      stopSpeaking();

      const selectedPollyId = settings.pollyVoiceId || 'Joanna';
      const pollyProfile = POLLY_VOICES.find((v) => v.id === selectedPollyId) || POLLY_VOICES[0];

      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: true,
        status: 'speaking',
        activeVoiceProfile: pollyProfile.name,
      }));

      // If server credentials are confirmed absent, speak immediately via natural browser profile with 0ms delay
      if (hasServerPollyRef.current === false) {
        fallbackBrowserSpeak(cleanText, selectedPollyId);
        return;
      }

      // Try server-side synthesis first
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voiceId: selectedPollyId,
            engine: pollyProfile.engine || 'neural',
          }),
        });

        const contentType = response.headers.get('content-type') || '';

        if (response.ok && contentType.includes('audio')) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
            setVoiceState((prev) => ({
              ...prev,
              isSpeaking: false,
              status: prev.isListening ? 'listening' : 'idle',
            }));
          };

          audio.onerror = () => {
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
            // Fallback to client synthesis if audio playback errors
            fallbackBrowserSpeak(cleanText, selectedPollyId);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.log('Server voice synthesis fallback to client engine:', err);
      }

      // High-Fidelity Client-side Browser Neural fallback
      fallbackBrowserSpeak(cleanText, selectedPollyId);
    },
    [settings.pollyVoiceId, settings.speechRate, settings.speechPitch, settings.preferredVoiceURI, availableVoices, stopSpeaking]
  );

  const fallbackBrowserSpeak = (cleanText: string, selectedVoiceId: string) => {
    if (!('speechSynthesis' in window)) {
      setVoiceState((prev) => ({ ...prev, isSpeaking: false, status: 'idle' }));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.05;

    // Map Polly voice profiles to browser voice signatures
    if (settings.preferredVoiceURI) {
      const chosenVoice = availableVoices.find((v) => v.voiceURI === settings.preferredVoiceURI);
      if (chosenVoice) utterance.voice = chosenVoice;
    } else {
      const pollyMatchKeywords: Record<string, string[]> = {
        Joanna: ['samantha', 'zira', 'joanna', 'victoria', 'natural', 'en-us', 'female'],
        Danielle: ['danielle', 'karen', 'fiona', 'natural', 'en-us', 'female'],
        Kendra: ['kendra', 'samantha', 'allison', 'natural', 'female'],
        Salli: ['salli', 'zira', 'ivy', 'female', 'girl'],
        Aditi: ['aditi', 'veena', 'heera', 'shruti', 'priya', 'ta-in', 'en-in', 'female'],
        Kajal: ['kajal', 'priya', 'veena', 'ta-in', 'en-in', 'female'],
        Matthew: ['matthew', 'david', 'george', 'alex', 'guy', 'male', 'en-us'],
      };

      const keywords = pollyMatchKeywords[selectedVoiceId] || ['female', 'natural', 'samantha'];

      const matchedVoice = availableVoices.find((v) =>
        keywords.some((kw) => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw))
      ) || availableVoices.find((v) => v.lang.startsWith('en')) || availableVoices[0];

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    currentUtteranceRef.current = utterance;

    utterance.onstart = () => {
      setVoiceState((prev) => ({ ...prev, isSpeaking: true, status: 'speaking' }));
    };

    utterance.onend = () => {
      currentUtteranceRef.current = null;
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        status: prev.isListening ? 'listening' : 'idle',
      }));
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      currentUtteranceRef.current = null;
      setVoiceState((prev) => ({
        ...prev,
        isSpeaking: false,
        status: prev.isListening ? 'listening' : 'idle',
      }));
    };

    window.speechSynthesis.speak(utterance);
  };

  const setThinking = useCallback((isThinking: boolean) => {
    setVoiceState((prev) => ({
      ...prev,
      isThinking,
      status: isThinking ? 'thinking' : prev.isSpeaking ? 'speaking' : prev.isListening ? 'listening' : 'idle',
    }));
  }, []);

  return {
    voiceState,
    availableVoices,
    startListening,
    stopListening,
    resetTranscript,
    speakText,
    stopSpeaking,
    setThinking,
  };
}
