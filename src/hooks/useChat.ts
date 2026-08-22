import { useState, useEffect, useCallback } from 'react';
import { ChatSession, Message, PersonalityMode, LanguagePref, SettingsState } from '../types';

const STORAGE_KEY = 'dharshu_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'dharshu_active_session_id_v1';

const parseErrorFormatted = (err: any): { content: string; errorMessage: string } => {
  let rawStr = typeof err === 'string' ? err : err?.message || String(err || '');

  if (rawStr.includes('{') && rawStr.includes('}')) {
    try {
      const jsonStart = rawStr.indexOf('{');
      const jsonEnd = rawStr.lastIndexOf('}') + 1;
      const parsed = JSON.parse(rawStr.substring(jsonStart, jsonEnd));
      if (parsed.error?.message) {
        rawStr = parsed.error.message;
      } else if (typeof parsed.error === 'string') {
        rawStr = parsed.error;
      }
    } catch {
      // Ignore JSON parse fail
    }
  }

  const isQuota =
    rawStr.includes('429') ||
    rawStr.includes('RESOURCE_EXHAUSTED') ||
    rawStr.toLowerCase().includes('quota') ||
    rawStr.toLowerCase().includes('rate limit');

  if (isQuota) {
    return {
      content: 'Ayyo, API rate limit or quota reached right now! Please wait about 15-30 seconds and click Retry.',
      errorMessage: 'API Rate limit / Quota exceeded (429)',
    };
  }

  const isUnavailable =
    rawStr.includes('503') ||
    rawStr.toLowerCase().includes('high demand') ||
    rawStr.toLowerCase().includes('unavailable');

  if (isUnavailable) {
    return {
      content: 'The model is currently experiencing temporary high traffic. Please click Retry to reconnect.',
      errorMessage: 'Model busy / High demand (503)',
    };
  }

  return {
    content: 'Ayyo, small connection issue! Let us try that again.',
    errorMessage: rawStr.length > 100 ? 'Connection error' : rawStr || 'Failed to connect to Dharshu AI',
  };
};

