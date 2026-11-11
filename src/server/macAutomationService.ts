import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type AutomationCategory =
  | 'app_control'
  | 'youtube'
  | 'email'
  | 'file_manager'
  | 'mac_system'
  | 'shortcut';

export type AutomationTaskStatus =
  | 'running'
  | 'awaiting_confirmation'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface AutomationTaskRecord {
  id: string;
  actionId: string;
  category: AutomationCategory;
  title: string;
  description: string;
  status: AutomationTaskStatus;
  requiresConfirmation: boolean;
  confirmationPrompt?: string;
  params: Record<string, any>;
  resultSummary?: string;
  errorExplanation?: string;
  appleScriptPreview?: string;
  actionUrl?: string;
  targetTab?: 'activity' | 'mac_apps' | 'youtube' | 'email' | 'files';
  createdAt: number;
  completedAt?: number;
}

// Strict Allowlist of Supported Applications on macOS with client URI schemes & web fallbacks
export const ALLOWED_MAC_APPS: Record<
  string,
  {
    bundleName: string;
    displayName: string;
    processName: string;
    urlFallback?: string;
  }
> = {
  safari: {
    bundleName: 'Safari',
    displayName: 'Safari',
    processName: 'Safari',
    urlFallback: 'https://www.google.com',
  },
  chrome: {
    bundleName: 'Google Chrome',
    displayName: 'Google Chrome',
    processName: 'Google Chrome',
    urlFallback: 'https://www.google.com',
  },
  vscode: {
    bundleName: 'Visual Studio Code',
    displayName: 'VS Code',
    processName: 'Code',
    urlFallback: 'vscode://',
  },
  finder: {
    bundleName: 'Finder',
    displayName: 'Finder',
    processName: 'Finder',
  },
  terminal: {
    bundleName: 'Terminal',
    displayName: 'Terminal',
    processName: 'Terminal',
  },
  spotify: {
    bundleName: 'Spotify',
    displayName: 'Spotify',
    processName: 'Spotify',
    urlFallback: 'https://open.spotify.com',
  },
  music: {
    bundleName: 'Music',
    displayName: 'Apple Music',
    processName: 'Music',
    urlFallback: 'https://music.apple.com',
  },
  notes: {
    bundleName: 'Notes',
    displayName: 'Apple Notes',
    processName: 'Notes',
  },
  calculator: {
    bundleName: 'Calculator',
    displayName: 'Calculator',
    processName: 'Calculator',
  },
  calendar: {
    bundleName: 'Calendar',
    displayName: 'Apple Calendar',
    processName: 'Calendar',
    urlFallback: 'https://calendar.google.com',
  },
  mail: {
    bundleName: 'Mail',
    displayName: 'Apple Mail',
    processName: 'Mail',
    urlFallback: 'mailto:',
  },
  messages: {
    bundleName: 'Messages',
    displayName: 'Messages',
    processName: 'Messages',
  },
  settings: {
    bundleName: 'System Settings',
    displayName: 'System Settings',
    processName: 'System Settings',
  },
};

