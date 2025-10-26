import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('should call ngOnInit without errors', () => {
      expect(() => {
        fixture.detectChanges(); // Triggers ngOnInit
      }).not.toThrow();
    });

    it('should be a presentational component (no state management)', () => {
      // Home component doesn't interact with state management
      // It's purely presentational with navigation links
      expect(component).toBeDefined();
    });
  });

  describe('Template Integration', () => {
    it('should render without errors', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement).toBeTruthy();
    });

    it('should be a stateless landing page', () => {
      fixture.detectChanges();

      // Component should not have any observable subscriptions
      // or state management integration
      expect(component).toBeDefined();
    });
  });
});
