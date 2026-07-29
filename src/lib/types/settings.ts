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

export interface AllSettings {
  userSettings: UserSettings | null;
  notificationSettings: NotificationSettingsData | null;
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
