import * as fs from 'fs/promises';
import * as path from 'path';

export class TestFileHelper {
  static async clearDirs(): Promise<void> {
    const dirs = [
      path.join(process.cwd(), 'tmp'),
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'uploads_test'),
    ];

    for (const dir of dirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
