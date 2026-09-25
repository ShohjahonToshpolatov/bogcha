import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';
import { Role } from './core/auth/auth.models';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
      { path: 'otp', loadComponent: () => import('./features/auth/otp/otp.component').then((m) => m.OtpComponent) },
    ],
  },

  {
    path: 'parent',
    canActivate: [authGuard, roleGuard([Role.PARENT])],
    loadComponent: () => import('./core/layout/parent-shell/parent-shell.component').then((m) => m.ParentShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./features/parent/home/parent-home.component').then((m) => m.ParentHomeComponent) },
      { path: 'feed', loadComponent: () => import('./features/parent/feed/parent-feed.component').then((m) => m.ParentFeedComponent) },
      { path: 'camera', loadComponent: () => import('./features/parent/camera/parent-camera.component').then((m) => m.ParentCameraComponent) },
      { path: 'menu', loadComponent: () => import('./features/parent/menu/parent-menu.component').then((m) => m.ParentMenuComponent) },
      {
        path: 'messages',
        loadComponent: () =>
          import('./shared/components/messages/messages.component').then((m) => m.MessagesComponent),
        data: { icon: 'chat', titleKey: 'nav.messages' },
      },
    ],
  },

  {
    path: 'teacher',
    canActivate: [authGuard, roleGuard([Role.TEACHER, Role.NURSE, Role.COOK])],
    loadComponent: () => import('./core/layout/teacher-shell/teacher-shell.component').then((m) => m.TeacherShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      { path: 'today', loadComponent: () => import('./features/teacher/today/teacher-today.component').then((m) => m.TeacherTodayComponent) },
      { path: 'children', loadComponent: () => import('./features/teacher/children/teacher-children.component').then((m) => m.TeacherChildrenComponent) },
      { path: 'feed', loadComponent: () => import('./features/teacher/feed-create/teacher-feed-create.component').then((m) => m.TeacherFeedCreateComponent) },
      {
        path: 'messages',
        loadComponent: () =>
          import('./shared/components/messages/messages.component').then((m) => m.MessagesComponent),
        data: { icon: 'chat', titleKey: 'nav.messages' },
      },
      {
        path: 'me',
        loadComponent: () => import('./features/teacher/me/teacher-me.component').then((m) => m.TeacherMeComponent),
      },
    ],
  },

  {
    path: 'owner',
    canActivate: [authGuard, roleGuard([Role.OWNER, Role.ADMIN])],
    loadComponent: () => import('./core/layout/owner-shell/owner-shell.component').then((m) => m.OwnerShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/owner/dashboard/owner-dashboard.component').then((m) => m.OwnerDashboardComponent) },
      { path: 'children', loadComponent: () => import('./features/owner/children/owner-children.component').then((m) => m.OwnerChildrenComponent) },
      { path: 'groups', loadComponent: () => import('./features/owner/groups/owner-groups.component').then((m) => m.OwnerGroupsComponent) },
      { path: 'attendance', loadComponent: () => import('./features/owner/attendance/owner-attendance.component').then((m) => m.OwnerAttendanceComponent) },
      { path: 'staff', loadComponent: () => import('./features/owner/staff/owner-staff.component').then((m) => m.OwnerStaffComponent) },
      { path: 'finance', loadComponent: () => import('./features/owner/finance/owner-finance.component').then((m) => m.OwnerFinanceComponent) },
      { path: 'cameras', loadComponent: () => import('./features/owner/cameras/owner-cameras.component').then((m) => m.OwnerCamerasComponent) },
      { path: 'announcements', loadComponent: () => import('./features/owner/announcements/owner-announcements.component').then((m) => m.OwnerAnnouncementsComponent) },
      { path: 'menu', loadComponent: () => import('./features/owner/menu/owner-menu.component').then((m) => m.OwnerMenuComponent) },
      { path: 'waitlist', loadComponent: () => import('./features/owner/waitlist/owner-waitlist.component').then((m) => m.OwnerWaitlistComponent) },
      { path: 'reports', loadComponent: () => import('./features/owner/reports/owner-reports.component').then((m) => m.OwnerReportsComponent) },
      { path: 'settings', loadComponent: () => import('./features/owner/settings/owner-settings.component').then((m) => m.OwnerSettingsComponent) },
    ],
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])],
    loadComponent: () => import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },

  { path: '**', redirectTo: 'auth/login' },
];
