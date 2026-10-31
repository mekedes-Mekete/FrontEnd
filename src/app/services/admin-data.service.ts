import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  AccountInput,
  AccountRow,
  DoctorProfile,
  NoteChanges,
  NoteRow,
  PatientDetail,
  ServiceNote,
  UserAccount,
} from '../models/clinic.models';
import { MOCK_NOTES, MOCK_USERS } from './mock-clinic-data';

const FAKE_LATENCY_MS = 250;
const RECENT_NOTES_LIMIT = 10;

/**
 * Data access for the admin screens (UC3–UC7).
 *
 * TEMPORARY: this works on in-memory mock data, so changes are lost on page refresh.
 * When the backend is ready, replace each method body with an HttpClient call, e.g.
 *   getDoctors() { return this.http.get<UserAccount[]>(`${apiUrl}/admin/doctors`); }
 * Keep the method names and return types, and no component has to change.
 */
@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private users: UserAccount[] = structuredClone(MOCK_USERS);
  private notes: ServiceNote[] = structuredClone(MOCK_NOTES);
  private nextUserId = 1000;

  // ---------- UC3: doctors ----------

  getDoctors(): Observable<UserAccount[]> {
    return this.respond(this.users.filter((u) => u.role === 'ROLE_DOCTOR'));
  }

  getDoctorProfile(id: number): Observable<DoctorProfile> {
    const doctor = this.users.find((u) => u.id === id && u.role === 'ROLE_DOCTOR');
    if (!doctor) return this.fail('Doctor not found.');
    return this.respond({
      doctor,
      assignedPatients: this.patientsOf(id),
      recentNotes: this.notes
        .filter((n) => n.doctorId === id)
        .map((n) => this.toRow(n))
        .sort(byVisitDesc)
        .slice(0, RECENT_NOTES_LIMIT), // contract: capped at 10
    });
  }

  /** Active doctors only, for the "primary doctor" dropdown (UC7). */
  getActiveDoctors(): Observable<UserAccount[]> {
    return this.respond(this.users.filter((u) => u.role === 'ROLE_DOCTOR' && u.active));
  }

  // ---------- UC4: patients ----------

  getPatients(): Observable<AccountRow[]> {
    return this.respond(this.users.filter((u) => u.role === 'ROLE_PATIENT').map((p) => this.toAccountRow(p)));
  }

  getPatientDetail(id: number): Observable<PatientDetail> {
    const patient = this.users.find((u) => u.id === id && u.role === 'ROLE_PATIENT');
    if (!patient) return this.fail('Patient not found.');
    return this.respond({
      patient,
      primaryDoctorName: this.nameOf(patient.primaryDoctorId),
      notes: this.notes.filter((n) => n.patientId === id).map((n) => this.toRow(n)).sort(byVisitDesc),
    });
  }

  // ---------- UC5: edit a note ----------

  updateNote(id: number, changes: NoteChanges): Observable<NoteRow> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return this.fail('This note no longer exists.');
    note.title = changes.title.trim();
    note.originalNote = changes.originalNote.trim();
    note.summary = changes.summary.trim();
    note.lastUpdated = new Date().toISOString(); // post-condition: "last updated" changes
    return this.respond(this.toRow(note));
  }

  // ---------- UC6: delete a note ----------

  deleteNote(id: number): Observable<void> {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length === before) return this.fail('This note no longer exists.');
    return this.respond(undefined);
  }

  // ---------- UC7: accounts and roles ----------

  getAccounts(): Observable<AccountRow[]> {
    return this.respond(this.users.map((u) => this.toAccountRow(u)));
  }

  createAccount(input: AccountInput): Observable<UserAccount> {
    if (this.emailTaken(input.email)) return this.fail('An account with this email already exists.');
    const account: UserAccount = {
      id: this.nextUserId++,
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      ...this.roleFields(input),
    };
    this.users.push(account);
    return this.respond(account);
  }

  updateAccount(id: number, input: AccountInput): Observable<UserAccount> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return this.fail('Account not found.');
    const current = this.users[index];
    if (this.emailTaken(input.email, id)) return this.fail('An account with this email already exists.');
    if (current.role === 'ROLE_DOCTOR' && input.role !== 'ROLE_DOCTOR' && this.patientsOf(id).length > 0) {
      return this.fail("Reassign this doctor's patients before changing the role.");
    }
    // Replace the whole object so fields from the old role are dropped.
    const updated: UserAccount = { id, active: current.active, createdAt: current.createdAt, ...this.roleFields(input) };
    this.users[index] = updated;
    return this.respond(updated);
  }

  setAccountActive(id: number, active: boolean): Observable<UserAccount> {
    const account = this.users.find((u) => u.id === id);
    if (!account) return this.fail('Account not found.');
    if (!active && account.role === 'ROLE_ADMIN') {
      const activeAdmins = this.users.filter((u) => u.role === 'ROLE_ADMIN' && u.active).length;
      if (activeAdmins <= 1) return this.fail('You cannot deactivate the last active admin.');
    }
    account.active = active;
    return this.respond(account);
  }

  // ---------- helpers ----------

  private patientsOf(doctorId: number): UserAccount[] {
    return this.users.filter((u) => u.role === 'ROLE_PATIENT' && u.primaryDoctorId === doctorId);
  }

  private nameOf(userId: number | null | undefined): string | null {
    if (userId == null) return null;
    return this.users.find((u) => u.id === userId)?.fullName ?? null;
  }

  private toRow(note: ServiceNote): NoteRow {
    return {
      ...note,
      patientName: this.nameOf(note.patientId) ?? 'Unknown patient',
      doctorName: this.nameOf(note.doctorId) ?? 'Unknown doctor',
    };
  }

  private toAccountRow(user: UserAccount): AccountRow {
    return { ...user, primaryDoctorName: this.nameOf(user.primaryDoctorId) };
  }

  private emailTaken(email: string, ignoreId?: number): boolean {
    const normalized = email.trim().toLowerCase();
    return this.users.some((u) => u.id !== ignoreId && u.email.toLowerCase() === normalized);
  }

  /** Keeps only the fields that belong to the chosen role. */
  private roleFields(input: AccountInput): Omit<UserAccount, 'id' | 'active' | 'createdAt'> {
    const base = { fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), role: input.role };
    if (input.role === 'ROLE_DOCTOR') {
      return { ...base, specialty: input.specialty?.trim() ?? '' };
    }
    if (input.role === 'ROLE_PATIENT') {
      return {
        ...base,
        dateOfBirth: input.dateOfBirth ?? '',
        allergies: input.allergies?.trim() || 'None known',
        primaryDoctorId: input.primaryDoctorId ?? null,
      };
    }
    // temporaryPassword is ignored by the mock; the backend will hash and store it.
    return base;
  }

  /** Returns a copy (so screens can't mutate the "database") after a short fake delay. */
  private respond<T>(value: T): Observable<T> {
    return of(structuredClone(value)).pipe(delay(FAKE_LATENCY_MS));
  }

  private fail(message: string): Observable<never> {
    return throwError(() => new Error(message));
  }
}

function byVisitDesc(a: ServiceNote, b: ServiceNote): number {
  return b.dateOfVisit.localeCompare(a.dateOfVisit);
}
