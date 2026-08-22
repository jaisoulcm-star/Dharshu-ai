import React from 'react';
import { Check } from 'lucide-react';
import { PersonalityMode } from '../types';
import { PERSONALITIES } from '../data/personalities';

interface PersonalitySelectorProps {
  currentMode: PersonalityMode;
  onSelectMode: (mode: PersonalityMode) => void;
  compact?: boolean;
}

export const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({
  currentMode,
  onSelectMode,
  compact = false,
}) => {
  const modes = Object.values(PERSONALITIES);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {modes.map((p) => {
          const isActive = p.id === currentMode;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onSelectMode(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md border border-white/30 ring-1 ring-indigo-400/50'
                  : 'glass-button text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {modes.map((p) => {
        const isActive = p.id === currentMode;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectMode(p.id)}
            className={`p-3.5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer ${
              isActive
                ? 'glass-card border-indigo-500/70 bg-indigo-500/15 text-zinc-900 dark:text-zinc-100 ring-2 ring-indigo-500/40 shadow-lg'
                : 'glass-card text-zinc-700 dark:text-zinc-300 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl glass-button shadow-xs text-indigo-400">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-heading">
                  {p.name}
                </span>
              </div>
              {isActive ? (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
              ) : (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-400">
                  Select
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
              {p.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
