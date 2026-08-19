export interface ContentModerationConfig {
  enabled: boolean;
  bannedWords: string[];
}

export interface ContentModerationSettings extends ContentModerationConfig {
  updatedAt: string;
}

export interface UpdateContentModerationSettingsRequest {
  enabled: boolean;
  /** Omit to keep the current banned-word list and only change `enabled`. */
  bannedWords?: string[];
}
