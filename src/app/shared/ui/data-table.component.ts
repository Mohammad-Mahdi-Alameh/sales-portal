import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import { Pagination } from '../../core/models/api.model';
import { SortOrder } from '../../core/models/query.model';
import { ColumnDef } from './column-def';

export interface SortState {
  sortBy: string;
  sortOrder: SortOrder;
}

/**
 * Reusable, stateful table shell.
 * Owns search, single-column sort, pagination, and the
 * loading / empty / error presentation so every list stays consistent.
 * Each list projects its own row cells through a `[appRow]` template.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T> {
  readonly columns = input.required<ColumnDef[]>();
  readonly rows = input.required<T[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly pagination = input<Pagination | null>(null);
  readonly searchTerm = input('');
  readonly searchPlaceholder = input('Search…');
  readonly sort = input<SortState | null>(null);

  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input('No records match the current view.');
  readonly emptyActionLabel = input<string | null>(null);

  readonly searchChange = output<string>();
  readonly sortChange = output<SortState>();
  readonly pageChange = output<number>();
  readonly retry = output<void>();
  readonly emptyAction = output<void>();

  /** Row cell template supplied by the consuming list. */
  readonly rowTemplate = contentChild.required<TemplateRef<{ $implicit: T; index: number }>>('appRow');

  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly showEmpty = computed(
    () => !this.loading() && !this.error() && this.rows().length === 0,
  );

  protected onSearch(value: string): void {
    this.searchChange.emit(value);
  }

  protected onSort(column: ColumnDef): void {
    if (!column.sortable) return;
    const current = this.sort();
    const nextOrder: SortOrder =
      current?.sortBy === column.key && current.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ sortBy: column.key, sortOrder: nextOrder });
  }

  protected sortIndicator(column: ColumnDef): string {
    const current = this.sort();
    if (!column.sortable || current?.sortBy !== column.key) return '';
    return current.sortOrder === 'asc' ? '▲' : '▼';
  }

  protected goTo(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages || page === p.page) return;
    this.pageChange.emit(page);
  }
}
