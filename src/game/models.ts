import * as THREE from 'three';
import { groundHeightAt, POND_WATER_Y } from './rules';
import type { ProceduralTextureSet } from './textures';
import type { AnchorNode, FlySpecies, ObstacleCollider } from './types';

export interface PavutinRig {
  root: THREE.Group;
  body: THREE.Group;
  abdomen: THREE.Mesh;
  chelicerae: [THREE.Group, THREE.Group];
  pedipalps: [THREE.Group, THREE.Group];
  legs: {
    hip: THREE.Group;
    knee: THREE.Group;
    ankle: THREE.Group;
    side: -1 | 1;
    index: number; // 0..3 front to back
  }[];
  shadowDisc: THREE.Mesh;
  silkGlowMat: THREE.MeshStandardMaterial;
  setaeUniforms: {
    uSetaeTime: { value: number };
    uSetaeAmp: { value: number };
  };
  abdSetaeGroup: THREE.Group;
  cephSetaeGroup: THREE.Group;
}

export interface WaspRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  antennae: [THREE.Group, THREE.Group];
  forewings: [THREE.Mesh, THREE.Mesh];
  hindwings: [THREE.Mesh, THREE.Mesh];
  blurFans: [THREE.Mesh, THREE.Mesh];
  abdomen: THREE.Group;
  legs: THREE.Group[];
  shadowDisc: THREE.Mesh;
  wingMat: THREE.MeshPhysicalMaterial;
  blurMat: THREE.MeshStandardMaterial;
  shadowDiscMat: THREE.MeshStandardMaterial;
}

export interface FlyRig {
  root: THREE.Group;
  body: THREE.Group;
  wings: [THREE.Mesh, THREE.Mesh];
  blurFans: [THREE.Mesh, THREE.Mesh];
  halteres: [THREE.Mesh, THREE.Mesh];
  legsGroup: THREE.Group;
  silkWrapMesh: THREE.Mesh;
  tearOrb?: THREE.Mesh;
  shadowDisc: THREE.Mesh;
}

export interface ForestWorldHandle {
  anchors: AnchorNode[];
  anchorMeshes: Map<string, THREE.Mesh>;
  colliders: ObstacleCollider[];
  nettleZones: { x: number; z: number; radius: number }[];
  nettleLeafInstances: THREE.InstancedMesh;
  fernInstances: THREE.InstancedMesh;
  grassInstances: THREE.InstancedMesh;
  distantGrassSpritesInst: THREE.InstancedMesh;
  windStreaksInst: THREE.InstancedMesh;
  lodRocks: THREE.LOD[];
  cloverInstances: THREE.InstancedMesh;
  fallenLeafInstances: THREE.InstancedMesh;
  mistInstances: THREE.InstancedMesh;
  pondWaterUniforms: {
    uTime: { value: number };
    uWindStrength: { value: number };
    uResolution: { value: THREE.Vector2 };
    uFogColor: { value: THREE.Color };
    uFogDensity: { value: number };
    uFireflyPos: { value: THREE.Vector3[] };
  };
  pondMistUniforms: {
    uTime: { value: number };
    uFogColor: { value: THREE.Color };
    uFogDensity: { value: number };
    uFireflyPos: { value: THREE.Vector3[] };
  };
  pondFireflyPositions: THREE.Vector3[];
  pondFireflyLight: THREE.PointLight;
  uspokh: PavutinRig;
  windTimeUniform: { value: number };
  windStrengthUniform: { value: number };
  windEnabledUniform: { value: number };
  moonBeamsGroup: THREE.Group;
  moonBeamMat: THREE.MeshStandardMaterial;
  sacredFrameLight: THREE.PointLight;
  greatFrameGlade: THREE.Mesh;
  moonMesh: THREE.Mesh;
  pantryLight: THREE.PointLight;
  uspokhLeafShadow: THREE.Mesh;
  dispose: () => void;
}

