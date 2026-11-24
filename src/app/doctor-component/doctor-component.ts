import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AccountRow, NoteRow, ServiceType } from '../models/clinic.models';
import { AuthService } from '../services/auth';
import { ApiError } from '../services/api-error';
import { DoctorDataService } from '../services/doctor-data.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog-component/confirm-dialog-component';
import { localToday, notBlank, notInFuture } from '../shared/form-validators';
import { InitialsPipe } from '../shared/initials.pipe';

/** NFR3: shown next to every summary. */
const SUMMARY_DISCLAIMER = "For clarity only. Follow your clinician's instructions.";

type View = 'dashboard' | 'patients' | 'patient' | 'new-note';

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab', label: 'Lab' },
  { value: 'followup', label: 'Follow-up' },
];

const newestFirst = (a: NoteRow, b: NoteRow): number =>
  b.dateOfVisit.localeCompare(a.dateOfVisit) || b.createdAt.localeCompare(a.createdAt);

/**
 * Doctor screens (UC8 to UC11, UC13 to UC15), connected to the Spring Boot backend through
 * DoctorDataService. One call on start loads profile, patients and notes; every change is one
 * call and the saved note from the answer is swapped into the screen.
 */
@Component({
  selector: 'app-doctor-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, InitialsPipe],
  templateUrl: './doctor-component.html',
  styleUrls: ['./doctor-component.css']
})
export class DoctorComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(DoctorDataService);

  readonly disclaimer = SUMMARY_DISCLAIMER;
  readonly serviceTypes = SERVICE_TYPES;
  readonly maxVisitDate = localToday();

  // ---- Server data --------------------------------------------------------
  /** US8: the signed-in doctor's profile (from the server, never from the browser). */
  readonly doctor = signal<AccountRow | null>(null);
  /** US9: the doctor's patients. */
  readonly patients = signal<AccountRow[]>([]);
  readonly notes = signal<NoteRow[]>([]);

  /** Name in the top bar: the profile once loaded, the login answer before that. */
  readonly displayName = computed(() => this.doctor()?.fullName ?? this.auth.currentUser?.fullName ?? '');

  // ---- State --------------------------------------------------------------
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** True while a note is being saved (the server also waits for the AI summary, up to ~10 s). */
  readonly saving = signal(false);
  readonly savingEdit = signal(false);
  /** AI translate on the new-note form: the preview text, the note text it was made from, and the busy flag. */
  readonly translation = signal('');
  readonly translating = signal(false);
  private translatedFrom = '';
  /** Notes whose summary is being requested right now. */
  readonly summaryBusyIds = signal<ReadonlySet<number>>(new Set<number>());

  readonly view = signal<View>('dashboard');
  readonly selectedPatientId = signal<number | null>(null);
  readonly expandedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly editingId = signal<number | null>(null);
  readonly toast = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  private returnView: View = 'dashboard';
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ---- Derived data -------------------------------------------------------
  /** US8: this doctor's latest services, newest first. */
  readonly recentRows = computed<NoteRow[]>(() => {
    const myId = this.doctor()?.id;
    return [...this.notes()]
      .filter(n => n.doctorId === myId)
      .sort(newestFirst)
      .slice(0, 10);
  });

  readonly selectedPatient = computed<AccountRow | null>(() =>
    this.patients().find(p => p.id === this.selectedPatientId()) ?? null
  );

  readonly selectedPatientRows = computed<NoteRow[]>(() =>
    this.notes()
      .filter(n => n.patientId === this.selectedPatientId())
      .sort(newestFirst)
  );

  readonly noteCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const n of this.notes()) {
      counts.set(n.patientId, (counts.get(n.patientId) ?? 0) + 1);
    }
    return counts;
  });

  primaryDoctorName(patient: AccountRow): string {
    return patient.primaryDoctorName ?? 'Not assigned';
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

  ngOnInit(): void {
    this.reload();
  }

  // ---- Loading (US8, US9) -------------------------------------------------
  /** GET /api/doctor/data */
  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.load().subscribe({
      next: data => {
        this.doctor.set(data.profile);
        this.patients.set(data.patients);
        this.notes.set(data.notes);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        if (this.sessionEnded(err)) return;
        this.loadError.set(err.message);
        this.loading.set(false);
      },
    });
  }

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
  openPatient(patient: AccountRow): void {
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
    this.resetTranslation();
    this.view.set('new-note');
  }

  cancelNote(): void {
    if (this.saving() || this.translating()) return;
    this.resetTranslation();
    this.view.set(this.returnView);
  }

  /** US10.2: POST /api/doctor/notes. The server saves the note, then asks Groq for the summary (US11). */
  saveNote(): void {
    if (this.saving()) return;
    if (this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();
      return;
    }
    const value = this.noteForm.getRawValue();
    this.saving.set(true);

    this.api.createNote({
      patientId: value.patientId!,
      serviceType: value.serviceType,
      title: value.title.trim(),
      originalNote: value.originalNote.trim(),
      dateOfVisit: value.dateOfVisit,
      // A reviewed translation is saved with the note (the server then skips the AI call). A stale one is not sent.
      ...(this.hasTranslation() && !this.translationOutdated() ? { summary: this.translation() } : {}),
    }).subscribe({
      next: note => {
        this.saving.set(false);
        this.notes.update(list => [note, ...list]);
        this.expandedIds.update(ids => new Set(ids).add(note.id));

        const stayOnPatient = this.returnView === 'patient' && this.selectedPatientId() === note.patientId;
        this.view.set(stayOnPatient ? 'patient' : 'dashboard');

        // US11.3: the note is always kept; the message depends on what happened to the summary.
        switch (note.summaryStatus) {
          case 'READY':
            this.showToast('success', `Note saved. The summary for "${note.title}" is ready.`);
            break;
          case 'FAILED':
            this.showToast('error', 'Your note was saved, but the AI summary could not be created. You can try again.');
            break;
          default:
            this.showToast('success', 'Note saved. No summary has been requested yet.');
        }
      },
      error: (err: ApiError) => {
        this.saving.set(false); // the form stays open with everything the doctor typed
        if (this.sessionEnded(err)) return;
        this.showToast('error', err.message);
      },
    });
  }

  // ---- AI translate on the new-note form ----------------------------------
  hasTranslation(): boolean {
    return this.translation().trim().length > 0;
  }

  /** True when the note was changed after the translation was made. */
  translationOutdated(): boolean {
    return this.hasTranslation() && this.noteForm.controls.originalNote.value.trim() !== this.translatedFrom;
  }

  /** POST /api/doctor/notes/translate. Used for both Translate and Retranslate; nothing is saved. */
  translateNote(): void {
    if (this.translating() || this.saving()) return;
    const noteControl = this.noteForm.controls.originalNote;
    if (noteControl.invalid) {
      noteControl.markAsTouched();
      return;
    }
    const text = noteControl.value.trim();
    this.translating.set(true);

    this.api.translate(this.noteForm.controls.serviceType.value, text).subscribe({
      next: result => {
        this.translating.set(false);
        this.translation.set(result);
        this.translatedFrom = text;
      },
      error: (err: ApiError) => {
        this.translating.set(false); // the form and any earlier translation stay as they were
        if (this.sessionEnded(err)) return;
        this.showToast('error', err.message);
      },
    });
  }

  private resetTranslation(): void {
    this.translation.set('');
    this.translatedFrom = '';
    this.translating.set(false);
  }

  // ---- US11: summary ------------------------------------------------------
  isSummaryBusy(id: number): boolean {
    return this.summaryBusyIds().has(id);
  }

  /** US11.3: POST /api/doctor/notes/{id}/summary (also used for a note that has no summary yet). */
  requestSummary(note: NoteRow): void {
    if (this.isSummaryBusy(note.id)) return;
    this.setBusy(note.id, true);

    this.api.retrySummary(note.id).subscribe({
      next: saved => {
        this.setBusy(note.id, false);
        this.replaceNote(saved);
        if (saved.summaryStatus === 'READY') {
          this.showToast('success', `Summary ready for "${saved.title}".`);
        } else if (saved.summaryStatus === 'FAILED') {
          this.showToast('error', 'The AI summary could not be created. Your note was saved. You can try again.');
        }
      },
      error: (err: ApiError) => {
        this.setBusy(note.id, false);
        if (this.sessionEnded(err)) return;
        this.showToast('error', err.message);
      },
    });
  }

  /** Text for the summary chip in the services table. */
  summaryLabel(row: NoteRow): string {
    if (row.summaryStatus === 'READY') return 'Ready';
    if (row.summaryStatus === 'FAILED') return 'Failed';
    return this.isSummaryBusy(row.id) ? 'Preparing…' : 'Not created';
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
  /** Doctors may change or delete only their own notes (the server checks this too). */
  isOwn(note: NoteRow): boolean {
    return note.doctorId === this.doctor()?.id;
  }

  startEdit(note: NoteRow): void {
    if (!this.isOwn(note)) return;
    const summary = this.editForm.controls.summary;
    summary.setValidators(note.summaryStatus === 'READY' ? [notBlank] : []);
    summary.updateValueAndValidity();
    this.editForm.reset({ title: note.title, originalNote: note.originalNote, summary: note.summary });
    this.editingId.set(note.id);
    this.expandedIds.update(ids => new Set(ids).add(note.id));
  }

  cancelEdit(): void {
    if (this.savingEdit()) return;
    this.editingId.set(null);
  }

  /** PUT /api/doctor/notes/{id}. The server sets the new "last updated" time. */
  saveEdit(note: NoteRow): void {
    if (this.savingEdit()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    this.savingEdit.set(true);

    this.api.updateNote(note.id, {
      title: value.title.trim(),
      originalNote: value.originalNote.trim(),
      summary: note.summaryStatus === 'READY' ? value.summary.trim() : note.summary,
    }).subscribe({
      next: saved => {
        this.savingEdit.set(false);
        this.replaceNote(saved);
        this.editingId.set(null);
        this.showToast('success', 'Your changes were saved.');
      },
      error: (err: ApiError) => {
        this.savingEdit.set(false); // the edit form stays open
        if (this.sessionEnded(err)) return;
        this.showToast('error', err.message);
      },
    });
  }

  // ---- US15: delete after confirmation ------------------------------------
  /** DELETE /api/doctor/notes/{id}, only after the doctor confirms. */
  deleteNote(note: NoteRow): void {
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
        this.api.deleteNote(note.id).subscribe({
          next: () => {
            this.notes.update(list => list.filter(n => n.id !== note.id));
            this.expandedIds.update(ids => {
              const next = new Set(ids);
              next.delete(note.id);
              return next;
            });
            if (this.editingId() === note.id) this.editingId.set(null);
            this.showToast('success', 'The note was deleted.');
          },
          error: (err: ApiError) => {
            if (this.sessionEnded(err)) return;
            this.showToast('error', err.message);
          },
        });
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
    this.toastTimer = setTimeout(() => this.toast.set(null), 6000);
  }

  private replaceNote(saved: NoteRow): void {
    this.notes.update(list => list.map(n => (n.id === saved.id ? saved : n)));
  }

  private setBusy(id: number, busy: boolean): void {
    this.summaryBusyIds.update(ids => {
      const next = new Set(ids);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }

  /** 401 = the token expired or was revoked: end the session and go to the login page (US1, US2). */
  private sessionEnded(err: ApiError): boolean {
    if (err.status !== 401) return false;
    this.auth.logout();
    this.router.navigate(['/login']);
    return true;
  }
}
