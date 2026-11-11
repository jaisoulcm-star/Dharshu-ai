import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { useAutomation } from './hooks/useAutomation';
import { SettingsState, PersonalityMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { WaveformEqualizer } from './components/WaveformEqualizer';
import { AutomationPanel } from './components/AutomationPanel';

const SETTINGS_STORAGE_KEY = 'dharshu_settings_v2';

const defaultSettings: SettingsState = {
  theme: 'dark',
  languagePref: 'auto',
  personality: 'friendly',
  voiceEnabled: true,
  autoReadResponses: true,
  speechRate: 1.0,
  speechPitch: 1.05,
  preferredVoiceURI: '',
  pollyVoiceId: 'Joanna',
  wakeWordEnabled: true,
  voiceInterruptionEnabled: true,
  smartSpeakerMode: true,
};

export default function App() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          voiceEnabled: parsed.voiceEnabled ?? true,
          autoReadResponses: parsed.autoReadResponses ?? true,
          wakeWordEnabled: parsed.wakeWordEnabled ?? true,
        };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return defaultSettings;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAutomationPanelOpen, setIsAutomationPanelOpen] = useState(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatchUserCommandRef = useRef<((text: string, mode?: PersonalityMode) => void) | null>(
    null
  );

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [settings.theme]);

  const handleVoiceCommand = useCallback((commandText: string) => {
    if (commandText.trim() && dispatchUserCommandRef.current) {
      dispatchUserCommandRef.current(commandText.trim());
    }
  }, []);

  const {
    voiceState,
    availableVoices,
    startListening,
    stopListening,
    muteMicrophoneCompletely,
    speakText,
    stopSpeaking,
    setThinking,
  } = useVoice(settings, handleVoiceCommand);

  const handleAutoRead = useCallback(
    (text: string) => {
      if (settings.voiceEnabled && settings.autoReadResponses) {
        speakText(text);
      }
    },
    [settings.voiceEnabled, settings.autoReadResponses, speakText]
  );

  const {
    telemetry,
    tasks,
    youtubeState,
    emailDrafts,
    emailInbox,
    emailInboxReadApproved,
    files,
    activeFolder,
    setActiveFolder,
    openedFile,
    closeOpenedFile,
    shortcuts,
    notifications,
    isExecutingTask,
    pendingConfirmationsCount,
    runningTasksCount,
    activePanelTab,
    setActivePanelTab,
    executeAction,
    processNaturalCommand,
    confirmTask,
    cancelTask,
    dismissNotification,
  } = useAutomation(handleAutoRead);

  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createNewSession,
    deleteSession,
    clearAllHistory,
    sendMessage,
    stopGenerating,
    regenerateLastResponse,
    setSessionPersonality,
    isGenerating,
    searchQuery,
    setSearchQuery,
  } = useChat(settings, handleAutoRead);

  // Unified handler for both Voice and Text commands: runs MacBook automation intent asynchronously in parallel with AI chat
  const handleUserMessageOrCommand = useCallback(
    async (text: string, customMode?: PersonalityMode) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (/\b(stop listening|mute microphone|turn off microphone)\b/i.test(trimmed)) {
        muteMicrophoneCompletely();
        return;
      }

      processNaturalCommand(trimmed).then((matchedTask) => {
        if (matchedTask) {
          setIsAutomationPanelOpen(true);
        }
      });

      sendMessage(trimmed, customMode);
    },
    [muteMicrophoneCompletely, processNaturalCommand, sendMessage]
  );

  useEffect(() => {
    dispatchUserCommandRef.current = handleUserMessageOrCommand;
  }, [handleUserMessageOrCommand]);

  useEffect(() => {
    setThinking(isGenerating);
  }, [isGenerating, setThinking]);

  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? 'instant' : 'smooth',
    });
  }, []);

  useEffect(() => {
    scrollToBottom(isGenerating);
  }, [activeSession?.messages, isGenerating, scrollToBottom]);

  const handleUpdateSettings = useCallback(
    (newPartial: Partial<SettingsState>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newPartial };
        if (newPartial.personality && activeSessionId) {
          setSessionPersonality(activeSessionId, newPartial.personality);
        }
        return updated;
      });
    },
    [activeSessionId, setSessionPersonality]
  );

  const handleToggleMicPrivacy = useCallback(() => {
    if (voiceState.micActive) {
      muteMicrophoneCompletely();
    } else {
      startListening();
    }
  }, [voiceState.micActive, muteMicrophoneCompletely, startListening]);

  const handleMessageSpeak = useCallback(
    (text: string, messageId: string) => {
      setActiveSpeakingMsgId(messageId);
      speakText(text);
    },
    [speakText]
  );

  const handleMessageStopSpeaking = useCallback(() => {
    stopSpeaking();
    setActiveSpeakingMsgId(null);
  }, [stopSpeaking]);

  const currentPersonality = activeSession?.personality || settings.personality;
  const currentMessages = activeSession?.messages || [];

  const handleRetryLastMessage = useCallback(() => {
    const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) handleUserMessageOrCommand(lastUserMsg.content);
  }, [currentMessages, handleUserMessageOrCommand]);

  const latestPendingTask = tasks.find((t) => t.status === 'awaiting_confirmation');

  return (
    <div
      className={`fixed inset-0 w-full h-[100dvh] flex flex-col font-sans transition-colors duration-200 overflow-hidden select-none sm:select-auto ${
        settings.theme === 'light'
          ? 'bg-slate-100 text-slate-900'
          : 'bg-[#0b0d14] text-zinc-100'
      }`}
    >
      {/* Clean Static Ambient Background Gradient (Zero GPU Blur Overhead) */}
      <div
        className={`absolute inset-0 pointer-events-none z-0 ${
          settings.theme === 'light'
            ? 'bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.10),_transparent_55%)]'
            : 'bg-[radial-gradient(ellipse_at_top_left,_rgba(79,70,229,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(147,51,234,0.12),_transparent_55%)]'
        }`}
      />

      {/* Floating Task Completion & Security Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 w-80 sm:w-96 space-y-2 pointer-events-auto">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-2xl border backdrop-blur-xl shadow-xl flex items-start gap-2.5 text-xs transition-all ${
                notif.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                  : notif.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/45 text-amber-100'
                  : notif.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/45 text-rose-100'
                  : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-100'
              }`}
            >
              {notif.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {notif.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              {notif.type === 'error' && (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              {notif.type === 'info' && (
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold">{notif.title}</div>
                <div className="text-[11px] opacity-90 mt-0.5 leading-snug">{notif.message}</div>
                {notif.actionUrl && (
                  <a
                    href={notif.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-semibold text-white transition"
                  >
                    <span>Open External App / Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* App Shell Container */}
      <div className="relative z-10 flex-1 flex overflow-hidden w-full h-full">
        {/* Sidebar Component */}
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={() => createNewSession()}
          onDeleteSession={deleteSession}
          onClearHistory={clearAllHistory}
          onOpenSettings={() => setIsSettingsOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          settings={settings}
          onToggleTheme={() =>
            handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
          }
        />

        {/* Main Chat Interface Glass Container */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          {/* Header */}
          <Header
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeSessionTitle={activeSession?.title}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewChat={() => createNewSession()}
            isSpeaking={voiceState.isSpeaking}
            onStopSpeaking={stopSpeaking}
            voiceState={voiceState}
            onOpenAutomationPanel={() => setIsAutomationPanelOpen((prev) => !prev)}
            pendingConfirmationsCount={pendingConfirmationsCount}
            runningTasksCount={runningTasksCount}
            onToggleMicPrivacy={handleToggleMicPrivacy}
          />

          {/* Inline Permission Banner when a sensitive MacBook action awaits confirmation */}
          {latestPendingTask && (
            <div className="mx-3 sm:mx-6 mt-2 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-amber-200">{latestPendingTask.title}: </span>
                  <span className="text-amber-100/90">
                    {latestPendingTask.confirmationPrompt || latestPendingTask.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => confirmTask(latestPendingTask.id)}
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer transition"
                >
                  Confirm & Run
                </button>
                <button
                  onClick={() => cancelTask(latestPendingTask.id)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-rose-500/25 text-zinc-200 font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Messages & Content Scroll Area */}
          <main className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-5">
            {currentMessages.length === 0 ? (
              <WelcomeScreen
                selectedPersonality={currentPersonality}
                onSelectPrompt={(promptText, mode) => {
                  if (mode) handleUpdateSettings({ personality: mode });
                  handleUserMessageOrCommand(promptText, mode);
                }}
                onStartVoice={() => startListening()}
              />
            ) : (
              <div className="w-full max-w-4xl mx-auto space-y-1 sm:space-y-2 pb-4">
                {currentMessages.map((msg, idx) => {
                  const isLastAssistant =
                    msg.role === 'assistant' && idx === currentMessages.length - 1;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isLastAssistantMessage={isLastAssistant}
                      isSpeakingThisMessage={
                        voiceState.isSpeaking &&
                        (activeSpeakingMsgId === msg.id ||
                          (activeSpeakingMsgId === null && isLastAssistant))
                      }
                      personality={currentPersonality}
                      onSpeak={handleMessageSpeak}
                      onStopSpeaking={handleMessageStopSpeaking}
                      onRegenerate={regenerateLastResponse}
                      onRetry={handleRetryLastMessage}
                    />
                  );
                })}

                {isGenerating &&
                  !currentMessages.some(
                    (m) => m.role === 'assistant' && m.status === 'sending'
                  ) && <TypingIndicator personality={currentPersonality} />}

                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* Interactive Voice Equalizer & Live State Bar */}
          <WaveformEqualizer
            voiceState={voiceState}
            onInterrupt={stopSpeaking}
            onStartListening={startListening}
            onStopListening={stopListening}
            className="show-idle"
          />

          {/* Chat Input Floating Dock */}
          <ChatInput
            onSendMessage={(text) => handleUserMessageOrCommand(text)}
            onStopGenerating={stopGenerating}
            isGenerating={isGenerating}
            voiceState={voiceState}
            onStartListening={startListening}
            onStopListening={stopListening}
            onStopSpeaking={stopSpeaking}
          />
        </div>

        {/* MacBook M5 Automation & Control Center Drawer */}
        <AutomationPanel
          isOpen={isAutomationPanelOpen}
          onClose={() => setIsAutomationPanelOpen(false)}
          activeTab={activePanelTab}
          onTabChange={setActivePanelTab}
          telemetry={telemetry}
          tasks={tasks}
          youtubeState={youtubeState}
          emailDrafts={emailDrafts}
          emailInbox={emailInbox}
          emailInboxReadApproved={emailInboxReadApproved}
          files={files}
          activeFolder={activeFolder}
          onSelectFolder={setActiveFolder}
          openedFile={openedFile}
          onCloseOpenedFile={closeOpenedFile}
          shortcuts={shortcuts}
          isExecutingTask={isExecutingTask}
          onExecuteAction={executeAction}
          onConfirmTask={confirmTask}
          onCancelTask={cancelTask}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearHistory={clearAllHistory}
        availableVoices={availableVoices}
      />
    </div>
  );
}
