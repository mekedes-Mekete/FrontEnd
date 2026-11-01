import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import {
  AccountInput,
  AccountRow,
  AdminData,
  DoctorProfile,
  NoteChanges,
  NoteRow,
  PatientDetail,
  ServiceNote,
  UserAccount,
} from '../models/clinic.models';
import { MockAdminBackend } from './mock-admin-backend';

const RECENT_NOTES_LIMIT = 10;

/**
 * Data access for the admin screens (UC3–UC7), following the API contract:
 *
 *   1. GET    /api/admin/data            -> loaded ONCE, kept in memory, every screen is built from it
 *   2. PUT    /api/admin/notes/{id}      -> edit note (UC5)
 *   3. DELETE /api/admin/notes/{id}      -> delete note (UC6)
 *   4. POST   /api/admin/accounts        -> create account (UC7)
 *   5. PUT    /api/admin/accounts/{id}   -> update account, incl. deactivate/reactivate (UC7)
 *
 * Opening a profile or detail page makes no extra call. After a write, only the
 * saved item is swapped in memory. A browser refresh loads again.
 *
 * INTEGRATION: only the 5 methods in the "API calls" section talk to the server.
 * Replace each body with the HttpClient call in its comment, then delete
 * mock-admin-backend.ts and mock-clinic-data.ts. No component changes.
 */
