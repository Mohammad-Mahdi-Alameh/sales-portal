import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly navOpen = signal(false);

  protected readonly links: NavLink[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '▤' },
    { path: '/organizations', label: 'Organizations', icon: '⌂' },
    { path: '/branches', label: 'Branches', icon: '⎇' },
    { path: '/venues', label: 'Venues', icon: '◈' },
    { path: '/clients', label: 'Clients', icon: '☺' },
    { path: '/setup', label: 'Setup', icon: '✚' },
  ];

  protected toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected signOut(): void {
    this.auth.logout();
    location.assign('/login');
  }
}
