import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoteRow } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { notBlank } from '../../shared/form-validators';

export interface EditNoteDialogData {
  note: NoteRow;
}

/** UC5: admin edits the title, original note and summary of a service. Closes with the updated NoteRow. */
@Component({
  selector: 'app-edit-note-dialog-component',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './edit-note-dialog-component.html',
  styleUrls: ['../../shared/dialog.css'],
})
export class EditNoteDialogComponent {
  readonly data = inject<EditNoteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EditNoteDialogComponent, NoteRow>);
  private readonly adminData = inject(AdminDataService);

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    title: new FormControl(this.data.note.title, {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(120)],
    }),
    originalNote: new FormControl(this.data.note.originalNote, {
      nonNullable: true,
      validators: [notBlank],
    }),
    summary: new FormControl(this.data.note.summary, { nonNullable: true }),
  });

  showError(field: 'title' | 'originalNote'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.adminData.updateNote(this.data.note.id, this.form.getRawValue()).subscribe({
      next: (updated) => this.dialogRef.close(updated),
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save the note. Please try again.');
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
