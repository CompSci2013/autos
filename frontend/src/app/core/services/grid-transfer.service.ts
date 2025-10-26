import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkspacePanel } from '../../models/workspace-panel.model';

@Injectable({
  providedIn: 'root'
})
export class GridTransferService {
  private gridsSubject = new BehaviorSubject<Map<string, WorkspacePanel[]>>(new Map());

  grids$: Observable<Map<string, WorkspacePanel[]>> = this.gridsSubject.asObservable();

  constructor() { }

  /**
   * Initialize grids with IDs and their items
   */
  setGrids(grids: Map<string, WorkspacePanel[]>): void {
    this.gridsSubject.next(new Map(grids));
  }

  /**
   * Get items for a specific grid
   */
  getGridItems(gridId: string): WorkspacePanel[] {
    return this.gridsSubject.value.get(gridId) || [];
  }

  /**
   * Get observable for a specific grid
   */
  getGrid$(gridId: string): Observable<WorkspacePanel[]> {
    return new Observable(observer => {
      this.grids$.subscribe(grids => {
        observer.next(grids.get(gridId) || []);
      });
    });
  }

  /**
   * Transfer item from one grid to another
   */
  transferItem(
    item: WorkspacePanel,
    fromGridId: string,
    toGridId: string
  ): void {
    if (fromGridId === toGridId) return;

    const grids = new Map(this.gridsSubject.value);
    const sourceItems = [...(grids.get(fromGridId) || [])];
    const targetItems = [...(grids.get(toGridId) || [])];

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

    // Update both grids
    grids.set(fromGridId, sourceItems);
    grids.set(toGridId, targetItems);

    this.gridsSubject.next(grids);
  }

  /**
   * Add item to a specific grid
   */
  addItem(gridId: string, item: WorkspacePanel): void {
    const grids = new Map(this.gridsSubject.value);
    const items = [...(grids.get(gridId) || [])];
    items.push(item);
    grids.set(gridId, items);
    this.gridsSubject.next(grids);
  }

  /**
   * Remove item from a specific grid
   */
  removeItem(gridId: string, itemId: string): void {
    const grids = new Map(this.gridsSubject.value);
    const items = [...(grids.get(gridId) || [])];
    const index = items.findIndex(i => i.id === itemId);

    if (index > -1) {
      items.splice(index, 1);
      grids.set(gridId, items);
      this.gridsSubject.next(grids);
    }
  }

  /**
   * Update items for a specific grid
   */
  updateGrid(gridId: string, items: WorkspacePanel[]): void {
    const grids = new Map(this.gridsSubject.value);
    grids.set(gridId, items);
    this.gridsSubject.next(grids);
  }
}
