import { ChangeDetectionStrategy, Component, HostListener, effect, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WizardStateService } from './services/wizard-state.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import {
  WizardPathStepComponent,
  WizardClientStepComponent,
  WizardOrganizationStepComponent,
  WizardBranchStepComponent,
  WizardVenueStepComponent,
  WizardReviewStepComponent,
} from './steps/wizard-steps';

@Component({
  selector: 'app-setup-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WizardPathStepComponent,
    WizardClientStepComponent,
    WizardOrganizationStepComponent,
    WizardBranchStepComponent,
    WizardVenueStepComponent,
    WizardReviewStepComponent,
  ],
  templateUrl: './setup-wizard.component.html',
})
export class SetupWizardComponent {
  protected readonly state = inject(WizardStateService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly clientForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    phone: [''],
    company: [''],
  });

  protected readonly organizationForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    country: [''],
    timezone: [''],
    currency: [''],
  });

  protected readonly branchForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    city: [''],
    country: [''],
    active: [true],
  });

  protected readonly venueForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    timezone: ['', Validators.required],
    currency: ['', Validators.required],
  });

  constructor() {
    // Mirror WizardStateService's saved values into the forms whenever the
    // store changes (localStorage restore, valid Next writes, reset). In-progress
    // typing never touches the store, so it is never clobbered here.
    effect(() => {
      const data = this.state.data();
      this.clientForm.patchValue(data.client);
      this.organizationForm.patchValue(data.organization);
      this.branchForm.patchValue(data.branch);
      this.venueForm.patchValue(data.venue);
    });
  }

  /** FormGroup backing the active step, or null for path/review (no inputs). */
  private activeForm() {
    switch (this.state.activeStep().key) {
      case 'client':
        return this.clientForm;
      case 'organization':
        return this.organizationForm;
      case 'branch':
        return this.branchForm;
      case 'venue':
        return this.venueForm;
      default:
        return null;
    }
  }

  /** Next/Finish gating — disabled when the active step's form is invalid. */
  protected nextDisabled(): boolean {
    return this.activeForm()?.invalid ?? false;
  }

  @HostListener('document:keydown.enter', ['$event'])
  protected onEnter(event: Event): void {
    // Ignore Enter inside selects/textareas; primary action = advance.
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (this.state.submitting()) return;
    event.preventDefault();
    if (this.state.isLastStep()) {
      this.finish();
    } else if (!this.nextDisabled()) {
      this.next();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cancel();
  }

  protected next(): void {
    const form = this.activeForm();
    if (form) {
      if (form.invalid) {
        form.markAllAsTouched();
        return;
      }
      // Write the FormGroup value into the store before advancing.
      this.writeActiveFormToState();
    }
    this.state.next();
  }

  protected back(): void {
    this.state.back();
    // Patch the now-active FormGroup from the store's saved values.
    this.syncActiveForm();
  }

  private writeActiveFormToState(): void {
    switch (this.state.activeStep().key) {
      case 'client':
        this.state.patch('client', this.clientForm.getRawValue());
        break;
      case 'organization':
        this.state.patch('organization', this.organizationForm.getRawValue());
        break;
      case 'branch':
        this.state.patch('branch', this.branchForm.getRawValue());
        break;
      case 'venue':
        this.state.patch('venue', this.venueForm.getRawValue());
        break;
    }
  }

  private syncActiveForm(): void {
    const data = this.state.data();
    switch (this.state.activeStep().key) {
      case 'client':
        this.clientForm.patchValue(data.client);
        break;
      case 'organization':
        this.organizationForm.patchValue(data.organization);
        break;
      case 'branch':
        this.branchForm.patchValue(data.branch);
        break;
      case 'venue':
        this.venueForm.patchValue(data.venue);
        break;
    }
  }

  protected async cancel(): Promise<void> {
    if (this.state.submitting()) return;
    if (this.state.dirty() || this.formsEdited()) {
      const ok = await this.confirm.ask({
        title: 'Discard setup?',
        message: 'Your progress in this wizard will be lost.',
        confirmLabel: 'Discard',
        danger: true,
      });
      if (!ok) return;
    }
    this.state.reset();
    this.router.navigate(['/dashboard']);
  }

  /** True once the user has typed into any step form (pristine forms = empty). */
  private formsEdited(): boolean {
    return (
      this.clientForm.dirty ||
      this.organizationForm.dirty ||
      this.branchForm.dirty ||
      this.venueForm.dirty
    );
  }

  protected async finish(): Promise<void> {
    const venueId = await this.state.submit();
    if (venueId) {
      this.toast.success('Setup complete');
      this.router.navigate(['/venues', venueId]);
    }
  }
}
