import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatientDetail } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { MaskEmailPipe } from '../../shared/mask-email.pipe';
import { NotesTableComponent } from '../notes-table-component/notes-table-component';

/** UC4: one patient's record. The services table also gives the admin Edit (UC5) and Delete (UC6). */
@Component({
  selector: 'app-patient-detail-component',
  standalone: true,
  imports: [DatePipe, RouterLink, MaskEmailPipe, NotesTableComponent],
  templateUrl: './patient-detail-component.html',
  styleUrls: ['../../shared/admin-page.css'],
})
export class PatientDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminData = inject(AdminDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = signal<PatientDetail | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  private patientId = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.patientId = Number(params.get('id'));
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.adminData.getPatientDetail(this.patientId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.detail.set(null);
        this.errorMessage.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
