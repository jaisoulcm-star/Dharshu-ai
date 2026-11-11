import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cpu,
  BatteryCharging,
  Battery,
  HardDrive,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  Terminal,
  FolderPlus,
  FolderOpen,
  FileText,
  Search,
  Mail,
  Send,
  Youtube,
  ExternalLink,
  Sparkles,
  Square,
  Sliders,
  Trash2,
  Edit3,
  Layers,
  Globe,
  AppWindow,
  Eye,
} from 'lucide-react';
import {
  AutomationTask,
  SystemTelemetry,
  YouTubeControllerState,
  EmailDraft,
  EmailItem,
  ManagedFileItem,
} from '../types';
import { MacShortcutItem, PanelTab } from '../hooks/useAutomation';

interface AutomationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  telemetry: SystemTelemetry | null;
  tasks: AutomationTask[];
  youtubeState: YouTubeControllerState;
  emailDrafts: EmailDraft[];
  emailInbox: EmailItem[];
  emailInboxReadApproved: boolean;
  files: ManagedFileItem[];
  activeFolder: string;
  onSelectFolder: (folder: string) => void;
  openedFile: ManagedFileItem | null;
  onCloseOpenedFile: () => void;
  shortcuts: MacShortcutItem[];
  isExecutingTask: boolean;
  onExecuteAction: (
    actionId: string,
    params?: Record<string, any>,
    options?: { confirmed?: boolean; speakResult?: boolean }
  ) => Promise<AutomationTask | null>;
  onConfirmTask: (taskId: string) => Promise<AutomationTask | null>;
  onCancelTask: (taskId?: string, stopAll?: boolean) => Promise<void>;
}

const MAC_APPS_LIST = [
  { key: 'safari', name: 'Safari', badge: 'Browser', fallbackHref: 'https://www.google.com' },
  { key: 'chrome', name: 'Google Chrome', badge: 'Browser', fallbackHref: 'https://www.google.com' },
  { key: 'vscode', name: 'VS Code', badge: 'IDE', fallbackHref: 'vscode://' },
  { key: 'finder', name: 'Finder', badge: 'System', targetTab: 'files' as PanelTab },
  { key: 'terminal', name: 'Terminal', badge: 'Shell', targetTab: 'activity' as PanelTab },
  { key: 'spotify', name: 'Spotify', badge: 'Music', fallbackHref: 'https://open.spotify.com' },
  { key: 'notes', name: 'Apple Notes', badge: 'Productivity', targetTab: 'files' as PanelTab },
  { key: 'settings', name: 'System Settings', badge: 'macOS' },
];

