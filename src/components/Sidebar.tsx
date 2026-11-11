import React, { useState } from 'react';
import { Plus, Search, Trash2, Settings, Moon, Sun, X, MessageCircle, Clock } from 'lucide-react';
import { ChatSession, SettingsState } from '../types';
import { DharshuAvatar } from './DharshuAvatar';
import { PERSONALITIES } from '../data/personalities';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  settings: SettingsState;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onCloseMobile,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearHistory,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  settings,
  onToggleTheme,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-76 glass-panel lg:border-r border-r-0 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DharshuAvatar size="sm" personality={settings.personality} showBadge={false} />
            <div>
              <h1 className="font-bold text-base text-zinc-900 dark:text-zinc-100 font-heading leading-tight">
                Darshu AI
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                MacBook Personal Assistant
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg glass-button text-zinc-400 hover:text-white cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Primary Action */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Start New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="w-full glass-button rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-400 px-1 mb-1 flex items-center justify-between">
            <span>Conversations</span>
            <span className="text-[10px] text-zinc-400 font-normal">({sessions.length})</span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center mx-auto mb-2.5 text-zinc-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                No chat history yet
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Start a conversation with Darshu!
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const modeInfo = PERSONALITIES[session.personality] || PERSONALITIES.friendly;
              const ModeIcon = modeInfo.icon;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onCloseMobile();
                  }}
                  className={`group relative rounded-xl transition-all flex items-center justify-between px-3 py-2.5 text-xs cursor-pointer ${
                    isActive
                      ? 'glass-card border-indigo-500/60 bg-indigo-500/15 text-zinc-900 dark:text-zinc-100 shadow-md ring-1 ring-indigo-500/30'
                      : 'glass-button text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div className="p-1 rounded-lg glass-button text-indigo-400 shrink-0">
                      <ModeIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className={`font-medium truncate ${isActive ? 'font-semibold text-indigo-500 dark:text-indigo-300' : ''}`}>
                        {session.title || 'Conversation'}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete conversation"
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-white/10 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="flex-1 py-2 px-3 rounded-xl glass-button text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {settings.theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="flex-1 py-2 px-3 rounded-xl glass-button text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>Settings</span>
            </button>
          </div>

          {sessions.length > 0 && (
            confirmClear ? (
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <span className="text-[11px] text-rose-400 font-medium">Clear all?</span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-semibold transition cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-0.5 rounded-md glass-button text-zinc-400 hover:text-zinc-200 text-[11px] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full py-1 text-[11px] text-zinc-400 hover:text-rose-400 transition text-center cursor-pointer"
              >
                Clear all history
              </button>
            )
          )}
        </div>
      </aside>
    </>
  );
});
