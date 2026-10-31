import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserAccount } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { InitialsPipe } from '../../shared/initials.pipe';

/** UC3: list of doctors with specialty. Assigned patients are shown on each doctor's profile. */
@Component({
  selector: 'app-doctor-list-component',
  standalone: true,
  imports: [RouterLink, InitialsPipe],
  templateUrl: './doctor-list-component.html',
  styleUrls: ['../../shared/admin-page.css'],
})
export class DoctorListComponent {
  private readonly adminData = inject(AdminDataService);

  readonly doctors = signal<UserAccount[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.doctors();
    return this.doctors().filter(
      (d) => d.fullName.toLowerCase().includes(q) || (d.specialty ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.adminData.getDoctors().subscribe((list) => {
      this.doctors.set(list);
      this.loading.set(false);
    });
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
