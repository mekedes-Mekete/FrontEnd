import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AdminDataService } from './admin-data.service';

describe('AdminDataService (mock)', () => {
  let service: AdminDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminDataService);
  });

  it('UC3: lists only doctor accounts', async () => {
    const doctors = await firstValueFrom(service.getDoctors());
    expect(doctors.length).toBe(3);
    expect(doctors.every((d) => d.role === 'ROLE_DOCTOR')).toBe(true);
  });

  it('UC3: doctor profile lists the assigned patients', async () => {
    const profile = await firstValueFrom(service.getDoctorProfile(101));
    expect(profile.assignedPatients.map((p) => p.fullName)).toContain('Thomas Brennan');
  });

  it('UC4: returns a patient with primary doctor and services', async () => {
    const detail = await firstValueFrom(service.getPatientDetail(201));
    expect(detail.primaryDoctorName).toBe('Dr. James Harrington');
    expect(detail.notes.length).toBeGreaterThan(0);
  });

  it('UC5: editing a note saves the changes and updates "last updated"', async () => {
    const before = (await firstValueFrom(service.getPatientDetail(201))).notes[0];
    const updated = await firstValueFrom(
      service.updateNote(before.id, { title: 'New title', originalNote: before.originalNote, summary: before.summary }),
    );
    expect(updated.title).toBe('New title');
    expect(updated.lastUpdated > before.lastUpdated).toBe(true);
  });

  it('UC6: deleting a note removes it', async () => {
    await firstValueFrom(service.deleteNote(1));
    const detail = await firstValueFrom(service.getPatientDetail(203));
    expect(detail.notes.some((n) => n.id === 1)).toBe(false);
  });

  it('UC7: rejects a duplicate email when creating an account', async () => {
    await expect(
      firstValueFrom(service.createAccount({ fullName: 'Copy', email: 'J.Harrington@medicore.health', role: 'ROLE_DOCTOR', specialty: 'X' })),
    ).rejects.toThrow('already exists');
  });

  it('UC7: creates a patient that then appears in the patient list', async () => {
    const created = await firstValueFrom(
      service.createAccount({
        fullName: 'Nina Patel', email: 'nina.patel@patient.health', role: 'ROLE_PATIENT',
        dateOfBirth: '1999-01-01', primaryDoctorId: 102, temporaryPassword: 'temp-pass-1',
      }),
    );
    const patients = await firstValueFrom(service.getPatients());
    expect(patients.find((p) => p.id === created.id)?.primaryDoctorName).toBe('Dr. Priya Nair');
  });

  it('UC7: deactivates an account', async () => {
    const account = await firstValueFrom(service.setAccountActive(202, false));
    expect(account.active).toBe(false);
  });

  it('UC7: refuses to deactivate the last active admin', async () => {
    await expect(firstValueFrom(service.setAccountActive(1, false))).rejects.toThrow('last active admin');
  });
});
