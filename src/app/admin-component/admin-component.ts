import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DoctorSummary {
  id: number;
  initials: string;
  name: string;
  specialty: string;
}

export interface PatientSummary {
  id: string;
  initials: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-admin-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-component.html',
  styleUrl: './admin-component.css',
})
export class AdminComponent {
  // Admin Profile Header Data
  adminUser = {
    name: 'Sarah Mitchell',
    role: 'Administrator',
    initials: 'SM'
  };

  // Doctors Summary List
  doctors: DoctorSummary[] = [
    { id: 101, initials: 'JH', name: 'Dr. James Harrington', specialty: 'Internal Medicine' },
    { id: 102, initials: 'PN', name: 'Dr. Priya Nair', specialty: 'Cardiology' },
    { id: 103, initials: 'MW', name: 'Dr. Marcus Webb', specialty: 'Neurology' }
  ];

  // Patients Summary List (Includes Email)
  patients: PatientSummary[] = [
    { id: 'P-10024', initials: 'TB', name: 'Thomas Brennan', email: 't*****@patient.health' },
    { id: 'P-10025', initials: 'AC', name: 'Amelia Chen', email: 'a*****@patient.health' },
    { id: 'P-10026', initials: 'RO', name: 'Robert Okafor', email: 'r*****@patient.health' }
  ];

  onViewDoctorDetails(doctorId: number): void {
    console.log('Viewing details for Doctor ID:', doctorId);
  }

  onViewPatientDetails(patientId: string): void {
    console.log('Viewing details for Patient ID:', patientId);
  }
}