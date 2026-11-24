import test from 'node:test';
import assert from 'node:assert/strict';
import { getTranslations, isRtlLanguage, LANGUAGE_OPTIONS } from './i18n';
import {
  canBearingStrandHold,
  checkGreatPatternComplete,
  classifyPattern,
  computeCombatStanceBlend,
  computeFearState,
  computeLodStage,
  computeMacroFocusDistance,
  computeSurfaceHeight,
  detectLocationZone,
  DIFFICULTY_CONFIGS,
  groundHeightAt,
  resolveObstacleCollisions,
  resolveOutcome,
  stepWaspAI,
} from './rules';
import {
  DEFAULT_BINDINGS,
  formatInputCode,
  matchesBinding,
  rebindActionSlot,
} from './settings';
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


