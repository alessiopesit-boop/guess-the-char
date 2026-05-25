import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { APP_VERSION, BUILD_CONTEXT, BUILD_SHA } from '../../core/build-info';
import { AuthService } from '../../core/firebase/auth.service';

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
  private readonly authSvc = inject(AuthService);

  protected readonly state = this.appState.state;

  protected readonly accents: ReadonlyArray<AccentPalette> = Object.values(ACCENT_PALETTES);
  protected readonly motions: ReadonlyArray<MotionLevel> = ['minimal', 'playful', 'rich'];
  protected readonly cbModes: ReadonlyArray<ColorblindMode> = ['none', 'redgreen', 'blueyellow'];
  protected readonly langs: ReadonlyArray<Lang> = ['it', 'en'];

  /** La card del codice di sincronizzazione e' chiusa per default; il tasto
   *  "Mostra codice di sincronizzazione" la rivela. Una volta rivelata, il
   *  codice viene generato in localStorage e resta stabile tra sessioni. */
  protected readonly showSync = signal(false);
  protected readonly syncCode = computed(() => (this.showSync() ? ensureSyncCode() : ''));

  /** Footer in fondo: in dev include l'hash, in release no. */
  protected readonly buildLabel =
    BUILD_CONTEXT === 'release' ? `v${APP_VERSION}` : `v${APP_VERSION} · dev · ${BUILD_SHA}`;

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

  protected revealSync(): void {
    this.showSync.set(true);
  }

  protected goFeedback(): void {
    this.router.navigate(['/feedback']);
  }
  protected goLogin(): void {
    this.router.navigate(['/login']);
  }
  protected goProfile(): void {
    this.router.navigate(['/profile']);
  }
  protected replayOnboarding(): void {
    this.router.navigate(['/onboarding']);
  }

  /** Logout: Firebase signOut + l'effect in AppStateService azzera state.account
   *  in automatico. Dopo il signOut, redirige a /home perche' la pagina
   *  impostazioni e' un posto un po' tecnico in cui restare: con la sessione
   *  chiusa ha piu' senso atterrare nel posto neutro principale. */
  protected async signOut(): Promise<void> {
    try {
      await this.authSvc.signOut();
    } catch {
      // Fallimenti rari (es. rete offline durante la revoca del token): la
      // sessione lato client viene rimossa comunque, va bene cosi'.
    }
    this.router.navigate(['/home']);
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
  protected motionHint(m: MotionLevel): string {
    const isIt = this.i18n.lang() === 'it';
    if (isIt) {
      if (m === 'minimal') return 'Quasi nessuna animazione: schermate e pulsanti rispondono in modo istantaneo.';
      if (m === 'playful') return 'Transizioni morbide tra le schermate e feedback animati sui glifi.';
      return 'Tutte le animazioni attive, inclusi micro-effetti su pulsanti, glifi e transizioni.';
    }
    if (m === 'minimal') return 'Almost no animation: screens and buttons respond instantly.';
    if (m === 'playful') return 'Smooth screen transitions and animated feedback on glyphs.';
    return 'All animations on, including micro-effects on buttons, glyphs and transitions.';
  }
  protected cbLabel(m: ColorblindMode): string {
    const isIt = this.i18n.lang() === 'it';
    if (isIt) return m === 'none' ? 'Standard' : m === 'redgreen' ? 'Rosso-verde' : 'Blu-giallo';
    return m === 'none' ? 'Standard' : m === 'redgreen' ? 'Red-green' : 'Blue-yellow';
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}

/**
 * Codice di sincronizzazione "mock" (8 caratteri, divisi 4-4, alfabeto safe
 * senza I/O/0/1). Persistito in localStorage cosi' che, una volta generato,
 * resta stabile tra sessioni come si comporterebbe un vero codice di pairing.
 * Sara' rimpiazzato dal vero meccanismo quando integreremo il BaaS.
 */
function ensureSyncCode(): string {
  try {
    const cached = localStorage.getItem('gtc.sync');
    if (cached) return cached;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let raw = '';
    for (let i = 0; i < 8; i++) {
      raw += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    localStorage.setItem('gtc.sync', code);
    return code;
  } catch {
    return 'XXXX-XXXX';
  }
}
