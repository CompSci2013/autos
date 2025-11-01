import { TestBed } from '@angular/core/testing';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ErrorNotificationService } from './error-notification.service';

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;
  let notificationService: jasmine.SpyObj<NzNotificationService>;

  beforeEach(() => {
    const notificationSpy = jasmine.createSpyObj('NzNotificationService', [
      'error',
      'warning',
      'info',
      'success',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ErrorNotificationService,
        { provide: NzNotificationService, useValue: notificationSpy },
      ],
    });

    service = TestBed.inject(ErrorNotificationService);
    notificationService = TestBed.inject(NzNotificationService) as jasmine.SpyObj<NzNotificationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show error notification', () => {
    service.showError('Test Error', 'Test message');
    expect(notificationService.error).toHaveBeenCalledWith('Test Error', 'Test message', { nzDuration: 5000 });
  });

  it('should show warning notification', () => {
    service.showWarning('Test Warning', 'Test message');
    expect(notificationService.warning).toHaveBeenCalledWith('Test Warning', 'Test message', { nzDuration: 4000 });
  });

  it('should categorize network error (status 0)', () => {
    const error = { status: 0 };
    service.handleHttpError(error);
    expect(notificationService.error).toHaveBeenCalledWith(
      'Network Error',
      jasmine.any(String),
      { nzDuration: 6000 }
    );
  });

  it('should categorize 404 error', () => {
    const error = { status: 404, error: {} };
    service.handleHttpError(error);
    expect(notificationService.warning).toHaveBeenCalledWith(
      'Not Found',
      jasmine.any(String),
      { nzDuration: 4000 }
    );
  });

  it('should categorize 500 error', () => {
    const error = { status: 500 };
    service.handleHttpError(error);
    expect(notificationService.error).toHaveBeenCalledWith(
      'Server Error',
      jasmine.any(String),
      { nzDuration: 6000 }
    );
  });
});
