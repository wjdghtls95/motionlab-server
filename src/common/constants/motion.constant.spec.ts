import { MOTION_CONSTANTS } from './motion.constant';

describe('MOTION_CONSTANTS', () => {
  describe('MAX_FILE_SIZE', () => {
    // 프론트 config.ts MAX_VIDEO_SIZE_MB: 100
    // Nginx client_max_body_size 100m
    // 세 곳이 100MB로 일치해야 한다 (R-021)
    const EXPECTED_MB = 100;
    const EXPECTED_BYTES = EXPECTED_MB * 1024 * 1024;

    it('✅ 100MB(104,857,600 bytes)여야 한다', () => {
      expect(MOTION_CONSTANTS.MAX_FILE_SIZE).toBe(EXPECTED_BYTES);
    });

    it('✅ 프론트 MAX_VIDEO_SIZE_MB(100MB) 이하여야 한다', () => {
      const FRONT_MAX_BYTES = 100 * 1024 * 1024;
      expect(MOTION_CONSTANTS.MAX_FILE_SIZE).toBeLessThanOrEqual(
        FRONT_MAX_BYTES,
      );
    });

    it('❌ 500MB를 초과하지 않아야 한다 (이전 버그: 500MB 허용)', () => {
      expect(MOTION_CONSTANTS.MAX_FILE_SIZE).toBeLessThan(500 * 1024 * 1024);
    });
  });
});
