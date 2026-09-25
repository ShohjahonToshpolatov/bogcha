import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './auth.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};

/** Berilgan rollardan biriga ega bo'lmagan foydalanuvchini o'z ilova qobig'iga qaytaradi. */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const role = auth.role();
    if (!role) {
      return router.createUrlTree(['/auth/login']);
    }
    if (allowedRoles.includes(role)) {
      return true;
    }
    return router.createUrlTree([auth.homeRouteForRole(role)]);
  };
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree([auth.homeRouteForRole(auth.role()!)]);
};
