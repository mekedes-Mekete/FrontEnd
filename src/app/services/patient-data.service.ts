import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AccountRow, NoteRow } from '../models/clinic.models';
import { API_BASE_URL } from './api.config';
import { toApiError } from './api-error';

/** Response of GET /api/patient/dashboard (US16, US17). */
export interface PatientDashboard {
  profile: AccountRow;
  notes: NoteRow[];
}

/**
 * Data access for the patient screen. The server takes the patient from the JWT and only ever
 * returns that patient's own profile and services (NFR1), so there is no id to send.
 */
@Injectable({ providedIn: 'root' })
export class PatientDataService {
  private readonly http = inject(HttpClient);

  load(): Observable<PatientDashboard> {
    return this.http.get<PatientDashboard>(`${API_BASE_URL}/api/patient/dashboard`).pipe(
      map((d) => ({ ...d, notes: d.notes.map((n) => ({ ...n, summary: n.summary ?? '' })) })),
      catchError(toApiError),
    );
  }
}
