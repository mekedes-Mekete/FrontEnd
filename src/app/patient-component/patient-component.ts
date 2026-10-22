import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PatientInfo {
  name: string;
  dob: string;
  primaryDoctor: string;
  allergies: string;
}

export interface ServiceRow {
  serviceType: string;
  patientNotes: string;
  dateOfVisit: string;
  lastUpdated: string;
  title: string;
  originalNote: string;
  insightsSummary: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-patient-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-component.html',
  styleUrl: './patient-component.css',
})
export class PatientComponent {
  patient: PatientInfo = {
    name: 'Thomas Brennan',
    dob: '1978-04-12',
    primaryDoctor: 'Dr. James Harrington',
    allergies: 'Penicillin, Sulfa'
  };

  serviceRows: ServiceRow[] = [
    {
      serviceType: 'consultation',
      patientNotes: 'Your annual exam was reassuring. Your heart, lungs, oxygen level, and abdominal exam were normal. Your blood pressure i...',
      dateOfVisit: 'Sep 15, 2024',
      lastUpdated: 'Sep 15, 2024',
      title: 'ANNUAL PHYSICAL EXAMINATION',
      originalNote: 'Patient presents for routine annual physical. BP 128/82 mmHg, HR 72 bpm, SpO2 98%. Weight 83kg, BMI 26.4. Lungs clear to auscultation. Heart rhythm regular, no murmurs detected. Abdomen soft and non-tender. Patient reports mild fatigue over past 6 weeks, attributed to work stress. Recommended blood panel and follow-up in 3 months. Discussed diet and exercise modifications.',
      insightsSummary: 'Your annual exam was reassuring. Your heart, lungs, oxygen level, and abdominal exam were normal. Your blood pressure is slightly above the ideal range, and you mentioned some recent tiredness that may be related to stress. Your next steps are to complete the recommended blood tests, keep up healthy food and exercise habits, and return in three months.',
      expanded: true
    },
    {
      serviceType: 'lab',
      patientNotes: 'Your kidney tests were normal. Your blood sugar and cholesterol are a little higher than recommended, and one live...',
      dateOfVisit: 'Sep 22, 2024',
      lastUpdated: 'Sep 22, 2024',
      title: 'BLOOD PANEL LAB RESULTS',
      originalNote: 'Fasting Glucose 105 mg/dL, HbA1c 5.8%, Total Cholesterol 215 mg/dL. Renal panel within normal limits. ALT slightly elevated at 45 U/L.',
      insightsSummary: 'Your kidney tests were normal. Your blood sugar and cholesterol are a little higher than recommended, and one liver enzyme is slightly elevated.',
      expanded: false
    }
  ];

  toggleDetails(row: ServiceRow): void {
    row.expanded = !row.expanded;
  }
}