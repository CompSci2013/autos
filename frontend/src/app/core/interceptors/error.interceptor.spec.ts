import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ErrorInterceptor } from './error.interceptor';
import { ErrorNotificationService } from '../services/error-notification.service';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let errorNotificationService: jasmine.SpyObj<ErrorNotificationService>;

  beforeEach(() => {
    const errorNotificationSpy = jasmine.createSpyObj('ErrorNotificationService', ['handleHttpError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ErrorNotificationService, useValue: errorNotificationSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorInterceptor,
          multi: true,
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    errorNotificationService = TestBed.inject(ErrorNotificationService) as jasmine.SpyObj<ErrorNotificationService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should handle HTTP error and show notification', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
        expect(errorNotificationService.handleHttpError).toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should pass through successful requests', () => {
    const testUrl = '/api/test';
    const testData = { data: 'test' };

    httpClient.get(testUrl).subscribe(data => {
      expect(data).toEqual(testData);
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(testData);
  });
});
