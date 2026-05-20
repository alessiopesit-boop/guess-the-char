import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import {
  ACCENT_PALETTES,
  AccentHex,
  AccentPalette,
  ColorblindMode,
  Lang,
  MotionLevel,
} from '../../core/state/types';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-settings',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  protected readonly state = this.appState.state;

  protected readonly accents: ReadonlyArray<AccentPalette> = Object.values(ACCENT_PALETTES);
  protected readonly motions: ReadonlyArray<MotionLevel> = ['minimal', 'playful', 'rich'];
  protected readonly cbModes: ReadonlyArray<ColorblindMode> = ['none', 'redgreen', 'blueyellow'];
  protected readonly langs: ReadonlyArray<Lang> = ['it', 'en'];

  protected setAccent(hex: AccentHex): void {
    this.appState.update({ accent: hex });
  }
  protected setMotion(m: MotionLevel): void {
    this.appState.update({ motion: m });
  }
  protected setColorblind(m: ColorblindMode): void {
    this.appState.update({ colorblind: m });
  }
  protected setLang(l: Lang): void {
    this.i18n.set(l);
  }

  protected toggleSound(): void {
    this.appState.update({ sound: !this.state().sound });
  }
  protected toggleHaptics(): void {
    this.appState.update({ haptics: !this.state().haptics });
  }
  protected toggleShowCodepoint(): void {
    this.appState.update({ showCodepoint: !this.state().showCodepoint });
  }

  protected resetProgress(): void {
    const msg =
      this.i18n.lang() === 'it'
        ? 'Resettare tutti i progressi? Questa azione e\' irreversibile.'
        : 'Reset all progress? This action cannot be undone.';
    if (typeof window !== 'undefined' && window.confirm(msg)) {
      this.appState.reset();
      this.router.navigate(['/onboarding']);
    }
  }

  protected motionLabel(m: MotionLevel): string {
    const isIt = this.i18n.lang() === 'it';
    if (isIt) return m === 'minimal' ? 'Minimo' : m === 'playful' ? 'Giocoso' : 'Ricco';
    return m === 'minimal' ? 'Minimal' : m === 'playful' ? 'Playful' : 'Rich';
  }
  protected cbLabel(m: ColorblindMode): string {
    const isIt = this.i18n.lang() === 'it';
    if (isIt) return m === 'none' ? 'Standard' : m === 'redgreen' ? 'Rosso e verde' : 'Blu e giallo';
    return m === 'none' ? 'Standard' : m === 'redgreen' ? 'Red and green' : 'Blue and yellow';
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
