import React, { useState, useRef } from 'react';
import { X, Volume2, Globe, Sparkles, Moon, Sun, Trash2, Sliders, Smartphone, Play, Check, Zap, Radio, AudioLines } from 'lucide-react';
import { SettingsState, PersonalityMode, LanguagePref } from '../types';
import { PersonalitySelector } from './PersonalitySelector';
import { POLLY_VOICES } from '../data/pollyVoices';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  onClearHistory: () => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearHistory,
  availableVoices,
}) => {
  const [activeTab, setActiveTab] = useState<'persona' | 'voice' | 'alexa' | 'language' | 'appearance'>('alexa');
  const [testPlaying, setTestPlaying] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleTestVoice = async (voiceId: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setTestPlaying(voiceId);

    const testPhrase =
      settings.languagePref === 'tamil'
        ? 'வணக்கம்! நான் தர்ஷு, உங்களுடன் அன்பாக பேசவும் உதவவும் எப்போதும் தயாராக இருக்கிறேன்.'
        : settings.languagePref === 'tanglish'
        ? 'Hi! Naan dhaan unga Dharshu. Epdi irukkeenga? Enna vishayam sollu, namma jolly-ah pesalam!'
        : "Hi there! I'm Dharshu, your warm and friendly AI companion. Just say Hey Dashu anytime you want to talk!";

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testPhrase,
          voiceId,
          personality: settings.personality || 'friendly',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = settings.speechRate || 1.0;
        previewAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          previewAudioRef.current = null;
          setTestPlaying(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          previewAudioRef.current = null;
          setTestPlaying(null);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser synthesis below
    }

    if (!('speechSynthesis' in window)) {
      setTestPlaying(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.05;

    const voiceMatchKeywords: Record<string, string[]> = {
      Joanna: ['samantha', 'ava', 'allison', 'google us english', 'victoria', 'female'],
      Danielle: ['ava', 'samantha', 'karen', 'fiona', 'victoria', 'female'],
      Kendra: ['allison', 'samantha', 'victoria', 'female'],
      Salli: ['victoria', 'samantha', 'tessa', 'female'],
      Aditi: ['lekha', 'veena', 'vani', 'samantha', 'female'],
      Kajal: ['lekha', 'veena', 'samantha', 'female'],
      Matthew: ['alex', 'daniel', 'david', 'male'],
    };

    const keywords = voiceMatchKeywords[voiceId] || ['samantha', 'ava', 'female'];
    const matchedVoice =
      availableVoices.find((v) =>
        keywords.some(
          (kw) => v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw)
        )
      ) || availableVoices[0];

    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onend = () => setTestPlaying(null);
    utterance.onerror = () => setTestPlaying(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl glass-button text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 font-heading">
                Settings & Neural Voice Studio
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose expressive human-like female voices, wake-word controls, and persona
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-button text-zinc-400 hover:text-white transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-4 sm:px-6 bg-black/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'alexa', label: 'Neural Voices', icon: <AudioLines className="w-3.5 h-3.5" /> },
            { id: 'persona', label: 'Persona', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'voice', label: 'Audio Controls', icon: <Volume2 className="w-3.5 h-3.5" /> },
            { id: 'language', label: 'Language', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'appearance', label: 'Theme & App', icon: <Moon className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* TAB 1: Voice Profiles */}
          {activeTab === 'alexa' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-heading">
                  Human-Like Neural Voice Profiles
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Powered by Gemini 3.8 Neural TTS for soft, sweet, clear, warm, and expressive Tamil, Tanglish & English speech.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POLLY_VOICES.map((voice) => {
                  const isSelected = (settings.pollyVoiceId || 'Joanna') === voice.id;
                  const isPlayingThis = testPlaying === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => onUpdateSettings({ pollyVoiceId: voice.id })}
                      className={`p-3.5 rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'glass-card border-indigo-500/80 bg-indigo-500/15 ring-2 ring-indigo-500/30 text-zinc-900 dark:text-zinc-100'
                          : 'glass-card hover:border-white/30 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {voice.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 font-medium">
                              {voice.gender}
                            </span>
                            {voice.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 font-semibold">
                                Recommended
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {voice.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {voice.languageName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(voice.id);
                          }}
                          className="px-2.5 py-1 rounded-lg glass-button text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isPlayingThis ? 'Playing...' : 'Preview Voice'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Wake-Word & Interruption Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                  <div className="pr-2">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Continuous "Hey Dashu" Wake-Word</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Hands-free activation when you say "Hey Dashu" or "Hey Dharshu"
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.wakeWordEnabled ?? true}
                    onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                  <div className="pr-2">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-400" />
                      <span>Instant Interruption</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Stop voice playback immediately when you interrupt
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceInterruptionEnabled ?? true}
                    onChange={(e) =>
                      onUpdateSettings({ voiceInterruptionEnabled: e.target.checked })
                    }
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Persona */}
          {activeTab === 'persona' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 font-heading">
                  Select Dharshu's Mood & Persona
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Dharshu automatically adapts her emotional voice inflection to match her persona.
                </p>
              </div>
              <PersonalitySelector
                currentMode={settings.personality}
                onSelectMode={(mode: PersonalityMode) => onUpdateSettings({ personality: mode })}
              />
            </div>
          )}

          {/* TAB 3: Audio Controls */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Voice Output Enabled
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Enable neural speech synthesis
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceEnabled}
                    onChange={(e) => onUpdateSettings({ voiceEnabled: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Auto-Speak AI Responses
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Automatically speak every reply hands-free
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoReadResponses}
                    onChange={(e) => onUpdateSettings({ autoReadResponses: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Sliders for Speech Rate & Pitch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl glass-card">
                  <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    <span>Base Speaking Speed (Auto-Adaptive)</span>
                    <span className="text-indigo-400">{settings.speechRate || 1.0}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.speechRate || 1.0}
                    onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card">
                  <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    <span>Fallback Voice Pitch</span>
                    <span className="text-indigo-400">{settings.speechPitch || 1.05}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.85"
                    max="1.3"
                    step="0.05"
                    value={settings.speechPitch || 1.05}
                    onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Optional Local Fallback Voice Override */}
              {availableVoices.length > 0 && (
                <div className="p-3.5 rounded-2xl glass-card space-y-2">
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Offline / Fallback System Voice (macOS / Chrome)
                  </label>
                  <select
                    value={settings.preferredVoiceURI || ''}
                    onChange={(e) => onUpdateSettings({ preferredVoiceURI: e.target.value })}
                    className="w-full rounded-xl glass-button px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-900/60 focus:outline-none"
                  >
                    <option value="">Auto-Select Best Natural Female Voice</option>
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Language */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 font-heading">
                  Conversation Language Preference
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Choose your preferred language or leave on Auto-detect for fluid Tanglish/English/Tamil mix.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'auto',
                    title: 'Auto Detect',
                    desc: 'Responds naturally in the language or dialect you speak',
                  },
                  {
                    id: 'tanglish',
                    title: 'Tanglish',
                    desc: 'Casual Tamil in English script (e.g., Epdi irukkeenga?)',
                  },
                  {
                    id: 'english',
                    title: 'English',
                    desc: 'Warm, clear conversational English',
                  },
                  {
                    id: 'tamil',
                    title: 'Tamil (தமிழ்)',
                    desc: 'Natural Tamil script & pronunciation (e.g., வணக்கம்!)',
                  },
                ].map((lang) => {
                  const isActive = settings.languagePref === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => onUpdateSettings({ languagePref: lang.id as LanguagePref })}
                      className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isActive
                          ? 'glass-card border-indigo-500/70 bg-indigo-500/15 ring-2 ring-indigo-500/30 text-zinc-900 dark:text-zinc-100'
                          : 'glass-card text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{lang.title}</span>
                        {isActive && <Check className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                        {lang.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: Appearance & App */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      settings.theme === 'dark'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/30 shadow-md'
                        : 'glass-button text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark Glass</span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      settings.theme === 'light'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/30 shadow-md'
                        : 'glass-button text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light Frost</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl glass-card flex items-start gap-3">
                <div className="p-2 rounded-xl glass-button text-indigo-400 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    macOS Chrome & Mobile PWA Ready
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                    Optimized for Google Chrome on macOS and Android PWA. Keep the tab open and say <strong>"Hey Dashu"</strong> for hands-free voice conversations.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                {confirmClear ? (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2">
                    <span className="text-xs text-rose-200 font-medium">
                      Delete all saved conversations?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onClearHistory();
                          setConfirmClear(false);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-3 py-1.5 rounded-lg glass-button text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer backdrop-blur-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Chat History</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
