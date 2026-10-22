import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

// User structure
export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  role: string; // "ROLE_ADMIN", "ROLE_DOCTOR", or "ROLE_PATIENT"
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Store logged-in user in memory
  currentUser: UserProfile | null = null;

  login(credentials: { username: string; password: string }): Observable<UserProfile> {
    let mockUser: UserProfile;

    // Check username to return different roles
    if (credentials.username.includes('admin')) {
      mockUser = { id: 100, username: credentials.username, fullName: 'Sarah Mitchell', role: 'ROLE_ADMIN' };
    } else if (credentials.username.includes('doctor')) {
      mockUser = { id: 101, username: credentials.username, fullName: 'Dr. James Harrington', role: 'ROLE_DOCTOR' };
    } else if (credentials.username.includes('patient')) {
      mockUser = { id: 102, username: credentials.username, fullName: 'Thomas Brennan', role: 'ROLE_PATIENT' };
    } else {
      return throwError(() => new Error('Invalid credentials'));
    }

    // Save user in memory
    this.currentUser = mockUser;

    // Simulate a brief delay like a real API call
    return of(mockUser).pipe(delay(300));
  }

  logout() {
    this.currentUser = null;
  }
}