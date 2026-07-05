import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { VenuesService, CreateVenue } from './venues.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { BranchesService } from '../branches/branches.service';
import { ClientsService } from '../clients/clients.service';
import { Branch, Client, Organization } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/ui/toast.service';

type VenueMode = 'standalone' | 'organization';

@Component({
  selector: 'app-venue-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './venue-create.component.html',
})
export class VenueCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(VenuesService);
  private readonly orgsService = inject(OrganizationsService);
  private readonly branchesService = inject(BranchesService);
  private readonly clients = inject(ClientsService);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mode = signal<VenueMode>('standalone');
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly organizations = signal<Organization[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly clientResults = signal<Client[]>([]);
  protected readonly showResults = signal(false);
  protected readonly selectedClient = signal<Client | null>(null);
  /** Text shown in the owner autocomplete input, decoupled from the selection. */
  protected readonly clientQuery = signal('');

  private readonly clientSearch$ = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    owner: ['', [Validators.required]],
    type: ['restaurant', [Validators.required]],
    timezone: ['Asia/Beirut', [Validators.required]],
    currency: ['USD', [Validators.required]],
    orgId: [''],
    branchId: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    this.orgsService.list({ limit: 100 }).subscribe({
      next: (res) => this.organizations.set(res.data),
    });

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

  protected setMode(mode: VenueMode): void {
    this.mode.set(mode);
    const orgId = this.form.controls.orgId;
    const branchId = this.form.controls.branchId;
    if (mode === 'organization') {
      orgId.addValidators(Validators.required);
      branchId.addValidators(Validators.required);
    } else {
      orgId.clearValidators();
      branchId.clearValidators();
      orgId.setValue('');
      branchId.setValue('');
      branchId.disable();
      this.branches.set([]);
    }
    orgId.updateValueAndValidity();
    branchId.updateValueAndValidity();
  }

  protected onOrgChange(orgId: string): void {
    this.form.controls.orgId.setValue(orgId);
    this.form.controls.branchId.setValue('');
    this.branches.set([]);
    if (!orgId) {
      this.form.controls.branchId.disable();
      return;
    }
    this.form.controls.branchId.enable();
    this.branchesService.list({ orgId, limit: 100 }).subscribe({
      next: (res) => this.branches.set(res.data),
    });
  }

  protected onClientSearch(term: string): void {
    this.clientQuery.set(term);
    this.selectedClient.set(null);
    this.form.controls.owner.setValue('');
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
    this.form.controls.owner.setValue(client.id);
    this.showResults.set(false);
  }

  protected clearClient(): void {
    this.selectedClient.set(null);
    this.clientQuery.set('');
    this.form.controls.owner.setValue('');
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

    const raw = this.form.getRawValue();
    const isOrg = this.mode() === 'organization';
    const body: CreateVenue = {
      name: raw.name,
      owner: raw.owner,
      type: raw.type,
      timezone: raw.timezone,
      currency: raw.currency,
      orgId: isOrg ? raw.orgId : null,
      branchId: isOrg ? raw.branchId : null,
    };

    this.service.create(body).subscribe({
      next: (venue) => {
        this.toast.success('Venue created');
        this.router.navigate(['/venues', venue.id]);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message ?? 'Could not create venue');
      },
    });
  }
}
