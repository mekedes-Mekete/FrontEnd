import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountRow, UserAccount } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { InitialsPipe } from '../../shared/initials.pipe';
import { MaskEmailPipe } from '../../shared/mask-email.pipe';

/** Admin home: preview cards for doctors (UC3) and patients (UC4). This is the old AdminComponent body. */
@Component({
  selector: 'app-admin-dashboard-component',
  standalone: true,
  imports: [RouterLink, InitialsPipe, MaskEmailPipe],
  templateUrl: './admin-dashboard-component.html',
  styleUrls: ['../../shared/admin-page.css', './admin-dashboard-component.css'],
})
export class AdminDashboardComponent {
  private readonly adminData = inject(AdminDataService);

  /** How many rows each preview card shows. */
  readonly previewSize = 3;

  readonly doctors = signal<UserAccount[]>([]);
  readonly patients = signal<AccountRow[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.adminData.getDoctors().subscribe((list) => this.doctors.set(list));
    this.adminData.getPatients().subscribe((list) => {
      this.patients.set(list);
      this.loading.set(false);
    });
  }
}
