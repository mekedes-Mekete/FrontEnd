import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AddNotePayload {
  patient_id: number;
  service_type: 'followup' | 'lab' | 'consultation' | 'diagnosis' | 'prescription';
  patient_notes: string;
  original_doctor_note: string;
}

export interface DialogData {
  patients: Patient[];
}

@Component({
  selector: 'app-add-note-component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './add-note-component.html',
  styleUrls: ['./add-note-component.css']
})
export class AddNoteComponent {
  formData: AddNotePayload = {
    patient_id: 0,
    service_type: 'consultation',
    patient_notes: '',
    original_doctor_note: ''
  };

  constructor(
    public dialogRef: MatDialogRef<AddNoteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    if (this.data?.patients?.length > 0) {
      this.formData.patient_id = this.data.patients[0].id;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.formData.patient_id && this.formData.patient_notes && this.formData.original_doctor_note) {
      this.dialogRef.close(this.formData);
    }
  }
}