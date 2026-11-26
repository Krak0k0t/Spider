import test from 'node:test';
import assert from 'node:assert/strict';
import { getTranslations, isRtlLanguage, LANGUAGE_OPTIONS } from './i18n';
import {
  canBearingStrandHold,
  checkGreatPatternComplete,
  classifyPattern,
  computeAerialCatchReward,
  computeCombatStanceBlend,
  computeFearState,
  computeIdleTapPulse,
  computeLodStage,
  computeMacroFocusDistance,
  computePatternSpeciesAffinity,
  computeSetaeVibrationAmp,
  computeSilkBridgeHeight,
  computeSilkThreadGauge,
  computeSurfaceHeight,
  computeUnlockedLoreIds,
  computeWaspRelativeBearingDeg,
  createPatternRecord,
  detectLocationZone,
  DIFFICULTY_CONFIGS,
  GRAPHICS_QUALITY_ORDER,
  groundHeightAt,
  INITIAL_DEW_QUEST,
  isWaspSnaredInWeb,
  projectToRadarCoords,
  resolveObstacleCollisions,
  resolveOutcome,
  stepDewQuest,
  stepPatternDurability,
  stepWaspAI,
  stepWebDewRegeneration,
} from './rules';
import {
  DEFAULT_BINDINGS,
  DEFAULT_SETTINGS,
  formatInputCode,
  matchesBinding,
  rebindActionSlot,
} from './settings';
import {
  getNextCarouselIndex,
  getPrevCarouselIndex,
  getTrackDisplay,
  SOUNDTRACK_TRACKS,
} from './soundtrack';
import type { ObstacleCollider, SilkStrand } from './types';

test('classifyPattern distinguishes triangle, star, circle, and decoy', () => {
  assert.equal(classifyPattern(['a', 'b', 'c'], 'triangle'), 'triangle');
  assert.equal(classifyPattern(['a', 'b', 'c', 'd', 'e'], 'star'), 'star');
  assert.equal(classifyPattern(['a', 'b', 'c', 'd'], 'circle'), 'circle');
  assert.equal(classifyPattern(['a', 'b', 'c'], 'decoy'), 'decoy');
});

test('computeFearState sharpens hearing and blocks precision near wasp when exposed', () => {
  const exposed = computeFearState({
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 3.5, y: 1.2, z: 0 },
    waspState: 'investigate',
    isHiddenInNettle: false,
    isMoving: true,
    windStrength: 0.4,
  });
  assert.ok(exposed.intensity > 0.78);
  assert.equal(exposed.blocksPrecision, true);
  assert.ok(exposed.hearingMultiplier > 1.8);

  const hidden = computeFearState({
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 3.5, y: 1.2, z: 0 },
    waspState: 'investigate',
    isHiddenInNettle: true,
    isMoving: false,
    windStrength: 0.4,
  });
  assert.equal(hidden.blocksPrecision, false);
  assert.ok(hidden.intensity < exposed.intensity);
});

test('stepWaspAI lures Khryazh-Syakaya to a decoy pattern and scales with difficulty', () => {
  const lured = stepWaspAI({
    state: 'perch',
    stateTimer: 1.0,
    dt: 0.1,
    spiderPos: { x: 8, y: 0, z: 2 },
    waspPos: { x: 10, y: 3, z: -2 },
    isHiddenInNettle: true,
    leafRippleRisk: 0.1,
    nearestDecoyPos: { x: 4, y: 1, z: -4 },
    chapter: 'ch2_wasp',
  });
  assert.equal(lured.nextState, 'lured');

  // At 8.5m distance, normal detectionScale (1.0) ignores exposed spider while eclipse (1.45) detects
  const normalPatrol = stepWaspAI({
    state: 'patrol',
    stateTimer: 1.0,
    dt: 0.1,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 8.5, y: 0, z: 0 },
    isHiddenInNettle: false,
    leafRippleRisk: 0.1,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
    detectionScale: DIFFICULTY_CONFIGS.normal.waspDetectionScale,
  });
  assert.equal(normalPatrol.nextState, 'patrol');

  const eclipsePatrol = stepWaspAI({
    state: 'patrol',
    stateTimer: 1.0,
    dt: 0.1,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 8.5, y: 0, z: 0 },
    isHiddenInNettle: false,
    leafRippleRisk: 0.1,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
    detectionScale: DIFFICULTY_CONFIGS.eclipse.waspDetectionScale,
  });
  assert.equal(eclipsePatrol.nextState, 'investigate');
});

