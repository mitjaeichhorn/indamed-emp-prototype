import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'emp',
    loadComponent: () =>
      import('../screens/emp/emp-screen').then(m => m.EmpScreenComponent),
  },
  {
    path: '',
    redirectTo: 'emp',
    pathMatch: 'full',
  },
];
