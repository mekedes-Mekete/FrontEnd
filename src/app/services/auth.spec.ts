import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('logout clears the current user', async () => {
    await firstValueFrom(service.login({ username: 'admin@medicore.health', password: 'x' }));
    service.logout();
    expect(service.currentUser).toBeNull();
  });
});
