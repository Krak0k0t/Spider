import * as THREE from 'three';

export interface ProceduralTextureSet {
  forestFloorMap: THREE.CanvasTexture;
  forestFloorNormal: THREE.CanvasTexture;
  forestFloorRoughness: THREE.CanvasTexture;
  forestFloorAo: THREE.CanvasTexture;
  birchBarkMap: THREE.CanvasTexture;
  birchBarkNormal: THREE.CanvasTexture;
  birchBarkAo: THREE.CanvasTexture;
  pineBarkMap: THREE.CanvasTexture;
  pineBarkNormal: THREE.CanvasTexture;
  pineBarkAo: THREE.CanvasTexture;
  rottingLogMap: THREE.CanvasTexture;
  rottingLogNormal: THREE.CanvasTexture;
  rottingLogAo: THREE.CanvasTexture;
  rockMap: THREE.CanvasTexture;
  rockNormal: THREE.CanvasTexture;
  rockRoughness: THREE.CanvasTexture;
  rockAo: THREE.CanvasTexture;
  mossyRockMap: THREE.CanvasTexture;
  mossyRockNormal: THREE.CanvasTexture;
  mossyRockRoughness: THREE.CanvasTexture;
  chitinMicroScratchMap: THREE.CanvasTexture;
  setaeHairMap: THREE.CanvasTexture;
  rockSpriteMap: THREE.CanvasTexture;
  rockSpriteAlpha: THREE.CanvasTexture;
  mossPatchMap: THREE.CanvasTexture;
  mossPatchAlpha: THREE.CanvasTexture;
  mossPatchNormal: THREE.CanvasTexture;
  lichenMap: THREE.CanvasTexture;
  lichenAlpha: THREE.CanvasTexture;
  lichenNormal: THREE.CanvasTexture;
  fallenLeafMap: THREE.CanvasTexture;
  fallenLeafAlpha: THREE.CanvasTexture;
  fallenLeafNormal: THREE.CanvasTexture;
  mistWispMap: THREE.CanvasTexture;
  runeEmissiveMap: THREE.CanvasTexture;
  grassBladeMap: THREE.CanvasTexture;
  grassBladeAlpha: THREE.CanvasTexture;
  cloverMap: THREE.CanvasTexture;
  cloverAlpha: THREE.CanvasTexture;
  nettleLeafMap: THREE.CanvasTexture;
  nettleLeafNormal: THREE.CanvasTexture;
  nettleLeafAlpha: THREE.CanvasTexture;
  fernLeafMap: THREE.CanvasTexture;
  fernLeafNormal: THREE.CanvasTexture;
  fernLeafAlpha: THREE.CanvasTexture;
  canopyLeafMap: THREE.CanvasTexture;
  canopyLeafAlpha: THREE.CanvasTexture;
  spiderChitinMap: THREE.CanvasTexture;
  spiderChitinNormal: THREE.CanvasTexture;
  uspokhChitinMap: THREE.CanvasTexture;
  spiderLegBandMap: THREE.CanvasTexture;
  spiderLegBandNormal: THREE.CanvasTexture;
  waspScaleMap: THREE.CanvasTexture;
  waspScaleNormal: THREE.CanvasTexture;
  waspWingMap: THREE.CanvasTexture;
  waspWingAlpha: THREE.CanvasTexture;
  flyScaleMap: THREE.CanvasTexture;
  flyScaleNormal: THREE.CanvasTexture;
  compoundEyeNormal: THREE.CanvasTexture;
  flyWingMap: THREE.CanvasTexture;
  flyWingAlpha: THREE.CanvasTexture;
  flightBlurMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  softGlowMap: THREE.CanvasTexture;
  moonCanvas: HTMLCanvasElement;
  moonTexture: THREE.CanvasTexture;
  updateMoonStitch: (restoredAmount: number) => void;
  dispose: () => void;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makePeriodicNoise(gridSize: number, seed: number) {
  const rand = seededRandom(seed);
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rand();
  }
  return (u: number, v: number): number => {
    const x = (((u % 1) + 1) % 1) * gridSize;
    const y = (((v % 1) + 1) % 1) * gridSize;
    const x0 = Math.floor(x) % gridSize;
    const y0 = Math.floor(y) % gridSize;
    const x1 = (x0 + 1) % gridSize;
    const y1 = (y0 + 1) % gridSize;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    // Quintic Perlin smoothing curve for organic interpolation
    const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const n00 = grid[y0 * gridSize + x0];
    const n10 = grid[y0 * gridSize + x1];
    const n01 = grid[y1 * gridSize + x0];
    const n11 = grid[y1 * gridSize + x1];
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };
}

function makeFbm(seed: number, baseFreq = 6) {
  const n1 = makePeriodicNoise(baseFreq, seed);
  const n2 = makePeriodicNoise(baseFreq * 2, seed + 17);
  const n3 = makePeriodicNoise(baseFreq * 4, seed + 53);
  const n4 = makePeriodicNoise(baseFreq * 8, seed + 101);
  return (u: number, v: number): number =>
    n1(u, v) * 0.5 + n2(u, v) * 0.27 + n3(u, v) * 0.15 + n4(u, v) * 0.08;
}

function configureTexture(
  tex: THREE.CanvasTexture,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  clamp = false,
  uvChannel = 0,
): THREE.CanvasTexture {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.channel = uvChannel;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an Ambient Occlusion CanvasTexture from a scalar heightfield (crevices darken naturally).
 */
function buildAoFromHeights(
  heights: Float32Array,
  size: number,
  contrast: number,
  anisotropy: number,
  repeatX: number,
  repeatY: number,
  clamp = false,
): THREE.CanvasTexture {
  const [aoC, ac] = createCanvas(size);
  const aoImg = ac.createImageData(size, size);
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    const ao = Math.max(0.18, Math.min(1.0, 0.42 + h * contrast));
    const v = Math.round(ao * 255);
    const idx = i * 4;
    aoImg.data[idx] = v;
    aoImg.data[idx + 1] = v;
    aoImg.data[idx + 2] = v;
    aoImg.data[idx + 3] = 255;
  }
  ac.putImageData(aoImg, 0, 0);
  return configureTexture(new THREE.CanvasTexture(aoC), false, anisotropy, repeatX, repeatY, clamp, 0);
}

function createCanvas(size: number, height = size): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = height;
  return [c, c.getContext('2d')!];
}

/**
 * Generates a tangent-space normalMap CanvasTexture via Sobel filtering on a scalar heightfield.
 */
