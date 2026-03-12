## 🎯 Git Convention 가이드

| Type         | 설명                         | 예시                                              |
| ------------ | ---------------------------- | ------------------------------------------------- |
| **feat**     | 새로운 기능 추가             | `feat(user): implement user domain`               |
| **fix**      | 버그 수정                    | `fix(auth): resolve JWT token validation error`   |
| **docs**     | 문서 수정                    | `docs: update API documentation`                  |
| **style**    | 코드 포맷팅 (기능 변경 없음) | `style(user): apply prettier formatting`          |
| **refactor** | 코드 리팩토링                | `refactor(auth): simplify token generation logic` |
| **test**     | 테스트 추가/수정             | `test(user): add e2e tests for user module`       |
| **chore**    | 빌드/설정 변경               | `chore: setup husky and lint-staged`              |
| **perf**     | 성능 개선                    | `perf(motion): optimize video processing`         |
| **ci**       | CI/CD 설정                   | `ci: add github actions workflow`                 |
| **revert**   | 이전 커밋 되돌리기           | `revert: revert "feat(user): add user creation"`  |

---

## Branch Strategy

`main` 브랜치는 보호되어 있으며 직접 push할 수 없습니다.

모든 변경 사항은 PR을 통해 merge되며, CI가 통과해야 merge가 가능합니다.

### 작업 흐름

**1. 브랜치 생성**

```bash
git checkout -b feat/작업명
```

**2. 작업 + 커밋**

```bash
git add .
git commit -m "feat: 작업 내용"
```

**3. push**

```bash
git push origin feat/작업명
```

**4. GitHub에서 PR 생성 → CI 통과 → Merge**

### 브랜치 네이밍

| 접두사 | 용도           | 예시                   |
| ------ | -------------- | ---------------------- |
| feat/  | 새 기능        | feat/auth-refresh      |
| fix/   | 버그 수정      | fix/redis-connection   |
| chore/ | 설정, 리팩토링 | chore/update-readme    |
| ci/    | CI/CD 관련     | ci/add-deploy-pipeline |

### 커밋 컨벤션

| 타입     | 설명             |
| -------- | ---------------- |
| feat     | 새 기능          |
| fix      | 버그 수정        |
| chore    | 설정, 의존성     |
| refactor | 리팩토링         |
| ci       | CI/CD 변경       |
| docs     | 문서 수정        |
| test     | 테스트 추가/수정 |
