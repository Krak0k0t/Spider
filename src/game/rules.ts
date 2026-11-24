import type {
  ChapterPhase,
  DifficultyLevel,
  FearState,
  FlySpecies,
  GameOutcome,
  LocationZone,
  ObstacleCollider,
  PatternShape,
  SilkStrand,
  Vec3,
  WaspState,
  WeatherState,
  WovenPattern,
} from './types';

export interface DifficultyConfig {
  maxComposure: number;
  initialSilk: number;
  silkRewardMultiplier: number;
  waspDetectionScale: number;
  waspSpeedScale: number;
  windGustDurationRatio: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  story: {
    maxComposure: 5,
    initialSilk: 58,
    silkRewardMultiplier: 1.35,
    waspDetectionScale: 0.72,
    waspSpeedScale: 0.78,
    windGustDurationRatio: 0.3,
  },
  normal: {
    maxComposure: 3,
    initialSilk: 44,
    silkRewardMultiplier: 1.0,
    waspDetectionScale: 1.0,
    waspSpeedScale: 1.0,
    windGustDurationRatio: 0.47,
  },
  hard: {
    maxComposure: 2,
    initialSilk: 34,
    silkRewardMultiplier: 0.85,
    waspDetectionScale: 1.24,
    waspSpeedScale: 1.22,
    windGustDurationRatio: 0.58,
  },
  eclipse: {
    maxComposure: 1,
    initialSilk: 26,
    silkRewardMultiplier: 0.75,
    waspDetectionScale: 1.45,
    waspSpeedScale: 1.4,
    windGustDurationRatio: 0.68,
  },
};

export function detectLocationZone(
  pos: Vec3,
  nettleZones: { x: number; z: number; radius: number }[],
): LocationZone {
  for (const nz of nettleZones) {
    if (Math.hypot(pos.x - nz.x, pos.z - nz.z) <= nz.radius) {
      return 'nettle';
    }
  }
  if (pos.x < -13.5 && pos.z > -4 && pos.z < 7) {
    return 'stump';
  }
  if (pos.x < -7.0 && pos.z > -3.8 && pos.z < 6.8) {
    return 'hollow';
  }
  if (pos.x < -6.2 && pos.z < -7.5) {
    return 'left_birch';
  }
  if (pos.x > 6.5 && pos.z < -7.0) {
    return 'right_birch';
  }
  if (pos.z < -8.0 && Math.abs(pos.x) <= 6.8) {
    return 'field';
  }
  return 'log';
}

export const SILK_COST_BY_SHAPE: Record<PatternShape, number> = {
  triangle: 8,
  circle: 10,
  star: 14,
  decoy: 12,
};

export const SILK_REWARD_BY_SPECIES: Record<FlySpecies, number> = {
  fatbelly: 28,
  nimble: 22,
  greenie: 18,
  tearbearer: 35,
};

export const PATTERN_SPECS: Record<
  PatternShape,
  {
    strength: number;
    lureRadius: number;
    targetSpecies: FlySpecies;
    labelRu: string;
    hintRu: string;
  }
> = {
  triangle: {
    strength: 1.0,
    lureRadius: 7.5,
    targetSpecies: 'fatbelly',
    labelRu: 'Треугольник',
    hintRu: 'Крепок от ветра · манит толстобрюхих мух',
  },
  star: {
    strength: 0.85,
    lureRadius: 9.0,
    targetSpecies: 'nimble',
    labelRu: 'Звезда',
    hintRu: 'Прочна на излом · манит шустрых миррушек',
  },
  circle: {
    strength: 0.5,
    lureRadius: 11.5,
    targetSpecies: 'greenie',
    labelRu: 'Круг',
    hintRu: 'Изящен, но рвуч · манит мух-зелонок издалека',
  },
  decoy: {
    strength: 0.65,
    lureRadius: 15.0,
    targetSpecies: 'greenie',
    labelRu: 'Узор-обман',
    hintRu: 'Сияет чужим гнездом · отводит Хряж-Сякую',
  },
};

export const INITIAL_WORLD_Y = 0;

