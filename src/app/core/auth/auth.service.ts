import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthSession, User } from '../models/domain.model';

const STORAGE_KEY = 'sp.auth';

/** Holds the current session, persists it, and exposes role-aware signals. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  private readonly session = signal<AuthSession | null>(this.restore());

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly token = computed<string | null>(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.user.role === 'admin');

  login(email: string, password: string): Observable<AuthSession> {
    return this.api
      .post<AuthSession>('/auth/login', { email, password })
      .pipe(tap((session) => this.persist(session)));
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(session: AuthSession): void {
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private restore(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }
}
