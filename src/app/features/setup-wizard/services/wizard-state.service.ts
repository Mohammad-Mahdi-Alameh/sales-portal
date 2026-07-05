import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientsService } from '../../clients/clients.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { BranchesService } from '../../branches/branches.service';
import { VenuesService } from '../../venues/venues.service';
import { ApiError } from '../../../core/models/api.model';

export type WizardPath = 'organization' | 'standalone';

export interface WizardData {
  client: { name: string; email: string; phone: string; company: string };
  organization: { name: string; country: string; timezone: string; currency: string };
  branch: { name: string; city: string; country: string; active: boolean };
  venue: { name: string; type: string; timezone: string; currency: string };
}

/** IDs of entities already persisted — never re-created on retry. */
export interface CreatedIds {
  clientId?: string;
  orgId?: string;
  branchId?: string;
  venueId?: string;
}

export interface WizardStep {
  key: 'path' | 'client' | 'organization' | 'branch' | 'venue' | 'review';
  label: string;
}

const STORAGE_KEY = 'sp.wizard';

const EMPTY_DATA: WizardData = {
  client: { name: '', email: '', phone: '', company: '' },
  organization: { name: '', country: 'JO', timezone: 'Asia/Amman', currency: 'JOD' },
  branch: { name: '', city: '', country: '', active: true },
  venue: { name: '', type: 'restaurant', timezone: 'Asia/Amman', currency: 'JOD' },
};

const ORG_STEPS: WizardStep[] = [
  { key: 'path', label: 'Path' },
  { key: 'client', label: 'Client' },
  { key: 'organization', label: 'Organization' },
  { key: 'branch', label: 'Branch' },
  { key: 'venue', label: 'Venue' },
  { key: 'review', label: 'Review' },
];

const STANDALONE_STEPS: WizardStep[] = [
  { key: 'path', label: 'Path' },
  { key: 'client', label: 'Client' },
  { key: 'venue', label: 'Venue' },
  { key: 'review', label: 'Review' },
];

/**
 * Signal-based state for the multi-step setup wizard.
 *
 * Responsibilities:
 *  - single unified `data` object across every step
 *  - persist `{ path, currentStep, data, createdIds }` to localStorage (loaded once)
 *  - run the sequential create sequence, remembering what already succeeded
 *  - allow retry that skips already-created entities
 *  - clear the cache only on a fully successful run
 */
