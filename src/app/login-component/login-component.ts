import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css'
})
export class LoginComponent {
  credentials = {
    username: '',
    password: ''
  };

  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    // Reset previous error message before each attempt
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (user) => {
        // Route according to the returned role from backend/JWT payload
        switch (user.role) {
          case 'ROLE_ADMIN':
            this.router.navigate(['/admin']);
            break;
          case 'ROLE_DOCTOR':
            this.router.navigate(['/doctor']);
            break;
          case 'ROLE_PATIENT':
            this.router.navigate(['/patient']);
            break;
          default:
            this.errorMessage = 'Unauthorized role or unknown access level.';
            break;
        }
      },
      error: (err) => {
        // Fallback message if server doesn't return a specific message
        this.errorMessage = err?.error?.message || 'Invalid username or password.';
      }
    });
  }
}