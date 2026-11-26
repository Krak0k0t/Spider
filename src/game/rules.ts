import type {
  ChapterPhase,
  DewQuestState,
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
  for (let i = 0; i < nettleZones.length; i++) {
    const nz = nettleZones[i];
    const dx = pos.x - nz.x;
    const dz = pos.z - nz.z;
    if (dx * dx + dz * dz <= nz.radius * nz.radius) {
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
    const r = c.kind === 'log' && c.centerY !== undefined ? c.radius : c.radius * 0.96;
    const dx = x - c.x;
    if (dx > r || dx < -r) continue;
    const dz = z - c.z;
    if (dz > r || dz < -r) continue;
    const distSq = dx * dx + dz * dz;
    if (distSq > r * r) continue;
    if (c.kind === 'log' && c.centerY !== undefined) {
      const cylOffset = Math.sqrt(Math.max(0, r * r - distSq));
      gy = Math.max(gy, c.centerY + cylOffset + 0.03);
    } else {
      gy = Math.max(gy, c.topY);
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
      const minDist = c.radius + entityRadius;
      const dx = pos.x - c.x;
      if (dx > minDist || dx < -minDist) continue;
      const dz = pos.z - c.z;
      if (dz > minDist || dz < -minDist) continue;
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

  const coverDamping = isHiddenInNettle ? 0.45 : isMoving ? 1.0 : 0.78;
  const intensity = Math.max(0, Math.min(1, rawProximity * stateBoost * coverDamping));

  // Moving in wind/cover creates leaf ripples that expose the spider; standing still quiets leaves
  const movementNoise = isMoving ? 0.65 + windStrength * 0.35 : 0.03;
  const leafRippleRisk =
    intensity > 0.25
      ? Math.min(1, intensity * movementNoise * (isHiddenInNettle ? 0.48 : 1.0))
      : 0;

  return {
    intensity,
    aimScatterRad: intensity * 0.24,
    hearingMultiplier: 1 + intensity * 1.5,
    leafRippleRisk,
    blocksPrecision: intensity > 0.8 && !isHiddenInNettle,
  };
}

/**
 * Pure AI transition step for Хряж-Сякая with fair lock-on telegraphs,
 * single-hit dive discipline, post-dive cooldowns, and stillness/dodge counterplay.
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
  isMoving?: boolean;
  isDodging?: boolean;
  diveHitCommitted?: boolean;
  postDiveCooldown?: number;
  diveTargetPos?: Vec3 | null;
}): {
  nextState: WaspState;
  nextTimer: number;
  triggeredDiveHit: boolean;
  dodgedDive: boolean;
} {
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
    isMoving = true,
    isDodging = false,
    diveHitCommitted = false,
    postDiveCooldown = 0,
    diveTargetPos = null,
  } = params;

  if (chapter === 'prologue' || chapter === 'ch1_threads' || chapter === 'victory') {
    return { nextState: 'absent', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
  }

  const timer = stateTimer + dt;
  const distToSpider = distance3D(spiderPos, waspPos);
  // Freezing still noticeably shrinks Pavutin's silhouette to the hunting wasp
  const effectiveDetection = detectionScale * (isMoving ? 1.0 : 0.58);

  if (state === 'absent') {
    return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'departed') {
    const returnDuration = (chapter === 'ch2_wasp' ? 28 : 22) / Math.max(0.7, detectionScale);
    if (timer >= returnDuration) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    return { nextState: 'departed', nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'lured') {
    if (timer >= 5.5) {
      return { nextState: 'departed', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    return { nextState: 'lured', nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
  }

  if (nearestDecoyPos && distance3D(waspPos, nearestDecoyPos) < 16) {
    return { nextState: 'lured', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'patrol') {
    if (postDiveCooldown <= 0) {
      if (!isHiddenInNettle && distToSpider < 7.2 * effectiveDetection) {
        return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
      }
      if (leafRippleRisk > 0.58 && distToSpider < 11.5 * effectiveDetection) {
        return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
      }
    }
    if (timer >= 8.5) {
      return { nextState: 'perch', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    return { nextState: 'patrol', nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'perch') {
    // Generous window to weave a Decoy unless Pavutin walks right up in front of her
    if (postDiveCooldown <= 0 && !isHiddenInNettle && distToSpider < 4.4 * effectiveDetection) {
      return { nextState: 'investigate', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    if (timer >= 7.5) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    return { nextState: 'perch', nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'investigate') {
    // Ducking into nettle cover OR freezing completely still out of immediate reach breaks her lock
    if (isHiddenInNettle && leafRippleRisk < 0.35 && timer >= 2.2) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    if (!isMoving && distToSpider > 4.2 && timer >= 2.4) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    const windupDelay = Math.max(1.8, 2.5 / Math.max(0.75, detectionScale));
    if (!isHiddenInNettle && distToSpider < 6.4 * detectionScale && timer >= windupDelay) {
      return { nextState: 'dive', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    if (timer >= 4.8) {
      return { nextState: 'patrol', nextTimer: 0, triggeredDiveHit: false, dodgedDive: false };
    }
    return { nextState: 'investigate', nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
  }

  if (state === 'dive') {
    // 0.0..0.58s: high hover lock-on telegraph. 0.62s..0.95s: single impact strike check at locked aim point.
    const strikeTarget = diveTargetPos ?? waspPos;
    const distToStrike = distance3D(spiderPos, strikeTarget);
    const canStrike =
      !diveHitCommitted &&
      !isHiddenInNettle &&
      !isDodging &&
      timer >= 0.62 &&
      timer <= 0.95 &&
      distToStrike < 2.05 &&
      distToSpider < 2.65;

    if (timer >= 1.2) {
      return {
        nextState: 'patrol',
        nextTimer: 0,
        triggeredDiveHit: false,
        dodgedDive: !diveHitCommitted,
      };
    }
    return {
      nextState: 'dive',
      nextTimer: timer,
      triggeredDiveHit: canStrike,
      dodgedDive: false,
    };
  }

  return { nextState: state, nextTimer: timer, triggeredDiveHit: false, dodgedDive: false };
}

/**
 * Computes wasp horizontal bearing in degrees relative to camera forward direction
 * (-180..+180, where 0 = straight ahead, +90 = right, -90 = left).
 */
export function computeWaspRelativeBearingDeg(
  spiderPos: Vec3,
  camYaw: number,
  waspPos: Vec3,
): number {
  const dx = waspPos.x - spiderPos.x;
  const dz = waspPos.z - spiderPos.z;
  const worldAngle = Math.atan2(dx, -dz);
  const camForwardAngle = -camYaw;
  let rel = worldAngle - camForwardAngle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return Math.round((rel * 180) / Math.PI);
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
    durability: 100,
    maxDurability: 100,
    createdAt,
  };
}

export const POND_WATER_Y = -0.66;

/**
 * Computes walkable tightrope elevation when Pavutin walks near or lands atop a spun silk strand.
 * Allows crossing over nettle groves, hollows, and rocks directly along high silk bridges.
 */
export function computeSilkBridgeHeight(
  x: number,
  z: number,
  spiderY: number,
  strands: SilkStrand[],
  anchorPositions: ReadonlyMap<string, Vec3>,
): { height: number | null; strandId: string | null } {
  let bestY: number | null = null;
  let bestId: string | null = null;
  const maxCorridorSq = 0.54 * 0.54;

  for (let i = 0; i < strands.length; i++) {
    const s = strands[i];
    const a = anchorPositions.get(s.fromId);
    const b = anchorPositions.get(s.toId);
    if (!a || !b) continue;

    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lenSq = abx * abx + abz * abz;
    if (lenSq < 0.05) continue;

    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / lenSq));
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const dx = x - px;
    const dz = z - pz;
    if (dx * dx + dz * dz > maxCorridorSq) continue;

    const strandY = a.y + (b.y - a.y) * t + 0.03;
    // Engage tightrope when jumping/landing near or climbing from connected anchor ends
    if (spiderY >= strandY - 0.58 && (bestY === null || strandY > bestY)) {
      bestY = strandY;
      bestId = s.id;
    }
  }

  return { height: bestY, strandId: bestId };
}

