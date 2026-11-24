import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';
import { Role } from '../models/clinic.models';

const HOME: Record<Role, string> = {
  ROLE_ADMIN: '/admin',
  ROLE_DOCTOR: '/doctor',
  ROLE_PATIENT: '/patient',
};

/**
 * US1.2: a screen opens only for its own role. Not signed in -> login page; signed in with another
 * role -> that role's own home page. The server still refuses other roles' data with 403 (NFR1).
 */
export const roleGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser;

  if (!user || !auth.getToken()) return router.parseUrl('/login');
  if (user.role === role) return true;
  return router.parseUrl(HOME[user.role as Role] ?? '/login');
};
