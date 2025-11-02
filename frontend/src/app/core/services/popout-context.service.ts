import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Generic message format for pop-out communication
 */
export interface PopOutMessage {
  type: string;
  payload?: any;
}

/**
 * Service to provide pop-out window context and communication
 *
 * This service allows components to:
 * 1. Detect if they are running in a pop-out window
 * 2. Access BroadcastChannel for communication with main window
 * 3. Send/receive messages in a standardized format
 *
 * Architecture:
 * - Pop-out window initializes this service with panel ID
 * - Components check isInPopOut() to determine their mode
 * - In pop-out mode, components use sendMessage() and messages$ for communication
 * - In normal mode, components interact with services directly
 */
@Injectable({
  providedIn: 'root'
})
export class PopOutContextService {
  private isPopOut = false;
  private channel?: BroadcastChannel;
  private panelId?: string;
  private messagesSubject = new Subject<PopOutMessage>();

  // Observable stream of messages from main window
  public messages$: Observable<PopOutMessage> = this.messagesSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  /**
   * Initialize service as pop-out window
   * Called by PanelPopoutComponent on initialization
   */
  initializeAsPopOut(panelId: string): void {
    this.isPopOut = true;
    this.panelId = panelId;
    this.channel = new BroadcastChannel(`panel-${panelId}`);

    // Listen for messages from main window
    this.channel.onmessage = (event) => {
      // BroadcastChannel callbacks run outside Angular's zone
      this.ngZone.run(() => {
        this.messagesSubject.next(event.data);
      });
    };

    console.log(`[PopOutContext] Initialized as pop-out for panel: ${panelId}`);

    // Notify main window that pop-out is ready
    this.sendMessage({ type: 'PANEL_READY' });
  }

  /**
   * Check if current context is a pop-out window
   */
  isInPopOut(): boolean {
    return this.isPopOut;
  }

  /**
   * Get the panel ID (only available in pop-out mode)
   */
  getPanelId(): string | undefined {
    return this.panelId;
  }

  /**
   * Send message to main window (pop-out mode only)
   */
  sendMessage(message: PopOutMessage): void {
    if (!this.isPopOut || !this.channel) {
      console.warn('[PopOutContext] Cannot send message: not in pop-out mode');
      return;
    }

    console.log('[PopOutContext] Sending message:', message.type);
    this.channel.postMessage(message);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }
    this.messagesSubject.complete();
    this.isPopOut = false;
    this.panelId = undefined;
  }
}
