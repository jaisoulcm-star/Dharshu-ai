import React from 'react';
import { Mic, Volume2, Sparkles, Square, Radio, AlertCircle } from 'lucide-react';
import { VoiceState } from '../types';

interface WaveformEqualizerProps {
  voiceState: VoiceState;
  onInterrupt: () => void;
  onStartListening: () => void;
  onStopListening?: () => void;
  className?: string;
}

export const WaveformEqualizer: React.FC<WaveformEqualizerProps> = React.memo(({
  voiceState,
  onInterrupt,
  onStartListening,
  onStopListening,
  className = '',
}) => {
  const {
    status,
    isListening,
    isSpeaking,
    isThinking,
    transcript,
    activeVoiceProfile,
    audioVolume,
    isWakeWordStandby,
    micActive,
    errorMessage,
  } = voiceState;

  const barCount = 11;

  // Dynamic equalizer bar height driven by real microphone audioVolume or speaking state
  const getBarHeight = (index: number) => {
    const centerDist = Math.abs(index - Math.floor(barCount / 2));
    const factor = 1 - centerDist / (barCount / 2);

    if (isSpeaking) {
      return Math.max(8, Math.min(28, Math.round(10 + factor * 18)));
    }
    if (isListening) {
      const volBoost = Math.round((audioVolume / 100) * 20 * factor);
      return Math.max(8, Math.min(28, (index % 2 === 0 ? 14 : 9) + volBoost));
    }
    if (isThinking) {
      return (index % 3) * 4 + 8;
    }
    if (isWakeWordStandby && audioVolume > 3) {
      return Math.max(4, Math.min(18, Math.round(4 + (audioVolume / 100) * 14 * factor)));
    }
    return 4;
  };

  const stateConfig = {
    listening: {
      label: 'Listening for your command...',
      sub: transcript ? `Hearing: "${transcript}"` : 'Speak naturally in English, Tamil, or Tanglish',
      auraColor: 'from-cyan-500/30 via-indigo-500/30 to-blue-600/30',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
      ringGlow: 'ring-1 ring-cyan-400/50',
      barColor: 'bg-cyan-400',
    },
    thinking: {
      label: 'Thinking...',
      sub: 'Crafting a fast, natural response',
      auraColor: 'from-purple-500/30 via-pink-500/30 to-indigo-600/30',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      ringGlow: 'ring-1 ring-purple-400/50',
      barColor: 'bg-purple-400',
    },
    speaking: {
      label: `Speaking • ${activeVoiceProfile || 'Darshu Neural Voice'}`,
      sub: 'Warm neural female voice • Click Interrupt anytime to talk',
      auraColor: 'from-indigo-500/35 via-purple-500/35 to-pink-500/35',
      badgeBg: 'bg-indigo-500/25 text-indigo-300 border-indigo-400/40',
      ringGlow: 'ring-1 ring-indigo-400/50',
      barColor: 'bg-indigo-400',
    },
    idle: {
      label: isWakeWordStandby
        ? 'Idle • Listening for "Hey Darshu" or "Jasa"'
        : 'Idle • Voice Assistant Ready',
      sub: isWakeWordStandby
        ? 'Say "Hey Darshu", "Hey Dashu", or "Jasa" anytime — hands-free wake word active'
        : 'Click Talk Now or say "Hey Darshu" to start a voice conversation',
      auraColor: 'from-indigo-500/10 via-purple-500/5 to-transparent',
      badgeBg: isWakeWordStandby
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
      ringGlow: 'border-white/10',
      barColor: isWakeWordStandby ? 'bg-emerald-400/75' : 'bg-zinc-500/40',
    },
  };

  const currentConfig = stateConfig[status] || stateConfig.idle;

  if (status === 'idle' && !className.includes('show-idle')) {
    return null;
  }

  return (
    <div className={`relative w-full max-w-4xl mx-auto px-3 sm:px-4 py-1 ${className}`}>
      {/* Clear Error Banner if Microphone or Speech Fails */}
      {errorMessage && (
        <div className="mb-2 px-3.5 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 flex items-center justify-between gap-2 text-xs text-rose-200 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onStartListening}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shrink-0 cursor-pointer"
          >
            Enable Mic
          </button>
        </div>
      )}

      {/* Smart Assistant Aura Container */}
      <div
        className={`relative overflow-hidden rounded-2xl glass-panel px-3 py-2 sm:px-3.5 sm:py-2.5 transition-colors duration-200 ${currentConfig.ringGlow}`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r ${currentConfig.auraColor} opacity-45 pointer-events-none`}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          {/* Left: Status Icon, Mic Activity Dot & Title */}
          <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
            <div className="relative shrink-0 flex items-center justify-center">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-zinc-900 border ${
                  isSpeaking
                    ? 'border-indigo-400/80'
                    : isListening
                    ? 'border-cyan-400/80'
                    : isThinking
                    ? 'border-purple-400/80'
                    : isWakeWordStandby
                    ? 'border-emerald-400/70'
                    : 'border-white/20'
                }`}
              >
                {isSpeaking ? (
                  <Volume2 className="w-4 h-4 text-indigo-300" />
                ) : isListening ? (
                  <Mic className="w-4 h-4 text-cyan-300" />
                ) : isThinking ? (
                  <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
                ) : (
                  <Radio
                    className={`w-4 h-4 ${
                      isWakeWordStandby ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  />
                )}
              </div>

              {micActive && !isSpeaking && (
                <span
                  title="Microphone active"
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 font-heading">
                  {currentConfig.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${currentConfig.badgeBg}`}
                >
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Lightweight CSS Equalizer & Live Microphone Activity Meter */}
          <div className="hidden md:flex items-center gap-1 h-7 px-2.5 py-1 rounded-xl bg-black/20 border border-white/5 shrink-0">
            {Array.from({ length: barCount }).map((_, idx) => {
              const h = getBarHeight(idx);
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-150 ${currentConfig.barColor} ${
                    isSpeaking ? 'animate-pulse' : ''
                  }`}
                  style={{ height: `${h}px`, minHeight: '4px' }}
                />
              );
            })}
          </div>

          {/* Right: Instant Action (Interrupt / Done / Talk) */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {isSpeaking && (
              <button
                onClick={onInterrupt}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border border-rose-400/50 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Instant Interrupt Speech"
              >
                <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>Interrupt</span>
              </button>
            )}

            {isListening && (
              <button
                onClick={onStopListening || onInterrupt}
                className="px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Done</span>
              </button>
            )}

            {!isListening && !isSpeaking && (
              <button
                onClick={onStartListening}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer border border-white/20"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Talk Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