test('bearing strand at Left Birch snaps in gusty wind unless triangle braced', () => {
  const snapped = canBearingStrandHold({
    anchorZone: 'left_birch',
    weather: 'gusty',
    hasLeftBirchTriangleBrace: false,
    hasGrapple: true,
  });
  assert.equal(snapped.holds, false);

  const braced = canBearingStrandHold({
    anchorZone: 'left_birch',
    weather: 'gusty',
    hasLeftBirchTriangleBrace: true,
    hasGrapple: true,
  });
  assert.equal(braced.holds, true);
});

test('checkGreatPatternComplete requires 6 bearing strands and 100 silk', () => {
  const strands: SilkStrand[] = Array.from({ length: 6 }, (_, i) => ({
    id: `b_${i}`,
    fromId: 'a',
    toId: 'b',
    isBearing: true,
    durability: 100,
    maxDurability: 100,
    createdAt: i,
  }));
  assert.deepEqual(checkGreatPatternComplete(strands, 99), {
    ready: false,
    count: 6,
    missingSilk: 1,
  });
  assert.deepEqual(checkGreatPatternComplete(strands, 100), {
    ready: true,
    count: 6,
    missingSilk: 0,
  });
});

test('groundHeightAt creates a hollow depression and detectLocationZone classifies regions', () => {
  const mainGround = groundHeightAt(0, 0);
  const hollow = groundHeightAt(-11.2, 1.5);
  assert.ok(hollow < mainGround - 1.2);

  const nettles = [{ x: 8.6, z: 2.2, radius: 3.3 }];
  assert.equal(detectLocationZone({ x: 8.5, y: 0, z: 2.0 }, nettles), 'nettle');
  assert.equal(detectLocationZone({ x: -16, y: 0, z: 2.0 }, nettles), 'stump');
  assert.equal(detectLocationZone({ x: -10, y: 0, z: 1.5 }, nettles), 'hollow');
  assert.equal(detectLocationZone({ x: -9, y: 0, z: -12 }, nettles), 'left_birch');
  assert.equal(detectLocationZone({ x: 10, y: 0, z: -11 }, nettles), 'right_birch');
  assert.equal(detectLocationZone({ x: 0, y: 0, z: -13 }, nettles), 'field');
  assert.equal(detectLocationZone({ x: 0.4, y: 0, z: 3.2 }, nettles), 'log');
});

test('resolveOutcome returns victory or retreat accurately', () => {
  assert.equal(resolveOutcome({ chapter: 'victory', composure: 3 }), 'victory');
  assert.equal(resolveOutcome({ chapter: 'ch2_wasp', composure: 0 }), 'retreat');
  assert.equal(resolveOutcome({ chapter: 'ch2_wasp', composure: 2 }), null);
});

test('default key/mouse bindings map Space and MouseRight to jump and support rebinding', () => {
  assert.equal(matchesBinding('Space', DEFAULT_BINDINGS, 'jump'), true);
  assert.equal(matchesBinding('MouseRight', DEFAULT_BINDINGS, 'jump'), true);
  assert.equal(formatInputCode('MouseRight'), 'RMB');
  assert.equal(formatInputCode('KeyE'), 'E');

  const rebound = rebindActionSlot(DEFAULT_BINDINGS, 'jump', 0, 'KeyC');
  assert.equal(matchesBinding('KeyC', rebound, 'jump'), true);
  assert.equal(matchesBinding('Space', rebound, 'jump'), false);
});

