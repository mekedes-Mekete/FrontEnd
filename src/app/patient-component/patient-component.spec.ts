import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { PatientComponent } from './patient-component';
import { API_BASE_URL } from '../services/api.config';
import { AccountRow, NoteRow } from '../models/clinic.models';

const DASHBOARD_URL = `${API_BASE_URL}/api/patient/dashboard`;

const profile: AccountRow = {
  id: 5, fullName: 'Thomas Brennan', email: 'thomas.brennan@patient.health', role: 'ROLE_PATIENT',
  active: true, createdAt: '2021-05-20', dateOfBirth: '1978-04-12', allergies: 'Penicillin',
  primaryDoctorId: 2, primaryDoctorName: 'Dr. James Harrington',
};
const note = (over: Partial<NoteRow> = {}): NoteRow => ({
  id: 1, patientId: 5, patientName: 'Thomas Brennan', doctorId: 2, doctorName: 'Dr. James Harrington',
  serviceType: 'lab', title: 'Blood panel', originalNote: 'Glucose 102 mg/dL.', summary: 'Your sugar is a little high.',
  summaryStatus: 'READY', dateOfVisit: '2026-10-01', createdAt: '2026-10-01T09:00:00', lastUpdated: '2026-10-01T09:00:00',
  ...over,
});

describe('PatientComponent', () => {
  let component: PatientComponent;
  let fixture: ComponentFixture<PatientComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PatientComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PatientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> GET /api/patient/dashboard
  });

  it('should create and load the profile and own services from the server (US16)', () => {
    http.expectOne(DASHBOARD_URL).flush({ profile, notes: [note({ id: 1 }), note({ id: 2, dateOfVisit: '2026-11-01' })] });
    expect(component.patient()?.fullName).toBe('Thomas Brennan');
    expect(component.primaryDoctorName()).toBe('Dr. James Harrington');
    expect(component.serviceRows().map(r => r.id)).toEqual([2, 1]); // newest first
  });

  it('opens the newest service first and lets the patient open another (US17)', () => {
    http.expectOne(DASHBOARD_URL).flush({ profile, notes: [note({ id: 1 }), note({ id: 2, dateOfVisit: '2026-11-01' })] });
    expect(component.isExpanded(2)).toBe(true);
    expect(component.isExpanded(1)).toBe(false);
    component.toggleDetails(component.serviceRows()[1]);
    expect(component.isExpanded(1)).toBe(true);
  });

  it('copes with a service that has no summary yet', () => {
    http.expectOne(DASHBOARD_URL).flush({ profile, notes: [note({ summary: null as unknown as string, summaryStatus: 'PENDING' })] });
    expect(component.serviceRows()[0].summary).toBe('');
  });

  it('shows the server message when the dashboard cannot be loaded', () => {
    http.expectOne(DASHBOARD_URL).flush({ message: 'Server down' }, { status: 500, statusText: 'Error' });
    expect(component.loadError()).toBe('Server down');
    expect(component.loading()).toBe(false);
  });

  it('sign out navigates to the login page', () => {
    http.expectOne(DASHBOARD_URL).flush({ profile, notes: [] });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.signOut();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
