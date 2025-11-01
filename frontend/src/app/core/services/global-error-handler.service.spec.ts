import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler.service';
import { ErrorNotificationService } from './error-notification.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let errorNotificationService: jasmine.SpyObj<ErrorNotificationService>;

  beforeEach(() => {
    const errorNotificationSpy = jasmine.createSpyObj('ErrorNotificationService', ['showError']);

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: ErrorNotificationService, useValue: errorNotificationSpy },
      ],
    });

    handler = TestBed.inject(GlobalErrorHandler);
    errorNotificationService = TestBed.inject(ErrorNotificationService) as jasmine.SpyObj<ErrorNotificationService>;
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  it('should handle generic Error', () => {
    const error = new Error('Test error');
    handler.handleError(error);
    expect(errorNotificationService.showError).toHaveBeenCalled();
  });

  it('should handle ChunkLoadError', () => {
    const error = new Error('Loading chunk failed');
    error.name = 'ChunkLoadError';
    handler.handleError(error);
    expect(errorNotificationService.showError).toHaveBeenCalledWith(
      'Application Update',
      jasmine.any(String),
      10000
    );
  });
});