test('localization covers all 16 requested languages with English default and RTL flags', () => {
  assert.equal(LANGUAGE_OPTIONS.length, 16);
  assert.equal(LANGUAGE_OPTIONS[0].code, 'en');
  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('fa'), true);
  assert.equal(isRtlLanguage('en'), false);

  for (const opt of LANGUAGE_OPTIONS) {
    const bundle = getTranslations(opt.code);
    assert.ok(bundle.gameTitle.length > 0);
    assert.ok(bundle.startBtn.length > 0);
    assert.ok(bundle.actions.jump.length > 0);
  }
});

test('resolveObstacleCollisions blocks walking through trees and rocks while supporting climbable tops', () => {
  const colliders: ObstacleCollider[] = [
    {
      id: 'birch_left',
      kind: 'tree',
      x: -10.8,
      z: -14.2,
      radius: 1.55,
      topY: 22,
      climbable: false,
    },
    {
      id: 'boulder_moss',
      kind: 'rock',
      x: 4.5,
      z: 3.5,
      radius: 1.15,
      topY: 1.2,
      climbable: true,
    },
  ];

  // Spider trying to walk straight into tree trunk center is pushed outside radius + spiderRadius
  const spiderRadius = 0.42;
  const nearTree = { x: -10.4, y: 0.2, z: -13.9 };
  const hitTree = resolveObstacleCollisions(nearTree, spiderRadius, colliders);
  assert.equal(hitTree, true);
  assert.ok(
    Math.hypot(nearTree.x - (-10.8), nearTree.z - (-14.2)) >=
      1.55 + spiderRadius - 1e-4,
  );

  // Spider at ground level cannot clip inside boulder
  const lowBoulderApproach = { x: 4.9, y: 0.1, z: 3.5 };
  assert.equal(
    resolveObstacleCollisions(lowBoulderApproach, spiderRadius, colliders),
    true,
  );
  assert.ok(Math.hypot(lowBoulderApproach.x - 4.5, lowBoulderApproach.z - 3.5) >= 1.56);

  // Spider jumping above the boulder rim can stand atop it cleanly
  const highBoulderTop = { x: 4.6, y: 1.25, z: 3.5 };
  assert.equal(
    resolveObstacleCollisions(highBoulderTop, spiderRadius, colliders),
    false,
  );
  assert.ok(computeSurfaceHeight(4.6, 3.5, colliders) >= 1.2);
});

test('fallen log collider blocks ground-level entry while allowing curved top climbing after jump', () => {
  const logCenterY = 0.85;
  const logRadius = 0.85;
  const logCollider: ObstacleCollider = {
    id: 'log_seg_3',
    kind: 'log',
    x: 0.4,
    z: 0.2,
    radius: logRadius,
    centerY: logCenterY,
    topY: logCenterY + logRadius,
    climbable: true,
  };

  const spiderRadius = 0.42;
  // Walking straight into the side of the fallen log at ground level gets pushed out
  const groundApproach = { x: 0.4, y: 0.12, z: 0.95 };
  assert.equal(
    resolveObstacleCollisions(groundApproach, spiderRadius, [logCollider]),
    true,
  );
  assert.ok(
    Math.hypot(groundApproach.x - 0.4, groundApproach.z - 0.2) >=
      logRadius + spiderRadius - 1e-4,
  );

  // Jumping above the log shoulder (centerY + 0.12) lets Pavutin land on its curved bark ridge
  const jumpedAtop = { x: 0.4, y: logCenterY + 0.3, z: 0.2 };
  assert.equal(
    resolveObstacleCollisions(jumpedAtop, spiderRadius, [logCollider]),
    false,
  );
  const topHeight = computeSurfaceHeight(0.4, 0.2, [logCollider]);
  assert.ok(Math.abs(topHeight - (logCenterY + logRadius + 0.03)) < 1e-4);
});

