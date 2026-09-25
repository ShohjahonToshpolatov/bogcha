import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/db'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) — tizim ishga tushganini tekshiradi', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('ok');
      });
  });

  it('/api/v1/auth/me (GET) — token bo\'lmasa 401 qaytaradi', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });
});