@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly backend = inject(MockAdminBackend); // INTEGRATION: replace with inject(HttpClient)

  private data: AdminData | null = null;
  private loading$: Observable<AdminData> | null = null;

  // ================= API calls (the only server access) =================

  /** 1. GET /api/admin/data  ->  this.http.get<AdminData>(`${apiUrl}/admin/data`) */
  private apiGetData(): Observable<AdminData> {
    return this.backend.getData().pipe(catchError(toError));
  }

  /** 2. PUT /api/admin/notes/{id}  ->  this.http.put<ServiceNote>(`${apiUrl}/admin/notes/${id}`, changes) */
  private apiPutNote(id: number, changes: NoteChanges): Observable<ServiceNote> {
    return this.backend.putNote(id, changes).pipe(catchError(toError));
  }

  /** 3. DELETE /api/admin/notes/{id}  ->  this.http.delete<void>(`${apiUrl}/admin/notes/${id}`) */
  private apiDeleteNote(id: number): Observable<void> {
    return this.backend.deleteNote(id).pipe(catchError(toError));
  }

  /** 4. POST /api/admin/accounts  ->  this.http.post<UserAccount>(`${apiUrl}/admin/accounts`, input) */
  private apiPostAccount(input: AccountInput): Observable<UserAccount> {
    return this.backend.postAccount(input).pipe(catchError(toError));
  }

  /** 5. PUT /api/admin/accounts/{id}  ->  this.http.put<UserAccount>(`${apiUrl}/admin/accounts/${id}`, input) */
  private apiPutAccount(id: number, input: AccountInput): Observable<UserAccount> {
    return this.backend.putAccount(id, input).pipe(catchError(toError));
  }

  // ================= Screens: built from the one load call =================

  // UC3
  getDoctors(): Observable<UserAccount[]> {
    return this.read((d) => d.accounts.filter(isDoctor));
  }

  getDoctorProfile(id: number): Observable<DoctorProfile> {
    return this.load().pipe(
      switchMap((d) => {
        const doctor = d.accounts.find((a) => a.id === id && isDoctor(a));
        if (!doctor) return throwError(() => new Error('Doctor not found.'));
        return of(
          clone({
            doctor,
            assignedPatients: d.accounts.filter((a) => isPatient(a) && a.primaryDoctorId === id),
            recentNotes: d.notes
              .filter((n) => n.doctorId === id)
              .slice(0, RECENT_NOTES_LIMIT)
              .map((n) => toRow(n, d)),
          }),
        );
      }),
    );
  }

  /** Active doctors, for the primary-doctor dropdown (UC7). */
  getActiveDoctors(): Observable<UserAccount[]> {
    return this.read((d) => d.accounts.filter((a) => isDoctor(a) && a.active));
  }

  // UC4
  getPatients(): Observable<AccountRow[]> {
    return this.read((d) => d.accounts.filter(isPatient).map((p) => toAccountRow(p, d)));
  }

  getPatientDetail(id: number): Observable<PatientDetail> {
    return this.load().pipe(
      switchMap((d) => {
        const patient = d.accounts.find((a) => a.id === id && isPatient(a));
        if (!patient) return throwError(() => new Error('Patient not found.'));
        return of(
          clone({
            patient,
            primaryDoctorName: nameOf(patient.primaryDoctorId, d),
            notes: d.notes.filter((n) => n.patientId === id).map((n) => toRow(n, d)),
          }),
        );
      }),
    );
  }

  // UC7
  getAccounts(): Observable<AccountRow[]> {
    return this.read((d) => d.accounts.map((a) => toAccountRow(a, d)));
  }

  // ================= Changes: one call each, then update memory =================

  // UC5
  updateNote(id: number, changes: NoteChanges): Observable<NoteRow> {
    return this.load().pipe(
      switchMap(() => this.apiPutNote(id, changes)),
      map((saved) => {
        const d = this.data!;
        d.notes = d.notes.map((n) => (n.id === id ? saved : n));
        return clone(toRow(saved, d));
      }),
    );
  }

  // UC6
  deleteNote(id: number): Observable<void> {
    return this.apiDeleteNote(id).pipe(
      tap(() => {
        if (this.data) this.data.notes = this.data.notes.filter((n) => n.id !== id);
      }),
    );
  }

  // UC7: create
  createAccount(input: AccountInput): Observable<UserAccount> {
    return this.load().pipe(
      switchMap(() => this.apiPostAccount({ ...input, active: undefined })),
      tap((saved) => this.data!.accounts.push(saved)),
      map(clone),
    );
  }

  // UC7: change details, role or primary doctor (keeps the current active status)
  updateAccount(id: number, input: AccountInput): Observable<UserAccount> {
    return this.load().pipe(
      switchMap((d) => {
        const current = d.accounts.find((a) => a.id === id);
        if (!current) return throwError(() => new Error('Account not found.'));
        return this.saveAccount(id, { ...input, temporaryPassword: null, active: current.active });
      }),
    );
  }

  // UC7: deactivate / reactivate, sent through the same PUT with the account's current fields
  setAccountActive(id: number, active: boolean): Observable<UserAccount> {
    return this.load().pipe(
      switchMap((d) => {
        const a = d.accounts.find((x) => x.id === id);
        if (!a) return throwError(() => new Error('Account not found.'));
        return this.saveAccount(id, {
          fullName: a.fullName,
          email: a.email,
          role: a.role,
          specialty: a.specialty ?? null,
          dateOfBirth: a.dateOfBirth ?? null,
          allergies: a.allergies ?? null,
          primaryDoctorId: a.primaryDoctorId ?? null,
          temporaryPassword: null,
          active,
        });
      }),
    );
  }

  // ================= helpers =================

  private saveAccount(id: number, body: AccountInput): Observable<UserAccount> {
    return this.apiPutAccount(id, body).pipe(
      tap((saved) => {
        const d = this.data!;
        d.accounts = d.accounts.map((a) => (a.id === id ? saved : a));
      }),
      map(clone),
    );
  }

  /** Calls GET /api/admin/data the first time; afterwards answers from memory. */
  private load(): Observable<AdminData> {
    if (this.data) return of(this.data);
    if (!this.loading$) {
      this.loading$ = this.apiGetData().pipe(
        tap((d) => (this.data = d)),
        finalize(() => (this.loading$ = null)),
        shareReplay(1),
      );
    }
    return this.loading$;
  }

  /** Builds a screen's data from memory and hands out a copy, so screens can't change the cache. */
  private read<T>(select: (d: AdminData) => T): Observable<T> {
    return this.load().pipe(map((d) => clone(select(d))));
  }
}

// ---------- pure helpers ----------

const isDoctor = (a: UserAccount) => a.role === 'ROLE_DOCTOR';
const isPatient = (a: UserAccount) => a.role === 'ROLE_PATIENT';

function nameOf(id: number | null | undefined, d: AdminData): string | null {
  if (id == null) return null;
  return d.accounts.find((a) => a.id === id)?.fullName ?? null;
}

function toRow(note: ServiceNote, d: AdminData): NoteRow {
  return {
    ...note,
    patientName: nameOf(note.patientId, d) ?? 'Unknown patient',
    doctorName: nameOf(note.doctorId, d) ?? 'Unknown doctor',
  };
}

function toAccountRow(account: UserAccount, d: AdminData): AccountRow {
  return { ...account, primaryDoctorName: nameOf(account.primaryDoctorId, d) };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Turns a server error (HttpErrorResponse or the mock's equivalent) into an Error with the contract's message. */
function toError(err: unknown): Observable<never> {
  const e = err as { error?: { message?: string }; message?: string };
  const message = e?.error?.message ?? 'Something went wrong. Please try again.';
  return throwError(() => new Error(message));
}