/**
 * Deterministic terrain height for Коряжный Лог.
 * Used identically by mesh generation, prop grounding, and spider physics.
 */
export function groundHeightAt(x: number, z: number): number {
  // Base woodland undulation + subtle organic soil micro-relief (uneven forest floor)
  let h =
    Math.sin(x * 0.14) * Math.cos(z * 0.12) * 0.24 +
    Math.sin(x * 0.31 + z * 0.27) * 0.08 +
    Math.sin(x * 0.78) * Math.cos(z * 0.72) * 0.055 +
    Math.sin(x * 1.45 - z * 1.35) * 0.025;

  // Hollow ("Ложина") & shallow left forest pool between main field and Old Stump (-11.2, 1.5)
  const dxH = (x + 11.2) / 3.6;
  const dzH = (z - 1.5) / 5.4;
  const hollowDistSq = dxH * dxH + dzH * dzH;
  if (hollowDistSq < 1.65) {
    const falloff = Math.max(0, 1 - hollowDistSq / 1.65);
    h -= falloff * falloff * 1.98;
  }

  // Shallow northern arm of left woodland pool curving softly toward (-8.8, -3.6)
  const dxP = (x + 9.0) / 3.0;
  const dzP = (z + 3.4) / 3.4;
  const poolArmSq = dxP * dxP + dzP * dzP;
  if (poolArmSq < 1.35) {
    const armFalloff = Math.max(0, 1 - poolArmSq / 1.35);
    h -= armFalloff * armFalloff * 1.05;
  }

  // Raised mound for the Old Stump (Якорь №1) at (-17.5, 2)
  const dxS = (x + 17.5) / 3.6;
  const dzS = (z - 2.0) / 3.6;
  const stumpDistSq = dxS * dxS + dzS * dzS;
  if (stumpDistSq < 1.3) {
    h += Math.max(0, 1 - stumpDistSq / 1.3) * 0.65;
  }

  // Left Birch root rise (Якорь №2) at (-10.5, -13.5)
  const dxLB = (x + 10.5) / 4.2;
  const dzLB = (z + 13.5) / 4.2;
  const lbSq = dxLB * dxLB + dzLB * dzLB;
  if (lbSq < 1.2) {
    h += Math.max(0, 1 - lbSq / 1.2) * 0.55;
  }

  // Right Birch root rise (Якорь №3) at (12.0, -12.5)
  const dxRB = (x - 12.0) / 4.2;
  const dzRB = (z + 12.5) / 4.2;
  const rbSq = dxRB * dxRB + dzRB * dzRB;
  if (rbSq < 1.2) {
    h += Math.max(0, 1 - rbSq / 1.2) * 0.55;
  }

  // Flattened First Field clearing around (0, -13.5)
  const dxF = x / 6.5;
  const dzF = (z + 13.5) / 5.5;
  const fieldSq = dxF * dxF + dzF * dzF;
  if (fieldSq < 1.0) {
    const blend = 1 - fieldSq;
    h = h * (1 - blend * 0.75) + 0.08 * (blend * 0.75);
  }

  return h;
}

export interface WorldBounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const DEFAULT_WORLD_BOUNDS: WorldBounds2D = {
  minX: -22.5,
  maxX: 22.5,
  minZ: -21.5,
  maxZ: 14.5,
};

/**
 * Walkable height considering sculpted terrain, the fallen log ("Коряга"),
 * and any climbable flat-topped boulder or Old Stump.
 */
export function computeSurfaceHeight(
  x: number,
  z: number,
  colliders: ObstacleCollider[],
): number {
  let gy = groundHeightAt(x, z);
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.climbable) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    const distSq = dx * dx + dz * dz;
    if (c.kind === 'log' && c.centerY !== undefined) {
      const r = c.radius;
      if (distSq <= r * r) {
        const cylOffset = Math.sqrt(Math.max(0, r * r - distSq));
        gy = Math.max(gy, c.centerY + cylOffset + 0.03);
      }
    } else {
      const r = c.radius * 0.96;
      if (distSq <= r * r) {
        gy = Math.max(gy, c.topY);
      }
    }
  }
  return gy;
}

