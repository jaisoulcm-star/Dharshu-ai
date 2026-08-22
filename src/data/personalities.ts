import { LucideIcon, HeartHandshake, Laugh, Heart, GraduationCap, Coffee, Flame, Zap, Feather, Moon } from 'lucide-react';
import { PersonalityMode } from '../types';

export interface PersonalityInfo {
  id: PersonalityMode;
  name: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  activeRing: string;
  samplePrompts: string[];
}

export const PERSONALITIES: Record<PersonalityMode, PersonalityInfo> = {
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    icon: HeartHandshake,
    tagline: 'Warm & welcoming companion',
    description: 'Talks like a close, cheerful friend who is always happy to chat and listen.',
    accentColor: 'from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 dark:bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-300',
    activeRing: 'ring-amber-500/50 border-amber-500',
    samplePrompts: [
      'Hi Dharshu! Enna panra?',
      'How was your day?',
      'Tell me something interesting today!'
    ]
  },
  funny: {
    id: 'funny',
    name: 'Funny',
    icon: Laugh,
    tagline: 'Playful banter & witty humor',
    description: 'Crack jokes, tease gently, and keep every conversation full of fun and smiles.',
    accentColor: 'from-yellow-500 to-amber-500',
    badgeBg: 'bg-yellow-500/15 border-yellow-500/30 dark:bg-yellow-500/10',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    activeRing: 'ring-yellow-500/50 border-yellow-500',
    samplePrompts: [
      'Tell me a super funny joke in Tanglish!',
      'Why is waking up early so hard?',
      'Make me laugh right now!'
    ]
  },
  caring: {
    id: 'caring',
    name: 'Caring',
    icon: Heart,
    tagline: 'Empathetic listener & comforting',
    description: 'Gentle, deeply empathetic support when you need someone to talk to or vent.',
    accentColor: 'from-sky-500 to-blue-600',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 dark:bg-sky-500/10',
    badgeText: 'text-sky-700 dark:text-sky-300',
    activeRing: 'ring-sky-500/50 border-sky-500',
    samplePrompts: [
      'I am feeling a bit stressed today.',
      'Had a really long exhausting day...',
      'Can you give me a comforting pep talk?'
    ]
  },
  study_buddy: {
    id: 'study_buddy',
    name: 'Study Buddy',
    icon: GraduationCap,
    tagline: 'Step-by-step interactive tutor',
    description: 'Explains tough concepts simply, quizzes you interactive step-by-step, and keeps study stress-free.',
    accentColor: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 dark:bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    activeRing: 'ring-emerald-500/50 border-emerald-500',
    samplePrompts: [
      'Can you help me study?',
      'Explain Photosynthesis step by step in simple terms!',
      'Quiz me on basic Physics formulas!'
    ]
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    icon: Coffee,
    tagline: 'Chill WhatsApp-style texting',
    description: 'Super relaxed tone, natural colloquial expressions, zero formality.',
    accentColor: 'from-purple-500 to-indigo-600',
    badgeBg: 'bg-purple-500/15 border-purple-500/30 dark:bg-purple-500/10',
    badgeText: 'text-purple-700 dark:text-purple-300',
    activeRing: 'ring-purple-500/50 border-purple-500',
    samplePrompts: [
      'Machan, enna plan today?',
      'Suggest a good movie to watch tonight',
      'What is trending right now?'
    ]
  },
  motivational: {
    id: 'motivational',
    name: 'Motivational',
    icon: Flame,
    tagline: 'Inspiring goal booster & hype friend',
    description: 'Builds your confidence, boosts energy, and reminds you "Unnala mudiyum!"',
    accentColor: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 dark:bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-300',
    activeRing: 'ring-rose-500/50 border-rose-500',
    samplePrompts: [
      'I need motivation to start working on my goals!',
      'Remind me why I should not give up.',
      'Give me an energetic morning motivation!'
    ]
  },
  witty_sassy: {
    id: 'witty_sassy',
    name: 'Witty & Sassy',
    icon: Zap,
    tagline: 'Sharp humor & playful banter',
    description: 'Quick-witted teasing, clever punchlines, and vibrant friendly roasts with zero dull moments.',
    accentColor: 'from-fuchsia-500 to-pink-600',
    badgeBg: 'bg-fuchsia-500/15 border-fuchsia-500/30 dark:bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    activeRing: 'ring-fuchsia-500/50 border-fuchsia-500',
    samplePrompts: [
      'Roast me gently for procrastinating again!',
      'Give me your sassiest Tanglish reply',
      'Test your wit against me!'
    ]
  },
  romantic_poetic: {
    id: 'romantic_poetic',
    name: 'Romantic Poetic',
    icon: Feather,
    tagline: 'Lyrical Tamil & cinematic charm',
    description: 'Expressive poetry, cinematic dialogues, heartfelt metaphors, and soulful storytelling.',
    accentColor: 'from-rose-400 to-pink-500',
    badgeBg: 'bg-rose-400/15 border-rose-400/30 dark:bg-rose-400/10',
    badgeText: 'text-rose-600 dark:text-rose-300',
    activeRing: 'ring-rose-400/50 border-rose-400',
    samplePrompts: [
      'Write a beautiful romantic Tamil kavithai for evening rain',
      'Tell me a soulful story about two soulmates',
      'What are the most aesthetic words in Tamil & Tanglish?'
    ]
  },
  deep_confidant: {
    id: 'deep_confidant',
    name: 'Late-Night Confidant',
    icon: Moon,
    tagline: 'Midnight reflections & deep thoughts',
    description: 'Thoughtful discussions about life, relationships, personal growth, and late-night philosophical thoughts.',
    accentColor: 'from-violet-500 to-indigo-700',
    badgeBg: 'bg-violet-500/15 border-violet-500/30 dark:bg-violet-500/10',
    badgeText: 'text-violet-700 dark:text-violet-300',
    activeRing: 'ring-violet-500/50 border-violet-500',
    samplePrompts: [
      'Why do humans complicate simple things in life?',
      'Let us have a deep late-night conversation',
      'What is true happiness according to you?'
    ]
  }
};
