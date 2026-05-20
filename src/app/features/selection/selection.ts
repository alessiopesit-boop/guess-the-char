import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { GROUPS, SCRIPTS, scriptsByGroup, GroupId } from '../../core/data/scripts';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

type ModeId = 'training' | 'timed' | 'survival';
type TriState = '0' | '1' | 'partial';

@Component({
  selector: 'app-selection',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selection.html',
  styleUrl: './selection.css',
})
export class Selection {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mode = computed<ModeId>(() => {
    const m = this.queryParams().get('mode');
    return m === 'timed' || m === 'survival' ? m : 'training';
  });

  protected readonly state = this.appState.state;
  protected readonly groups = GROUPS;
  protected readonly total = SCRIPTS.length;
  protected readonly selectedCount = computed(() => this.state().selected.length);

  /** Gruppi aperti nella vista. East e' aperto di default come nel prototipo. */
  protected readonly open = signal<Record<GroupId, boolean>>({
    east: true,
    sea: false,
    indic: false,
    me: false,
    eu: false,
  });

  protected readonly modeLabel = computed(() => {
    switch (this.mode()) {
      case 'timed':
        return this.i18n.t('timed');
      case 'survival':
        return this.i18n.t('survival');
      default:
        return this.i18n.t('training');
    }
  });

  protected scriptsOf(g: GroupId) {
    return scriptsByGroup(g);
  }

  protected isOpen(g: GroupId): boolean {
    return this.open()[g];
  }

  protected toggleOpen(g: GroupId): void {
    this.open.update((o) => ({ ...o, [g]: !o[g] }));
  }

  protected isSelected(id: string): boolean {
    return this.state().selected.includes(id);
  }

  protected toggleScript(id: string): void {
    const sel = this.state().selected;
    const next = sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id];
    this.appState.update({ selected: next });
  }

  protected groupState(g: GroupId): TriState {
    const ids = this.scriptsOf(g).map((s) => s.id);
    const sel = this.state().selected;
    const on = ids.filter((id) => sel.includes(id)).length;
    if (on === 0) return '0';
    if (on === ids.length) return '1';
    return 'partial';
  }

  protected groupCount(g: GroupId): { on: number; total: number } {
    const ids = this.scriptsOf(g).map((s) => s.id);
    const sel = this.state().selected;
    return { on: ids.filter((id) => sel.includes(id)).length, total: ids.length };
  }

  protected toggleGroup(g: GroupId): void {
    const ids = this.scriptsOf(g).map((s) => s.id);
    const sel = this.state().selected;
    const allOn = ids.every((id) => sel.includes(id));
    const next = allOn
      ? sel.filter((id) => !ids.includes(id))
      : Array.from(new Set([...sel, ...ids]));
    this.appState.update({ selected: next });
  }

  protected selectAll(): void {
    this.appState.update({ selected: SCRIPTS.map((s) => s.id) });
  }

  protected clearAll(): void {
    this.appState.update({ selected: [] });
  }

  protected nameOf(it: string, en: string): string {
    return this.i18n.lang() === 'en' ? en : it;
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  protected start(): void {
    if (this.selectedCount() < 2) return;
    this.router.navigate(['/game'], { queryParams: { mode: this.mode() } });
  }
}
