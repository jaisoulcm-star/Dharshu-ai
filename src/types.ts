export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
}

export type PersonalityMode =
  | 'friendly'
  | 'funny'
  | 'caring'
  | 'study_buddy'
  | 'casual'
  | 'motivational'
  | 'witty_sassy'
  | 'romantic_poetic'
  | 'deep_confidant';

export type LanguagePref = 'auto' | 'tanglish' | 'english' | 'tamil';

export type ThemeMode = 'dark' | 'light';

export interface PollyVoiceProfile {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  languageCode: string;
  languageName: string;
  engine: 'neural' | 'standard';
  description: string;
  isDefault?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  personality: PersonalityMode;
  languagePref: LanguagePref;
}

export interface SettingsState {
  theme: ThemeMode;
  languagePref: LanguagePref;
  personality: PersonalityMode;
  voiceEnabled: boolean;
  autoReadResponses: boolean;
  speechRate: number;
  speechPitch: number;
  preferredVoiceURI: string;
  pollyVoiceId: string; // e.g. 'Joanna', 'Danielle', 'Kendra', 'Salli', 'Aditi', 'Kajal'
  wakeWordEnabled: boolean;
  voiceInterruptionEnabled: boolean;
  smartSpeakerMode: boolean;
}

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceState {
  status: VoiceStatus;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isSupported: boolean;
  permissionDenied: boolean;
  errorMessage?: string;
  transcript: string;
  activeVoiceProfile: string;
  audioVolume: number;
  wakeWordDetected: boolean;
  wakeWordText?: string;
  isWakeWordStandby?: boolean;
  isCommandListening?: boolean;
  micActive?: boolean;
}

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

export interface AutomationTask {
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

export interface SystemTelemetry {
  deviceModel: string;
  chip: string;
  ramTotalGB: number;
  ramUsedGB: number;
  ramFreeGB: number;
  batteryPercent: number;
  isCharging: boolean;
  powerSource: string;
  storageTotalGB: number;
  storageAvailableGB: number;
  storageUsedPercent: number;
  volume: number;
  isMuted: boolean;
  isNativeMacOS: boolean;
  mediaState: {
    isPlaying: boolean;
    trackTitle: string;
    artist: string;
    app: string;
  };
  runningApps: string[];
  frontmostApp: string;
  platform: string;
}

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnail: string;
}

export interface YouTubeControllerState {
  isOpen: boolean;
  query: string;
  isPlaying: boolean;
  volume: number;
  currentChannel: string;
  currentIndex: number;
  playlist: YouTubeVideoItem[];
}

export interface EmailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  client: 'Gmail' | 'Apple Mail';
  createdAt: number;
  status: 'draft' | 'awaiting_confirmation' | 'sent';
}

export interface ManagedFileItem {
  name: string;
  path: string;
  parentFolder: string;
  type: 'file' | 'folder';
  sizeBytes: number;
  updatedAt: number;
  category?: string;
  content?: string;
}

export interface AutomationNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: number;
}


