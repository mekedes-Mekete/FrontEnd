import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, finalize, map, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface UserProfile {
  id: number;
  /** Kept for compatibility with existing UI code that refers to username. */
  username: string;
  email: string;
  fullName: string;
  role: string;
}

interface LoginResponse {
  token: string;
  role: string;
  userId: number;
  fullName: string;
  email: string;
}

const TOKEN_KEY = 'mediscribe.auth.token';
const USER_KEY = 'mediscribe.auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authUrl = `${API_BASE_URL}/api/auth`;
  currentUser: UserProfile | null = this.restoreUser();

  constructor(private readonly http: HttpClient) {}

  login(credentials: { username: string; password: string }): Observable<UserProfile> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, {
      email: credentials.username.trim(),
      password: credentials.password
    }).pipe(
      map((response): { token: string; user: UserProfile } => ({
        token: response.token,
        user: {
          id: response.userId,
          username: response.email,
          email: response.email,
          fullName: response.fullName,
          role: response.role
        }
      })),
      tap(({ token, user }) => {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser = user;
      }),
      map(({ user }) => user)
    );
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  /** Revoke the current backend token and clear this browser session. */
  logout(): void {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return;
    }

    // Capture the token before clearing local state so the logout request can
    // still authenticate even though the browser session is immediately ended.
    this.http.post<void>(`${this.authUrl}/logout`, null, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).pipe(finalize(() => this.clearSession())).subscribe({
      error: () => this.clearSession()
    });
    this.clearSession();
  }

  private clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUser = null;
  }

  private restoreUser(): UserProfile | null {
    try {
      const storedUser = sessionStorage.getItem(USER_KEY);
      return storedUser ? JSON.parse(storedUser) as UserProfile : null;
    } catch {
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }
}
