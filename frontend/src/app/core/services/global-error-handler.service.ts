import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorNotificationService } from './error-notification.service';

/**
 * Global Error Handler
 *
 * Catches all uncaught errors in the application:
 * - Component errors
 * - Promise rejections
 * - RxJS errors that weren't caught
 * - General JavaScript errors
 *
 * Prevents application crashes and provides user feedback
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse): void {
    // Get error notification service (use injector to avoid circular dependency)
    const errorNotification = this.injector.get(ErrorNotificationService);

    // Log the full error for debugging
    console.error('Global Error Handler:', error);

    // Handle HTTP errors (already handled by interceptor, but log here too)
    if (error instanceof HttpErrorResponse) {
      console.error('HTTP error caught in global handler (already handled by interceptor)');
      return;
    }

    // Handle client-side errors
    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'ChunkLoadError') {
        errorNotification.showError(
          'Application Update',
          'A new version is available. Please refresh the page.',
          10000
        );
        return;
      }

      // Generic error handling
      errorNotification.showError(
        'Application Error',
        'An unexpected error occurred. The application is still running, but some features may not work correctly.',
        8000
      );

      // Log to console for debugging
      console.error('Client Error Details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else {
      // Unknown error type
      errorNotification.showError(
        'Unknown Error',
        'An unexpected error occurred. Please refresh the page if the application is not working correctly.',
        8000
      );
      console.error('Unknown error type:', error);
    }
  }
}
