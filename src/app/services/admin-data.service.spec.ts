import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AdminDataService } from './admin-data.service';
import { MockAdminBackend } from './mock-admin-backend';

describe('AdminDataService', () => {
  let service: AdminDataService;
  let backend: MockAdminBackend;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminDataService);
    backend = TestBed.inject(MockAdminBackend);
  });

  it('loads all admin data with ONE call, then answers every screen from memory', async () => {
    const getData = vi.spyOn(backend, 'getData');
    await firstValueFrom(service.getDoctors());
    await firstValueFrom(service.getDoctorProfile(101));
    await firstValueFrom(service.getPatients());
    await firstValueFrom(service.getPatientDetail(201));
    await firstValueFrom(service.getAccounts());
    expect(getData).toHaveBeenCalledTimes(1);
  });

  it('UC3: lists only doctor accounts', async () => {
    const doctors = await firstValueFrom(service.getDoctors());
    expect(doctors.length).toBe(3);
    expect(doctors.every((d) => d.role === 'ROLE_DOCTOR')).toBe(true);
  });

  it('UC3: doctor profile lists assigned patients and at most 10 recent notes', async () => {
    const profile = await firstValueFrom(service.getDoctorProfile(101));
    expect(profile.assignedPatients.map((p) => p.fullName)).toContain('Thomas Brennan');
    expect(profile.recentNotes.length).toBeLessThanOrEqual(10);
  });

  it('UC4: returns a patient with primary doctor and services', async () => {
    const detail = await firstValueFrom(service.getPatientDetail(201));
    expect(detail.primaryDoctorName).toBe('Dr. James Harrington');
    expect(detail.notes.length).toBeGreaterThan(0);
  });

  it('UC5: editing a note saves the changes and updates "last updated" without reloading', async () => {
    const before = (await firstValueFrom(service.getPatientDetail(201))).notes[0];
    const getData = vi.spyOn(backend, 'getData');
    const updated = await firstValueFrom(
      service.updateNote(before.id, { title: 'New title', originalNote: before.originalNote, summary: before.summary }),
    );
    expect(updated.title).toBe('New title');
    expect(updated.lastUpdated > before.lastUpdated).toBe(true);
    const after = (await firstValueFrom(service.getPatientDetail(201))).notes.find((n) => n.id === before.id);
    expect(after?.title).toBe('New title');
    expect(getData).not.toHaveBeenCalled();
  });

  it('UC6: deleting a note removes it', async () => {
    await firstValueFrom(service.getPatientDetail(203));
    await firstValueFrom(service.deleteNote(1));
    const detail = await firstValueFrom(service.getPatientDetail(203));
    expect(detail.notes.some((n) => n.id === 1)).toBe(false);
  });

  it('UC7: rejects a duplicate email with the contract message', async () => {
    await expect(
      firstValueFrom(
        service.createAccount({ fullName: 'Copy', email: 'J.Harrington@medicore.health', role: 'ROLE_DOCTOR', specialty: 'X' }),
      ),
    ).rejects.toThrow('An account with this email already exists.');
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

  it('UC7: deactivates and reactivates through the same update call', async () => {
    const putAccount = vi.spyOn(backend, 'putAccount');
    expect((await firstValueFrom(service.setAccountActive(202, false))).active).toBe(false);
    expect((await firstValueFrom(service.setAccountActive(202, true))).active).toBe(true);
    expect(putAccount).toHaveBeenCalledTimes(2);
  });

  it('UC7: refuses to deactivate the last active admin', async () => {
    await expect(firstValueFrom(service.setAccountActive(1, false))).rejects.toThrow('last active admin');
  });

  it('UC7: editing details keeps the account active status', async () => {
    await firstValueFrom(service.setAccountActive(203, false));
    const accounts = await firstValueFrom(service.getAccounts());
    const robert = accounts.find((a) => a.id === 203)!;
    const saved = await firstValueFrom(
      service.updateAccount(203, { ...robert, fullName: 'Robert A. Okafor', temporaryPassword: null }),
    );
    expect(saved.fullName).toBe('Robert A. Okafor');
    expect(saved.active).toBe(false);
  });
});
