import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export type AdminSettings = {
  chatEnabled: boolean;
  voiceEnabled: boolean;
  maintenanceMode: boolean;
};

const DEFAULT_SETTINGS: AdminSettings = {
  chatEnabled: true,
  voiceEnabled: true,
  maintenanceMode: false,
};

function settingsPath() {
  return path.join(process.cwd(), 'data', 'admin-settings.json');
}

export async function readAdminSettings(): Promise<AdminSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    return {
      chatEnabled: parsed.chatEnabled ?? DEFAULT_SETTINGS.chatEnabled,
      voiceEnabled: parsed.voiceEnabled ?? DEFAULT_SETTINGS.voiceEnabled,
      maintenanceMode: parsed.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeAdminSettings(next: AdminSettings): Promise<AdminSettings> {
  const file = settingsPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