/**
 * Computes silk reward for catching a fly, granting an acrobatic mid-air pounce bonus.
 */
export function computeAerialCatchReward(
  baseReward: number,
  isAirborne: boolean,
): { totalReward: number; aerialBonus: number } {
  if (!isAirborne) {
    return { totalReward: baseReward, aerialBonus: 0 };
  }
  const aerialBonus = Math.max(6, Math.round(baseReward * 0.3));
  return { totalReward: baseReward + aerialBonus, aerialBonus };
}

/**
 * Species affinity multiplier: matching a web shape to its ideal prey pulls them farther and faster.
 */
export function computePatternSpeciesAffinity(
  patternShape: PatternShape,
  flySpecies: FlySpecies,
): number {
  if (patternShape === 'decoy') return 0;
  if (PATTERN_SPECS[patternShape].targetSpecies === flySpecies) {
    return 1.38;
  }
  if (flySpecies === 'tearbearer') {
    return 1.2;
  }
  return 0.88;
}

/**
 * Advances pattern durability over time, decaying delicate circular webs faster in gusty winds.
 */
export function stepPatternDurability(
  patterns: WovenPattern[],
  dt: number,
  isGusty: boolean,
  windDecayScale = 1.0,
): boolean {
  if (dt <= 0) return false;
  let removedAny = false;
  for (let i = patterns.length - 1; i >= 0; i--) {
    const p = patterns[i];
    if (p.shape === 'decoy') continue;
    const weatherWear = (isGusty ? (1.12 - p.strength) * 3.8 : 0.08) * windDecayScale;
    p.durability = Math.max(0, p.durability - weatherWear * dt);
    if (p.durability <= 0) {
      patterns.splice(i, 1);
      removedAny = true;
    }
  }
  return removedAny;
}

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