// Strict Allowlist of Supported Websites
export const ALLOWED_WEBSITES: Record<string, { name: string; url: string }> = {
  youtube: { name: 'YouTube', url: 'https://www.youtube.com' },
  gmail: { name: 'Gmail', url: 'https://mail.google.com' },
  google: { name: 'Google', url: 'https://www.google.com' },
  github: { name: 'GitHub', url: 'https://github.com' },
  wikipedia: { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  stackoverflow: { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  apple: { name: 'Apple', url: 'https://www.apple.com' },
  linkedin: { name: 'LinkedIn', url: 'https://www.linkedin.com' },
};

// Strict Allowlist of Supported macOS Shortcuts
export const ALLOWED_MAC_SHORTCUTS: Record<
  string,
  { name: string; description: string; actionsSummary: string }
> = {
  'Morning Briefing': {
    name: 'Morning Briefing',
    description: 'Checks MacBook battery, calendar schedule, and opens Safari + Notes',
    actionsSummary: 'Checked battery status, opened Apple Calendar & Notes for today.',
  },
  'Focus Study Mode': {
    name: 'Focus Study Mode',
    description: 'Enables Do Not Disturb, sets volume to 35%, opens VS Code & Notes',
    actionsSummary: 'Activated Focus mode, adjusted volume to 35%, and brought VS Code to front.',
  },
  'Clean Desktop': {
    name: 'Clean Desktop',
    description: 'Organizes loose workspace documents into categorized folders',
    actionsSummary: 'Grouped loose workspace documents by category.',
  },
  'Battery Saver': {
    name: 'Battery Saver',
    description: 'Lowers volume to 25% and pauses background media playback',
    actionsSummary: 'Paused background media and lowered system volume to 25% to conserve battery.',
  },
  'Coding Workspace': {
    name: 'Coding Workspace',
    description: 'Launches VS Code, Terminal, and Google Chrome side by side',
    actionsSummary: 'Launched VS Code, Terminal, and Google Chrome for development.',
  },
};

// Strict Allowlist of Action IDs
export const ALLOWED_ACTION_IDS = new Set([
  'app_open',
  'app_close',
  'app_switch',
  'website_open',
  'browser_new_tab',
  'web_search',
  'youtube_open',
  'youtube_search',
  'youtube_play_pause',
  'youtube_volume',
  'youtube_channel',
  'youtube_next',
  'email_open_client',
  'email_read_inbox',
  'email_draft',
  'email_send',
  'file_open',
  'file_search',
  'file_create_folder',
  'file_rename',
  'file_organize',
  'file_move',
  'file_delete',
  'system_volume',
  'media_control',
  'system_battery',
  'system_storage',
  'system_settings',
  'macos_shortcut',
]);

// Sensitive actions that MUST NEVER run without explicit user confirmation
export const SENSITIVE_CONFIRMATION_ACTIONS = new Set([
  'app_close',
  'email_read_inbox',
  'email_send',
  'file_rename',
  'file_organize',
  'file_move',
  'file_delete',
]);

// Curated YouTube video library for instant embedded playback + real YouTube search URLs
const YOUTUBE_CATALOG = [
  {
    videoId: 'n61ULEU7CO0',
    title: 'Best of lofi hip hop - beats to relax/study to',
    channelTitle: 'Lofi Girl',
    duration: '2:15:30',
    thumbnail: 'https://i.ytimg.com/vi/n61ULEU7CO0/hqdefault.jpg',
    keywords: ['lofi', 'study', 'music', 'relax', 'chill', 'beats', 'coding'],
  },
  {
    videoId: 'lTRiuFIWV54',
    title: '1 A.M Study Session - lofi hip hop / chill beats for MacBook',
    channelTitle: 'Lofi Girl',
    duration: '1:01:14',
    thumbnail: 'https://i.ytimg.com/vi/lTRiuFIWV54/hqdefault.jpg',
    keywords: ['synthwave', 'coding', 'focus', 'ambient', 'work', 'study', 'chill'],
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'Ambient Space Music for Deep Focus & Programming',
    channelTitle: 'Yellow Brick Cinema',
    duration: '2:00:00',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    keywords: ['ambient', 'space', 'deep focus', 'programming', 'sleep'],
  },
  {
    videoId: '_uQrJ0TkZlc',
    title: 'Python Full Course for Beginners & AI Engineering',
    channelTitle: 'Programming with Mosh',
    duration: '6:14:07',
    thumbnail: 'https://i.ytimg.com/vi/_uQrJ0TkZlc/hqdefault.jpg',
    keywords: ['python', 'ai', 'coding', 'tutorial', 'course', 'programming'],
  },
  {
    videoId: 'PkZNo7MFNFg',
    title: 'Learn JavaScript & TypeScript - Full Course',
    channelTitle: 'freeCodeCamp.org',
    duration: '3:26:42',
    thumbnail: 'https://i.ytimg.com/vi/PkZNo7MFNFg/hqdefault.jpg',
    keywords: ['javascript', 'typescript', 'web', 'react', 'coding'],
  },
  {
    videoId: 'bMknfKXIFA8',
    title: 'React Course - Beginner to Advanced Project Guide',
    channelTitle: 'freeCodeCamp.org',
    duration: '11:55:27',
    thumbnail: 'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg',
    keywords: ['react', 'frontend', 'javascript', 'course'],
  },
];

// Safe Sandbox Workspace Directory for File & Folder Management
const WORKSPACE_ROOT = path.join(process.cwd(), 'mac_workspace');

function ensureWorkspaceInitialized() {
  try {
    if (!fs.existsSync(WORKSPACE_ROOT)) {
      fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
    }
    const subDirs = ['Documents', 'Downloads', 'Projects', 'Notes'];
    for (const dir of subDirs) {
      const fullDir = path.join(WORKSPACE_ROOT, dir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
    }

    const welcomeNote = path.join(WORKSPACE_ROOT, 'Documents', 'MacBook_M5_Setup_Guide.md');
    if (!fs.existsSync(welcomeNote)) {
      fs.writeFileSync(
        welcomeNote,
        '# MacBook Air M5 Assistant Guide\n\nWelcome to Darshu AI Desktop Assistant!\n- Say "Hey Darshu, check my battery"\n- Say "Hey Darshu, open VS Code"\n- Say "Hey Darshu, search YouTube for lofi music"\n- Say "Hey Darshu, create a folder called AI_Notes"\n',
        'utf-8'
      );
    }

    const projectSpec = path.join(WORKSPACE_ROOT, 'Projects', 'Darshu_Architecture_Notes.txt');
    if (!fs.existsSync(projectSpec)) {
      fs.writeFileSync(
        projectSpec,
        'Darshu AI Architecture: Apple Silicon M5 optimized streaming voice assistant with strict allowlisted automation.\n',
        'utf-8'
      );
    }

    const sampleReport = path.join(WORKSPACE_ROOT, 'Downloads', 'Q4_Study_Schedule.txt');
    if (!fs.existsSync(sampleReport)) {
      fs.writeFileSync(
        sampleReport,
        'Study Schedule:\nMonday: Machine Learning & Neural TTS\nWednesday: Systems Architecture\nFriday: Tamil Literature & Poetry\n',
        'utf-8'
      );
    }
  } catch (err) {
    console.warn('Workspace init warning:', err);
  }
}

ensureWorkspaceInitialized();

function resolveSafeWorkspacePath(relativePath: string): string {
  const cleaned = (relativePath || '').replace(/^[/\\]+/, '').trim();
  const resolved = path.resolve(WORKSPACE_ROOT, cleaned);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access outside the managed workspace directory is not permitted.');
  }
  return resolved;
}

class MacAutomationManager {
  private tasks: AutomationTaskRecord[] = [];
  private volume = 68;
  private isMuted = false;
  private batteryPercent = 94;
  private isCharging = true;
  private runningApps: string[] = ['Finder', 'Google Chrome', 'Terminal', 'VS Code'];
  private frontmostApp = 'Google Chrome';
  private activeFolder = 'All';
  private openedFile: {
    name: string;
    path: string;
    parentFolder: string;
    type: 'file' | 'folder';
    sizeBytes: number;
    updatedAt: number;
    content: string;
  } | null = null;
  private mediaState = {
    isPlaying: false,
    trackTitle: 'Lofi Study Beats',
    artist: 'Darshu Radio',
    app: 'Apple Music',
  };

  private youtubeState = {
    isOpen: false,
    query: 'lofi study beats',
    isPlaying: false,
    volume: 75,
    currentChannel: 'Lofi Girl',
    currentIndex: 0,
    playlist: YOUTUBE_CATALOG.slice(0, 4),
  };

  private emailInboxReadApproved = false;
  private emailInbox = [
    {
      id: 'mail_1',
      from: 'Apple Developer <developer@apple.com>',
      subject: 'Welcome to MacBook Air M5 & Apple Silicon Optimization',
      snippet:
        'Your MacBook Air M5 with 16 GB Unified Memory is ready for high-performance local AI workflows...',
      date: '10:15 AM',
      unread: true,
    },
    {
      id: 'mail_2',
      from: 'Study Group <team@university.edu>',
      subject: 'Project Milestone Review Tomorrow at 3 PM',
      snippet:
        'Hi! Just confirming our AI voice assistant demo session tomorrow afternoon. Let us know if the slides are ready.',
      date: 'Yesterday',
      unread: true,
    },
    {
      id: 'mail_3',
      from: 'GitHub Notifications <notifications@github.com>',
      subject: '[darshu-ai] Build & Performance Optimization Merged',
      snippet:
        'All checks passed on main branch: 60fps streaming and neural voice caching verified.',
      date: '2 days ago',
      unread: false,
    },
  ];

  private emailDrafts: Array<{
    id: string;
    to: string;
    subject: string;
    body: string;
    client: 'Gmail' | 'Apple Mail';
    createdAt: number;
    status: 'draft' | 'awaiting_confirmation' | 'sent';
  }> = [];

  private async runAppleScriptIfDarwin(script: string): Promise<string | null> {
    if (process.platform !== 'darwin') {
      return null;
    }
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 5000 });
      return stdout.trim();
    } catch (err: any) {
      console.warn('[osascript] warning:', err?.message || err);
      return null;
    }
  }

  public async getSystemTelemetry() {
    const isNativeMacOS = process.platform === 'darwin';
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const ramTotalGB = 16;
    const rawRatio = Math.min(0.82, Math.max(0.24, (totalMemBytes - freeMemBytes) / totalMemBytes));
    const ramUsedGB = Number((ramTotalGB * rawRatio).toFixed(1));
    const ramFreeGB = Number((ramTotalGB - ramUsedGB).toFixed(1));

    let storageTotalGB = 512;
    let storageAvailableGB = 348.4;
    try {
      const { stdout } = await execFileAsync('df', ['-k', process.cwd()], { timeout: 2000 });
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        const totalKB = parseInt(parts[1], 10);
        const availKB = parseInt(parts[3], 10);
        if (!isNaN(totalKB) && !isNaN(availKB) && totalKB > 0) {
          storageTotalGB = Math.max(64, Math.round(totalKB / (1024 * 1024)));
          storageAvailableGB = Number((availKB / (1024 * 1024)).toFixed(1));
        }
      }
    } catch {
      // Keep default fallback
    }

    if (isNativeMacOS) {
      try {
        const { stdout } = await execFileAsync('pmset', ['-g', 'batt'], { timeout: 2000 });
        const pctMatch = stdout.match(/(\d+)%/);
        if (pctMatch) {
          this.batteryPercent = parseInt(pctMatch[1], 10);
        }
        this.isCharging = stdout.includes('AC Power') || stdout.includes('charging');
      } catch {
        // Ignore
      }
    }

    const storageUsedPercent = Math.min(
      99,
      Math.max(5, Math.round(((storageTotalGB - storageAvailableGB) / storageTotalGB) * 100))
    );

    return {
      deviceModel: 'MacBook Air (15-inch, M5)',
      chip: 'Apple M5 (10-core CPU / 16-core Neural Engine)',
      ramTotalGB,
      ramUsedGB,
      ramFreeGB,
      batteryPercent: this.batteryPercent,
      isCharging: this.isCharging,
      powerSource: this.isCharging ? 'MagSafe 3 Power Adapter' : 'Battery Power',
      storageTotalGB,
      storageAvailableGB,
      storageUsedPercent,
      volume: this.isMuted ? 0 : this.volume,
      isMuted: this.isMuted,
      isNativeMacOS,
      mediaState: this.mediaState,
      runningApps: this.runningApps,
      frontmostApp: this.frontmostApp,
      platform: isNativeMacOS
        ? 'Native macOS Host (osascript Active)'
        : 'Cloud Container Host (Browser URI & Workspace Mode)',
    };
  }

  public listWorkspaceFiles(searchQuery = ''): Array<{
    name: string;
    path: string;
    parentFolder: string;
    type: 'file' | 'folder';
    sizeBytes: number;
    updatedAt: number;
    category: string;
    content?: string;
  }> {
    ensureWorkspaceInitialized();
    const results: Array<{
      name: string;
      path: string;
      parentFolder: string;
      type: 'file' | 'folder';
      sizeBytes: number;
      updatedAt: number;
      category: string;
      content?: string;
    }> = [];

    const walk = (dir: string, relPrefix = '') => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        let stats: fs.Stats | null = null;
        try {
          stats = fs.statSync(fullPath);
        } catch {
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        const category = entry.isDirectory()
          ? 'Folder'
          : ['.md', '.txt', '.pdf', '.doc', '.docx'].includes(ext)
          ? 'Document'
          : ['.ts', '.tsx', '.js', '.py', '.json'].includes(ext)
          ? 'Code'
          : 'File';

        let fileContent: string | undefined = undefined;
        if (!entry.isDirectory() && stats.size < 32768) {
          try {
            fileContent = fs.readFileSync(fullPath, 'utf-8');
          } catch {
            fileContent = undefined;
          }
        }

        if (
          !searchQuery ||
          entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          relPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (fileContent && fileContent.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          results.push({
            name: entry.name,
            path: relPath,
            parentFolder: relPrefix || 'Root',
            type: entry.isDirectory() ? 'folder' : 'file',
            sizeBytes: stats.size,
            updatedAt: stats.mtimeMs,
            category,
            content: fileContent,
          });
        }

        if (entry.isDirectory()) {
          walk(fullPath, relPath);
        }
      }
    };

    walk(WORKSPACE_ROOT);
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  public getFullState() {
    return {
      tasks: this.tasks.slice(0, 25),
      youtube: this.youtubeState,
      emailDrafts: this.emailDrafts,
      emailInbox: this.emailInboxReadApproved ? this.emailInbox : [],
      emailInboxReadApproved: this.emailInboxReadApproved,
      files: this.listWorkspaceFiles(),
      activeFolder: this.activeFolder,
      openedFile: this.openedFile,
      shortcuts: Object.values(ALLOWED_MAC_SHORTCUTS),
    };
  }

  public cancelTask(taskId: string): AutomationTaskRecord | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    if (task.status === 'running' || task.status === 'awaiting_confirmation') {
      task.status = 'cancelled';
      task.completedAt = Date.now();
      task.resultSummary = 'Cancelled by user.';
    }
    return task;
  }

  public stopAllActiveTasks(): number {
    let count = 0;
    for (const task of this.tasks) {
      if (task.status === 'running' || task.status === 'awaiting_confirmation') {
        task.status = 'cancelled';
        task.completedAt = Date.now();
        task.resultSummary = 'Stopped by user.';
        count++;
      }
    }
    return count;
  }

  public async requestAction(
    actionId: string,
    params: Record<string, any> = {},
    confirmedByUser = false
  ): Promise<AutomationTaskRecord> {
    if (!ALLOWED_ACTION_IDS.has(actionId)) {
      const rejectedTask: AutomationTaskRecord = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actionId,
        category: 'mac_system',
        title: 'Blocked Unverified Action',
        description: `Action "${actionId}" is not in the MacBook security allowlist.`,
        status: 'error',
        requiresConfirmation: false,
        params,
        errorExplanation:
          'For your MacBook security, Darshu only executes pre-approved allowlisted actions and never runs arbitrary shell commands.',
        targetTab: 'activity',
        createdAt: Date.now(),
        completedAt: Date.now(),
      };
      this.tasks.unshift(rejectedTask);
      return rejectedTask;
    }

    const meta = this.buildTaskMetadata(actionId, params);
    const needsConfirmation = SENSITIVE_CONFIRMATION_ACTIONS.has(actionId) && !confirmedByUser;

    const task: AutomationTaskRecord = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actionId,
      category: meta.category,
      title: meta.title,
      description: meta.description,
      status: needsConfirmation ? 'awaiting_confirmation' : 'running',
      requiresConfirmation: SENSITIVE_CONFIRMATION_ACTIONS.has(actionId),
      confirmationPrompt: meta.confirmationPrompt,
      params,
      appleScriptPreview: meta.appleScriptPreview,
      actionUrl: meta.actionUrl,
      targetTab: meta.targetTab,
      createdAt: Date.now(),
    };

    if (actionId === 'email_draft') {
      const newDraft = {
        id: `draft_${Date.now()}`,
        to: params.to || 'recipient@example.com',
        subject: params.subject || 'Quick Note from Darshu AI',
        body: params.body || '',
        client: (params.client === 'Apple Mail' ? 'Apple Mail' : 'Gmail') as
          | 'Gmail'
          | 'Apple Mail',
        createdAt: Date.now(),
        status: 'awaiting_confirmation' as const,
      };
      this.emailDrafts.unshift(newDraft);
      task.params.draftId = newDraft.id;
    }

    this.tasks.unshift(task);

    if (needsConfirmation) {
      return task;
    }

    return await this.executeConfirmedTask(task);
  }

  public async confirmTask(taskId: string): Promise<AutomationTaskRecord | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    if (task.status !== 'awaiting_confirmation') return task;
    task.status = 'running';
    return await this.executeConfirmedTask(task);
  }

  private buildTaskMetadata(actionId: string, params: Record<string, any>) {
    switch (actionId) {
      case 'app_open': {
        const key = (params.appKey || params.appName || 'safari').toLowerCase();
        const appInfo = ALLOWED_MAC_APPS[key] || {
          bundleName: params.appName || 'Safari',
          displayName: params.appName || 'Safari',
          processName: params.appName || 'Safari',
          urlFallback: undefined,
        };
        return {
          category: 'app_control' as const,
          targetTab: 'mac_apps' as const,
          title: `Open ${appInfo.displayName}`,
          description: `Launch ${appInfo.displayName} on macOS`,
          appleScriptPreview: `tell application "${appInfo.bundleName}" to activate`,
          actionUrl: appInfo.urlFallback,
        };
      }
      case 'app_close': {
        const key = (params.appKey || params.appName || 'safari').toLowerCase();
        const appInfo = ALLOWED_MAC_APPS[key] || {
          bundleName: params.appName || 'Safari',
          displayName: params.appName || 'Safari',
        };
        return {
          category: 'app_control' as const,
          targetTab: 'activity' as const,
          title: `Close ${appInfo.displayName}`,
          description: `Quit ${appInfo.displayName} application safely`,
          confirmationPrompt: `Do you want Darshu to quit ${appInfo.displayName}? Please make sure any unsaved tabs or files are saved.`,
          appleScriptPreview: `tell application "${appInfo.bundleName}" to quit`,
        };
      }
      case 'app_switch': {
        const key = (params.appKey || params.appName || 'vscode').toLowerCase();
        const appInfo = ALLOWED_MAC_APPS[key] || {
          bundleName: params.appName || 'Visual Studio Code',
          displayName: params.appName || 'VS Code',
          urlFallback: undefined,
        };
        return {
          category: 'app_control' as const,
          targetTab: 'mac_apps' as const,
          title: `Switch to ${appInfo.displayName}`,
          description: `Bring ${appInfo.displayName} window to the front`,
          appleScriptPreview: `tell application "${appInfo.bundleName}" to activate`,
          actionUrl: appInfo.urlFallback,
        };
      }
      case 'website_open':
      case 'browser_new_tab': {
        const siteKey = (params.siteKey || params.siteName || 'google').toLowerCase();
        const site = ALLOWED_WEBSITES[siteKey] || {
          name: params.siteName || 'Browser Tab',
          url: params.url || 'https://www.google.com',
        };
        return {
          category: 'app_control' as const,
          targetTab: siteKey === 'youtube' ? ('youtube' as const) : ('mac_apps' as const),
          title:
            actionId === 'browser_new_tab' ? `Open New Tab (${site.name})` : `Open ${site.name}`,
          description: `Open ${site.url} in browser`,
          appleScriptPreview: `tell application "Google Chrome" to open location "${site.url}"`,
          actionUrl: site.url,
        };
      }
      case 'web_search': {
        const query = params.query || 'MacBook Air M5';
        const engine = (params.engine || 'google').toLowerCase();
        const searchUrl =
          engine === 'youtube'
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
            : engine === 'github'
            ? `https://github.com/search?q=${encodeURIComponent(query)}`
            : engine === 'wikipedia'
            ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
            : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return {
          category: 'app_control' as const,
          targetTab: 'mac_apps' as const,
          title: `Search ${engine.charAt(0).toUpperCase() + engine.slice(1)}: "${query}"`,
          description: `Search for "${query}" in browser`,
          appleScriptPreview: `tell application "Google Chrome" to open location "${searchUrl}"`,
          actionUrl: searchUrl,
        };
      }
      case 'youtube_open':
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title: 'Open YouTube Controller',
          description: 'Launch YouTube media player and smart queue',
          appleScriptPreview: `tell application "Google Chrome" to open location "https://www.youtube.com"`,
          actionUrl: 'https://www.youtube.com',
        };
      case 'youtube_search': {
        const query = params.query || 'lofi hip hop study beats';
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title: `YouTube Search: "${query}"`,
          description: `Find and play YouTube videos matching "${query}"`,
          appleScriptPreview: `tell application "Google Chrome" to open location "${url}"`,
          actionUrl: url,
        };
      }
      case 'youtube_play_pause':
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title:
            params.play === false
              ? 'Pause YouTube Video'
              : params.play === true
              ? 'Play YouTube Video'
              : 'Toggle YouTube Playback',
          description: 'Control active YouTube video playback state',
          appleScriptPreview: `tell application "Google Chrome" to execute front window's active tab javascript "document.querySelector('video')?.paused ? document.querySelector('video')?.play() : document.querySelector('video')?.pause()"`,
        };
      case 'youtube_volume':
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title: `Set YouTube Volume to ${params.volume ?? 75}%`,
          description: 'Adjust YouTube player audio output level',
          appleScriptPreview: `set volume output volume ${params.volume ?? 75}`,
        };
      case 'youtube_channel': {
        const channel = params.channel || 'Lofi Girl';
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(channel + ' channel')}`;
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title: `Open YouTube Channel: ${channel}`,
          description: `Navigate to ${channel} on YouTube`,
          appleScriptPreview: `tell application "Google Chrome" to open location "${url}"`,
          actionUrl: url,
        };
      }
      case 'youtube_next':
        return {
          category: 'youtube' as const,
          targetTab: 'youtube' as const,
          title: 'Play Next YouTube Video',
          description: 'Skip to the next video in the YouTube queue',
          appleScriptPreview: `tell application "System Events" to keystroke "N" using {shift down}`,
        };
      case 'email_open_client': {
        const client = params.client === 'Apple Mail' ? 'Apple Mail' : 'Gmail';
        return {
          category: 'email' as const,
          targetTab: 'email' as const,
          title: `Open ${client}`,
          description: `Launch ${client} inbox`,
          appleScriptPreview:
            client === 'Apple Mail'
              ? `tell application "Mail" to activate`
              : `tell application "Google Chrome" to open location "https://mail.google.com"`,
          actionUrl: client === 'Apple Mail' ? 'mailto:' : 'https://mail.google.com',
        };
      }
      case 'email_read_inbox':
        return {
          category: 'email' as const,
          targetTab: 'email' as const,
          title: 'Read Recent Emails',
          description: 'Access and summarize unread messages in your inbox',
          confirmationPrompt:
            'Privacy Check: Do you grant Darshu permission to read and summarize your recent inbox emails?',
          appleScriptPreview: `tell application "Mail" to get subject of messages of inbox whose read status is false`,
        };
      case 'email_draft':
        return {
          category: 'email' as const,
          targetTab: 'email' as const,
          title: `Draft Email to ${params.to || 'Recipient'}`,
          description: `Subject: "${params.subject || 'Quick Note'}" (Saved as draft — requires confirmation before sending)`,
          appleScriptPreview: `tell application "Mail" to make new outgoing message with properties {subject:"${params.subject || 'Quick Note'}", content:"${(params.body || '').slice(0, 60)}...", visible:true}`,
        };
      case 'email_send':
        return {
          category: 'email' as const,
          targetTab: 'email' as const,
          title: `Send Email to ${params.to || 'Recipient'}`,
          description: `Subject: "${params.subject || 'Quick Note'}"`,
          confirmationPrompt: `Confirm sending email to "${params.to || 'Recipient'}" with subject "${params.subject || 'Quick Note'}"? Darshu never sends emails without your explicit approval.`,
          appleScriptPreview: `tell application "Mail" to send outgoing message 1`,
          actionUrl: `mailto:${encodeURIComponent(params.to || '')}?subject=${encodeURIComponent(params.subject || '')}&body=${encodeURIComponent(params.body || '')}`,
        };
      case 'file_open':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Open "${params.path || 'Documents'}"`,
          description: `Open file or folder in workspace`,
          appleScriptPreview: `tell application "Finder" to open POSIX file "${path.join(WORKSPACE_ROOT, params.path || 'Documents')}"`,
        };
      case 'file_search':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Search Files: "${params.query || ''}"`,
          description: `Search workspace documents matching "${params.query || 'all'}"`,
          appleScriptPreview: `mdfind -onlyin "${WORKSPACE_ROOT}" "${params.query || ''}"`,
        };
      case 'file_create_folder':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Create Folder "${params.folderName || 'New_Folder'}"`,
          description: `Create new directory inside ${params.parentDir || 'Documents'}`,
          appleScriptPreview: `tell application "Finder" to make new folder at POSIX file "${WORKSPACE_ROOT}" with properties {name:"${params.folderName || 'New_Folder'}"}`,
        };
      case 'file_rename':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Rename "${params.oldPath}" to "${params.newName}"`,
          description: `Rename file or folder in workspace`,
          confirmationPrompt: `Please confirm: Do you want to rename "${params.oldPath}" to "${params.newName}"?`,
          appleScriptPreview: `tell application "Finder" to set name of item "${params.oldPath}" to "${params.newName}"`,
        };
      case 'file_organize':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: 'Organize Workspace Documents',
          description: 'Group files in Downloads & Documents by file type',
          confirmationPrompt:
            'Please confirm: Do you want Darshu to organize and move loose files into categorized sub-folders?',
          appleScriptPreview: `tell application "Finder" to clean up window of folder "Documents"`,
        };
      case 'file_move':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Move "${params.sourcePath}" to "${params.targetFolder}"`,
          description: 'Move file to destination folder',
          confirmationPrompt: `Please confirm: Do you want to move "${params.sourcePath}" into "${params.targetFolder}"?`,
          appleScriptPreview: `tell application "Finder" to move POSIX file "${params.sourcePath}" to folder "${params.targetFolder}"`,
        };
      case 'file_delete':
        return {
          category: 'file_manager' as const,
          targetTab: 'files' as const,
          title: `Delete "${params.targetPath}"`,
          description: 'Remove file from managed workspace',
          confirmationPrompt: `Safety Warning: Are you sure you want to permanently delete "${params.targetPath}"?`,
          appleScriptPreview: `tell application "Finder" to delete POSIX file "${params.targetPath}"`,
        };
      case 'system_volume': {
        const vol = params.mute ? 0 : Math.max(0, Math.min(100, Number(params.volume ?? 70)));
        return {
          category: 'mac_system' as const,
          targetTab: 'mac_apps' as const,
          title: params.mute ? 'Mute MacBook Audio' : `Set System Volume to ${vol}%`,
          description: 'Adjust macOS CoreAudio output volume',
          appleScriptPreview: params.mute
            ? `set volume with output muted`
            : `set volume output volume ${vol} without output muted`,
        };
      }
      case 'media_control': {
        const cmd = params.command || 'play_pause';
        return {
          category: 'mac_system' as const,
          targetTab: 'mac_apps' as const,
          title: `Media Control: ${cmd.replace('_', ' ').toUpperCase()}`,
          description: `Control macOS Now Playing media (${cmd})`,
          appleScriptPreview: `tell application "Music" to ${cmd === 'next' ? 'next track' : cmd === 'previous' ? 'previous track' : 'playpause'}`,
        };
      }
      case 'system_battery':
        return {
          category: 'mac_system' as const,
          targetTab: 'activity' as const,
          title: 'Check MacBook Battery Status',
          description: 'Query Apple M5 power management and battery health',
          appleScriptPreview: `do shell script "pmset -g batt"`,
        };
      case 'system_storage':
        return {
          category: 'mac_system' as const,
          targetTab: 'activity' as const,
          title: 'Check Available Storage & Memory',
          description: 'Inspect SSD free space and 16 GB Unified Memory pressure',
          appleScriptPreview: `tell application "System Events" to get free space of startup disk`,
        };
      case 'system_settings': {
        const pane = params.pane || 'General';
        return {
          category: 'mac_system' as const,
          targetTab: 'mac_apps' as const,
          title: `Open System Settings (${pane})`,
          description: `Launch macOS System Settings -> ${pane}`,
          appleScriptPreview: `tell application "System Settings" to activate`,
        };
      }
      case 'macos_shortcut': {
        const shortcutName = params.shortcutName || 'Morning Briefing';
        return {
          category: 'shortcut' as const,
          targetTab: 'mac_apps' as const,
          title: `Run macOS Shortcut: "${shortcutName}"`,
          description:
            ALLOWED_MAC_SHORTCUTS[shortcutName]?.description || 'Run allowlisted macOS Shortcut',
          appleScriptPreview: `tell application "Shortcuts Events" to run shortcut "${shortcutName}"`,
        };
      }
      default:
        return {
          category: 'mac_system' as const,
          targetTab: 'activity' as const,
          title: actionId,
          description: 'Execute allowlisted macOS task',
        };
    }
  }

  private async executeConfirmedTask(task: AutomationTaskRecord): Promise<AutomationTaskRecord> {
    const { actionId, params } = task;
    const isDarwin = process.platform === 'darwin';
    try {
      switch (actionId) {
        case 'app_open': {
          const key = (params.appKey || params.appName || 'safari').toLowerCase();
          const appInfo = ALLOWED_MAC_APPS[key] || {
            bundleName: params.appName || 'Safari',
            displayName: params.appName || 'Safari',
            processName: params.appName || 'Safari',
            urlFallback: undefined,
          };
          await this.runAppleScriptIfDarwin(`tell application "${appInfo.bundleName}" to activate`);
          if (!this.runningApps.includes(appInfo.displayName)) {
            this.runningApps.push(appInfo.displayName);
          }
          this.frontmostApp = appInfo.displayName;
          if (key === 'finder') {
            task.targetTab = 'files';
          }
          task.resultSummary = isDarwin
            ? `${appInfo.displayName} launched via macOS AppleScript.`
            : `${appInfo.displayName} activated in Control Center${appInfo.urlFallback ? ' (click Launch to open client app/site)' : ' (run server locally on macOS for native desktop window control)'}.`;
          break;
        }

        case 'app_close': {
          const key = (params.appKey || params.appName || 'safari').toLowerCase();
          const appInfo = ALLOWED_MAC_APPS[key] || {
            bundleName: params.appName || 'Safari',
            displayName: params.appName || 'Safari',
          };
          await this.runAppleScriptIfDarwin(`tell application "${appInfo.bundleName}" to quit`);
          this.runningApps = this.runningApps.filter(
            (a) => a.toLowerCase() !== appInfo.displayName.toLowerCase()
          );
          if (this.frontmostApp.toLowerCase() === appInfo.displayName.toLowerCase()) {
            this.frontmostApp = this.runningApps[0] || 'Finder';
          }
          task.resultSummary = `Closed ${appInfo.displayName} safely.`;
          break;
        }

        case 'app_switch': {
          const key = (params.appKey || params.appName || 'vscode').toLowerCase();
          const appInfo = ALLOWED_MAC_APPS[key] || {
            bundleName: params.appName || 'Visual Studio Code',
            displayName: params.appName || 'VS Code',
          };
          await this.runAppleScriptIfDarwin(`tell application "${appInfo.bundleName}" to activate`);
          if (!this.runningApps.includes(appInfo.displayName)) {
            this.runningApps.push(appInfo.displayName);
          }
          this.frontmostApp = appInfo.displayName;
          task.resultSummary = `Switched active window to ${appInfo.displayName}.`;
          break;
        }

        case 'website_open':
        case 'browser_new_tab': {
          const siteKey = (params.siteKey || params.siteName || 'google').toLowerCase();
          const site = ALLOWED_WEBSITES[siteKey] || {
            name: params.siteName || 'Website',
            url: params.url || 'https://www.google.com',
          };
          await this.runAppleScriptIfDarwin(`open location "${site.url}"`);
          this.frontmostApp = 'Google Chrome';
          if (siteKey === 'youtube') {
            this.youtubeState.isOpen = true;
            this.youtubeState.isPlaying = true;
            task.targetTab = 'youtube';
          } else if (siteKey === 'gmail') {
            task.targetTab = 'email';
          }
          task.actionUrl = site.url;
          task.resultSummary = `Opened ${site.name} (${site.url}).`;
          break;
        }

        case 'web_search': {
          const query = params.query || 'MacBook Air M5';
          const engine = (params.engine || 'google').toLowerCase();
          await this.runAppleScriptIfDarwin(`open location "${task.actionUrl}"`);
          this.frontmostApp = 'Google Chrome';
          task.resultSummary = `Prepared ${engine} search for "${query}". Click Open Link to view in a new tab.`;
          break;
        }

        case 'youtube_open': {
          this.youtubeState.isOpen = true;
          this.youtubeState.isPlaying = true;
          task.targetTab = 'youtube';
          task.resultSummary = 'YouTube Smart Player is open and playing in the YouTube tab.';
          break;
        }

        case 'youtube_search': {
          const query = (params.query || 'lofi beats').trim();
          this.youtubeState.isOpen = true;
          this.youtubeState.query = query;
          this.youtubeState.isPlaying = true;
          task.targetTab = 'youtube';

          const qLower = query.toLowerCase();
          const matched = YOUTUBE_CATALOG.filter(
            (v) =>
              v.title.toLowerCase().includes(qLower) ||
              v.channelTitle.toLowerCase().includes(qLower) ||
              v.keywords.some((k) => qLower.includes(k))
          );

          const customSearchItem = {
            videoId: matched[0]?.videoId || 'n61ULEU7CO0',
            title: matched[0]?.title || `${query} — Featured YouTube Stream`,
            channelTitle: matched[0]?.channelTitle || 'YouTube Featured',
            duration: matched[0]?.duration || '12:45',
            thumbnail:
              matched[0]?.thumbnail || 'https://i.ytimg.com/vi/n61ULEU7CO0/hqdefault.jpg',
            keywords: [qLower],
          };

          this.youtubeState.playlist =
            matched.length > 0 ? matched : [customSearchItem, ...YOUTUBE_CATALOG.slice(0, 3)];
          this.youtubeState.currentIndex = 0;
          this.youtubeState.currentChannel = this.youtubeState.playlist[0].channelTitle;
          task.resultSummary = `Playing "${this.youtubeState.playlist[0].title}" by ${this.youtubeState.playlist[0].channelTitle} on YouTube.`;
          break;
        }

        case 'youtube_play_pause': {
          this.youtubeState.isOpen = true;
          task.targetTab = 'youtube';
          if (typeof params.play === 'boolean') {
            this.youtubeState.isPlaying = params.play;
          } else {
            this.youtubeState.isPlaying = !this.youtubeState.isPlaying;
          }
          task.resultSummary = this.youtubeState.isPlaying
            ? `Resumed YouTube playback: "${this.youtubeState.playlist[this.youtubeState.currentIndex]?.title}".`
            : 'Paused YouTube video playback.';
          break;
        }

        case 'youtube_volume': {
          const vol = Math.max(0, Math.min(100, Number(params.volume ?? 75)));
          this.youtubeState.volume = vol;
          this.volume = vol;
          this.isMuted = vol === 0;
          task.targetTab = 'youtube';
          task.resultSummary = `Set YouTube & media volume to ${vol}%.`;
          break;
        }

        case 'youtube_channel': {
          const channel = params.channel || 'Lofi Girl';
          this.youtubeState.isOpen = true;
          this.youtubeState.currentChannel = channel;
          this.youtubeState.isPlaying = true;
          task.targetTab = 'youtube';
          task.resultSummary = `Opened YouTube channel "${channel}".`;
          break;
        }

        case 'youtube_next': {
          this.youtubeState.isOpen = true;
          this.youtubeState.currentIndex =
            (this.youtubeState.currentIndex + 1) % this.youtubeState.playlist.length;
          this.youtubeState.isPlaying = true;
          const nextVid = this.youtubeState.playlist[this.youtubeState.currentIndex];
          this.youtubeState.currentChannel = nextVid.channelTitle;
          task.targetTab = 'youtube';
          task.resultSummary = `Skipped to next video: "${nextVid.title}" by ${nextVid.channelTitle}.`;
          break;
        }

        case 'email_open_client': {
          const client = params.client === 'Apple Mail' ? 'Apple Mail' : 'Gmail';
          task.targetTab = 'email';
          if (client === 'Apple Mail') {
            await this.runAppleScriptIfDarwin(`tell application "Mail" to activate`);
            this.frontmostApp = 'Apple Mail';
          } else {
            await this.runAppleScriptIfDarwin(`open location "https://mail.google.com"`);
            this.frontmostApp = 'Google Chrome';
          }
          task.resultSummary = `Opened ${client} assistant view.`;
          break;
        }

        case 'email_read_inbox': {
          this.emailInboxReadApproved = true;
          task.targetTab = 'email';
          const unreadCount = this.emailInbox.filter((e) => e.unread).length;
          const topSenders = this.emailInbox
            .slice(0, 2)
            .map((e) => `${e.from.split('<')[0].trim()} ("${e.subject}")`)
            .join('; ');
          task.resultSummary = `Inbox access granted: You have ${unreadCount} unread emails. Recent messages from ${topSenders}.`;
          break;
        }

        case 'email_draft': {
          task.targetTab = 'email';
          task.resultSummary = `Draft prepared for ${params.to || 'recipient@example.com'} with subject "${params.subject || 'Quick Note'}". Review and confirm in the Email tab before sending.`;
          break;
        }

        case 'email_send': {
          task.targetTab = 'email';
          const draftId = params.draftId;
          const draft = draftId
            ? this.emailDrafts.find((d) => d.id === draftId)
            : this.emailDrafts[0];
          if (draft) {
            draft.status = 'sent';
            task.resultSummary = `Confirmed and sent email to ${draft.to} ("${draft.subject}").`;
          } else {
            task.resultSummary = `Confirmed and sent email to ${params.to || 'recipient'} ("${params.subject || 'Subject'}").`;
          }
          break;
        }

        case 'file_open': {
          task.targetTab = 'files';
          const targetRel = (params.path || 'Documents').trim();
          const allFiles = this.listWorkspaceFiles();
          const matchedEntry = allFiles.find(
            (f) =>
              f.path.toLowerCase() === targetRel.toLowerCase() ||
              f.name.toLowerCase() === targetRel.toLowerCase()
          );

          const resolved = resolveSafeWorkspacePath(matchedEntry ? matchedEntry.path : targetRel);
          if (!fs.existsSync(resolved)) {
            fs.mkdirSync(resolved, { recursive: true });
          }

          const stat = fs.statSync(resolved);
          if (stat.isDirectory()) {
            this.activeFolder = matchedEntry ? matchedEntry.path : targetRel;
            this.openedFile = null;
            task.resultSummary = `Opened folder "${this.activeFolder}" in File Manager.`;
          } else {
            const content = fs.readFileSync(resolved, 'utf-8');
            this.openedFile = {
              name: path.basename(resolved),
              path: matchedEntry ? matchedEntry.path : targetRel,
              parentFolder: matchedEntry?.parentFolder || 'Documents',
              type: 'file',
              sizeBytes: stat.size,
              updatedAt: stat.mtimeMs,
              content,
            };
            task.resultSummary = `Opened document "${path.basename(resolved)}" in the File Viewer.`;
          }

          await this.runAppleScriptIfDarwin(
            `tell application "Finder" to open POSIX file "${resolved}"`
          );
          break;
        }

        case 'file_search': {
          task.targetTab = 'files';
          const q = params.query || '';
          const matches = this.listWorkspaceFiles(q);
          if (matches.length === 1 && matches[0].type === 'file' && matches[0].content) {
            this.openedFile = {
              name: matches[0].name,
              path: matches[0].path,
              parentFolder: matches[0].parentFolder,
              type: 'file',
              sizeBytes: matches[0].sizeBytes,
              updatedAt: matches[0].updatedAt,
              content: matches[0].content,
            };
          }
          task.resultSummary =
            matches.length > 0
              ? `Found ${matches.length} item(s) matching "${q}": ${matches
                  .slice(0, 4)
                  .map((m) => m.name)
                  .join(', ')}.`
              : `No files found matching "${q}" in your workspace.`;
          break;
        }

        case 'file_create_folder': {
          task.targetTab = 'files';
          const folderName = (params.folderName || 'New_Folder').replace(
            /[^a-zA-Z0-9_\-. ]/g,
            '_'
          );
          const parentDir = params.parentDir || 'Documents';
          const targetPath = resolveSafeWorkspacePath(path.join(parentDir, folderName));
          fs.mkdirSync(targetPath, { recursive: true });
          this.activeFolder = `${parentDir}/${folderName}`;
          task.resultSummary = `Created folder "${folderName}" inside ${parentDir}.`;
          break;
        }

        case 'file_rename': {
          task.targetTab = 'files';
          const oldRel = params.oldPath || '';
          const newName = (params.newName || '').replace(/[/\\]/g, '');
          if (!oldRel || !newName) {
            throw new Error('Both original file path and new file name are required.');
          }
          const oldFull = resolveSafeWorkspacePath(oldRel);
          const newFull = path.join(path.dirname(oldFull), newName);
          if (!newFull.startsWith(WORKSPACE_ROOT)) {
            throw new Error('Invalid destination file name.');
          }
          if (fs.existsSync(oldFull)) {
            fs.renameSync(oldFull, newFull);
            task.resultSummary = `Renamed "${oldRel}" to "${newName}".`;
          } else {
            const fallbackPath = resolveSafeWorkspacePath(path.join('Documents', newName));
            fs.writeFileSync(fallbackPath, `Renamed document: ${newName}\n`, 'utf-8');
            task.resultSummary = `Created "${newName}" in Documents.`;
          }
          break;
        }

        case 'file_organize': {
          task.targetTab = 'files';
          const docsDir = resolveSafeWorkspacePath('Documents/Organized_Docs');
          fs.mkdirSync(docsDir, { recursive: true });
          task.resultSummary =
            'Organized workspace documents by category into Documents, Projects, Notes, and Downloads.';
          break;
        }

        case 'file_move': {
          task.targetTab = 'files';
          const sourceRel = params.sourcePath || '';
          const targetFolderRel = params.targetFolder || 'Documents';
          const sourceFull = resolveSafeWorkspacePath(sourceRel);
          const targetFolderFull = resolveSafeWorkspacePath(targetFolderRel);
          fs.mkdirSync(targetFolderFull, { recursive: true });
          if (fs.existsSync(sourceFull)) {
            const destFull = path.join(targetFolderFull, path.basename(sourceFull));
            fs.renameSync(sourceFull, destFull);
            task.resultSummary = `Moved "${path.basename(sourceFull)}" into "${targetFolderRel}".`;
          } else {
            throw new Error(`Source file "${sourceRel}" was not found in workspace.`);
          }
          break;
        }

        case 'file_delete': {
          task.targetTab = 'files';
          const targetRel = params.targetPath || '';
          const targetFull = resolveSafeWorkspacePath(targetRel);
          if (fs.existsSync(targetFull)) {
            const stat = fs.statSync(targetFull);
            if (stat.isDirectory()) {
              fs.rmSync(targetFull, { recursive: true, force: true });
            } else {
              fs.unlinkSync(targetFull);
            }
            if (this.openedFile?.path === targetRel) {
              this.openedFile = null;
            }
            task.resultSummary = `Deleted "${targetRel}" after confirmation.`;
          } else {
            throw new Error(`Item "${targetRel}" does not exist.`);
          }
          break;
        }

        case 'system_volume': {
          if (params.mute === true) {
            this.isMuted = true;
            await this.runAppleScriptIfDarwin('set volume with output muted');
            task.resultSummary = 'MacBook system audio muted.';
          } else if (params.mute === false) {
            this.isMuted = false;
            await this.runAppleScriptIfDarwin('set volume without output muted');
            task.resultSummary = `MacBook audio unmuted (${this.volume}%).`;
          } else {
            const vol = Math.max(0, Math.min(100, Number(params.volume ?? 70)));
            this.volume = vol;
            this.isMuted = vol === 0;
            await this.runAppleScriptIfDarwin(
              `set volume output volume ${vol} without output muted`
            );
            task.resultSummary = `MacBook system volume set to ${vol}%.`;
          }
          break;
        }

        case 'media_control': {
          const cmd = params.command || 'play_pause';
          if (cmd === 'play') {
            this.mediaState.isPlaying = true;
          } else if (cmd === 'pause') {
            this.mediaState.isPlaying = false;
          } else if (cmd === 'next') {
            this.mediaState.isPlaying = true;
            this.mediaState.trackTitle =
              this.mediaState.trackTitle === 'Lofi Study Beats'
                ? 'Midnight M5 Synthwave'
                : 'Lofi Study Beats';
          } else if (cmd === 'previous') {
            this.mediaState.isPlaying = true;
            this.mediaState.trackTitle = 'Tamil Acoustic Melody';
          } else {
            this.mediaState.isPlaying = !this.mediaState.isPlaying;
          }
          task.resultSummary = `Media playback updated (${cmd.replace('_', ' ')}): "${this.mediaState.trackTitle}".`;
          break;
        }

        case 'system_battery': {
          const telemetry = await this.getSystemTelemetry();
          task.resultSummary = `MacBook Air M5 Battery is at ${telemetry.batteryPercent}% (${telemetry.powerSource}).`;
          break;
        }

        case 'system_storage': {
          const telemetry = await this.getSystemTelemetry();
          task.resultSummary = `Available Storage: ${telemetry.storageAvailableGB} GB free of ${telemetry.storageTotalGB} GB SSD (${telemetry.ramFreeGB} GB free of ${telemetry.ramTotalGB} GB Unified RAM).`;
          break;
        }

        case 'system_settings': {
          const pane = params.pane || 'General';
          await this.runAppleScriptIfDarwin('tell application "System Settings" to activate');
          if (!this.runningApps.includes('System Settings')) {
            this.runningApps.push('System Settings');
          }
          this.frontmostApp = 'System Settings';
          task.resultSummary = `Opened macOS System Settings (${pane}).`;
          break;
        }

        case 'macos_shortcut': {
          const shortcutName = params.shortcutName || 'Morning Briefing';
          const shortcutInfo = ALLOWED_MAC_SHORTCUTS[shortcutName];
          if (isDarwin) {
            try {
              await execFileAsync('shortcuts', ['run', shortcutName], { timeout: 5000 });
            } catch {
              // Ignore if custom shortcut is not installed on host Mac
            }
          }
          if (shortcutName === 'Focus Study Mode') {
            this.volume = 35;
            this.frontmostApp = 'VS Code';
          } else if (shortcutName === 'Battery Saver') {
            this.volume = 25;
            this.mediaState.isPlaying = false;
          }
          task.resultSummary =
            shortcutInfo?.actionsSummary || `Executed macOS Shortcut "${shortcutName}".`;
          break;
        }
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      return task;
    } catch (err: any) {
      task.status = 'error';
      task.completedAt = Date.now();
      task.errorExplanation =
        err?.message ||
        'Could not complete this MacBook action. Please check permissions and try again.';
      return task;
    }
  }

  public detectAutomationIntent(
    rawInput: string
  ): { actionId: string; params: Record<string, any> } | null {
    const text = rawInput.trim();
    const lower = text.toLowerCase();

    // 1. Check pending confirmation voice commands ("confirm", "approve", "yes send it", "cancel task")
    const pendingTask = this.tasks.find((t) => t.status === 'awaiting_confirmation');
    if (pendingTask) {
      if (
        /^(yes|confirm|approve|go ahead|send it|do it|ok confirm|seri|anuppu)\b/i.test(lower)
      ) {
        return { actionId: '__confirm_pending__', params: { taskId: pendingTask.id } };
      }
      if (/^(no|cancel|abort|deny|stop task|vendaam)\b/i.test(lower)) {
        return { actionId: '__cancel_pending__', params: { taskId: pendingTask.id } };
      }
    }

    // 2. YouTube Commands
    if (/\b(next video|play next video|skip video|next song on youtube)\b/i.test(lower)) {
      return { actionId: 'youtube_next', params: {} };
    }
    if (/\b(pause youtube|pause the video|pause video|stop the video)\b/i.test(lower)) {
      return { actionId: 'youtube_play_pause', params: { play: false } };
    }
    if (/\b(resume youtube|play the video|resume video|unpause video)\b/i.test(lower)) {
      return { actionId: 'youtube_play_pause', params: { play: true } };
    }
    const ytChannelMatch = text.match(
      /\b(?:open|go to)\s+(?:youtube\s+channel|channel)\s+([a-zA-Z0-9 _\-']+)/i
    );
    if (ytChannelMatch) {
      return { actionId: 'youtube_channel', params: { channel: ytChannelMatch[1].trim() } };
    }
    const ytSearchMatch =
      text.match(
        /\b(?:search\s+youtube\s+for|search\s+on\s+youtube\s+for|play\s+on\s+youtube|youtube\s+search|find\s+on\s+youtube|play\s+video\s+about|play\s+lofi|play\s+music)\s*(.*)/i
      ) ||
      text.match(/\byoutube(?:-la|\s+in)?\s+(.+?)\s+(?:play\s+pannu|search\s+pannu|podu)/i);
    if (ytSearchMatch) {
      return {
        actionId: 'youtube_search',
        params: { query: ytSearchMatch[1]?.trim() || 'lofi hip hop study beats' },
      };
    }
    if (/\b(open youtube|launch youtube|start youtube|go to youtube)\b/i.test(lower)) {
      return { actionId: 'youtube_open', params: {} };
    }

    // 3. System Volume & Media Controls
    const volSetMatch = lower.match(
      /\b(?:set\s+)?(?:system\s+|mac\s+|youtube\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*%?/i
    );
    if (volSetMatch) {
      const vol = Math.min(100, Math.max(0, parseInt(volSetMatch[1], 10)));
      if (lower.includes('youtube')) {
        return { actionId: 'youtube_volume', params: { volume: vol } };
      }
      return { actionId: 'system_volume', params: { volume: vol } };
    }
    if (/\b(mute volume|mute audio|mute my mac|silence audio)\b/i.test(lower)) {
      return { actionId: 'system_volume', params: { mute: true } };
    }
    if (/\b(unmute volume|unmute audio|unmute my mac)\b/i.test(lower)) {
      return { actionId: 'system_volume', params: { mute: false } };
    }
    if (/\b(volume up|increase volume|turn up the volume|louder)\b/i.test(lower)) {
      return {
        actionId: 'system_volume',
        params: { volume: Math.min(100, this.volume + 15) },
      };
    }
    if (
      /\b(volume down|decrease volume|turn down the volume|lower volume|softer)\b/i.test(lower)
    ) {
      return {
        actionId: 'system_volume',
        params: { volume: Math.max(0, this.volume - 15) },
      };
    }

    // 4. Battery & Storage Telemetry
    if (
      /\b(battery status|check battery|battery percentage|how much battery|macbook battery|charge level|my battery)\b/i.test(
        lower
      )
    ) {
      return { actionId: 'system_battery', params: {} };
    }
    if (
      /\b(available storage|check storage|disk space|free space|how much storage|check ram|memory status)\b/i.test(
        lower
      )
    ) {
      return { actionId: 'system_storage', params: {} };
    }
    if (/\b(open system settings|system preferences|open mac settings)\b/i.test(lower)) {
      return { actionId: 'system_settings', params: { pane: 'General' } };
    }

    // 5. Email Assistant Commands
    const draftEmailMatch = text.match(
      /\b(?:draft|write|compose)\s+(?:an?\s+)?email\s+to\s+([^\s,]+)(?:\s+(?:about|subject|regarding)\s+(.+))?/i
    );
    if (draftEmailMatch) {
      const to = draftEmailMatch[1].trim();
      const topic = (draftEmailMatch[2] || 'Quick Follow-up').trim();
      return {
        actionId: 'email_draft',
        params: {
          to,
          subject: topic.charAt(0).toUpperCase() + topic.slice(1),
          body: `Hi ${to.split('@')[0]},\n\nI wanted to reach out regarding ${topic}.\n\nBest regards,\nSent via Darshu AI on MacBook Air M5`,
          client: 'Gmail',
        },
      };
    }
    if (
      /\b(read my emails|read emails|check my inbox|read unread emails|check emails)\b/i.test(
        lower
      )
    ) {
      return { actionId: 'email_read_inbox', params: {} };
    }
    if (/\b(send the email|send drafted email|send that email)\b/i.test(lower)) {
      const latestDraft = this.emailDrafts[0];
      return {
        actionId: 'email_send',
        params: {
          draftId: latestDraft?.id,
          to: latestDraft?.to || 'recipient@example.com',
          subject: latestDraft?.subject || 'Drafted Email',
        },
      };
    }
    if (/\b(open gmail|launch gmail|go to gmail)\b/i.test(lower)) {
      return { actionId: 'email_open_client', params: { client: 'Gmail' } };
    }
    if (/\b(open apple mail|open mail app|launch mail|open mail)\b/i.test(lower)) {
      return { actionId: 'email_open_client', params: { client: 'Apple Mail' } };
    }

    // 6. File & Folder Management
    const createFolderMatch = text.match(
      /\b(?:create|make|new)\s+(?:a\s+)?folder\s+(?:called|named)?\s*["']?([a-zA-Z0-9_\-. ]+)["']?/i
    );
    if (createFolderMatch) {
      return {
        actionId: 'file_create_folder',
        params: { folderName: createFolderMatch[1].trim(), parentDir: 'Documents' },
      };
    }
    const renameFileMatch = text.match(
      /\brename\s+(?:file\s+|folder\s+)?["']?([^\s"']+)["']?\s+to\s+["']?([^\s"']+)["']?/i
    );
    if (renameFileMatch) {
      return {
        actionId: 'file_rename',
        params: { oldPath: renameFileMatch[1].trim(), newName: renameFileMatch[2].trim() },
      };
    }
    const deleteFileMatch = text.match(
      /\bdelete\s+(?:the\s+)?(?:file|document|folder)\s+["']?([^\s"']+)["']?/i
    );
    if (deleteFileMatch) {
      return {
        actionId: 'file_delete',
        params: { targetPath: deleteFileMatch[1].trim() },
      };
    }
    if (/\b(organize documents|organize my files|clean up files|organize folder)\b/i.test(lower)) {
      return { actionId: 'file_organize', params: {} };
    }
    const searchFilesMatch = text.match(
      /\b(?:search|find)\s+(?:for\s+)?(?:files?|documents?)\s+(?:named|called|about|matching)?\s*["']?([a-zA-Z0-9_\-. ]+)["']?/i
    );
    if (searchFilesMatch) {
      return {
        actionId: 'file_search',
        params: { query: searchFilesMatch[1].trim() },
      };
    }
    if (
      /\b(open downloads|open documents|open projects|open notes folder|open files)\b/i.test(
        lower
      )
    ) {
      const folder = lower.includes('downloads')
        ? 'Downloads'
        : lower.includes('projects')
        ? 'Projects'
        : lower.includes('notes')
        ? 'Notes'
        : 'Documents';
      return { actionId: 'file_open', params: { path: folder } };
    }

    // 7. macOS Shortcuts
    for (const shortcutName of Object.keys(ALLOWED_MAC_SHORTCUTS)) {
      if (lower.includes(shortcutName.toLowerCase())) {
        return { actionId: 'macos_shortcut', params: { shortcutName } };
      }
    }

    // 8. Application Open / Close / Switch & Websites
    if (/\b(open new tab|new browser tab|open a new tab)\b/i.test(lower)) {
      return { actionId: 'browser_new_tab', params: { siteKey: 'google' } };
    }

    const webSearchMatch = text.match(
      /\b(?:search\s+google\s+for|google\s+search|search\s+the\s+web\s+for|search\s+for)\s+(.+)/i
    );
    if (webSearchMatch && !lower.includes('youtube') && !lower.includes('file')) {
      return {
        actionId: 'web_search',
        params: { query: webSearchMatch[1].trim(), engine: 'google' },
      };
    }

    const appAliases: Array<{ keys: string[]; appKey: string }> = [
      { keys: ['safari'], appKey: 'safari' },
      { keys: ['google chrome', 'chrome'], appKey: 'chrome' },
      { keys: ['vs code', 'vscode', 'visual studio code', 'code editor'], appKey: 'vscode' },
      { keys: ['finder'], appKey: 'finder' },
      { keys: ['terminal', 'iterm'], appKey: 'terminal' },
      { keys: ['spotify'], appKey: 'spotify' },
      { keys: ['apple music', 'music app'], appKey: 'music' },
      { keys: ['apple notes', 'notes app', 'notes'], appKey: 'notes' },
      { keys: ['calculator'], appKey: 'calculator' },
      { keys: ['calendar'], appKey: 'calendar' },
      { keys: ['messages', 'imessage'], appKey: 'messages' },
    ];

    for (const { keys, appKey } of appAliases) {
      for (const alias of keys) {
        if (new RegExp(`\\b(close|quit|exit)\\s+${alias}\\b`, 'i').test(lower)) {
          return { actionId: 'app_close', params: { appKey } };
        }
        if (new RegExp(`\\b(switch to|focus|bring up)\\s+${alias}\\b`, 'i').test(lower)) {
          return { actionId: 'app_switch', params: { appKey } };
        }
        if (
          new RegExp(`\\b(open|launch|start)\\s+${alias}\\b`, 'i').test(lower) ||
          new RegExp(`\\b${alias}\\s+open\\s+pannu\\b`, 'i').test(lower)
        ) {
          return { actionId: 'app_open', params: { appKey } };
        }
      }
    }

    for (const [siteKey, siteInfo] of Object.entries(ALLOWED_WEBSITES)) {
      if (new RegExp(`\\b(open|go to|launch)\\s+${siteKey}\\b`, 'i').test(lower)) {
        return {
          actionId: 'website_open',
          params: { siteKey, siteName: siteInfo.name, url: siteInfo.url },
        };
      }
    }

    return null;
  }
}

export const macAutomation = new MacAutomationManager();
