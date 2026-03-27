# R-080 BullMQ Worker motionId NaN 검증 추가

## 작업 요약

- **날짜**: 2026-03-27
- **수정 파일**:
  - `src/modules/motion/queue/motion.worker.ts` — NaN 검증 + early return
  - `src/common/constants/errors/job.errors.ts` — `SYS_INVALID_JOB_DATA` 추가
  - `test/motion/motion.worker.spec.ts` — 검증 테스트 6개 추가
- `Number(job.data.motionId)` 결과가 NaN 또는 0 이하이면 DB 호출 없이 즉시 잡 실패 처리

## 변경 코드

**Before**

```typescript
const motionId = Number(job.data.motionId);
this.logger.log({ event: 'job_started', motionId, ... });
try {
  const motion = await this.motionService.getMotionForWork(motionId);
```

**After**

```typescript
const motionId = Number(job.data.motionId);
if (isNaN(motionId) || motionId <= 0) {
  this.logger.error({ event: 'invalid_job_data', rawMotionId: job.data.motionId, jobId: job.id });
  job.discard();
  throw new Error(JOB_ERRORS.SYS_INVALID_JOB_DATA.message);
}
this.logger.log({ event: 'job_started', motionId, ... });
try {
  const motion = await this.motionService.getMotionForWork(motionId);
```

## 최종 후보 방법들

**방법 A: early throw (try 외부)** ← 선택

- 장점: DB 호출 전에 차단, 불필요한 재시도 방지, 기존 handleJobError 흐름과 간섭 없음
- 단점: motion status를 FAILED로 업데이트할 수 없음 (NaN으로 DB 쿼리 불가)

**방법 B: try 내부에서 throw → handleJobError 경유**

- 장점: 기존 에러 핸들링 흐름 통일
- 단점: handleJobError에서 updateStatusWithError(NaN, ...) 호출 → DB 오류 추가 발생

**방법 C: DTO 레벨 class-validator 검증**

- 장점: 구조적 검증
- 단점: BullMQ job data는 런타임 타입, 별도 변환 레이어 필요 — 과도한 설계

## 최종 선택과 이유

방법 A — NaN이면 DB를 아예 호출할 수 없으므로 handleJobError 경유가 의미 없음. try 외부에서 `job.discard()`로 재시도 차단 후 즉시 실패가 가장 명확한 처리.

## 트레이드오프

motion DB status가 FAILED로 업데이트되지 않음 — motionId 자체가 무효이므로 어떤 레코드를 FAILED로 바꿔야 하는지 알 수 없어 불가피한 한계.

## 대안이 더 나은 상황

방법 B가 더 나은 상황: 잡 데이터에 motionId 외 다른 필드도 검증이 필요해질 경우 (검증 항목이 늘어날 때는 handleJobError 경유로 통일 고려).

## 선택한 코드의 변수

- `motionId <= 0` 조건이 포함되어 있어 ID 체계가 0-based로 바뀌면 수정 필요 (현재 MySQL auto-increment는 1-based).

## 테스트 이력

전체 통과 (수정 없음) — 125개 통과
