import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

/**
 * Reusable "Are you sure?" dialog. Closes with `true` on confirm, `undefined` on cancel.
 * Used by UC6 (delete note) and UC7 (deactivate account); can be reused for UC15 later.
 */
@Component({
  selector: 'app-confirm-dialog-component',
  standalone: true,
  templateUrl: './confirm-dialog-component.html',
  styleUrls: ['../dialog.css', './confirm-dialog-component.css'],
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
