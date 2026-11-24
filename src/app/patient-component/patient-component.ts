import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccountRow, NoteRow } from '../models/clinic.models';
import { AuthService } from '../services/auth';
import { ApiError } from '../services/api-error';
import { PatientDataService } from '../services/patient-data.service';
import { InitialsPipe } from '../shared/initials.pipe';

/** NFR3: shown next to every summary. */
const SUMMARY_DISCLAIMER = "For clarity only. Follow your clinician's instructions.";

/**
 * Patient screen (US16, US17), connected to GET /api/patient/dashboard. The server decides who the
 * patient is from the JWT and returns only that patient's own profile and services (NFR1).
 */
@Component({
  selector: 'app-patient-component',
  standalone: true,
  imports: [CommonModule, InitialsPipe],
  templateUrl: './patient-component.html',
  styleUrl: './patient-component.css',
})
export class PatientComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(PatientDataService);

  readonly disclaimer = SUMMARY_DISCLAIMER;

  // ---- US16: profile and services from the server -------------------------
  readonly patient = signal<AccountRow | null>(null);
  private readonly allNotes = signal<NoteRow[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** Name in the top bar: the profile once loaded, the login answer before that. */
  readonly displayName = computed(() => this.patient()?.fullName ?? this.auth.currentUser?.fullName ?? '');
  readonly primaryDoctorName = computed(() => this.patient()?.primaryDoctorName ?? 'Not assigned');

  /** Services, newest first. */
  readonly serviceRows = computed<NoteRow[]>(() =>
    [...this.allNotes()].sort(
      (a, b) => b.dateOfVisit.localeCompare(a.dateOfVisit) || b.createdAt.localeCompare(a.createdAt)
    )
  );

  // ---- US17: open a service ----------------------------------------------
  readonly expandedIds = signal<ReadonlySet<number>>(new Set<number>());

  ngOnInit(): void {
    this.reload();
  }

  /** GET /api/patient/dashboard */
  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.load().subscribe({
      next: data => {
        this.patient.set(data.profile);
        this.allNotes.set(data.notes);
        // The first (newest) service starts open, like the design.
        const first = this.serviceRows()[0];
        this.expandedIds.set(new Set<number>(first ? [first.id] : []));
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        if (err.status === 401) { // token expired or revoked
          this.auth.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.loadError.set(err.message);
        this.loading.set(false);
      },
    });
  }

  // ---- Sign out (US2) -----------------------------------------------------
  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleDetails(row: NoteRow): void {
    this.expandedIds.update(ids => {
      const next = new Set(ids);
      if (!next.delete(row.id)) next.add(row.id);
      return next;
    });
  }
}
