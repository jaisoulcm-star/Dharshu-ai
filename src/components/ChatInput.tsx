import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square, AlertCircle, Sparkles, AudioLines } from 'lucide-react';
import { VoiceState } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  voiceState: VoiceState;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  voiceState,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  placeholder = 'Message Dharshu... (Tanglish / Tamil / English)',
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto update input text when speech recognition transcript changes
  useEffect(() => {
    if (voiceState.transcript) {
      setInputText(voiceState.transcript);

      // If user speaks "Dharshu" or variants, stop listening to trigger quick response
      const lower = voiceState.transcript.toLowerCase();
      if (
        voiceState.isListening &&
        (lower.includes('dharshu') ||
          lower.includes('darshu') ||
          lower.includes('dharsu') ||
          lower.includes('darsu') ||
          lower.includes('dharshini'))
      ) {
        onStopListening();
      }
    }
  }, [voiceState.transcript, voiceState.isListening, onStopListening]);

  // Auto-send when voice listening ends if text was captured
  const prevListeningRef = useRef(voiceState.isListening);
  useEffect(() => {
    if (prevListeningRef.current && !voiceState.isListening) {
      const capturedText = (voiceState.transcript || inputText).trim();
      if (capturedText && !isGenerating) {
        onSendMessage(capturedText);
        setInputText('');
      }
    }
    prevListeningRef.current = voiceState.isListening;
  }, [voiceState.isListening, voiceState.transcript, inputText, isGenerating, onSendMessage]);

  // Adjust textarea height smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;

    if (voiceState.isListening) {
      onStopListening();
    }

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
    }
    if (voiceState.isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-2 sm:pb-3 relative z-20">
      {/* Listening Banner */}
      {voiceState.isListening && (
        <div className="mb-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 backdrop-blur-md border border-indigo-400/40 flex items-center justify-between text-xs text-indigo-200 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <AudioLines className="w-4 h-4 text-indigo-300" />
            <span className="font-semibold">Listening to your voice... Speak to Dharshu</span>
          </div>
          <button
            onClick={onStopListening}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      )}

      {/* Permission Denied Notice */}
      {voiceState.permissionDenied && (
        <div className="mb-2 px-3.5 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 flex items-center gap-2 text-xs text-rose-200 shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Microphone access is blocked. Allow microphone permission in your browser settings to talk to Dharshu.</span>
        </div>
      )}

      {/* Dharshu Speaking Stop Bar */}
      {voiceState.isSpeaking && (
        <div className="mb-2 flex justify-center">
          <button
            onClick={onStopSpeaking}
            className="px-3.5 py-1.5 rounded-full glass-card border-indigo-400/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-lg animate-pulse cursor-pointer hover:bg-indigo-500/20"
          >
            <Square className="w-3 h-3 fill-current text-rose-400" />
            <span>Stop Dharshu voice playback</span>
          </button>
        </div>
      )}

      {/* Main Glass Input Dock */}
      <div className="relative rounded-2xl glass-dock p-1.5 sm:p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-400/50 focus-within:border-indigo-400">
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Multi-line Auto-expanding Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isGenerating}
            className="flex-1 bg-transparent border-0 resize-none px-2.5 py-2 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-400 focus:outline-none max-h-32 min-h-[40px]"
          />

          <div className="flex items-center gap-1 pb-0.5 shrink-0">
            {/* Mic Button */}
            {voiceState.isSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={isGenerating || voiceState.permissionDenied}
                title={voiceState.isListening ? 'Stop listening' : 'Voice input'}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  voiceState.isListening
                    ? 'bg-rose-500 text-white shadow-lg animate-pulse border border-white/30'
                    : 'glass-button text-zinc-600 dark:text-zinc-300 hover:text-indigo-400'
                } disabled:opacity-40`}
                aria-label="Voice input"
              >
                {voiceState.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isGenerating}
              title="Send message"
              className={`p-2.5 rounded-xl font-medium transition-all flex items-center justify-center cursor-pointer ${
                inputText.trim() && !isGenerating
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white shadow-md border border-white/20'
                  : 'glass-button text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-50'
              }`}
              aria-label="Send message"
            >
              {isGenerating ? (
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Helper Subtitle */}
      <div className="mt-1 text-[11px] text-center text-zinc-400 dark:text-zinc-400 flex items-center justify-center gap-2">
        <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
        <span className="hidden sm:inline">•</span>
        <span>Remix Dharshu AI</span>
      </div>
    </div>
  );
};