function applyFoliageWindShader(
  material: THREE.Material,
  windTimeUniform: { value: number },
  windStrengthUniform: { value: number },
  windEnabledUniform: { value: number },
  swayFactor: number,
  centeredCard = false,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTimeUniform;
    shader.uniforms.uWindStrength = windStrengthUniform;
    shader.uniforms.uWindEnabled = windEnabledUniform;
    shader.vertexShader =
      `uniform float uWindTime;\nuniform float uWindStrength;\nuniform float uWindEnabled;\n` +
      shader.vertexShader;
    const heightExpr = centeredCard
      ? 'clamp(length(position.xy) * 0.55, 0.12, 2.4)'
      : 'clamp(position.y, 0.0, 2.4)';
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      if (uWindEnabled > 0.5) {
        float windHeight = ${heightExpr};
        float windPhase = uWindTime * 2.25;
        #ifdef USE_INSTANCING
          windPhase += instanceMatrix[3][0] * 0.62 + instanceMatrix[3][2] * 0.47;
        #else
          windPhase += position.x * 0.62 + position.z * 0.47;
        #endif
        float gustWave = sin(windPhase) * 0.64 + sin(windPhase * 2.35 + 1.15) * 0.36;
        float flutter = sin(windPhase * 3.1 + position.x * 2.4) * 0.14;
        float amp = windHeight * (0.26 + uWindStrength * 1.18) * ${swayFactor.toFixed(3)} * uWindEnabled;
        transformed.x += gustWave * amp;
        transformed.y += flutter * amp;
        transformed.z += cos(windPhase * 0.9) * amp * 0.72;
      }`,
    );
  };
  material.customProgramCacheKey = () =>
    `foliage_wind_v2_${swayFactor.toFixed(2)}_${centeredCard ? 1 : 0}`;
}

/**
 * Animates sensory setae tips in vertex space via sinusoidal wave displacement
 * while keeping hair roots (aTip = 0.0) anchored firmly to the spider carapace & legs.
 */
function applySetaeVibrationShader(
  material: THREE.Material,
  setaeTimeUniform: { value: number },
  setaeAmpUniform: { value: number },
  cacheTag: string,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSetaeTime = setaeTimeUniform;
    shader.uniforms.uSetaeAmp = setaeAmpUniform;
    shader.vertexShader =
      `attribute float aTip;\nuniform float uSetaeTime;\nuniform float uSetaeAmp;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float sPhase = uSetaeTime * 9.5 + position.x * 28.0 + position.y * 22.0 + position.z * 26.0;
      float sBurst = 0.68 + 0.32 * sin(uSetaeTime * 3.1 + position.z * 9.0);
      float sScale = aTip * uSetaeAmp * sBurst;
      transformed.x += sin(sPhase) * sScale;
      transformed.y += cos(sPhase * 1.27 + 0.8) * sScale * 0.72;
      transformed.z += sin(sPhase * 1.43 + 1.9) * sScale;`,
    );
  };
  material.customProgramCacheKey = () => `setae_vibe_${cacheTag}`;
}

/**
 * Merges multiple sub-geometries into one single BufferGeometry for zero-overhead rendering/instancing.
 */
function mergeSimpleGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const totalVerts = geometries.reduce((acc, g) => acc + g.attributes.position.count, 0);
  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedNorm = new Float32Array(totalVerts * 3);
  const mergedUv = new Float32Array(totalVerts * 2);
  const indices: number[] = [];

  let vOffset = 0;
  for (const g of geometries) {
    mergedPos.set(g.attributes.position.array as Float32Array, vOffset * 3);
    mergedNorm.set(g.attributes.normal.array as Float32Array, vOffset * 3);
    mergedUv.set(g.attributes.uv.array as Float32Array, vOffset * 2);
    const idx = g.getIndex()!;
    for (let k = 0; k < idx.count; k++) {
      indices.push(idx.getX(k) + vOffset);
    }
    vOffset += g.attributes.position.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
  merged.setIndex(indices);
  return merged;
}

/**
 * Creates a cupped, intersecting 2-plane 3D foliage cluster geometry so tree crowns
 * never read as single flat cardboard billboards from any camera angle.
 */
function createCurvedFoliageClusterGeo(size: number): THREE.BufferGeometry {
  const buildCupped = (rotY: number, tiltX: number): THREE.BufferGeometry => {
    const p = new THREE.PlaneGeometry(size, size, 3, 3);
    const pos = p.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const r2 = (vx * vx + vy * vy) / (size * size * 0.5);
      pos.setZ(i, (0.14 - r2 * 0.34) * size);
    }
    p.computeVertexNormals();
    p.rotateX(tiltX);
    p.rotateY(rotY);
    return p;
  };
  return mergeSimpleGeometries([
    buildCupped(0, -0.18),
    buildCupped(Math.PI * 0.42, 0.22),
  ]);
}

/**
 * Generates a heavy, ancient fractured granite boulder BufferGeometry
 * with angular spalled chips, cleavage facets, and natural strata ledges.
 */
function createDisplacedRockGeometry(
  seedOffset: number,
  detail = 2,
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1.0, detail);
  const pos = geo.attributes.position;
  // Deterministic cleavage plane normals to create sharp ancient spalled stone facets
  const p1 = new THREE.Vector3(Math.sin(seedOffset), 0.55, Math.cos(seedOffset)).normalize();
  const p2 = new THREE.Vector3(-Math.cos(seedOffset * 1.4), 0.35, Math.sin(seedOffset * 1.4)).normalize();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    v.set(x, y, z).normalize();

    const n1 =
      Math.sin(x * 2.9 + seedOffset) *
      Math.cos(z * 2.7 - seedOffset * 0.7) *
      Math.sin(y * 3.1 + 0.6);
    const n2 =
      Math.sin((x + y) * 6.2 + seedOffset * 1.7) *
      Math.cos((z - y) * 5.7) *
      0.34;
    const strata = Math.sin(y * 8.4 + n1 * 1.6) * 0.055;
    let disp = 0.9 + n1 * 0.22 + n2 * 0.13 + strata;

    // Angular chips / planar cleavage bevels
    const d1 = v.dot(p1);
    const d2 = v.dot(p2);
    if (d1 > 0.56) disp -= (d1 - 0.56) * 0.55;
    if (d2 > 0.6) disp -= (d2 - 0.6) * 0.48;

    const yMul = y > 0.45 ? 0.8 : y < -0.5 ? 0.54 : 0.94;
    pos.setXYZ(i, x * disp, y * disp * yMul, z * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Redrawn Maximally Realistic Composite Spider Rig (Pavutin & Elder Uspokh):
 * - Sculpted prosoma + fovea + velvety micro-setae fur & lunar chevron texture
 * - 8 glossy wet-look eyes (2 large AME + 6 secondary ocelli catching moonlight)
 * - Articulated chelicerae with fangs + 2 segmented pedipalps + 3-nozzle spinnerets
 * - 8 true 4-segment articulated legs (Coxa, Femur, Patella/Tibia, Metatarsus/Tarsus + hooked claws + sensory spines)
 */
/**
 * Generates deterministic fine sensory setae bristles (LineSegments) and fuzzy micro-hair mist (Points)
 * anchored in the local space of an ellipsoid/cylinder body part so they move & breathe seamlessly with the rig.
 */
function createEllipsoidSetae(
  rx: number,
  ry: number,
  rz: number,
  hairCount: number,
  hairLen: number,
  seed: number,
  rootColorHex: number,
  tipColorHex: number,
  lineMat: THREE.LineBasicMaterial,
  pointMat: THREE.PointsMaterial,
  minNormalY = -0.35,
  pointCount = 0,
): { lines: THREE.LineSegments; points?: THREE.Points } {
  const positions = new Float32Array(hairCount * 6);
  const colors = new Float32Array(hairCount * 6);
  const tips = new Float32Array(hairCount * 2);
  const rootCol = new THREE.Color(rootColorHex);
  const tipCol = new THREE.Color(tipColorHex);

  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  let written = 0;
  let attempts = 0;
  while (written < hairCount && attempts < hairCount * 5) {
    attempts++;
    const u = rnd();
    const v = rnd();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    if (ny < minNormalY) continue;

    const px = nx * rx;
    const py = ny * ry;
    const pz = nz * rz;

    // Slight sweep backward (-Z) and upward (+Y) like organic spider/insect setae
    const len = hairLen * (0.68 + rnd() * 0.65);
    const dx = nx * 0.82 + (rnd() - 0.5) * 0.25;
    const dy = ny * 0.78 + 0.16;
    const dz = nz * 0.72 - 0.34;
    const invD = len / Math.max(0.001, Math.hypot(dx, dy, dz));

    const off = written * 6;
    positions[off] = px;
    positions[off + 1] = py;
    positions[off + 2] = pz;
    positions[off + 3] = px + dx * invD;
    positions[off + 4] = py + dy * invD;
    positions[off + 5] = pz + dz * invD;

    colors[off] = rootCol.r;
    colors[off + 1] = rootCol.g;
    colors[off + 2] = rootCol.b;
    colors[off + 3] = tipCol.r;
    colors[off + 4] = tipCol.g;
    colors[off + 5] = tipCol.b;

    const tOff = written * 2;
    tips[tOff] = 0.0;
    tips[tOff + 1] = 1.0;
    written++;
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, written * 6), 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(colors.subarray(0, written * 6), 3));
  lineGeo.setAttribute('aTip', new THREE.BufferAttribute(tips.subarray(0, written * 2), 1));
  const lines = new THREE.LineSegments(lineGeo, lineMat);

  if (pointCount <= 0) {
    return { lines };
  }

  const ptPos = new Float32Array(pointCount * 3);
  const ptTips = new Float32Array(pointCount);
  let pWritten = 0;
  let pAtt = 0;
  while (pWritten < pointCount && pAtt < pointCount * 4) {
    pAtt++;
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(2 * rnd() - 1);
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    if (ny < -0.15) continue;
    const lift = 1.02 + rnd() * 0.04;
    const pOff = pWritten * 3;
    ptPos[pOff] = nx * rx * lift;
    ptPos[pOff + 1] = ny * ry * lift;
    ptPos[pOff + 2] = nz * rz * lift;
    ptTips[pWritten] = 0.85;
    pWritten++;
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos.subarray(0, pWritten * 3), 3));
  ptGeo.setAttribute('aTip', new THREE.BufferAttribute(ptTips.subarray(0, pWritten), 1));
  const points = new THREE.Points(ptGeo, pointMat);
  return { lines, points };
}

function createLegSegmentSetaeGeo(
  len: number,
  radius: number,
  side: -1 | 1,
  count: number,
  hairLen: number,
  seed: number,
): THREE.BufferGeometry {
  const positions = new Float32Array(count * 6);
  const colors = new Float32Array(count * 6);
  const tips = new Float32Array(count * 2);
  const rootCol = new THREE.Color(0x4a3d33);
  const tipCol = new THREE.Color(0xc8deff);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    const t = 0.08 + rnd() * 0.84;
    const ang = rnd() * Math.PI * 2;
    const yPos = t * len;
    const rAtT = radius * (1 - t * 0.25);
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    const bx = nx * rAtT;
    const bz = nz * rAtT;

    const hl = hairLen * (0.65 + rnd() * 0.7);
    const dx = nx * 0.72 - side * 0.24;
    const dy = 0.56 + rnd() * 0.32;
    const dz = nz * 0.72;
    const inv = hl / Math.max(0.001, Math.hypot(dx, dy, dz));

    const off = i * 6;
    positions[off] = bx;
    positions[off + 1] = yPos;
    positions[off + 2] = bz;
    positions[off + 3] = bx + dx * inv;
    positions[off + 4] = yPos + dy * inv;
    positions[off + 5] = bz + dz * inv;

    colors[off] = rootCol.r;
    colors[off + 1] = rootCol.g;
    colors[off + 2] = rootCol.b;
    colors[off + 3] = tipCol.r;
    colors[off + 4] = tipCol.g;
    colors[off + 5] = tipCol.b;

    const tOff = i * 2;
    tips[tOff] = 0.0;
    tips[tOff + 1] = 1.0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aTip', new THREE.BufferAttribute(tips, 1));
  return geo;
}

/**
 * Builds sculpted prosoma carapace geometry with sharper cervical groove dividing
 * the raised ocular cephalic plateau from 4 pairs of radial thoracic domes,
 * deep dorsal fovea pit, and scalloped marginal chitin rim.
 */
function createSculptedProsomaGeo(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.185, 40, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nx = x / 0.185;
    const ny = y / 0.185;
    const nz = z / 0.185;

    // Narrow anterior cephalic head + broader posterior thoracic dome
    const widthProfile = nz > 0 ? 1.0 - nz * 0.26 : 1.0 + Math.abs(nz) * 0.14;
    x *= widthProfile;

    if (ny > 0) {
      // Raised cephalic hump + cervical V-groove separating head from thorax
      const headLift = Math.max(0, nz) * 0.036;
      const cervicalDist = Math.abs(nz - 0.18 + Math.abs(nx) * 0.42);
      const cervicalGroove = Math.exp(-cervicalDist * cervicalDist * 46.0) * 0.015;
      // Central dorsal fovea dimple
      const foveaDist = Math.hypot(nx * 1.18, (nz + 0.17) * 1.48);
      const foveaDip = Math.exp(-foveaDist * foveaDist * 10.5) * 0.03;
      // 4 pairs of radiating thoracic sulci grooves & muscular inter-sulci domes
      const ang = Math.atan2(Math.abs(nx), nz - 0.04);
      const sulcusWave =
        Math.pow(Math.abs(Math.sin(ang * 4.0)), 6) *
        Math.max(0, 0.88 - foveaDist) *
        0.013;
      const muscleDome =
        Math.pow(Math.abs(Math.cos(ang * 4.0)), 3) *
        Math.max(0, 0.72 - Math.abs(foveaDist - 0.48)) *
        0.008;
      y += headLift - cervicalGroove - foveaDip - sulcusWave + muscleDome;
    } else {
      // Flatter sternum underside
      y *= 0.6;
    }

    // Scalloped marginal chitin rim lip above coxal sockets
    if (Math.abs(ny) < 0.25) {
      const scallop = 0.78 + 0.22 * Math.cos(Math.atan2(nx, nz) * 8.0);
      const flare = (1 - Math.abs(ny) / 0.25) * 0.019 * scallop;
      x += Math.sign(x) * flare;
      z += Math.sign(z) * flare * 0.42;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds sculpted orb-weaver teardrop opisthosoma geometry with dorsal cardiac ridge,
 * subtle lateral pleural pleats, and 6 recessed paired dorsal sigilla apodeme dimples.
 */
function createSculptedAbdomenGeo(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.255, 44, 32);
  const pos = geo.attributes.position;
  const sigillaCoords: [number, number][] = [
    [-0.36, 0.34], [0.36, 0.34],
    [-0.42, 0.02], [0.42, 0.02],
    [-0.31, -0.32], [0.31, -0.32],
  ];
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nx = x / 0.255;
    const ny = y / 0.255;
    const nz = z / 0.255;

    // Orb-weaver taper toward posterior spinnerets (nz < 0) & broad shoulders (nz > 0)
    const taper = nz > 0 ? 1.0 + nz * 0.11 : 1.0 + nz * 0.28;
    x *= taper;
    y *= nz < -0.25 ? 0.94 + nz * 0.15 : 1.0;

    if (ny > 0.14) {
      // Subtle dorsal cardiac ridge + folium border swell
      const ridge = Math.exp(-nx * nx * 20) * Math.max(0, 1 - Math.abs(nz)) * 0.014;
      let dimple = 0;
      for (const [sx, sz] of sigillaCoords) {
        const d2 = (nx - sx) * (nx - sx) + (nz - sz) * (nz - sz);
        if (d2 < 0.034) {
          dimple += (1 - d2 / 0.034) * 0.018;
        }
      }
      y += ridge - dimple;
    } else if (ny < -0.2) {
      // Slightly tucked underside near petiole & spinnerets
      y *= 0.85;
    }

    // Subtle lateral pleural pleats along the flanks
    if (Math.abs(nx) > 0.55 && ny > -0.35 && ny < 0.35) {
      const pleat = Math.sin(nz * 14.0) * 0.0042 * (Math.abs(nx) - 0.55);
      x += Math.sign(x) * pleat;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a muscular, organically arched chitin leg segment geometry with
 * flared articular condyle ends and mid-belly swell.
 */
function createMuscularLegSegGeo(
  radiusTop: number,
  radiusBot: number,
  len: number,
  archAmp = 0.022,
  bellyFlare = 0.16,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, len, 14, 8);
  geo.translate(0, len * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp(y / len, 0, 1);
    const arch = Math.sin(t * Math.PI) * archAmp;
    const condyle = (Math.exp(-t * t * 38) + Math.exp(-(1 - t) * (1 - t) * 38)) * 0.11;
    const swell = 1 + Math.sin(t * Math.PI) * bellyFlare + condyle;
    pos.setXYZ(i, x * swell, y, pos.getZ(i) * swell + arch);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createPavutinModel(
  textures: ProceduralTextureSet,
  isElder = false,
): PavutinRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.24;
  root.add(body);

  const velvetMat = new THREE.MeshPhysicalMaterial({
    color: isElder ? 0xdde6f4 : 0xffffff,
    map: isElder ? textures.uspokhChitinMap : textures.spiderChitinMap,
    normalMap: textures.spiderChitinNormal,
    normalScale: new THREE.Vector2(isElder ? 1.48 : 1.42, isElder ? 1.48 : 1.42),
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: isElder ? 0.76 : 0.62,
    metalness: 0.09,
    sheen: 1.0,
    sheenRoughness: 0.22,
    sheenColor: new THREE.Color(isElder ? 0xe0eeff : 0xc6e2ff),
    iridescence: isElder ? 0.18 : 0.32,
    iridescenceIOR: 1.35,
  });

  const warmChitinMat = new THREE.MeshPhysicalMaterial({
    color: isElder ? 0xcad2df : 0xffffff,
    map: textures.spiderLegBandMap,
    normalMap: textures.spiderLegBandNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: 0.34,
    metalness: 0.15,
    clearcoat: 0.82,
    clearcoatRoughness: 0.18,
    sheen: 0.35,
    sheenColor: new THREE.Color(isElder ? 0xdce8f8 : 0xb8d4f5),
    iridescence: 0.24,
    iridescenceIOR: 1.36,
  });

  const legDistalMat = new THREE.MeshPhysicalMaterial({
    color: isElder ? 0x9fa8ba : 0xdfd4ca,
    map: textures.spiderLegBandMap,
    normalMap: textures.spiderLegBandNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: 0.28,
    metalness: 0.18,
    clearcoat: 0.78,
    clearcoatRoughness: 0.16,
    iridescence: 0.2,
    iridescenceIOR: 1.33,
  });

  const darkJointMat = new THREE.MeshPhysicalMaterial({
    color: isElder ? 0x262a33 : 0x1a1820,
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: 0.2,
    metalness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: isElder ? 0x9aa2b2 : 0x8f7968,
    roughness: 0.42,
    metalness: 0.05,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xcbd8eb),
    clearcoat: 0.28,
  });

  const fangAmberMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a140d,
    roughness: 0.16,
    metalness: 0.22,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    iridescence: 0.16,
  });

  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x020306,
    emissive: 0x081020,
    emissiveIntensity: 0.24,
    roughness: 0.02,
    metalness: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 1.0,
    envMapIntensity: 2.8,
  });

  const tapetumMat = new THREE.MeshBasicMaterial({
    color: isElder ? 0xaedcff : 0x5cc7ff,
    transparent: true,
    opacity: 0.48,
  });

  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4e8ff,
    roughness: 0.025,
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.56,
    reflectivity: 1.0,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    envMapIntensity: 3.0,
  });

  const silkGlowMat = new THREE.MeshStandardMaterial({
    color: 0xeaf4ff,
    emissive: isElder ? 0x98b9e0 : 0x7eb8ff,
    emissiveIntensity: isElder ? 0.52 : 0.72,
    roughness: 0.22,
    metalness: 0.16,
  });

  const setaeUniforms = {
    uSetaeTime: { value: 0 },
    uSetaeAmp: { value: 0.0055 },
  };

  const setaeLineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: isElder ? 0.86 : 0.82,
  });
  applySetaeVibrationShader(
    setaeLineMat,
    setaeUniforms.uSetaeTime,
    setaeUniforms.uSetaeAmp,
    isElder ? 'elder_line' : 'hero_line',
  );

  const setaePointMat = new THREE.PointsMaterial({
    color: isElder ? 0xedf4ff : 0xd4e6ff,
    map: textures.setaeHairMap,
    size: isElder ? 0.048 : 0.043,
    sizeAttenuation: true,
    transparent: true,
    opacity: isElder ? 0.72 : 0.66,
    alphaTest: 0.08,
    depthWrite: false,
  });
  applySetaeVibrationShader(
    setaePointMat,
    setaeUniforms.uSetaeTime,
    setaeUniforms.uSetaeAmp,
    isElder ? 'elder_pts' : 'hero_pts',
  );

  // 1. Sculpted Cephalothorax (Prosoma) — thoracic sulci, cervical V-groove, dorsal fovea, ocular tubercle & sternum shield
  const cephalo = new THREE.Mesh(createSculptedProsomaGeo(), velvetMat);
  cephalo.scale.set(0.94, 0.68, 1.18);
  cephalo.position.set(0, 0.022, 0.145);
  cephalo.castShadow = true;
  cephalo.receiveShadow = true;
  body.add(cephalo);

  const sternumPlate = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 10),
    darkJointMat,
  );
  sternumPlate.scale.set(0.92, 0.22, 1.32);
  sternumPlate.position.set(0, -0.056, 0.125);
  body.add(sternumPlate);

  const labium = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 10, 8),
    warmChitinMat,
  );
  labium.scale.set(1.1, 0.45, 0.85);
  labium.position.set(0, -0.048, 0.258);
  body.add(labium);

  const foveaCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 14, 10),
    darkJointMat,
  );
  foveaCap.scale.set(0.95, 0.22, 1.48);
  foveaCap.position.set(0, 0.132, 0.088);
  body.add(foveaCap);

  const brow = new THREE.Mesh(
    new THREE.SphereGeometry(0.114, 18, 14),
    warmChitinMat,
  );
  brow.scale.set(1.04, 0.62, 0.86);
  brow.position.set(0, 0.066, 0.245);
  brow.castShadow = true;
  brow.receiveShadow = true;
  body.add(brow);

  // Segmented Pedicel Waist + Dual Chitin Rings
  const pedicel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.064, 0.13, 12),
    darkJointMat,
  );
  pedicel.rotation.x = Math.PI / 2;
  pedicel.position.set(0, 0.012, -0.04);
  pedicel.castShadow = true;
  body.add(pedicel);

  const pedicelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.013, 8, 16),
    warmChitinMat,
  );
  pedicelRing.position.set(0, 0.014, -0.04);
  body.add(pedicelRing);

  const pedicelMembrane = new THREE.Mesh(
    new THREE.TorusGeometry(0.054, 0.009, 6, 14),
    membraneMat,
  );
  pedicelMembrane.position.set(0, 0.014, -0.015);
  body.add(pedicelMembrane);

  // 2. Sculpted Teardrop Abdomen (Opisthosoma) + Dorsal Folia Plate + Book-Lung Plates + 6-Nozzle Spinneret Rosette & Silk-Dew Bead
  const abdomen = new THREE.Mesh(createSculptedAbdomenGeo(), velvetMat);
  abdomen.scale.set(isElder ? 1.04 : 0.97, isElder ? 0.88 : 0.85, 1.25);
  abdomen.position.set(0, 0.09, -0.26);
  abdomen.castShadow = true;
  abdomen.receiveShadow = true;
  body.add(abdomen);

  const abdSetaeGroup = new THREE.Group();
  const abdSetae = createEllipsoidSetae(
    0.254,
    0.254,
    0.254,
    isElder ? 215 : 205,
    isElder ? 0.044 : 0.041,
    isElder ? 701 : 401,
    isElder ? 0x627086 : 0x3b4863,
    isElder ? 0xf2f7ff : 0xd6eaff,
    setaeLineMat,
    setaePointMat,
    -0.4,
    isElder ? 136 : 128,
  );
  abdSetaeGroup.add(abdSetae.lines);
  if (abdSetae.points) abdSetaeGroup.add(abdSetae.points);
  abdomen.add(abdSetaeGroup);

  const cephSetaeGroup = new THREE.Group();
  const cephSetae = createEllipsoidSetae(
    0.184,
    0.184,
    0.184,
    108,
    0.033,
    isElder ? 809 : 509,
    0x45403a,
    isElder ? 0xe8f2ff : 0xcbe2ff,
    setaeLineMat,
    setaePointMat,
    -0.22,
    74,
  );
  cephSetaeGroup.add(cephSetae.lines);
  if (cephSetae.points) cephSetaeGroup.add(cephSetae.points);
  cephalo.add(cephSetaeGroup);

  // Dorsal chitin shield + ventral book-lung chitin plates anchored cleanly to abdomen
  const dorsalPlate = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 18, 12),
    warmChitinMat,
  );
  dorsalPlate.scale.set(0.68, 0.28, 0.88);
  dorsalPlate.position.set(0, 0.165, 0.015);
  dorsalPlate.castShadow = true;
  dorsalPlate.receiveShadow = true;
  abdomen.add(dorsalPlate);

  for (const side of [-1, 1] as const) {
    const bookLung = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 10, 8),
      darkJointMat,
    );
    bookLung.scale.set(0.85, 0.28, 1.2);
    bookLung.position.set(side * 0.09, -0.175, 0.11);
    abdomen.add(bookLung);
  }

  // 6-Nozzle Spinneret Rosette + Basal Silk Collar + Glistening Silk-Dew Drop
  const spCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.056, 0.014, 8, 16),
    darkJointMat,
  );
  spCollar.position.set(0, -0.052, -0.232);
  abdomen.add(spCollar);

  const spinneretLayout: [number, number, number, number, number][] = [
    [-0.036, -0.056, -0.268, 0.028, 0.26],
    [0.036, -0.056, -0.268, 0.028, -0.26],
    [0, -0.038, -0.274, 0.04, 0],
    [-0.022, -0.072, -0.262, 0.02, 0.18],
    [0.022, -0.072, -0.262, 0.02, -0.18],
    [0, -0.08, -0.258, 0.022, 0],
  ];
  for (const [sx, sy, sz, rad, rz] of spinneretLayout) {
    const sp = new THREE.Mesh(
      new THREE.ConeGeometry(rad, 0.095, 10),
      silkGlowMat,
    );
    sp.rotation.x = -Math.PI / 2 - 0.18;
    sp.rotation.z = rz;
    sp.position.set(sx, sy, sz);
    sp.castShadow = true;
    abdomen.add(sp);
  }

  const silkBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 10),
    silkGlowMat,
  );
  silkBead.position.set(0, -0.06, -0.312);
  abdomen.add(silkBead);

  // 3. 8 Multi-Layer Optical Ocelli Eyes (Tapetum Glint + Dark Retina + Refractive Cornea + Ocular Arches)
  const mainEyeGeo = new THREE.SphereGeometry(0.035, 18, 14);
  const mainTapetumGeo = new THREE.SphereGeometry(0.022, 12, 10);
  const mainCorneaGeo = new THREE.SphereGeometry(0.0395, 18, 14);
  const midEyeGeo = new THREE.SphereGeometry(0.02, 12, 10);
  const midTapetumGeo = new THREE.SphereGeometry(0.013, 10, 8);
  const midCorneaGeo = new THREE.SphereGeometry(0.0235, 12, 10);
  const smallEyeGeo = new THREE.SphereGeometry(0.0145, 10, 8);
  const smallCorneaGeo = new THREE.SphereGeometry(0.017, 10, 8);
  const eyeRidgeGeo = new THREE.TorusGeometry(0.039, 0.0085, 6, 14, Math.PI);

  for (const side of [-1, 1] as const) {
    const ame = new THREE.Mesh(mainEyeGeo, eyeMat);
    ame.position.set(side * 0.048, 0.074, 0.326);
    const ameGlint = new THREE.Mesh(mainTapetumGeo, tapetumMat);
    ameGlint.position.set(side * 0.047, 0.08, 0.341);
    const ameCornea = new THREE.Mesh(mainCorneaGeo, corneaMat);
    ameCornea.position.copy(ame.position);
    ameCornea.position.z += 0.003;
    body.add(ame, ameGlint, ameCornea);

    const ridge = new THREE.Mesh(eyeRidgeGeo, warmChitinMat);
    ridge.position.set(side * 0.048, 0.08, 0.322);
    ridge.rotation.z = -side * 0.18;
    body.add(ridge);

    const ale = new THREE.Mesh(midEyeGeo, eyeMat);
    ale.position.set(side * 0.098, 0.065, 0.293);
    const aleGlint = new THREE.Mesh(midTapetumGeo, tapetumMat);
    aleGlint.position.set(side * 0.102, 0.069, 0.302);
    const aleCornea = new THREE.Mesh(midCorneaGeo, corneaMat);
    aleCornea.position.copy(ale.position);
    aleCornea.position.z += 0.002;
    body.add(ale, aleGlint, aleCornea);

    const pme = new THREE.Mesh(smallEyeGeo, eyeMat);
    pme.position.set(side * 0.046, 0.114, 0.286);
    const pmeCornea = new THREE.Mesh(smallCorneaGeo, corneaMat);
    pmeCornea.position.copy(pme.position);
    body.add(pme, pmeCornea);

    const ple = new THREE.Mesh(smallEyeGeo, eyeMat);
    ple.position.set(side * 0.112, 0.094, 0.252);
    const pleCornea = new THREE.Mesh(smallCorneaGeo, corneaMat);
    pleCornea.position.copy(ple.position);
    body.add(ple, pleCornea);
  }

  // 4. Articulated Chelicerae + Basal Bosses + Dorsal Keel + 4 Medial Denticles + Curved Saber Fangs
  const chelicerae: [THREE.Group, THREE.Group] = [
    new THREE.Group(),
    new THREE.Group(),
  ];
  const chelGeo = new THREE.CapsuleGeometry(0.03, 0.066, 8, 12);
  const keelGeo = new THREE.CapsuleGeometry(0.011, 0.056, 6, 8);
  const bossGeo = new THREE.SphereGeometry(0.022, 10, 8);
  const toothGeo = new THREE.ConeGeometry(0.0044, 0.013, 6);
  const fangBaseGeo = new THREE.ConeGeometry(0.0125, 0.04, 10);
  const fangMidGeo = new THREE.ConeGeometry(0.009, 0.032, 10);
  const fangTipGeo = new THREE.ConeGeometry(0.0052, 0.026, 8);
  ([-1, 1] as const).forEach((side, idx) => {
    const cg = chelicerae[idx];
    cg.position.set(side * 0.038, -0.014, 0.306);
    const boss = new THREE.Mesh(bossGeo, warmChitinMat);
    boss.position.set(0, 0.019, -0.007);
    cg.add(boss);

    const basal = new THREE.Mesh(chelGeo, darkJointMat);
    basal.rotation.x = Math.PI / 2.8;
    basal.castShadow = true;
    cg.add(basal);

    const keel = new THREE.Mesh(keelGeo, warmChitinMat);
    keel.rotation.x = Math.PI / 2.8;
    keel.position.set(side * 0.008, 0.011, 0.016);
    cg.add(keel);

    // Medial cheliceral denticle row
    for (let t = 0; t < 4; t++) {
      const tooth = new THREE.Mesh(toothGeo, warmChitinMat);
      tooth.position.set(-side * 0.021, -0.015 - t * 0.01, 0.015 + t * 0.005);
      tooth.rotation.z = side * (Math.PI / 2);
      cg.add(tooth);
    }

    const fangBase = new THREE.Mesh(fangBaseGeo, fangAmberMat);
    fangBase.position.set(-side * 0.008, -0.04, 0.03);
    fangBase.rotation.x = Math.PI * 0.92;
    fangBase.rotation.z = side * 0.28;
    cg.add(fangBase);

    const fangMid = new THREE.Mesh(fangMidGeo, fangAmberMat);
    fangMid.position.set(-side * 0.017, -0.058, 0.028);
    fangMid.rotation.x = Math.PI * 1.04;
    fangMid.rotation.z = side * 0.48;
    cg.add(fangMid);

    const fangTip = new THREE.Mesh(fangTipGeo, eyeMat);
    fangTip.position.set(-side * 0.025, -0.071, 0.021);
    fangTip.rotation.x = Math.PI * 1.18;
    fangTip.rotation.z = side * 0.72;
    cg.add(fangTip);
    body.add(cg);
  });

  // 5. 6-Part Articulated Setose Pedipalps (Coxa-Endite, Trochanter, Femur, Patella, Tibia, Tarsus Tip)
  const pedipalps: [THREE.Group, THREE.Group] = [
    new THREE.Group(),
    new THREE.Group(),
  ];
  const palpCoxaGeo = new THREE.SphereGeometry(0.021, 10, 8);
  const palpTrochGeo = new THREE.SphereGeometry(0.014, 8, 8);
  const palpFemurGeo = new THREE.CapsuleGeometry(0.017, 0.056, 6, 8);
  const palpPatellaGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const palpTibiaGeo = new THREE.CapsuleGeometry(0.014, 0.048, 6, 8);
  const palpBulbGeo = new THREE.ConeGeometry(0.015, 0.068, 8);
  const palpSetaeGeo = createLegSegmentSetaeGeo(0.068, 0.015, 1, 12, 0.026, 733);
  ([-1, 1] as const).forEach((side, idx) => {
    const pGroup = pedipalps[idx];
    pGroup.position.set(side * 0.095, -0.015, 0.28);

    const pCoxa = new THREE.Mesh(palpCoxaGeo, darkJointMat);
    pCoxa.scale.set(1.15, 0.9, 1.1);
    pGroup.add(pCoxa);

    const pTroch = new THREE.Mesh(palpTrochGeo, membraneMat);
    pTroch.position.set(side * 0.008, -0.005, 0.014);
    pGroup.add(pTroch);

    const pFemur = new THREE.Mesh(palpFemurGeo, warmChitinMat);
    pFemur.rotation.x = Math.PI / 2.8;
    pFemur.rotation.z = side * -0.28;
    pFemur.position.set(side * 0.018, -0.015, 0.038);
    pFemur.castShadow = true;
    pGroup.add(pFemur);

    const pPatella = new THREE.Mesh(palpPatellaGeo, darkJointMat);
    pPatella.position.set(side * 0.03, -0.028, 0.072);
    pGroup.add(pPatella);

    const pTibia = new THREE.Mesh(palpTibiaGeo, legDistalMat);
    pTibia.rotation.x = Math.PI / 2.2;
    pTibia.rotation.z = side * 0.16;
    pTibia.position.set(side * 0.034, -0.046, 0.105);
    pTibia.castShadow = true;
    pGroup.add(pTibia);

    const pBulb = new THREE.Mesh(palpBulbGeo, darkJointMat);
    pBulb.rotation.x = Math.PI / 1.75;
    pBulb.position.set(side * 0.035, -0.066, 0.146);
    pBulb.castShadow = true;
    pGroup.add(pBulb);

    const pHairs = new THREE.LineSegments(palpSetaeGeo, setaeLineMat);
    pHairs.position.copy(pTibia.position);
    pHairs.rotation.x = Math.PI / 2.2;
    pGroup.add(pHairs);
    body.add(pGroup);
  });

  // 6. True 7-Part Anatomical Articulated Legs (Coxa, Trochanter, Arched Banded Femur, Patella + Hinge Membrane, Muscular Tibia, Metatarsus, Tarsus + Triple Claws + Scopula)
  const legs: PavutinRig['legs'] = [];
  const coxaGeo = new THREE.SphereGeometry(0.033, 12, 10);
  const trochanterGeo = createMuscularLegSegGeo(0.022, 0.025, 0.042, 0.004, 0.08);
  const femurGeo = createMuscularLegSegGeo(0.0185, 0.0255, 0.34, 0.024, 0.18);
  const patellaGeo = new THREE.SphereGeometry(0.025, 12, 10);
  const patellaMembraneGeo = new THREE.TorusGeometry(0.02, 0.0055, 6, 12);
  const tibiaGeo = createMuscularLegSegGeo(0.013, 0.0195, 0.3, 0.012, 0.12);
  const ankleJointGeo = new THREE.SphereGeometry(0.016, 10, 8);
  const ankleMembraneGeo = new THREE.TorusGeometry(0.0135, 0.004, 6, 10);
  const metatarsusGeo = createMuscularLegSegGeo(0.009, 0.013, 0.115, 0.004, 0.08);
  const tarsusJointGeo = new THREE.SphereGeometry(0.01, 8, 8);
  const tarsusGeo = new THREE.CylinderGeometry(0.0042, 0.009, 0.075, 10);
  tarsusGeo.translate(0, 0.0375, 0);
  const scopulaGeo = new THREE.SphereGeometry(0.0125, 8, 6);
  const clawGeo = new THREE.ConeGeometry(0.0038, 0.03, 6);
  const medianClawGeo = new THREE.ConeGeometry(0.0028, 0.021, 6);
  const bristleGeo = new THREE.ConeGeometry(0.0036, 0.056, 6);

  const femurSetaeGeoL = createLegSegmentSetaeGeo(0.34, 0.021, -1, 32, 0.044, 613);
  const femurSetaeGeoR = createLegSegmentSetaeGeo(0.34, 0.021, 1, 32, 0.044, 617);
  const tibiaSetaeGeoL = createLegSegmentSetaeGeo(0.3, 0.016, -1, 24, 0.04, 631);
  const tibiaSetaeGeoR = createLegSegmentSetaeGeo(0.3, 0.016, 1, 24, 0.04, 641);
  const metaSetaeGeoL = createLegSegmentSetaeGeo(0.115, 0.011, -1, 14, 0.03, 653);
  const metaSetaeGeoR = createLegSegmentSetaeGeo(0.115, 0.011, 1, 14, 0.03, 661);

  const zOffsets = [0.16, 0.075, -0.02, -0.11];
  const baseYawSpread = [0.76, 0.28, -0.26, -0.78];
  const lengthScale = [1.14, 1.0, 0.95, 1.12];

  for (let i = 0; i < 4; i++) {
    const ls = lengthScale[i];
    for (const side of [-1, 1] as const) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.135, -0.015, zOffsets[i]);
      hip.rotation.y = side * baseYawSpread[i];

      const coxa = new THREE.Mesh(coxaGeo, darkJointMat);
      coxa.scale.set(1.08, 0.94, 1.04);
      coxa.castShadow = true;
      hip.add(coxa);

      const femurPivot = new THREE.Group();
      femurPivot.rotation.z = -side * 0.92;
      hip.add(femurPivot);

      const trochanter = new THREE.Mesh(trochanterGeo, darkJointMat);
      trochanter.castShadow = true;
      femurPivot.add(trochanter);

      const femur = new THREE.Mesh(femurGeo, warmChitinMat);
      femur.scale.set(1, ls, 1);
      femur.castShadow = true;
      femur.receiveShadow = true;
      femurPivot.add(femur);

      const femSetae = new THREE.LineSegments(
        side === -1 ? femurSetaeGeoL : femurSetaeGeoR,
        setaeLineMat,
      );
      femur.add(femSetae);

      for (let b = 0; b < 3; b++) {
        const spine = new THREE.Mesh(bristleGeo, darkJointMat);
        spine.position.set(-side * 0.016, 0.09 + b * 0.09, 0.012);
        spine.rotation.z = side * 0.74;
        femur.add(spine);
      }

      const kneeRest = new THREE.Group();
      kneeRest.position.set(0, 0.34 * ls, 0);
      kneeRest.rotation.z = -side * 1.66;
      femurPivot.add(kneeRest);

      const knee = new THREE.Group();
      kneeRest.add(knee);

      const patella = new THREE.Mesh(patellaGeo, darkJointMat);
      patella.scale.set(1.0, 1.18, 1.0);
      patella.castShadow = true;
      knee.add(patella);

      const patellaMembrane = new THREE.Mesh(patellaMembraneGeo, membraneMat);
      patellaMembrane.rotation.x = Math.PI / 2;
      patellaMembrane.position.set(0, -0.008, 0);
      knee.add(patellaMembrane);

      const tibia = new THREE.Mesh(tibiaGeo, legDistalMat);
      tibia.scale.set(1, ls, 1);
      tibia.castShadow = true;
      tibia.receiveShadow = true;
      knee.add(tibia);

      const tibSetae = new THREE.LineSegments(
        side === -1 ? tibiaSetaeGeoL : tibiaSetaeGeoR,
        setaeLineMat,
      );
      tibia.add(tibSetae);

      for (let b = 0; b < 2; b++) {
        const tibSpine = new THREE.Mesh(bristleGeo, darkJointMat);
        tibSpine.position.set(-side * 0.012, 0.1 + b * 0.11, 0.008);
        tibSpine.rotation.z = side * 0.78;
        tibia.add(tibSpine);
      }

      const ankleRest = new THREE.Group();
      ankleRest.position.set(0, 0.3 * ls, 0);
      ankleRest.rotation.z = -side * 0.42;
      knee.add(ankleRest);

      const ankle = new THREE.Group();
      ankleRest.add(ankle);

      const ankleJoint = new THREE.Mesh(ankleJointGeo, darkJointMat);
      ankle.add(ankleJoint);

      const ankleMembrane = new THREE.Mesh(ankleMembraneGeo, membraneMat);
      ankleMembrane.rotation.x = Math.PI / 2;
      ankleMembrane.position.set(0, -0.006, 0);
      ankle.add(ankleMembrane);

      const metatarsus = new THREE.Mesh(metatarsusGeo, legDistalMat);
      metatarsus.scale.set(1, ls, 1);
      metatarsus.castShadow = true;
      ankle.add(metatarsus);

      const metaSetae = new THREE.LineSegments(
        side === -1 ? metaSetaeGeoL : metaSetaeGeoR,
        setaeLineMat,
      );
      metatarsus.add(metaSetae);

      const tarsalBridge = new THREE.Group();
      tarsalBridge.position.set(0, 0.115 * ls, 0);
      tarsalBridge.rotation.z = -side * 0.14;
      ankle.add(tarsalBridge);

      const tarsusJoint = new THREE.Mesh(tarsusJointGeo, darkJointMat);
      tarsalBridge.add(tarsusJoint);

      const tarsus = new THREE.Mesh(tarsusGeo, legDistalMat);
      tarsus.scale.set(1, ls, 1);
      tarsus.castShadow = true;
      tarsalBridge.add(tarsus);

      const scopula = new THREE.Mesh(scopulaGeo, velvetMat);
      scopula.scale.set(0.88, 1.4, 0.88);
      scopula.position.set(0, 0.056 * ls, 0);
      tarsalBridge.add(scopula);

      // Triple tarsal claws (paired lateral claws + hooked median web-grasping claw)
      for (const cSide of [-1, 1] as const) {
        const claw = new THREE.Mesh(clawGeo, eyeMat);
        claw.position.set(-side * 0.006, 0.075 * ls, cSide * 0.0042);
        claw.rotation.z = side * 0.58;
        claw.rotation.x = cSide * 0.16;
        tarsalBridge.add(claw);
      }
      const medianClaw = new THREE.Mesh(medianClawGeo, fangAmberMat);
      medianClaw.position.set(-side * 0.009, 0.071 * ls, 0);
      medianClaw.rotation.z = side * 0.92;
      tarsalBridge.add(medianClaw);

      body.add(hip);
      legs.push({ hip, knee, ankle, side, index: i });
    }
  }

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.64, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.58,
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  if (isElder) {
    root.scale.setScalar(1.16);
  }

  return {
    root,
    body,
    abdomen,
    chelicerae,
    pedipalps,
    legs,
    shadowDisc,
    silkGlowMat,
    setaeUniforms,
    abdSetaeGroup,
    cephSetaeGroup,
  };
}

/**
 * Redrawn Maximally Realistic Animated Wasp Model (Хряж-Сякая)
 */
export function createKhryazhSyakayaModel(
  textures: ProceduralTextureSet,
): WaspRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const chitinDark = new THREE.MeshPhysicalMaterial({
    color: 0x181410,
    normalMap: textures.waspScaleNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: 0.24,
    metalness: 0.28,
    clearcoat: 0.96,
    clearcoatRoughness: 0.12,
    sheen: 0.35,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xcfa452),
  });

  const scaleArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.waspScaleMap,
    normalMap: textures.waspScaleNormal,
    normalScale: new THREE.Vector2(1.28, 1.28),
    roughnessMap: textures.chitinMicroScratchMap,
    roughness: 0.22,
    metalness: 0.3,
    clearcoat: 0.94,
    clearcoatRoughness: 0.1,
    iridescence: 0.54,
    iridescenceIOR: 1.38,
  });

  const waspSetaeLineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.68,
  });
  const waspSetaePointMat = new THREE.PointsMaterial({
    color: 0xffd27a,
    map: textures.setaeHairMap,
    size: 0.044,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    alphaTest: 0.08,
    depthWrite: false,
  });

  const compoundEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x26120c,
    normalMap: textures.compoundEyeNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.12,
    metalness: 0.2,
    clearcoat: 1.0,
    iridescence: 0.62,
  });

  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.waspWingMap,
    alphaMap: textures.waspWingAlpha,
    emissive: 0x5c441c,
    emissiveIntensity: 0.36,
    transparent: true,
    opacity: 0.94,
    roughness: 0.1,
    metalness: 0.08,
    iridescence: 1.0,
    iridescenceIOR: 1.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const blurMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    map: textures.flightBlurMap,
    emissive: 0xffe2ad,
    emissiveMap: textures.flightBlurMap,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.34,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const thorax = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 22, 16),
    chitinDark,
  );
  thorax.scale.set(0.92, 0.86, 1.38);
  thorax.castShadow = true;
  thorax.receiveShadow = true;
  body.add(thorax);

  const thoraxFuzz = createEllipsoidSetae(
    0.278,
    0.278,
    0.278,
    84,
    0.044,
    937,
    0x3b2a14,
    0xf5c86b,
    waspSetaeLineMat,
    waspSetaePointMat,
    -0.1,
    56,
  );
  thorax.add(thoraxFuzz.lines);
  if (thoraxFuzz.points) thorax.add(thoraxFuzz.points);

  const scutellum = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 10),
    scaleArmorMat,
  );
  scutellum.scale.set(1.15, 0.56, 1.05);
  scutellum.position.set(0, 0.2, -0.14);
  scutellum.castShadow = true;
  body.add(scutellum);

  const pronotum = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.055, 8, 16),
    scaleArmorMat,
  );
  pronotum.position.set(0, 0.05, 0.22);
  pronotum.scale.set(1.05, 0.85, 0.7);
  pronotum.castShadow = true;
  pronotum.receiveShadow = true;
  body.add(pronotum);

  for (const s of [-1, 1] as const) {
    const tegula = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      scaleArmorMat,
    );
    tegula.scale.set(0.75, 0.6, 1.25);
    tegula.position.set(s * 0.16, 0.21, 0.12);
    body.add(tegula);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.03, 0.48);
  body.add(head);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 16, 14),
    scaleArmorMat,
  );
  cranium.scale.set(1.1, 0.95, 0.82);
  cranium.castShadow = true;
  cranium.receiveShadow = true;
  head.add(cranium);

  // 3 dorsal vertex ocelli catching moonlight
  const ocellusGeo = new THREE.SphereGeometry(0.017, 8, 8);
  [
    [0, 0.168, 0.08],
    [-0.036, 0.162, 0.04],
    [0.036, 0.162, 0.04],
  ].forEach(([ox, oy, oz]) => {
    const oc = new THREE.Mesh(ocellusGeo, compoundEyeMat);
    oc.position.set(ox, oy, oz);
    head.add(oc);
  });

  const eyeGeo = new THREE.SphereGeometry(0.095, 14, 12);
  const antGeo1 = new THREE.CylinderGeometry(0.015, 0.012, 0.18, 6);
  const antGeo2 = new THREE.CylinderGeometry(0.011, 0.006, 0.24, 6);
  const mandibleGeo = new THREE.ConeGeometry(0.028, 0.11, 6);

  const antennae: [THREE.Group, THREE.Group] = [
    new THREE.Group(),
    new THREE.Group(),
  ];

  ([-1, 1] as const).forEach((s, idx) => {
    const eye = new THREE.Mesh(eyeGeo, compoundEyeMat);
    eye.scale.set(0.72, 1.25, 0.92);
    eye.position.set(s * 0.15, 0.03, 0.05);
    head.add(eye);

    const antGroup = antennae[idx];
    antGroup.position.set(s * 0.06, 0.08, 0.14);
    const scape = new THREE.Mesh(antGeo1, chitinDark);
    scape.position.set(s * 0.03, 0.07, 0.04);
    scape.rotation.z = -s * 0.35;
    scape.rotation.x = 0.45;
    antGroup.add(scape);

    const flagellum = new THREE.Mesh(antGeo2, chitinDark);
    flagellum.position.set(s * 0.08, 0.13, 0.16);
    flagellum.rotation.x = 1.22;
    flagellum.rotation.z = -s * 0.22;
    antGroup.add(flagellum);
    head.add(antGroup);

    const mandible = new THREE.Mesh(mandibleGeo, chitinDark);
    mandible.position.set(s * 0.06, -0.11, 0.1);
    mandible.rotation.x = Math.PI * 0.78;
    mandible.rotation.z = s * 0.45;
    mandible.castShadow = true;
    head.add(mandible);
  });

  const abdomen = new THREE.Group();
  abdomen.position.set(0, -0.03, -0.34);
  body.add(abdomen);

  const petiole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, 0.18, 8),
    chitinDark,
  );
  petiole.rotation.x = Math.PI / 2;
  petiole.position.set(0, 0.02, -0.02);
  petiole.castShadow = true;
  abdomen.add(petiole);

  const segZ = [-0.16, -0.32, -0.5, -0.68, -0.84, -0.97];
  const segR = [0.21, 0.29, 0.3, 0.26, 0.19, 0.11];
  segZ.forEach((zPos, i) => {
    const seg = new THREE.Mesh(
      new THREE.SphereGeometry(segR[i], 16, 12),
      scaleArmorMat,
    );
    seg.scale.set(0.95, 0.9, 0.72);
    seg.position.set(0, -i * 0.018, zPos);
    seg.castShadow = true;
    seg.receiveShadow = true;
    abdomen.add(seg);
  });

  const stinger = new THREE.Mesh(
    new THREE.ConeGeometry(0.042, 0.26, 8),
    chitinDark,
  );
  stinger.rotation.x = -Math.PI / 2 - 0.1;
  stinger.position.set(0, -0.1, -1.12);
  stinger.castShadow = true;
  abdomen.add(stinger);

  const legs: THREE.Group[] = [];
  const wFemurGeo = new THREE.CylinderGeometry(0.018, 0.013, 0.28, 6);
  const wTibiaGeo = new THREE.CylinderGeometry(0.012, 0.006, 0.34, 6);
  const spurGeo = new THREE.ConeGeometry(0.0045, 0.045, 5);
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1] as const) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.18, -0.14, 0.16 - i * 0.18);
      const fem = new THREE.Mesh(wFemurGeo, chitinDark);
      fem.rotation.z = s * 0.65;
      fem.rotation.x = -0.35 - i * 0.12;
      fem.position.set(s * 0.08, -0.08, -0.04);
      fem.castShadow = true;
      leg.add(fem);

      const tib = new THREE.Mesh(wTibiaGeo, scaleArmorMat);
      tib.rotation.z = s * 0.25;
      tib.rotation.x = -0.55 - i * 0.18;
      tib.position.set(s * 0.14, -0.24, -0.16);
      tib.castShadow = true;
      leg.add(tib);

      if (i === 2) {
        const spur = new THREE.Mesh(spurGeo, chitinDark);
        spur.position.set(s * 0.015, -0.08, 0.01);
        spur.rotation.z = -s * 0.7;
        tib.add(spur);
      }

      body.add(leg);
      legs.push(leg);
    }
  }

  const forewingGeo = new THREE.PlaneGeometry(1.22, 0.54, 4, 2);
  forewingGeo.translate(0.61, 0, 0);
  const hindwingGeo = new THREE.PlaneGeometry(0.86, 0.38, 3, 2);
  hindwingGeo.translate(0.43, 0, 0);
  const blurGeo = new THREE.PlaneGeometry(1.3, 0.72);
  blurGeo.translate(0.65, 0, 0);

  const foreLeft = new THREE.Mesh(forewingGeo, wingMat);
  foreLeft.position.set(-0.15, 0.21, 0.12);
  foreLeft.rotation.x = -Math.PI / 2;
  foreLeft.rotation.z = Math.PI - 0.28;
  body.add(foreLeft);

  const foreRight = new THREE.Mesh(forewingGeo, wingMat);
  foreRight.position.set(0.15, 0.21, 0.12);
  foreRight.rotation.x = -Math.PI / 2;
  foreRight.rotation.z = 0.28;
  body.add(foreRight);

  const hindLeft = new THREE.Mesh(hindwingGeo, wingMat);
  hindLeft.position.set(-0.14, 0.19, -0.05);
  hindLeft.rotation.x = -Math.PI / 2;
  hindLeft.rotation.z = Math.PI - 0.56;
  body.add(hindLeft);

  const hindRight = new THREE.Mesh(hindwingGeo, wingMat);
  hindRight.position.set(0.14, 0.19, -0.05);
  hindRight.rotation.x = -Math.PI / 2;
  hindRight.rotation.z = 0.56;
  body.add(hindRight);

  const blurLeft = new THREE.Mesh(blurGeo, blurMat);
  blurLeft.position.set(-0.14, 0.23, 0.08);
  blurLeft.rotation.x = -Math.PI / 2;
  blurLeft.rotation.z = Math.PI - 0.35;
  body.add(blurLeft);

  const blurRight = new THREE.Mesh(blurGeo, blurMat);
  blurRight.position.set(0.14, 0.23, 0.08);
  blurRight.rotation.x = -Math.PI / 2;
  blurRight.rotation.z = 0.35;
  body.add(blurRight);

  const shadowDiscMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.45,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 22),
    shadowDiscMat,
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  root.add(shadowDisc);

  return {
    root,
    body,
    head,
    antennae,
    forewings: [foreLeft, foreRight],
    hindwings: [hindLeft, hindRight],
    blurFans: [blurLeft, blurRight],
    abdomen,
    legs,
    shadowDisc,
    wingMat,
    blurMat,
    shadowDiscMat,
  };
}

/**
 * Redrawn Maximally Realistic Animated Fly Models for the 4 Species
 */
export function createFlyModel(
  species: FlySpecies,
  textures: ProceduralTextureSet,
): FlyRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const bodyColors: Record<FlySpecies, number> = {
    fatbelly: 0x94795d,
    nimble: 0x5c7da8,
    greenie: 0x52c48c,
    tearbearer: 0x7ab4e8,
  };
  const scaleMod =
    species === 'fatbelly' ? 1.32 : species === 'nimble' ? 0.86 : 1.05;

  const carapaceMat = new THREE.MeshPhysicalMaterial({
    color: bodyColors[species],
    map: textures.flyScaleMap,
    normalMap: textures.flyScaleNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughness: species === 'greenie' ? 0.16 : 0.32,
    metalness: species === 'greenie' ? 0.62 : 0.3,
    clearcoat: 0.92,
    clearcoatRoughness: 0.12,
    iridescence: species === 'greenie' || species === 'tearbearer' ? 1.0 : 0.65,
    iridescenceIOR: 1.4,
  });

  const bandMat = new THREE.MeshPhysicalMaterial({
    color: species === 'greenie' ? 0x224a38 : 0x24262e,
    normalMap: textures.flyScaleNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.34,
    metalness: 0.28,
    clearcoat: 0.82,
  });

  // Glossy crimson-red faceted compound eyes (catches moonlight + subtle UnrealBloom glint)
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8161a,
    emissive: 0x820b0e,
    emissiveIntensity: 0.96,
    normalMap: textures.compoundEyeNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughness: 0.07,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    iridescence: 0.45,
    iridescenceIOR: 1.44,
  });

  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.flyWingMap,
    alphaMap: textures.flyWingAlpha,
    emissive: 0x3b6794,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.8,
    roughness: 0.08,
    metalness: 0.05,
    iridescence: 1.0,
    iridescenceIOR: 1.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const blurMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    map: textures.flightBlurMap,
    emissive: species === 'greenie' ? 0xb5ffdf : 0xd6ebff,
    emissiveMap: textures.flightBlurMap,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.3,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Segmented Abdomen (3 overlapping tergite segments + tail cone)
  const abdGroup = new THREE.Group();
  abdGroup.position.set(0, 0, -0.065 * scaleMod);
  body.add(abdGroup);

  const abdSegments = [
    { z: -0.02, r: 0.088, sx: species === 'fatbelly' ? 1.24 : 0.94, sy: 0.86, sz: 0.78, dark: true },
    { z: -0.078, r: 0.104, sx: species === 'fatbelly' ? 1.32 : 0.96, sy: 0.9, sz: 0.82, dark: false },
    { z: -0.142, r: 0.084, sx: species === 'fatbelly' ? 1.18 : 0.84, sy: 0.82, sz: 0.85, dark: true },
  ];
  abdSegments.forEach((seg) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(seg.r * scaleMod, 14, 10),
      seg.dark ? bandMat : carapaceMat,
    );
    m.scale.set(seg.sx, seg.sy, seg.sz);
    m.position.set(0, -0.005 * scaleMod, seg.z * scaleMod);
    abdGroup.add(m);
  });

  // Narrow waist petiole joining thorax & abdomen
  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03 * scaleMod, 0.036 * scaleMod, 0.05 * scaleMod, 8),
    bandMat,
  );
  waist.rotation.x = Math.PI / 2;
  waist.position.set(0, 0.006 * scaleMod, -0.02 * scaleMod);
  body.add(waist);

  // Segmented Thorax (Pronotum collar + Mesothorax + Scutellum plate)
  const thorax = new THREE.Mesh(
    new THREE.SphereGeometry(0.084 * scaleMod, 14, 12),
    carapaceMat,
  );
  thorax.scale.set(0.95, 0.94, 1.14);
  thorax.position.set(0, 0.015, 0.055 * scaleMod);
  body.add(thorax);

  const pronotumCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.056 * scaleMod, 0.018 * scaleMod, 6, 12),
    bandMat,
  );
  pronotumCollar.position.set(0, 0.022 * scaleMod, 0.11 * scaleMod);
  pronotumCollar.scale.set(1.0, 0.9, 0.7);
  body.add(pronotumCollar);

  const scutellum = new THREE.Mesh(
    new THREE.SphereGeometry(0.054 * scaleMod, 10, 8),
    bandMat,
  );
  scutellum.scale.set(0.92, 0.58, 0.9);
  scutellum.position.set(0, 0.058 * scaleMod, 0.015 * scaleMod);
  body.add(scutellum);

  const headCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.048 * scaleMod, 10, 8),
    carapaceMat,
  );
  headCenter.position.set(0, 0.015, 0.152 * scaleMod);
  body.add(headCenter);

  const compEyeGeo = new THREE.SphereGeometry(0.048 * scaleMod, 14, 12);
  const antBristleGeo = new THREE.CylinderGeometry(0.004, 0.002, 0.045 * scaleMod, 5);
  for (const s of [-1, 1] as const) {
    const ce = new THREE.Mesh(compEyeGeo, eyeMat);
    ce.scale.set(0.85, 1.12, 0.95);
    ce.position.set(s * 0.036 * scaleMod, 0.022, 0.155 * scaleMod);
    body.add(ce);

    const ant = new THREE.Mesh(antBristleGeo, carapaceMat);
    ant.position.set(s * 0.014 * scaleMod, 0.025, 0.195 * scaleMod);
    ant.rotation.x = 0.85;
    ant.rotation.z = -s * 0.35;
    body.add(ant);
  }

  const proboscis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.004, 0.07 * scaleMod, 6),
    carapaceMat,
  );
  proboscis.position.set(0, -0.03 * scaleMod, 0.175 * scaleMod);
  proboscis.rotation.x = 0.55;
  body.add(proboscis);

  const haltereGeo = new THREE.SphereGeometry(0.016 * scaleMod, 6, 6);
  const haltereMat = new THREE.MeshStandardMaterial({
    color: 0xf0c954,
    roughness: 0.4,
  });
  const halLeft = new THREE.Mesh(haltereGeo, haltereMat);
  halLeft.position.set(-0.07 * scaleMod, 0.04, 0.0);
  body.add(halLeft);
  const halRight = new THREE.Mesh(haltereGeo, haltereMat);
  halRight.position.set(0.07 * scaleMod, 0.04, 0.0);
  body.add(halRight);

  const legsGroup = new THREE.Group();
  const fLegGeo = new THREE.CylinderGeometry(0.006, 0.003, 0.12 * scaleMod, 5);
  const darkLegMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1] as const) {
      const fl = new THREE.Mesh(fLegGeo, darkLegMat);
      fl.position.set(s * 0.055 * scaleMod, -0.065 * scaleMod, (0.08 - i * 0.06) * scaleMod);
      fl.rotation.z = s * 0.48;
      fl.rotation.x = -0.35;
      legsGroup.add(fl);
    }
  }
  body.add(legsGroup);

  const wingGeo = new THREE.PlaneGeometry(0.48 * scaleMod, 0.25 * scaleMod, 2, 1);
  wingGeo.translate(0.24 * scaleMod, 0, 0);
  const blurGeo = new THREE.PlaneGeometry(0.52 * scaleMod, 0.34 * scaleMod);
  blurGeo.translate(0.26 * scaleMod, 0, 0);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.05 * scaleMod, 0.078 * scaleMod, 0.045 * scaleMod);
  leftWing.rotation.x = -Math.PI / 2;
  leftWing.rotation.z = Math.PI - 0.34;
  body.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.05 * scaleMod, 0.078 * scaleMod, 0.045 * scaleMod);
  rightWing.rotation.x = -Math.PI / 2;
  rightWing.rotation.z = 0.34;
  body.add(rightWing);

  const blurLeft = new THREE.Mesh(blurGeo, blurMat);
  blurLeft.position.set(-0.04 * scaleMod, 0.084 * scaleMod, 0.04 * scaleMod);
  blurLeft.rotation.x = -Math.PI / 2;
  blurLeft.rotation.z = Math.PI - 0.38;
  body.add(blurLeft);

  const blurRight = new THREE.Mesh(blurGeo, blurMat);
  blurRight.position.set(0.04 * scaleMod, 0.084 * scaleMod, 0.04 * scaleMod);
  blurRight.rotation.x = -Math.PI / 2;
  blurRight.rotation.z = 0.38;
  body.add(blurRight);

  let tearOrb: THREE.Mesh | undefined;
  if (species === 'tearbearer') {
    tearOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 14, 12),
      new THREE.MeshPhysicalMaterial({
        color: 0xd6f0ff,
        emissive: 0x6ab8ff,
        emissiveIntensity: 1.55,
        roughness: 0.06,
        clearcoat: 1.0,
      }),
    );
    tearOrb.position.set(0, 0.145, -0.07);
    body.add(tearOrb);
  }

  const silkWrapMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.155 * scaleMod, 10, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0xeaf5ff,
      emissive: 0x7cbfff,
      emissiveIntensity: 0.72,
      transparent: true,
      opacity: 0.42,
      roughness: 0.25,
      wireframe: true,
    }),
  );
  silkWrapMesh.scale.set(1.05, 0.92, 1.55);
  silkWrapMesh.position.set(0, 0.01, -0.04 * scaleMod);
  silkWrapMesh.visible = false;
  body.add(silkWrapMesh);

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.35,
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  root.add(shadowDisc);

  return {
    root,
    body,
    wings: [leftWing, rightWing],
    blurFans: [blurLeft, blurRight],
    halteres: [halLeft, halRight],
    legsGroup,
    silkWrapMesh,
    tearOrb,
    shadowDisc,
  };
}

export function createForestWorld(
  scene: THREE.Scene,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): ForestWorldHandle {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const colliders: ObstacleCollider[] = [];

  const windTimeUniform = { value: 0 };
  const windStrengthUniform = { value: 0.18 };
  const windEnabledUniform = { value: 1.0 };

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // 1. Continuous sculpted woodland terrain spanning beyond fog horizon (no flat edge)
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(180, 180, 160, 160));
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.forestFloorMap,
      normalMap: textures.forestFloorNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughnessMap: textures.forestFloorRoughness,
      aoMap: textures.forestFloorAo,
      aoMapIntensity: 0.85,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  scene.add(terrainMesh);

  // 1b. Left Woodland Hollow Pond — Inexpensive Screen-Space Reflection (SSR-style) Water Shader
  const pondFireflyPositions = [
    new THREE.Vector3(-9.6, POND_WATER_Y + 0.62, -1.8),
    new THREE.Vector3(-11.4, POND_WATER_Y + 0.84, 1.1),
    new THREE.Vector3(-8.7, POND_WATER_Y + 0.55, 2.6),
  ];
  const pondWaterUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 0.18 },
    uResolution: { value: new THREE.Vector2(1440, 900) },
    uFogColor: { value: new THREE.Color(0x070d18) },
    uFogDensity: { value: 0.022 },
    uFireflyPos: { value: pondFireflyPositions },
  };
  const pondWaterGeo = trackGeo(new THREE.CircleGeometry(6.8, 48));
  pondWaterGeo.rotateX(-Math.PI / 2);
  pondWaterGeo.scale(0.84, 1.0, 1.24);
  const pondWaterMat = trackMat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: pondWaterUniforms,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWindStrength;
        varying vec3 vWorldPos;
        varying float vViewDist;
        void main() {
          vec3 pos = position;
          float wave = sin(pos.x * 1.8 + uTime * 1.4) * cos(pos.z * 1.6 - uTime * 1.1) * (0.012 + uWindStrength * 0.015);
          pos.y += wave;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vec4 mvPos = viewMatrix * worldPos;
          vViewDist = -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uWindStrength;
        uniform vec2 uResolution;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uFireflyPos[3];
        varying vec3 vWorldPos;
        varying float vViewDist;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float waterNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          vec2 p = vWorldPos.xz;
          float t = uTime * (0.65 + uWindStrength * 0.75);
          float h0 = waterNoise(p * 2.1 + vec2(t * 0.55, -t * 0.42)) * 0.6
                   + waterNoise(p * 4.8 + vec2(-t * 0.75, t * 0.62)) * 0.4;
          float hx = waterNoise((p + vec2(0.08, 0.0)) * 2.1 + vec2(t * 0.55, -t * 0.42)) * 0.6
                   + waterNoise((p + vec2(0.08, 0.0)) * 4.8 + vec2(-t * 0.75, t * 0.62)) * 0.4;
          float hz = waterNoise((p + vec2(0.0, 0.08)) * 2.1 + vec2(t * 0.55, -t * 0.42)) * 0.6
                   + waterNoise((p + vec2(0.0, 0.08)) * 4.8 + vec2(-t * 0.75, t * 0.62)) * 0.4;

          vec3 N = normalize(vec3((h0 - hx) * 1.9, 1.0, (h0 - hz) * 1.9));
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 R = reflect(-V, N);

          // Inexpensive Screen-Space Reflection (SSR) UV ray offset & sky/canopy silhouette projection
          vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
          vec2 ssrUv = clamp(screenUv + vec2(N.x * 0.14, N.z * 0.18), 0.0, 1.0);
          float skyMask = smoothstep(0.18, 0.85, ssrUv.y + R.y * 0.35);

          vec3 moonDir = normalize(vec3(0.24, 0.78, -0.58));
          float moonSpec = pow(max(dot(R, moonDir), 0.0), 42.0);
          float moonStreak = pow(max(dot(R, normalize(vec3(0.18, 0.42, -0.88))), 0.0), 9.0);

          // Reflected nocturnal canopy band across screen-space horizon
          float canopySil = smoothstep(0.26, 0.62, waterNoise(vec2(ssrUv.x * 18.0 + R.x * 3.0, 1.7)) * 0.55 + skyMask * 0.65);
          vec3 ssrSkyCol = mix(vec3(0.025, 0.055, 0.085), vec3(0.11, 0.21, 0.36), skyMask);
          vec3 ssrCanopyCol = mix(vec3(0.015, 0.035, 0.03), ssrSkyCol, canopySil);
          vec3 reflectedCol = ssrCanopyCol + vec3(0.75, 0.88, 1.0) * (moonSpec * 2.2 + moonStreak * 0.38);

          // Screen-space shimmering reflections from green fireflies over the pond
          for (int k = 0; k < 3; k++) {
            vec3 fp = uFireflyPos[k];
            vec2 fDelta = (fp.xz - vWorldPos.xz) + N.xz * 0.72;
            float fDist = length(fDelta);
            float fColReflect = exp(-fDist * 1.45) * (0.45 + 0.55 * max(0.0, 1.0 - abs(fDelta.x) * 1.6));
            reflectedCol += vec3(0.28, 1.0, 0.48) * fColReflect * 0.85;
          }

          float fresnel = 0.06 + 0.94 * pow(1.0 - max(dot(N, V), 0.0), 3.6);
          vec3 deepWater = vec3(0.02, 0.065, 0.075);
          vec3 col = mix(deepWater, reflectedCol, clamp(fresnel * 1.15, 0.08, 0.94));

          // Soft shallow rim alpha & moonlight shoreline shimmer
          float radial = length(vec2((vWorldPos.x + 10.2) / 5.4, (vWorldPos.z + 0.6) / 7.8));
          float shoreFade = 1.0 - smoothstep(0.72, 0.98, radial);
          col += vec3(0.12, 0.22, 0.28) * smoothstep(0.62, 0.88, radial) * shoreFade * 0.35;

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
          col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));
          gl_FragColor = vec4(col, shoreFade * 0.92);
        }
      `,
    }),
  );
  const pondWaterMesh = new THREE.Mesh(pondWaterGeo, pondWaterMat);
  pondWaterMesh.position.set(-10.2, POND_WATER_Y, -0.6);
  scene.add(pondWaterMesh);

  // Shared organic & mineral PBR materials with varied roughness & ambient occlusion
  const logMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.rottingLogMap,
      normalMap: textures.rottingLogNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      aoMap: textures.rottingLogAo,
      aoMapIntensity: 0.82,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const mossPatchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.mossPatchMap,
      alphaMap: textures.mossPatchAlpha,
      normalMap: textures.mossPatchNormal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      alphaTest: 0.34,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.rockMap,
      normalMap: textures.rockNormal,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: textures.rockRoughness,
      aoMap: textures.rockAo,
      aoMapIntensity: 0.88,
      roughness: 0.86,
      metalness: 0.05,
    }),
  );
  const nearRockMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: textures.mossyRockMap,
      normalMap: textures.mossyRockNormal,
      normalScale: new THREE.Vector2(1.75, 1.75),
      roughnessMap: textures.mossyRockRoughness,
      aoMap: textures.rockAo,
      aoMapIntensity: 0.9,
      roughness: 0.88,
      metalness: 0.03,
      sheen: 0.42,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0x4b7d45),
      clearcoat: 0.14,
      clearcoatRoughness: 0.52,
    }),
  );
  const lichenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.lichenMap,
      alphaMap: textures.lichenAlpha,
      normalMap: textures.lichenNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      alphaTest: 0.4,
      roughness: 0.84,
      metalness: 0.0,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const birchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.birchBarkMap,
      normalMap: textures.birchBarkNormal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      aoMap: textures.birchBarkAo,
      aoMapIntensity: 0.72,
      roughness: 0.76,
      metalness: 0.03,
    }),
  );
  const pineBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.pineBarkMap,
      normalMap: textures.pineBarkNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      aoMap: textures.pineBarkAo,
      aoMapIntensity: 0.84,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c4736,
      map: textures.rottingLogMap,
      normalMap: textures.rottingLogNormal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      aoMap: textures.rottingLogAo,
      aoMapIntensity: 0.75,
      roughness: 0.87,
      metalness: 0.02,
    }),
  );
  const canopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.canopyLeafMap,
      alphaMap: textures.canopyLeafAlpha,
      transparent: true,
      alphaTest: 0.48,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  applyFoliageWindShader(canopyMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.34, true);

  // Collect all flat alpha-mapped moss overlay planes for single-InstancedMesh rendering
  const mossOverlayPlacements: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    sx: number;
    sy: number;
    sz: number;
  }[] = [];

  // 2. Central Rotting Log ("Коряга") + Recessed Pantry + Elder Uspokh's Overhang Branch
  const logGroup = new THREE.Group();
  const logCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, groundHeightAt(-4.2, 1.0) + 0.52, 1.0),
    new THREE.Vector3(-1.2, groundHeightAt(-1.2, 0.3) + 0.78, 0.3),
    new THREE.Vector3(2.2, groundHeightAt(2.2, -0.2) + 0.72, -0.2),
    new THREE.Vector3(4.8, groundHeightAt(4.8, 0.4) + 0.42, 0.4),
  ]);
  const mainLogGeo = trackGeo(new THREE.TubeGeometry(logCurve, 32, 0.84, 16, false));
  const lPos = mainLogGeo.attributes.position;
  for (let i = 0; i < lPos.count; i++) {
    const vx = lPos.getX(i);
    const vy = lPos.getY(i);
    const vz = lPos.getZ(i);
    const gnarl = Math.sin(vx * 3.1 + vz * 4.2) * 0.045;
    lPos.setY(i, vy + gnarl);
  }
  mainLogGeo.computeVertexNormals();
  const mainLog = new THREE.Mesh(mainLogGeo, logMat);
  mainLog.castShadow = !isSoftwareGl;
  mainLog.receiveShadow = !isSoftwareGl;
  logGroup.add(mainLog);

  // Register overlapping cylindrical colliders along logCurve so spider cannot walk inside bark & can climb atop it
  for (let i = 0; i <= 12; i++) {
    const pt = logCurve.getPoint(i / 12);
    colliders.push({
      id: `log_seg_${i}`,
      kind: 'log',
      x: pt.x,
      z: pt.z,
      radius: 0.85,
      centerY: pt.y,
      topY: pt.y + 0.85,
      climbable: true,
    });
  }

  // Flat alpha-cutout moss overlay planes hugging the log ridge & flanks (aligned to curve normal & tangent!)
  for (let i = 0; i < 14; i++) {
    const t = 0.1 + (i / 13) * 0.8;
    const pt = logCurve.getPoint(t);
    const tangent = logCurve.getTangent(t).normalize();
    const sideAngle = i % 3 === 0 ? 0.38 : i % 3 === 1 ? -0.38 : 0.0;
    const radialNormal = new THREE.Vector3(
      -tangent.z * Math.sin(sideAngle),
      Math.cos(sideAngle),
      tangent.x * Math.sin(sideAngle),
    ).normalize();
    const surfPt = pt.clone().addScaledVector(radialNormal, 0.845);
    const rotMat = new THREE.Matrix4().makeBasis(
      tangent,
      radialNormal.clone().cross(tangent).normalize(),
      radialNormal,
    );
    const euler = new THREE.Euler().setFromRotationMatrix(rotMat);

    mossOverlayPlacements.push({
      x: surfPt.x,
      y: surfPt.y,
      z: surfPt.z,
      rx: euler.x,
      ry: euler.y,
      rz: euler.z,
      sx: 0.92 + (i % 3) * 0.16,
      sy: 0.78 + (i % 2) * 0.16,
      sz: 1,
    });
  }

  // Elder Uspokh's natural arched root spur rising out of the log and dipping back into the bark
  const uspokhPerchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.05, groundHeightAt(-3.05, 0.72) + 0.72, 0.72),
    new THREE.Vector3(-2.4, groundHeightAt(-2.4, 0.52) + 1.48, 0.52),
    new THREE.Vector3(-1.7, groundHeightAt(-1.7, 0.28) + 1.18, 0.28),
    new THREE.Vector3(-1.3, groundHeightAt(-1.3, 0.25) + 0.78, 0.25),
  ]);
  const uspokhBranch = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(uspokhPerchCurve, 16, 0.15, 9, false)),
    logMat,
  );
  uspokhBranch.castShadow = !isSoftwareGl;
  logGroup.add(uspokhBranch);

  // Elder Uspokh animated 3D spider model perched cleanly atop the arched root overlooking Pavutin
  const uspokh = createPavutinModel(textures, true);
  uspokh.root.position.set(-2.35, groundHeightAt(-2.35, 0.52) + 1.54, 0.52);
  uspokh.root.rotation.y = Math.PI * 0.18;
  uspokh.root.rotation.x = 0.14;
  uspokh.shadowDisc.visible = false;
  scene.add(uspokh.root);

  // Recessed Pantry hollow alcove behind amber cocoons + bark arch rim (pure PBR darkness)
  const pantryVoid = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.36, 12, 10)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x050404,
        roughness: 1.0,
        metalness: 0.0,
        envMapIntensity: 0,
      }),
    ),
  );
  pantryVoid.scale.set(1.25, 0.85, 0.42);
  pantryVoid.position.set(1.1, groundHeightAt(1.1, 0.62) + 0.22, 0.54);
  logGroup.add(pantryVoid);

  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.62, groundHeightAt(0.62, 0.82), 0.82),
    new THREE.Vector3(0.85, groundHeightAt(0.85, 0.85) + 0.52, 0.85),
    new THREE.Vector3(1.38, groundHeightAt(1.38, 0.85) + 0.48, 0.85),
    new THREE.Vector3(1.58, groundHeightAt(1.58, 0.82), 0.82),
  ]);
  const archMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(archCurve, 12, 0.11, 7, false)),
    logMat,
  );
  logGroup.add(archMesh);

  // Gnarled exposed surface roots spreading from the fallen log into mossy humus
  const logRoots: [number, number, number, number][] = [
    [-4.1, 1.05, -5.6, 2.25],
    [-3.6, 1.4, -4.4, 2.85],
    [4.4, 0.4, 5.9, 1.4],
    [4.6, 0.2, 6.2, -0.75],
  ];
  logRoots.forEach(([rx1, rz1, rx2, rz2]) => {
    const mx = (rx1 + rx2) * 0.5 + 0.18;
    const mz = (rz1 + rz2) * 0.5 - 0.12;
    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx1, groundHeightAt(rx1, rz1) + 0.34, rz1),
      new THREE.Vector3(mx, groundHeightAt(mx, mz) + 0.15, mz),
      new THREE.Vector3(rx2, groundHeightAt(rx2, rz2) - 0.08, rz2),
    ]);
    const rMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(rCurve, 10, 0.11, 7, false)),
      logMat,
    );
    rMesh.castShadow = !isSoftwareGl;
    rMesh.receiveShadow = !isSoftwareGl;
    logGroup.add(rMesh);
  });

  const pantryCocoonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0dfc2,
      emissive: 0x8c5918,
      emissiveIntensity: 0.78,
      roughness: 0.64,
    }),
  );
  for (const offsetX of [-0.15, 0.13]) {
    const cocoon = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.115, 12, 10)),
      pantryCocoonMat,
    );
    cocoon.scale.set(0.85, 1.32, 0.85);
    cocoon.position.set(
      1.1 + offsetX,
      groundHeightAt(1.1 + offsetX, 0.86) + 0.18,
      0.86,
    );
    logGroup.add(cocoon);
  }

  const pantryLight = new THREE.PointLight(0xffb866, 2.3, 5.2, 2);
  pantryLight.position.set(1.1, groundHeightAt(1.1, 0.98) + 0.4, 0.98);
  scene.add(pantryLight);
  scene.add(logGroup);

  // 3. Bioluminescent Mushrooms (Cyan-Turquoise Moon-Caps + Rare Violet Arcane Fungi) & Glowing Mycelium
  const mushStemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2dac8,
      map: textures.birchBarkMap,
      normalMap: textures.birchBarkNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.82,
    }),
  );
  const cyanMushCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x99ebff,
      map: textures.rockMap,
      roughnessMap: textures.rockRoughness,
      emissive: 0x3bd8ff,
      emissiveIntensity: 1.55,
      roughness: 0.3,
    }),
  );
  const violetMushCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9b8ff,
      map: textures.rockMap,
      roughnessMap: textures.rockRoughness,
      emissive: 0x9a4dff,
      emissiveIntensity: 1.85,
      roughness: 0.26,
    }),
  );
  const cyanMushSpots: [number, number, number][] = [
    [-3.15, 1.32, 1.0],
    [-2.82, 1.52, 0.72],
    [-2.58, 1.44, 0.56],
    [3.82, 0.9, 0.95],
    [4.05, 1.05, 0.68],
    [-8.9, -11.4, 0.92],
    [-8.6, -11.7, 0.62],
    [10.8, -10.8, 0.88],
    [-5.2, 5.6, 0.85],
    [-5.0, 5.8, 0.55],
  ];
  const violetMushSpots: [number, number, number][] = [
    [-16.1, 2.55, 1.08],
    [-16.4, 2.88, 0.78],
    [-15.85, 2.96, 0.58],
    [-9.2, 2.1, 0.92],
    [-8.95, 2.35, 0.64],
    [-6.9, -4.1, 0.86],
  ];

  const mushStemGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.038, 0.24, 7));
  mushStemGeo.translate(0, 0.12, 0);
  const mushCapGeo = trackGeo(
    new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
  );

  const allMush = [
    ...cyanMushSpots.map((c) => ({ x: c[0], z: c[1], s: c[2], violet: false })),
    ...violetMushSpots.map((v) => ({ x: v[0], z: v[1], s: v[2], violet: true })),
  ];
  const mushStemInst = new THREE.InstancedMesh(mushStemGeo, mushStemMat, allMush.length);
  const cyanCapInst = new THREE.InstancedMesh(mushCapGeo, cyanMushCapMat, cyanMushSpots.length);
  const violetCapInst = new THREE.InstancedMesh(mushCapGeo, violetMushCapMat, violetMushSpots.length);
  const mDummy = new THREE.Object3D();
  let cyanIdx = 0;
  let violetIdx = 0;
  allMush.forEach((m, idx) => {
    const my = groundHeightAt(m.x, m.z);
    mDummy.position.set(m.x, my - 0.01, m.z);
    mDummy.rotation.set(Math.sin(idx * 1.4) * 0.12, idx * 1.1, Math.cos(idx * 1.7) * 0.12);
    mDummy.scale.setScalar(m.s);
    mDummy.updateMatrix();
    mushStemInst.setMatrixAt(idx, mDummy.matrix);

    mDummy.position.set(m.x, my + 0.22 * m.s, m.z);
    mDummy.updateMatrix();
    if (m.violet) {
      violetCapInst.setMatrixAt(violetIdx++, mDummy.matrix);
    } else {
      cyanCapInst.setMatrixAt(cyanIdx++, mDummy.matrix);
    }
  });
  mushStemInst.computeBoundingSphere();
  cyanCapInst.computeBoundingSphere();
  violetCapInst.computeBoundingSphere();
  scene.add(mushStemInst, cyanCapInst, violetCapInst);

  // Subtle glowing violet mycelium root veins on humus strictly in Hollow & Stump arcane groves
  const myceliumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2d1252,
      emissive: 0x7d3ee6,
      emissiveIntensity: 0.72,
      roughness: 0.68,
      transparent: true,
      opacity: 0.66,
    }),
  );
  const myceliumOrigins: [number, number][] = [
    [-16.1, 2.7],
    [-9.1, 2.2],
    [-6.9, -4.1],
  ];
  myceliumOrigins.forEach(([ox, oz], oi) => {
    for (let strand = 0; strand < 3; strand++) {
      const ang = (strand / 3) * Math.PI * 2 + oi * 0.9;
      const p1 = new THREE.Vector3(ox, groundHeightAt(ox, oz) + 0.018, oz);
      const midX = ox + Math.cos(ang + 0.25) * 0.52;
      const midZ = oz + Math.sin(ang + 0.25) * 0.52;
      const endX = ox + Math.cos(ang) * 1.05;
      const endZ = oz + Math.sin(ang) * 1.05;
      const veinCurve = new THREE.CatmullRomCurve3([
        p1,
        new THREE.Vector3(midX, groundHeightAt(midX, midZ) + 0.015, midZ),
        new THREE.Vector3(endX, groundHeightAt(endX, endZ) - 0.02, endZ),
      ]);
      scene.add(
        new THREE.Mesh(trackGeo(new THREE.TubeGeometry(veinCurve, 8, 0.009, 5, false)), myceliumMat),
      );
    }
  });

  // Soft Violet Arcane Hollow Light + Soft Cyan Log Fungi Light (distinct mystical color separation)
  const hollowArcaneLight = new THREE.PointLight(0xa36aff, 1.65, 6.2, 2);
  hollowArcaneLight.position.set(-15.9, groundHeightAt(-15.9, 2.7) + 0.75, 2.7);
  scene.add(hollowArcaneLight);

  const cyanFungiLight = new THREE.PointLight(0x45d8ff, 1.25, 4.8, 2);
  cyanFungiLight.position.set(-2.95, groundHeightAt(-2.95, 1.4) + 0.55, 1.4);
  scene.add(cyanFungiLight);

  // 4. Sculpted Photorealistic Hero Birches with Peeling Bark, Mossy Roots, Foliage & Solid Colliders
  const birchPeelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6e4dc,
      map: textures.birchBarkMap,
      normalMap: textures.birchBarkNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
  );

  function buildHeroBirch(id: string, bx: number, bz: number, tiltX: number, tiltZ: number) {
    const g = new THREE.Group();
    const gy = groundHeightAt(bx, bz);
    g.position.set(bx, gy, bz);

    const trunkGeo = trackGeo(new THREE.CylinderGeometry(1.12, 1.62, 22, 20, 12));
    const tPos = trunkGeo.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const vx = tPos.getX(i);
      const vy = tPos.getY(i);
      const vz = tPos.getZ(i);
      const flare = vy < -7.5 ? 1 + (-7.5 - vy) * 0.08 : 1.0;
      const knot = Math.sin(vy * 1.4 + Math.atan2(vz, vx) * 3) * 0.045;
      tPos.setXYZ(i, vx * flare + knot, vy, vz * flare + knot);
    }
    trunkGeo.computeVertexNormals();

    const trunk = new THREE.Mesh(trunkGeo, birchMat);
    trunk.position.y = 10.5;
    trunk.rotation.set(tiltX, 0, tiltZ);
    trunk.castShadow = !isSoftwareGl;
    trunk.receiveShadow = !isSoftwareGl;
    g.add(trunk);

    // Register solid trunk collider
    colliders.push({
      id,
      kind: 'tree',
      x: bx,
      z: bz,
      radius: 1.55,
      topY: gy + 22,
      climbable: false,
    });

    // Curling peeling birch bark strips along trunk
    const stripGeo = trackGeo(new THREE.PlaneGeometry(0.45, 0.24, 3, 1));
    for (let s = 0; s < 10; s++) {
      const ang = (s / 10) * Math.PI * 2 + 0.3;
      const sy = 1.4 + s * 0.85;
      const strip = new THREE.Mesh(stripGeo, birchPeelMat);
      const rAtH = 1.52 - sy * 0.025;
      strip.position.set(Math.cos(ang) * rAtH, sy, Math.sin(ang) * rAtH);
      strip.rotation.y = -ang + Math.PI / 2 + 0.28;
      strip.rotation.x = 0.14;
      g.add(strip);
    }

    // Flared buttress roots & mossy root collars
    for (let r = 0; r < 5; r++) {
      const ang = (r / 5) * Math.PI * 2 + 0.4;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.95, 1.35, Math.sin(ang) * 0.95),
        new THREE.Vector3(Math.cos(ang) * 2.15, 0.44, Math.sin(ang) * 2.15),
        new THREE.Vector3(Math.cos(ang) * 3.15, -0.22, Math.sin(ang) * 3.15),
      ]);
      const rootMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(rootCurve, 12, 0.32, 8, false)),
        birchMat,
      );
      rootMesh.castShadow = !isSoftwareGl;
      rootMesh.receiveShadow = !isSoftwareGl;
      g.add(rootMesh);

      // Flat alpha-mapped moss plane clinging along buttress root & trunk base
      mossOverlayPlacements.push({
        x: bx + Math.cos(ang) * 1.65,
        y: gy + 0.72,
        z: bz + Math.sin(ang) * 1.65,
        rx: -Math.PI / 2 + 0.45,
        ry: -ang + Math.PI / 2,
        rz: 0,
        sx: 1.05,
        sy: 0.88,
        sz: 1,
      });
      mossOverlayPlacements.push({
        x: bx + Math.cos(ang + 0.25) * 1.56,
        y: gy + 1.85 + r * 0.42,
        z: bz + Math.sin(ang + 0.25) * 1.56,
        rx: 0.06,
        ry: -ang - 0.25 + Math.PI / 2,
        rz: 0.12 * r,
        sx: 0.92,
        sy: 1.15,
        sz: 1,
      });
    }

    // Spreading primary boughs + 3D cupped moonlit leaf sprays
    const leafClusterGeo = trackGeo(createCurvedFoliageClusterGeo(2.35));
    for (let b = 0; b < 4; b++) {
      const bAng = (b / 4) * Math.PI * 2 + 0.45;
      const boughPivot = new THREE.Group();
      boughPivot.position.set(tiltZ * -10, 10.6 + b * 1.35, tiltX * 10);
      boughPivot.rotation.y = bAng;

      const boughGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.34, 6.4, 10));
      boughGeo.translate(0, 3.2, 0);
      const bough = new THREE.Mesh(boughGeo, birchMat);
      bough.rotation.z = -0.82;
      boughPivot.add(bough);

      for (let lf = 0; lf < 3; lf++) {
        const card = new THREE.Mesh(leafClusterGeo, canopyMat);
        card.position.set(2.4 + lf * 1.15, 2.2 + lf * 0.65, (lf % 2 === 0 ? 0.5 : -0.5));
        card.rotation.set(-0.35 + lf * 0.25, lf * 1.1, 0.2);
        boughPivot.add(card);
      }
      g.add(boughPivot);
    }
    scene.add(g);
  }

  buildHeroBirch('tree_left_birch', -10.8, -14.2, 0.03, -0.04);
  buildHeroBirch('tree_right_birch', 12.4, -13.2, -0.02, 0.05);

  // 5. Old Stump ("Старый Пень") with Root Buttresses, Polypore Fungi, Moss Skirt & Climbable Collider
  const stumpGroup = new THREE.Group();
  const sy = groundHeightAt(-17.5, 2.0);
  stumpGroup.position.set(-17.5, sy, 2.0);
  const stumpGeo = trackGeo(new THREE.CylinderGeometry(1.42, 1.98, 2.35, 18, 6));
  const sPos = stumpGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const vx = sPos.getX(i);
    const vy = sPos.getY(i);
    const vz = sPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const flute = Math.sin(ang * 5) * 0.14 * (vy < 0 ? 1.5 : 0.45);
    sPos.setXYZ(i, vx + Math.cos(ang) * flute, vy, vz + Math.sin(ang) * flute);
  }
  stumpGeo.computeVertexNormals();
  const stumpBody = new THREE.Mesh(stumpGeo, logMat);
  stumpBody.position.y = 1.02;
  stumpBody.castShadow = !isSoftwareGl;
  stumpBody.receiveShadow = !isSoftwareGl;
  stumpGroup.add(stumpBody);

  // Flat alpha-cutout moss overlays hugging Old Stump rim & bark flanks
  mossOverlayPlacements.push({
    x: -17.55,
    y: sy + 2.21,
    z: 2.02,
    rx: -Math.PI / 2,
    ry: 0.6,
    rz: 0,
    sx: 2.05,
    sy: 1.95,
    sz: 1,
  });
  for (let sm = 0; sm < 5; sm++) {
    const sAng = (sm / 5) * Math.PI * 2 + 0.3;
    mossOverlayPlacements.push({
      x: -17.5 + Math.cos(sAng) * 1.58,
      y: sy + 0.85 + (sm % 2) * 0.45,
      z: 2.0 + Math.sin(sAng) * 1.58,
      rx: 0.08,
      ry: -sAng + Math.PI / 2,
      rz: 0.15,
      sx: 1.12,
      sy: 0.98,
      sz: 1,
    });
  }

  // Layered Polypore shelf fungi with textured bark-ring cap
  const capMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdccdb3,
      map: textures.rottingLogMap,
      normalMap: textures.rottingLogNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.7,
    }),
  );
  for (let m = 0; m < 4; m++) {
    const cap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42, 0.14, 0.11, 14)),
      capMat,
    );
    cap.position.set(1.38, 0.55 + m * 0.4, (m - 1.5) * 0.42);
    cap.scale.set(1.22, 1, 0.85);
    stumpGroup.add(cap);
  }
  scene.add(stumpGroup);

  colliders.push({
    id: 'stump_old',
    kind: 'stump',
    x: -17.5,
    z: 2.0,
    radius: 1.65,
    topY: sy + 2.22,
    climbable: true,
  });

  // 6. Ancient Fractured Boulders + Volumetric Multi-Hue Moss Cushions + Foliose Lichens
  const rockGeoA = trackGeo(createDisplacedRockGeometry(1.7, 2));
  const rockGeoB = trackGeo(createDisplacedRockGeometry(5.3, 2));
  const rockGeoC = trackGeo(createDisplacedRockGeometry(8.9, 2));
  const dummy = new THREE.Object3D();
  const colorTint = new THREE.Color();

  const clearingBoulders: {
    id: string;
    x: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rotY: number;
    climbable: boolean;
    variant: 'A' | 'B' | 'C';
  }[] = [
    { id: 'rock_fg_left', x: -3.8, z: 4.6, sx: 1.15, sy: 0.82, sz: 1.0, rotY: 0.4, climbable: true, variant: 'A' },
    { id: 'rock_fg_right', x: 4.4, z: 4.2, sx: 1.05, sy: 0.72, sz: 0.92, rotY: 1.8, climbable: true, variant: 'B' },
    { id: 'rock_hollow_rim', x: -6.8, z: -4.5, sx: 1.25, sy: 0.95, sz: 1.1, rotY: 2.3, climbable: true, variant: 'C' },
    { id: 'rock_nettle_flank', x: 5.9, z: 2.8, sx: 1.12, sy: 0.82, sz: 1.02, rotY: 0.9, climbable: true, variant: 'B' },
    { id: 'rock_sw_slate', x: -5.6, z: 6.2, sx: 1.3, sy: 0.9, sz: 1.15, rotY: 3.1, climbable: true, variant: 'A' },
    { id: 'rock_rb_trail', x: 7.8, z: -9.2, sx: 1.35, sy: 0.95, sz: 1.2, rotY: 1.2, climbable: true, variant: 'C' },
    { id: 'rock_stump_tall', x: -14.2, z: -6.4, sx: 1.45, sy: 1.55, sz: 1.3, rotY: 0.6, climbable: false, variant: 'A' },
    { id: 'rock_north_w', x: -4.8, z: -16.8, sx: 1.32, sy: 0.88, sz: 1.18, rotY: 2.6, climbable: true, variant: 'B' },
    { id: 'rock_north_e', x: 5.2, z: -16.5, sx: 1.32, sy: 0.88, sz: 1.15, rotY: 4.1, climbable: true, variant: 'C' },
    { id: 'rock_east_tall', x: 13.8, z: 3.2, sx: 1.5, sy: 1.48, sz: 1.32, rotY: 1.4, climbable: false, variant: 'B' },
  ];

  const rockListA: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number }[] = [];
  const rockListB: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number }[] = [];
  const rockListC: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number }[] = [];
  const lichenSpots: { x: number; y: number; z: number; s: number; rx: number; ry: number }[] = [];

  clearingBoulders.forEach((b, idx) => {
    const gy = groundHeightAt(b.x, b.z);
    const yPos = gy + b.sy * 0.42;
    const item = { x: b.x, y: yPos, z: b.z, sx: b.sx, sy: b.sy, sz: b.sz, rotY: b.rotY };
    if (b.variant === 'A') rockListA.push(item);
    else if (b.variant === 'B') rockListB.push(item);
    else rockListC.push(item);

    const colliderR = Math.max(b.sx, b.sz) * 0.86;
    const topY = yPos + b.sy * 0.72;
    colliders.push({
      id: b.id,
      kind: 'rock',
      x: b.x,
      z: b.z,
      radius: colliderR,
      topY,
      climbable: b.climbable,
    });

    mossOverlayPlacements.push({
      x: b.x + (idx % 2 === 0 ? 0.06 : -0.06),
      y: topY + 0.015,
      z: b.z + 0.04,
      rx: -Math.PI / 2 + 0.14 * Math.sin(idx),
      ry: b.rotY + 0.5,
      rz: 0.12 * Math.cos(idx),
      sx: b.sx * 0.84,
      sy: b.sz * 0.82,
      sz: 1,
    });

    lichenSpots.push({
      x: b.x + Math.cos(b.rotY) * (colliderR * 0.84),
      y: gy + b.sy * 0.55,
      z: b.z + Math.sin(b.rotY) * (colliderR * 0.84),
      s: 0.68 + (idx % 3) * 0.16,
      rx: 0.22,
      ry: -b.rotY + Math.PI / 2,
    });
  });

  const rockGeoLowA = trackGeo(createDisplacedRockGeometry(1.7, 0));
  const rockGeoLowB = trackGeo(createDisplacedRockGeometry(5.3, 0));
  const rockGeoLowC = trackGeo(createDisplacedRockGeometry(8.9, 0));
  const rockBillboardGeo = trackGeo(new THREE.PlaneGeometry(2.1, 1.65));
  const rockBillboardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb6c4cf,
      map: textures.rockSpriteMap,
      alphaMap: textures.rockSpriteAlpha,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  rockBillboardMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 camRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
      transformed = camRight * position.x + vec3(0.0, position.y, 0.0);`,
    );
  };
  rockBillboardMat.customProgramCacheKey = () => 'rock_cylindrical_billboard_v1';

  const lodRocks: THREE.LOD[] = [];
  for (let i = 0; i < 28; i++) {
    const isOuter = i >= 20;
    const localIdx = isOuter ? i - 20 : i;
    const count = isOuter ? 8 : 20;
    const ang = (localIdx / count) * Math.PI * 2 + (isOuter ? 0.55 : 0.25);
    const rad = isOuter ? 25.5 + (localIdx % 3) * 2.2 : 18.8 + ((i * 11) % 6);
    const rx = Math.cos(ang) * rad;
    const rz = Math.sin(ang) * rad;
    const gy = groundHeightAt(rx, rz);
    const rs = 0.95 + (i % 4) * 0.28;

    const hiGeo = i % 3 === 0 ? rockGeoA : i % 3 === 1 ? rockGeoB : rockGeoC;
    const loGeo = i % 3 === 0 ? rockGeoLowA : i % 3 === 1 ? rockGeoLowB : rockGeoLowC;

    const lod = new THREE.LOD();
    lod.position.set(rx, gy + rs * 0.35, rz);

    const hiMesh = new THREE.Mesh(hiGeo, rockMat);
    hiMesh.scale.set(rs * 1.28, rs * 0.88, rs * 1.05);
    hiMesh.rotation.set(0.06 * (i % 3), i * 1.1, -0.04 * (i % 2));
    hiMesh.castShadow = !isSoftwareGl;
    hiMesh.receiveShadow = !isSoftwareGl;

    const loMesh = new THREE.Mesh(loGeo, rockMat);
    loMesh.scale.copy(hiMesh.scale);
    loMesh.rotation.copy(hiMesh.rotation);

    const spriteCard = new THREE.Mesh(rockBillboardGeo, rockBillboardMat);
    spriteCard.scale.set(rs * 1.15, rs * 0.92, rs * 1.15);

    // Aggressive LOD distances: < 14m full fractured rock, 14-21m 20-tri rock, >= 21m flat 2-tri billboard sprite
    lod.addLevel(hiMesh, 0);
    lod.addLevel(loMesh, 14);
    lod.addLevel(spriteCard, 21);
    scene.add(lod);
    lodRocks.push(lod);

    if (!isOuter) {
      colliders.push({
        id: `rock_ring_${i}`,
        kind: 'rock',
        x: rx,
        z: rz,
        radius: rs * 1.0,
        topY: gy + rs * 1.15,
        climbable: false,
      });
      mossOverlayPlacements.push({
        x: rx,
        y: gy + rs * 0.96,
        z: rz,
        rx: -Math.PI / 2 + 0.15,
        ry: i * 0.7,
        rz: 0,
        sx: rs * 1.12,
        sy: rs * 1.04,
        sz: 1,
      });
    }
  }

  const populateRocks = (
    geo: THREE.BufferGeometry,
    list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number }[],
    seed: number,
  ) => {
    const inst = new THREE.InstancedMesh(geo, nearRockMat, list.length);
    inst.castShadow = !isSoftwareGl;
    inst.receiveShadow = !isSoftwareGl;
    list.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(0.06 * ((i + seed) % 3), r.rotY, -0.04 * (i % 2));
      dummy.scale.set(r.sx, r.sy, r.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      // Varied weathered mineral + mossy emerald-slate hues for nearby boulders
      colorTint.setHSL(0.46 - (i % 3) * 0.06, 0.14 + (i % 2) * 0.06, 0.74 + ((i + seed) % 4) * 0.07);
      inst.setColorAt(i, colorTint);
    });
    inst.computeBoundingSphere();
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.matrixAutoUpdate = false;
    scene.add(inst);
  };
  populateRocks(rockGeoA, rockListA, 1);
  populateRocks(rockGeoB, rockListB, 2);
  populateRocks(rockGeoC, rockListC, 3);

  // Curved alpha-cutout moss patches + 3D volumetric moss micro-tuft cushions (no flat green paint)
  const mossOverlayGeo = trackGeo(new THREE.PlaneGeometry(1.12, 0.96, 3, 2));
  const mPos = mossOverlayGeo.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const mx = mPos.getX(i);
    const my = mPos.getY(i);
    mPos.setZ(i, -(mx * mx * 0.18 + my * my * 0.14));
  }
  mossOverlayGeo.computeVertexNormals();

  const mossInst = new THREE.InstancedMesh(
    mossOverlayGeo,
    mossPatchMat,
    mossOverlayPlacements.length,
  );
  mossInst.receiveShadow = !isSoftwareGl;
  mossOverlayPlacements.forEach((m, i) => {
    dummy.position.set(m.x, m.y, m.z);
    dummy.rotation.set(m.rx, m.ry, m.rz);
    dummy.scale.set(m.sx, m.sy, m.sz);
    dummy.updateMatrix();
    mossInst.setMatrixAt(i, dummy.matrix);
    // Multi-hue nocturnal greens + subtle teal tinting
    colorTint.setHSL(0.3 + (i % 5) * 0.028, 0.44, 0.58 + (i % 4) * 0.1);
    mossInst.setColorAt(i, colorTint);
  });
  mossInst.computeBoundingSphere();
  if (mossInst.instanceColor) mossInst.instanceColor.needsUpdate = true;
  scene.add(mossInst);

  // 3D Crossed Volumetric Moss Tufts on log ridge, stump rim, and boulder tops
  const mossTuftGeo = trackGeo(
    (() => {
      const pA = new THREE.PlaneGeometry(0.42, 0.24, 2, 1);
      pA.translate(0, 0.1, 0);
      const pB = pA.clone();
      pB.rotateY(Math.PI * 0.5);
      return mergeSimpleGeometries([pA, pB]);
    })(),
  );
  const mossTuftInst = new THREE.InstancedMesh(
    mossTuftGeo,
    mossPatchMat,
    mossOverlayPlacements.length * 2,
  );
  let mtIdx = 0;
  mossOverlayPlacements.forEach((m, i) => {
    for (let k = 0; k < 2; k++) {
      dummy.position.set(
        m.x + (k === 0 ? 0.14 : -0.14),
        m.y + 0.02,
        m.z + (k === 0 ? -0.12 : 0.12),
      );
      dummy.rotation.set(0.08 * (k === 0 ? 1 : -1), m.ry + k * 0.9, 0);
      const ts = 0.85 + ((i + k) % 4) * 0.16;
      dummy.scale.set(ts, ts, ts);
      dummy.updateMatrix();
      mossTuftInst.setMatrixAt(mtIdx, dummy.matrix);
      colorTint.setHSL(0.29 + ((i + k) % 4) * 0.036, 0.48, 0.62 + ((i + k) % 3) * 0.1);
      mossTuftInst.setColorAt(mtIdx, colorTint);
      mtIdx++;
    }
  });
  mossTuftInst.computeBoundingSphere();
  if (mossTuftInst.instanceColor) mossTuftInst.instanceColor.needsUpdate = true;
  scene.add(mossTuftInst);

  // Add bark & log lichens alongside boulder lichens
  const extraLichens = [
    { x: -9.35, y: groundHeightAt(-10.8, -14.2) + 1.6, z: -13.6, s: 0.78, rx: 0, ry: 0.5 },
    { x: 11.0, y: groundHeightAt(12.4, -13.2) + 1.8, z: -12.6, s: 0.78, rx: 0, ry: -0.6 },
    { x: -16.0, y: groundHeightAt(-17.5, 2.0) + 1.1, z: 2.5, s: 0.72, rx: 0.1, ry: 1.2 },
    { x: 2.2, y: groundHeightAt(2.2, 0.62) + 0.78, z: 0.62, s: 0.58, rx: 0.25, ry: 0.1 },
    { x: -1.8, y: groundHeightAt(-1.8, 0.45) + 1.48, z: 0.45, s: 0.56, rx: -Math.PI / 2 + 0.2, ry: 0.8 },
  ];
  const allLichens = [...lichenSpots, ...extraLichens];
  const lichenGeo = trackGeo(new THREE.PlaneGeometry(0.74, 0.74, 2, 2));
  const licPos = lichenGeo.attributes.position;
  for (let i = 0; i < licPos.count; i++) {
    const lx = licPos.getX(i);
    const ly = licPos.getY(i);
    licPos.setZ(i, -(lx * lx + ly * ly) * 0.12);
  }
  lichenGeo.computeVertexNormals();
  const lichenInst = new THREE.InstancedMesh(lichenGeo, lichenMat, allLichens.length);
  allLichens.forEach((l, i) => {
    dummy.position.set(l.x, l.y, l.z);
    dummy.rotation.set(l.rx, l.ry, i * 0.4);
    dummy.scale.setScalar(l.s);
    dummy.updateMatrix();
    lichenInst.setMatrixAt(i, dummy.matrix);
  });
  lichenInst.computeBoundingSphere();
  scene.add(lichenInst);

  // 7. Nettle Cover Groves ("Заросли Крапивы") — Cutout Serrated Leaves + Fluted Stems + Wind Sway
  const nettleZones = [
    { x: 8.6, z: 2.2, radius: 3.3 },
    { x: 9.8, z: -5.8, radius: 3.1 },
    { x: 2.6, z: -7.5, radius: 2.4 },
    { x: -6.2, z: -7.2, radius: 2.5 },
  ];

  const nettleLeafGeo = trackGeo(new THREE.PlaneGeometry(0.56, 0.80, 4, 4));
  nettleLeafGeo.translate(0, 0.40, 0);
  const nPos = nettleLeafGeo.attributes.position;
  for (let i = 0; i < nPos.count; i++) {
    const ny = nPos.getY(i);
    const nx = nPos.getX(i);
    const t = Math.max(0, ny / 0.80);
    // Crisp 3D V-trough midrib fold + natural downward tip droop so leaves never read as flat cards
    nPos.setZ(i, -Math.pow(t, 1.85) * 0.2 + Math.abs(nx) * 0.26 * (1 - t * 0.35));
  }
  nettleLeafGeo.computeVertexNormals();

  const nettleLeafMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.nettleLeafMap,
      normalMap: textures.nettleLeafNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      alphaMap: textures.nettleLeafAlpha,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.56,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  applyFoliageWindShader(nettleLeafMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.52);

  const stemsPerZone = 16;
  const leavesPerStem = 5;
  const totalStems = nettleZones.length * stemsPerZone;
  const totalLeaves = totalStems * leavesPerStem;

  const stemGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.06, 2.55, 4)); // square nettle stem!
  stemGeo.translate(0, 1.27, 0);
  const stemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4c7d52,
      map: textures.rottingLogMap,
      normalMap: textures.rottingLogNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.84,
    }),
  );
  applyFoliageWindShader(stemMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.28);

  const stemInstances = new THREE.InstancedMesh(stemGeo, stemMat, totalStems);
  const nettleLeafInstances = new THREE.InstancedMesh(nettleLeafGeo, nettleLeafMat, totalLeaves);
  stemInstances.castShadow = !isSoftwareGl;
  nettleLeafInstances.receiveShadow = !isSoftwareGl;

  let stemIdx = 0;
  let leafIdx = 0;

  nettleZones.forEach((zone, zIdx) => {
    for (let s = 0; s < stemsPerZone; s++) {
      const ang = (s / stemsPerZone) * Math.PI * 2 + zIdx * 0.7;
      const dist = (0.24 + ((s * 37) % 100) / 130) * zone.radius;
      const sx = zone.x + Math.cos(ang) * dist;
      const sz = zone.z + Math.sin(ang) * dist;
      const syBase = groundHeightAt(sx, sz);
      const scaleY = 0.82 + ((s * 19) % 10) * 0.04;

      dummy.position.set(sx, syBase - 0.05, sz);
      dummy.rotation.set(Math.sin(s * 1.7) * 0.09, ang, Math.cos(s * 2.3) * 0.09);
      dummy.scale.set(1, scaleY, 1);
      dummy.updateMatrix();
      stemInstances.setMatrixAt(stemIdx++, dummy.matrix);

      for (let l = 0; l < leavesPerStem; l++) {
        const ly = syBase + 0.68 + l * 0.36 * scaleY;
        const lAng = ang + l * 1.57;
        dummy.position.set(sx, ly, sz);
        dummy.rotation.set(1.06 + (l % 2) * 0.16, lAng, 0);
        const lScale = 0.86 - l * 0.08;
        dummy.scale.set(lScale, lScale, lScale);
        dummy.updateMatrix();
        nettleLeafInstances.setMatrixAt(leafIdx, dummy.matrix);
        colorTint.setHSL(0.36 + (l % 3) * 0.015, 0.34, 0.72 + (s % 4) * 0.06);
        nettleLeafInstances.setColorAt(leafIdx, colorTint);
        leafIdx++;
      }
    }
  });
  stemInstances.computeBoundingSphere();
  nettleLeafInstances.computeBoundingSphere();
  if (nettleLeafInstances.instanceColor) nettleLeafInstances.instanceColor.needsUpdate = true;
  scene.add(stemInstances);
  scene.add(nettleLeafInstances);

  // 8. Doubly-Pinnate Woodland Ferns (3D Curved Fronds + NormalMap + Wind Sway)
  const fernGeo = trackGeo(new THREE.PlaneGeometry(0.62, 1.12, 4, 7));
  fernGeo.translate(0, 0.56, 0);
  const fPos = fernGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const fx = fPos.getX(i);
    const fy = fPos.getY(i);
    const t = Math.max(0, fy / 1.12);
    // Arched rachis + subtle V-trough fold along pinnae
    fPos.setZ(i, Math.pow(t, 1.9) * 0.44 - Math.abs(fx) * 0.18);
  }
  fernGeo.computeVertexNormals();

  const fernMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.fernLeafMap,
      normalMap: textures.fernLeafNormal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      alphaMap: textures.fernLeafAlpha,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.64,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  applyFoliageWindShader(fernMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.58);

  const fernClusterCount = 20;
  const frondsPerCluster = 6;
  const fernInstances = new THREE.InstancedMesh(fernGeo, fernMat, fernClusterCount * frondsPerCluster);
  let fIdx = 0;
  for (let c = 0; c < fernClusterCount; c++) {
    const ang = (c / fernClusterCount) * Math.PI * 2 + 0.35;
    const rad = 10.6 + (c % 4) * 2.8;
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad - 3.0;
    const cy = groundHeightAt(cx, cz);
    for (let fr = 0; fr < frondsPerCluster; fr++) {
      const fAng = (fr / frondsPerCluster) * Math.PI * 2 + c;
      dummy.position.set(cx, cy - 0.04, cz);
      dummy.rotation.set(0.42 + (fr % 2) * 0.15, fAng, 0);
      const fs = 0.66 + ((c + fr) % 4) * 0.095;
      dummy.scale.set(fs, fs, fs);
      dummy.updateMatrix();
      fernInstances.setMatrixAt(fIdx, dummy.matrix);
      colorTint.setHSL(0.34, 0.36, 0.68 + (fr % 3) * 0.08);
      fernInstances.setColorAt(fIdx, colorTint);
      fIdx++;
    }
  }
  fernInstances.computeBoundingSphere();
  if (fernInstances.instanceColor) fernInstances.instanceColor.needsUpdate = true;
  scene.add(fernInstances);

  // 9. Dense Wind-Swaying Woodland Grass Tufts (Crossed 3-Plane Botanical Tuft Geometry)
  const makeGrassTuftGeometry = (): THREE.BufferGeometry => {
    const p1 = new THREE.PlaneGeometry(0.58, 0.80, 1, 3);
    p1.translate(0, 0.40, 0);
    const pos = p1.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      pos.setZ(i, Math.pow(py / 0.80, 2) * 0.16);
    }
    p1.computeVertexNormals();

    const p2 = p1.clone();
    p2.rotateY(Math.PI / 3);
    const p3 = p1.clone();
    p3.rotateY(-Math.PI / 3);
    return mergeSimpleGeometries([p1, p2, p3]);
  };

  const grassGeo = trackGeo(makeGrassTuftGeometry());
  const grassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.grassBladeMap,
      alphaMap: textures.grassBladeAlpha,
      emissive: 0x142818,
      emissiveIntensity: 0.22,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  applyFoliageWindShader(grassMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.64);

  const nearGrassCoords: { x: number; z: number; s: number; rotY: number; shade: number }[] = [];
  const farGrassCoords: { x: number; z: number; s: number; shade: number }[] = [];
  const totalGrassAttempts = 940;
  for (let i = 0; i < totalGrassAttempts; i++) {
    // Deterministic golden-angle phyllotaxis dispersion across clearing + outer ring
    const t = (i + 0.5) / totalGrassAttempts;
    const ang = i * 2.39996;
    const rad = 1.45 + Math.sqrt(t) * 23.8;
    const gx = Math.cos(ang) * rad;
    const gz = Math.sin(ang) * rad - 2.4;
    const gy = groundHeightAt(gx, gz);

    // Keep pond interior, immediate spawn, log spine + flanks, and solid interiors clear
    if (gy < POND_WATER_Y + 0.05) continue;
    if (Math.hypot(gx - 0.4, gz - 3.2) < 1.25) continue;
    if (gx > -5.1 && gx < 5.6 && gz > -1.05 && gz < 2.15) continue;
    let insideSolid = false;
    for (let c = 0; c < colliders.length; c++) {
      const col = colliders[c];
      if (Math.hypot(gx - col.x, gz - col.z) < col.radius + 0.16) {
        insideSolid = true;
        break;
      }
    }
    if (insideSolid) continue;

    const item = {
      x: gx,
      z: gz,
      s: 0.58 + ((i * 17) % 11) * 0.055,
      rotY: (i * 1.37) % (Math.PI * 2),
      shade: 0.6 + ((i * 29) % 7) * 0.055,
    };
    if (rad <= 11.2) {
      nearGrassCoords.push(item);
    } else {
      farGrassCoords.push(item);
    }
  }

  const grassInstances = new THREE.InstancedMesh(grassGeo, grassMat, nearGrassCoords.length);
  nearGrassCoords.forEach((g, i) => {
    const gy = groundHeightAt(g.x, g.z);
    dummy.position.set(g.x, gy - 0.03, g.z);
    dummy.rotation.set(0, g.rotY, 0);
    dummy.scale.set(g.s, g.s * (0.82 + (i % 4) * 0.12), g.s);
    dummy.updateMatrix();
    grassInstances.setMatrixAt(i, dummy.matrix);
    colorTint.setHSL(0.32 + (i % 5) * 0.014, 0.35, g.shade);
    grassInstances.setColorAt(i, colorTint);
  });
  grassInstances.computeBoundingSphere();
  if (grassInstances.instanceColor) grassInstances.instanceColor.needsUpdate = true;
  scene.add(grassInstances);

  // Aggressive Grass LOD: Distant bushes become ultra-lightweight 2-triangle cylindrical billboard sprites
  const grassSpriteGeo = trackGeo(new THREE.PlaneGeometry(0.68, 0.84, 1, 1));
  grassSpriteGeo.translate(0, 0.42, 0);
  const grassSpriteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.grassBladeMap,
      alphaMap: textures.grassBladeAlpha,
      emissive: 0x142818,
      emissiveIntensity: 0.2,
      transparent: true,
      alphaTest: 0.48,
      roughness: 0.76,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  grassSpriteMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTimeUniform;
    shader.uniforms.uWindStrength = windStrengthUniform;
    shader.uniforms.uWindEnabled = windEnabledUniform;
    shader.vertexShader =
      `uniform float uWindTime;\nuniform float uWindStrength;\nuniform float uWindEnabled;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 gRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
      float gHeight = clamp(position.y, 0.0, 1.2);
      float gPhase = uWindTime * 2.1;
      #ifdef USE_INSTANCING
        gPhase += instanceMatrix[3][0] * 0.52 + instanceMatrix[3][2] * 0.45;
      #endif
      float sway = sin(gPhase) * gHeight * (0.22 + uWindStrength * 0.85) * 0.48 * uWindEnabled;
      transformed = gRight * (position.x + sway) + vec3(0.0, position.y, 0.0);`,
    );
  };
  grassSpriteMat.customProgramCacheKey = () => 'grass_lod_sprite_v2';

  const distantGrassSpritesInst = new THREE.InstancedMesh(
    grassSpriteGeo,
    grassSpriteMat,
    Math.max(1, farGrassCoords.length),
  );
  farGrassCoords.forEach((g, i) => {
    const gy = groundHeightAt(g.x, g.z);
    dummy.position.set(g.x, gy - 0.03, g.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(g.s * 1.1, g.s * (0.86 + (i % 4) * 0.1), g.s * 1.1);
    dummy.updateMatrix();
    distantGrassSpritesInst.setMatrixAt(i, dummy.matrix);
    colorTint.setHSL(0.32 + (i % 5) * 0.015, 0.34, g.shade * 0.94);
    distantGrassSpritesInst.setColorAt(i, colorTint);
  });
  distantGrassSpritesInst.computeBoundingSphere();
  if (distantGrassSpritesInst.instanceColor) distantGrassSpritesInst.instanceColor.needsUpdate = true;
  scene.add(distantGrassSpritesInst);

  // 10. Woodland Clover & Wood-Sorrel Patches
  const cloverGeo = trackGeo(new THREE.PlaneGeometry(0.56, 0.56, 2, 2));
  const clPos = cloverGeo.attributes.position;
  for (let i = 0; i < clPos.count; i++) {
    const cx = clPos.getX(i);
    const cy = clPos.getY(i);
    clPos.setZ(i, -(cx * cx + cy * cy) * 0.18);
  }
  cloverGeo.computeVertexNormals();
  cloverGeo.rotateX(-Math.PI / 2 + 0.18);
  const cloverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.cloverMap,
      alphaMap: textures.cloverAlpha,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.64,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  applyFoliageWindShader(cloverMat, windTimeUniform, windStrengthUniform, windEnabledUniform, 0.24, true);
  const cloverCount = 120;
  const cloverInstances = new THREE.InstancedMesh(cloverGeo, cloverMat, cloverCount);
  for (let i = 0; i < cloverCount; i++) {
    const ang = i * 2.39996 + 0.8;
    const rad = 2.0 + Math.sqrt((i + 0.5) / cloverCount) * 16.0;
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad - 2.0;
    const cy = groundHeightAt(cx, cz);
    dummy.position.set(cx, cy + 0.06, cz);
    dummy.rotation.set(0.12 * Math.sin(i), i * 1.1, 0.12 * Math.cos(i));
    const cs = 0.68 + (i % 4) * 0.15;
    dummy.scale.set(cs, cs, cs);
    dummy.updateMatrix();
    cloverInstances.setMatrixAt(i, dummy.matrix);
    colorTint.setHSL(0.35, 0.38, 0.7 + (i % 4) * 0.07);
    cloverInstances.setColorAt(i, colorTint);
  }
  cloverInstances.computeBoundingSphere();
  if (cloverInstances.instanceColor) cloverInstances.instanceColor.needsUpdate = true;
  scene.add(cloverInstances);

  // 11. Anchor Twigs (Gnarled Bark + Side Shoots + Leaf Buds + Dewdrops) & Great Pattern Frame
  const anchors: AnchorNode[] = [
    {
      id: 'log_a',
      label: 'Сучок у кладовой',
      position: { x: 1.6, y: groundHeightAt(1.6, 2.5) + 0.95, z: 2.5 },
      zone: 'log',
    },
    {
      id: 'log_b',
      label: 'Сухой сучок коряги',
      position: { x: -1.6, y: groundHeightAt(-1.6, 2.2) + 1.05, z: 2.2 },
      zone: 'log',
    },
    {
      id: 'log_c',
      label: 'Мшистая ветка',
      position: { x: 0.1, y: groundHeightAt(0.1, -0.4) + 1.38, z: -0.4 },
      zone: 'log',
    },
    {
      id: 'log_d',
      label: 'Дальний сук коряги',
      position: { x: 4.1, y: groundHeightAt(4.1, 1.5) + 0.95, z: 1.5 },
      zone: 'log',
    },
    {
      id: 'nettle_a',
      label: 'Стебель у крапивы',
      position: { x: 6.2, y: groundHeightAt(6.2, -1.8) + 1.1, z: -1.8 },
      zone: 'nettle',
    },
    {
      id: 'nettle_b',
      label: 'Кромка крапивы',
      position: { x: 9.2, y: groundHeightAt(9.2, -1.6) + 1.1, z: -1.6 },
      zone: 'nettle',
    },
    {
      id: 'nettle_c',
      label: 'Ветвь за крапивой',
      position: { x: 7.5, y: groundHeightAt(7.5, -4.4) + 1.15, z: -4.4 },
      zone: 'nettle',
    },
    {
      id: 'frame_west',
      label: 'Западный узел остова',
      position: { x: -2.6, y: groundHeightAt(-2.6, -12.6) + 1.45, z: -12.6 },
      zone: 'field',
      isFrameNode: true,
    },
    {
      id: 'frame_east',
      label: 'Восточный узел остова',
      position: { x: 2.6, y: groundHeightAt(2.6, -12.6) + 1.45, z: -12.6 },
      zone: 'field',
      isFrameNode: true,
    },
    {
      id: 'frame_north',
      label: 'Лунная вершина остова',
      position: { x: 0, y: groundHeightAt(0, -15.6) + 2.35, z: -15.6 },
      zone: 'field',
      isFrameNode: true,
    },
    {
      id: 'frame_core',
      label: 'Сердцевина остова',
      position: { x: 0, y: groundHeightAt(0, -13.5) + 1.55, z: -13.5 },
      zone: 'field',
      isFrameNode: true,
    },
    {
      id: 'grapple_bank',
      label: 'Свисающий сучок над ложиной',
      position: { x: -7.5, y: groundHeightAt(-7.5, 1.5) + 1.9, z: 1.5 },
      zone: 'stump',
      isGrapplePoint: true,
    },
    {
      id: 'anchor_stump',
      label: 'Якорь №1: Старый Пень',
      position: { x: -15.6, y: groundHeightAt(-15.6, 1.5) + 1.65, z: 1.5 },
      zone: 'stump',
      isGreatAnchor: true,
      isGrapplePoint: true,
    },
    {
      id: 'anchor_left_birch',
      label: 'Якорь №2: Корни Левой Берёзы',
      position: { x: -8.6, y: groundHeightAt(-8.6, -12.5) + 1.55, z: -12.5 },
      zone: 'left_birch',
      isGreatAnchor: true,
    },
    {
      id: 'left_birch_brace_b',
      label: 'Распорка бересты',
      position: { x: -9.8, y: groundHeightAt(-9.8, -10.0) + 1.1, z: -10.0 },
      zone: 'left_birch',
    },
    {
      id: 'left_birch_brace_c',
      label: 'Корень у бересты',
      position: { x: -6.8, y: groundHeightAt(-6.8, -10.6) + 1.0, z: -10.6 },
      zone: 'left_birch',
    },
    {
      id: 'anchor_right_birch',
      label: 'Якорь №3: Правая Берёза',
      position: { x: 10.2, y: groundHeightAt(10.2, -11.5) + 1.55, z: -11.5 },
      zone: 'right_birch',
      isGreatAnchor: true,
    },
  ];

  const anchorMeshes = new Map<string, THREE.Mesh>();
  const dewDropGeo = trackGeo(new THREE.SphereGeometry(0.036, 10, 8));
  const budGeo = trackGeo(new THREE.ConeGeometry(0.024, 0.075, 6));
  const anchorShelfGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.06, 0.055, 10));
  const anchorMossCushionGeo = trackGeo(new THREE.SphereGeometry(0.32, 8, 6));

  const anchorBudPlacements: { x: number; y: number; z: number; rx: number; ry: number; rz: number }[] = [];
  const shelfFungiPlacements: { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number }[] = [];
  const mossCushionPlacements: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
  const mergedTwigGeos: THREE.BufferGeometry[] = [];

  anchors.forEach((anchor, idx) => {
    const gy = groundHeightAt(anchor.position.x, anchor.position.z);
    const topPos = new THREE.Vector3(anchor.position.x, anchor.position.y, anchor.position.z);
    const leanX = Math.sin(idx * 2.1) * 0.24;
    const leanZ = Math.cos(idx * 1.7) * 0.24;
    const twigCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(anchor.position.x + leanX * 0.8, gy - 0.08, anchor.position.z + leanZ * 0.8),
      new THREE.Vector3(
        anchor.position.x - leanX * 0.45,
        gy + (anchor.position.y - gy) * 0.55,
        anchor.position.z - leanZ * 0.45,
      ),
      topPos,
    ]);
    mergedTwigGeos.push(
      new THREE.TubeGeometry(twigCurve, 9, anchor.isGreatAnchor ? 0.078 : 0.048, 7, false),
    );

    const forkEnd = new THREE.Vector3(
      anchor.position.x + Math.cos(idx * 1.9) * 0.28,
      anchor.position.y - 0.14,
      anchor.position.z + Math.sin(idx * 1.9) * 0.28,
    );
    const forkMid = topPos.clone().lerp(
      new THREE.Vector3(anchor.position.x, gy + (anchor.position.y - gy) * 0.5, anchor.position.z),
      0.65,
    );
    mergedTwigGeos.push(
      new THREE.TubeGeometry(new THREE.LineCurve3(forkMid, forkEnd), 3, 0.025, 5, false),
    );

    anchorBudPlacements.push(
      { x: forkEnd.x, y: forkEnd.y, z: forkEnd.z, rx: 0.4, ry: idx, rz: 0.4 },
      {
        x: topPos.x - Math.cos(idx * 1.9) * 0.06,
        y: topPos.y + 0.035,
        z: topPos.z - Math.sin(idx * 1.9) * 0.06,
        rx: -0.28,
        ry: idx + 1.4,
        rz: -0.32,
      },
    );

    // Tiny clear nocturnal dewdrop nested inside the twig tip (no artificial spheres or halo flares)
    const dewMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xeef6ff,
        emissive: anchor.isGreatAnchor ? 0x6eaee6 : anchor.isFrameNode ? 0x5288cc : 0x3b679e,
        emissiveIntensity: anchor.isGreatAnchor ? 0.34 : 0.22,
        transparent: true,
        opacity: 0.86,
        roughness: 0.04,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
      }),
    );
    const dewDrop = new THREE.Mesh(dewDropGeo, dewMat);
    dewDrop.scale.set(0.88, 1.32, 0.88);
    dewDrop.position.set(topPos.x, topPos.y - 0.015, topPos.z);
    scene.add(dewDrop);
    anchorMeshes.set(anchor.id, dewDrop);

    if (anchor.isGreatAnchor) {
      mossCushionPlacements.push({
        x: anchor.position.x + leanX * 0.45,
        y: gy + 0.03,
        z: anchor.position.z + leanZ * 0.45,
        sx: 1.25,
        sy: 0.28,
        sz: 1.15,
      });

      for (let f = 0; f < 3; f++) {
        const ang = idx * 1.3 + f * 1.8;
        shelfFungiPlacements.push({
          x: anchor.position.x + Math.cos(ang) * 0.14,
          y: gy + 0.22 + f * 0.14,
          z: anchor.position.z + Math.sin(ang) * 0.14,
          ry: ang,
          sx: 1.15 - f * 0.15,
          sy: 1,
          sz: 0.82,
        });
      }
    }
  });

  // Merge all static anchor twigs & fork shoots into a single batched mesh (34 -> 1 draw call)
  const batchedTwigsMesh = new THREE.Mesh(
    trackGeo(mergeSimpleGeometries(mergedTwigGeos)),
    darkWoodMat,
  );
  batchedTwigsMesh.castShadow = !isSoftwareGl;
  batchedTwigsMesh.receiveShadow = !isSoftwareGl;
  batchedTwigsMesh.matrixAutoUpdate = false;
  scene.add(batchedTwigsMesh);

  const anchorBudInst = new THREE.InstancedMesh(budGeo, stemMat, anchorBudPlacements.length);
  anchorBudPlacements.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(b.rx, b.ry, b.rz);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    anchorBudInst.setMatrixAt(i, dummy.matrix);
  });
  anchorBudInst.computeBoundingSphere();
  scene.add(anchorBudInst);

  // Moonlight-glistening cylindrical spiderwebs at game start (First Field Great Frame + Elder Uspokh's orb cobweb)
  const starterSilkMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xebf5ff,
      emissive: 0x72b6ff,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.78,
      roughness: 0.1,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    }),
  );
  const starterDewMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x99ccff,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.9,
      roughness: 0.04,
      clearcoat: 1.0,
    }),
  );
  const starterStrandGeo = trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 1, 6));
  const starterDewGeo = trackGeo(new THREE.SphereGeometry(0.022, 6, 6));
  const upAxis = new THREE.Vector3(0, 1, 0);

  const buildOrbWebGeometry = (
    cornerPts: THREE.Vector3[],
    ringRatios: number[],
    radius: number,
  ) => {
    const center = new THREE.Vector3();
    cornerPts.forEach((p) => center.add(p));
    center.divideScalar(cornerPts.length);

    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    const dews: THREE.Vector3[] = [];
    for (let i = 0; i < cornerPts.length; i++) {
      const p1 = cornerPts[i];
      const p2 = cornerPts[(i + 1) % cornerPts.length];
      segs.push([p1, p2]); // outer frame
      segs.push([center, p1]); // radial spoke
    }
    ringRatios.forEach((r) => {
      for (let i = 0; i < cornerPts.length; i++) {
        const a = center.clone().lerp(cornerPts[i], r);
        const b = center.clone().lerp(cornerPts[(i + 1) % cornerPts.length], r);
        segs.push([a, b]);
        dews.push(a);
      }
    });

    const strandInst = new THREE.InstancedMesh(starterStrandGeo, starterSilkMat, segs.length);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    segs.forEach(([a, b], i) => {
      dir.subVectors(b, a);
      const len = Math.max(0.001, dir.length());
      mid.addVectors(a, b).multiplyScalar(0.5);
      quat.setFromUnitVectors(upAxis, dir.normalize());
      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.set(radius / 0.011, len, radius / 0.011);
      dummy.updateMatrix();
      strandInst.setMatrixAt(i, dummy.matrix);
    });
    strandInst.computeBoundingSphere();
    scene.add(strandInst);

    const dewInst = new THREE.InstancedMesh(starterDewGeo, starterDewMat, dews.length);
    dummy.quaternion.identity();
    dummy.scale.setScalar(radius / 0.014);
    dews.forEach((d, i) => {
      dummy.position.copy(d);
      dummy.updateMatrix();
      dewInst.setMatrixAt(i, dummy.matrix);
    });
    dewInst.computeBoundingSphere();
    scene.add(dewInst);
  };

  // First Field cylindrical shimmering starter Great Frame
  const framePts = ['frame_west', 'frame_north', 'frame_east'].map((id) => {
    const n = anchors.find((a) => a.id === id)!;
    return new THREE.Vector3(n.position.x, n.position.y, n.position.z);
  });
  buildOrbWebGeometry(framePts, [0.28, 0.56, 0.82], 0.019);

  // Delicate glistening starter cobweb spun under Elder Uspokh's arched root (visible right from the start!)
  buildOrbWebGeometry(
    [
      new THREE.Vector3(-3.0, groundHeightAt(-3.0, 0.72) + 0.78, 0.72),
      new THREE.Vector3(-2.35, groundHeightAt(-2.35, 0.52) + 1.48, 0.52),
      new THREE.Vector3(-1.45, groundHeightAt(-1.45, 0.3) + 0.92, 0.3),
      new THREE.Vector3(-2.15, groundHeightAt(-2.15, 0.48) + 0.42, 0.48),
    ],
    [0.32, 0.64, 0.88],
    0.009,
  );
  dummy.quaternion.identity();

  // Natural mossy monolith stones & pale bracket fungi framing the Great Frame clearing
  const runeStoneGeo = trackGeo(createDisplacedRockGeometry(11.4, 2));
  for (const sx of [-3.6, 3.6]) {
    const sz = -13.5;
    const gy = groundHeightAt(sx, sz);
    const monolith = new THREE.Mesh(runeStoneGeo, nearRockMat);
    monolith.position.set(sx, gy + 0.95, sz);
    monolith.scale.set(0.62, 1.38, 0.56);
    monolith.rotation.y = sx < 0 ? 0.55 : -0.55;
    monolith.castShadow = !isSoftwareGl;
    monolith.receiveShadow = !isSoftwareGl;
    monolith.matrixAutoUpdate = false;
    monolith.updateMatrix();
    scene.add(monolith);

    mossCushionPlacements.push({
      x: sx,
      y: gy + 1.48,
      z: sz,
      sx: 1.42,
      sy: 0.44,
      sz: 1.24,
    });

    for (let f = 0; f < 2; f++) {
      shelfFungiPlacements.push({
        x: sx + (sx < 0 ? 0.32 : -0.32),
        y: gy + 0.72 + f * 0.28,
        z: sz + 0.24,
        ry: sx < 0 ? 0.6 : -0.6,
        sx: 1.2 - f * 0.2,
        sy: 1,
        sz: 0.85,
      });
    }
  }

  const anchorMossInst = new THREE.InstancedMesh(anchorMossCushionGeo, mossPatchMat, mossCushionPlacements.length);
  mossCushionPlacements.forEach((m, i) => {
    dummy.position.set(m.x, m.y, m.z);
    dummy.rotation.set(0, i * 0.9, 0);
    dummy.scale.set(m.sx, m.sy, m.sz);
    dummy.updateMatrix();
    anchorMossInst.setMatrixAt(i, dummy.matrix);
  });
  anchorMossInst.receiveShadow = !isSoftwareGl;
  anchorMossInst.computeBoundingSphere();
  scene.add(anchorMossInst);

  const anchorShelfInst = new THREE.InstancedMesh(anchorShelfGeo, capMat, shelfFungiPlacements.length);
  shelfFungiPlacements.forEach((s, i) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, s.ry, 0);
    dummy.scale.set(s.sx, s.sy, s.sz);
    dummy.updateMatrix();
    anchorShelfInst.setMatrixAt(i, dummy.matrix);
  });
  anchorShelfInst.castShadow = !isSoftwareGl;
  anchorShelfInst.computeBoundingSphere();
  scene.add(anchorShelfInst);

  const sacredFrameLight = new THREE.PointLight(0xd4e8ff, 0.85, 10.5, 2);
  sacredFrameLight.position.set(0, groundHeightAt(0, -13.5) + 2.2, -13.5);
  scene.add(sacredFrameLight);

  const greatFrameGladeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa4cbb2,
      map: textures.mossPatchMap,
      alphaMap: textures.mossPatchAlpha,
      normalMap: textures.mossPatchNormal,
      emissive: 0x5aa392,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.88,
      roughness: 0.92,
      metalness: 0.0,
      depthWrite: false,
    }),
  );
  const greatFrameGlade = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.35, 24)),
    greatFrameGladeMat,
  );
  greatFrameGlade.rotation.x = -Math.PI / 2;
  greatFrameGlade.position.set(0, groundHeightAt(0, -13.5) + 0.03, -13.5);
  scene.add(greatFrameGlade);

  // Volumetric Moonlight Shafts
  const moonBeamsGroup = new THREE.Group();
  const beamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xa6ccff,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.045,
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const beamCoords = [
    [0, -13.5, 4.2],
    [-8.5, -12.0, 3.4],
    [10.2, -11.5, 3.4],
    [-4.8, -5.2, 2.8],
  ];
  beamCoords.forEach(([bx, bz, rad]) => {
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rad * 0.45, rad, 26, 16, 1, true)),
      beamMat,
    );
    shaft.position.set(bx, 12.5, bz);
    shaft.rotation.z = 0.14;
    shaft.rotation.x = -0.18;
    moonBeamsGroup.add(shaft);
  });
  scene.add(moonBeamsGroup);

  const uspokhLeafShadow = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(1.45, 20)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.contactShadowMap,
        transparent: true,
        opacity: 0,
        roughness: 1.0,
        metalness: 0.0,
        envMapIntensity: 0,
        depthWrite: false,
      }),
    ),
  );
  uspokhLeafShadow.rotation.x = -Math.PI / 2;
  uspokhLeafShadow.position.set(-2.35, groundHeightAt(-2.35, 0.52) + 0.04, 0.52);
  scene.add(uspokhLeafShadow);

  // Fallen Autumnal / Nocturnal Leaves & Broken Woodland Twigs on Forest Humus (InstancedMesh)
  const fallenLeafGeo = trackGeo(new THREE.PlaneGeometry(0.28, 0.28, 2, 2));
  const flPos = fallenLeafGeo.attributes.position;
  for (let i = 0; i < flPos.count; i++) {
    const lx = flPos.getX(i);
    const ly = flPos.getY(i);
    flPos.setZ(i, (lx * lx + ly * ly) * 0.55);
  }
  fallenLeafGeo.computeVertexNormals();
  fallenLeafGeo.rotateX(-Math.PI / 2);

  const fallenLeafMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.fallenLeafMap,
      alphaMap: textures.fallenLeafAlpha,
      normalMap: textures.fallenLeafNormal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      alphaTest: 0.45,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const isClearOfProps = (x: number, z: number): boolean => {
    if (groundHeightAt(x, z) < POND_WATER_Y + 0.05) return false;
    if (x > -5.3 && x < 5.7 && z > -1.2 && z < 2.2) return false;
    for (let c = 0; c < colliders.length; c++) {
      const col = colliders[c];
      if (Math.hypot(x - col.x, z - col.z) < col.radius + 0.25) return false;
    }
    return true;
  };

  const fallenLeafCoords: { x: number; z: number; i: number }[] = [];
  for (let i = 0; i < 380; i++) {
    const ang = i * 2.39996 + 1.1;
    const rad = 1.2 + Math.sqrt((i + 0.5) / 380) * 20.5;
    const lx = Math.cos(ang) * rad;
    const lz = Math.sin(ang) * rad - 2.2;
    if (isClearOfProps(lx, lz)) {
      fallenLeafCoords.push({ x: lx, z: lz, i });
    }
  }
  const fallenLeafInstances = new THREE.InstancedMesh(
    fallenLeafGeo,
    fallenLeafMat,
    fallenLeafCoords.length,
  );
  fallenLeafCoords.forEach((leaf, idx) => {
    const ly = groundHeightAt(leaf.x, leaf.z);
    const ls = 0.72 + (leaf.i % 5) * 0.16;
    dummy.position.set(leaf.x, ly + 0.025, leaf.z);
    dummy.rotation.set(((leaf.i % 3) - 1) * 0.12, leaf.i * 1.43, ((leaf.i % 4) - 1.5) * 0.1);
    dummy.scale.set(ls, ls, ls);
    dummy.updateMatrix();
    fallenLeafInstances.setMatrixAt(idx, dummy.matrix);
    colorTint.setHSL(0.08 + (leaf.i % 6) * 0.045, 0.34, 0.55 + (leaf.i % 4) * 0.09);
    fallenLeafInstances.setColorAt(idx, colorTint);
  });
  fallenLeafInstances.computeBoundingSphere();
  if (fallenLeafInstances.instanceColor) fallenLeafInstances.instanceColor.needsUpdate = true;
  scene.add(fallenLeafInstances);

  const floorTwigGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.028, 0.95, 6));
  floorTwigGeo.rotateZ(Math.PI / 2);
  const floorTwigCoords: { x: number; z: number; i: number }[] = [];
  for (let i = 0; i < 110; i++) {
    const ang = i * 2.39996 + 0.3;
    const rad = 1.6 + Math.sqrt((i + 0.5) / 110) * 19.2;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad - 2.0;
    if (isClearOfProps(tx, tz)) {
      floorTwigCoords.push({ x: tx, z: tz, i });
    }
  }
  const floorTwigInst = new THREE.InstancedMesh(floorTwigGeo, darkWoodMat, floorTwigCoords.length);
  floorTwigCoords.forEach((tw, idx) => {
    const ty = groundHeightAt(tw.x, tw.z);
    const ts = 0.65 + (tw.i % 5) * 0.2;
    dummy.position.set(tw.x, ty + 0.02, tw.z);
    dummy.rotation.set(0.06 * Math.sin(tw.i), tw.i * 0.92, 0.08 * Math.cos(tw.i));
    dummy.scale.set(ts, ts * 0.9, ts * 0.9);
    dummy.updateMatrix();
    floorTwigInst.setMatrixAt(idx, dummy.matrix);
  });
  floorTwigInst.computeBoundingSphere();
  scene.add(floorTwigInst);

  // Small mineral pebbles scattered around clearing, boulders, and log base (InstancedMesh)
  const pebbleGeo = trackGeo(createDisplacedRockGeometry(9.2, 1));
  const pebbleCount = 140;
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, rockMat, pebbleCount);
  for (let i = 0; i < pebbleCount; i++) {
    const ang = i * 2.39996 + 0.4;
    const rad = 1.25 + Math.sqrt((i + 0.5) / pebbleCount) * 15.2;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad - 1.5;
    const py = groundHeightAt(px, pz);
    const ps = 0.065 + (i % 5) * 0.025;
    dummy.position.set(px, py + ps * 0.35, pz);
    dummy.rotation.set(i * 0.5, i * 1.1, 0);
    dummy.scale.set(ps * 1.35, ps * 0.65, ps);
    dummy.updateMatrix();
    pebbleInst.setMatrixAt(i, dummy.matrix);
    colorTint.setHSL(0.6, 0.06, 0.72 + (i % 4) * 0.09);
    pebbleInst.setColorAt(i, colorTint);
  }
  pebbleInst.computeBoundingSphere();
  if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
  scene.add(pebbleInst);

  // 12. Living Diverse Woodland Ring + Outer Infinite Horizon Ring (Varied trunks, lean, bark hues & nocturnal teal/green crowns)
  const makeOrganicTrunkGeo = (seed: number, bend: number): THREE.BufferGeometry => {
    const g = new THREE.CylinderGeometry(0.36, 0.98, 25, 11, 8);
    g.translate(0, 12.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const h = vy / 25;
      const swayX = Math.sin(h * Math.PI * 1.4 + seed) * bend;
      const swayZ = Math.cos(h * Math.PI * 1.1 + seed) * bend * 0.7;
      p.setXYZ(i, vx + swayX, vy, vz + swayZ);
    }
    g.computeVertexNormals();
    return g;
  };
  const distantTrunkGeoA = trackGeo(makeOrganicTrunkGeo(0.8, 0.65));
  const distantTrunkGeoB = trackGeo(makeOrganicTrunkGeo(3.4, 0.92));

  const innerTreeCount = 34;
  const outerTreeCount = 46;
  const totalRingTrees = innerTreeCount + outerTreeCount;
  const treeCountA = Math.ceil(totalRingTrees / 2);
  const treeCountB = Math.floor(totalRingTrees / 2);
  const distantTreesA = new THREE.InstancedMesh(distantTrunkGeoA, pineBarkMat, treeCountA);
  const distantTreesB = new THREE.InstancedMesh(distantTrunkGeoB, pineBarkMat, treeCountB);

  const canopyCrownGeo = trackGeo(createCurvedFoliageClusterGeo(4.4));
  const crownsPerTree = 6;
  const distantCrowns = new THREE.InstancedMesh(
    canopyCrownGeo,
    canopyMat,
    totalRingTrees * crownsPerTree,
  );

  let idxA = 0;
  let idxB = 0;
  let crownIdx = 0;
  for (let i = 0; i < totalRingTrees; i++) {
    const isOuter = i >= innerTreeCount;
    const localIdx = isOuter ? i - innerTreeCount : i;
    const ringCount = isOuter ? outerTreeCount : innerTreeCount;
    const ang = (localIdx / ringCount) * Math.PI * 2 + (isOuter ? 0.19 : 0.04);
    const rad = isOuter
      ? 36.5 + ((localIdx * 19) % 21)
      : 24.5 + ((localIdx * 17) % 11);
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    const gy = groundHeightAt(tx, tz);
    const s = (isOuter ? 1.05 : 0.84) + ((i * 7) % 6) * 0.11;
    const syTree = (isOuter ? 1.04 : 0.9) + ((i * 5) % 5) * 0.14;
    const leanX = Math.sin(i * 2.7) * 0.055;
    const leanZ = Math.cos(i * 1.9) * 0.055;

    dummy.position.set(tx, gy - 0.35, tz);
    dummy.rotation.set(leanX, ang + i * 0.4, leanZ);
    dummy.scale.set(s, syTree, s);
    dummy.updateMatrix();

    // Varied bark hues: mossy umber, cool slate-bark, dark ironwood
    colorTint.setHSL(0.08 + (i % 3) * 0.22, 0.14 + (i % 2) * 0.08, 0.62 + (i % 5) * 0.08);
    if (i % 2 === 0) {
      distantTreesA.setMatrixAt(idxA, dummy.matrix);
      distantTreesA.setColorAt(idxA, colorTint);
      idxA++;
    } else {
      distantTreesB.setMatrixAt(idxB, dummy.matrix);
      distantTreesB.setColorAt(idxB, colorTint);
      idxB++;
    }

    if (!isOuter) {
      colliders.push({
        id: `tree_ring_${i}`,
        kind: 'tree',
        x: tx,
        z: tz,
        radius: 0.92 * s,
        topY: gy + 24 * syTree,
        climbable: false,
      });
    }

    for (let c = 0; c < crownsPerTree; c++) {
      const spread = 1.45 - c * 0.12;
      dummy.position.set(
        tx + Math.cos(ang + c * 1.65) * spread,
        gy + (4.6 + c * 2.55) * syTree,
        tz + Math.sin(ang + c * 1.65) * spread,
      );
      dummy.rotation.set(-0.24 + (c % 2) * 0.26, ang + c * 1.15, 0.1);
      const densityScale = (i + c) % 4 === 0 ? 1.24 : 0.92;
      const cs = s * (1.22 - c * 0.1) * densityScale;
      dummy.scale.set(cs, cs, cs);
      dummy.updateMatrix();
      distantCrowns.setMatrixAt(crownIdx, dummy.matrix);
      // Varied forest green & subtle nocturnal blue/teal foliage hues
      colorTint.setHSL(0.35 + ((i + c) % 5) * 0.028, 0.36, 0.56 + ((i + c) % 4) * 0.09);
      distantCrowns.setColorAt(crownIdx, colorTint);
      crownIdx++;
    }
  }
  distantTreesA.computeBoundingSphere();
  distantTreesB.computeBoundingSphere();
  distantCrowns.computeBoundingSphere();
  if (distantTreesA.instanceColor) distantTreesA.instanceColor.needsUpdate = true;
  if (distantTreesB.instanceColor) distantTreesB.instanceColor.needsUpdate = true;
  if (distantCrowns.instanceColor) distantCrowns.instanceColor.needsUpdate = true;
  scene.add(distantTreesA, distantTreesB, distantCrowns);

  // Seamless outer nocturnal forest horizon ring so distant gaps fade organically into deep woods
  const horizonRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(64, 66, 36, 36, 1, true)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x040912,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.BackSide,
      }),
    ),
  );
  horizonRing.position.y = 14;
  scene.add(horizonRing);

  // Drifting Low-Lying Nocturnal Ground Mist Wisps + Green-Firefly-Illuminated Volumetric Pond Mist
  const mistGeo = trackGeo(new THREE.PlaneGeometry(6.8, 2.2));
  const mistMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      map: textures.mistWispMap,
      emissive: 0x7cb0eb,
      emissiveMap: textures.mistWispMap,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.22,
      roughness: 1.0,
      metalness: 0.0,
      envMapIntensity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const mistCount = 16;
  const mistInstances = new THREE.InstancedMesh(mistGeo, mistMat, mistCount);
  for (let i = 0; i < mistCount; i++) {
    const ang = (i / mistCount) * Math.PI * 2 + 0.3;
    const rad = 17.0 + (i % 5) * 2.8;
    const mx = Math.cos(ang) * rad;
    const mz = Math.sin(ang) * rad - 2.0;
    const my = groundHeightAt(mx, mz) + 0.72 + (i % 3) * 0.25;
    dummy.position.set(mx, my, mz);
    dummy.rotation.set(0, ang + Math.PI * 0.5, 0);
    const ms = 0.85 + (i % 4) * 0.28;
    dummy.scale.set(ms, ms * 0.8, 1);
    dummy.updateMatrix();
    mistInstances.setMatrixAt(i, dummy.matrix);
  }
  mistInstances.computeBoundingSphere();
  scene.add(mistInstances);

  // Volumetric nocturnal mist hovering over the left pond, gently illuminated by green fireflies
  const pondMistUniforms = {
    uTime: { value: 0 },
    uFogColor: { value: new THREE.Color(0x070d18) },
    uFogDensity: { value: 0.022 },
    uFireflyPos: { value: pondFireflyPositions },
  };
  const pondMistMat = trackMat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: pondMistUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vViewDist;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 mvPos = viewMatrix * worldPos;
          vViewDist = -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uFireflyPos[3];
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vViewDist;

        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          vec2 uv = vUv;
          float radial = length((uv - 0.5) * vec2(2.0, 2.0));
          float edgeMask = smoothstep(1.0, 0.16, radial);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float angleFade = pow(abs(dot(normalize(vWorldNormal), V)), 1.2);
          float driftA = vnoise(vWorldPos.xz * 0.42 + vec2(uTime * 0.11, uTime * 0.07));
          float driftB = vnoise(vWorldPos.xz * 0.92 - vec2(uTime * 0.16, -uTime * 0.09));
          float density = edgeMask * angleFade * (0.42 + driftA * 0.38 + driftB * 0.2);

          vec3 baseMist = vec3(0.19, 0.34, 0.55);
          vec3 greenGlow = vec3(0.0);
          for (int k = 0; k < 3; k++) {
            float d = length(vWorldPos - uFireflyPos[k]);
            float scatter = exp(-d * 0.54) * (0.68 + driftB * 0.48);
            greenGlow += vec3(0.28, 1.0, 0.46) * scatter;
          }
          vec3 col = baseMist + greenGlow * 0.92;
          float alpha = clamp(density * (0.28 + length(greenGlow) * 0.17), 0.0, 0.58);

          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDist * vViewDist);
          col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    }),
  );
  const pondMistLayers: { x: number; y: number; z: number; sx: number; sz: number; rx: number; ry: number }[] = [
    { x: -10.2, y: POND_WATER_Y + 0.14, z: -0.6, sx: 8.8, sz: 11.6, rx: -Math.PI / 2, ry: 0.1 },
    { x: -10.4, y: POND_WATER_Y + 0.4, z: -0.8, sx: 7.8, sz: 10.2, rx: -Math.PI / 2 + 0.12, ry: 0.48 },
    { x: -9.9, y: POND_WATER_Y + 0.68, z: -1.1, sx: 6.8, sz: 8.8, rx: -Math.PI / 2 - 0.14, ry: -0.35 },
    { x: -10.6, y: POND_WATER_Y + 0.94, z: 0.2, sx: 6.2, sz: 7.8, rx: -Math.PI / 2 + 0.18, ry: 0.85 },
    { x: -9.7, y: POND_WATER_Y + 1.18, z: -1.6, sx: 5.4, sz: 6.8, rx: -Math.PI / 2 - 0.12, ry: -0.7 },
  ];
  const pondMistUnitGeo = trackGeo(new THREE.PlaneGeometry(1, 1));
  pondMistLayers.forEach((layer) => {
    const m = new THREE.Mesh(pondMistUnitGeo, pondMistMat);
    m.position.set(layer.x, layer.y, layer.z);
    m.rotation.set(layer.rx, layer.ry, 0);
    m.scale.set(layer.sx, layer.sz, 1);
    scene.add(m);
  });

  const pondFireflyLight = new THREE.PointLight(0x56ff7c, 2.4, 9.5, 2);
  pondFireflyLight.position.set(-9.8, POND_WATER_Y + 1.05, -1.2);
  scene.add(pondFireflyLight);

  // 13. The Moon & Starfield (PBR emissive moon — zero MeshBasicMaterial)
  const moonMesh = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(5.6, 48)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        map: textures.moonTexture,
        emissive: 0xffffff,
        emissiveMap: textures.moonTexture,
        emissiveIntensity: 1.15,
        transparent: true,
        roughness: 0.9,
        metalness: 0.0,
        envMapIntensity: 0,
        fog: false,
      }),
    ),
  );
  moonMesh.position.set(0, 18.2, -58);
  scene.add(moonMesh);

  const moonHalo = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(24, 24)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        map: textures.softGlowMap,
        emissive: 0x9ec5ff,
        emissiveMap: textures.softGlowMap,
        emissiveIntensity: 1.05,
        transparent: true,
        opacity: 0.52,
        roughness: 1.0,
        metalness: 0.0,
        envMapIntensity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    ),
  );
  moonHalo.position.set(0, 18.2, -58.5);
  scene.add(moonHalo);

  const starCount = 280;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = ((i * 73) % 360) * (Math.PI / 180);
    const phi = 0.15 + (((i * 41) % 100) / 100) * 1.1;
    const r = 78;
    starPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    starPos[i * 3 + 1] = Math.sin(phi) * r + 10;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
  }
  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      trackMat(
        new THREE.PointsMaterial({
          color: 0xddeaff,
          size: 0.35,
          transparent: true,
          opacity: 0.75,
          fog: false,
        }),
      ),
    ),
  );

  // Moon-Willow Overlook Silhouettes framing the distant Moon Fields path beyond the Stump & Birches
  const willowTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.78, 17, 9));
  const willowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbac7d6,
      map: textures.birchBarkMap,
      normalMap: textures.birchBarkNormal,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );
  [
    { x: -21.5, z: -6.8, ry: 0.35, tiltZ: -0.14, scale: 1.08 },
    { x: -19.2, z: -14.2, ry: -0.6, tiltZ: -0.08, scale: 0.94 },
    { x: 16.4, z: -15.8, ry: 0.85, tiltZ: 0.12, scale: 1.02 },
  ].forEach((w) => {
    const wy = groundHeightAt(w.x, w.z);
    const trunk = new THREE.Mesh(willowTrunkGeo, willowMat);
    trunk.position.set(w.x, wy + 7.6 * w.scale, w.z);
    trunk.rotation.set(0.06, w.ry, w.tiltZ);
    trunk.scale.setScalar(w.scale);
    scene.add(trunk);
  });

  // Pooled Volumetric Wind Streaks (28 instanced silk-silver wisps driven by live windStrength)
  const windStreakGeo = trackGeo(new THREE.PlaneGeometry(1.4, 0.032));
  const windStreakMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8ecff,
      emissive: 0x7cbfff,
      emissiveIntensity: 0.78,
      transparent: true,
      opacity: 0.28,
      roughness: 0.4,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const windStreaksInst = new THREE.InstancedMesh(windStreakGeo, windStreakMat, 28);
  windStreaksInst.frustumCulled = false;
  scene.add(windStreaksInst);

  const dynamicRoots = new Set<THREE.Object3D>([
    uspokh.root,
    moonBeamsGroup,
    sacredFrameLight,
    greatFrameGlade,
    moonMesh,
    pantryLight,
    pondFireflyLight,
    uspokhLeafShadow,
    windStreaksInst,
    ...anchorMeshes.values(),
  ]);
  const isDynamicObject = (obj: THREE.Object3D): boolean => {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (dynamicRoots.has(cur)) return true;
      cur = cur.parent;
    }
    return false;
  };
  scene.traverse((obj) => {
    if (obj === scene || isDynamicObject(obj)) return;
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.InstancedMesh ||
      obj instanceof THREE.Points ||
      obj instanceof THREE.Group
    ) {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    }
  });

  return {
    anchors,
    anchorMeshes,
    colliders,
    nettleZones,
    nettleLeafInstances,
    fernInstances,
    grassInstances,
    distantGrassSpritesInst,
    windStreaksInst,
    lodRocks,
    cloverInstances,
    fallenLeafInstances,
    mistInstances,
    pondWaterUniforms,
    pondMistUniforms,
    pondFireflyPositions,
    pondFireflyLight,
    uspokh,
    windTimeUniform,
    windStrengthUniform,
    windEnabledUniform,
    moonBeamsGroup,
    moonBeamMat: beamMat,
    sacredFrameLight,
    greatFrameGlade,
    moonMesh,
    pantryLight,
    uspokhLeafShadow,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}
