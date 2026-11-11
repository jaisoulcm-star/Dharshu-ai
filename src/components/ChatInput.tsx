import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square, AlertCircle } from 'lucide-react';
import { VoiceState } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStopGenerating?: () => void;
  isGenerating: boolean;
  voiceState: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  onSendMessage,
  onStopGenerating,
  isGenerating,
  voiceState,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  placeholder = 'Say "Hey Darshu" or type a message... (English / Tamil / Tanglish)',
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;

    onSendMessage(inputText.trim());
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (voiceState.isSpeaking) {
      onStopSpeaking();
      onStartListening();
      return;
    }
    if (voiceState.isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-2 sm:pb-3 relative z-20">
      {/* Permission Denied Notice */}
      {voiceState.permissionDenied && (
        <div className="mb-2 px-3.5 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 flex items-center gap-2 text-xs text-rose-200 shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Microphone access is blocked. Allow microphone permission in your browser address bar to use "Hey Darshu" voice mode.
          </span>
        </div>
      )}

      {/* Main Glass Input Dock */}
      <div className="relative rounded-2xl glass-dock p-1.5 sm:p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-400/50 focus-within:border-indigo-400">
        <div className="flex items-end gap-1.5 sm:gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none px-2.5 py-2 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-400 focus:outline-none max-h-32 min-h-[40px]"
          />

          <div className="flex items-center gap-1 pb-0.5 shrink-0">
            {/* Mic Button with live activity state */}
            {voiceState.isSupported && (
              <button
                type="button"
                onClick={toggleMic}
                title={
                  voiceState.isSpeaking
                    ? 'Interrupt and speak'
                    : voiceState.isListening
                    ? 'Pause active listening'
                    : 'Start voice conversation (or say "Hey Darshu")'
                }
                className={`relative p-2.5 rounded-xl transition-all cursor-pointer ${
                  voiceState.isListening
                    ? 'bg-cyan-500 text-white shadow-lg border border-white/30'
                    : voiceState.isWakeWordStandby
                    ? 'glass-button text-emerald-400 border-emerald-500/30 hover:text-emerald-300'
                    : 'glass-button text-zinc-600 dark:text-zinc-300 hover:text-indigo-400'
                }`}
                aria-label="Voice input"
              >
                {voiceState.isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Stop Generating OR Send Button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGenerating}
                title="Stop generating response"
                className="p-2.5 rounded-xl font-medium transition-all flex items-center justify-center cursor-pointer bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md border border-rose-400/40"
                aria-label="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim()}
                title="Send message"
                className={`p-2.5 rounded-xl font-medium transition-all flex items-center justify-center cursor-pointer ${
                  inputText.trim()
                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white shadow-md border border-white/20'
                    : 'glass-button text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50'
                }`}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Helper Subtitle */}
      <div className="mt-1 text-[11px] text-center text-zinc-400 dark:text-zinc-400 flex items-center justify-center gap-2">
        <span>Wake words: Say "Hey Darshu", "Hey Dashu", or "Jasa"</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
      </div>
    </div>
  );
});
