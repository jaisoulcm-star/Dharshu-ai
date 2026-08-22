import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { SettingsState, PersonalityMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageBubble } from './components/MessageBubble';
import { TypingIndicator } from './components/TypingIndicator';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { WaveformEqualizer } from './components/WaveformEqualizer';

const SETTINGS_STORAGE_KEY = 'dharshu_settings_v1';

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
  // Load settings state from localStorage
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return defaultSettings;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<((text: string) => void) | null>(null);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Sync theme class on HTML element
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

  // Callback for voice commands from wake word or speech recognition
  const handleVoiceCommand = useCallback((commandText: string) => {
    if (commandText.trim() && sendMessageRef.current) {
      sendMessageRef.current(commandText.trim());
    }
  }, []);

  // Voice hook with Alexa compatibility
  const {
    voiceState,
    availableVoices,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    setThinking,
  } = useVoice(settings, handleVoiceCommand);

  // Auto read responses
  const handleAutoRead = (text: string) => {
    if (settings.voiceEnabled && settings.autoReadResponses) {
      speakText(text);
    }
  };

  // Chat management hook
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createNewSession,
    deleteSession,
    clearAllHistory,
    sendMessage,
    regenerateLastResponse,
    setSessionPersonality,
    isGenerating,
    searchQuery,
    setSearchQuery,
  } = useChat(settings, handleAutoRead);

  // Keep sendMessageRef updated for voice commands
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Sync thinking state with voice state
  useEffect(() => {
    setThinking(isGenerating);
  }, [isGenerating, setThinking]);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isGenerating]);

  // Settings update handler
  const handleUpdateSettings = (newPartial: Partial<SettingsState>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      if (newPartial.personality && activeSessionId) {
        setSessionPersonality(activeSessionId, newPartial.personality);
      }
      return updated;
    });
  };

  const currentPersonality = activeSession?.personality || settings.personality;
  const currentMessages = activeSession?.messages || [];

  return (
    <div
      className={`fixed inset-0 w-full h-[100dvh] flex flex-col font-sans transition-colors duration-300 overflow-hidden select-none sm:select-auto ${
        settings.theme === 'light'
          ? 'bg-slate-100/90 text-slate-900'
          : 'bg-[#0b0d14] text-zinc-100'
      }`}
    >
      {/* Ambient Background Glowing Mesh (Creates the refractive depth behind the glass panels) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full blur-[120px] opacity-40 animate-orb-1 ${
            settings.theme === 'light' ? 'bg-indigo-300' : 'bg-indigo-700/50'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-32 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full blur-[140px] opacity-35 animate-orb-2 ${
            settings.theme === 'light' ? 'bg-purple-300' : 'bg-purple-800/40'
          }`}
        />
        <div
          className={`absolute -bottom-32 left-1/3 w-80 sm:w-[550px] h-80 sm:h-[550px] rounded-full blur-[130px] opacity-30 animate-orb-3 ${
            settings.theme === 'light' ? 'bg-pink-300' : 'bg-pink-700/30'
          }`}
        />
      </div>

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
          onSelectPersonality={(mode: PersonalityMode) =>
            handleUpdateSettings({ personality: mode })
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
          />

          {/* Messages & Content Scroll Area */}
          <main className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-5 scroll-smooth">
            {currentMessages.length === 0 ? (
              <WelcomeScreen
                selectedPersonality={currentPersonality}
                onSelectPrompt={(promptText, mode) => {
                  if (mode) handleUpdateSettings({ personality: mode });
                  sendMessage(promptText, mode);
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
                      isSpeakingThisMessage={voiceState.isSpeaking && activeSpeakingMsgId === msg.id}
                      personality={currentPersonality}
                      onSpeak={(text) => {
                        setActiveSpeakingMsgId(msg.id);
                        speakText(text);
                      }}
                      onStopSpeaking={() => {
                        stopSpeaking();
                        setActiveSpeakingMsgId(null);
                      }}
                      onRegenerate={regenerateLastResponse}
                      onRetry={() => {
                        const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
                        if (lastUserMsg) sendMessage(lastUserMsg.content);
                      }}
                    />
                  );
                })}

                {/* Thinking indicator when not streaming into a message bubble */}
                {isGenerating &&
                  !currentMessages.some(
                    (m) => m.role === 'assistant' && m.status === 'sending'
                  ) && <TypingIndicator personality={currentPersonality} />}

                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* Interactive Voice Equalizer & Live State Bar (Listening / Thinking / Speaking) */}
          <WaveformEqualizer
            voiceState={voiceState}
            onInterrupt={stopSpeaking}
            onStartListening={startListening}
          />

          {/* Chat Input Floating Dock */}
          <ChatInput
            onSendMessage={(text) => sendMessage(text)}
            isGenerating={isGenerating}
            voiceState={voiceState}
            onStartListening={startListening}
            onStopListening={stopListening}
            onStopSpeaking={stopSpeaking}
          />
        </div>
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
