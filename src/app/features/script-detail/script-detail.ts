import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { GROUPS, scriptById } from '../../core/data/scripts';
import { AppBar } from '../../shared/app-bar';

@Component({
  selector: 'app-script-detail',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './script-detail.html',
  styleUrl: './script-detail.css',
})
export class ScriptDetail {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly script = computed(() => {
    const id = this.params().get('id');
    return id ? scriptById(id) : undefined;
  });

  protected readonly group = computed(() => {
    const s = this.script();
    if (!s) return undefined;
    return GROUPS.find((g) => g.id === s.group);
  });

  protected readonly stats = computed(() => {
    const s = this.script();
    if (!s) return null;
    const stat = this.appState.state().perScript?.[s.id];
    if (!stat || stat.tries === 0) return null;
    return {
      tries: stat.tries,
      correct: stat.correct,
      accuracy: Math.round((100 * stat.correct) / stat.tries),
    };
  });

  protected readonly sampleGlyphs = computed(() => {
    const s = this.script();
    if (!s) return [];
    return Array.from(s.samples);
  });

  protected nameOf(): string {
    const s = this.script();
    if (!s) return '';
    return this.i18n.lang() === 'en' ? s.nameEn : s.nameIt;
  }
  protected groupName(): string {
    const g = this.group();
    if (!g) return '';
    return this.i18n.lang() === 'en' ? g.nameEn : g.nameIt;
  }

  protected openGlyph(glyph: string): void {
    const s = this.script();
    if (!s) return;
    const cp = (glyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
    this.router.navigate(['/glyph', s.id, cp]);
  }

  protected goBack(): void {
    this.location.back();
  }
  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
