import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, BookOpen, Mic, Sparkles, Smile, ArrowRight, Zap, Radio, AudioLines } from 'lucide-react';
import { DharshuAvatar } from './DharshuAvatar';
import { PersonalityMode } from '../types';
import { PERSONALITIES } from '../data/personalities';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string, personality?: PersonalityMode) => void;
  onStartVoice: () => void;
  selectedPersonality: PersonalityMode;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  onStartVoice,
  selectedPersonality,
}) => {
  const personalityInfo = PERSONALITIES[selectedPersonality] || PERSONALITIES.friendly;

  const quickActionCards = [
    {
      id: 'alexa-voice',
      icon: <AudioLines className="w-5 h-5 text-cyan-400" />,
      title: 'Natural Voice Mode',
      desc: 'Hands-free voice recognition and conversational speech audio',
      prompt: 'Hey Dharshu, introduce yourself and how you can help me!',
      action: onStartVoice,
      personality: 'friendly' as PersonalityMode,
      glowHover: 'hover:border-cyan-400/50 hover:shadow-cyan-500/20',
    },
    {
      id: 'chatting',
      icon: <MessageSquare className="w-5 h-5 text-indigo-400" />,
      title: 'Friendly Chat',
      desc: 'Warm banter & daily catch-up in Tanglish or English',
      prompt: 'Hi Dharshu! Enna panra? How is your day going?',
      personality: 'friendly' as PersonalityMode,
      glowHover: 'hover:border-indigo-400/50 hover:shadow-indigo-500/20',
    },
    {
      id: 'study',
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      title: 'Study Buddy',
      desc: 'Interactive step-by-step concepts, quizzes & exam help',
      prompt: 'Can you help me study? Enna subject easy-ah step by step padikkalam?',
      personality: 'study_buddy' as PersonalityMode,
      glowHover: 'hover:border-emerald-400/50 hover:shadow-emerald-500/20',
    },
    {
      id: 'funny',
      icon: <Smile className="w-5 h-5 text-amber-400" />,
      title: 'Jokes & Fun',
      desc: 'Laugh with Tanglish jokes, meme humor & mood boosters',
      prompt: 'Tell me a super funny joke in Tanglish to make me laugh!',
      personality: 'funny' as PersonalityMode,
      glowHover: 'hover:border-amber-400/50 hover:shadow-amber-500/20',
    },
    {
      id: 'romantic',
      icon: <Sparkles className="w-5 h-5 text-pink-400" />,
      title: 'Poetic & Cinematic',
      desc: 'Lyrical Tamil kavithai, poetry & heartfelt stories',
      prompt: 'Write a beautiful aesthetic Tamil kavithai about evening rain',
      personality: 'romantic_poetic' as PersonalityMode,
      glowHover: 'hover:border-pink-400/50 hover:shadow-pink-500/20',
    },
    {
      id: 'witty',
      icon: <Zap className="w-5 h-5 text-fuchsia-400" />,
      title: 'Witty & Sassy',
      desc: 'Sharp banter, sassy comebacks & friendly teasing',
      prompt: 'Give me your sassiest Tanglish comeback',
      personality: 'witty_sassy' as PersonalityMode,
      glowHover: 'hover:border-fuchsia-400/50 hover:shadow-fuchsia-500/20',
    },
    {
      id: 'confidant',
      icon: <Radio className="w-5 h-5 text-violet-400" />,
      title: 'Late-Night Confidant',
      desc: 'Deep reflections, philosophy & late-night chats',
      prompt: 'Let us have a deep late-night conversation about life',
      personality: 'deep_confidant' as PersonalityMode,
      glowHover: 'hover:border-violet-400/50 hover:shadow-violet-500/20',
    },
  ];

  const suggestedPrompts = [
    { label: '“Hey Dharshu, what is AI?”', text: 'Hey Dharshu, what is Artificial Intelligence and how does it work?' },
    { label: '“Dharshu, enna panra?”', text: 'Dharshu, enna panra?' },
    { label: '“Explain Gravity in simple Tanglish”', text: 'Explain Gravity in simple Tanglish step by step!' },
    { label: '“Give me morning motivation!”', text: 'Give me an energetic motivation pep talk for today!' },
    { label: '“Alexa, tell me something interesting”', text: 'Alexa, tell me a fascinating science fact!' },
  ];

  const PersonalityIcon = personalityInfo.icon;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center text-center relative z-10">
      {/* Avatar Hero */}
      <div className="mb-4">
        <DharshuAvatar size="xl" personality={selectedPersonality} showBadge={true} />
      </div>

      {/* Title & Tagline */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-2 max-w-xl"
      >
        <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 font-heading tracking-tight">
          Hi, I’m <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">Dharshu</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 font-medium">
          Your Alexa-compatible AI companion for natural voice conversations, studies, humor, and daily support.
        </p>

        {/* Current Mood Chip & Alexa Voice Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold glass-card text-zinc-700 dark:text-zinc-200 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Persona:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{personalityInfo.name}</span>
            <PersonalityIcon className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 backdrop-blur-md shadow-sm">
            <Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>Wake Word: "Hey Dharshu" & "Alexa"</span>
          </div>
        </div>
      </motion.div>

      {/* 4 Feature Glass Action Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 my-6 sm:my-8"
      >
        {quickActionCards.map((card) => (
          <button
            key={card.id}
            onClick={() => {
              if (card.action) {
                card.action();
              } else {
                onSelectPrompt(card.prompt, card.personality);
              }
            }}
            className={`p-4 rounded-2xl glass-card text-left flex items-start gap-3.5 cursor-pointer group ${card.glowHover}`}
          >
            <div className="p-2.5 rounded-xl glass-button shrink-0 transition-transform group-hover:scale-110">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-heading">
                    {card.title}
                  </h3>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5 line-clamp-2">
                {card.desc}
              </p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* Suggested Starter Prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 mb-3">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Quick Voice & Tanglish Starters</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(p.text)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium glass-button text-zinc-700 dark:text-zinc-300 hover:border-indigo-400/60 transition-all cursor-pointer active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
