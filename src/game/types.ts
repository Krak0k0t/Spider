export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameOutcome = 'victory' | 'retreat' | null;

export type ChapterPhase =
  | 'prologue'
  | 'ch1_threads'
  | 'ch2_wasp'
  | 'ch3_great_pattern'
  | 'victory';

export type PatternShape = 'triangle' | 'star' | 'circle' | 'decoy';

export type FlySpecies = 'fatbelly' | 'nimble' | 'greenie' | 'tearbearer';

export type WaspState =
  | 'absent'
  | 'patrol'
  | 'investigate'
  | 'perch'
  | 'lured'
  | 'dive'
  | 'departed';

export type WeatherState = 'calm' | 'gusty';

export type LocationZone =
  | 'log'
  | 'stump'
  | 'left_birch'
  | 'right_birch'
  | 'nettle'
  | 'field'
  | 'hollow';

export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elv'
  | 'orc';

export type DifficultyLevel = 'story' | 'normal' | 'hard' | 'eclipse';

export type GraphicsQuality =
  | 'lowest'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'
  | 'cinematic';

export interface ExternalEngineState {
  isMobile: boolean;
  inputMode: 'touch' | 'keyboard';
}

export type InputAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'dash'
  | 'interact'
  | 'harvest'
  | 'grapple'
  | 'pause'
  | 'mute'
  | 'fullscreen';

export type ControlBindings = Record<InputAction, string[]>;

export interface UserSettings {
  language: LanguageCode;
  difficulty: DifficultyLevel;
  graphics: GraphicsQuality;
  touchControlsMode: 'auto' | 'on' | 'off';
  uiScale: 0.9 | 1 | 1.15 | 1.3;
  colorblindMode: boolean;
  reducedEffects: boolean;
  bindings: ControlBindings;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AnchorNode {
  id: string;
  label: string;
  position: Vec3;
  zone: 'log' | 'stump' | 'left_birch' | 'right_birch' | 'nettle' | 'field';
  isGreatAnchor?: boolean;
  isFrameNode?: boolean;
  isGrapplePoint?: boolean;
}

export interface ObstacleCollider {
  id: string;
  kind: 'rock' | 'tree' | 'stump' | 'log';
  x: number;
  z: number;
  radius: number;
  topY: number;
  centerY?: number;
  climbable?: boolean;
}

export interface SilkStrand {
  id: string;
  fromId: string;
  toId: string;
  isBearing?: boolean;
  isDecoy?: boolean;
  durability: number;
  maxDurability: number;
  createdAt: number;
}

export interface WovenPattern {
  id: string;
  shape: PatternShape;
  nodeIds: string[];
  center: Vec3;
  radius: number;
  strength: number;
  lureRadius: number;
  targetSpecies: FlySpecies;
  durability: number;
  maxDurability: number;
  createdAt: number;
}

export interface FearState {
  intensity: number; // 0..1
  aimScatterRad: number;
  hearingMultiplier: number;
  leafRippleRisk: number; // 0..1
  blocksPrecision: boolean;
}

export type WhisperId =
  | 'prologue_intro'
  | 'grapple_search'
  | 'approach_twig'
  | 'fear_tremor'
  | 'too_far'
  | 'not_enough_silk'
  | 'tearbearer_spotted'
  | 'decoy_glowing'
  | 'prologue_shatter'
  | 'great_need_silk'
  | 'great_strand_progress'
  | 'great_victory'
  | 'tearbearer_caught'
  | 'fly_caught'
  | 'aerial_catch'
  | 'web_mended'
  | 'silk_bridge'
  | 'wasp_incoming'
  | 'wasp_perch'
  | 'wasp_lured'
  | 'wasp_departed_grapple'
  | 'wasp_departed_quick'
  | 'wasp_investigate'
  | 'wasp_knockback'
  | 'wasp_dodged'
  | 'wasp_lost_sight'
  | 'still_stealth'
  | 'hollow_need_grapple'
  | 'birch_wind_snap'
  | 'jump_hint'
  | 'dew_quest_progress'
  | 'dew_quest_complete'
  | 'wasp_web_snared';

export interface WhisperParams {
  count?: number;
  total?: number;
  amount?: number;
  missing?: number;
}

export interface DewQuestState {
  fatbellyTriangle: boolean;
  nimbleStar: boolean;
  greenieCircle: boolean;
  completed: boolean;
}

export interface RadarBlip {
  id: string;
  kind: 'wasp' | 'anchor' | 'fly' | 'nettle' | 'decoy';
  x: number; // -1..1 camera-relative right
  z: number; // -1..1 camera-relative down (positive toward bottom of radar)
  active?: boolean;
}

export interface HudSnapshot {
  screen: GameScreenState;
  outcome: GameOutcome;
  chapter: ChapterPhase;
  zone: LocationZone;
  silk: number;
  maxSilk: number;
  composure: number;
  maxComposure: number;
  fear: number; // 0..100
  hiddenInNettle: boolean;
  isGrounded: boolean;
  onSilkBridge: boolean;
  dashCooldownSec: number;
  selectedMode: PatternShape;
  hasGrapple: boolean;
  waspState: WaspState;
  waspDistance: number;
  waspBearingDeg: number | null;
  waspAlertLevel: number; // 0..1
  waspWebSlowed: boolean;
  weather: WeatherState;
  windWarning: boolean;
  windStrength: number; // 0..1
  patternsCount: number;
  fliesCaught: number;
  aerialCatches: number;
  caughtSpecies: Record<FlySpecies, number>;
  dewQuest: DewQuestState;
  unlockedLoreIds: string[];
  greatStrandsDone: number;
  greatStrandsTotal: number;
  greatAnchorsDone: {
    stump: boolean;
    leftBirch: boolean;
    rightBirch: boolean;
  };
  whisperId: WhisperId;
  whisperParams?: WhisperParams;
  whisperSpeaker: 'pavutin' | 'uspokh' | 'moon';
  moonRestored: number; // 0..1
  elapsedSeconds: number;
  muted: boolean;
  nearAnchorId: string | null;
  nearAnchorLabel: string | null;
  activeThreadFromId: string | null;
  activeThreadFromLabel: string | null;
  canClosePattern: boolean;
  canRepairPattern: boolean;
  canHarvestFly: boolean;
  combatStance: boolean;
  canGrappleId: string | null;
  canGrappleLabel: string | null;
  spiderScreenPos?: { xPct: number; yPct: number } | null;
  radarBlips?: RadarBlip[];
  gazeWebShape?: PatternShape | null;
  musicTrackIndex: number;
  musicTrackId: string;
  musicIsPlaying: boolean;
  musicPaused: boolean;
  musicAvailableCount: number;
  difficulty: DifficultyLevel;
  graphics: GraphicsQuality;
  language: LanguageCode;
}
