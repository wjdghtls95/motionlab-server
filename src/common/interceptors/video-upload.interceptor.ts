import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { tmpdir } from 'os';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import * as fs from 'node:fs';

const UPLOAD_TMP_DIR = join(tmpdir(), 'motionlab-uploads');

export function VideoUploadInterceptor() {
  return FileInterceptor('video', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        try {
          fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
          cb(null, UPLOAD_TMP_DIR);
        } catch (e) {
          cb(e as Error, UPLOAD_TMP_DIR);
        }
      },
      filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: MOTION_CONSTANTS.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (
        !(MOTION_CONSTANTS.ALLOWED_MIMES as readonly string[]).includes(
          file.mimetype,
        )
      ) {
        return cb(new Error('Invalid file type'), false);
      }

      cb(null, true);
    },
  });
}
