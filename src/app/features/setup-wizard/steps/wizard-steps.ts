import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { WizardStateService } from '../services/wizard-state.service';

/**
 * Step forms use Angular ReactiveFormsModule. Each editable step receives a
 * typed FormGroup from the shell; the shell owns validation (drives Next) and
 * copies the FormGroup value into WizardStateService on a valid advance.
 */

export type ClientForm = FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  notes: FormControl<string>;
  phone: FormControl<string>;
  company: FormControl<string>;
}>;

export type OrganizationForm = FormGroup<{
  name: FormControl<string>;
  country: FormControl<string>;
  timezone: FormControl<string>;
  currency: FormControl<string>;
}>;

export type BranchForm = FormGroup<{
  name: FormControl<string>;
  city: FormControl<string>;
  country: FormControl<string>;
  active: FormControl<boolean>;
}>;

export type VenueForm = FormGroup<{
  name: FormControl<string>;
  type: FormControl<string>;
  timezone: FormControl<string>;
  currency: FormControl<string>;
}>;

@Component({
  selector: 'app-wizard-path-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-slate-900">What are you setting up?</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="rounded-lg border p-4 text-left transition"
          [class.border-indigo-500]="state.path() === 'organization'"
          [class.ring-2]="state.path() === 'organization'"
          [class.ring-indigo-200]="state.path() === 'organization'"
          [class.border-slate-200]="state.path() !== 'organization'"
          (click)="state.setPath('organization')"
        >
          <p class="font-medium text-slate-900">Organization</p>
          <p class="mt-1 text-sm text-slate-500">
            A client, an organization, its first branch, and a venue under it.
          </p>
        </button>
        <button
          type="button"
          class="rounded-lg border p-4 text-left transition"
          [class.border-indigo-500]="state.path() === 'standalone'"
          [class.ring-2]="state.path() === 'standalone'"
          [class.ring-indigo-200]="state.path() === 'standalone'"
          [class.border-slate-200]="state.path() !== 'standalone'"
          (click)="state.setPath('standalone')"
        >
          <p class="font-medium text-slate-900">Standalone venue</p>
          <p class="mt-1 text-sm text-slate-500">
            A single client who directly owns one independent venue.
          </p>
        </button>
      </div>
    </div>
  `,
})
export class WizardPathStepComponent {
  protected readonly state = inject(WizardStateService);
}

@Component({
  selector: 'app-wizard-client-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex flex-col gap-4" [formGroup]="form()">
      <h2 class="text-base font-semibold text-slate-900">Client</h2>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Name <span class="text-red-500">*</span></label>
        <input
          type="text"
          aria-label="Name"
          formControlName="name"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        @if (form().controls.name.touched && form().controls.name.invalid) {
          <p class="text-xs text-red-600">Name is required.</p>
        }
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Email <span class="text-red-500">*</span></label>
        <input
          type="email"
          aria-label="Email"
          formControlName="email"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        @if (form().controls.email.touched && form().controls.email.invalid) {
          <p class="text-xs text-red-600">Enter a valid email.</p>
        }
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Notes</label>
        <input
          type="text"
          aria-label="Notes"
          formControlName="notes"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            formControlName="phone"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Company</label>
          <input
            type="text"
            formControlName="company"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  `,
})
export class WizardClientStepComponent {
  readonly form = input.required<ClientForm>();
}

@Component({
  selector: 'app-wizard-organization-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex flex-col gap-4" [formGroup]="form()">
      <h2 class="text-base font-semibold text-slate-900">Organization</h2>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Name <span class="text-red-500">*</span></label>
        <input
          type="text"
          formControlName="name"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        @if (form().controls.name.touched && form().controls.name.invalid) {
          <p class="text-xs text-red-600">Name is required.</p>
        }
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Country</label>
          <input
            type="text"
            formControlName="country"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Timezone</label>
          <input
            type="text"
            formControlName="timezone"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Currency</label>
          <input
            type="text"
            formControlName="currency"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  `,
})
export class WizardOrganizationStepComponent {
  readonly form = input.required<OrganizationForm>();
}

@Component({
  selector: 'app-wizard-branch-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex flex-col gap-4" [formGroup]="form()">
      <h2 class="text-base font-semibold text-slate-900">First branch</h2>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Branch name <span class="text-red-500">*</span></label>
        <input
          type="text"
          formControlName="name"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        @if (form().controls.name.touched && form().controls.name.invalid) {
          <p class="text-xs text-red-600">Branch name is required.</p>
        }
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">City</label>
          <input
            type="text"
            formControlName="city"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Country</label>
          <input
            type="text"
            formControlName="country"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          formControlName="active"
          class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Active
      </label>
    </div>
  `,
})
export class WizardBranchStepComponent {
  readonly form = input.required<BranchForm>();
}