/**
 * Resolves 2D horizontal circle collisions against trees, rocks, logs, and stumps,
 * allowing smooth tangential sliding and stepping atop climbable surfaces when above their shoulder height.
 */
export function resolveObstacleCollisions(
  pos: Vec3,
  entityRadius: number,
  colliders: ObstacleCollider[],
  bounds: WorldBounds2D = DEFAULT_WORLD_BOUNDS,
): boolean {
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.climbable) {
        const climbThreshold =
          c.kind === 'log' && c.centerY !== undefined
            ? c.centerY + 0.12
            : c.topY - 0.36;
        if (pos.y >= climbThreshold) {
          continue;
        }
      }
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const minDist = c.radius + entityRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        collided = true;
        const dist = Math.sqrt(distSq);
        if (dist < 1e-5) {
          pos.x = c.x + minDist;
        } else {
          const push = minDist / dist;
          pos.x = c.x + dx * push;
          pos.z = c.z + dz * push;
        }
      }
    }

    if (pos.x < bounds.minX) {
      pos.x = bounds.minX;
      collided = true;
    } else if (pos.x > bounds.maxX) {
      pos.x = bounds.maxX;
      collided = true;
    }
    if (pos.z < bounds.minZ) {
      pos.z = bounds.minZ;
      collided = true;
    } else if (pos.z > bounds.maxZ) {
      pos.z = bounds.maxZ;
      collided = true;
    }
  }

  return collided;
}

export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Classifies a closed loop of nodes and player intent into one of the canonical patterns.
 */
export function classifyPattern(
  nodeIds: string[],
  intendedMode: PatternShape,
): PatternShape {
  if (intendedMode === 'decoy') {
    return 'decoy';
  }
  const uniqueCount = new Set(nodeIds).size;
  if (uniqueCount <= 3) {
    return 'triangle';
  }
  if (intendedMode === 'star' || uniqueCount >= 5) {
    return intendedMode === 'circle' ? 'circle' : 'star';
  }
  if (uniqueCount === 4) {
    return intendedMode === 'circle' ? 'circle' : 'star';
  }
  return intendedMode;
}

/**
 * Computes Pavutin's Fear & Tremor state based on wasp proximity, nettle cover, and wind.
 * - Nearby wasp raises tremor intensity [0..1]
 * - Tremor scatters precise web aim & alerts the wasp via swaying nettle ripples if moving
 * - Tremor simultaneously sharpens hearing so the player tracks Khryazh-Syakaya through leaves
 */
export function computeFearState(params: {
  spiderPos: Vec3;
  waspPos: Vec3;
  waspState: WaspState;
  isHiddenInNettle: boolean;
  isMoving: boolean;
  windStrength: number;
}): FearState {
  const {
    spiderPos,
    waspPos,
    waspState,
    isHiddenInNettle,
    isMoving,
    windStrength,
  } = params;

  if (waspState === 'absent' || waspState === 'departed') {
    return {
      intensity: 0,
      aimScatterRad: 0,
      hearingMultiplier: 1,
      leafRippleRisk: 0,
      blocksPrecision: false,
    };
  }

  const dist = distance3D(spiderPos, waspPos);
  const rawProximity = Math.max(0, Math.min(1, 1 - (dist - 3.5) / 14.5));
  const stateBoost =
    waspState === 'dive'
      ? 1.0
      : waspState === 'investigate'
        ? 0.85
        : waspState === 'perch'
          ? 0.55
          : waspState === 'lured'
            ? 0.25
            : 0.7;

  const coverDamping = isHiddenInNettle ? 0.52 : 1.0;
  const intensity = Math.max(0, Math.min(1, rawProximity * stateBoost * coverDamping));

  // Moving in wind/cover creates leaf ripples that expose the spider
  const movementNoise = isMoving ? 0.65 + windStrength * 0.35 : 0.05;
  const leafRippleRisk =
    intensity > 0.25
      ? Math.min(1, intensity * movementNoise * (isHiddenInNettle ? 0.55 : 1.0))
      : 0;

  return {
    intensity,
    aimScatterRad: intensity * 0.28,
    hearingMultiplier: 1 + intensity * 1.4,
    leafRippleRisk,
    blocksPrecision: intensity > 0.78 && !isHiddenInNettle,
  };
}