async function streamChatResponse(
  body: any,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error (${response.status})`);
  }

  if (!response.body) {
    throw new Error('Response body is unavailable for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');

      if (dataStr === '[DONE]') {
        return accumulatedText;
      }

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.chunk) {
          accumulatedText += parsed.chunk;
          onChunk(accumulatedText);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) {
          throw e;
        }
      }
    }
  }

  return accumulatedText;
}

async function fetchChatWithRetry(body: any, retries = 1, delayMs = 500): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      return await response.json();
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastErr;
}

export function useChat(settings: SettingsState, onAutoReadResponse?: (text: string) => void) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);

      if (savedSessions) {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        setSessions(parsed);

        if (savedActiveId && parsed.some((s) => s.id === savedActiveId)) {
          setActiveSessionId(savedActiveId);
        } else if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load sessions from localStorage', e);
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      if (sessions.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save sessions to localStorage', e);
    }
  }, [sessions]);

  // Save active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  // Get current active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Create a new session
  const createNewSession = useCallback(
    (initialPersonality?: PersonalityMode) => {
      const newId = `session_${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        personality: initialPersonality || settings.personality,
        languagePref: settings.languagePref,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newId);
      return newId;
    },
    [settings.personality, settings.languagePref]
  );

  // Delete a specific session
  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (sessionId === activeSessionId) {
          setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
    },
    [activeSessionId]
  );

  // Clear all history
  const clearAllHistory = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }, []);

  // Send message to Dharshu AI
  const sendMessage = useCallback(
    async (content: string, customPersonality?: PersonalityMode) => {
      if (!content.trim() || isGenerating) return;

      let currentSessionId = activeSessionId;
      let currentSession = sessions.find((s) => s.id === currentSessionId);

      // If no active session exists, create one
      if (!currentSessionId || !currentSession) {
        currentSessionId = createNewSession(customPersonality);
      }

      const userMessage: Message = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };

      const personalityToUse = customPersonality || currentSession?.personality || settings.personality;

      // Add user message and initial streaming assistant message to session
      const assistantMsgId = `msg_assistant_${Date.now()}`;
      const initialAssistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            const isFirstMsg = s.messages.length === 0;
            const generatedTitle = isFirstMsg
              ? content.trim().slice(0, 32) + (content.length > 32 ? '...' : '')
              : s.title;

            return {
              ...s,
              title: generatedTitle,
              updatedAt: Date.now(),
              personality: personalityToUse,
              messages: [...s.messages, userMessage, initialAssistantMessage],
            };
          }
          return s;
        })
      );

      setIsGenerating(true);

      try {
        // Retrieve full conversation context to send to API (excluding error messages and the empty placeholder)
        const sessionToUse = sessions.find((s) => s.id === currentSessionId);
        const existingMessages = sessionToUse
          ? sessionToUse.messages.filter((m) => m.status !== 'error' && m.id !== assistantMsgId)
          : [];
        const fullMessageHistory = [...existingMessages, userMessage].map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

        let streamAccumulated = '';
        const handleChunk = (chunkText: string) => {
          streamAccumulated = chunkText;
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === currentSessionId) {
                return {
                  ...s,
                  updatedAt: Date.now(),
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: chunkText, status: 'sending' }
                      : m
                  ),
                };
              }
              return s;
            })
          );
        };

        try {
          streamAccumulated = await streamChatResponse(
            {
              messages: fullMessageHistory,
              personality: personalityToUse,
              languagePref: settings.languagePref,
            },
            handleChunk
          );
        } catch (streamErr) {
          console.warn('Streaming encountered issue, utilizing fast fallback:', streamErr);
          if (!streamAccumulated) {
            const data = await fetchChatWithRetry({
              messages: fullMessageHistory,
              personality: personalityToUse,
              languagePref: settings.languagePref,
            });
            streamAccumulated = data.text || "Naan inga dhaan irukken! Can you say that again?";
          }
        }

        const assistantText = streamAccumulated || "Naan inga dhaan irukken!";

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: assistantText, status: 'sent' }
                    : m
                ),
              };
            }
            return s;
          })
        );

        // Auto read response if enabled
        if (settings.autoReadResponses && onAutoReadResponse) {
          onAutoReadResponse(assistantText);
        }
      } catch (err: any) {
        console.error('Error sending message:', err);
        const { content, errorMessage: formattedError } = parseErrorFormatted(err);
        
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content,
                        status: 'error',
                        errorMessage: formattedError,
                      }
                    : m
                ),
              };
            }
            return s;
          })
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [activeSessionId, sessions, isGenerating, settings, createNewSession, onAutoReadResponse]
  );

  // Regenerate last response
  const regenerateLastResponse = useCallback(async () => {
    if (!activeSession || isGenerating || activeSession.messages.length === 0) return;

    // Find last user message
    const msgs = activeSession.messages;
    const lastUserMsgIdx = [...msgs].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMsgIdx === -1) return;

    const actualIdx = msgs.length - 1 - lastUserMsgIdx;

    // Generate assistant placeholder
    const assistantMsgId = `msg_assistant_${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    };

    // Trim messages up to that user message and append placeholder
    const trimmedMsgs = msgs.slice(0, actualIdx + 1);

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...trimmedMsgs, initialAssistantMessage],
          };
        }
        return s;
      })
    );

    setIsGenerating(true);

    try {
      const fullMessageHistory = trimmedMsgs
        .filter((m) => m.status !== 'error')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

      let streamAccumulated = '';
      const handleChunk = (chunkText: string) => {
        streamAccumulated = chunkText;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSession.id) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: chunkText, status: 'sending' }
                    : m
                ),
              };
            }
            return s;
          })
        );
      };

      try {
        streamAccumulated = await streamChatResponse(
          {
            messages: fullMessageHistory,
            personality: activeSession.personality || settings.personality,
            languagePref: settings.languagePref,
          },
          handleChunk
        );
      } catch (streamErr) {
        if (!streamAccumulated) {
          const data = await fetchChatWithRetry({
            messages: fullMessageHistory,
            personality: activeSession.personality || settings.personality,
            languagePref: settings.languagePref,
          });
          streamAccumulated = data.text || "Naan inga dhaan irukken!";
        }
      }

      const assistantText = streamAccumulated || "Naan inga dhaan irukken!";

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: assistantText, status: 'sent' }
                  : m
              ),
            };
          }
          return s;
        })
      );

      if (settings.autoReadResponses && onAutoReadResponse) {
        onAutoReadResponse(assistantText);
      }
    } catch (err: any) {
      console.error('Error regenerating response:', err);
      const { content, errorMessage: formattedError } = parseErrorFormatted(err);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content,
                      status: 'error',
                      errorMessage: formattedError,
                    }
                  : m
              ),
            };
          }
          return s;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  }, [activeSession, isGenerating, settings, onAutoReadResponse]);

  // Update personality mode for active session
  const setSessionPersonality = useCallback((sessionId: string, personality: PersonalityMode) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, personality } : s))
    );
  }, []);

  // Filter sessions by search query
  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return {
    sessions: filteredSessions,
    allSessionsCount: sessions.length,
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
  };
}