@Component({
  selector: 'app-wizard-venue-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex flex-col gap-4" [formGroup]="form()">
      <h2 class="text-base font-semibold text-slate-900">Venue</h2>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-700">Venue name <span class="text-red-500">*</span></label>
        <input
          type="text"
          aria-label="Venue name"
          formControlName="name"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        @if (form().controls.name.touched && form().controls.name.invalid) {
          <p class="text-xs text-red-600">Venue name is required.</p>
        }
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Type <span class="text-red-500">*</span></label>
          <select
            formControlName="type"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
            <option value="bar">Bar</option>
            <option value="club">Club</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Timezone <span class="text-red-500">*</span></label>
          <input
            type="text"
            formControlName="timezone"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Currency <span class="text-red-500">*</span></label>
          <input
            type="text"
            formControlName="currency"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  `,
})
export class WizardVenueStepComponent {
  readonly form = input.required<VenueForm>();
}

@Component({
  selector: 'app-wizard-review-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      <h2 class="text-base font-semibold text-slate-900">Review &amp; create</h2>

      <section class="rounded-md border border-slate-200 p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">Client</h3>
          <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="edit('client')">
            Edit
          </button>
        </div>
        <dl class="grid grid-cols-2 gap-1 text-sm">
          <dt class="text-slate-400">Name</dt><dd class="text-slate-700">{{ d().client.name }}</dd>
          <dt class="text-slate-400">Email</dt><dd class="text-slate-700">{{ d().client.email }}</dd>
          <dt class="text-slate-400">Notes</dt><dd class="text-slate-700">{{ d().client.notes || '—' }}</dd>
          <dt class="text-slate-400">Phone</dt><dd class="text-slate-700">{{ d().client.phone || '—' }}</dd>
          <dt class="text-slate-400">Company</dt><dd class="text-slate-700">{{ d().client.company || '—' }}</dd>
        </dl>
      </section>

      @if (state.path() === 'organization') {
        <section class="rounded-md border border-slate-200 p-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-700">Organization</h3>
            <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="edit('organization')">
              Edit
            </button>
          </div>
          <dl class="grid grid-cols-2 gap-1 text-sm">
            <dt class="text-slate-400">Name</dt><dd class="text-slate-700">{{ d().organization.name }}</dd>
            <dt class="text-slate-400">Country</dt><dd class="text-slate-700">{{ d().organization.country || '—' }}</dd>
            <dt class="text-slate-400">Timezone</dt><dd class="text-slate-700">{{ d().organization.timezone || '—' }}</dd>
            <dt class="text-slate-400">Currency</dt><dd class="text-slate-700">{{ d().organization.currency || '—' }}</dd>
          </dl>
        </section>

        <section class="rounded-md border border-slate-200 p-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-700">Branch</h3>
            <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="edit('branch')">
              Edit
            </button>
          </div>
          <dl class="grid grid-cols-2 gap-1 text-sm">
            <dt class="text-slate-400">Name</dt><dd class="text-slate-700">{{ d().branch.name }}</dd>
            <dt class="text-slate-400">City</dt><dd class="text-slate-700">{{ d().branch.city || '—' }}</dd>
            <dt class="text-slate-400">Country</dt><dd class="text-slate-700">{{ d().branch.country || '—' }}</dd>
            <dt class="text-slate-400">Status</dt><dd class="text-slate-700">{{ d().branch.active ? 'Active' : 'Inactive' }}</dd>
          </dl>
        </section>
      }

      <section class="rounded-md border border-slate-200 p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">Venue</h3>
          <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="edit('venue')">
            Edit
          </button>
        </div>
        <dl class="grid grid-cols-2 gap-1 text-sm">
          <dt class="text-slate-400">Name</dt><dd class="text-slate-700">{{ d().venue.name }}</dd>
          <dt class="text-slate-400">Type</dt><dd class="text-slate-700 capitalize">{{ d().venue.type }}</dd>
          <dt class="text-slate-400">Timezone</dt><dd class="text-slate-700">{{ d().venue.timezone || '—' }}</dd>
          <dt class="text-slate-400">Currency</dt><dd class="text-slate-700">{{ d().venue.currency || '—' }}</dd>
        </dl>
      </section>
    </div>
  `,
})
export class WizardReviewStepComponent {
  protected readonly state = inject(WizardStateService);
  protected readonly d = this.state.data;

  protected edit(key: 'client' | 'organization' | 'branch' | 'venue'): void {
    const index = this.state.steps().findIndex((s) => s.key === key);
    if (index >= 0) this.state.goToStep(index);
  }
}
