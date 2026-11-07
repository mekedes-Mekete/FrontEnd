import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ServiceNote, ServiceType, UserAccount } from '../models/clinic.models';
import { AuthService } from '../services/auth';
import { MOCK_NOTES, MOCK_USERS } from '../services/mock-clinic-data';
import { ConfirmDialogComponent } from '../shared/confirm-dialog-component/confirm-dialog-component';
import { localToday, notBlank, notInFuture } from '../shared/form-validators';
import { InitialsPipe } from '../shared/initials.pipe';

// ---------------------------------------------------------------------------
// MOCK MODE. Everything below runs on MOCK_USERS / MOCK_NOTES (two "tables":
// users and notes). Swap the marked spots for HTTP calls once the backend
// endpoints exist.
// ---------------------------------------------------------------------------

/** MOCK: the logged-in doctor. Replace with the id from the JWT / AuthService. */
const CURRENT_DOCTOR_ID = 101;

/** NFR3: shown next to every summary. */
const SUMMARY_DISCLAIMER = "For clarity only. Follow your clinician's instructions.";

/** MOCK AI: a note that contains this text makes the fake summary call fail (US11.3 demo). */
const SIMULATE_AI_FAILURE = '[ai-fail]';

type View = 'dashboard' | 'patients' | 'patient' | 'new-note';

/** A note with names resolved, ready for the tables. */
interface NoteView extends ServiceNote {
  patientName: string;
  doctorName: string;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab', label: 'Lab' },
  { value: 'followup', label: 'Follow-up' },
];

function nameOf(userId: number): string {
  return MOCK_USERS.find(u => u.id === userId)?.fullName ?? 'Unknown';
}

function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const newestFirst = (a: ServiceNote, b: ServiceNote): number =>
  b.dateOfVisit.localeCompare(a.dateOfVisit) || b.createdAt.localeCompare(a.createdAt);

@Component({
  selector: 'app-doctor-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, InitialsPipe],
  templateUrl: './doctor-component.html',
  styleUrls: ['./doctor-component.css']
})
export class DoctorComponent {
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly disclaimer = SUMMARY_DISCLAIMER;
  readonly serviceTypes = SERVICE_TYPES;
  readonly maxVisitDate = localToday();

  // ---- Profile (US8) ------------------------------------------------------
  readonly doctor: UserAccount = MOCK_USERS.find(u => u.id === CURRENT_DOCTOR_ID)!;
  /** Name in the top bar. Falls back to the mock doctor if nobody is signed in (page refresh, demo). */
  readonly displayName = this.auth.currentUser?.fullName ?? this.doctor.fullName;

  /** US9: the doctor's patients = patients whose primary doctor is this doctor. */
  readonly patients: UserAccount[] = MOCK_USERS.filter(
    u => u.role === 'ROLE_PATIENT' && u.primaryDoctorId === CURRENT_DOCTOR_ID
  );

  // ---- State --------------------------------------------------------------
  readonly notes = signal<ServiceNote[]>(MOCK_NOTES.map(n => ({ ...n })));
  readonly view = signal<View>('dashboard');
  readonly selectedPatientId = signal<number | null>(null);
  readonly expandedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly editingId = signal<number | null>(null);
  readonly toast = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  private returnView: View = 'dashboard';
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ---- Derived data -------------------------------------------------------
  /** US8: this doctor's latest services, newest first. */
  readonly recentRows = computed<NoteView[]>(() =>
    this.notes()
      .filter(n => n.doctorId === CURRENT_DOCTOR_ID)
      .sort(newestFirst)
      .slice(0, 10)
      .map(n => this.toView(n))
  );

  readonly selectedPatient = computed<UserAccount | null>(() =>
    this.patients.find(p => p.id === this.selectedPatientId()) ?? null
  );

  readonly selectedPatientRows = computed<NoteView[]>(() =>
    this.notes()
      .filter(n => n.patientId === this.selectedPatientId())
      .sort(newestFirst)
      .map(n => this.toView(n))
  );