export const AutomationPanel: React.FC<AutomationPanelProps> = React.memo(({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  telemetry,
  tasks,
  youtubeState,
  emailDrafts,
  emailInbox,
  emailInboxReadApproved,
  files,
  activeFolder,
  onSelectFolder,
  openedFile,
  onCloseOpenedFile,
  shortcuts,
  isExecutingTask,
  onExecuteAction,
  onConfirmTask,
  onCancelTask,
}) => {
  const [ytQuery, setYtQuery] = useState('');
  const [ytChannelInput, setYtChannelInput] = useState('');
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showYoutubeEmbed, setShowYoutubeEmbed] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const chordIntervalRef = useRef<number | null>(null);

  const isAnyAudioPlaying = Boolean(
    (youtubeState.isPlaying && !showYoutubeEmbed) || telemetry?.mediaState.isPlaying
  );
  const effectiveVolume = telemetry?.isMuted
    ? 0
    : Math.round(((youtubeState.volume ?? 75) * (telemetry?.volume ?? 70)) / 100);

  // Built-in MacBook M5 Lofi Ambient Audio Synthesizer so playback works 100% natively without iframe bot walls
  useEffect(() => {
    if (!isAnyAudioPlaying || effectiveVolume <= 0) {
      if (chordIntervalRef.current) {
        window.clearInterval(chordIntervalRef.current);
        chordIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        gainNodeRef.current = null;
      }
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        const ctx = new AudioContextClass();
        const masterGain = ctx.createGain();
        masterGain.gain.value = Math.max(0.01, (effectiveVolume / 100) * 0.12);
        masterGain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        gainNodeRef.current = masterGain;

        const chords = [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0], // Am7
          [174.61, 220.0, 261.63, 349.23], // Fmaj7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];
        let chordIdx = 0;

        const playWarmChord = () => {
          if (!audioCtxRef.current || !gainNodeRef.current) return;
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          const now = audioCtxRef.current.currentTime;
          const notes = chords[chordIdx % chords.length];
          chordIdx += 1;

          notes.forEach((freq) => {
            if (!audioCtxRef.current || !gainNodeRef.current) return;
            const osc = audioCtxRef.current.createOscillator();
            const noteGain = audioCtxRef.current.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.exponentialRampToValueAtTime(0.22, now + 0.35);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
            osc.connect(noteGain);
            noteGain.connect(gainNodeRef.current);
            osc.start(now);
            osc.stop(now + 2.35);
          });
        };

        playWarmChord();
        chordIntervalRef.current = window.setInterval(playWarmChord, 2400);
      } else if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(
          Math.max(0.01, (effectiveVolume / 100) * 0.12),
          audioCtxRef.current.currentTime,
          0.1
        );
      }
    } catch {
      // Ignore Web Audio restriction errors
    }
  }, [isAnyAudioPlaying, effectiveVolume]);

  useEffect(() => {
    return () => {
      if (chordIntervalRef.current) window.clearInterval(chordIntervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  if (!isOpen) return null;

  const pendingTasks = tasks.filter((t) => t.status === 'awaiting_confirmation');
  const runningTasks = tasks.filter((t) => t.status === 'running');
  const latestBrowserTask = tasks.find(
    (t) =>
      t.actionUrl &&
      (t.actionId === 'website_open' ||
        t.actionId === 'web_search' ||
        t.actionId === 'browser_new_tab' ||
        t.actionId === 'app_open')
  );
  const currentVideo =
    youtubeState.playlist[youtubeState.currentIndex] || youtubeState.playlist[0];

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      !fileSearch.trim() ||
      f.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.path.toLowerCase().includes(fileSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (!activeFolder || activeFolder === 'All') return true;
    return (
      f.parentFolder.toLowerCase() === activeFolder.toLowerCase() ||
      f.name.toLowerCase() === activeFolder.toLowerCase()
    );
  });

  const handleCreateEmailDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailSubject.trim()) return;
    await onExecuteAction(
      'email_draft',
      {
        to: emailTo.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim() || 'Sent via Darshu AI MacBook Assistant.',
        client: 'Gmail',
      },
      { speakResult: true }
    );
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[440px] md:w-[480px] bg-[#0d101a]/95 text-zinc-100 border-l border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">
                MacBook M5 Control Center
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                16 GB RAM
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {telemetry?.isNativeMacOS
                ? 'Native macOS AppleScript Bridge Active'
                : 'Allowlisted Automation & Workspace Bridge'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(runningTasks.length > 0 || pendingTasks.length > 0 || isExecutingTask) && (
            <button
              onClick={() => onCancelTask(undefined, true)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              title="Stop all active tasks"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop All</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close Automation Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Hardware Status Strip */}
      {telemetry && (
        <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => onExecuteAction('system_battery', {}, { speakResult: true })}
            className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer text-left"
            title="Click to announce battery status"
          >
            {telemetry.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Battery className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-white">{telemetry.batteryPercent}%</div>
              <div className="text-[10px] text-zinc-400 truncate">
                {telemetry.isCharging ? 'Charging' : 'Battery'}
              </div>
            </div>
          </button>

          <button
            onClick={() => onExecuteAction('system_storage', {}, { speakResult: true })}
            className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer text-left"
            title="Click to announce available storage"
          >
            <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-white">{telemetry.storageAvailableGB} GB</div>
              <div className="text-[10px] text-zinc-400 truncate">Free SSD</div>
            </div>
          </button>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
            <button
              onClick={() =>
                onExecuteAction(
                  'system_volume',
                  { mute: !telemetry.isMuted },
                  { speakResult: true }
                )
              }
              className="text-purple-400 hover:text-purple-300 cursor-pointer"
              title={telemetry.isMuted ? 'Unmute MacBook' : 'Mute MacBook'}
            >
              {telemetry.isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">
                {telemetry.isMuted ? 'Muted' : `${telemetry.volume}%`}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={telemetry.isMuted ? 0 : telemetry.volume}
                onChange={(e) =>
                  onExecuteAction('system_volume', { volume: Number(e.target.value) })
                }
                className="w-full h-1 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-3 pt-2 border-b border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          {
            id: 'activity' as PanelTab,
            label: 'Activity',
            icon: Clock,
            badge: pendingTasks.length || runningTasks.length,
          },
          { id: 'mac_apps' as PanelTab, label: 'Apps & Mac', icon: AppWindow },
          { id: 'youtube' as PanelTab, label: 'YouTube', icon: Youtube },
          {
            id: 'email' as PanelTab,
            label: 'Email',
            icon: Mail,
            badge: emailDrafts.filter((d) => d.status === 'awaiting_confirmation').length,
          },
          { id: 'files' as PanelTab, label: 'Files', icon: FolderOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                isActive
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/25 text-amber-300 border border-amber-400/40">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. ACTIVITY & APPROVALS TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Pending Permission / Confirmation Gate */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Awaiting Your Confirmation ({pendingTasks.length})</span>
                </div>
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/35 space-y-2.5 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-amber-200">{task.title}</h4>
                        <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
                          {task.confirmationPrompt || task.description}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
                        Permission Gate
                      </span>
                    </div>

                    {task.appleScriptPreview && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-zinc-300 truncate">
                        {task.appleScriptPreview}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onConfirmTask(task.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Execute</span>
                      </button>
                      <button
                        onClick={() => onCancelTask(task.id)}
                        className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Voice Command Guide */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Saying or Typing...</span>
                </span>
                <span className="text-[10px] text-zinc-400">Allowlisted Security</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-300">
                <div className="px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/5">
                  "Hey Darshu, open VS Code" or "Open Safari"
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/5">
                  "Hey Darshu, play lofi study beats on YouTube"
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/5">
                  "Hey Darshu, draft an email to team@apple.com about project demo"
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/5">
                  "Hey Darshu, open MacBook_M5_Setup_Notes.md" or "Check battery"
                </div>
              </div>
            </div>

            {/* Task Execution Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Automation Activity Log ({tasks.length})
                </span>
                {tasks.some((t) => t.status === 'running') && (
                  <button
                    onClick={() => onCancelTask(undefined, true)}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Cancel Running
                  </button>
                )}
              </div>

              {tasks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                  <Terminal className="w-6 h-6 text-zinc-500 mx-auto" />
                  <p className="text-xs text-zinc-400 font-medium">
                    No automation tasks run yet in this session.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Use voice commands or click any control in the tabs above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.status === 'completed' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {task.status === 'running' && (
                            <Clock className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                          )}
                          {task.status === 'awaiting_confirmation' && (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          {task.status === 'cancelled' && (
                            <XCircle className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          {task.status === 'error' && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-white truncate">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.targetTab && task.targetTab !== 'activity' && (
                            <button
                              onClick={() => onTabChange(task.targetTab!)}
                              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-zinc-200 text-[10px] font-semibold cursor-pointer"
                            >
                              View Tab
                            </button>
                          )}
                          {task.actionUrl && (
                            <a
                              href={task.actionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-semibold flex items-center gap-1"
                            >
                              <span>Launch</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {task.resultSummary && (
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          {task.resultSummary}
                        </p>
                      )}
                      {task.errorExplanation && (
                        <p className="text-[11px] text-rose-300 leading-relaxed">
                          {task.errorExplanation}
                        </p>
                      )}
                      {task.appleScriptPreview && (
                        <div className="px-2 py-1 rounded bg-black/30 font-mono text-[10px] text-zinc-400 truncate">
                          osascript: {task.appleScriptPreview}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. APPS & MAC SYSTEM CONTROL TAB */}
        {activeTab === 'mac_apps' && (
          <div className="space-y-4">
            {/* Application Control Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Installed MacBook Applications
                </span>
                {telemetry && (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Active: {telemetry.frontmostApp}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MAC_APPS_LIST.map((app) => {
                  const isRunning = telemetry?.runningApps.includes(app.name);
                  const isFront = telemetry?.frontmostApp === app.name;
                  return (
                    <div
                      key={app.key}
                      className={`p-2.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                        isFront
                          ? 'bg-indigo-500/15 border-indigo-400/40'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {app.name}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isRunning ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                          title={isRunning ? 'Running' : 'Not running'}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            await onExecuteAction(
                              'app_open',
                              { appKey: app.key, appName: app.name },
                              { speakResult: true }
                            );
                            if (app.targetTab) {
                              onTabChange(app.targetTab);
                            }
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 text-[11px] font-semibold transition cursor-pointer"
                        >
                          {isRunning ? 'Switch' : 'Open'}
                        </button>
                        {app.fallbackHref && (
                          <a
                            href={app.fallbackHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 text-[11px] flex items-center"
                            title={`Launch ${app.name} directly`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {isRunning && (
                          <button
                            onClick={() =>
                              onExecuteAction(
                                'app_close',
                                { appKey: app.key, appName: app.name },
                                { speakResult: true }
                              )
                            }
                            className="py-1 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition cursor-pointer"
                            title={`Quit ${app.name} (asks confirmation)`}
                          >
                            Quit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Web Search & Websites */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Browser Tabs & Voice Web Search</span>
              </span>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!webSearchQuery.trim()) return;
                  onExecuteAction(
                    'web_search',
                    { query: webSearchQuery.trim(), engine: 'google' },
                    { speakResult: true }
                  );
                  setWebSearchQuery('');
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  value={webSearchQuery}
                  onChange={(e) => setWebSearchQuery(e.target.value)}
                  placeholder="Search Google, GitHub, Wikipedia..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  {
                    key: 'youtube',
                    label: 'YouTube',
                    href: 'https://www.youtube.com',
                    targetTab: 'youtube' as PanelTab,
                  },
                  {
                    key: 'gmail',
                    label: 'Gmail',
                    href: 'https://mail.google.com',
                    targetTab: 'email' as PanelTab,
                  },
                  { key: 'google', label: 'Google', href: 'https://www.google.com' },
                  { key: 'github', label: 'GitHub', href: 'https://github.com' },
                  { key: 'wikipedia', label: 'Wikipedia', href: 'https://www.wikipedia.org' },
                ].map((site) => (
                  <div
                    key={site.key}
                    className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={async () => {
                        await onExecuteAction(
                          'website_open',
                          { siteKey: site.key },
                          { speakResult: true }
                        );
                        if (site.targetTab) {
                          onTabChange(site.targetTab);
                        }
                      }}
                      className="px-2.5 py-1 hover:bg-white/15 text-[11px] font-medium text-zinc-200 cursor-pointer transition"
                    >
                      Open {site.label}
                    </button>
                    <a
                      href={site.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-1 hover:bg-indigo-500/30 text-zinc-400 hover:text-indigo-200 border-l border-white/10 flex items-center"
                      title={`Open ${site.label} in new browser tab`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
                <button
                  onClick={() =>
                    onExecuteAction('browser_new_tab', { siteKey: 'google' }, { speakResult: true })
                  }
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-[11px] font-semibold text-indigo-300 cursor-pointer"
                >
                  + New Tab
                </button>
              </div>

              {latestBrowserTask && latestBrowserTask.actionUrl && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-indigo-200 truncate">
                      {latestBrowserTask.title}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {latestBrowserTask.actionUrl}
                    </div>
                  </div>
                  <a
                    href={latestBrowserTask.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    <span>Launch Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Media Playback & macOS Shortcuts */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>macOS Media Playback</span>
                </span>
                <span className="text-[11px] text-zinc-400 truncate max-w-[170px]">
                  {telemetry?.mediaState.trackTitle || 'Lofi Study Beats'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 py-1">
                <button
                  onClick={() =>
                    onExecuteAction('media_control', { command: 'previous' }, { speakResult: true })
                  }
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-200 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    onExecuteAction(
                      'media_control',
                      { command: telemetry?.mediaState.isPlaying ? 'pause' : 'play' },
                      { speakResult: true }
                    )
                  }
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer"
                >
                  {telemetry?.mediaState.isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() =>
                    onExecuteAction('media_control', { command: 'next' }, { speakResult: true })
                  }
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-200 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* macOS Shortcuts */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-pink-400" />
                <span>macOS Shortcuts Automation</span>
              </span>
              <div className="space-y-1.5">
                {shortcuts.map((sc) => (
                  <div
                    key={sc.name}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{sc.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{sc.description}</div>
                    </div>
                    <button
                      onClick={() =>
                        onExecuteAction(
                          'macos_shortcut',
                          { shortcutName: sc.name },
                          { speakResult: true }
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/30 text-purple-200 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Run
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. YOUTUBE SMART CONTROLLER TAB */}
        {activeTab === 'youtube' && (
          <div className="space-y-4">
            {/* Search YouTube Videos */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ytQuery.trim()) return;
                onExecuteAction(
                  'youtube_search',
                  { query: ytQuery.trim() },
                  { speakResult: true }
                );
                setYtQuery('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={ytQuery}
                onChange={(e) => setYtQuery(e.target.value)}
                placeholder="Search YouTube videos (e.g. lofi, python, react)..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-400"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Play</span>
              </button>
            </form>

            {/* Embedded YouTube & Native MacBook Audio Studio Player */}
            {currentVideo && (
              <div className="rounded-2xl overflow-hidden bg-black border border-white/15 shadow-xl">
                <div className="aspect-video w-full bg-zinc-950 relative">
                  {youtubeState.isPlaying && showYoutubeEmbed ? (
                    <iframe
                      key={`${currentVideo.videoId}_embed`}
                      src={`https://www.youtube-nocookie.com/embed/${currentVideo.videoId}?autoplay=1&rel=0`}
                      title={currentVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
                      <img
                        src={currentVideo.thumbnail}
                        alt={currentVideo.title}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          youtubeState.isPlaying ? 'opacity-35 scale-105' : 'opacity-55'
                        }`}
                      />
                      {youtubeState.isPlaying ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-center space-y-2.5">
                          <div className="flex items-end gap-1 h-8">
                            <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-pulse" />
                            <span className="w-1.5 h-7 bg-indigo-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-5 bg-purple-400 rounded-full animate-pulse" />
                            <span className="w-1.5 h-8 bg-rose-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-pulse" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              MacBook M5 Audio Engine Playing
                            </span>
                            <p className="text-xs font-bold text-white line-clamp-1 pt-1">
                              {currentVideo.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setShowYoutubeEmbed(true)}
                              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              Switch to Video Embed
                            </button>
                            <a
                              href={`https://www.youtube.com/watch?v=${currentVideo.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-semibold text-white flex items-center gap-1"
                            >
                              <span>Watch on YouTube</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            onExecuteAction(
                              'youtube_play_pause',
                              { play: true },
                              { speakResult: true }
                            )
                          }
                          className="absolute p-4 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-2xl transition transform hover:scale-105 cursor-pointer"
                          title="Play track"
                        >
                          <Play className="w-6 h-6 fill-current" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white/[0.04] space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {currentVideo.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Channel: {currentVideo.channelTitle} • {currentVideo.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {showYoutubeEmbed && (
                        <button
                          onClick={() => setShowYoutubeEmbed(false)}
                          className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-[10px] font-semibold text-indigo-200 cursor-pointer"
                        >
                          Audio Mode
                        </button>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${currentVideo.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-zinc-200 flex items-center gap-1"
                      >
                        <span>YouTube</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* YouTube Controls Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          onExecuteAction(
                            'youtube_play_pause',
                            { play: !youtubeState.isPlaying },
                            { speakResult: true }
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        {youtubeState.isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          onExecuteAction('youtube_next', {}, { speakResult: true })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>Next Video</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 w-28">
                      <Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={youtubeState.volume}
                        onChange={(e) =>
                          onExecuteAction('youtube_volume', {
                            volume: Number(e.target.value),
                          })
                        }
                        className="w-full h-1 accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Open Specific Channel */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ytChannelInput.trim()) return;
                onExecuteAction(
                  'youtube_channel',
                  { channel: ytChannelInput.trim() },
                  { speakResult: true }
                );
                setYtChannelInput('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={ytChannelInput}
                onChange={(e) => setYtChannelInput(e.target.value)}
                placeholder="Open YouTube channel (e.g. freeCodeCamp, Lofi Girl)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
              >
                Open Channel
              </button>
            </form>

            {/* Up Next Queue */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                YouTube Queue
              </span>
              {youtubeState.playlist.map((vid, idx) => (
                <div
                  key={`${vid.videoId}_${idx}`}
                  onClick={() =>
                    onExecuteAction(
                      'youtube_search',
                      { query: vid.title },
                      { speakResult: true }
                    )
                  }
                  className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    idx === youtubeState.currentIndex
                      ? 'bg-rose-500/15 border-rose-400/40'
                      : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    className="w-14 h-9 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{vid.title}</div>
                    <div className="text-[10px] text-zinc-400">
                      {vid.channelTitle} • {vid.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. EMAIL ASSISTANT TAB */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            {/* Quick Mail Launchers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onExecuteAction('email_open_client', { client: 'Gmail' }, { speakResult: true })
                }
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                <span>Open Gmail</span>
              </button>
              <button
                onClick={() =>
                  onExecuteAction(
                    'email_open_client',
                    { client: 'Apple Mail' },
                    { speakResult: true }
                  )
                }
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>Open Apple Mail</span>
              </button>
            </div>

            {/* Permission-Gated Inbox Reader */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inbox Reader (Permission Protected)</span>
                </span>
                {!emailInboxReadApproved && (
                  <button
                    onClick={() =>
                      onExecuteAction('email_read_inbox', {}, { speakResult: true })
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-[11px] font-semibold cursor-pointer"
                  >
                    Request Read Access
                  </button>
                )}
              </div>

              {!emailInboxReadApproved ? (
                <p className="text-[11px] text-zinc-400">
                  For your privacy, Darshu never reads your emails without explicit permission. Click{' '}
                  <strong>Request Read Access</strong> or say "Hey Darshu, read my emails" and
                  approve the prompt.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {emailInbox.map((mail) => (
                    <div
                      key={mail.id}
                      className="p-2.5 rounded-xl bg-black/30 border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-300 truncate">{mail.from}</span>
                        <span className="text-zinc-500 shrink-0">{mail.date}</span>
                      </div>
                      <div className="text-xs font-semibold text-white">{mail.subject}</div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{mail.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Draft New Email Form */}
            <form
              onSubmit={handleCreateEmailDraft}
              className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5"
            >
              <span className="text-xs font-bold text-zinc-200 block">
                Draft Email (Never Sends Automatically)
              </span>
              <input
                type="email"
                required
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="To: recipient@example.com"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500"
              />
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500"
              />
              <textarea
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email message body..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500 resize-none"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Create Draft for Review</span>
              </button>
            </form>

            {/* Saved Email Drafts Requiring Confirmation */}
            {emailDrafts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Prepared Email Drafts ({emailDrafts.length})
                </span>
                {emailDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">To: {draft.to}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          draft.status === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {draft.status === 'sent' ? 'Sent' : 'Awaiting Send Approval'}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-200 font-medium">
                      Subject: {draft.subject}
                    </div>
                    <p className="text-[11px] text-zinc-300 whitespace-pre-wrap bg-black/30 p-2 rounded-lg">
                      {draft.body}
                    </p>
                    {draft.status !== 'sent' && (
                      <button
                        onClick={() =>
                          onExecuteAction(
                            'email_send',
                            {
                              draftId: draft.id,
                              to: draft.to,
                              subject: draft.subject,
                            },
                            { speakResult: true }
                          )
                        }
                        className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Request Send Confirmation</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. FILE & FOLDER MANAGEMENT TAB */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* Opened File Content Viewer */}
            {openedFile && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-400/40 space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-4 h-4 text-indigo-300 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {openedFile.name}
                      </h4>
                      <p className="text-[10px] text-indigo-300 truncate">
                        {openedFile.path} • {(openedFile.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onCloseOpenedFile}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-zinc-200 cursor-pointer shrink-0"
                  >
                    Close Preview
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] text-zinc-200 font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                  {openedFile.content || `File "${openedFile.name}" opened from ${openedFile.path}.`}
                </pre>
              </div>
            )}

            {/* Folder Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['All', 'Documents', 'Downloads', 'Desktop', 'Projects'].map((folder) => (
                <button
                  key={folder}
                  onClick={() => onSelectFolder(folder)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                    activeFolder === folder
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10'
                  }`}
                >
                  {folder === 'All' ? 'All Items' : folder}
                </button>
              ))}
            </div>

            {/* Search & Organize Bar */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Search documents & folders..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500"
                />
              </div>
              <button
                onClick={() => onExecuteAction('file_organize', {}, { speakResult: true })}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-semibold cursor-pointer shrink-0"
                title="Organize workspace documents (asks confirmation)"
              >
                Organize
              </button>
            </div>

            {/* Create New Folder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newFolderName.trim()) return;
                onExecuteAction(
                  'file_create_folder',
                  {
                    folderName: newFolderName.trim(),
                    parentDir: activeFolder === 'All' ? 'Documents' : activeFolder,
                  },
                  { speakResult: true }
                );
                setNewFolderName('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={`New folder name in ${activeFolder === 'All' ? 'Documents' : activeFolder}...`}
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create Folder</span>
              </button>
            </form>

            {/* Managed Workspace Files List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {activeFolder === 'All'
                    ? `MacBook Workspace (${filteredFiles.length})`
                    : `${activeFolder} (${filteredFiles.length})`}
                </span>
                {activeFolder !== 'All' && (
                  <button
                    onClick={() => onSelectFolder('All')}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Show All Files
                  </button>
                )}
              </div>

              {filteredFiles.map((item) => (
                <div
                  key={item.path}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={() =>
                        onExecuteAction('file_open', { path: item.path }, { speakResult: true })
                      }
                      className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                    >
                      {item.type === 'folder' ? (
                        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white hover:text-indigo-300 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{item.path}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          onExecuteAction('file_open', { path: item.path }, { speakResult: true })
                        }
                        className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-[11px] font-semibold text-indigo-200 cursor-pointer"
                      >
                        {item.type === 'folder' ? 'Browse' : 'Open'}
                      </button>
                      <button
                        onClick={() => {
                          setRenamingFile(item.path);
                          setRenameValue(item.name);
                        }}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 cursor-pointer"
                        title="Rename (asks confirmation)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onExecuteAction(
                            'file_delete',
                            { targetPath: item.path },
                            { speakResult: true }
                          )
                        }
                        className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                        title="Delete (asks confirmation)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {renamingFile === item.path && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-black/50 border border-indigo-400/40 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (renameValue.trim()) {
                            onExecuteAction(
                              'file_rename',
                              { oldPath: item.path, newName: renameValue.trim() },
                              { speakResult: true }
                            );
                          }
                          setRenamingFile(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Confirm Rename
                      </button>
                      <button
                        onClick={() => setRenamingFile(null)}
                        className="px-2 py-1 rounded-lg bg-white/10 text-zinc-300 text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