/**
 * Pure AI transition step for Хряж-Сякая.
 */
export function stepWaspAI(params: {
  state: WaspState;
  stateTimer: number;
  dt: number;
  spiderPos: Vec3;
  waspPos: Vec3;
  isHiddenInNettle: boolean;
  leafRippleRisk: number;
  nearestDecoyPos: Vec3 | null;
  chapter: ChapterPhase;
  detectionScale?: number;
}): { nextState: WaspState; nextTimer: number; triggeredDiveHit: boolean } {
  const {
    state,
    stateTimer,
    dt,
    spiderPos,
    waspPos,
    isHiddenInNettle,
    leafRippleRisk,
    nearestDecoyPos,
    chapter,
    detectionScale = 1.0,
  } = params;

  if (chapter === 'prologue' || chapter === 'ch1_threads' || chapter === 'victory') {
    return { nextState: 'absent', nextTimer: 0, triggeredDiveHit: false };
  }

  const timer = stateTimer + dt;
  const distToSpider = distance3D(spiderPos, waspPos);

  if (state === 'absent') {
    return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false };
  }

  if (state === 'departed') {
    // Returns faster in Ch3 near Right Birch, stays away longer in Ch2 victory beat
    const returnDuration = (chapter === 'ch2_wasp' ? 28 : 20) / Math.max(0.7, detectionScale);
    if (timer >= returnDuration) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false };
    }
    return { nextState: 'departed', nextTimer: timer, triggeredDiveHit: false };
  }

  if (state === 'lured') {
    if (timer >= 5.5) {
      return { nextState: 'departed', nextTimer: 0, triggeredDiveHit: false };
    }
    return { nextState: 'lured', nextTimer: timer, triggeredDiveHit: false };
  }

  if (nearestDecoyPos && distance3D(waspPos, nearestDecoyPos) < 16) {
    return { nextState: 'lured', nextTimer: 0, triggeredDiveHit: false };
  }

  if (state === 'patrol') {
    if (!isHiddenInNettle && distToSpider < 7.2 * detectionScale) {
      return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false };
    }
    if (leafRippleRisk > 0.58 && distToSpider < 11.5 * detectionScale) {
      return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false };
    }
    if (timer >= 9.0) {
      return { nextState: 'perch', nextTimer: 0, triggeredDiveHit: false };
    }
    return { nextState: 'patrol', nextTimer: timer, triggeredDiveHit: false };
  }

  if (state === 'perch') {
    // Safe window to weave a decoy! Unless spider walks right out in front of her
    if (!isHiddenInNettle && distToSpider < 4.5 * detectionScale) {
      return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false };
    }
    if (timer >= 7.0) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false };
    }
    return { nextState: 'perch', nextTimer: timer, triggeredDiveHit: false };
  }

  if (state === 'investigate') {
    if (isHiddenInNettle && leafRippleRisk < 0.35 && timer >= 3.0) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false };
    }
    if (!isHiddenInNettle && distToSpider < 5.5 * detectionScale && timer >= 2.2) {
      return { nextState: 'dive', nextTimer: 0, triggeredDiveHit: false };
    }
    if (timer >= 5.0) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false };
    }
    return { nextState: 'investigate', nextTimer: timer, triggeredDiveHit: false };
  }

  if (state === 'dive') {
    const hit = !isHiddenInNettle && distToSpider < 3.4 && timer >= 0.45 && timer < 0.7;
    if (timer >= 1.3) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: hit };
    }
    return { nextState: 'dive', nextTimer: timer, triggeredDiveHit: hit };
  }

  return { nextState: state, nextTimer: timer, triggeredDiveHit: false };
}

/**
 * Validates whether a Great Anchor strand can survive the wind at the Left Birch.
 * Canon Ch3: "вторая рвётся под ветром" — needs either a triangle brace at the birch or calm weather.
 */
