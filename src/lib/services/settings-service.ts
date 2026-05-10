import { db, type Settings } from '../db';

const defaultSettings: Settings = {
  id: 'user_settings',
  darkMode: false,
  currency: 'USD',
  pin: ''
};

export async function getSettings(): Promise<Settings> {
  const settings = await db.settings.get('user_settings');
  if (!settings) {
    await db.settings.add(defaultSettings);
    return defaultSettings;
  }
  return settings;
}

export async function updateSettings(updates: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await db.settings.put(updated);
  return updated;
}
