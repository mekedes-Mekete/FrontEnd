import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { API_BASE_URL } from './api.config';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('authenticates against the backend and stores the returned session', () => {
    let signedInUser: ReturnType<typeof service.login> extends import('rxjs').Observable<infer T> ? T : never;

    service.login({ username: 'admin@medicore.health', password: 'Password123!' }).subscribe(user => {
      signedInUser = user;
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/api/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'admin@medicore.health', password: 'Password123!' });
    request.flush({
      token: 'test-jwt',
      role: 'ROLE_ADMIN',
      userId: 7,
      fullName: 'Sarah Mitchell',
      email: 'admin@medicore.health'
    });

    expect(signedInUser!).toMatchObject({ id: 7, role: 'ROLE_ADMIN', email: 'admin@medicore.health' });
    expect(service.currentUser?.fullName).toBe('Sarah Mitchell');
    expect(service.getToken()).toBe('test-jwt');
  });

  it('revokes the backend token and clears the local session on logout', () => {
    sessionStorage.setItem('mediscribe.auth.token', 'test-jwt');
    sessionStorage.setItem('mediscribe.auth.user', JSON.stringify({
      id: 7, username: 'admin@medicore.health', email: 'admin@medicore.health',
      fullName: 'Sarah Mitchell', role: 'ROLE_ADMIN'
    }));
    service.currentUser = JSON.parse(sessionStorage.getItem('mediscribe.auth.user')!);

    service.logout();

    const request = httpMock.expectOne(`${API_BASE_URL}/api/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    expect(service.currentUser).toBeNull();
    expect(service.getToken()).toBeNull();
    request.flush(null);
  });
});
