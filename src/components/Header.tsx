import React from 'react';
import { Menu, Settings, Plus, Sun, Moon, Volume2, Square, Sparkles } from 'lucide-react';
import { DharshuAvatar } from './DharshuAvatar';
import { SettingsState, ThemeMode } from '../types';
import { PERSONALITIES } from '../data/personalities';

interface HeaderProps {
  onToggleSidebar: () => void;
  activeSessionTitle?: string;
  settings: SettingsState;
  onUpdateSettings: (s: Partial<SettingsState>) => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  activeSessionTitle,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onNewChat,
  isSpeaking,
  onStopSpeaking,
}) => {
  const personalityInfo = PERSONALITIES[settings.personality] || PERSONALITIES.friendly;

  const toggleTheme = () => {
    const nextTheme: ThemeMode = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel px-3 sm:px-5 py-2.5 flex items-center justify-between transition-colors border-b">
      {/* Left side: Menu toggle & Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-zinc-300 dark:text-zinc-300 hover:text-white glass-button transition-all cursor-pointer shadow-xs"
          title="Toggle chat list"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <DharshuAvatar size="sm" isSpeaking={isSpeaking} personality={settings.personality} showBadge={false} />
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 font-heading tracking-tight">
                Dharshu
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[120px] sm:max-w-[240px]">
              {activeSessionTitle || 'Friendly AI Companion'}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Audio active indicator, Personality pill, New Chat, Theme & Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Speaking status indicator / stop button */}
        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="px-2.5 py-1 rounded-full bg-rose-500/20 dark:bg-rose-950/60 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition animate-pulse hover:bg-rose-500/30 backdrop-blur-md"
            title="Stop Dharshu speaking"
          >
            <Square className="w-3 h-3 fill-current text-rose-500" />
            <span className="hidden xs:inline">Stop Voice</span>
          </button>
        )}

        {/* Personality Badge Pill */}
        {(() => {
          const PersonalityIcon = personalityInfo.icon;
          return (
            <button
              onClick={onOpenSettings}
              className={`px-2.5 py-1 sm:py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer backdrop-blur-md shadow-xs ${personalityInfo.badgeBg} ${personalityInfo.badgeText}`}
              title="Change Dharshu's personality mode"
            >
              <PersonalityIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{personalityInfo.name}</span>
              <Sparkles className="w-3 h-3 opacity-70" />
            </button>
          );
        })()}

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 border border-indigo-400/30 transition-all cursor-pointer"
          title="Start new chat"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline font-semibold">New Chat</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white glass-button transition cursor-pointer"
          title={settings.theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white glass-button transition cursor-pointer"
          title="Open settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