export const INITIAL_DEW_QUEST: DewQuestState = {
  fatbellyTriangle: false,
  nimbleStar: false,
  greenieCircle: false,
  completed: false,
};

/**
 * Pure progression step for optional side quest "Three Drops of Moon Dew":
 * catching matched species from their resonant web shapes unlocks -35% wind decay on silk.
 */
export function stepDewQuest(
  current: DewQuestState,
  species: FlySpecies,
  caughtShape: PatternShape | null,
): { next: DewQuestState; progressed: boolean; justCompleted: boolean } {
  if (current.completed || !caughtShape) {
    return { next: current, progressed: false, justCompleted: false };
  }
  const next: DewQuestState = { ...current };
  let progressed = false;

  if (species === 'fatbelly' && caughtShape === 'triangle' && !next.fatbellyTriangle) {
    next.fatbellyTriangle = true;
    progressed = true;
  } else if (species === 'nimble' && caughtShape === 'star' && !next.nimbleStar) {
    next.nimbleStar = true;
    progressed = true;
  } else if (species === 'greenie' && caughtShape === 'circle' && !next.greenieCircle) {
    next.greenieCircle = true;
    progressed = true;
  }

  const allDone = next.fatbellyTriangle && next.nimbleStar && next.greenieCircle;
  const justCompleted = progressed && allDone && !current.completed;
  if (allDone) {
    next.completed = true;
  }

  return { next, progressed, justCompleted };
}

export const LORE_ENTRY_IDS = [
  'shadow_stitch',
  'uspokh_wisdom',
  'khryazh_trail',
  'three_anchors',
  'dew_temper',
  'first_pattern',
] as const;

export function computeUnlockedLoreIds(params: {
  chapter: ChapterPhase;
  greatStrandsDone: number;
  dewQuestCompleted: boolean;
  caughtSpecies: Record<FlySpecies, number>;
}): string[] {
  const { chapter, greatStrandsDone, dewQuestCompleted, caughtSpecies } = params;
  const unlocked: string[] = ['shadow_stitch'];
  const totalCaught =
    caughtSpecies.fatbelly +
    caughtSpecies.nimble +
    caughtSpecies.greenie +
    caughtSpecies.tearbearer;

  if (chapter !== 'prologue' || totalCaught > 0) {
    unlocked.push('uspokh_wisdom');
  }
  if (chapter === 'ch2_wasp' || chapter === 'ch3_great_pattern' || chapter === 'victory') {
    unlocked.push('khryazh_trail');
  }
  if (chapter === 'ch3_great_pattern' || chapter === 'victory' || greatStrandsDone > 0) {
    unlocked.push('three_anchors');
  }
  if (dewQuestCompleted) {
    unlocked.push('dew_temper');
  }
  if (chapter === 'victory' || greatStrandsDone >= 6) {
    unlocked.push('first_pattern');
  }
  return unlocked;
}

/**
 * Checks if the hunting wasp grazes any spun player hunting web low enough for sticky silk threads to slow her wings.
 */
export function isWaspSnaredInWeb(
  waspPos: Vec3,
  patterns: WovenPattern[],
): boolean {
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    if (p.shape === 'decoy') continue;
    const dx = waspPos.x - p.center.x;
    const dz = waspPos.z - p.center.z;
    const r = Math.max(1.2, p.radius * 0.85);
    if (dx * dx + dz * dz <= r * r && Math.abs(waspPos.y - p.center.y) <= 1.35) {
      return true;
    }
  }
  return false;
}

/**
 * Computes sensory setae (hair) vibration amplitude for Pavutin's breathing, combat readiness, and wind tremor.
 */
export function computeSetaeVibrationAmp(params: {
  breathPulse: number;
  combatBlend: number;
  fearIntensity: number; // 0..1
  windStrength: number;
  isGrounded: boolean;
}): number {
  const { breathPulse, combatBlend, fearIntensity, windStrength, isGrounded } = params;
  const breath = 0.0048 + Math.abs(breathPulse) * 0.0024;
  const leapReady = combatBlend * 0.0046 + (isGrounded ? 0 : 0.0032);
  const tension = fearIntensity * 0.0038 + Math.min(0.6, windStrength) * 0.003;
  return Math.min(0.018, breath + leapReady + tension);
}

