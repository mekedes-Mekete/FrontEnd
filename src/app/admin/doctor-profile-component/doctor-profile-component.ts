import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoctorProfile } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { InitialsPipe } from '../../shared/initials.pipe';
import { NotesTableComponent } from '../notes-table-component/notes-table-component';

/** UC3: one doctor's profile, assigned patients and recent services. */
@Component({
  selector: 'app-doctor-profile-component',
  standalone: true,
  imports: [DatePipe, RouterLink, InitialsPipe, NotesTableComponent],
  templateUrl: './doctor-profile-component.html',
  styleUrls: ['../../shared/admin-page.css'],
})
export class DoctorProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminData = inject(AdminDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<DoctorProfile | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  private doctorId = 0;

  constructor() {
    // Re-load when the :id in the URL changes (e.g. clicking from one profile to another).
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.doctorId = Number(params.get('id'));
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.adminData.getDoctorProfile(this.doctorId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.profile.set(null);
        this.errorMessage.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
