export type Role = 'user' | 'assistant';

export interface GeneratedImageAttachment {
  imageUrl: string;
  prompt: string;
  enhancedPrompt?: string;
  aspectRatio?: string;
  style?: string;
  createdAt?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
  generatedImage?: GeneratedImageAttachment;
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
}
