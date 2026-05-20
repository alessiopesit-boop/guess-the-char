import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-lives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="lives">
      @for (i of slots(); track $index) {
        <span class="heart" [class.empty]="i >= count()">♥</span>
      }
    </span>
  `,
  styles: `
    .lives {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }
    .heart {
      color: var(--danger);
      font-size: 18px;
      line-height: 1;
    }
    .heart.empty {
      color: var(--border-strong);
    }
  `,
})
export class Lives {
  readonly count = input.required<number>();
  readonly max = input(3);

  protected readonly slots = computed(() =>
    Array.from({ length: this.max() }, (_, i) => i),
  );
}
