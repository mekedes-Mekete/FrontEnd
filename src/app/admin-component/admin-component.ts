import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth';
import { InitialsPipe } from '../shared/initials.pipe';

/**
 * Admin layout ("shell"): sidebar + top header + <router-outlet>.
 * The page content (dashboard, doctors, patients, accounts) is rendered by child routes.
 */
@Component({
  selector: 'app-admin-component',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, InitialsPipe],
  templateUrl: './admin-component.html',
  styleUrl: './admin-component.css',
})
export class AdminComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Falls back to the demo admin because the mock AuthService forgets the user on page refresh.
  readonly adminName = this.auth.currentUser?.fullName ?? 'Sarah Mitchell';

  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
