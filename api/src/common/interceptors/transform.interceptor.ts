import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Barcha muvaffaqiyatli javoblarni yagona formatga o'raydi:
 * { success: true, data: {...}, meta: {...} }
 * Agar controller allaqachon { data, meta } shaklida qaytarsa, meta ajratib olinadi.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          const r = result as { data: T; meta: Record<string, unknown> };
          return { success: true, data: r.data, meta: r.meta };
        }
        return { success: true, data: result };
      }),
    );
  }
}
