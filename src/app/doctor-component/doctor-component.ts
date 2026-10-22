import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddNoteComponent, AddNotePayload, Patient } from '../add-note-component/add-note-component';

export interface DoctorProfile {
  id: number;
  name: string;
  specialty: string;
  email: string;
  memberSince: string;
}

export interface ServiceRecord {
  id: string;
  patientName: string;
  serviceType: 'followup' | 'lab' | 'consultation' | 'diagnosis' | 'prescription';
  patientNotes: string;
  dateOfVisit: string;
  lastUpdated: string;
  expanded?: boolean;
  labCategory?: string;
  originalDoctorNote?: string;
  aiFriendlySummary?: string;
}

@Component({
  selector: 'app-doctor-component',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './doctor-component.html',
  styleUrls: ['./doctor-component.css']
})
export class DoctorComponent {
  doctorProfile: DoctorProfile = {
    id: 1,
    name: 'Dr. James Harrington',
    specialty: 'Internal Medicine',
    email: 'j.harrington@medicore.health',
    memberSince: 'March 2021'
  };

  // List of patients to pass to the AddNoteComponent dialog
  patientsList: Patient[] = [
    { id: 101, first_name: 'Thomas', last_name: 'Brennan', email: 'tbrennan@example.com' },
    { id: 102, first_name: 'Robert', last_name: 'Okafor', email: 'rokafor@example.com' },
    { id: 103, first_name: 'Sarah', last_name: 'Jenkins', email: 'sjenkins@example.com' },
    { id: 104, first_name: 'Michael', last_name: 'Chang', email: 'mchang@example.com' }
  ];

  services: ServiceRecord[] = [
    {
      id: '1',
      patientName: 'Robert Okafor',
      serviceType: 'followup',
      patientNotes: 'Your home blood pressure readings are still higher than the target range. Increase lisinopril...',
      dateOfVisit: 'Oct 8, 2024',
      lastUpdated: 'Oct 8, 2024',
      expanded: false,
      labCategory: 'BLOOD PRESSURE FOLLOW-UP',
      originalDoctorNote: 'Patient BP home log checked. Consistently above 140/90 mmHg. Lisinopril dosage adjusted.',
      aiFriendlySummary: 'Your home blood pressure numbers remain elevated. The doctor has adjusted your lisinopril medication to help bring your pressure down.'
    },
    {
      id: '2',
      patientName: 'Thomas Brennan',
      serviceType: 'lab',
      patientNotes: 'Your kidney tests were normal. Your blood sugar and cholesterol are a little higher than...',
      dateOfVisit: 'Sep 22, 2024',
      lastUpdated: 'Sep 22, 2024',
      expanded: false,
      labCategory: 'LAB RESULTS — COMPREHENSIVE METABOLIC PANEL',
      originalDoctorNote: 'Results reviewed with patient. Glucose 102 mg/dL (borderline elevated — pre-diabetic range). HbA1c 5.8%. LDL 138 mg/dL, HDL 42 mg/dL, Triglycerides 178 mg/dL. Kidney function within normal limits. Liver enzymes slightly elevated: ALT 48 U/L. Recommend lifestyle modifications, reduced alcohol intake, repeat labs in 6 months. Started metformin 500mg BID discussion deferred pending patient decision.',
      aiFriendlySummary: 'Your kidney tests were normal. Your blood sugar and cholesterol are a little higher than recommended, and one liver test was mildly elevated. This does not mean you have diabetes, but it is important to focus on balanced meals, activity, and reducing alcohol. Repeat your labs in six months. You and your doctor can decide later whether metformin is right for you.'
    },
    {
      id: '3',
      patientName: 'Thomas Brennan',
      serviceType: 'consultation',
      patientNotes: 'Your annual exam was reassuring. Your heart, lungs, oxygen level, and abdominal exam were...',
      dateOfVisit: 'Sep 15, 2024',
      lastUpdated: 'Sep 15, 2024',
      expanded: false,
      labCategory: 'ANNUAL PHYSICAL CONSULTATION',
      originalDoctorNote: 'Patient feels well overall. Routine annual wellness check up completed without acute concerns.',
      aiFriendlySummary: 'Your annual checkup was clear with overall reassuring test results.'
    }
  ];

  constructor(private dialog: MatDialog) {}

  openAddNoteDialog(): void {
    const dialogRef = this.dialog.open(AddNoteComponent, {
      width: '680px',
      data: { patients: this.patientsList }
    });

    dialogRef.afterClosed().subscribe((result: AddNotePayload | undefined) => {
      if (result) {
        const selectedPatient = this.patientsList.find(p => p.id === Number(result.patient_id));
        
        const todayStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        const newRecord: ServiceRecord = {
          id: Date.now().toString(),
          patientName: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Unknown Patient',
          serviceType: result.service_type,
          patientNotes: result.patient_notes,
          dateOfVisit: todayStr,
          lastUpdated: todayStr,
          expanded: false,
          labCategory: result.patient_notes.toUpperCase(),
          originalDoctorNote: result.original_doctor_note,
          aiFriendlySummary: result.original_doctor_note
        };

        this.services.unshift(newRecord);
      }
    });
  }

  toggleExpand(service: ServiceRecord): void {
    service.expanded = !service.expanded;
  }

  deleteRecord(service: ServiceRecord): void {
    this.services = this.services.filter(s => s.id !== service.id);
  }
}