import { Component, OnInit } from '@angular/core';
import { DomainConfigService } from './services/generic/domain-config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'AUTOS';

  constructor(private domainConfig: DomainConfigService) {}

  ngOnInit(): void {
    // Initialize domain configuration
    this.domainConfig.initialize('transport').subscribe({
      next: (config) => {
        console.log('[AppComponent] Domain initialized:', config.domain.name);
      },
      error: (err) => {
        console.error('[AppComponent] Failed to initialize domain:', err);
      }
    });
  }
}