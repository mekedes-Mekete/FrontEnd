import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoteRow } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/confirm-dialog-component/confirm-dialog-component';
import {
  EditNoteDialogComponent,
  EditNoteDialogData,
} from '../edit-note-dialog-component/edit-note-dialog-component';

/**
 * Table of services with expandable original note + summary.
 * Holds the admin actions: Edit (UC5) and Delete with confirmation (UC6).
 * Emits `changed` after a successful edit or delete so the parent page can reload.
 */
@Component({
  selector: 'app-notes-table',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink],
  templateUrl: './notes-table-component.html',
  styleUrls: ['../../shared/admin-page.css', './notes-table-component.css'],
})
export class NotesTableComponent {
  readonly notes = input.required<NoteRow[]>();
  readonly showPatient = input(true);
  readonly showDoctor = input(true);
  readonly changed = output<void>();

  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly adminData = inject(AdminDataService);

  readonly expandedId = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly columnCount = computed(() => 5 + (this.showPatient() ? 1 : 0) + (this.showDoctor() ? 1 : 0));

  toggle(note: NoteRow): void {
    this.expandedId.update((current) => (current === note.id ? null : note.id));
  }

  edit(note: NoteRow): void {
    this.errorMessage.set('');
    this.dialog
      .open<EditNoteDialogComponent, EditNoteDialogData, NoteRow>(EditNoteDialogComponent, {
        width: '680px',
        maxWidth: '95vw',
        data: { note },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (!updated) return; // cancelled
        this.snackBar.open('Note updated.', undefined, { duration: 3000 });
        this.changed.emit();
      });
  }

  remove(note: NoteRow): void {
    this.errorMessage.set('');
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: 'Delete this note?',
          message: `"${note.title}" for ${note.patientName} and its patient summary will be permanently removed.`,
          confirmLabel: 'Delete note',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return; // UC6: cancel changes nothing
        this.adminData.deleteNote(note.id).subscribe({
          next: () => {
            this.snackBar.open('Note deleted.', undefined, { duration: 3000 });
            this.changed.emit();
          },
          error: (err: Error) => this.errorMessage.set(err.message || 'Could not delete the note.'),
        });
      });
  }
}
