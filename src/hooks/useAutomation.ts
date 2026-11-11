import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AutomationTask,
  SystemTelemetry,
  YouTubeControllerState,
  EmailDraft,
  EmailItem,
  ManagedFileItem,
  AutomationNotification,
} from '../types';

export interface MacShortcutItem {
  name: string;
  description: string;
  actionsSummary: string;
}

export type PanelTab = 'activity' | 'mac_apps' | 'youtube' | 'email' | 'files';

export function useAutomation(onSpeakFeedback?: (text: string) => void) {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [youtubeState, setYoutubeState] = useState<YouTubeControllerState>({
    isOpen: false,
    query: 'lofi study beats',
    isPlaying: false,
    volume: 75,
    currentChannel: 'Lofi Girl',
    currentIndex: 0,
    playlist: [],
  });
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [emailInbox, setEmailInbox] = useState<EmailItem[]>([]);
  const [emailInboxReadApproved, setEmailInboxReadApproved] = useState<boolean>(false);
  const [files, setFiles] = useState<ManagedFileItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('All');
  const [openedFile, setOpenedFile] = useState<ManagedFileItem | null>(null);
  const [shortcuts, setShortcuts] = useState<MacShortcutItem[]>([]);
  const [notifications, setNotifications] = useState<AutomationNotification[]>([]);
  const [isExecutingTask, setIsExecutingTask] = useState<boolean>(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('activity');

  const onSpeakRef = useRef(onSpeakFeedback);
  useEffect(() => {
    onSpeakRef.current = onSpeakFeedback;
  }, [onSpeakFeedback]);

  const addNotification = useCallback(
    (
      type: AutomationNotification['type'],
      title: string,
      message: string,
      actionUrl?: string
    ) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setNotifications((prev) => [
        { id, type, title, message, actionUrl, timestamp: Date.now() },
        ...prev.slice(0, 3),
      ]);
      window.setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6500);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const closeOpenedFile = useCallback(() => {
    setOpenedFile(null);
  }, []);

  const applyServerSnapshot = useCallback((data: any) => {
    if (data.telemetry) setTelemetry(data.telemetry);
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (data.youtube) setYoutubeState(data.youtube);
    if (Array.isArray(data.emailDrafts)) setEmailDrafts(data.emailDrafts);
    if (Array.isArray(data.emailInbox)) setEmailInbox(data.emailInbox);
    if (typeof data.emailInboxReadApproved === 'boolean') {
      setEmailInboxReadApproved(data.emailInboxReadApproved);
    }
    if (Array.isArray(data.files)) setFiles(data.files);
    if (typeof data.activeFolder === 'string') setActiveFolder(data.activeFolder || 'All');
    if ('openedFile' in data) setOpenedFile(data.openedFile || null);
    if (Array.isArray(data.shortcuts)) setShortcuts(data.shortcuts);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/state');
      if (res.ok) {
        const data = await res.json();
        applyServerSnapshot(data);
      }
    } catch {
      // Ignore background poll error
    }
  }, [applyServerSnapshot]);

  useEffect(() => {
    refreshState();
    const interval = window.setInterval(refreshState, 15000);
    return () => window.clearInterval(interval);
  }, [refreshState]);

  const routeTaskTab = useCallback((task: AutomationTask) => {
    if (task.status === 'awaiting_confirmation') {
      setActivePanelTab('activity');
    } else if (task.targetTab) {
      setActivePanelTab(task.targetTab);
    }
  }, []);

  const executeAction = useCallback(
    async (
      actionId: string,
      params: Record<string, any> = {},
      options: { confirmed?: boolean; speakResult?: boolean } = {}
    ): Promise<AutomationTask | null> => {
      setIsExecutingTask(true);
      try {
        const res = await fetch('/api/automation/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId,
            params,
            confirmed: !!options.confirmed,
          }),
        });
        const data = await res.json();
        applyServerSnapshot(data);

        const task: AutomationTask | undefined = data.task;
        if (task) {
          routeTaskTab(task);
          if (task.status === 'awaiting_confirmation') {
            addNotification(
              'warning',
              `Permission Required: ${task.title}`,
              task.confirmationPrompt || 'Please confirm this action in the Automation Panel.'
            );
            if (options.speakResult && onSpeakRef.current) {
              onSpeakRef.current(
                task.confirmationPrompt ||
                  `Please confirm if you want me to ${task.title.toLowerCase()}.`
              );
            }
          } else if (task.status === 'completed') {
            addNotification(
              'success',
              task.title,
              task.resultSummary || 'Task completed on your MacBook.',
              task.actionUrl
            );
            if (options.speakResult && onSpeakRef.current && task.resultSummary) {
              onSpeakRef.current(task.resultSummary);
            }
          } else if (task.status === 'error') {
            addNotification(
              'error',
              `Action Issue: ${task.title}`,
              task.errorExplanation || 'Could not complete this task.'
            );
            if (options.speakResult && onSpeakRef.current && task.errorExplanation) {
              onSpeakRef.current(task.errorExplanation);
            }
          }
          return task;
        }
        return null;
      } catch (err: any) {
        addNotification(
          'error',
          'Automation Service Error',
          err?.message || 'Unable to reach local MacBook automation service.'
        );
        return null;
      } finally {
        setIsExecutingTask(false);
      }
    },
    [addNotification, applyServerSnapshot, routeTaskTab]
  );

  // Detect and run natural language voice/text command asynchronously
  const processNaturalCommand = useCallback(
    async (text: string): Promise<AutomationTask | null> => {
      if (!text.trim()) return null;
      try {
        const res = await fetch('/api/automation/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.matched) return null;

        applyServerSnapshot(data);
        const task: AutomationTask | undefined = data.task;
        if (task) {
          routeTaskTab(task);
          if (task.status === 'awaiting_confirmation') {
            addNotification(
              'warning',
              `Confirmation Needed: ${task.title}`,
              task.confirmationPrompt || 'Waiting for your explicit permission.'
            );
          } else if (task.status === 'completed') {
            addNotification(
              'success',
              task.title,
              task.resultSummary || 'Action executed on your MacBook.',
              task.actionUrl
            );
          } else if (task.status === 'cancelled') {
            addNotification('info', 'Task Cancelled', task.title);
          } else if (task.status === 'error') {
            addNotification(
              'error',
              task.title,
              task.errorExplanation || 'Task encountered an error.'
            );
          }
          return task;
        }
        return null;
      } catch {
        return null;
      }
    },
    [addNotification, applyServerSnapshot, routeTaskTab]
  );

  const confirmTask = useCallback(
    async (taskId: string) => {
      setIsExecutingTask(true);
      try {
        const res = await fetch('/api/automation/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        });
        const data = await res.json();
        applyServerSnapshot(data);
        const task: AutomationTask | undefined = data.task;
        if (task && task.status === 'completed') {
          if (task.targetTab) setActivePanelTab(task.targetTab);
          addNotification(
            'success',
            `Approved: ${task.title}`,
            task.resultSummary || 'Task completed.',
            task.actionUrl
          );
          if (onSpeakRef.current && task.resultSummary) {
            onSpeakRef.current(task.resultSummary);
          }
        }
        return task || null;
      } finally {
        setIsExecutingTask(false);
      }
    },
    [addNotification, applyServerSnapshot]
  );

  const cancelTask = useCallback(
    async (taskId?: string, stopAll = false) => {
      try {
        const res = await fetch('/api/automation/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, stopAll }),
        });
        const data = await res.json();
        applyServerSnapshot(data);
        addNotification(
          'info',
          stopAll ? 'Stopped Active Tasks' : 'Task Cancelled',
          stopAll ? 'All pending or running tasks have been stopped.' : 'Action was cancelled.'
        );
      } catch {
        // Ignore
      }
    },
    [addNotification, applyServerSnapshot]
  );

  const pendingConfirmationsCount = tasks.filter(
    (t) => t.status === 'awaiting_confirmation'
  ).length;
  const runningTasksCount =
    tasks.filter((t) => t.status === 'running').length + (isExecutingTask ? 1 : 0);

  return {
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
    refreshState,
  };
}
