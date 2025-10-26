import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationComponent } from './navigation.component';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(mockRouter, 'url', {
      get: jasmine.createSpy('url').and.returnValue('/'),
      configurable: true,
    });

    await TestBed.configureTestingModule({
      declarations: [NavigationComponent],
      providers: [{ provide: Router, useValue: mockRouter }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Route Active Detection', () => {
    it('should return true when current route matches', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/discover',
        configurable: true,
      });

      expect(component.isActive('/discover')).toBe(true);
    });

    it('should return false when current route does not match', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/discover',
        configurable: true,
      });

      expect(component.isActive('/workshop')).toBe(false);
    });

    it('should handle root route correctly', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/',
        configurable: true,
      });

      expect(component.isActive('/')).toBe(true);
      expect(component.isActive('/discover')).toBe(false);
    });

    it('should handle routes with query parameters', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/discover?models=Ford:F-150',
        configurable: true,
      });

      // Exact match required
      expect(component.isActive('/discover?models=Ford:F-150')).toBe(true);
      expect(component.isActive('/discover')).toBe(false);
    });
  });

  describe('Multiple Routes', () => {
    it('should correctly identify active route among multiple options', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/workshop',
        configurable: true,
      });

      expect(component.isActive('/')).toBe(false);
      expect(component.isActive('/discover')).toBe(false);
      expect(component.isActive('/workshop')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty route', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '',
        configurable: true,
      });

      expect(component.isActive('')).toBe(true);
    });

    it('should be case-sensitive', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/Discover',
        configurable: true,
      });

      expect(component.isActive('/Discover')).toBe(true);
      expect(component.isActive('/discover')).toBe(false);
    });

    it('should handle routes with trailing slash', () => {
      Object.defineProperty(mockRouter, 'url', {
        get: () => '/discover/',
        configurable: true,
      });

      expect(component.isActive('/discover/')).toBe(true);
      expect(component.isActive('/discover')).toBe(false);
    });
  });
});