test('combat stance activates automatically near grounded flies and macro focus tracks target', () => {
  assert.equal(computeCombatStanceBlend(5.0, true), 0);
  assert.equal(computeCombatStanceBlend(2.5, false), 0);
  const mid = computeCombatStanceBlend(3.15, true);
  assert.ok(mid > 0.3 && mid < 0.7);
  assert.equal(computeCombatStanceBlend(1.8, true), 1);

  assert.equal(computeMacroFocusDistance(5.4, 7.2, 6.0), 5.4);
  const blended = computeMacroFocusDistance(5.4, 6.4, 1.5);
  assert.ok(blended > 5.4 && blended < 6.4);

  assert.equal(computeLodStage(9, 15, 23), 0);
  assert.equal(computeLodStage(17, 15, 23), 1);
  assert.equal(computeLodStage(25, 15, 23), 2);
});

test('soundtrack carousel covers all 7 requested tracks with evocative titles and wraps cleanly', () => {
  const expectedFiles = [
    'Meditation.ogg',
    'The Night Is Their Ally.ogg',
    'Conflict of the Soul.ogg',
    'The Weight of the Hammer.ogg',
    'Pain Is Everything.ogg',
    'Our Last Dance.ogg',
    'The Last Stand of Heroes.ogg',
  ];
  assert.equal(SOUNDTRACK_TRACKS.length, 7);
  for (const file of expectedFiles) {
    assert.ok(
      SOUNDTRACK_TRACKS.some((t) => t.file === file),
      `Missing expected track ${file}`,
    );
  }
  for (const t of SOUNDTRACK_TRACKS) {
    assert.ok(t.fallbackFile.endsWith('.ogg'));
    assert.ok(t.fallbackUrl.startsWith('/music/ambient/'));
    const ru = getTrackDisplay(t, 'ru');
    const en = getTrackDisplay(t, 'en');
    assert.ok(ru.title.length > 0 && ru.mood.length > 0);
    assert.ok(en.title.length > 0 && en.mood.length > 0);
  }
  assert.equal(getNextCarouselIndex(6), 0);
  assert.equal(getPrevCarouselIndex(0), 6);
  assert.equal(getNextCarouselIndex(2), 3);
  assert.equal(getPrevCarouselIndex(2), 1);
});

test('computeSilkBridgeHeight supports walking along elevated spun silk strands', () => {
  const anchors = new Map([
    ['a', { x: 0, y: 1.5, z: 0 }],
    ['b', { x: 4, y: 2.5, z: 0 }],
  ]);
  const strands: SilkStrand[] = [
    {
      id: 's1',
      fromId: 'a',
      toId: 'b',
      durability: 100,
      maxDurability: 100,
      createdAt: 0,
    },
  ];

  // Midpoint along strand while airborne/high engages tightrope at y ~ 2.03
  const midHit = computeSilkBridgeHeight(2.0, 0.15, 1.8, strands, anchors);
  assert.equal(midHit.strandId, 's1');
  assert.ok(midHit.height !== null && Math.abs(midHit.height - 2.03) < 0.02);

  // Far below ground ignores high overhead strands
  const underneath = computeSilkBridgeHeight(2.0, 0.0, 0.2, strands, anchors);
  assert.equal(underneath.height, null);
  assert.equal(underneath.strandId, null);

  // Too far sideways misses the strand corridor
  const offSide = computeSilkBridgeHeight(2.0, 1.1, 2.2, strands, anchors);
  assert.equal(offSide.height, null);
});

