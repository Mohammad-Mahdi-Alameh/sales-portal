import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BranchesService } from './branches.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Organization } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-branch-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './branch-form.component.html',
})
export class BranchFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BranchesService);
  private readonly orgsService = inject(OrganizationsService);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Present only on the edit route. */
  readonly id = input<string>();

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly organizations = signal<Organization[]>([]);
  protected readonly editing = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    orgId: ['', [Validators.required]],
    name: ['', [Validators.required]],
    city: [''],
    country: [''],
    active: [true],
  });

  ngOnInit(): void {
    this.orgsService.list({ limit: 100 }).subscribe({
      next: (res) => this.organizations.set(res.data),
    });

    const preOrg = this.route.snapshot.queryParamMap.get('orgId');
    if (preOrg) this.form.controls.orgId.setValue(preOrg);

    const editId = this.id();
    if (editId) {
      this.editing.set(true);
      this.service.get(editId).subscribe({
        next: (b) =>
          this.form.patchValue({
            orgId: b.orgId,
            name: b.name,
            city: b.city ?? '',
            country: b.country ?? '',
            active: b.active ?? true,
          }),
        error: (err: ApiError) => this.serverError.set(err.message ?? 'Failed to load branch'),
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.serverError.set(null);
    const value = this.form.getRawValue();
    const editId = this.id();

    const request$ = editId
      ? this.service.update(editId, value)
      : this.service.create(value);

    request$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Branch updated' : 'Branch created');
        this.router.navigate(['/branches']);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message ?? 'Could not save branch');
      },
    });
  }
}
