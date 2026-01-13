module.exports = {
  // TypeScript 파일: ESLint + Prettier
  '*.ts': ['eslint --fix', 'prettier --write'],

  // JSON, Markdown 파일: Prettier만
  '*.{json,md}': ['prettier --write'],

  // 에러 정의 파일 변경 시: 에러 코드 검증
  'src/common/constants/errors/*.ts': ['pnpm validate:errors'],
};
