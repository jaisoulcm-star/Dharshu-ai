import React from 'react';
import { motion } from 'motion/react';
import { DharshuAvatar } from './DharshuAvatar';
import { PersonalityMode } from '../types';

interface TypingIndicatorProps {
  personality?: PersonalityMode;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ personality = 'friendly' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-start gap-2.5 sm:gap-3.5 my-2.5 sm:my-3.5 px-1 sm:px-2"
    >
      <DharshuAvatar size="md" isSpeaking={false} personality={personality} />
      <div className="glass-bubble-bot rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 shadow-sm">
        <span className="text-xs text-zinc-400 font-medium">
          Dharshu is thinking
        </span>
        <div className="flex items-center gap-1 ml-0.5">
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-purple-400"
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: 0.4 }}
            className="w-1.5 h-1.5 rounded-full bg-pink-400"
          />
        </div>
      </div>
    </motion.div>
  );
};
