import type {
  ControlBindings,
  DifficultyLevel,
  GraphicsQuality,
  InputAction,
  LanguageCode,
  UserSettings,
} from './types';

export const DEFAULT_BINDINGS: ControlBindings = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA'],
  moveRight: ['KeyD'],
  jump: ['Space', 'MouseRight'],
  interact: ['KeyE'],
  harvest: ['KeyF'],
  grapple: ['KeyQ'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  fullscreen: ['KeyV'],
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  difficulty: 'normal',
  graphics: 'high',
  touchControlsMode: 'auto',
  bindings: cloneBindings(DEFAULT_BINDINGS),
};

const STORAGE_KEY = 'orb_weaver_settings_v2';

export function cloneBindings(b: ControlBindings): ControlBindings {
  return {
    moveForward: [...b.moveForward],
    moveBackward: [...b.moveBackward],
    moveLeft: [...b.moveLeft],
    moveRight: [...b.moveRight],
    jump: [...b.jump],
    interact: [...b.interact],
    harvest: [...b.harvest],
    grapple: [...b.grapple],
    pause: [...b.pause],
    mute: [...b.mute],
    fullscreen: [...b.fullscreen],
  };
}

const VALID_LANGUAGES: Set<string> = new Set<LanguageCode>([
  'en',
  'fr',
  'de',
  'es',
  'pt',
  'zh',
  'ar',
  'uk',
  'ru',
  'ja',
  'pl',
  'it',
  'vi',
  'fa',
  'elv',
  'orc',
]);

const VALID_DIFFICULTIES: Set<string> = new Set<DifficultyLevel>([
  'story',
  'normal',
  'hard',
  'eclipse',
]);

const VALID_GRAPHICS: Set<string> = new Set<GraphicsQuality>([
  'low',
  'medium',
  'high',
  'ultra',
]);

export function loadUserSettings(): UserSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        ...DEFAULT_SETTINGS,
        bindings: cloneBindings(DEFAULT_BINDINGS),
      };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        bindings: cloneBindings(DEFAULT_BINDINGS),
      };
    }
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const language: LanguageCode =
      parsed.language && VALID_LANGUAGES.has(parsed.language)
        ? (parsed.language as LanguageCode)
        : 'en';
    const difficulty: DifficultyLevel =
      parsed.difficulty && VALID_DIFFICULTIES.has(parsed.difficulty)
        ? (parsed.difficulty as DifficultyLevel)
        : 'normal';
    const graphics: GraphicsQuality =
      parsed.graphics && VALID_GRAPHICS.has(parsed.graphics)
        ? (parsed.graphics as GraphicsQuality)
        : 'high';
    const touchControlsMode =
      parsed.touchControlsMode === 'on' ||
      parsed.touchControlsMode === 'off' ||
      parsed.touchControlsMode === 'auto'
        ? parsed.touchControlsMode
        : 'auto';

    const bindings = cloneBindings(DEFAULT_BINDINGS);
    if (parsed.bindings && typeof parsed.bindings === 'object') {
      (Object.keys(DEFAULT_BINDINGS) as InputAction[]).forEach((act) => {
        const arr = parsed.bindings?.[act];
        if (Array.isArray(arr) && arr.length > 0) {
          bindings[act] = arr.filter((k): k is string => typeof k === 'string');
        }
      });
    }

    return {
      language,
      difficulty,
      graphics,
      touchControlsMode,
      bindings,
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      bindings: cloneBindings(DEFAULT_BINDINGS),
    };
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors in private mode
  }
}

export function mouseButtonToCode(button: number): string | null {
  if (button === 0) return 'MouseLeft';
  if (button === 1) return 'MouseMiddle';
  if (button === 2) return 'MouseRight';
  if (button === 3) return 'MouseBack';
  if (button === 4) return 'MouseForward';
  return null;
}

export function formatInputCode(code: string): string {
  if (!code) return '—';
  if (code === 'MouseLeft') return 'LMB';
  if (code === 'MouseRight') return 'RMB';
  if (code === 'MouseMiddle') return 'MMB';
  if (code === 'MouseBack') return 'MB4';
  if (code === 'MouseForward') return 'MB5';
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'Esc';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export function matchesBinding(
  code: string,
  bindings: ControlBindings,
  action: InputAction,
): boolean {
  return bindings[action].includes(code);
}

export function isAnyBindingHeld(
  heldCodes: Set<string>,
  bindings: ControlBindings,
  action: InputAction,
): boolean {
  const list = bindings[action];
  for (let i = 0; i < list.length; i++) {
    if (heldCodes.has(list[i])) return true;
  }
  return false;
}

export function rebindActionSlot(
  bindings: ControlBindings,
  action: InputAction,
  slotIndex: 0 | 1,
  newCode: string,
): ControlBindings {
  const next = cloneBindings(bindings);
  // Remove newCode from other slots in the same action, or swap cleanly
  const arr = [...next[action]];
  while (arr.length <= slotIndex) {
    arr.push('');
  }
  arr[slotIndex] = newCode;
  next[action] = arr.filter((c, idx, self) => c !== '' && self.indexOf(c) === idx);
  return next;
}