export function canBearingStrandHold(params: {
  anchorZone: 'stump' | 'left_birch' | 'right_birch';
  weather: WeatherState;
  hasLeftBirchTriangleBrace: boolean;
  hasGrapple: boolean;
}): { holds: boolean; reasonRu: string | null } {
  const { anchorZone, weather, hasLeftBirchTriangleBrace, hasGrapple } = params;

  if (anchorZone === 'stump' && !hasGrapple) {
    return {
      holds: false,
      reasonRu: 'Ложина слишком глубока — нужна Нить-хвать из Главы 2.',
    };
  }

  if (anchorZone === 'left_birch' && weather === 'gusty' && !hasLeftBirchTriangleBrace) {
    return {
      holds: false,
      reasonRu: 'Порыв ветра рвёт длинную нить! Сплети треугольник-распорку у березы или дождись затишья.',
    };
  }

  return { holds: true, reasonRu: null };
}

export function checkGreatPatternComplete(
  bearingStrands: SilkStrand[],
  silk: number,
  requiredSilk = 100,
): { ready: boolean; count: number; missingSilk: number } {
  const count = bearingStrands.filter((s) => s.isBearing).length;
  const missingSilk = Math.max(0, requiredSilk - silk);
  return {
    ready: count >= 6 && silk >= requiredSilk,
    count,
    missingSilk,
  };
}

export function resolveOutcome(params: {
  chapter: ChapterPhase;
  composure: number;
}): GameOutcome {
  if (params.composure <= 0) {
    return 'retreat';
  }
  if (params.chapter === 'victory') {
    return 'victory';
  }
  return null;
}

export function createPatternRecord(params: {
  id: string;
  shape: PatternShape;
  nodeIds: string[];
  positions: Vec3[];
  createdAt: number;
}): WovenPattern {
  const { id, shape, nodeIds, positions, createdAt } = params;
  const count = Math.max(1, positions.length);
  const center = positions.reduce(
    (acc, p) => ({
      x: acc.x + p.x / count,
      y: acc.y + p.y / count,
      z: acc.z + p.z / count,
    }),
    { x: 0, y: 0, z: 0 },
  );
  let maxR = 1.0;
  for (const p of positions) {
    const d = distance3D(center, p);
    if (d > maxR) maxR = d;
  }
  const spec = PATTERN_SPECS[shape];
  return {
    id,
    shape,
    nodeIds: [...nodeIds],
    center,
    radius: maxR,
    strength: spec.strength,
    lureRadius: spec.lureRadius,
    targetSpecies: spec.targetSpecies,
    createdAt,
  };
}

export const POND_WATER_Y = -0.66;

/**
 * Computes automatic combat/pounce stance blend [0..1] when Pavutin approaches a live fly.
 */
export function computeCombatStanceBlend(
  nearestFlyDist: number,
  isGrounded: boolean,
): number {
  if (!isGrounded || !Number.isFinite(nearestFlyDist) || nearestFlyDist >= 4.2) {
    return 0;
  }
  const t = Math.max(0, Math.min(1, (4.2 - nearestFlyDist) / (4.2 - 2.1)));
  return t * t * (3 - 2 * t);
}

/**
 * Blends macro DoF focus distance smoothly between Pavutin and any nearby target fly.
 */
export function computeMacroFocusDistance(
  spiderCamDist: number,
  flyCamDist: number | null,
  nearestFlyDist: number,
): number {
  const base = Math.max(2.0, spiderCamDist);
  if (flyCamDist === null || !Number.isFinite(nearestFlyDist) || nearestFlyDist > 5.0) {
    return base;
  }
  const weight = Math.max(0, Math.min(0.45, (1 - nearestFlyDist / 5.0) * 0.45));
  return base * (1 - weight) + Math.max(2.0, flyCamDist) * weight;
}

/**
 * Selects discrete LOD tier (0 = high 3D, 1 = low-poly 3D, 2 = flat sprite card).
 */
export function computeLodStage(
  distance: number,
  midDist = 15,
  farDist = 23,
): 0 | 1 | 2 {
  if (distance >= farDist) return 2;
  if (distance >= midDist) return 1;
  return 0;
}

