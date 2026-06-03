import { readdir, stat } from 'fs/promises';
import path from 'path';

export type UploadFileEntry = {
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: string;
};

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILES = 500;
const MAX_DEPTH = 6;

async function walkDir(
  dir: string,
  relativePrefix: string,
  depth: number,
  acc: UploadFileEntry[]
): Promise<void> {
  if (depth > MAX_DEPTH || acc.length >= MAX_FILES) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (acc.length >= MAX_FILES) break;
    const fullPath = path.join(dir, entry.name);
    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await walkDir(fullPath, relativePath, depth + 1, acc);
      continue;
    }
    if (!entry.isFile()) continue;

    try {
      const info = await stat(fullPath);
      acc.push({
        path: `/uploads/${relativePath}`,
        relativePath,
        size: info.size,
        modifiedAt: info.mtime.toISOString(),
      });
    } catch {
      // skip unreadable files
    }
  }
}

export async function scanPublicUploads(): Promise<UploadFileEntry[]> {
  const files: UploadFileEntry[] = [];
  await walkDir(UPLOADS_ROOT, '', 0, files);
  files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return files;
}
