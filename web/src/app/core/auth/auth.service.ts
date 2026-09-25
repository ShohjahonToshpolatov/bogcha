import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../api/api-response.model';
import { AuthResponse, CurrentUser, Role, TokenPair } from './auth.models';

const ACCESS_TOKEN_KEY = 'bogcha_access_token';
const REFRESH_TOKEN_KEY = 'bogcha_refresh_token';
const CURRENT_USER_KEY = 'bogcha_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<CurrentUser | null>(this.readStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed(() => this.currentUserSignal()?.role ?? null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshTokenValue(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  loginWithPassword(phone: string, password: string): Observable<ApiSuccess<AuthResponse>> {
    return this.http.post<ApiSuccess<AuthResponse>>(`${environment.apiUrl}/auth/login`, { phone, password }).pipe(
      tap((res) => this.persistSession(res.data)),
      switchMap((res) => this.enrichWithFullProfile(res)),
    );
  }

  requestOtp(phone: string): Observable<ApiSuccess<{ sent: boolean }>> {
    return this.http.post<ApiSuccess<{ sent: boolean }>>(`${environment.apiUrl}/auth/otp/request`, { phone });
  }

  verifyOtp(phone: string, code: string): Observable<ApiSuccess<AuthResponse>> {
    return this.http.post<ApiSuccess<AuthResponse>>(`${environment.apiUrl}/auth/otp/verify`, { phone, code }).pipe(
      tap((res) => this.persistSession(res.data)),
      switchMap((res) => this.enrichWithFullProfile(res)),
    );
  }

  /**
   * Login/OTP javobidagi `user` obyekti guardianLinks/groupTeacherLinks kabi
   * bog'lanishlarni o'z ichiga olmaydi (faqat /auth/me shularni qaytaradi).
   * TEACHER/PARENT rol-scoped ekranlar shu maydonlarga tayanadi, shuning uchun
   * yo'naltirishdan oldin to'liq profilni yuklab, currentUser signalini boyitamiz.
   */
  private enrichWithFullProfile(original: ApiSuccess<AuthResponse>): Observable<ApiSuccess<AuthResponse>> {
    return this.fetchMe().pipe(map((me) => ({ ...original, data: { ...original.data, user: me.data } })));
  }

  refreshTokens(): Observable<ApiSuccess<TokenPair>> {
    return this.http
      .post<ApiSuccess<TokenPair>>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.refreshTokenValue })
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
        }),
      );
  }

  fetchMe(): Observable<ApiSuccess<CurrentUser>> {
    return this.http
      .get<ApiSuccess<CurrentUser>>(`${environment.apiUrl}/auth/me`)
      .pipe(tap((res) => this.setCurrentUser(res.data)));
  }

  logout(): void {
    const refreshToken = this.refreshTokenValue;
    const finish = () => {
      this.clearSession();
      this.router.navigateByUrl('/auth/login');
    };

    if (!refreshToken) {
      finish();
      return;
    }
    // Access token hali localStorage'da turganida so'rovni yuboramiz —
    // aks holda interceptor Authorization sarlavhasisiz 401 oladi va bekor qilinmaydi.
    this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
      next: finish,
      error: finish,
    });
  }

  /** Rolga qarab tegishli ilova qobig'iga yo'naltiradi (login/OTP muvaffaqiyatidan so'ng). */
  redirectByRole(role: Role): void {
    const target = this.homeRouteForRole(role);
    this.router.navigateByUrl(target);
  }

  homeRouteForRole(role: Role): string {
    switch (role) {
      case Role.PARENT:
        return '/parent';
      case Role.TEACHER:
      case Role.NURSE:
      case Role.COOK:
        return '/teacher';
      case Role.OWNER:
      case Role.ADMIN:
        return '/owner';
      case Role.SUPER_ADMIN:
        return '/admin';
      default:
        return '/auth/login';
    }
  }

  private persistSession(auth: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    this.setCurrentUser(auth.user);
  }

  private setCurrentUser(user: CurrentUser): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    this.currentUserSignal.set(null);
  }

  private readStoredUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}
