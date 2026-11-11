import React, { useState, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { Copy, Check, Volume2, VolumeX, RotateCw, User, AlertCircle } from 'lucide-react';
import { Message, PersonalityMode } from '../types';
import { DharshuAvatar } from './DharshuAvatar';
import { PERSONALITIES } from '../data/personalities';

interface MessageBubbleProps {
  message: Message;
  isLastAssistantMessage?: boolean;
  isSpeakingThisMessage?: boolean;
  personality?: PersonalityMode;
  onCopy?: (text: string) => void;
  onSpeak?: (text: string, messageId: string) => void;
  onStopSpeaking?: () => void;
  onRegenerate?: () => void;
  onRetry?: () => void;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isLastAssistantMessage = false,
  isSpeakingThisMessage = false,
  personality = 'friendly',
  onCopy,
  onSpeak,
  onStopSpeaking,
  onRegenerate,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const personalityInfo = PERSONALITIES[personality] || PERSONALITIES.friendly;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    if (onCopy) onCopy(message.content);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeakToggle = () => {
    if (isSpeakingThisMessage) {
      if (onStopSpeaking) onStopSpeaking();
    } else {
      if (onSpeak) onSpeak(message.content, message.id);
    }
  };

  const formattedTime = useMemo(
    () =>
      new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [message.timestamp]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 sm:gap-3.5 my-2.5 sm:my-3.5 px-1 sm:px-2 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md border border-white/30 backdrop-blur-md">
          <User className="w-4 h-4 text-white" />
        </div>
      ) : (
        <DharshuAvatar size="md" isSpeaking={isSpeakingThisMessage} personality={personality} />
      )}

      {/* Bubble Container */}
      <div className={`group relative max-w-[88%] sm:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Author & Timestamp Header */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            {isUser ? 'You' : 'Dharshu'}
            {!isUser && (
              <span className="text-[10px] text-zinc-400 font-normal">
                ({personalityInfo.name})
              </span>
            )}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{formattedTime}</span>
        </div>

        {/* Message Card */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed transition-all ${
            isUser
              ? 'glass-bubble-user text-white rounded-tr-xs shadow-lg'
              : isError
              ? 'bg-rose-500/15 backdrop-blur-md border border-rose-500/30 text-rose-900 dark:text-rose-200 rounded-tl-xs shadow-md'
              : 'glass-bubble-bot text-zinc-900 dark:text-zinc-100 rounded-tl-xs'
          }`}
        >
          {/* Content Rendering */}
          {isUser ? (
            <div className="whitespace-pre-wrap break-words drop-shadow-xs">{message.content}</div>
          ) : isError ? (
            <div className="space-y-2">
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {message.errorMessage || 'Connection issue'}
                </span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/90 text-white hover:bg-rose-500 font-medium transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <RotateCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : !message.content && message.status === 'sending' ? (
            <div className="flex items-center gap-2 py-1">
              <span className="text-xs text-zinc-400 font-medium">Thinking...</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          ) : (
            <div className="prose-dharshu whitespace-pre-wrap break-words">
              <Markdown>{message.content}</Markdown>
              {message.status === 'sending' && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse rounded-full align-middle" />
              )}
            </div>
          )}

          {/* Action Toolbar for Assistant Messages */}
          {!isUser && !isError && message.status !== 'sending' && message.content && (
            <div className="mt-2.5 pt-2 border-t border-white/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  title={copied ? 'Copied to clipboard' : 'Copy message'}
                  className="p-1.5 rounded-lg glass-button text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Speak / Read Aloud Button */}
                {onSpeak && (
                  <button
                    onClick={handleSpeakToggle}
                    title={isSpeakingThisMessage ? 'Stop voice' : 'Listen to Dharshu'}
                    className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-medium ${
                      isSpeakingThisMessage
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 animate-pulse backdrop-blur-md'
                        : 'glass-button text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isSpeakingThisMessage ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Speaking</span>
                      </>
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Regenerate Button on last assistant message */}
              {isLastAssistantMessage && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate this response"
                  className="px-2 py-1 text-xs rounded-lg glass-button text-zinc-400 hover:text-indigo-300 transition flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.errorMessage === next.message.errorMessage &&
    prev.isLastAssistantMessage === next.isLastAssistantMessage &&
    prev.isSpeakingThisMessage === next.isSpeakingThisMessage &&
    prev.personality === next.personality
  );
});

