import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ServiceNote, UserAccount } from '../models/clinic.models';
import { AuthService } from '../services/auth';
import { MOCK_NOTES, MOCK_USERS } from '../services/mock-clinic-data';
import { InitialsPipe } from '../shared/initials.pipe';

// ---------------------------------------------------------------------------
// MOCK MODE. Runs on MOCK_USERS / MOCK_NOTES. Replace with the backend calls
// (profile + "my services") once they exist. The server must only return the
// logged-in patient's own notes (US16, US17).
// ---------------------------------------------------------------------------

/** MOCK: the logged-in patient. Replace with the id from the JWT / AuthService. */
const CURRENT_PATIENT_ID = 201;

/** NFR3: shown next to every summary. */
const SUMMARY_DISCLAIMER = "For clarity only. Follow your clinician's instructions.";

/** A service (note) with the doctor's name resolved. */
interface ServiceView extends ServiceNote {
  doctorName: string;
}

@Component({
  selector: 'app-patient-component',
  standalone: true,
  imports: [CommonModule, InitialsPipe],
  templateUrl: './patient-component.html',
  styleUrl: './patient-component.css',
})
export class PatientComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly disclaimer = SUMMARY_DISCLAIMER;

  // ---- US16: profile ------------------------------------------------------
  readonly patient: UserAccount = MOCK_USERS.find(u => u.id === CURRENT_PATIENT_ID)!;
  readonly primaryDoctorName: string =
    MOCK_USERS.find(u => u.id === this.patient.primaryDoctorId)?.fullName ?? 'Not assigned';
  /** Name in the top bar. Falls back to the mock patient if nobody is signed in (page refresh, demo). */
  readonly displayName: string = this.auth.currentUser?.fullName ?? this.patient.fullName;

  // ---- US16: only this patient's own services, newest first ---------------
  private readonly allNotes = signal<ServiceNote[]>(MOCK_NOTES.map(n => ({ ...n })));

  readonly serviceRows = computed<ServiceView[]>(() =>
    this.allNotes()
      .filter(n => n.patientId === CURRENT_PATIENT_ID)
      .sort((a, b) => b.dateOfVisit.localeCompare(a.dateOfVisit) || b.createdAt.localeCompare(a.createdAt))
      .map(n => ({
        ...n,
        doctorName: MOCK_USERS.find(u => u.id === n.doctorId)?.fullName ?? 'Unknown',
      }))
  );

  // ---- Sign out (US2) -----------------------------------------------------
  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // ---- US17: open a service ----------------------------------------------
  /** The first service starts open, like the previous design. */
  readonly expandedIds = signal<ReadonlySet<number>>(new Set<number>(this.firstServiceId()));

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleDetails(row: ServiceView): void {
    this.expandedIds.update(ids => {
      const next = new Set(ids);
      if (!next.delete(row.id)) next.add(row.id);
      return next;
    });
  }

  private firstServiceId(): number[] {
    const first = this.serviceRows()[0];
    return first ? [first.id] : [];
  }
}
