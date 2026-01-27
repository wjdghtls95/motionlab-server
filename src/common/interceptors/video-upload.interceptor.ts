import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';
import * as fs from 'node:fs';

/**
 * 파일 업로드 인터셉터 팩토리
 * 환경 무관: 모든 환경에서 ./tmp 임시 저장
 */
export function VideoUploadInterceptor() {
  return FileInterceptor('video', {
    storage: diskStorage({
      // destination: './tmp', // 모든 환경 공통 임시 저장소
      destination: (req, file, cb) => {
        try {
          fs.mkdirSync('./tmp', { recursive: true });

          cb(null, './tmp');
        } catch (e) {
          cb(e as Error, './tmp');
        }
      }, // 모든 환경 공통 임시 저장소
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
