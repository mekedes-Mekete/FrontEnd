import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountRow } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { InitialsPipe } from '../../shared/initials.pipe';
import { MaskEmailPipe } from '../../shared/mask-email.pipe';

/** UC4: list of patients. Emails are masked (NFR2). */
@Component({
  selector: 'app-patient-list-component',
  standalone: true,
  imports: [DatePipe, RouterLink, InitialsPipe, MaskEmailPipe],
  templateUrl: './patient-list-component.html',
  styleUrls: ['../../shared/admin-page.css'],
})
export class PatientListComponent {
  private readonly adminData = inject(AdminDataService);

  readonly patients = signal<AccountRow[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.patients();
    return this.patients().filter(
      (p) => p.fullName.toLowerCase().includes(q) || (p.primaryDoctorName ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.adminData.getPatients().subscribe((list) => {
      this.patients.set(list);
      this.loading.set(false);
    });
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
