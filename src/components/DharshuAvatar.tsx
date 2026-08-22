import React from 'react';
import { motion } from 'motion/react';
import { PersonalityMode } from '../types';
import { PERSONALITIES } from '../data/personalities';

interface DharshuAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  isListening?: boolean;
  personality?: PersonalityMode;
  showBadge?: boolean;
  className?: string;
}

export const DharshuAvatar: React.FC<DharshuAvatarProps> = ({
  size = 'md',
  isSpeaking = false,
  isListening = false,
  personality = 'friendly',
  showBadge = true,
  className = '',
}) => {
  const personalityInfo = PERSONALITIES[personality] || PERSONALITIES.friendly;

  const sizeMap = {
    xs: { container: 'w-6 h-6', eyes: 'w-1 h-1.5', badge: 'w-3 h-3 text-[8px] -bottom-0.5 -right-0.5' },
    sm: { container: 'w-8 h-8', eyes: 'w-1 h-2', badge: 'w-3.5 h-3.5 text-[9px] -bottom-0.5 -right-0.5' },
    md: { container: 'w-10 h-10', eyes: 'w-1.5 h-2.5', badge: 'w-4 h-4 text-[10px] -bottom-1 -right-1' },
    lg: { container: 'w-16 h-16', eyes: 'w-2 h-3.5', badge: 'w-5 h-5 text-[12px] -bottom-1 -right-1' },
    xl: { container: 'w-24 h-24', eyes: 'w-3 h-5', badge: 'w-7 h-7 text-[14px] -bottom-1.5 -right-1.5' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {/* Outer Halo Glow */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ${
          isSpeaking
            ? 'scale-125 opacity-80 blur-md animate-pulse-halo'
            : isListening
            ? 'scale-115 opacity-70 blur-sm animate-pulse'
            : 'opacity-30 blur-xs'
        }`}
      />

      {/* Main Avatar Body */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative rounded-full p-[1.5px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md ${currentSize.container} flex items-center justify-center overflow-hidden`}
      >
        <div className="w-full h-full rounded-full bg-zinc-900 dark:bg-zinc-950 flex items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-950" />

          {/* Animated Face */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Eyes */}
            <div className="flex items-center space-x-1 mb-0.5">
              <motion.div
                animate={
                  isSpeaking
                    ? { scaleY: [1, 0.2, 1, 1.2, 1] }
                    : isListening
                    ? { scale: [1, 1.25, 1] }
                    : { scaleY: [1, 1, 0.1, 1] }
                }
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.5 : 3.5,
                  repeatDelay: isSpeaking ? 0 : 2.5,
                }}
                className={`${currentSize.eyes} rounded-full bg-indigo-200 shadow-[0_0_6px_rgba(165,180,252,0.8)]`}
              />
              <motion.div
                animate={
                  isSpeaking
                    ? { scaleY: [1, 0.2, 1, 1.2, 1] }
                    : isListening
                    ? { scale: [1, 1.25, 1] }
                    : { scaleY: [1, 1, 0.1, 1] }
                }
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.5 : 3.5,
                  repeatDelay: isSpeaking ? 0 : 2.5,
                }}
                className={`${currentSize.eyes} rounded-full bg-indigo-200 shadow-[0_0_6px_rgba(165,180,252,0.8)]`}
              />
            </div>

            {/* Mouth / Audio Waveform */}
            {isSpeaking ? (
              <div className="flex items-center space-x-0.5 h-1.5 sm:h-2">
                <div className="w-0.5 h-1.5 bg-pink-400 rounded-full speech-wave-bar" style={{ animationDelay: '0ms' }} />
                <div className="w-0.5 h-2 bg-indigo-300 rounded-full speech-wave-bar" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 h-1.5 bg-pink-400 rounded-full speech-wave-bar" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div className="w-2 sm:w-2.5 h-0.5 rounded-b-full border-b-[1.5px] border-pink-300/80" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Personality Badge Overlay */}
      {showBadge && (() => {
        const Icon = personalityInfo.icon;
        return (
          <span
            className={`absolute rounded-full bg-zinc-900 text-indigo-300 border border-zinc-700/80 shadow-md flex items-center justify-center ${currentSize.badge}`}
            title={`Personality: ${personalityInfo.name}`}
          >
            <Icon className="w-full h-full p-[15%]" />
          </span>
        );
      })()}
    </div>
  );
};
