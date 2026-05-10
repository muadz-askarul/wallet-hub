import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { getSettings, updateSettings } from '../services/settings-service';

describe('Settings Service', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('should get default settings and update them', async () => {
    const settings = await getSettings();
    expect(settings.darkMode).toBe(false);
    expect(settings.currency).toBe('USD');

    await updateSettings({ darkMode: true, currency: 'IDR' });
    const updated = await getSettings();
    expect(updated.darkMode).toBe(true);
    expect(updated.currency).toBe('IDR');
  });
});
