import fs from 'fs/promises';
import path from 'path';

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function cleanupOldFiles() {
  const directory = path.join(__dirname, '..', 'processed_images');
  const now = Date.now();

  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtime.getTime() > MAX_AGE_MS) {
        await fs.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}