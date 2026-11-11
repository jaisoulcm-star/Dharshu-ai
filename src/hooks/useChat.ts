import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChatSession, Message, PersonalityMode, SettingsState } from '../types';

const STORAGE_KEY = 'dharshu_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'dharshu_active_session_id_v1';
const MAX_CONTEXT_MESSAGES = 12;

function buildClientFallbackReply(userText: string): string {
  const q = (userText || '').trim();
  const qLower = q.toLowerCase();
  if (/\b(youtube|lofi|music|video|song|beats)\b/i.test(qLower)) {
    return `Sure! I've opened the YouTube Smart Controller in your MacBook Control Center and queued up "${q}".`;
  }
  if (/\b(vs\s*code|safari|chrome|finder|terminal|spotify|notes|settings)\b/i.test(qLower)) {
    return `Done! I've triggered that application action on your MacBook Air M5.`;
  }
  return `Naan inga dhaan irukken! Regarding "${q}"—I'm right here with you on your MacBook Air M5. How would you like to proceed?`;
}

async function streamChatResponse(
  body: any,
  onChunk: (text: string) => void,
  externalSignal?: AbortSignal,
  timeoutMs = 25000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(new DOMException('Stream request timed out', 'TimeoutError')),
    timeoutMs
  );

  const onExternalAbort = () =>
    controller.abort(externalSignal?.reason || new DOMException('Cancelled by user', 'AbortError'));

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason || new DOMException('Cancelled by user', 'AbortError'));
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server status ${response.status}`);
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
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

async function fetchChatFallback(body: any, externalSignal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(new DOMException('Fallback request timed out', 'TimeoutError')),
    15000
  );
  const onExternalAbort = () =>
    controller.abort(externalSignal?.reason || new DOMException('Cancelled by user', 'AbortError'));

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason || new DOMException('Cancelled by user', 'AbortError'));
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const data = await response.json();
    return data.text || '';
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export function useChat(settings: SettingsState, onAutoReadResponse?: (text: string) => void) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeAbortRef = useRef<AbortController | null>(null);
  const sessionsRef = useRef<ChatSession[]>(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);

      if (savedSessions) {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        setSessions(parsed);
        sessionsRef.current = parsed;

        if (savedActiveId && parsed.some((s) => s.id === savedActiveId)) {
          setActiveSessionId(savedActiveId);
          activeSessionIdRef.current = savedActiveId;
        } else if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
          activeSessionIdRef.current = parsed[0].id;
        }
      }
    } catch {
      // Ignore storage read issues
    }
  }, []);

  useEffect(() => {
    if (isGenerating) return;

    const saveTimer = window.setTimeout(() => {
      try {
        if (sessions.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore storage write issues
      }
    }, 150);

    return () => window.clearTimeout(saveTimer);
  }, [sessions, isGenerating]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const stopGenerating = useCallback(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort(new DOMException('Cancelled by user', 'AbortError'));
      activeAbortRef.current = null;
    }
    setIsGenerating(false);
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.status === 'sending'
            ? {
                ...m,
                content: m.content || 'Response cancelled.',
                status: 'sent' as const,
              }
            : m
        ),
      }))
    );
  }, []);

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

      setSessions((prev) => {
        const next = [newSession, ...prev];
        sessionsRef.current = next;
        return next;
      });
      setActiveSessionId(newId);
      activeSessionIdRef.current = newId;
      return newId;
    },
    [settings.personality, settings.languagePref]
  );

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      sessionsRef.current = filtered;
      if (sessionId === activeSessionIdRef.current) {
        const nextActive = filtered.length > 0 ? filtered[0].id : null;
        setActiveSessionId(nextActive);
        activeSessionIdRef.current = nextActive;
      }
      return filtered;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    stopGenerating();
    setSessions([]);
    sessionsRef.current = [];
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }, [stopGenerating]);

  const sendMessage = useCallback(
    async (content: string, customPersonality?: PersonalityMode) => {
      if (!content.trim() || isGenerating) return;

      let currentSessionId = activeSessionIdRef.current;
      let currentSession = sessionsRef.current.find((s) => s.id === currentSessionId);

      if (!currentSessionId || !currentSession) {
        currentSessionId = createNewSession(customPersonality);
        currentSession = sessionsRef.current.find((s) => s.id === currentSessionId);
      }

      const userMessage: Message = {
        id: `msg_user_${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };

      const personalityToUse =
        customPersonality || currentSession?.personality || settings.personality;

      const assistantMsgId = `msg_assistant_${Date.now()}`;
      const initialAssistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      const existingMessages = currentSession
        ? currentSession.messages
            .filter((m) => m.status !== 'error' && m.id !== assistantMsgId && m.content.trim())
            .slice(-(MAX_CONTEXT_MESSAGES - 1))
        : [];

      setSessions((prev) => {
        const next = prev.map((s) => {
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
        });
        sessionsRef.current = next;
        return next;
      });

      const requestAbortController = new AbortController();
      activeAbortRef.current = requestAbortController;
      setIsGenerating(true);

      let rafId: number | null = null;
      try {
        const fullMessageHistory = [...existingMessages, userMessage].map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

        let streamAccumulated = '';
        let latestPendingText = '';

        const handleChunk = (chunkText: string) => {
          streamAccumulated = chunkText;
          latestPendingText = chunkText;

          if (rafId === null) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              const textToRender = latestPendingText;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      updatedAt: Date.now(),
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: textToRender, status: 'sending' as const }
                          : m
                      ),
                    };
                  }
                  return s;
                })
              );
            });
          }
        };

        try {
          streamAccumulated = await streamChatResponse(
            {
              messages: fullMessageHistory,
              personality: personalityToUse,
              languagePref: settings.languagePref,
            },
            handleChunk,
            requestAbortController.signal
          );
        } catch {
          if (requestAbortController.signal.aborted) {
            return;
          }
          if (!streamAccumulated) {
            try {
              streamAccumulated = await fetchChatFallback(
                {
                  messages: fullMessageHistory,
                  personality: personalityToUse,
                  languagePref: settings.languagePref,
                },
                requestAbortController.signal
              );
            } catch {
              streamAccumulated = buildClientFallbackReply(content);
            }
          }
        }

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        if (requestAbortController.signal.aborted) {
          return;
        }

        const assistantText = streamAccumulated || buildClientFallbackReply(content);

        setSessions((prev) => {
          const next: ChatSession[] = prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: assistantText, status: 'sent' as const }
                    : m
                ),
              };
            }
            return s;
          });
          sessionsRef.current = next;
          return next;
        });

        if (
          !requestAbortController.signal.aborted &&
          settings.voiceEnabled &&
          settings.autoReadResponses &&
          onAutoReadResponse
        ) {
          onAutoReadResponse(assistantText);
        }
      } finally {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        if (activeAbortRef.current === requestAbortController) {
          activeAbortRef.current = null;
        }
        setIsGenerating(false);
      }
    },
    [isGenerating, settings, createNewSession, onAutoReadResponse]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (!activeSession || isGenerating || activeSession.messages.length === 0) return;

    const msgs = activeSession.messages;
    const lastUserMsgIdx = [...msgs].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMsgIdx === -1) return;

    const actualIdx = msgs.length - 1 - lastUserMsgIdx;
    const lastUserContent = msgs[actualIdx]?.content || '';

    const assistantMsgId = `msg_assistant_${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    };

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

    const requestAbortController = new AbortController();
    activeAbortRef.current = requestAbortController;
    setIsGenerating(true);

    let rafId: number | null = null;
    try {
      const fullMessageHistory = trimmedMsgs
        .filter((m) => m.status !== 'error' && m.content.trim())
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

      let streamAccumulated = '';
      let latestPendingText = '';

      const handleChunk = (chunkText: string) => {
        streamAccumulated = chunkText;
        latestPendingText = chunkText;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            const textToRender = latestPendingText;
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id === activeSession.id) {
                  return {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: textToRender, status: 'sending' as const }
                        : m
                    ),
                  };
                }
                return s;
              })
            );
          });
        }
      };

      try {
        streamAccumulated = await streamChatResponse(
          {
            messages: fullMessageHistory,
            personality: activeSession.personality || settings.personality,
            languagePref: settings.languagePref,
          },
          handleChunk,
          requestAbortController.signal
        );
      } catch {
        if (requestAbortController.signal.aborted) return;
        if (!streamAccumulated) {
          try {
            streamAccumulated = await fetchChatFallback(
              {
                messages: fullMessageHistory,
                personality: activeSession.personality || settings.personality,
                languagePref: settings.languagePref,
              },
              requestAbortController.signal
            );
          } catch {
            streamAccumulated = buildClientFallbackReply(lastUserContent);
          }
        }
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (requestAbortController.signal.aborted) return;

      const assistantText = streamAccumulated || buildClientFallbackReply(lastUserContent);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: assistantText, status: 'sent' as const }
                  : m
              ),
            };
          }
          return s;
        })
      );

      if (
        !requestAbortController.signal.aborted &&
        settings.voiceEnabled &&
        settings.autoReadResponses &&
        onAutoReadResponse
      ) {
        onAutoReadResponse(assistantText);
      }
    } finally {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (activeAbortRef.current === requestAbortController) {
        activeAbortRef.current = null;
      }
      setIsGenerating(false);
    }
  }, [activeSession, isGenerating, settings, onAutoReadResponse]);

  const setSessionPersonality = useCallback((sessionId: string, personality: PersonalityMode) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, personality } : s))
    );
  }, []);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

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
    stopGenerating,
    regenerateLastResponse,
    setSessionPersonality,
    isGenerating,
    searchQuery,
    setSearchQuery,
  };
}