/**
 * Computes front-leg idle soil tapping waveform [0..1] when Pavutin stands motionless on the ground.
 */
export function computeIdleTapPulse(
  elapsed: number,
  legIndex: number,
  side: -1 | 1,
  isIdleStanding: boolean,
): number {
  if (!isIdleStanding) return 0;
  if (legIndex === 0) {
    const s = Math.max(0, Math.sin(elapsed * 4.4 + (side === 1 ? 0 : 1.15)));
    return Math.pow(s, 8);
  }
  if (legIndex === 1) {
    const s = Math.max(0, Math.sin(elapsed * 2.7 + (side === 1 ? 0.6 : 2.1)));
    return Math.pow(s, 12) * 0.35;
  }
  return 0;
}

/**
 * Projects a 3D world position onto a normalized [-1..1] circular spider-web radar
 * oriented to the camera's forward yaw (north/top of radar = camera forward).
 */
export function projectToRadarCoords(
  playerPos: Vec3,
  camYaw: number,
  targetPos: Vec3,
  maxRange = 22,
): { x: number; z: number; clamped: boolean } {
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const fwdX = -Math.sin(camYaw);
  const fwdZ = -Math.cos(camYaw);
  const rightX = Math.cos(camYaw);
  const rightZ = -Math.sin(camYaw);

  const localRight = dx * rightX + dz * rightZ;
  const localFwd = dx * fwdX + dz * fwdZ;

  const safeRange = Math.max(1, maxRange);
  let nx = localRight / safeRange;
  let nz = -localFwd / safeRange; // +fwd maps upward (-y in SVG/screen space)
  const r = Math.hypot(nx, nz);
  const clamped = r > 1;
  if (clamped) {
    nx /= r;
    nz /= r;
  }
  return {
    x: Number(nx.toFixed(3)),
    z: Number(nz.toFixed(3)),
    clamped,
  };
}

/**
 * Computes silk-thread tension, parabolic sag depth, and spool winding angle for the HUD SVG gauge.
 */
export function computeSilkThreadGauge(
  silk: number,
  maxSilk: number,
): { ratio: number; sagPx: number; spoolTurnsDeg: number } {
  const ratio = Math.max(0, Math.min(1, maxSilk > 0 ? silk / maxSilk : 0));
  // Lower silk slackens the thread gently; full silk pulls taut with minimal sag
  const sagPx = Number((13 - ratio * 9.5).toFixed(2));
  const spoolTurnsDeg = Math.round(ratio * 720);
  return { ratio, sagPx, spoolTurnsDeg };
}

export const GRAPHICS_QUALITY_ORDER = [
  'lowest',
  'low',
  'medium',
  'high',
  'ultra',
  'cinematic',
] as const;

/**
 * Calm nocturnal air condenses moon-dew on mature hunting webs,
 * gently mending weathered strands and distilling passive silk drops.
 */
export function stepWebDewRegeneration(params: {
  patterns: WovenPattern[];
  dt: number;
  isCalm: boolean;
  dewTempered: boolean;
  accumulator: number;
  silk: number;
  maxSilk: number;
}): {
  nextAccumulator: number;
  silkGained: number;
  repairedCount: number;
} {
  const { patterns, dt, isCalm, dewTempered, accumulator, silk, maxSilk } = params;
  if (!isCalm || dt <= 0 || patterns.length === 0) {
    return { nextAccumulator: accumulator, silkGained: 0, repairedCount: 0 };
  }

  let activeHuntingWebs = 0;
  let repairedCount = 0;
  const repairRate = dewTempered ? 2.4 : 1.5;

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    if (p.shape === 'decoy') continue;
    activeHuntingWebs++;
    if (p.durability < p.maxDurability) {
      p.durability = Math.min(p.maxDurability, p.durability + repairRate * dt);
      repairedCount++;
    }
  }

  if (activeHuntingWebs === 0) {
    return { nextAccumulator: accumulator, silkGained: 0, repairedCount: 0 };
  }

  const distillRate = (0.1 + Math.min(3, activeHuntingWebs) * 0.03) * (dewTempered ? 1.35 : 1.0);
  let nextAcc = accumulator + dt * distillRate;
  let silkGained = 0;
  while (nextAcc >= 1.0) {
    nextAcc -= 1.0;
    if (silk + silkGained < maxSilk) {
      silkGained += 1;
    }
  }

  return {
    nextAccumulator: nextAcc,
    silkGained,
    repairedCount,
  };
}


