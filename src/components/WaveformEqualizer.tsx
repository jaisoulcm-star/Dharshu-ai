import React from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2, Sparkles, Square, Radio, AudioLines } from 'lucide-react';
import { VoiceState } from '../types';

interface WaveformEqualizerProps {
  voiceState: VoiceState;
  onInterrupt: () => void;
  onStartListening: () => void;
  className?: string;
}

export const WaveformEqualizer: React.FC<WaveformEqualizerProps> = ({
  voiceState,
  onInterrupt,
  onStartListening,
  className = '',
}) => {
  const { status, isListening, isSpeaking, isThinking, transcript, activeVoiceProfile } = voiceState;

  // Number of equalizer frequency bars
  const barCount = 13;

  // Generate dynamic bar heights based on status and index
  const getBarHeight = (index: number) => {
    if (isSpeaking) {
      // Dynamic frequency wave calculation
      const centerDist = Math.abs(index - Math.floor(barCount / 2));
      const factor = 1 - centerDist / (barCount / 2);
      return Math.max(6, Math.min(32, Math.round(10 + factor * 22)));
    }
    if (isListening) {
      return index % 2 === 0 ? 18 : 10;
    }
    if (isThinking) {
      return (index % 3) * 5 + 8;
    }
    return 4;
  };

  // State styling
  const stateConfig = {
    listening: {
      label: 'Listening...',
      sub: 'Say "Hey Dharshu", "Alexa", or your question',
      auraColor: 'from-cyan-500/40 via-indigo-500/40 to-blue-600/40',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
      ringGlow: 'ring-2 ring-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.35)]',
      barColor: 'bg-cyan-400',
    },
    thinking: {
      label: 'Thinking...',
      sub: 'Formulating smart response',
      auraColor: 'from-purple-500/40 via-pink-500/40 to-indigo-600/40',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      ringGlow: 'ring-2 ring-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.35)]',
      barColor: 'bg-gradient-to-t from-purple-400 to-pink-400',
    },
    speaking: {
      label: `Speaking • ${activeVoiceProfile || 'Natural Voice'}`,
      sub: 'Alexa-grade natural smart delivery',
      auraColor: 'from-indigo-500/50 via-purple-500/50 to-pink-500/50',
      badgeBg: 'bg-indigo-500/25 text-indigo-300 border-indigo-400/40',
      ringGlow: 'ring-2 ring-indigo-400/60 shadow-[0_0_30px_rgba(99,102,241,0.4)]',
      barColor: 'bg-gradient-to-t from-indigo-400 via-purple-400 to-pink-400',
    },
    idle: {
      label: 'Alexa-Compatible Smart Assistant',
      sub: 'Ready for voice commands',
      auraColor: 'from-indigo-500/10 via-purple-500/10 to-transparent',
      badgeBg: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
      ringGlow: 'border-white/10 shadow-sm',
      barColor: 'bg-zinc-500/40',
    },
  };

  const currentConfig = stateConfig[status] || stateConfig.idle;

  // Don't render idle widget if not needed, or render compact floating dock
  if (status === 'idle' && !className.includes('show-idle')) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className={`relative w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 ${className}`}
    >
      {/* Smart Assistant Aura Container */}
      <div
        className={`relative overflow-hidden rounded-2xl glass-panel p-3 sm:p-3.5 transition-all duration-300 ${currentConfig.ringGlow}`}
      >
        {/* Dynamic Background Glow Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${currentConfig.auraColor} opacity-50 blur-xl pointer-events-none transition-all duration-500`}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Status Icon & Title */}
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            {/* Smart Assistant Ring Indicator */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-zinc-900 border ${
                  isSpeaking
                    ? 'border-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : isListening
                    ? 'border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : isThinking
                    ? 'border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : 'border-white/20'
                }`}
              >
                {isSpeaking ? (
                  <Volume2 className="w-4 h-4 text-indigo-300 animate-pulse" />
                ) : isListening ? (
                  <Mic className="w-4 h-4 text-cyan-300 animate-bounce" />
                ) : isThinking ? (
                  <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4 text-zinc-400" />
                )}
              </div>

              {/* Pulsing ring aura */}
              {(isSpeaking || isListening || isThinking) && (
                <span
                  className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                    isSpeaking ? 'bg-indigo-400' : isListening ? 'bg-cyan-400' : 'bg-purple-400'
                  }`}
                />
              )}
            </div>

            {/* Label & Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 font-heading">
                  {currentConfig.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md ${currentConfig.badgeBg}`}
                >
                  {status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {isListening && transcript ? `"${transcript}"` : currentConfig.sub}
              </p>
            </div>
          </div>

          {/* Center: Animated Equalizer Waveform */}
          <div className="flex items-center gap-1 sm:gap-1.5 h-8 px-3 py-1 rounded-xl bg-black/20 border border-white/5 shrink-0">
            {Array.from({ length: barCount }).map((_, idx) => {
              const maxH = getBarHeight(idx);
              const animDuration = isSpeaking ? 0.35 + (idx % 4) * 0.1 : isListening ? 0.6 : 0.8;
              const delay = (idx * 0.05) % 0.3;

              return (
                <motion.div
                  key={idx}
                  className={`w-1 sm:w-1.5 rounded-full ${currentConfig.barColor}`}
                  animate={
                    isSpeaking
                      ? {
                          height: [4, maxH, 8, maxH * 0.7, 4],
                        }
                      : isListening
                      ? {
                          height: [4, maxH, 4],
                        }
                      : isThinking
                      ? {
                          height: [6, 18, 6],
                        }
                      : { height: 4 }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: animDuration,
                    delay: delay,
                    ease: 'easeInOut',
                  }}
                  style={{ minHeight: '4px' }}
                />
              );
            })}
          </div>

          {/* Right: Instant Action (Interrupt / Speak) */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {isSpeaking && (
              <button
                onClick={onInterrupt}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border border-rose-400/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md animate-pulse"
                title="Instant Interrupt Speech"
              >
                <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>Interrupt</span>
              </button>
            )}

            {isListening && (
              <button
                onClick={onInterrupt}
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
                <span>Talk</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
