import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AccountRow, NoteChanges, NoteRow, ServiceType } from '../models/clinic.models';
import { API_BASE_URL } from './api.config';
import { toApiError } from './api-error';

const API = `${API_BASE_URL}/api/doctor`;

/** Response of GET /api/doctor/data: everything the doctor screens need in one call (US8, US9). */
export interface DoctorData {
  profile: AccountRow;
  patients: AccountRow[];
  notes: NoteRow[];
}

/** US10.1 / US10.2: what the new-note form sends. */
export interface NoteInput {
  patientId: number;
  serviceType: ServiceType;
  title: string;
  originalNote: string;
  dateOfVisit: string;
  /** Optional: the AI translation the doctor reviewed on the form. Not blank = the backend saves it as READY and skips Groq. */
  summary?: string;
}

/**
 * Data access for the doctor screens (UC8 to UC11, UC13 to UC15).
 *
 *   GET    /api/doctor/data                 -> profile, my patients, notes (US8, US9, US13)
 *   POST   /api/doctor/notes                -> save note and ask Groq for the summary (US10, US11)
 *   PUT    /api/doctor/notes/{id}           -> edit title, note and summary (US14)
 *   DELETE /api/doctor/notes/{id}           -> delete note and summary (US15)
 *   POST   /api/doctor/notes/{id}/summary   -> try the summary again after a failure (US11.3)
 *   POST   /api/doctor/notes/translate      -> plain-language preview of the typed note, saves nothing (UC11)
 *
 * The service keeps no data: the component holds the state, so nothing from one login leaks into the next.
 */
@Injectable({ providedIn: 'root' })
export class DoctorDataService {
  private readonly http = inject(HttpClient);

  load(): Observable<DoctorData> {
    return this.http.get<DoctorData>(`${API}/data`).pipe(
      map((d) => ({ ...d, notes: d.notes.map(normalize) })),
      catchError(toApiError),
    );
  }

  /** The backend saves the note first and then waits up to ~10 s for Groq; the answer has summaryStatus READY, FAILED or PENDING. */
  createNote(input: NoteInput): Observable<NoteRow> {
    return this.http.post<NoteRow>(`${API}/notes`, input).pipe(map(normalize), catchError(toApiError));
  }

  /** Preview only: asks the AI to rewrite the typed note in plain language. Nothing is saved. */
  translate(serviceType: ServiceType, originalNote: string): Observable<string> {
    return this.http.post<{ summary: string }>(`${API}/notes/translate`, { serviceType, originalNote }).pipe(
      map((r) => r.summary ?? ''),
      catchError(toApiError),
    );
  }

  updateNote(id: number, changes: NoteChanges): Observable<NoteRow> {
    return this.http.put<NoteRow>(`${API}/notes/${id}`, changes).pipe(map(normalize), catchError(toApiError));
  }

  deleteNote(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/notes/${id}`).pipe(catchError(toApiError));
  }

  retrySummary(id: number): Observable<NoteRow> {
    return this.http.post<NoteRow>(`${API}/notes/${id}/summary`, null).pipe(map(normalize), catchError(toApiError));
  }
}

/** The backend sends `summary: null` until a summary exists; the screens work with an empty string. */
function normalize(note: NoteRow): NoteRow {
  return { ...note, summary: note.summary ?? '' };
}