test('aerial catch bonus, species-pattern lure affinity, and gust durability decay behave accurately', () => {
  assert.deepEqual(computeAerialCatchReward(20, false), {
    totalReward: 20,
    aerialBonus: 0,
  });
  assert.deepEqual(computeAerialCatchReward(20, true), {
    totalReward: 26,
    aerialBonus: 6,
  });

  assert.ok(computePatternSpeciesAffinity('triangle', 'fatbelly') > 1.3);
  assert.ok(computePatternSpeciesAffinity('star', 'nimble') > 1.3);
  assert.ok(computePatternSpeciesAffinity('circle', 'greenie') > 1.3);
  assert.ok(computePatternSpeciesAffinity('circle', 'fatbelly') < 1.0);
  assert.equal(computePatternSpeciesAffinity('decoy', 'greenie'), 0);

  const circleWeb = createPatternRecord({
    id: 'p_circle',
    shape: 'circle',
    nodeIds: ['a', 'b', 'c', 'd'],
    positions: [
      { x: 0, y: 1, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 2, y: 1, z: 2 },
      { x: 0, y: 1, z: 2 },
    ],
    createdAt: 0,
  });
  const triWeb = createPatternRecord({
    id: 'p_tri',
    shape: 'triangle',
    nodeIds: ['a', 'b', 'c'],
    positions: [
      { x: 0, y: 1, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 1, y: 1, z: 2 },
    ],
    createdAt: 0,
  });

  stepPatternDurability([circleWeb, triWeb], 4, true);
  assert.ok(circleWeb.durability < triWeb.durability);
  assert.ok(triWeb.durability > 95);
});

test('wasp dive hits at most once, is dodgeable by sidestepping or dashing, and stillness shrinks detection', () => {
  // Standing still at 5.5m avoids normal patrol detection (7.2 * 0.58 = 4.17m)
  const stillFar = stepWaspAI({
    state: 'patrol',
    stateTimer: 1.0,
    dt: 0.1,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 5.5, y: 0, z: 0 },
    isHiddenInNettle: false,
    isMoving: false,
    leafRippleRisk: 0.05,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
    detectionScale: 1.0,
  });
  assert.equal(stillFar.nextState, 'patrol');

  // Post-dive cooldown prevents immediate re-investigation even when exposed
  const cooldownPatrol = stepWaspAI({
    state: 'patrol',
    stateTimer: 1.0,
    dt: 0.1,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 3.0, y: 0, z: 0 },
    isHiddenInNettle: false,
    isMoving: true,
    postDiveCooldown: 2.5,
    leafRippleRisk: 0.5,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
  });
  assert.equal(cooldownPatrol.nextState, 'patrol');

  // Dive before 0.58s windup does not deal damage; at 0.7s without dodge/commit it hits once; with commit it never hits again
  const windup = stepWaspAI({
    state: 'dive',
    stateTimer: 0.3,
    dt: 0.1,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 0, y: 1.2, z: 0 },
    isHiddenInNettle: false,
    diveTargetPos: { x: 0, y: 0, z: 0 },
    leafRippleRisk: 0.5,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
  });
  assert.equal(windup.triggeredDiveHit, false);

  const secondFrameAlreadyHit = stepWaspAI({
    state: 'dive',
    stateTimer: 0.7,
    dt: 0.05,
    spiderPos: { x: 0, y: 0, z: 0 },
    waspPos: { x: 0, y: 0.6, z: 0 },
    isHiddenInNettle: false,
    diveHitCommitted: true,
    diveTargetPos: { x: 0, y: 0, z: 0 },
    leafRippleRisk: 0.5,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
  });
  assert.equal(secondFrameAlreadyHit.triggeredDiveHit, false);

  // Dashing away from diveTargetPos avoids the hit and rewards dodgedDive on finish
  const dodgedEnd = stepWaspAI({
    state: 'dive',
    stateTimer: 1.15,
    dt: 0.1,
    spiderPos: { x: 3.2, y: 0, z: 0 },
    waspPos: { x: 0, y: 0.7, z: 0 },
    isHiddenInNettle: false,
    diveHitCommitted: false,
    isDodging: true,
    diveTargetPos: { x: 0, y: 0, z: 0 },
    leafRippleRisk: 0.3,
    nearestDecoyPos: null,
    chapter: 'ch2_wasp',
  });
  assert.equal(dodgedEnd.triggeredDiveHit, false);
  assert.equal(dodgedEnd.dodgedDive, true);
  assert.equal(dodgedEnd.nextState, 'patrol');

  // Relative bearing checks
  assert.equal(computeWaspRelativeBearingDeg({ x: 0, y: 0, z: 0 }, 0, { x: 0, y: 2, z: -6 }), 0);
  assert.equal(computeWaspRelativeBearingDeg({ x: 0, y: 0, z: 0 }, 0, { x: 6, y: 2, z: 0 }), 90);
  assert.equal(computeWaspRelativeBearingDeg({ x: 0, y: 0, z: 0 }, 0, { x: -6, y: 2, z: 0 }), -90);
});

