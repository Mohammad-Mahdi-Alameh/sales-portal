import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ClientsService } from './clients.service';
import { Client } from '../../core/models/domain.model';
import { ApiError, Pagination } from '../../core/models/api.model';
import { ListQuery } from '../../core/models/query.model';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { DataTableComponent, SortState } from '../../shared/ui/data-table.component';
import { ColumnDef } from '../../shared/ui/column-def';

@Component({
  selector: 'app-clients-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent],
  templateUrl: './clients-list.component.html',
})
export class ClientsListComponent implements OnInit {
  private readonly service = inject(ClientsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Only admins may delete clients. */
  protected readonly isAdmin = inject(AuthService).isAdmin;

  protected readonly rows = signal<Client[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly sort = signal<SortState>({ sortBy: 'createdAt', sortOrder: 'desc' });
  protected readonly rowError = signal<string | null>(null);

  private readonly search$ = new Subject<string>();

  protected readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'venueCount', label: 'Venues', align: 'center' },
    { key: 'actions', label: '', align: 'right' },
  ];

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.search.set(term);
        this.load(1);
      });
    this.load(1);
  }

  protected load(page = this.pagination()?.page ?? 1): void {
    this.loading.set(true);
    this.error.set(null);
    const query: ListQuery = {
      page,
      limit: 10,
      search: this.search() || undefined,
      sortBy: this.sort().sortBy,
      sortOrder: this.sort().sortOrder,
    };
    this.service.list(query).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message ?? 'Failed to load clients');
        this.loading.set(false);
      },
    });
  }

  protected onSearch(term: string): void {
    this.search$.next(term);
  }

  protected onSort(sort: SortState): void {
    this.sort.set(sort);
    this.load(1);
  }

  protected async remove(client: Client): Promise<void> {
    this.rowError.set(null);

    // Known dependency → block before issuing the request, so the mock's 409
    // never hits the network (avoids a browser console error) and we still
    // report the exact count.
    const knownVenues = client.venueCount ?? 0;
    if (knownVenues > 0) {
      this.blockDelete(client.name, knownVenues);
      return;
    }

    const ok = await this.confirm.ask({
      title: 'Delete client',
      message: `Delete “${client.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.service.remove(client.id).subscribe({
      next: () => {
        this.toast.success('Client deleted');
        this.load();
      },
      error: (err: ApiError) => {
        let msg: string;
        if (err.code === 'HAS_DEPENDENCIES') {
          const d = (err.details ?? {}) as { venues?: number; serials?: number };
          const parts: string[] = [];
          if (d.venues) parts.push(`${d.venues} venue${d.venues === 1 ? '' : 's'}`);
          if (d.serials) parts.push(`${d.serials} serial${d.serials === 1 ? '' : 's'}`);
          msg = `Cannot delete “${client.name}” — it still owns ${
            parts.length ? parts.join(' and ') : 'dependent records'
          }.`;
        } else {
          msg = err.message ?? 'Could not delete client';
        }
        this.rowError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  private blockDelete(name: string, venues: number): void {
    const msg = `Cannot delete “${name}” — it still owns ${venues} venue${
      venues === 1 ? '' : 's'
    }.`;
    this.rowError.set(msg);
    this.toast.error(msg);
  }

  protected goNew(): void {
    this.router.navigate(['/clients/new']);
  }
}
