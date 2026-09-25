import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

/** Har bir so'rovga Bearer tokenni biriktiradi; 401 kelsa bitta marta refresh qilib qayta yuboradi. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/otp') || req.url.includes('/auth/refresh');
  const token = auth.accessToken;
  const authedReq = token && !isAuthEndpoint ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshedToken$.next(null);

        return auth.refreshTokens().pipe(
          switchMap((res) => {
            isRefreshing = false;
            refreshedToken$.next(res.data.accessToken);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.data.accessToken}` } }));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            auth.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return refreshedToken$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((newToken) => next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))),
      );
    }),
  );
};
