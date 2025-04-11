export interface TravelEntry {
    id: string;
    imageUri: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt: number;
  }
  
  export type Theme = 'light' | 'dark';
  
  export type PermissionStatus = 'granted' | 'denied' | 'undetermined';
  
  export enum StorageKeys {
    ENTRIES = '@travel_diary_entries',
    THEME = '@travel_diary_theme',
    APP_OPENED_COUNT = '@travel_diary_opened_count',
    FIRST_LAUNCH = '@travel_diary_first_launch',
  }