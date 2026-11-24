import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DoctorComponent } from './doctor-component';
import { API_BASE_URL } from '../services/api.config';
import { AccountRow, NoteRow } from '../models/clinic.models';

const DATA_URL = `${API_BASE_URL}/api/doctor/data`;

const doctor: AccountRow = {
  id: 2, fullName: 'Dr. James Harrington', email: 'j.harrington@medicore.health', role: 'ROLE_DOCTOR',
  active: true, createdAt: '2021-03-01', specialty: 'Internal Medicine', primaryDoctorName: null,
};
const patient: AccountRow = {
  id: 5, fullName: 'Thomas Brennan', email: 'thomas.brennan@patient.health', role: 'ROLE_PATIENT',
  active: true, createdAt: '2021-05-20', dateOfBirth: '1978-04-12', allergies: 'Penicillin',
  primaryDoctorId: 2, primaryDoctorName: 'Dr. James Harrington',
};
const note = (over: Partial<NoteRow> = {}): NoteRow => ({
  id: 1, patientId: 5, patientName: 'Thomas Brennan', doctorId: 2, doctorName: 'Dr. James Harrington',
  serviceType: 'consultation', title: 'Annual Physical', originalNote: 'Routine physical, all normal.',
  summary: null as unknown as string, summaryStatus: 'PENDING', dateOfVisit: '2026-11-01',
  createdAt: '2026-11-01T09:00:00', lastUpdated: '2026-11-01T09:00:00', ...over,
});

describe('DoctorComponent', () => {
  let component: DoctorComponent;
  let fixture: ComponentFixture<DoctorComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DoctorComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DoctorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> GET /api/doctor/data
  });

  function loadData(notes: NoteRow[] = [note()]): void {
    http.expectOne(DATA_URL).flush({ profile: doctor, patients: [patient], notes });
  }

  it('should create and load profile, patients and notes from the server (US8, US9)', () => {
    expect(component.loading()).toBe(true);
    loadData();
    expect(component.loading()).toBe(false);
    expect(component.doctor()?.fullName).toBe('Dr. James Harrington');
    expect(component.patients().length).toBe(1);
    expect(component.recentRows().length).toBe(1);
    expect(component.noteCounts().get(5)).toBe(1);
  });

  it('shows the error message and can load again when the server is not reachable', () => {
    http.expectOne(DATA_URL).flush({ message: 'Server down' }, { status: 500, statusText: 'Error' });
    expect(component.loadError()).toBe('Server down');
    component.reload();
    loadData();
    expect(component.loadError()).toBeNull();
  });

  it('does not send an invalid note form (US10.1)', () => {
    loadData();
    component.startNote(null);
    component.saveNote();
    http.expectNone(`${API_BASE_URL}/api/doctor/notes`);
    expect(component.noteForm.controls.patientId.touched).toBe(true);
  });

  it('saves a note and shows the summary the server returns (US10.2, US11)', () => {
    loadData([]);
    component.startNote(5);
    component.noteForm.patchValue({ title: 'Follow-up', originalNote: 'BP 128/82, continue current medication.' });
    component.saveNote();

    const req = http.expectOne(`${API_BASE_URL}/api/doctor/notes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.patientId).toBe(5);
    expect(req.request.body.title).toBe('Follow-up');
    req.flush(note({ id: 9, title: 'Follow-up', summary: 'Your blood pressure is fine.', summaryStatus: 'READY' }));

    expect(component.saving()).toBe(false);
    expect(component.notes()[0].id).toBe(9);
    expect(component.toast()?.kind).toBe('success');
  });

  it('keeps the note and shows an error message when the AI summary failed (US11.3)', () => {
    loadData([]);
    component.startNote(5);
    component.noteForm.patchValue({ title: 'Lab results', originalNote: 'Glucose slightly elevated, repeat in 6 months.' });
    component.saveNote();
    http.expectOne(`${API_BASE_URL}/api/doctor/notes`)
      .flush(note({ id: 10, title: 'Lab results', summaryStatus: 'FAILED' }));

    expect(component.notes().length).toBe(1);
    expect(component.toast()?.kind).toBe('error');
  });

  it('keeps the form open with the typed text when saving is refused', () => {
    loadData([]);
    component.startNote(5);
    component.noteForm.patchValue({ title: 'Visit', originalNote: 'Some clinical text here.' });
    component.saveNote();
    http.expectOne(`${API_BASE_URL}/api/doctor/notes`)
      .flush({ status: 403, message: 'This patient is not assigned to you' }, { status: 403, statusText: 'Forbidden' });

    expect(component.view()).toBe('new-note');
    expect(component.noteForm.controls.title.value).toBe('Visit');
    expect(component.toast()?.text).toBe('This patient is not assigned to you');
  });

  it('retries a failed summary (US11.3)', () => {
    loadData([note({ summaryStatus: 'FAILED' })]);
    component.requestSummary(component.notes()[0]);
    const req = http.expectOne(`${API_BASE_URL}/api/doctor/notes/1/summary`);
    expect(req.request.method).toBe('POST');
    req.flush(note({ summary: 'Easy summary', summaryStatus: 'READY' }));
    expect(component.notes()[0].summaryStatus).toBe('READY');
    expect(component.isSummaryBusy(1)).toBe(false);
  });

  it('edits a note and takes the saved note from the server (US14)', () => {
    loadData([note({ summary: 'Old summary', summaryStatus: 'READY' })]);
    const row = component.notes()[0];
    component.startEdit(row);
    component.editForm.patchValue({ title: 'New title' });
    component.saveEdit(row);

    const req = http.expectOne(`${API_BASE_URL}/api/doctor/notes/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'New title', originalNote: row.originalNote, summary: 'Old summary' });
    req.flush(note({ title: 'New title', summary: 'Old summary', summaryStatus: 'READY', lastUpdated: '2026-11-20T10:00:00' }));
    expect(component.notes()[0].title).toBe('New title');
    expect(component.editingId()).toBeNull();
  });

  it('deletes a note only after the doctor confirms (US15)', () => {
    loadData();
    const dialog = TestBed.inject(MatDialog);
    const open = vi.spyOn(dialog, 'open');

    open.mockReturnValueOnce({ afterClosed: () => of(undefined) } as never);
    component.deleteNote(component.notes()[0]);
    http.expectNone(`${API_BASE_URL}/api/doctor/notes/1`);
    expect(component.notes().length).toBe(1);

    open.mockReturnValueOnce({ afterClosed: () => of(true) } as never);
    component.deleteNote(component.notes()[0]);
    http.expectOne(`${API_BASE_URL}/api/doctor/notes/1`).flush(null, { status: 204, statusText: 'No Content' });
    expect(component.notes().length).toBe(0);
  });

  it('does not offer edit or delete for notes of other doctors', () => {
    loadData([note({ doctorId: 3, doctorName: 'Dr. Priya Nair' })]);
    expect(component.isOwn(component.notes()[0])).toBe(false);
  });

  it('sign out navigates to the login page', () => {
    loadData();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.signOut();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
