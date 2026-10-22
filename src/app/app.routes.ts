import { Routes } from '@angular/router';
import { LoginComponent } from './login-component/login-component';
import { AdminComponent } from './admin-component/admin-component';
import { DoctorComponent } from './doctor-component/doctor-component';
import { PatientComponent } from './patient-component/patient-component';

export const routes: Routes = [
  // Default path goes to login page
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // App pages
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'doctor', component: DoctorComponent },
  { path: 'patient', component: PatientComponent },

  // Redirect unknown URLs back to login
  { path: '**', redirectTo: 'login' }
];