import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AccountInput, AdminData, NoteChanges, ServiceNote, UserAccount } from '../models/clinic.models';
import { MOCK_NOTES, MOCK_USERS } from './mock-clinic-data';

const FAKE_LATENCY_MS = 250;

/**
 * TEMPORARY stand-in for the Spring backend. It plays the server side of the
 * 5 endpoints in the API contract, including the business rules and error messages.
 * Delete this file once AdminDataService calls the real API.
 */
@Injectable({ providedIn: 'root' })
export class MockAdminBackend {
  private accounts: UserAccount[] = structuredClone(MOCK_USERS);
  private notes: ServiceNote[] = structuredClone(MOCK_NOTES);
  private nextId = 1000;

  /** 1. GET /api/admin/data */
  getData(): Observable<AdminData> {
    const notes = [...this.notes].sort((a, b) => b.dateOfVisit.localeCompare(a.dateOfVisit));
    return this.ok({ accounts: this.accounts, notes });
  }

  /** 2. PUT /api/admin/notes/{id} */
  putNote(id: number, changes: NoteChanges): Observable<ServiceNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return this.error('This note no longer exists.');
    note.title = changes.title.trim();
    note.originalNote = changes.originalNote.trim();
    note.summary = changes.summary.trim();
    note.lastUpdated = new Date().toISOString(); // server clock sets "last updated"
    return this.ok(note);
  }

  /** 3. DELETE /api/admin/notes/{id} */
  deleteNote(id: number): Observable<void> {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length === before) return this.error('This note no longer exists.');
    return this.ok(undefined);
  }

  /** 4. POST /api/admin/accounts */
  postAccount(input: AccountInput): Observable<UserAccount> {
    if (this.emailTaken(input.email)) return this.error('An account with this email already exists.');
    const account: UserAccount = {
      id: this.nextId++,
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      ...roleFields(input),
    };
    this.accounts.push(account);
    return this.ok(account);
  }

  /** 5. PUT /api/admin/accounts/{id} (details, role, primary doctor and active status) */
  putAccount(id: number, input: AccountInput): Observable<UserAccount> {
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) return this.error('Account not found.');
    const current = this.accounts[index];
    const active = input.active ?? current.active;

    if (this.emailTaken(input.email, id)) return this.error('An account with this email already exists.');
    if (current.role === 'ROLE_DOCTOR' && input.role !== 'ROLE_DOCTOR' && this.hasPatients(id)) {
      return this.error("Reassign this doctor's patients before changing the role.");
    }
    const removesAdmin = current.role === 'ROLE_ADMIN' && current.active && (!active || input.role !== 'ROLE_ADMIN');
    if (removesAdmin && this.accounts.filter((a) => a.role === 'ROLE_ADMIN' && a.active).length <= 1) {
      return this.error('You cannot deactivate the last active admin.');
    }

    const updated: UserAccount = { id, active, createdAt: current.createdAt, ...roleFields(input) };
    this.accounts[index] = updated;
    return this.ok(updated);
  }

  private hasPatients(doctorId: number): boolean {
    return this.accounts.some((a) => a.role === 'ROLE_PATIENT' && a.primaryDoctorId === doctorId);
  }

  private emailTaken(email: string, ignoreId?: number): boolean {
    const normalized = email.trim().toLowerCase();
    return this.accounts.some((a) => a.id !== ignoreId && a.email.toLowerCase() === normalized);
  }

  /** Copies the value, like JSON over the network, after a short delay. */
  private ok<T>(value: T): Observable<T> {
    return of(structuredClone(value)).pipe(delay(FAKE_LATENCY_MS));
  }

  /** Same shape Angular's HttpErrorResponse gives: the message is in err.error.message. */
  private error(message: string): Observable<never> {
    return throwError(() => ({ error: { message } }));
  }
}

/** Keeps only the fields that belong to the chosen role. temporaryPassword is never stored here. */
function roleFields(input: AccountInput): Omit<UserAccount, 'id' | 'active' | 'createdAt'> {
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
  return base;
}
