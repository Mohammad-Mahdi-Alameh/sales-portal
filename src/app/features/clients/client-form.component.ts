import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientsService, CreateClient } from './clients.service';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-client-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './client-form.component.html',
})
export class ClientFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientsService);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);

  /** Present in edit mode (route `/clients/:id/edit`). */
  readonly id = input<string>();

  protected readonly editing = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    notes: [''],
    phone: [''],
    company: [''],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.editing.set(true);
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (client) => {
        this.form.patchValue({
          name: client.name,
          email: client.email,
          phone: client.phone ?? '',
          company: client.company ?? '',
          notes: client.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.serverError.set(err.message ?? 'Failed to load client');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.serverError.set(null);

    const raw = this.form.getRawValue();
    const body: CreateClient = {
      name: raw.name,
      email: raw.email,
      phone: raw.phone || undefined,
      company: raw.company || undefined,
      notes: raw.notes || undefined,
    };

    const id = this.id();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: (client) => {
        this.toast.success(this.editing() ? 'Client updated' : 'Client created');
        this.router.navigate(['/clients']);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message ?? 'Could not save client');
      },
    });
  }
}
