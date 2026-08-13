export type ThemePreference = "light" | "dark" | "system";

export interface UserSettings {
  settingId: string;
  language: string;
  timezone: string;
  theme: ThemePreference;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface NotificationSettingsData {
  id: string;
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  messagePreviewEnabled: boolean;
  emailNotifications: boolean;
}

export interface PrivacySettingsData {
  id: string;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  lastSeenEnabled: boolean;
  profilePhotoVisibility: string;
  statusVisibility: string;
  whoCanAddToGroups: string;
  whoCanMessageMe: "everyone" | "friends" | string;
}

export interface AllSettings {
  userSettings: UserSettings | null;
  notificationSettings: NotificationSettingsData | null;
  privacySettings?: PrivacySettingsData | null;
}

export interface UpdateUserSettingsRequest {
  language?: string;
  timezone?: string;
  theme?: ThemePreference;
}

export interface UpdateNotificationSettingsRequest {
  notificationsEnabled?: boolean;
  notificationSoundEnabled?: boolean;
  messagePreviewEnabled?: boolean;
  emailNotifications?: boolean;
}

export interface UpdatePrivacySettingsRequest {
  readReceiptsEnabled?: boolean;
  typingIndicatorsEnabled?: boolean;
  lastSeenEnabled?: boolean;
  profilePhotoVisibility?: string;
  statusVisibility?: string;
  whoCanAddToGroups?: string;
  whoCanMessageMe?: "everyone" | "friends";
}
