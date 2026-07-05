import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./features/organizations/organizations-list.component').then(
            (m) => m.OrganizationsListComponent,
          ),
      },
      {
        path: 'organizations/new',
        loadComponent: () =>
          import('./features/organizations/organization-create.component').then(
            (m) => m.OrganizationCreateComponent,
          ),
      },
      {
        path: 'organizations/:id',
        loadComponent: () =>
          import('./features/organizations/organization-detail.component').then(
            (m) => m.OrganizationDetailComponent,
          ),
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/branches/branches-list.component').then(
            (m) => m.BranchesListComponent,
          ),
      },
      {
        path: 'branches/new',
        loadComponent: () =>
          import('./features/branches/branch-form.component').then((m) => m.BranchFormComponent),
      },
      {
        path: 'branches/:id/edit',
        loadComponent: () =>
          import('./features/branches/branch-form.component').then((m) => m.BranchFormComponent),
      },
      {
        path: 'venues',
        loadComponent: () =>
          import('./features/venues/venues-list.component').then((m) => m.VenuesListComponent),
      },
      {
        path: 'venues/new',
        loadComponent: () =>
          import('./features/venues/venue-create.component').then((m) => m.VenueCreateComponent),
      },
      {
        path: 'venues/:id',
        loadComponent: () =>
          import('./features/venues/venue-detail.component').then((m) => m.VenueDetailComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients-list.component').then((m) => m.ClientsListComponent),
      },
      {
        path: 'clients/new',
        loadComponent: () =>
          import('./features/clients/client-form.component').then((m) => m.ClientFormComponent),
      },
      {
        path: 'clients/:id/edit',
        loadComponent: () =>
          import('./features/clients/client-form.component').then((m) => m.ClientFormComponent),
      },
      {
        path: 'setup',
        loadComponent: () =>
          import('./features/setup-wizard/setup-wizard.component').then(
            (m) => m.SetupWizardComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
