import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  describe('validateStrength', () => {
    it('✅ 대소문자+숫자+특수문자+8자 이상 — 통과', () => {
      expect(PasswordUtil.validateStrength('Test1234!')).toBe(true);
      expect(PasswordUtil.validateStrength('Admin@2024')).toBe(true);
      expect(PasswordUtil.validateStrength('Register1234!')).toBe(true);
    });

    it('❌ 7자 이하 — 실패', () => {
      expect(PasswordUtil.validateStrength('Te1!Ab')).toBe(false);
    });

    it('❌ 대문자 없음 — 실패', () => {
      expect(PasswordUtil.validateStrength('test1234!')).toBe(false);
    });

    it('❌ 소문자 없음 — 실패', () => {
      expect(PasswordUtil.validateStrength('TEST1234!')).toBe(false);
    });

    it('❌ 숫자 없음 — 실패', () => {
      expect(PasswordUtil.validateStrength('TestTest!')).toBe(false);
    });

    it('❌ 특수문자(@$!%*?&) 없음 — 실패', () => {
      expect(PasswordUtil.validateStrength('TestTest1')).toBe(false);
    });

    it('❌ 빈 문자열 — 실패', () => {
      expect(PasswordUtil.validateStrength('')).toBe(false);
    });

    it('❌ 허용되지 않은 특수문자(#^) — 실패', () => {
      expect(PasswordUtil.validateStrength('Test1234#')).toBe(false);
    });
  });
});
