import {
  applyDecorators,
  HttpCode,
  HttpStatus,
  Type,
  UseGuards,
} from '@nestjs/common';
import { DomainError } from '@common/constants/errors/domain.errors';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

export interface ApiResponseSpecOptions {
  summary: string;
  description?: string;
  auth?: boolean;
  status?: HttpStatus;
  type?: Type<any>;
  isArray?: boolean;
  errors?: DomainError[];
}

/**
 * 통합 Api response 명세 데코레이터
 */
export function ApiResponseSpec(options: ApiResponseSpecOptions) {
  const decorators = [];

  // 1. HTTP 상태 코드 설정 (명시된 경우에만)
  // POST는 기본 201, GET/PUT/PATCH/DELETE는 기본 200
  if (options.status !== undefined) {
    decorators.push(HttpCode(options.status));
  }

  // 2. API 기본 정보
  decorators.push(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  );

  // 3. 인증 필요 시
  if (options.auth) {
    decorators.push(
      UseGuards(JwtAuthGuard), // 가드 적용
      ApiBearerAuth(), // Swagger에 인증 표시
      ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: '인증 실패',
        schema: {
          example: {
            timestamp: '2024-01-12T00:00:00.000Z',
            path: '/auth/profile',
            error: {
              code: 'AUTH_004',
              message: '유효하지 않은 토큰입니다',
            },
          },
        },
      }),
    );
  }

  // 4. 성공 응답
  decorators.push(...createSuccessResponse(options));

  // 5. 에러 응답 (도메인 에러만)
  if (options.errors && options.errors.length > 0) {
    decorators.push(...createErrorResponses(options.errors));
  }

  return applyDecorators(...decorators);
}

/**
 * 성공 응답 생성
 */
function createSuccessResponse(options: ApiResponseSpecOptions) {
  const statusCode = options.status ?? HttpStatus.OK;
  const decorators = [];

  if (options.type) {
    decorators.push(ApiExtraModels(options.type));

    if (options.isArray) {
      // 배열 응답
      decorators.push(
        ApiResponse({
          status: statusCode,
          description:
            statusCode === HttpStatus.CREATED ? '생성 성공' : '조회 성공',
          schema: {
            type: 'array',
            items: { $ref: getSchemaPath(options.type) },
          },
        }),
      );
    } else {
      // 단일 객체 응답
      decorators.push(
        ApiResponse({
          status: statusCode,
          description:
            statusCode === HttpStatus.CREATED ? '생성 성공' : '조회 성공',
          schema: { $ref: getSchemaPath(options.type) },
        }),
      );
    }
  } else {
    // 응답 본문 없음 (204 등)
    decorators.push(
      ApiResponse({
        status: statusCode,
        description: '성공',
      }),
    );
  }

  return decorators;
}

/**
 * 에러 응답 생성 (도메인 에러 기반)
 */
function createErrorResponses(errors: DomainError[]) {
  return errors.map((error) =>
    ApiResponse({
      status: error.status,
      description: error.message,
      schema: {
        example: {
          timestamp: '2024-01-12T00:00:00.000Z',
          path: '/example',
          error: {
            code: error.code,
            message: error.message,
          },
        },
      },
    }),
  );
}