test('Three Drops of Moon Dew quest, Lore progression, windDecayScale, and wasp web-snare work accurately', () => {
  // Mismatched shape does not progress quest
  const mismatch = stepDewQuest(INITIAL_DEW_QUEST, 'fatbelly', 'circle');
  assert.equal(mismatch.progressed, false);
  assert.equal(mismatch.justCompleted, false);

  const s1 = stepDewQuest(INITIAL_DEW_QUEST, 'fatbelly', 'triangle');
  assert.equal(s1.progressed, true);
  assert.equal(s1.next.fatbellyTriangle, true);
  assert.equal(s1.justCompleted, false);

  const s2 = stepDewQuest(s1.next, 'nimble', 'star');
  assert.equal(s2.progressed, true);
  assert.equal(s2.next.nimbleStar, true);
  assert.equal(s2.justCompleted, false);

  const s3 = stepDewQuest(s2.next, 'greenie', 'circle');
  assert.equal(s3.progressed, true);
  assert.equal(s3.justCompleted, true);
  assert.equal(s3.next.completed, true);

  // Lore progression
  const lorePrologue = computeUnlockedLoreIds({
    chapter: 'prologue',
    greatStrandsDone: 0,
    dewQuestCompleted: false,
    caughtSpecies: { fatbelly: 0, nimble: 0, greenie: 0, tearbearer: 0 },
  });
  assert.deepEqual(lorePrologue, ['shadow_stitch']);

  const loreVictory = computeUnlockedLoreIds({
    chapter: 'victory',
    greatStrandsDone: 6,
    dewQuestCompleted: true,
    caughtSpecies: { fatbelly: 2, nimble: 1, greenie: 1, tearbearer: 1 },
  });
  assert.equal(loreVictory.length, 6);
  assert.ok(loreVictory.includes('dew_temper'));
  assert.ok(loreVictory.includes('first_pattern'));

  // Dew-tempered windDecayScale slows web decay
  const webA = createPatternRecord({
    id: 'w_a',
    shape: 'circle',
    nodeIds: ['a', 'b', 'c', 'd'],
    positions: [
      { x: 0, y: 1, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 2, y: 1, z: 2 },
      { x: 0, y: 1, z: 2 },
    ],
    createdAt: 0,
  });
  const webB = { ...webA, id: 'w_b', durability: 100 };
  stepPatternDurability([webA], 5, true, 1.0);
  stepPatternDurability([webB], 5, true, 0.65);
  assert.ok(webB.durability > webA.durability);

  // Wasp low near circle web gets snared; decoy or high flight does not snare
  assert.equal(isWaspSnaredInWeb({ x: 1, y: 1.5, z: 1 }, [webA]), true);
  assert.equal(isWaspSnaredInWeb({ x: 1, y: 4.5, z: 1 }, [webA]), false);
});