function buildNormalFromHeights(
  heights: Float32Array,
  size: number,
  strength: number,
  anisotropy: number,
  repeatX: number,
  repeatY: number,
  clamp = false,
): THREE.CanvasTexture {
  const [normC, nc] = createCanvas(size);
  const nImg = nc.createImageData(size, size);

  const sample = (x: number, y: number): number => {
    const wx = clamp ? Math.max(0, Math.min(size - 1, x)) : ((x % size) + size) % size;
    const wy = clamp ? Math.max(0, Math.min(size - 1, y)) : ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round(((-dx * invLen) * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round(((-dy * invLen) * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round(((dz * invLen) * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nc.putImageData(nImg, 0, 0);
  return configureTexture(new THREE.CanvasTexture(normC), false, anisotropy, repeatX, repeatY, clamp);
}

/**
 * Generates a tangent-space normalMap from an existing grayscale bump/height canvas.
 */
function buildNormalFromCanvas(
  canvas: HTMLCanvasElement,
  strength: number,
  anisotropy: number,
  repeatX: number,
  repeatY: number,
  clamp = false,
): THREE.CanvasTexture {
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, size, size).data;
  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i++) {
    heights[i] = img[i * 4] / 255;
  }
  return buildNormalFromHeights(heights, size, strength, anisotropy, repeatX, repeatY, clamp);
}

export function createProceduralTextures(
  maxAnisotropy: number,
): ProceduralTextureSet {
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, 8));
  const created: THREE.Texture[] = [];
  const microNoise = makePeriodicNoise(96, 409);

  // 1. Forest Floor (512x512) — Perlin FBM humus, moss pockets, fallen leaves, pebbles + Normal & Roughness maps
  const floorSize = 512;
  const [floorColorC, fc] = createCanvas(floorSize);
  const [floorRoughC, fr] = createCanvas(floorSize);
  const floorImg = fc.createImageData(floorSize, floorSize);
  const roughImg = fr.createImageData(floorSize, floorSize);
  const floorHeights = new Float32Array(floorSize * floorSize);

  const fbmSoil = makeFbm(107, 6);
  const fbmMoss = makeFbm(211, 5);
  const fbmPebble = makeFbm(337, 14);
  for (let y = 0; y < floorSize; y++) {
    for (let x = 0; x < floorSize; x++) {
      const u = x / floorSize;
      const v = y / floorSize;
      const idx = (y * floorSize + x) * 4;
      const soil = fbmSoil(u, v);
      const mossRaw = fbmMoss(u + 0.3, v + 0.7);
      const mossMask = Math.max(0, Math.min(1, (mossRaw - 0.46) * 3.8));
      const peb = fbmPebble(u, v);
      const grain = microNoise(u * 2, v * 2);

      const soilR = 26 + soil * 32 + peb * 15 + grain * 10;
      const soilG = 22 + soil * 25 + peb * 13 + grain * 8;
      const soilB = 18 + soil * 18 + peb * 11 + grain * 6;
      const mossR = 24 + grain * 12 + peb * 8;
      const mossG = 53 + soil * 26 + grain * 14;
      const mossB = 26 + grain * 9;

      floorImg.data[idx] = Math.round(soilR + (mossR - soilR) * mossMask);
      floorImg.data[idx + 1] = Math.round(soilG + (mossG - soilG) * mossMask);
      floorImg.data[idx + 2] = Math.round(soilB + (mossB - soilB) * mossMask);
      floorImg.data[idx + 3] = 255;

      floorHeights[y * floorSize + x] =
        soil * 0.48 + peb * 0.25 + mossMask * 0.14 + grain * 0.13;

      const roughVal = Math.max(
        96,
        Math.min(248, Math.round((0.56 + mossMask * 0.34 - (1 - soil) * 0.16 + grain * 0.08) * 255)),
      );
      roughImg.data[idx] = roughVal;
      roughImg.data[idx + 1] = roughVal;
      roughImg.data[idx + 2] = roughVal;
      roughImg.data[idx + 3] = 255;
    }
  }
  fc.putImageData(floorImg, 0, 0);
  fr.putImageData(roughImg, 0, 0);

  const randFloor = seededRandom(881);
  for (let i = 0; i < 1600; i++) {
    const x = randFloor() * floorSize;
    const y = randFloor() * floorSize;
    const len = 3 + randFloor() * 11;
    const ang = randFloor() * Math.PI * 2;
    const kind = randFloor();
    if (kind > 0.78) {
      fc.save();
      fc.translate(x, y);
      fc.rotate(ang);
      fc.fillStyle = randFloor() > 0.5 ? 'rgba(86, 63, 34, 0.58)' : 'rgba(64, 52, 30, 0.5)';
      fc.beginPath();
      fc.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
      fc.fill();
      fc.restore();
      const ix = Math.floor(x) % floorSize;
      const iy = Math.floor(y) % floorSize;
      floorHeights[iy * floorSize + ix] = Math.min(1, floorHeights[iy * floorSize + ix] + 0.18);
    } else {
      fc.strokeStyle =
        kind > 0.38 ? 'rgba(64, 48, 31, 0.56)' : 'rgba(42, 68, 38, 0.48)';
      fc.lineWidth = 1.1;
      fc.beginPath();
      fc.moveTo(x, y);
      fc.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      fc.stroke();
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = randFloor() * floorSize;
    const y = randFloor() * floorSize;
    const pr = 1.2 + randFloor() * 2.4;
    fc.fillStyle = `rgba(${78 + Math.round(randFloor() * 36)}, ${80 + Math.round(randFloor() * 30)}, ${86 + Math.round(randFloor() * 30)}, 0.58)`;
    fc.beginPath();
    fc.arc(x, y, pr, 0, Math.PI * 2);
    fc.fill();
    const ix = Math.floor(x) % floorSize;
    const iy = Math.floor(y) % floorSize;
    floorHeights[iy * floorSize + ix] = Math.min(1, floorHeights[iy * floorSize + ix] + 0.24);
  }

  const forestFloorMap = configureTexture(new THREE.CanvasTexture(floorColorC), true, anisotropy, 48, 48);
  const forestFloorNormal = buildNormalFromHeights(floorHeights, floorSize, 3.1, anisotropy, 48, 48);
  const forestFloorRoughness = configureTexture(new THREE.CanvasTexture(floorRoughC), false, anisotropy, 48, 48);
  const forestFloorAo = buildAoFromHeights(floorHeights, floorSize, 0.78, anisotropy, 48, 48);
  created.push(forestFloorMap, forestFloorNormal, forestFloorRoughness, forestFloorAo);

  // 2. Birch Bark (512x512) + Normal & AO Maps
  const birchSize = 512;
  const [birchColorC, bc] = createCanvas(birchSize);
  const bImg = bc.createImageData(birchSize, birchSize);
  const birchHeights = new Float32Array(birchSize * birchSize);
  const fbmBirch = makeFbm(313, 6);
  const fbmLenticel = makeFbm(619, 10);
  for (let y = 0; y < birchSize; y++) {
    for (let x = 0; x < birchSize; x++) {
      const u = x / birchSize;
      const v = y / birchSize;
      const idx = (y * birchSize + x) * 4;
      const band = fbmBirch(u * 0.45, v * 5.0);
      const streak = fbmLenticel(u * 0.35, v * 14.0);
      const micro = microNoise(u * 3, v * 3);
      const isDarkLenticel = streak > 0.63;
      const shade = isDarkLenticel ? 24 + (1 - streak) * 62 : 162 + band * 62 + micro * 16;
      const warmTint = isDarkLenticel ? 0 : (1 - band) * 18;
      bImg.data[idx] = Math.min(255, Math.round(shade * 0.96 + warmTint * 0.5));
      bImg.data[idx + 1] = Math.min(255, Math.round(shade * 0.98 + warmTint * 0.3));
      bImg.data[idx + 2] = Math.min(255, Math.round(shade * 1.01));
      bImg.data[idx + 3] = 255;

      birchHeights[y * birchSize + x] = isDarkLenticel ? 0.14 : 0.46 + band * 0.42 + micro * 0.12;
    }
  }
  bc.putImageData(bImg, 0, 0);
  const randBirch = seededRandom(319);
  for (let i = 0; i < 180; i++) {
    const lx = randBirch() * birchSize;
    const ly = randBirch() * birchSize;
    const lw = 14 + randBirch() * 44;
    const lh = 2 + randBirch() * 4;
    bc.fillStyle = randBirch() > 0.28 ? 'rgba(26, 23, 20, 0.74)' : 'rgba(65, 86, 56, 0.44)';
    bc.fillRect(lx, ly, lw, lh);
  }
  const birchBarkMap = configureTexture(new THREE.CanvasTexture(birchColorC), true, anisotropy, 2, 4);
  const birchBarkNormal = buildNormalFromHeights(birchHeights, birchSize, 3.2, anisotropy, 2, 4);
  const birchBarkAo = buildAoFromHeights(birchHeights, birchSize, 0.85, anisotropy, 2, 4);
  created.push(birchBarkMap, birchBarkNormal, birchBarkAo);

  // 2b. Pine / Alder Woodland Bark + Normal & AO Maps
  const pineSize = 256;
  const [pineColorC, pc] = createCanvas(pineSize);
  const pImg = pc.createImageData(pineSize, pineSize);
  const pineHeights = new Float32Array(pineSize * pineSize);
  const fbmPine = makeFbm(421, 8);
  for (let y = 0; y < pineSize; y++) {
    for (let x = 0; x < pineSize; x++) {
      const u = x / pineSize;
      const v = y / pineSize;
      const idx = (y * pineSize + x) * 4;
      const plate = fbmPine(u * 4.5, v * 0.7);
      const crevice = plate < 0.44 ? plate * 0.5 : 0.45 + (plate - 0.44) * 0.95;
      pImg.data[idx] = Math.round(28 + crevice * 58);
      pImg.data[idx + 1] = Math.round(23 + crevice * 45);
      pImg.data[idx + 2] = Math.round(20 + crevice * 36);
      pImg.data[idx + 3] = 255;
      pineHeights[y * pineSize + x] = crevice;
    }
  }
  pc.putImageData(pImg, 0, 0);
  const pineBarkMap = configureTexture(new THREE.CanvasTexture(pineColorC), true, anisotropy, 2, 5);
  const pineBarkNormal = buildNormalFromHeights(pineHeights, pineSize, 3.4, anisotropy, 2, 5);
  const pineBarkAo = buildAoFromHeights(pineHeights, pineSize, 0.85, anisotropy, 2, 5);
  created.push(pineBarkMap, pineBarkNormal, pineBarkAo);

  // 3. Rotting Log & Stump Bark (512x512) + Normal & AO Maps
  const logSize = 512;
  const [logColorC, lc] = createCanvas(logSize);
  const lImg = lc.createImageData(logSize, logSize);
  const logHeights = new Float32Array(logSize * logSize);
  const fbmLogFiber = makeFbm(509, 8);
  const fbmLogMoss = makeFbm(911, 5);
  for (let y = 0; y < logSize; y++) {
    for (let x = 0; x < logSize; x++) {
      const u = x / logSize;
      const v = y / logSize;
      const idx = (y * logSize + x) * 4;
      const fiber = fbmLogFiber(u * 0.35, v * 7.5);
      const fine = microNoise(u * 3, v * 12);
      const ridge = Math.pow(fiber, 1.38);
      const barkR = 30 + ridge * 52 + fine * 12;
      const barkG = 23 + ridge * 39 + fine * 9;
      const barkB = 18 + ridge * 28 + fine * 7;
      const mossVal = fbmLogMoss(u * 1.4, v * 1.4);
      const mossMask = Math.max(0, Math.min(1, (mossVal - 0.54) * 4.0));
      const mR = 25 + fine * 14;
      const mG = 58 + ridge * 24 + fine * 16;
      const mB = 28 + fine * 10;
      lImg.data[idx] = Math.round(barkR + (mR - barkR) * mossMask);
      lImg.data[idx + 1] = Math.round(barkG + (mG - barkG) * mossMask);
      lImg.data[idx + 2] = Math.round(barkB + (mB - barkB) * mossMask);
      lImg.data[idx + 3] = 255;
      logHeights[y * logSize + x] = ridge * 0.74 + mossMask * 0.14 + fine * 0.12;
    }
  }
  lc.putImageData(lImg, 0, 0);
  const rottingLogMap = configureTexture(new THREE.CanvasTexture(logColorC), true, anisotropy, 5, 3);
  const rottingLogNormal = buildNormalFromHeights(logHeights, logSize, 3.8, anisotropy, 5, 3);
  const rottingLogAo = buildAoFromHeights(logHeights, logSize, 0.9, anisotropy, 5, 3);
  created.push(rottingLogMap, rottingLogNormal, rottingLogAo);

  // 4. Ancient Fractured Granite & Slate Rock Texture (512x512) + Normal, Roughness & AO Maps
  const rockSize = 512;
  const [rockColorC, rc] = createCanvas(rockSize);
  const [rockRoughC, rr] = createCanvas(rockSize);
  const rImg = rc.createImageData(rockSize, rockSize);
  const rrImg = rr.createImageData(rockSize, rockSize);
  const rockHeights = new Float32Array(rockSize * rockSize);
  const fbmRockMacro = makeFbm(743, 5);
  const fbmRockCrack = makeFbm(859, 9);
  const fbmRockChip = makeFbm(977, 13);
  for (let y = 0; y < rockSize; y++) {
    for (let x = 0; x < rockSize; x++) {
      const u = x / rockSize;
      const v = y / rockSize;
      const idx = (y * rockSize + x) * 4;
      const macro = fbmRockMacro(u, v);
      const crackRaw = Math.abs(fbmRockCrack(u, v) - 0.5) * 2;
      const crackSec = Math.abs(fbmRockChip(u + 0.17, v + 0.33) - 0.5) * 2;
      const fissure = Math.min(
        crackRaw < 0.12 ? crackRaw / 0.12 : 1.0,
        crackSec < 0.08 ? 0.35 + (crackSec / 0.08) * 0.65 : 1.0,
      );
      const chip = fbmRockChip(u, v) > 0.62 ? 0.12 : -0.06;
      const speck = microNoise(u * 6, v * 6);
      const quartz = speck > 0.8 ? 22 : speck < 0.2 ? -22 : 0;

      const base = (48 + macro * 48 + quartz + chip * 24) * (0.34 + 0.66 * fissure);
      const lichenTint = Math.max(0, (macro - 0.58) * 2.4);
      rImg.data[idx] = Math.max(0, Math.min(255, Math.round(base * 0.92 - lichenTint * 8)));
      rImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(base * 0.99 + lichenTint * 18)));
      rImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(base * 1.09 + lichenTint * 7)));
      rImg.data[idx + 3] = 255;

      rockHeights[y * rockSize + x] = Math.max(
        0,
        Math.min(1, (macro * 0.58 + speck * 0.28 + chip + 0.1) * fissure),
      );

      // Wide natural roughness contrast: dusty cracks ~0.95 vs damp slate edges ~0.62
      const roughV = Math.max(
        148,
        Math.min(
          250,
          Math.round(
            (0.76 + (1 - fissure) * 0.22 - (quartz > 0 ? 0.14 : 0) - chip * 0.35) * 255,
          ),
        ),
      );
      rrImg.data[idx] = roughV;
      rrImg.data[idx + 1] = roughV;
      rrImg.data[idx + 2] = roughV;
      rrImg.data[idx + 3] = 255;
    }
  }
  rc.putImageData(rImg, 0, 0);
  rr.putImageData(rrImg, 0, 0);
  const rockMap = configureTexture(new THREE.CanvasTexture(rockColorC), true, anisotropy, 2, 2);
  const rockNormal = buildNormalFromHeights(rockHeights, rockSize, 4.4, anisotropy, 2, 2);
  const rockRoughness = configureTexture(new THREE.CanvasTexture(rockRoughC), false, anisotropy, 2, 2);
  const rockAo = buildAoFromHeights(rockHeights, rockSize, 0.95, anisotropy, 2, 2);
  created.push(rockMap, rockNormal, rockRoughness, rockAo);

  // 4a. Mossy Foreground Stone Texture (Green Noise Moss + Damp Stone Fissures for clearing boulders)
  const [mossRockColorC, mrc] = createCanvas(rockSize);
  const [mossRockRoughC, mrr] = createCanvas(rockSize);
  const mrImg = mrc.createImageData(rockSize, rockSize);
  const mrrImg = mrr.createImageData(rockSize, rockSize);
  const mossRockHeights = new Float32Array(rockSize * rockSize);
  const fbmStoneMossBroad = makeFbm(1123, 5);
  const fbmStoneMossTuft = makeFbm(1279, 14);
  for (let y = 0; y < rockSize; y++) {
    for (let x = 0; x < rockSize; x++) {
      const u = x / rockSize;
      const v = y / rockSize;
      const idx = (y * rockSize + x) * 4;
      const stoneH = rockHeights[y * rockSize + x];
      const broadMoss = fbmStoneMossBroad(u, v);
      const tuftMoss = fbmStoneMossTuft(u + 0.13, v + 0.29);
      const fine = microNoise(u * 7, v * 7);
      // Green noise spreads in pockets, denser along crevices and damp patches
      const pocketDrive = broadMoss * 0.62 + tuftMoss * 0.38 + (1 - stoneH) * 0.18;
      const mossMask = Math.max(0, Math.min(1, (pocketDrive - 0.52) * 3.6));
      const lushness = tuftMoss * 0.65 + fine * 0.35;

      const mossR = 24 + lushness * 26 + fine * 10;
      const mossG = 66 + lushness * 48 + fine * 18;
      const mossB = 28 + lushness * 20 + fine * 8;

      mrImg.data[idx] = Math.round(rImg.data[idx] + (mossR - rImg.data[idx]) * mossMask);
      mrImg.data[idx + 1] = Math.round(rImg.data[idx + 1] + (mossG - rImg.data[idx + 1]) * mossMask);
      mrImg.data[idx + 2] = Math.round(rImg.data[idx + 2] + (mossB - rImg.data[idx + 2]) * mossMask);
      mrImg.data[idx + 3] = 255;

      mossRockHeights[y * rockSize + x] = Math.min(
        1,
        stoneH * (1 - mossMask * 0.25) + mossMask * (0.28 + lushness * 0.24),
      );
      const roughMoss = Math.round((0.92 + fine * 0.06) * 255);
      const roughStone = rrImg.data[idx];
      const rMix = Math.round(roughStone + (roughMoss - roughStone) * mossMask);
      mrrImg.data[idx] = rMix;
      mrrImg.data[idx + 1] = rMix;
      mrrImg.data[idx + 2] = rMix;
      mrrImg.data[idx + 3] = 255;
    }
  }
  mrc.putImageData(mrImg, 0, 0);
  mrr.putImageData(mrrImg, 0, 0);
  // Extra fine green organic moss speckles baked over the stone face
  const randMossSpeck = seededRandom(1447);
  for (let i = 0; i < 900; i++) {
    const mx = randMossSpeck() * rockSize;
    const my = randMossSpeck() * rockSize;
    const u = mx / rockSize;
    const v = my / rockSize;
    if (fbmStoneMossBroad(u, v) > 0.48) {
      const r = 1.0 + randMossSpeck() * 2.8;
      mrc.fillStyle =
        randMossSpeck() > 0.35
          ? `rgba(${34 + Math.round(randMossSpeck() * 26)}, ${86 + Math.round(randMossSpeck() * 44)}, ${36 + Math.round(randMossSpeck() * 22)}, 0.55)`
          : 'rgba(108, 134, 64, 0.45)';
      mrc.beginPath();
      mrc.arc(mx, my, r, 0, Math.PI * 2);
      mrc.fill();
    }
  }
  const mossyRockMap = configureTexture(new THREE.CanvasTexture(mossRockColorC), true, anisotropy, 2, 2);
  const mossyRockNormal = buildNormalFromHeights(mossRockHeights, rockSize, 4.6, anisotropy, 2, 2);
  const mossyRockRoughness = configureTexture(new THREE.CanvasTexture(mossRockRoughC), false, anisotropy, 2, 2);
  created.push(mossyRockMap, mossyRockNormal, mossyRockRoughness);

  // 4c. Procedural Chitin Micro-Scratch RoughnessMap & Sensory Setae Hair Sprite
  const scratchSize = 256;
  const [scratchC, scc] = createCanvas(scratchSize);
  const scratchImg = scc.createImageData(scratchSize, scratchSize);
  const fbmChitinWear = makeFbm(1607, 9);
  for (let y = 0; y < scratchSize; y++) {
    for (let x = 0; x < scratchSize; x++) {
      const u = x / scratchSize;
      const v = y / scratchSize;
      const idx = (y * scratchSize + x) * 4;
      const wear = fbmChitinWear(u, v);
      const val = Math.round((0.28 + wear * 0.34) * 255);
      scratchImg.data[idx] = val;
      scratchImg.data[idx + 1] = val;
      scratchImg.data[idx + 2] = val;
      scratchImg.data[idx + 3] = 255;
    }
  }
  scc.putImageData(scratchImg, 0, 0);
  const randScratch = seededRandom(1777);
  for (let i = 0; i < 520; i++) {
    const sx = randScratch() * scratchSize;
    const sy = randScratch() * scratchSize;
    const len = 4 + randScratch() * 18;
    const ang = (randScratch() - 0.5) * 1.1 + 0.45;
    scc.strokeStyle =
      randScratch() > 0.25 ? 'rgba(220, 220, 220, 0.34)' : 'rgba(248, 248, 248, 0.5)';
    scc.lineWidth = 0.6 + randScratch() * 0.9;
    scc.beginPath();
    scc.moveTo(sx, sy);
    scc.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    scc.stroke();
  }
  const chitinMicroScratchMap = configureTexture(new THREE.CanvasTexture(scratchC), false, anisotropy, 2, 2);
  created.push(chitinMicroScratchMap);

  const [hairC, hc] = createCanvas(64);
  hc.clearRect(0, 0, 64, 64);
  const hGrad = hc.createRadialGradient(32, 34, 2, 32, 32, 28);
  hGrad.addColorStop(0, 'rgba(235, 244, 255, 0.95)');
  hGrad.addColorStop(0.35, 'rgba(195, 218, 248, 0.45)');
  hGrad.addColorStop(1, 'rgba(170, 196, 232, 0)');
  hc.fillStyle = hGrad;
  hc.beginPath();
  hc.arc(32, 32, 28, 0, Math.PI * 2);
  hc.fill();
  hc.strokeStyle = 'rgba(245, 250, 255, 0.85)';
  hc.lineCap = 'round';
  hc.lineWidth = 2.0;
  for (let k = -2; k <= 2; k++) {
    hc.beginPath();
    hc.moveTo(32 + k * 4, 48);
    hc.quadraticCurveTo(32 + k * 7, 28, 32 + k * 10, 8 + Math.abs(k) * 3);
    hc.stroke();
  }
  const setaeHairMap = configureTexture(new THREE.CanvasTexture(hairC), true, anisotropy, 1, 1, true);
  created.push(setaeHairMap);

  // 4b. Distant Fractured Boulder Billboard Sprite (for Aggressive Rock LOD Level 2)
  const [rsColorC, rsc] = createCanvas(128);
  const [rsAlphaC, rsa] = createCanvas(128);
  rsc.clearRect(0, 0, 128, 128);
  rsa.fillStyle = '#000000';
  rsa.fillRect(0, 0, 128, 128);
  const traceBoulderSilhouette = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(14, 112);
    ctx.lineTo(10, 74);
    ctx.lineTo(28, 36);
    ctx.lineTo(62, 20);
    ctx.lineTo(98, 34);
    ctx.lineTo(116, 68);
    ctx.lineTo(114, 112);
    ctx.closePath();
  };
  traceBoulderSilhouette(rsa);
  rsa.fillStyle = '#ffffff';
  rsa.fill();

  rsc.save();
  traceBoulderSilhouette(rsc);
  rsc.clip();
  const rGrad = rsc.createLinearGradient(24, 18, 108, 112);
  rGrad.addColorStop(0, '#5a6875');
  rGrad.addColorStop(0.55, '#3b454e');
  rGrad.addColorStop(1, '#20262b');
  rsc.fillStyle = rGrad;
  rsc.fillRect(0, 0, 128, 128);
  // Subtle moss cap on upper boulder crest
  rsc.fillStyle = 'rgba(42, 74, 45, 0.72)';
  rsc.beginPath();
  rsc.ellipse(64, 30, 38, 14, -0.1, 0, Math.PI * 2);
  rsc.fill();
  rsc.restore();

  const rockSpriteMap = configureTexture(new THREE.CanvasTexture(rsColorC), true, anisotropy, 1, 1, true);
  const rockSpriteAlpha = configureTexture(new THREE.CanvasTexture(rsAlphaC), false, anisotropy, 1, 1, true);
  created.push(rockSpriteMap, rockSpriteAlpha);

  // 5. Multi-Hue Volumetric Moss Patch (Layered Emerald/Chartreuse/Teal Greens + Feathered Bryophyte Alpha + NormalMap)
  const mossSize = 256;
  const [mossColorC, mc] = createCanvas(mossSize);
  const [mossAlphaC, ma] = createCanvas(mossSize);
  const mossHeights = new Float32Array(mossSize * mossSize);
  const mImg = mc.createImageData(mossSize, mossSize);
  const maImg = ma.createImageData(mossSize, mossSize);
  const fbmMossShape = makeFbm(614, 5);
  const fbmMossDetail = makeFbm(629, 14);
  const fbmMossTeal = makeFbm(701, 7);
  for (let y = 0; y < mossSize; y++) {
    for (let x = 0; x < mossSize; x++) {
      const u = x / mossSize;
      const v = y / mossSize;
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      const radial = Math.sqrt(dx * dx + dy * dy);
      const shapeNoise = fbmMossShape(u, v);
      const fine = fbmMossDetail(u, v);
      const tealShift = fbmMossTeal(u, v);
      const edgeMask = Math.max(
        0,
        Math.min(1, (0.94 - radial + (shapeNoise - 0.42) * 0.78 + (fine - 0.5) * 0.24) * 3.1),
      );
      const idx = (y * mossSize + x) * 4;

      const tipGlow = Math.pow(fine, 1.35);
      const baseR = 16 + tipGlow * 42 + shapeNoise * 16 - tealShift * 8;
      const baseG = 38 + tipGlow * 74 + shapeNoise * 28;
      const baseB = 20 + tipGlow * 26 + tealShift * 34;

      mImg.data[idx] = Math.max(0, Math.min(255, Math.round(baseR)));
      mImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(baseG)));
      mImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(baseB)));
      mImg.data[idx + 3] = 255;

      const aVal = Math.round(edgeMask * 255);
      maImg.data[idx] = aVal;
      maImg.data[idx + 1] = aVal;
      maImg.data[idx + 2] = aVal;
      maImg.data[idx + 3] = 255;

      mossHeights[y * mossSize + x] = (fine * 0.68 + shapeNoise * 0.32) * edgeMask;
    }
  }
  mc.putImageData(mImg, 0, 0);
  ma.putImageData(maImg, 0, 0);
  const randMoss = seededRandom(612);
  for (let i = 0; i < 1200; i++) {
    const mx = 22 + randMoss() * (mossSize - 44);
    const my = 22 + randMoss() * (mossSize - 44);
    const tone = randMoss();
    const g = 55 + Math.round(randMoss() * 72);
    mc.fillStyle =
      tone > 0.66
        ? `rgba(${Math.round(g * 0.38)}, ${g}, ${Math.round(g * 0.62)}, 0.42)`
        : tone > 0.3
          ? `rgba(${Math.round(g * 0.52)}, ${g}, ${Math.round(g * 0.38)}, 0.45)`
          : `rgba(12, 28, 18, 0.48)`;
    mc.fillRect(mx, my, 2, 2);
  }
  const mossPatchMap = configureTexture(new THREE.CanvasTexture(mossColorC), true, anisotropy, 1, 1, true);
  const mossPatchAlpha = configureTexture(new THREE.CanvasTexture(mossAlphaC), false, anisotropy, 1, 1, true);
  const mossPatchNormal = buildNormalFromHeights(mossHeights, mossSize, 3.6, anisotropy, 1, 1, true);
  created.push(mossPatchMap, mossPatchAlpha, mossPatchNormal);

  // 5b. Fallen Autumnal / Nocturnal Leaf Cutout + Veins NormalMap
  const fLeafSize = 128;
  const [fLeafC, falC] = createCanvas(fLeafSize);
  const [fLeafAlphaC, falA] = createCanvas(fLeafSize);
  const [fLeafBumpC, falB] = createCanvas(fLeafSize);
  falC.clearRect(0, 0, fLeafSize, fLeafSize);
  falA.fillStyle = '#000000';
  falA.fillRect(0, 0, fLeafSize, fLeafSize);
  falB.fillStyle = '#505050';
  falB.fillRect(0, 0, fLeafSize, fLeafSize);

  const drawFallenLeafShape = (ctx: CanvasRenderingContext2D, fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.bezierCurveTo(92, 28, 108, 62, 92, 96);
    ctx.bezierCurveTo(80, 112, 68, 116, 64, 118);
    ctx.bezierCurveTo(60, 116, 48, 112, 36, 96);
    ctx.bezierCurveTo(20, 62, 36, 28, 64, 14);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const flGrad = falC.createLinearGradient(28, 18, 98, 114);
  flGrad.addColorStop(0, '#785a3a');
  flGrad.addColorStop(0.55, '#594732');
  flGrad.addColorStop(1, '#363b2d');
  drawFallenLeafShape(falC, flGrad);
  drawFallenLeafShape(falA, '#ffffff');
  drawFallenLeafShape(falB, '#8c8c8c');

  // Serrated margin notches + decay spots
  const randFL = seededRandom(481);
  for (let i = 0; i < 40; i++) {
    const px = 34 + randFL() * 60;
    const py = 24 + randFL() * 86;
    falC.fillStyle = randFL() > 0.45 ? 'rgba(28, 22, 16, 0.42)' : 'rgba(130, 96, 54, 0.34)';
    falC.beginPath();
    falC.arc(px, py, 2 + randFL() * 4.5, 0, Math.PI * 2);
    falC.fill();
  }
  falC.strokeStyle = 'rgba(42, 30, 18, 0.72)';
  falC.lineWidth = 2;
  falC.beginPath();
  falC.moveTo(64, 118);
  falC.lineTo(64, 22);
  falB.strokeStyle = '#ececec';
  falB.lineWidth = 2.6;
  falB.beginPath();
  falB.moveTo(64, 118);
  falB.lineTo(64, 22);
  for (let v = 0; v < 5; v++) {
    const vy = 96 - v * 15;
    falC.moveTo(64, vy);
    falC.lineTo(42, vy - 12);
    falC.moveTo(64, vy);
    falC.lineTo(86, vy - 12);
    falB.moveTo(64, vy);
    falB.lineTo(42, vy - 12);
    falB.moveTo(64, vy);
    falB.lineTo(86, vy - 12);
  }
  falC.stroke();
  falB.stroke();

  const fallenLeafMap = configureTexture(new THREE.CanvasTexture(fLeafC), true, anisotropy, 1, 1, true);
  const fallenLeafAlpha = configureTexture(new THREE.CanvasTexture(fLeafAlphaC), false, anisotropy, 1, 1, true);
  const fallenLeafNormal = buildNormalFromCanvas(fLeafBumpC, 2.2, anisotropy, 1, 1, true);
  created.push(fallenLeafMap, fallenLeafAlpha, fallenLeafNormal);

  // 5c. Nocturnal Ground Mist Wisp Map (Soft Organic Cloud Gradient)
  const mistSize = 128;
  const [mistC, mistCtx] = createCanvas(mistSize);
  const mistImg = mistCtx.createImageData(mistSize, mistSize);
  const fbmMist = makeFbm(733, 4);
  for (let y = 0; y < mistSize; y++) {
    for (let x = 0; x < mistSize; x++) {
      const u = x / mistSize;
      const v = y / mistSize;
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const n = fbmMist(u, v);
      const falloff = Math.max(0, 1 - dist * 1.15);
      const alpha = Math.pow(falloff, 2.2) * (0.42 + n * 0.58);
      const idx = (y * mistSize + x) * 4;
      mistImg.data[idx] = 175;
      mistImg.data[idx + 1] = 208;
      mistImg.data[idx + 2] = 242;
      mistImg.data[idx + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
    }
  }
  mistCtx.putImageData(mistImg, 0, 0);
  const mistWispMap = configureTexture(new THREE.CanvasTexture(mistC), true, anisotropy, 1, 1, true);
  created.push(mistWispMap);

  // 5d. Sacred Weaver Rune Emissive Map (White-Gold Great Frame Sigils)
  const runeSize = 256;
  const [runeC, runec] = createCanvas(runeSize);
  runec.fillStyle = '#000000';
  runec.fillRect(0, 0, runeSize, runeSize);
  runec.strokeStyle = '#ffd98a';
  runec.lineCap = 'round';
  runec.shadowColor = '#fff4d2';
  runec.shadowBlur = 10;
  runec.lineWidth = 4;
  runec.beginPath();
  runec.arc(128, 128, 72, 0, Math.PI * 2);
  runec.stroke();
  runec.lineWidth = 2.4;
  runec.beginPath();
  runec.arc(128, 128, 44, 0, Math.PI * 2);
  runec.stroke();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    runec.beginPath();
    runec.moveTo(128 + Math.cos(ang) * 24, 128 + Math.sin(ang) * 24);
    runec.lineTo(128 + Math.cos(ang) * 84, 128 + Math.sin(ang) * 84);
    runec.stroke();
  }
  runec.fillStyle = '#fff9e6';
  runec.beginPath();
  runec.arc(128, 128, 9, 0, Math.PI * 2);
  runec.fill();
  const runeEmissiveMap = configureTexture(new THREE.CanvasTexture(runeC), true, anisotropy, 1, 1, true);
  created.push(runeEmissiveMap);

  // 6. Foliose / Crustose Lichen Rosette Cutout + Normal Map (Plane Overlays)
  const lichSize = 256;
  const [lichColorC, lcc] = createCanvas(lichSize);
  const [lichAlphaC, lca] = createCanvas(lichSize);
  const [lichBumpC, lcb] = createCanvas(lichSize);
  lcc.clearRect(0, 0, lichSize, lichSize);
  lca.fillStyle = '#000000';
  lca.fillRect(0, 0, lichSize, lichSize);
  lcb.fillStyle = '#202020';
  lcb.fillRect(0, 0, lichSize, lichSize);
  const randLich = seededRandom(551);
  const drawLichenRosette = (cx: number, cy: number, maxR: number, lobes: number) => {
    for (let l = 0; l < lobes; l++) {
      const ang = (l / lobes) * Math.PI * 2 + (randLich() - 0.5) * 0.25;
      const dist = maxR * (0.35 + randLich() * 0.55);
      const lx = cx + Math.cos(ang) * dist;
      const ly = cy + Math.sin(ang) * dist;
      const lr = maxR * (0.24 + randLich() * 0.2);

      const grad = lcc.createRadialGradient(lx, ly, 1, lx, ly, lr);
      grad.addColorStop(0, '#5a7060');
      grad.addColorStop(0.65, '#8ca892');
      grad.addColorStop(1, '#bdd6c4');
      lcc.fillStyle = grad;
      lcc.beginPath();
      lcc.arc(lx, ly, lr, 0, Math.PI * 2);
      lcc.fill();

      lca.fillStyle = '#ffffff';
      lca.beginPath();
      lca.arc(lx, ly, lr, 0, Math.PI * 2);
      lca.fill();

      lcb.fillStyle = '#d4d4d4';
      lcb.beginPath();
      lcb.arc(lx, ly, lr * 0.9, 0, Math.PI * 2);
      lcb.fill();
    }
    for (let s = 0; s < 5; s++) {
      const ang = randLich() * Math.PI * 2;
      const d = randLich() * maxR * 0.35;
      lcc.fillStyle = 'rgba(184, 152, 92, 0.72)';
      lcc.beginPath();
      lcc.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 3.5, 0, Math.PI * 2);
      lcc.fill();
    }
  };
  drawLichenRosette(128, 128, 72, 16);
  drawLichenRosette(72, 94, 40, 11);
  drawLichenRosette(184, 156, 42, 11);
  const lichenMap = configureTexture(new THREE.CanvasTexture(lichColorC), true, anisotropy, 1, 1, true);
  const lichenAlpha = configureTexture(new THREE.CanvasTexture(lichAlphaC), false, anisotropy, 1, 1, true);
  const lichenNormal = buildNormalFromCanvas(lichBumpC, 2.2, anisotropy, 1, 1, true);
  created.push(lichenMap, lichenAlpha, lichenNormal);

  // 7. Botanical Woodland Grass Tuft Spray Texture (Rich dark-root to moonlit-tip gradient + alpha cutout)
  const [grassC, grc] = createCanvas(128, 256);
  const [grassAlphaC, gra] = createCanvas(128, 256);
  grc.clearRect(0, 0, 128, 256);
  gra.fillStyle = '#000000';
  gra.fillRect(0, 0, 128, 256);

  const blades = [
    { x0: 42, x1: 14, h: 205, w: 10, mid: '#2f5835', tip: '#7cb06f' },
    { x0: 54, x1: 36, h: 242, w: 11, mid: '#3b6a3f', tip: '#8ec27e' },
    { x0: 66, x1: 68, h: 250, w: 12, mid: '#457848', tip: '#99cd88' },
    { x0: 76, x1: 96, h: 232, w: 11, mid: '#38653d', tip: '#85b877' },
    { x0: 88, x1: 114, h: 192, w: 10, mid: '#2d5433', tip: '#76a869' },
  ];
  blades.forEach((b) => {
    const grad = grc.createLinearGradient(0, 256, 0, 256 - b.h);
    grad.addColorStop(0, '#0d1a0f');
    grad.addColorStop(0.22, '#1a331e');
    grad.addColorStop(0.62, b.mid);
    grad.addColorStop(1, b.tip);

    const drawBlade = (ctx: CanvasRenderingContext2D, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(b.x0 - b.w * 0.5, 256);
      ctx.quadraticCurveTo((b.x0 + b.x1) * 0.5 - b.w * 0.25, 256 - b.h * 0.55, b.x1, 256 - b.h);
      ctx.quadraticCurveTo((b.x0 + b.x1) * 0.5 + b.w * 0.25, 256 - b.h * 0.55, b.x0 + b.w * 0.5, 256);
      ctx.closePath();
      ctx.fill();
    };
    drawBlade(grc, grad);
    drawBlade(gra, '#ffffff');

    grc.strokeStyle = 'rgba(186, 224, 170, 0.35)';
    grc.lineWidth = 1;
    grc.beginPath();
    grc.moveTo(b.x0, 254);
    grc.quadraticCurveTo((b.x0 + b.x1) * 0.5, 256 - b.h * 0.55, b.x1, 256 - b.h + 4);
    grc.stroke();
  });
  const grassBladeMap = configureTexture(new THREE.CanvasTexture(grassC), true, anisotropy, 1, 1, true);
  const grassBladeAlpha = configureTexture(new THREE.CanvasTexture(grassAlphaC), false, anisotropy, 1, 1, true);
  created.push(grassBladeMap, grassBladeAlpha);

  // 8. Wood-Sorrel / Clover Cluster Texture
  const [cloverC, clc] = createCanvas(256);
  const [cloverAlphaC, cla] = createCanvas(256);
  clc.clearRect(0, 0, 256, 256);
  cla.fillStyle = '#000000';
  cla.fillRect(0, 0, 256, 256);
  const cloverLeaves = [
    { cx: 128, cy: 76, rot: 0, s: 1.0 },
    { cx: 74, cy: 146, rot: -1.9, s: 0.96 },
    { cx: 182, cy: 146, rot: 1.9, s: 0.96 },
  ];
  cloverLeaves.forEach((lf) => {
    const drawHeartLeaflet = (ctx: CanvasRenderingContext2D, isAlpha: boolean) => {
      ctx.save();
      ctx.translate(lf.cx, lf.cy);
      ctx.rotate(lf.rot);
      ctx.scale(lf.s, lf.s);
      ctx.beginPath();
      ctx.moveTo(0, 38);
      ctx.bezierCurveTo(-48, 22, -52, -32, -16, -34);
      ctx.quadraticCurveTo(0, -14, 16, -34);
      ctx.bezierCurveTo(52, -32, 48, 22, 0, 38);
      ctx.closePath();
      if (isAlpha) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        const g = ctx.createRadialGradient(0, 12, 4, 0, 0, 48);
        g.addColorStop(0, '#2a5533');
        g.addColorStop(0.75, '#437c4d');
        g.addColorStop(1, '#26492d');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(178, 220, 175, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 14, 19, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();
      }
      ctx.restore();
    };
    drawHeartLeaflet(clc, false);
    drawHeartLeaflet(cla, true);
  });
  const cloverMap = configureTexture(new THREE.CanvasTexture(cloverC), true, anisotropy, 1, 1, true);
  const cloverAlpha = configureTexture(new THREE.CanvasTexture(cloverAlphaC), false, anisotropy, 1, 1, true);
  created.push(cloverMap, cloverAlpha);

  // 9. Finely Ragged, Deeply Serrated Stinging Nettle Leaf + NormalMap + Alpha
  const leafSize = 256;
  const [leafColorC, nlc] = createCanvas(leafSize);
  const [leafBumpC, nlb] = createCanvas(leafSize);
  const [leafAlphaC, nla] = createCanvas(leafSize);
  nlc.clearRect(0, 0, leafSize, leafSize);
  nlb.fillStyle = '#7c7c7c';
  nlb.fillRect(0, 0, leafSize, leafSize);
  nla.fillStyle = '#000000';
  nla.fillRect(0, 0, leafSize, leafSize);

  const traceNettleOutline = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(128, 248);
    const teeth: [number, number][] = [
      [158, 232], [148, 218], [186, 200], [164, 186], [202, 166],
      [172, 152], [206, 132], [174, 118], [198, 98], [168, 86],
      [184, 66], [156, 56], [164, 38], [142, 32], [128, 8],
      [114, 32], [92, 38], [100, 56], [72, 66], [88, 86],
      [58, 98], [82, 118], [50, 132], [84, 152], [54, 166],
      [92, 186], [70, 200], [108, 218], [98, 232],
    ];
    for (const [px, py] of teeth) {
      ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  traceNettleOutline(nla);
  nla.fillStyle = '#ffffff';
  nla.fill();

  nlc.save();
  traceNettleOutline(nlc);
  nlc.clip();
  const leafGrad = nlc.createLinearGradient(0, 8, 0, leafSize);
  leafGrad.addColorStop(0, '#44784d');
  leafGrad.addColorStop(0.5, '#2b5535');
  leafGrad.addColorStop(1, '#162f1d');
  nlc.fillStyle = leafGrad;
  nlc.fillRect(0, 0, leafSize, leafSize);

  const randLeaf = seededRandom(433);
  for (let i = 0; i < 1400; i++) {
    const lx = randLeaf() * leafSize;
    const ly = randLeaf() * leafSize;
    nlc.fillStyle = randLeaf() > 0.48 ? 'rgba(98, 148, 102, 0.2)' : 'rgba(12, 26, 16, 0.22)';
    nlc.fillRect(lx, ly, 2, 2);
  }
  nlc.strokeStyle = 'rgba(146, 198, 148, 0.56)';
  nlc.lineWidth = 2.6;
  nlc.beginPath();
  nlc.moveTo(128, 10);
  nlc.lineTo(128, 248);
  nlc.stroke();

  nlb.strokeStyle = 'rgba(242, 242, 242, 0.92)';
  nlb.lineWidth = 3.6;
  nlb.beginPath();
  nlb.moveTo(128, 10);
  nlb.lineTo(128, 248);
  nlb.stroke();
  for (let i = 1; i <= 8; i++) {
    const y = (i / 9) * leafSize;
    nlc.lineWidth = 1.4;
    nlc.beginPath();
    nlc.moveTo(128, y);
    nlc.quadraticCurveTo(164, y - 9, 200, y - 24);
    nlc.moveTo(128, y);
    nlc.quadraticCurveTo(92, y - 9, 56, y - 24);
    nlc.stroke();

    nlb.lineWidth = 2.0;
    nlb.beginPath();
    nlb.moveTo(128, y);
    nlb.quadraticCurveTo(164, y - 9, 200, y - 24);
    nlb.moveTo(128, y);
    nlb.quadraticCurveTo(92, y - 9, 56, y - 24);
    nlb.stroke();
  }
  nlc.restore();

  const nettleLeafMap = configureTexture(new THREE.CanvasTexture(leafColorC), true, anisotropy, 1, 1, true);
  const nettleLeafNormal = buildNormalFromCanvas(leafBumpC, 2.5, anisotropy, 1, 1, true);
  const nettleLeafAlpha = configureTexture(new THREE.CanvasTexture(leafAlphaC), false, anisotropy, 1, 1, true);
  created.push(nettleLeafMap, nettleLeafNormal, nettleLeafAlpha);

  // 10. Doubly-Pinnate Feathery Woodland Fern Frond + NormalMap + Crisp Alpha
  const [fernC, flc] = createCanvas(256);
  const [fernBumpC, flb] = createCanvas(256);
  const [fernAlphaC, fla] = createCanvas(256);
  flc.clearRect(0, 0, 256, 256);
  flb.fillStyle = '#404040';
  flb.fillRect(0, 0, 256, 256);
  fla.fillStyle = '#000000';
  fla.fillRect(0, 0, 256, 256);

  const drawFernStem = (ctx: CanvasRenderingContext2D, col: string, w: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(128, 252);
    ctx.quadraticCurveTo(126, 130, 128, 10);
    ctx.stroke();
  };
  drawFernStem(flc, '#345e3a', 4);
  drawFernStem(flb, '#e8e8e8', 4.5);
  drawFernStem(fla, '#ffffff', 4);

  for (let p = 0; p < 24; p++) {
    const t = p / 23;
    const y = 240 - t * 220;
    const reach = Math.sin(Math.pow(1 - t, 0.68) * Math.PI * 0.88) * 98 + 8;
    const subLobes = Math.max(3, Math.round(reach / 11));
    for (const s of [-1, 1] as const) {
      // Fine central vein of pinna
      const endX = 128 + s * reach;
      const endY = y - 10 - t * 6;
      const drawPinnaSpine = (ctx: CanvasRenderingContext2D, col: string) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(128, y);
        ctx.quadraticCurveTo(128 + s * reach * 0.55, y - 5, endX, endY);
        ctx.stroke();
      };
      drawPinnaSpine(flc, '#497d4f');
      drawPinnaSpine(flb, '#d2d2d2');
      drawPinnaSpine(fla, '#ffffff');

      // Individually toothed sub-pinnules so fern edges look serrated & organic
      for (let sub = 0; sub < subLobes; sub++) {
        const u = (sub + 0.45) / subLobes;
        const bx = 128 + s * reach * u;
        const by = y - 5 * Math.sin(u * Math.PI) - u * (10 + t * 6);
        const lobeLen = (1 - u * 0.68) * (7.5 - t * 2.5);
        const lobeW = (1 - u * 0.55) * 3.1;
        const drawLobe = (ctx: CanvasRenderingContext2D, fill: string) => {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(bx - s * lobeW, by);
          ctx.quadraticCurveTo(bx + s * 1.5, by - lobeLen, bx + s * lobeW * 0.6, by - lobeLen * 0.85);
          ctx.quadraticCurveTo(bx + s * lobeW, by + 2.5, bx - s * lobeW, by);
          ctx.closePath();
          ctx.fill();
        };
        const greenLight = 74 + Math.round(t * 38 + (sub % 2) * 10);
        drawLobe(
          flc,
          `rgb(${Math.round(greenLight * 0.44)}, ${greenLight}, ${Math.round(greenLight * 0.5)})`,
        );
        drawLobe(flb, '#c4c4c4');
        drawLobe(fla, '#ffffff');
      }
    }
  }
  const fernLeafMap = configureTexture(new THREE.CanvasTexture(fernC), true, anisotropy, 1, 1, true);
  const fernLeafNormal = buildNormalFromCanvas(fernBumpC, 2.2, anisotropy, 1, 1, true);
  const fernLeafAlpha = configureTexture(new THREE.CanvasTexture(fernAlphaC), false, anisotropy, 1, 1, true);
  created.push(fernLeafMap, fernLeafNormal, fernLeafAlpha);

  // 11. Delicate Birch/Alder Woodland Foliage Spray Texture (Fine Twigs + Small Serrated Leaves, Airy Gaps)
  const [canC, cac] = createCanvas(256);
  const [canAlphaC, caa] = createCanvas(256);
  cac.clearRect(0, 0, 256, 256);
  caa.fillStyle = '#000000';
  caa.fillRect(0, 0, 256, 256);

  // Fine dark woody twiglets radiating through cluster
  const randCan = seededRandom(903);
  const drawBranch = (ctx: CanvasRenderingContext2D, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(128, 242);
    ctx.quadraticCurveTo(126, 148, 128, 42);
    ctx.stroke();
    for (let b = 0; b < 7; b++) {
      const side = b % 2 === 0 ? 1 : -1;
      const startY = 212 - b * 24;
      const tipX = 128 + side * (46 + ((b * 19) % 42));
      const tipY = startY - 36 - ((b * 13) % 24);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(128, startY);
      ctx.quadraticCurveTo(128 + side * 24, startY - 12, tipX, tipY);
      ctx.stroke();
    }
  };
  drawBranch(cac, '#2b241d');
  drawBranch(caa, '#ffffff');

  const drawBirchLeaf = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rot: number,
    len: number,
    wid: number,
    fill: string,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(-len * 0.45, -wid * 0.72);
    ctx.lineTo(-len * 0.25, -wid * 0.55);
    ctx.lineTo(0, -wid);
    ctx.lineTo(len * 0.35, -wid * 0.78);
    ctx.lineTo(len * 0.5, -wid * 0.52);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.5, wid * 0.52);
    ctx.lineTo(len * 0.35, wid * 0.78);
    ctx.lineTo(0, wid);
    ctx.lineTo(-len * 0.25, wid * 0.55);
    ctx.lineTo(-len * 0.45, wid * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  for (let i = 0; i < 240; i++) {
    const ang = (i / 240) * Math.PI * 2 + randCan() * 0.45;
    const dist = 12 + Math.pow(randCan(), 0.72) * 98;
    const lx = 128 + Math.cos(ang) * dist;
    const ly = 124 + Math.sin(ang) * dist * 0.92;
    const len = 4.6 + randCan() * 5.2;
    const wid = 2.2 + randCan() * 2.6;
    const rot = ang + (randCan() - 0.5) * 0.9;
    const tone = randCan();
    const fill =
      tone > 0.65 ? '#3b6844' : tone > 0.3 ? '#2c5034' : '#203b26';
    drawBirchLeaf(cac, lx, ly, rot, len, wid, fill);
    drawBirchLeaf(caa, lx, ly, rot, len, wid, '#ffffff');
  }
  const canopyLeafMap = configureTexture(new THREE.CanvasTexture(canC), true, anisotropy, 1, 1, true);
  const canopyLeafAlpha = configureTexture(new THREE.CanvasTexture(canAlphaC), false, anisotropy, 1, 1, true);
  created.push(canopyLeafMap, canopyLeafAlpha);

  // 12. Spider Textures + Normal Map (512x512 High-Detail Chitin, Oak-Leaf Folia Chevrons, Sigilla & Pores)
  const makeSpiderTexture = (isElder: boolean) => {
    const spSize = 512;
    const [spColorC, spc] = createCanvas(spSize);
    const [spBumpC, spb] = createCanvas(spSize);
    const fbmSpider = makeFbm(isElder ? 997 : 991, 9);
    const fbmFine = makeFbm(isElder ? 983 : 977, 18);
    const spImg = spc.createImageData(spSize, spSize);
    const spBImg = spb.createImageData(spSize, spSize);
    const sigillaPts: [number, number][] = [
      [0.43, 0.35], [0.57, 0.35],
      [0.41, 0.50], [0.59, 0.50],
      [0.44, 0.65], [0.56, 0.65],
    ];
    for (let y = 0; y < spSize; y++) {
      for (let x = 0; x < spSize; x++) {
        const u = x / spSize;
        const v = y / spSize;
        const idx = (y * spSize + x) * 4;
        const n = fbmSpider(u, v);
        const nf = fbmFine(u, v);
        const micro = Math.sin(u * 165 + n * 7) * Math.cos(v * 165) * 0.045;
        // Intricate oak-leaf orb-weaver dorsal folium + silver-moonlight cross & chevron filigree
        const du = Math.abs(u - 0.5);
        const oakWave = 0.14 + 0.045 * Math.sin(v * Math.PI * 10);
        const foliumMask = Math.exp(-Math.pow((du / oakWave), 2) * 1.4);
        const chevron =
          Math.exp(-Math.pow(du * 4.4, 2)) *
          (0.5 + 0.5 * Math.sin(v * Math.PI * 12 - du * 24));
        const crossSpeck =
          Math.exp(-Math.pow((du - 0.06) * 28, 2)) *
          Math.exp(-Math.pow((v - 0.44) * 16, 2));
        const foliaEdge =
          Math.exp(-Math.pow((du - oakWave) * 22, 2)) *
          Math.max(0, 0.6 + 0.4 * Math.sin(v * Math.PI * 12));
        const highlight =
          Math.max(0, chevron - 0.44) * 2.15 +
          foliaEdge * 0.52 +
          crossSpeck * 0.65 +
          foliumMask * 0.14;
        const warmFlank = Math.max(0, 1 - foliumMask) * (0.35 + nf * 0.65);

        // Recessed dorsal sigilla muscle-attachment pits
        let sigillaPit = 0;
        for (const [su, sv] of sigillaPts) {
          const d2 = (u - su) * (u - su) + (v - sv) * (v - sv);
          if (d2 < 0.00055) {
            sigillaPit += 1 - d2 / 0.00055;
          }
        }

        if (isElder) {
          spImg.data[idx] = Math.max(12, Math.min(255, Math.round(54 + n * 44 + highlight * 112 - sigillaPit * 28)));
          spImg.data[idx + 1] = Math.max(14, Math.min(255, Math.round(60 + n * 44 + highlight * 116 - sigillaPit * 28)));
          spImg.data[idx + 2] = Math.max(18, Math.min(255, Math.round(74 + n * 52 + highlight * 128 - sigillaPit * 24)));
        } else {
          spImg.data[idx] = Math.max(10, Math.min(255, Math.round(28 + n * 30 + warmFlank * 24 + highlight * 96 - sigillaPit * 22)));
          spImg.data[idx + 1] = Math.max(11, Math.min(255, Math.round(31 + n * 28 + warmFlank * 16 + highlight * 94 - sigillaPit * 22)));
          spImg.data[idx + 2] = Math.max(16, Math.min(255, Math.round(45 + n * 34 + warmFlank * 8 + highlight * 122 - sigillaPit * 18)));
        }
        spImg.data[idx + 3] = 255;

        const bv = Math.max(20, Math.min(255, Math.round(92 + (n + micro) * 124 + highlight * 38 - sigillaPit * 66)));
        spBImg.data[idx] = bv;
        spBImg.data[idx + 1] = bv;
        spBImg.data[idx + 2] = bv;
        spBImg.data[idx + 3] = 255;
      }
    }
    spc.putImageData(spImg, 0, 0);
    spb.putImageData(spBImg, 0, 0);
    const randSp = seededRandom(isElder ? 521 : 515);
    for (let i = 0; i < 2800; i++) {
      const sx = randSp() * spSize;
      const sy = randSp() * spSize;
      const len = 4 + randSp() * 13;
      spc.strokeStyle = isElder
        ? 'rgba(218, 232, 248, 0.3)'
        : randSp() > 0.3
          ? 'rgba(154, 178, 218, 0.28)'
          : 'rgba(14, 15, 22, 0.46)';
      spc.lineWidth = 1.05;
      spc.beginPath();
      spc.moveTo(sx, sy);
      spc.lineTo(sx + (randSp() - 0.5) * 3.0, sy + len);
      spc.stroke();

      spb.strokeStyle = 'rgba(242, 244, 248, 0.42)';
      spb.lineWidth = 0.95;
      spb.beginPath();
      spb.moveTo(sx, sy);
      spb.lineTo(sx + (randSp() - 0.5) * 1.3, sy + len);
      spb.stroke();
    }
    return {
      colorTex: configureTexture(new THREE.CanvasTexture(spColorC), true, anisotropy, 1, 1),
      normalTex: buildNormalFromCanvas(spBumpC, 2.45, anisotropy, 1, 1),
    };
  };
  const pavutinTex = makeSpiderTexture(false);
  const uspokhTex = makeSpiderTexture(true);
  const spiderChitinMap = pavutinTex.colorTex;
  const spiderChitinNormal = pavutinTex.normalTex;
  const uspokhChitinMap = uspokhTex.colorTex;

  // 12b. Annular Ringed Spider Leg Chitin Map + Ribbed Normal (256x256)
  const legSize = 256;
  const [legC, lgc] = createCanvas(legSize);
  const [legBumpC, lgb] = createCanvas(legSize);
  const fbmLeg = makeFbm(967, 10);
  const legImg = lgc.createImageData(legSize, legSize);
  const legBImg = lgb.createImageData(legSize, legSize);
  for (let y = 0; y < legSize; y++) {
    for (let x = 0; x < legSize; x++) {
      const u = x / legSize;
      const v = y / legSize;
      const idx = (y * legSize + x) * 4;
      const n = fbmLeg(u, v);
      // Dark chitinous annulations along leg length (v) + subtle longitudinal ridges along u
      const ringWave = 0.5 + 0.5 * Math.sin(v * Math.PI * 6 + n * 0.9);
      const isDarkBand = Math.pow(ringWave, 2.4);
      const longRib = Math.sin(u * Math.PI * 24) * 0.14;
      const baseR = 96 - isDarkBand * 62 + n * 28;
      const baseG = 72 - isDarkBand * 44 + n * 22;
      const baseB = 56 - isDarkBand * 28 + n * 20;
      legImg.data[idx] = Math.max(14, Math.min(255, Math.round(baseR)));
      legImg.data[idx + 1] = Math.max(12, Math.min(255, Math.round(baseG)));
      legImg.data[idx + 2] = Math.max(14, Math.min(255, Math.round(baseB)));
      legImg.data[idx + 3] = 255;

      const bh = Math.max(20, Math.min(255, Math.round(120 + n * 76 + longRib * 50 - isDarkBand * 36)));
      legBImg.data[idx] = bh;
      legBImg.data[idx + 1] = bh;
      legBImg.data[idx + 2] = bh;
      legBImg.data[idx + 3] = 255;
    }
  }
  lgc.putImageData(legImg, 0, 0);
  lgb.putImageData(legBImg, 0, 0);
  const spiderLegBandMap = configureTexture(new THREE.CanvasTexture(legC), true, anisotropy, 1, 1);
  const spiderLegBandNormal = buildNormalFromCanvas(legBumpC, 1.9, anisotropy, 1, 1);

  created.push(
    spiderChitinMap,
    spiderChitinNormal,
    uspokhChitinMap,
    uspokhTex.normalTex,
    spiderLegBandMap,
    spiderLegBandNormal,
  );

  // 13. Wasp Scales + Normal Map
  const wSize = 256;
  const [wScaleC, wsc] = createCanvas(wSize);
  const [wScaleBumpC, wsb] = createCanvas(wSize);
  wsc.fillStyle = '#181410';
  wsc.fillRect(0, 0, wSize, wSize);
  wsb.fillStyle = '#606060';
  wsb.fillRect(0, 0, wSize, wSize);
  const cellR = 11;
  for (let row = 0; row < wSize / cellR + 2; row++) {
    for (let col = 0; col < wSize / cellR + 2; col++) {
      const cx = col * cellR + (row % 2 === 0 ? 0 : cellR * 0.5);
      const cy = row * (cellR * 0.85);
      const amberBand = row % 6 < 3;
      wsc.fillStyle = amberBand
        ? row % 6 === 1
          ? '#ebb02e'
          : '#c87e16'
        : '#1e1915';
      wsc.beginPath();
      wsc.arc(cx, cy, cellR * 0.62, 0, Math.PI, false);
      wsc.fill();
      wsc.strokeStyle = 'rgba(10, 8, 6, 0.55)';
      wsc.lineWidth = 1.2;
      wsc.stroke();

      wsb.fillStyle = '#d4d4d4';
      wsb.beginPath();
      wsb.arc(cx, cy, cellR * 0.58, 0, Math.PI, false);
      wsb.fill();
      wsb.strokeStyle = '#303030';
      wsb.lineWidth = 1.5;
      wsb.stroke();
    }
  }
  const waspScaleMap = configureTexture(new THREE.CanvasTexture(wScaleC), true, anisotropy, 2, 2);
  const waspScaleNormal = buildNormalFromCanvas(wScaleBumpC, 2.4, anisotropy, 2, 2);
  created.push(waspScaleMap, waspScaleNormal);

  // 14. Wasp Wing Membrane + Venation
  const wwSize = 256;
  const [wWingC, wwc] = createCanvas(wwSize);
  const [wWingAlphaC, wwa] = createCanvas(wwSize);
  wwc.clearRect(0, 0, wwSize, wwSize);
  wwa.fillStyle = '#000000';
  wwa.fillRect(0, 0, wwSize, wwSize);

  const drawWaspWingMask = (ctx: CanvasRenderingContext2D, fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(12, 130);
    ctx.bezierCurveTo(60, 48, 170, 32, 248, 86);
    ctx.bezierCurveTo(234, 155, 162, 206, 82, 188);
    ctx.bezierCurveTo(42, 178, 18, 156, 12, 130);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const wWingGrad = wwc.createLinearGradient(0, 50, 250, 190);
  wWingGrad.addColorStop(0, 'rgba(255, 224, 165, 0.7)');
  wWingGrad.addColorStop(0.5, 'rgba(205, 228, 255, 0.48)');
  wWingGrad.addColorStop(1, 'rgba(182, 212, 255, 0.3)');
  drawWaspWingMask(wwc, wWingGrad);
  drawWaspWingMask(wwa, '#cfcfcf');

  const randWW = seededRandom(702);
  for (let i = 0; i < 260; i++) {
    const px = 28 + randWW() * 205;
    const py = 60 + randWW() * 115;
    wwc.fillStyle =
      randWW() > 0.5 ? 'rgba(255, 226, 170, 0.28)' : 'rgba(155, 215, 255, 0.26)';
    wwc.beginPath();
    wwc.arc(px, py, 2.2, 0, Math.PI * 2);
    wwc.fill();
  }

  const drawWaspVeins = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(14, 130);
    ctx.bezierCurveTo(72, 54, 168, 38, 245, 86);
    ctx.stroke();

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(14, 130);
    ctx.bezierCurveTo(85, 112, 150, 96, 232, 98);
    ctx.moveTo(14, 132);
    ctx.bezierCurveTo(75, 140, 132, 150, 194, 138);
    ctx.moveTo(18, 136);
    ctx.bezierCurveTo(60, 165, 110, 182, 148, 174);
    ctx.stroke();

    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(92, 68);
    ctx.lineTo(104, 145);
    ctx.moveTo(144, 58);
    ctx.lineTo(146, 142);
    ctx.moveTo(188, 66);
    ctx.lineTo(180, 132);
    ctx.moveTo(122, 118);
    ctx.lineTo(116, 174);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(178, 56, 16, 6, 0.08, 0, Math.PI * 2);
    ctx.fill();
  };
  drawWaspVeins(wwc, 'rgba(38, 22, 8, 0.92)');
  drawWaspVeins(wwa, '#ffffff');
  const waspWingMap = configureTexture(new THREE.CanvasTexture(wWingC), true, anisotropy, 1, 1, true);
  const waspWingAlpha = configureTexture(new THREE.CanvasTexture(wWingAlphaC), false, anisotropy, 1, 1, true);
  created.push(waspWingMap, waspWingAlpha);

  // 15. Fly Scales & Faceted Compound Eye NormalMap
  const fsSize = 256;
  const [flyScaleC, fsc] = createCanvas(fsSize);
  const [flyScaleBumpC, fsb] = createCanvas(fsSize);
  fsc.fillStyle = '#2d4742';
  fsc.fillRect(0, 0, fsSize, fsSize);
  fsb.fillStyle = '#505050';
  fsb.fillRect(0, 0, fsSize, fsSize);

  const scaleStep = 10;
  for (let row = 0; row < fsSize / scaleStep + 2; row++) {
    for (let col = 0; col < fsSize / scaleStep + 2; col++) {
      const sx = col * scaleStep + (row % 2 === 0 ? 0 : scaleStep * 0.5);
      const sy = row * (scaleStep * 0.85);
      const hueShift = ((row * 7 + col * 11) % 30) - 15;
      fsc.fillStyle = `hsl(${165 + hueShift}, 40%, ${30 + ((row + col) % 4) * 6}%)`;
      fsc.beginPath();
      fsc.arc(sx, sy, scaleStep * 0.58, 0, Math.PI * 2);
      fsc.fill();
      fsc.strokeStyle = 'rgba(10, 18, 22, 0.45)';
      fsc.lineWidth = 1;
      fsc.stroke();

      fsb.fillStyle = '#dcdcdc';
      fsb.beginPath();
      fsb.arc(sx, sy, scaleStep * 0.5, 0, Math.PI * 2);
      fsb.fill();
    }
  }
  const flyScaleMap = configureTexture(new THREE.CanvasTexture(flyScaleC), true, anisotropy, 2, 2);
  const flyScaleNormal = buildNormalFromCanvas(flyScaleBumpC, 2.2, anisotropy, 2, 2);
  created.push(flyScaleMap, flyScaleNormal);

  const [eyeC, ec] = createCanvas(128);
  ec.fillStyle = '#202020';
  ec.fillRect(0, 0, 128, 128);
  const hexR = 6;
  for (let r = 0; r < 26; r++) {
    for (let c = 0; c < 24; c++) {
      const hx = c * hexR + (r % 2 === 0 ? 0 : hexR * 0.5);
      const hy = r * (hexR * 0.86);
      const grad = ec.createRadialGradient(hx, hy, 0.5, hx, hy, hexR * 0.48);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#303030');
      ec.fillStyle = grad;
      ec.beginPath();
      ec.arc(hx, hy, hexR * 0.48, 0, Math.PI * 2);
      ec.fill();
    }
  }
  const compoundEyeNormal = buildNormalFromCanvas(eyeC, 2.6, anisotropy, 2, 2);
  created.push(compoundEyeNormal);

  // 16. Fly Wing Venation + Translucent Membrane
  const [fWingC, fwc] = createCanvas(256);
  const [fWingAlphaC, fwa] = createCanvas(256);
  fwc.clearRect(0, 0, 256, 256);
  fwa.fillStyle = '#000000';
  fwa.fillRect(0, 0, 256, 256);

  const drawFlyWingShape = (ctx: CanvasRenderingContext2D, fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(10, 134);
    ctx.bezierCurveTo(64, 56, 178, 44, 246, 108);
    ctx.bezierCurveTo(234, 176, 146, 212, 62, 184);
    ctx.bezierCurveTo(28, 172, 14, 152, 10, 134);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const fWingGrad = fwc.createLinearGradient(10, 60, 240, 190);
  fWingGrad.addColorStop(0, 'rgba(225, 246, 255, 0.82)');
  fWingGrad.addColorStop(0.5, 'rgba(202, 255, 236, 0.66)');
  fWingGrad.addColorStop(1, 'rgba(235, 224, 255, 0.54)');
  drawFlyWingShape(fwc, fWingGrad);
  drawFlyWingShape(fwa, '#cfcfcf');

  const randFW = seededRandom(818);
  for (let i = 0; i < 200; i++) {
    const px = 26 + randFW() * 204;
    const py = 72 + randFW() * 108;
    fwc.fillStyle = randFW() > 0.5 ? 'rgba(180, 255, 232, 0.45)' : 'rgba(215, 234, 255, 0.48)';
    fwc.fillRect(px, py, 3, 2);
  }

  const drawFlyVeins = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(12, 134);
    ctx.bezierCurveTo(70, 58, 178, 46, 244, 108);
    ctx.stroke();

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(14, 134);
    ctx.bezierCurveTo(85, 104, 158, 92, 232, 118);
    ctx.moveTo(14, 136);
    ctx.bezierCurveTo(80, 138, 148, 146, 210, 148);
    ctx.moveTo(16, 138);
    ctx.bezierCurveTo(66, 166, 118, 184, 166, 174);
    ctx.stroke();

    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(96, 84);
    ctx.lineTo(106, 142);
    ctx.moveTo(156, 76);
    ctx.lineTo(148, 146);
    ctx.moveTo(132, 128);
    ctx.lineTo(126, 174);
    ctx.stroke();
  };
  drawFlyVeins(fwc, 'rgba(192, 228, 255, 0.94)');
  drawFlyVeins(fwa, '#ffffff');

  const flyWingMap = configureTexture(new THREE.CanvasTexture(fWingC), true, anisotropy, 1, 1, true);
  const flyWingAlpha = configureTexture(new THREE.CanvasTexture(fWingAlphaC), false, anisotropy, 1, 1, true);
  created.push(flyWingMap, flyWingAlpha);

  // 17. Wing Motion Blur Fan Texture
  const [blurC, blc] = createCanvas(128);
  const blGrad = blc.createRadialGradient(12, 64, 8, 56, 64, 90);
  blGrad.addColorStop(0, 'rgba(220, 240, 255, 0.42)');
  blGrad.addColorStop(0.55, 'rgba(188, 224, 255, 0.22)');
  blGrad.addColorStop(1, 'rgba(180, 215, 255, 0)');
  blc.fillStyle = blGrad;
  blc.beginPath();
  blc.moveTo(8, 64);
  blc.arc(8, 64, 112, -0.68, 0.68);
  blc.closePath();
  blc.fill();
  blc.strokeStyle = 'rgba(240, 248, 255, 0.25)';
  blc.lineWidth = 1.2;
  for (let a = -0.5; a <= 0.5; a += 0.16) {
    blc.beginPath();
    blc.arc(8, 64, 48 + Math.abs(a) * 60, a - 0.12, a + 0.12);
    blc.stroke();
  }
  const flightBlurMap = configureTexture(new THREE.CanvasTexture(blurC), true, anisotropy, 1, 1, true);
  created.push(flightBlurMap);

  // 18. Contact Shadow & Glow Sprite
  const [shadowC, sc] = createCanvas(128);
  const sg = sc.createRadialGradient(64, 64, 4, 64, 64, 62);
  sg.addColorStop(0, 'rgba(3, 6, 12, 0.88)');
  sg.addColorStop(0.55, 'rgba(3, 6, 12, 0.42)');
  sg.addColorStop(1, 'rgba(3, 6, 12, 0)');
  sc.fillStyle = sg;
  sc.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowC);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  created.push(contactShadowMap);

  const [glowC, gc] = createCanvas(128);
  gc.clearRect(0, 0, 128, 128);
  const gg = gc.createRadialGradient(64, 64, 2, 64, 64, 61);
  gg.addColorStop(0, 'rgba(240, 248, 255, 1)');
  gg.addColorStop(0.28, 'rgba(170, 215, 255, 0.58)');
  gg.addColorStop(0.62, 'rgba(95, 150, 235, 0.18)');
  gg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  gc.fillStyle = gg;
  gc.fillRect(0, 0, 128, 128);
  const softGlowMap = new THREE.CanvasTexture(glowC);
  softGlowMap.colorSpace = THREE.SRGBColorSpace;
  created.push(softGlowMap);

  // 19. Dynamic Moon Surface
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 512;
  moonCanvas.height = 512;
  const moonTexture = new THREE.CanvasTexture(moonCanvas);
  moonTexture.colorSpace = THREE.SRGBColorSpace;
  created.push(moonTexture);

  let lastStitchState = -1;
  const updateMoonStitch = (restoredAmount: number) => {
    const quantized = Math.round(restoredAmount * 20) / 20;
    if (quantized === lastStitchState) return;
    lastStitchState = quantized;

    const ctx = moonCanvas.getContext('2d')!;
    const cx = 256;
    const cy = 256;
    const r = 248;
    ctx.clearRect(0, 0, 512, 512);

    const baseGrad = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, r);
    const brightness = 0.45 + quantized * 0.55;
    const c1 = Math.round(220 * brightness + 35);
    const c2 = Math.round(230 * brightness + 25);
    const c3 = Math.round(248 * brightness + 7);
    baseGrad.addColorStop(0, `rgb(${c1}, ${c2}, ${c3})`);
    baseGrad.addColorStop(
      0.75,
      `rgb(${Math.round(c1 * 0.78)}, ${Math.round(c2 * 0.84)}, ${Math.round(c3 * 0.94)})`,
    );
    baseGrad.addColorStop(1, 'rgb(40, 52, 74)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 512);

    const randMoon = seededRandom(777);
    for (let i = 0; i < 48; i++) {
      const mx = cx + (randMoon() - 0.5) * 340;
      const my = cy + (randMoon() - 0.5) * 340;
      const mr = 10 + randMoon() * 44;
      ctx.fillStyle = `rgba(38, 52, 78, ${0.1 + randMoon() * 0.14})`;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowAlpha = Math.max(0, 1 - quantized);
    if (shadowAlpha > 0.02) {
      ctx.fillStyle = `rgba(6, 8, 14, ${shadowAlpha * 0.78})`;
      ctx.beginPath();
      ctx.ellipse(
        cx + 12,
        cy - 8,
        150 * shadowAlpha + 18,
        220 * shadowAlpha + 12,
        -0.38,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.strokeStyle = `rgba(3, 4, 8, ${shadowAlpha * 0.95})`;
      ctx.lineWidth = 6 * shadowAlpha + 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(40, cy + i * 52);
        ctx.bezierCurveTo(
          160,
          cy + i * 32 - 38,
          340,
          cy + i * 40 + 36,
          472,
          cy + i * 48,
        );
        ctx.stroke();
      }
    }

    if (quantized > 0.15) {
      ctx.strokeStyle = `rgba(218, 240, 255, ${quantized * 0.48})`;
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        ctx.stroke();
      }
    }
    ctx.restore();
    moonTexture.needsUpdate = true;
  };

  updateMoonStitch(0.35);

  return {
    forestFloorMap,
    forestFloorNormal,
    forestFloorRoughness,
    forestFloorAo,
    birchBarkMap,
    birchBarkNormal,
    birchBarkAo,
    pineBarkMap,
    pineBarkNormal,
    pineBarkAo,
    rottingLogMap,
    rottingLogNormal,
    rottingLogAo,
    rockMap,
    rockNormal,
    rockRoughness,
    rockAo,
    mossyRockMap,
    mossyRockNormal,
    mossyRockRoughness,
    chitinMicroScratchMap,
    setaeHairMap,
    rockSpriteMap,
    rockSpriteAlpha,
    mossPatchMap,
    mossPatchAlpha,
    mossPatchNormal,
    lichenMap,
    lichenAlpha,
    lichenNormal,
    fallenLeafMap,
    fallenLeafAlpha,
    fallenLeafNormal,
    mistWispMap,
    runeEmissiveMap,
    grassBladeMap,
    grassBladeAlpha,
    cloverMap,
    cloverAlpha,
    nettleLeafMap,
    nettleLeafNormal,
    nettleLeafAlpha,
    fernLeafMap,
    fernLeafNormal,
    fernLeafAlpha,
    canopyLeafMap,
    canopyLeafAlpha,
    spiderChitinMap,
    spiderChitinNormal,
    uspokhChitinMap,
    spiderLegBandMap,
    spiderLegBandNormal,
    waspScaleMap,
    waspScaleNormal,
    waspWingMap,
    waspWingAlpha,
    flyScaleMap,
    flyScaleNormal,
    compoundEyeNormal,
    flyWingMap,
    flyWingAlpha,
    flightBlurMap,
    contactShadowMap,
    softGlowMap,
    moonCanvas,
    moonTexture,
    updateMoonStitch,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