@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly clients = inject(ClientsService);
  private readonly organizations = inject(OrganizationsService);
  private readonly branches = inject(BranchesService);
  private readonly venues = inject(VenuesService);

  readonly path = signal<WizardPath>('organization');
  readonly currentStep = signal(0);
  readonly data = signal<WizardData>(structuredClone(EMPTY_DATA));
  readonly createdIds = signal<CreatedIds>({});

  readonly submitting = signal(false);
  readonly progressMessage = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  /** Step key where the last submit failed, for inline surfacing. */
  readonly failedStep = signal<WizardStep['key'] | null>(null);

  /** Fields the user has blurred — drives when validation messages appear. */
  readonly touched = signal<ReadonlySet<string>>(new Set());

  static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  markTouched(field: string): void {
    if (this.touched().has(field)) return;
    const next = new Set(this.touched());
    next.add(field);
    this.touched.set(next);
  }

  isTouched(field: string): boolean {
    return this.touched().has(field);
  }

  emailValid(email: string): boolean {
    return WizardStateService.EMAIL_RE.test(email);
  }

  readonly steps = computed<WizardStep[]>(() =>
    this.path() === 'organization' ? ORG_STEPS : STANDALONE_STEPS,
  );
  readonly activeStep = computed(() => this.steps()[this.currentStep()]);
  readonly isLastStep = computed(() => this.currentStep() === this.steps().length - 1);

  /** Whether the active step's required fields are satisfied — drives Next/Finish. */
  readonly stepValid = computed(() => this.isStepValid(this.activeStep().key));

  /** True once the user has entered data or created any entity. */
  readonly dirty = computed(() => {
    const ids = this.createdIds();
    if (ids.clientId || ids.orgId || ids.branchId || ids.venueId) return true;
    return JSON.stringify(this.data()) !== JSON.stringify(EMPTY_DATA);
  });

  constructor() {
    this.restore();
    // Persist whenever any tracked piece of state changes.
    effect(() => {
      const snapshot = {
        path: this.path(),
        currentStep: this.currentStep(),
        data: this.data(),
        createdIds: this.createdIds(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        /* storage unavailable — ignore */
      }
    });
  }

  setPath(path: WizardPath): void {
    if (path === this.path()) return;
    this.path.set(path);
  }

  patch<K extends keyof WizardData>(section: K, value: Partial<WizardData[K]>): void {
    const current = this.data();
    const next = { ...current[section], ...value };
    // Skip write when nothing actually changed (distinctUntilChanged equivalent).
    if (JSON.stringify(next) === JSON.stringify(current[section])) return;
    this.data.set({ ...current, [section]: next });
  }

  next(): void {
    if (this.isLastStep()) return;
    this.currentStep.update((s) => s + 1);
  }

  back(): void {
    if (this.currentStep() === 0) return;
    this.currentStep.update((s) => s - 1);
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps().length) return;
    this.currentStep.set(index);
  }

  reset(): void {
    this.path.set('organization');
    this.currentStep.set(0);
    this.data.set(structuredClone(EMPTY_DATA));
    this.createdIds.set({});
    this.submitError.set(null);
    this.failedStep.set(null);
    this.touched.set(new Set());
    this.clearCache();
  }

  /** Run (or retry) the sequential create pipeline. Returns the venue id on success. */
  async submit(): Promise<string | null> {
    if (this.submitting()) return null;
    this.submitting.set(true);
    this.submitError.set(null);
    this.failedStep.set(null);

    try {
      const data = this.data();
      const ids = { ...this.createdIds() };

      // 1. Client (both paths)
      if (!ids.clientId) {
        this.progressMessage.set('Creating client…');
        const client = await firstValueFrom(
          this.clients.create({
            name: data.client.name,
            email: data.client.email,
            phone: data.client.phone || undefined,
            company: data.client.company || undefined,
          }),
        );
        ids.clientId = client.id;
        this.createdIds.set({ ...ids });
      }

      if (this.path() === 'organization') {
        // 2. Organization — new clientId as adminId
        if (!ids.orgId) {
          this.progressMessage.set('Creating organization…');
          const org = await firstValueFrom(
            this.organizations.create({
              name: data.organization.name,
              adminId: ids.clientId!,
              country: data.organization.country,
              timezone: data.organization.timezone,
              currency: data.organization.currency,
            }),
          );
          ids.orgId = org.id;
          this.createdIds.set({ ...ids });
        }

        // 3. Branch — new orgId
        if (!ids.branchId) {
          this.progressMessage.set('Creating branch…');
          const branch = await firstValueFrom(
            this.branches.create({
              orgId: ids.orgId!,
              name: data.branch.name,
              city: data.branch.city || undefined,
            }),
          );
          ids.branchId = branch.id;
          this.createdIds.set({ ...ids });
        }
      }

      // 4. Venue (both paths)
      if (!ids.venueId) {
        this.progressMessage.set('Creating venue…');
        const isOrg = this.path() === 'organization';
        const venue = await firstValueFrom(
          this.venues.create({
            name: data.venue.name,
            owner: ids.clientId!,
            orgId: isOrg ? ids.orgId! : null,
            branchId: isOrg ? ids.branchId! : null,
            type: data.venue.type,
            timezone: data.venue.timezone,
            currency: data.venue.currency,
          }),
        );
        ids.venueId = venue.id;
        this.createdIds.set({ ...ids });
      }

      // Total success — clear persistence and reset working state.
      this.submitting.set(false);
      this.progressMessage.set(null);
      const venueId = ids.venueId!;
      this.reset();
      return venueId;
    } catch (err) {
      const apiErr = err as ApiError;
      this.submitting.set(false);
      this.progressMessage.set(null);
      this.submitError.set(apiErr?.message ?? 'A step failed. Retry to continue.');
      this.failedStep.set(this.failedStepFromIds());
      return null;
    }
  }

  /** Retry re-invokes submit; already-created ids are skipped inside. */
  retry(): Promise<string | null> {
    return this.submit();
  }

  isStepValid(key: WizardStep['key']): boolean {
    const d = this.data();
    switch (key) {
      case 'path':
      case 'review':
        return true;
      case 'client':
        return d.client.name.trim().length > 0 && WizardStateService.EMAIL_RE.test(d.client.email);
      case 'organization':
        return d.organization.name.trim().length > 0;
      case 'branch':
        return d.branch.name.trim().length > 0;
      case 'venue':
        return (
          d.venue.name.trim().length > 0 &&
          d.venue.type.trim().length > 0 &&
          d.venue.timezone.trim().length > 0 &&
          d.venue.currency.trim().length > 0
        );
    }
  }

  private failedStepFromIds(): WizardStep['key'] {
    const ids = this.createdIds();
    if (!ids.clientId) return 'client';
    if (this.path() === 'organization') {
      if (!ids.orgId) return 'organization';
      if (!ids.branchId) return 'branch';
    }
    return 'venue';
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        path?: WizardPath;
        currentStep?: number;
        data?: WizardData;
        createdIds?: CreatedIds;
      };
      if (parsed.path) this.path.set(parsed.path);
      if (typeof parsed.currentStep === 'number') this.currentStep.set(parsed.currentStep);
      if (parsed.data) this.data.set({ ...structuredClone(EMPTY_DATA), ...parsed.data });
      if (parsed.createdIds) this.createdIds.set(parsed.createdIds);
    } catch {
      /* corrupt cache — start fresh */
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