test('setae hair vibration scales smoothly with combat/fear/leap and idle front-leg tap oscillates selectively', () => {
  const calmAmp = computeSetaeVibrationAmp({
    breathPulse: 0,
    combatBlend: 0,
    fearIntensity: 0,
    windStrength: 0.12,
    isGrounded: true,
  });
  const tenseAmp = computeSetaeVibrationAmp({
    breathPulse: 1,
    combatBlend: 1,
    fearIntensity: 0.85,
    windStrength: 0.5,
    isGrounded: false,
  });
  assert.ok(calmAmp > 0.003 && calmAmp < 0.008);
  assert.ok(tenseAmp > calmAmp * 1.8 && tenseAmp <= 0.018);

  // Idle front-leg tap is zero when walking or on hind legs, and pulses [0..1] when standing
  assert.equal(computeIdleTapPulse(0.4, 0, 1, false), 0);
  assert.equal(computeIdleTapPulse(0.4, 3, 1, true), 0);
  let maxRightTap = 0;
  for (let t = 0; t < 3; t += 0.05) {
    const p = computeIdleTapPulse(t, 0, 1, true);
    assert.ok(p >= 0 && p <= 1);
    if (p > maxRightTap) maxRightTap = p;
  }
  assert.ok(maxRightTap > 0.85);
});

test('Spider-Web Radar coordinates project camera-relativity and clamp outer perimeter blips', () => {
  const player = { x: 0, y: 0, z: 0 };
  const ahead = projectToRadarCoords(player, 0, { x: 0, y: 0, z: -11 }, 22);
  assert.equal(ahead.x, 0);
  assert.equal(ahead.z, -0.5);
  assert.equal(ahead.clamped, false);

  const right = projectToRadarCoords(player, 0, { x: 11, y: 0, z: 0 }, 22);
  assert.equal(right.x, 0.5);
  assert.equal(right.z, 0);

  const far = projectToRadarCoords(player, 0, { x: 60, y: 0, z: -60 }, 22);
  assert.equal(far.clamped, true);
  assert.ok(Math.abs(Math.hypot(far.x, far.z) - 1) < 0.02);
});

test('Silk thread gauge relaxes sag as silk drains and accessibility defaults are clean', () => {
  const full = computeSilkThreadGauge(160, 160);
  const low = computeSilkThreadGauge(20, 160);
  assert.equal(full.ratio, 1);
  assert.ok(low.sagPx > full.sagPx);
  assert.ok(full.spoolTurnsDeg > low.spoolTurnsDeg);

  assert.equal(DEFAULT_SETTINGS.uiScale, 1);
  assert.equal(DEFAULT_SETTINGS.colorblindMode, false);
  assert.equal(DEFAULT_SETTINGS.reducedEffects, false);
});

test('all 6 graphics presets exist with localized labels and moon-dew regeneration works in calm weather', () => {
  assert.equal(GRAPHICS_QUALITY_ORDER.length, 6);
  assert.equal(GRAPHICS_QUALITY_ORDER[0], 'lowest');
  assert.equal(GRAPHICS_QUALITY_ORDER[5], 'cinematic');

  for (const lang of ['en', 'ru'] as const) {
    const bundle = getTranslations(lang);
    for (const tier of GRAPHICS_QUALITY_ORDER) {
      assert.ok(bundle.graphics[tier].name.length > 0);
      assert.ok(bundle.graphics[tier].desc.length > 0);
    }
  }

  const wornWeb = createPatternRecord({
    id: 'dew_web',
    shape: 'triangle',
    nodeIds: ['a', 'b', 'c'],
    positions: [
      { x: 0, y: 1, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 1, y: 1, z: 2 },
    ],
    createdAt: 0,
  });
  wornWeb.durability = 72;

  const gustyResult = stepWebDewRegeneration({
    patterns: [wornWeb],
    dt: 5,
    isCalm: false,
    dewTempered: true,
    accumulator: 0,
    silk: 40,
    maxSilk: 160,
  });
  assert.equal(gustyResult.silkGained, 0);
  assert.equal(wornWeb.durability, 72);

  const calmResult = stepWebDewRegeneration({
    patterns: [wornWeb],
    dt: 10,
    isCalm: true,
    dewTempered: true,
    accumulator: 0,
    silk: 40,
    maxSilk: 160,
  });
  assert.ok(wornWeb.durability > 90);
  assert.ok(calmResult.silkGained >= 1);
  assert.equal(calmResult.repairedCount, 1);
});







