import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkspacePanel } from '../../models/workspace-panel.model';

@Injectable({
  providedIn: 'root'
})
export class GridTransferService {
  private leftGridSubject = new BehaviorSubject<WorkspacePanel[]>([]);
  private rightGridSubject = new BehaviorSubject<WorkspacePanel[]>([]);

  leftGrid$: Observable<WorkspacePanel[]> = this.leftGridSubject.asObservable();
  rightGrid$: Observable<WorkspacePanel[]> = this.rightGridSubject.asObservable();

  constructor() { }

  setGrids(leftItems: WorkspacePanel[], rightItems: WorkspacePanel[]): void {
    this.leftGridSubject.next(leftItems);
    this.rightGridSubject.next(rightItems);
  }

  transferItem(
    item: WorkspacePanel,
    from: 'left' | 'right',
    to: 'left' | 'right'
  ): void {
    if (from === to) return;

    const sourceItems = from === 'left'
      ? [...this.leftGridSubject.value]
      : [...this.rightGridSubject.value];

    const targetItems = to === 'left'
      ? [...this.leftGridSubject.value]
      : [...this.rightGridSubject.value];

    // Remove from source
    const index = sourceItems.findIndex(i => i.id === item.id);
    if (index > -1) {
      sourceItems.splice(index, 1);
    }

    // Add to target with new position
    const transferredItem: WorkspacePanel = {
      ...item,
      x: 0,  // Reset position
      y: 0
    };
    targetItems.push(transferredItem);

    // Update observables
    if (from === 'left') {
      this.leftGridSubject.next(sourceItems);
    } else {
      this.rightGridSubject.next(sourceItems);
    }

    if (to === 'left') {
      this.leftGridSubject.next(targetItems);
    } else {
      this.rightGridSubject.next(targetItems);
    }
  }

  addItem(grid: 'left' | 'right', item: WorkspacePanel): void {
    const items = grid === 'left'
      ? [...this.leftGridSubject.value]
      : [...this.rightGridSubject.value];

    items.push(item);

    if (grid === 'left') {
      this.leftGridSubject.next(items);
    } else {
      this.rightGridSubject.next(items);
    }
  }

  removeItem(grid: 'left' | 'right', itemId: string): void {
    const items = grid === 'left'
      ? [...this.leftGridSubject.value]
      : [...this.rightGridSubject.value];

    const index = items.findIndex(i => i.id === itemId);
    if (index > -1) {
      items.splice(index, 1);
    }

    if (grid === 'left') {
      this.leftGridSubject.next(items);
    } else {
      this.rightGridSubject.next(items);
    }
  }
}
