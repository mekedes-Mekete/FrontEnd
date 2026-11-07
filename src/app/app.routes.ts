import { Routes } from '@angular/router';
import { LoginComponent } from './login-component/login-component';
import { AdminComponent } from './admin-component/admin-component';
import { DoctorComponent } from './doctor-component/doctor-component';
import { PatientComponent } from './patient-component/patient-component';
import { AdminDashboardComponent } from './admin/admin-dashboard-component/admin-dashboard-component';
import { DoctorListComponent } from './admin/doctor-list-component/doctor-list-component';
import { DoctorProfileComponent } from './admin/doctor-profile-component/doctor-profile-component';
import { PatientListComponent } from './admin/patient-list-component/patient-list-component';
import { PatientDetailComponent } from './admin/patient-detail-component/patient-detail-component';
import { AccountsComponent } from './admin/accounts-component/accounts-component';

export const routes: Routes = [
  // Default path goes to login page
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  // Admin area: AdminComponent is the layout, children fill its <router-outlet>.
  // TODO (when auth exists): add canActivate: [roleGuard] with data: { role: 'ROLE_ADMIN' }.
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      { path: '', component: AdminDashboardComponent, title: 'Admin dashboard · MediScribe AI' },
      { path: 'doctors', component: DoctorListComponent, title: 'Doctors · MediScribe AI' },           // UC3
      { path: 'doctors/:id', component: DoctorProfileComponent, title: 'Doctor profile · MediScribe AI' }, // UC3
      { path: 'patients', component: PatientListComponent, title: 'Patients · MediScribe AI' },        // UC4
      { path: 'patients/:id', component: PatientDetailComponent, title: 'Patient · MediScribe AI' },  // UC4, UC5, UC6
      { path: 'accounts', component: AccountsComponent, title: 'Accounts · MediScribe AI' },           // UC7
    ],
  },

  { path: 'doctor', component: DoctorComponent },
  { path: 'patient', component: PatientComponent },

  // Redirect unknown URLs back to login
  { path: '**', redirectTo: 'login' },
];
