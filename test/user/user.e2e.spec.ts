import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'e2e-test@example.com',
          password: 'password123',
          name: 'E2E Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('e2e-test@example.com');
          expect(res.body).not.toHaveProperty('password');
          createdUserId = res.body.id;
        });
    });

    it('should return 409 if email already exists', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'e2e-test@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('should return 400 if email is invalid', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 if password is too short', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'short@example.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a user by id', () => {
      return request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdUserId);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/users/invalid-uuid')
        .expect(400);
    });

    it('should return 404 if user not found', () => {
      return request(app.getHttpServer())
        .get('/users/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });
  });

  describe('/users/:id (PUT)', () => {
    it('should update user', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .send({ name: 'Updated E2E Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated E2E Name');
        });
    });

    it('should return 404 if user not found', () => {
      return request(app.getHttpServer())
        .put('/users/123e4567-e89b-12d3-a456-426614174000')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('User deleted successfully');
        });
    });

    it('should return 404 if user not found', () => {
      return request(app.getHttpServer())
        .delete('/users/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });
  });
});
