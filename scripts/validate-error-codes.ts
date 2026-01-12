import { DOMAIN_ERRORS } from '../src/common/constants/errors/domain.errors';
import { SYSTEM_ERRORS } from '../src/common/constants/errors/system.errors';

/**
 * 에러 코드 중복 검증 스크립트
 * - prebuild/pretest 시 자동 실행
 * - 중복된 에러 코드 발견 시 빌드 실패
 */
function validateErrorCodes() {
  console.log('🔍 에러 코드 검증 중...\n');

  const allErrors = [
    ...Object.entries(DOMAIN_ERRORS),
    ...Object.entries(SYSTEM_ERRORS),
  ];

  const codeMap = new Map<string, string>();
  const errors: string[] = [];

  for (const [errorKey, errorDef] of allErrors) {
    const { code } = errorDef as any;

    if (codeMap.has(code)) {
      const existingKey = codeMap.get(code);
      errors.push(
        `❌ 중복된 에러 코드: "${code}"\n` +
          `   - 기존: ${existingKey}\n` +
          `   - 충돌: ${errorKey}`,
      );
    } else {
      codeMap.set(code, errorKey as string);
    }
  }

  if (errors.length > 0) {
    console.error('🚨 에러 코드 검증 실패!\n');
    errors.forEach((err) => console.error(err));
    console.error('\n💡 힌트: 각 에러 코드는 고유해야 합니다.\n');
    process.exit(1);
  }

  console.log(`✅ 에러 코드 검증 성공! (총 ${codeMap.size}개)\n`);

  // 등록된 코드 출력 (디버깅용)
  console.log('📋 등록된 에러 코드:');
  const sortedCodes = Array.from(codeMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  sortedCodes.forEach(([code, key]) => {
    console.log(`  ${code.padEnd(15)} → ${key}`);
  });
}

validateErrorCodes();
