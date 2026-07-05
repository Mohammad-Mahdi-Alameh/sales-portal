import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { OrganizationsService } from './organizations.service';
import { ClientsService } from '../clients/clients.service';
import { Client } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-organization-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './organization-create.component.html',
})
export class OrganizationCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OrganizationsService);
  private readonly clients = inject(ClientsService);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly clientResults = signal<Client[]>([]);
  protected readonly showResults = signal(false);
  protected readonly selectedClient = signal<Client | null>(null);
  /** Text shown in the autocomplete input, decoupled from the selection. */
  protected readonly clientQuery = signal('');

  private readonly clientSearch$ = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    adminId: ['', [Validators.required]],
    country: ['Lebanon'],
    currency: ['USD'],
  });

  constructor() {
    this.clientSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => this.clients.list({ search: term || undefined, limit: 8 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.clientResults.set(res.data);
          this.showResults.set(true);
        },
        error: () => this.clientResults.set([]),
      });
  }

  protected onClientSearch(term: string): void {
    this.clientQuery.set(term);
    this.selectedClient.set(null);
    this.form.controls.adminId.setValue('');
    if (!term.trim()) {
      this.clientResults.set([]);
      this.showResults.set(false);
      return;
    }
    this.clientSearch$.next(term);
  }

  protected pickClient(client: Client): void {
    this.selectedClient.set(client);
    this.clientQuery.set(client.name);
    this.form.controls.adminId.setValue(client.id);
    this.showResults.set(false);
  }

  protected clearClient(): void {
    this.selectedClient.set(null);
    this.clientQuery.set('');
    this.form.controls.adminId.setValue('');
    this.clientResults.set([]);
    this.showResults.set(false);
  }

  protected closeResults(): void {
    this.showResults.set(false);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.serverError.set(null);
    this.service.create(this.form.getRawValue()).subscribe({
      next: (org) => {
        this.toast.success('Organization created');
        this.router.navigate(['/organizations', org.id]);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message ?? 'Could not create organization');
      },
    });
  }
}