  readonly noteCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const n of this.notes()) {
      counts.set(n.patientId, (counts.get(n.patientId) ?? 0) + 1);
    }
    return counts;
  });

  primaryDoctorName(patient: UserAccount): string {
    return patient.primaryDoctorId ? nameOf(patient.primaryDoctorId) : 'Not assigned';
  }

  // ---- Forms --------------------------------------------------------------
  /** US10.1: new note form with checks. */
  readonly noteForm = new FormGroup({
    patientId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    serviceType: new FormControl<ServiceType>('consultation', { nonNullable: true, validators: [Validators.required] }),
    dateOfVisit: new FormControl(localToday(), { nonNullable: true, validators: [Validators.required, notInFuture] }),
    title: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(120)] }),
    originalNote: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.minLength(10)] }),
  });

  /** US14: edit title, original note and (when it exists) the summary. */
  readonly editForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(120)] }),
    originalNote: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    summary: new FormControl('', { nonNullable: true }),
  });

  // ---- Sign out (US2) -----------------------------------------------------
  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // ---- Navigation ---------------------------------------------------------
  showDashboard(): void {
    this.view.set('dashboard');
  }

  showPatients(): void {
    this.view.set('patients');
  }

  /** US9: open one patient's details. */
  openPatient(patient: UserAccount): void {
    this.selectedPatientId.set(patient.id);
    this.view.set('patient');
  }

  // ---- US10: add a note ---------------------------------------------------
  startNote(patientId: number | null): void {
    this.returnView = this.view();
    this.noteForm.reset({
      patientId,
      serviceType: 'consultation',
      dateOfVisit: localToday(),
      title: '',
      originalNote: '',
    });
    this.view.set('new-note');
  }

  cancelNote(): void {
    this.view.set(this.returnView);
  }

  /** US10.2: save the note, then ask for the summary (US11). */
  saveNote(): void {
    if (this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();
      return;
    }
    const value = this.noteForm.getRawValue();
    const now = localNow();
    const nextId = this.notes().reduce((max, n) => Math.max(max, n.id), 0) + 1; // MOCK id

    const note: ServiceNote = {
      id: nextId,
      patientId: value.patientId!,
      doctorId: CURRENT_DOCTOR_ID,
      serviceType: value.serviceType,
      title: value.title.trim(),
      originalNote: value.originalNote.trim(),
      summary: '',
      summaryStatus: 'PENDING',
      dateOfVisit: value.dateOfVisit,
      createdAt: now,
      lastUpdated: now,
    };

    this.notes.update(list => [note, ...list]);
    this.expandedIds.update(ids => new Set(ids).add(note.id));
    this.showToast('success', 'Note saved. Your plain-language summary is being prepared.');

    const stayOnPatient = this.returnView === 'patient' && this.selectedPatientId() === note.patientId;
    this.view.set(stayOnPatient ? 'patient' : 'dashboard');

    this.requestSummary(note.id);
  }

  // ---- US11: summary (MOCK AI) -------------------------------------------
  /** MOCK: pretends to call Groq. Replace the timeout with the real request. */
  requestSummary(noteId: number): void {
    this.patchNote(noteId, { summaryStatus: 'PENDING', summary: '' });

    setTimeout(() => {
      const note = this.notes().find(n => n.id === noteId);
      if (!note) return; // deleted while waiting

      if (note.originalNote.includes(SIMULATE_AI_FAILURE)) {
        // US11.3: note is kept, doctor gets a clear message
        this.patchNote(noteId, { summaryStatus: 'FAILED', summary: '' });
        this.showToast('error', 'The AI summary could not be created. Your note was saved. You can try again.');
        return;
      }

      this.patchNote(noteId, { summaryStatus: 'READY', summary: this.mockSummary(note) });
      this.showToast('success', `Summary ready for "${note.title}".`);
    }, 1500);
  }

  private mockSummary(note: ServiceNote): string {
    const text = note.originalNote.replace(SIMULATE_AI_FAILURE, '').replace(/\s+/g, ' ').trim();
    const firstSentence = text.split(/(?<=[.!?])\s/)[0];
    return `This is a plain-language version of your "${note.title}" visit. ${firstSentence} If anything is unclear, please ask your clinician.`;
  }

  // ---- US13: read original next to summary --------------------------------
  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: number): void {
    this.expandedIds.update(ids => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // ---- US14: edit ---------------------------------------------------------
  isOwn(note: ServiceNote): boolean {
    return note.doctorId === CURRENT_DOCTOR_ID;
  }

  startEdit(note: ServiceNote): void {
    if (!this.isOwn(note)) return;
    const summary = this.editForm.controls.summary;
    summary.setValidators(note.summaryStatus === 'READY' ? [notBlank] : []);
    this.editForm.reset({ title: note.title, originalNote: note.originalNote, summary: note.summary });
    this.editingId.set(note.id);
    this.expandedIds.update(ids => new Set(ids).add(note.id));
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(note: ServiceNote): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    this.patchNote(note.id, {
      title: value.title.trim(),
      originalNote: value.originalNote.trim(),
      summary: note.summaryStatus === 'READY' ? value.summary.trim() : note.summary,
      lastUpdated: localNow(), // "last updated" changes
    });
    this.editingId.set(null);
    this.showToast('success', 'Your changes were saved.');
  }

  // ---- US15: delete after confirmation ------------------------------------
  deleteNote(note: NoteView): void {
    if (!this.isOwn(note)) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Delete this note?',
          message: `"${note.title}" for ${note.patientName} and its summary will be removed. This cannot be undone.`,
          confirmLabel: 'Delete note',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (!confirmed) return; // cancel: nothing changes
        this.notes.update(list => list.filter(n => n.id !== note.id));
        this.expandedIds.update(ids => {
          const next = new Set(ids);
          next.delete(note.id);
          return next;
        });
        if (this.editingId() === note.id) this.editingId.set(null);
        this.showToast('success', 'The note was deleted.');
      });
  }

  // ---- Helpers ------------------------------------------------------------
  dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  private showToast(kind: 'success' | 'error', text: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ kind, text });
    this.toastTimer = setTimeout(() => this.toast.set(null), 5000);
  }

  private patchNote(id: number, changes: Partial<ServiceNote>): void {
    this.notes.update(list => list.map(n => (n.id === id ? { ...n, ...changes } : n)));
  }

  private toView(n: ServiceNote): NoteView {
    return { ...n, patientName: nameOf(n.patientId), doctorName: nameOf(n.doctorId) };
  }
}
