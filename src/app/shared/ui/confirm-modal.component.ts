import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../core/ui/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as req) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        (click)="confirm.respond(false)"
      >
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="req.title"
          class="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <h2 class="text-base font-semibold text-slate-900">{{ req.title }}</h2>
          <p class="mt-2 text-sm text-slate-600">{{ req.message }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              (click)="confirm.respond(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium text-white"
              [class.bg-red-600]="req.danger"
              [class.hover:bg-red-700]="req.danger"
              [class.bg-indigo-600]="!req.danger"
              [class.hover:bg-indigo-700]="!req.danger"
              (click)="confirm.respond(true)"
            >
              {{ req.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  protected readonly confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.pending()) this.confirm.respond(false);
  }
}
