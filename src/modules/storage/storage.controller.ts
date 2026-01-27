import {
  Controller,
  Get,
  Param,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { MOTION_CONSTANTS } from '@common/constants/motion.constant';

@Controller()
export class StorageController {
  @Get('files/:key')
  async download(@Param('key') key: string, @Res() res: Response) {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException();

    // key를 파일명으로 직접 쓰지 말고, 반드시 안전한 매핑 규칙을 가져가야 함.
    // 여기서는 예시로 "uploads/motions/{key}"를 가정.
    const filePath = join(process.cwd(), MOTION_CONSTANTS.UPLOAD_DIR, key);

    res.setHeader('Content-Type', 'video/mp4');
    return createReadStream(filePath).pipe(res);
  }
}
