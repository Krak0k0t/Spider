import * as THREE from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SoundEngine } from './audio';
import {
  createFlyModel,
  createForestWorld,
  createKhryazhSyakayaModel,
  createPavutinModel,
  type FlyRig,
  type ForestWorldHandle,
  type PavutinRig,
  type WaspRig,
} from './models';
import {
  canBearingStrandHold,
  checkGreatPatternComplete,
  classifyPattern,
  computeAerialCatchReward,
  computeCombatStanceBlend,
  computeFearState,
  computeIdleTapPulse,
  computeMacroFocusDistance,
  computePatternSpeciesAffinity,
  computeSetaeVibrationAmp,
  computeSilkBridgeHeight,
  computeSurfaceHeight,
  computeUnlockedLoreIds,
  computeWaspRelativeBearingDeg,
  createPatternRecord,
  detectLocationZone,
  DIFFICULTY_CONFIGS,
  distance3D,
  groundHeightAt,
  INITIAL_DEW_QUEST,
  isWaspSnaredInWeb,
  PATTERN_SPECS,
  POND_WATER_Y,
  projectToRadarCoords,
  resolveObstacleCollisions,
  resolveOutcome,
  SILK_COST_BY_SHAPE,
  SILK_REWARD_BY_SPECIES,
  stepDewQuest,
  stepPatternDurability,
  stepWaspAI,
  stepWebDewRegeneration,
} from './rules';
import {
  isAnyBindingHeld,
  matchesBinding,
  mouseButtonToCode,
} from './settings';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import type {
  AnchorNode,
  ChapterPhase,
  DewQuestState,
  DifficultyLevel,
  ExternalEngineState,
  FlySpecies,
  GameOutcome,
  GameScreenState,
  GraphicsQuality,
  HudSnapshot,
  LocationZone,
  PatternShape,
  RadarBlip,
  SilkStrand,
  UserSettings,
  Vec3,
  WaspState,
  WeatherState,
  WhisperId,
  WhisperParams,
  WovenPattern,
} from './types';

const _gazeLookDir = new THREE.Vector3();
const _gazeToWeb = new THREE.Vector3();

interface LiveFly {
  id: string;
  species: FlySpecies;
  rig: FlyRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  caughtPatternId: string | null;
  escapeTimer: number;
  phase: number;
}

interface PooledMote {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  ambient: boolean;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _lastLodCamPos = new THREE.Vector3(999, 999, 999);

const MysticalColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignetteStrength: { value: 0.38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignetteStrength;
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec3 c = col.rgb;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Subtle atmospheric split-toning: cool midnight indigo shadows, moon-teal midtones, warm golden highlights
      vec3 shadowTint = vec3(0.92, 0.96, 1.09);
      vec3 highlightTint = vec3(1.04, 1.01, 0.95);
      float hiMix = smoothstep(0.18, 0.88, luma);
      c *= mix(shadowTint, highlightTint, hiMix);
      // Gentle vignette framing the forest clearing
      vec2 distVec = (vUv - 0.5) * vec2(1.12, 1.0);
      float vig = smoothstep(0.38, 0.96, length(distVec));
      c *= mix(1.0, 1.0 - uVignetteStrength, vig);
      gl_FragColor = vec4(max(c, vec3(0.0)), col.a);
    }
  `,
};

function buildNocturnalEnvScene(): THREE.Scene {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x070d19);

  // Midnight indigo dome
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x10223d,
      emissiveIntensity: 1.0,
      side: THREE.BackSide,
      roughness: 1,
    }),
  );
  envScene.add(skyDome);

  // Luminous lunar specular key patch for eye/dew/silk reflections
  const moonDisk = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xd9ecff,
      emissiveIntensity: 3.4,
      roughness: 0.4,
    }),
  );
  moonDisk.position.set(4, 11, -13);
  envScene.add(moonDisk);

  // Cool forest canopy ring + dark mossy ground bounce
  const canopyRing = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 7, 18, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x0d2624,
      emissiveIntensity: 0.75,
      side: THREE.BackSide,
      roughness: 1,
    }),
  );
  canopyRing.position.y = 2;
  envScene.add(canopyRing);

  const groundBounce = new THREE.Mesh(
    new THREE.CircleGeometry(18, 16),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x111a14,
      emissiveIntensity: 0.65,
      roughness: 1,
    }),
  );
  groundBounce.rotation.x = -Math.PI / 2;
  groundBounce.position.y = -4;
  envScene.add(groundBounce);

  return envScene;
}

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class OrbWeaverEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onToggleFullscreen?: () => void;
  private settings: UserSettings;

  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private ssaoPass!: SSAOPass;
  private bloomPass!: UnrealBloomPass;
  private bokehPass!: BokehPass;
  private gradePass!: ShaderPass;
  private outputPass!: OutputPass;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private moonKeyLight!: THREE.DirectionalLight;
  private heroRimLight!: THREE.SpotLight;
  private isSoftwareGl: boolean;
  private textures!: ProceduralTextureSet;
  private world!: ForestWorldHandle;
  private pavutin!: PavutinRig;
  private wasp!: WaspRig;
  private sound = new SoundEngine(() => {
    if (!this.disposed) this.pushHud(true);
  });

  private screen: GameScreenState = 'title';
  private outcome: GameOutcome = null;
  private chapter: ChapterPhase = 'prologue';
  private currentZone: LocationZone = 'log';

  private silk = 44;
  private readonly maxSilk = 160;
  private composure = 3;
  private maxComposure = 3;
  private fear = 0;
  private hiddenInNettle = false;
  private selectedMode: PatternShape = 'triangle';
  private hasGrapple = false;
  private moonRestored = 0.35;

  private spiderPos = new THREE.Vector3(0.4, 0, 3.2);
  private spiderVelY = 0;
  private isGrounded = true;
  private onSilkBridge = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private spiderSquashY = 1;
  private spiderYaw = Math.PI;
  private walkDistance = 0;
  private lastStepPhase = 0;
  private lastIdleTapPulses: [number, number] = [0, 0];
  private idleTapSoundCooldown = 0;
  private combatStanceBlend = 0;
  private nearestFlyDist = Infinity;
  private nearestFlyCamDist: number | null = null;
  private nearestFlyCaught = false;
  private hitstopTimer = 0;
  private trauma = 0;
  private knockbackVel = new THREE.Vector3();
  private grappleActive = false;
  private grappleStart = new THREE.Vector3();
  private grappleEnd = new THREE.Vector3();
  private grappleProgress = 0;
  private dashCooldown = 0;
  private dashTimer = 0;
  private dashIFrameTimer = 0;
  private dashDir = new THREE.Vector2(0, -1);

  private camYaw = 0;
  private camPitch = 0.22;
  private camDist = 5.4;
  private camDistTarget = 5.4;
  private camPos = new THREE.Vector3(0.4, 2.2, 7.6);
  private camLook = new THREE.Vector3(0.2, 1.4, -4.5);
  private draggingCam = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private touchMoveVec = new THREE.Vector2(0, 0);

  private waspState: WaspState = 'absent';
  private waspTimer = 0;
  private waspPos = new THREE.Vector3(16, 4.5, -14);
  private waspAngle = 0;
  private waspDiveTarget = new THREE.Vector3();
  private waspDiveHitCommitted = false;
  private waspPostDiveCooldown = 0;
  private waspHitInvulnTimer = 0;
  private waspWebSlowTimer = 0;
  private calmRegenTimer = 0;
  private dewRegenAccumulator = 0;
  private shownStillStealthHint = false;

  private weather: WeatherState = 'calm';
  private windWarning = false;
  private weatherTimer = 0;
  private windStrength = 0.14;

  private activeThreadFrom: AnchorNode | null = null;
  private trailingFilamentMesh!: THREE.Mesh;
  private targetSporesGroup!: THREE.Group;
  private targetSporeGeo!: THREE.BufferGeometry;
  private targetSporeMat!: THREE.MeshStandardMaterial;

  private strands: SilkStrand[] = [];
  private patterns: WovenPattern[] = [];
  private patternById = new Map<string, WovenPattern>();
  private webMeshes: THREE.Object3D[] = [];
  private flies: LiveFly[] = [];
  private flySpawnTimer = 0;
  private fliesCaught = 0;
  private aerialCatches = 0;
  private shownBridgeHint = false;
  private caughtSpecies: Record<FlySpecies, number> = {
    fatbelly: 0,
    nimble: 0,
    greenie: 0,
    tearbearer: 0,
  };
  private dewQuest: DewQuestState = { ...INITIAL_DEW_QUEST };
  private perfFrameAccum = 0;
  private perfFrameCount = 0;
  private perfDownscaled = false;

  private motesMesh!: THREE.InstancedMesh;
  private motes: PooledMote[] = [];
  private moteCursor = 0;
  private activeAmbientMotesLimit = 50;

  private whisperId: WhisperId = 'prologue_intro';
  private whisperParams: WhisperParams | undefined;
  private whisperSpeaker: 'pavutin' | 'uspokh' | 'moon' = 'pavutin';
  private whisperTimer = 0;
  private prologueShattered = false;
  private tearbearerSpawned = false;
  private victoryDelayTimer = -1;

  private keys = new Set<string>();
  private inputSuspended = false;
  private externalIsMobile = false;
  private externalInputMode: 'touch' | 'keyboard' = 'keyboard';
  private elapsedSeconds = 0;
  private lastHudPush = 0;
  private startTimeMs = performance.now();
  private lastFrameMs = performance.now();
  private simElapsed = 0;
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private anchorPosMap = new Map<string, Vec3>();
  private cachedNearAnchor: AnchorNode | null = null;
  private windStreaks: {
    x: number;
    y: number;
    z: number;
    speed: number;
    len: number;
    phase: number;
  }[] = [];
  private disposableWebGeos: THREE.BufferGeometry[] = [];
  private disposableWebMats: THREE.Material[] = [];
  private webPulseEntries: {
    mat: THREE.MeshPhysicalMaterial;
    baseEmissive: number;
    baseOpacity: number;
    phase: number;
    patternId?: string;
    group?: THREE.Object3D;
  }[] = [];

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    autostart: boolean,
    initialSettings: UserSettings,
    onToggleFullscreen?: () => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.settings = initialSettings;
    this.onToggleFullscreen = onToggleFullscreen;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.initScene();
    this.applyGraphicsQuality(this.settings.graphics);
    this.bindInput();
    this.resetWorldState(autostart ? 'playing' : 'title');

    this.startTimeMs = performance.now();
    this.lastFrameMs = this.startTimeMs;
    this.tick();
  }

  private initScene(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070d18);
    this.scene.fog = new THREE.FogExp2(0x070d18, 0.024);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = buildNocturnalEnvScene();
    this.envTarget = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = this.envTarget.texture;
    envScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 140);

    // Asymmetric nocturnal moonlight vs deep mossy forest shadow contrast
    const hemiLight = new THREE.HemisphereLight(0x6b98d8, 0x0f1a13, 0.48);
    this.scene.add(hemiLight);

    this.moonKeyLight = new THREE.DirectionalLight(0xd8ebff, 2.75);
    this.moonKeyLight.position.set(12, 26, -24);
    if (!this.isSoftwareGl) {
      this.moonKeyLight.castShadow = true;
      this.moonKeyLight.shadow.mapSize.set(2048, 2048);
      this.moonKeyLight.shadow.radius = 3.5;
      const d = 22;
      this.moonKeyLight.shadow.camera.left = -d;
      this.moonKeyLight.shadow.camera.right = d;
      this.moonKeyLight.shadow.camera.top = d;
      this.moonKeyLight.shadow.camera.bottom = -d;
      this.moonKeyLight.shadow.camera.near = 2;
      this.moonKeyLight.shadow.camera.far = 68;
      this.moonKeyLight.shadow.bias = -0.0005;
      this.moonKeyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.moonKeyLight);

    const warmBounce = new THREE.DirectionalLight(0x9e6a36, 0.34);
    warmBounce.position.set(-10, 6, 14);
    this.scene.add(warmBounce);

    // Cool nocturnal blue rim light behind Pavutin so setae & legs crisp against dark forest shadows
    this.heroRimLight = new THREE.SpotLight(0x6bb8ff, 5.8, 12.0, 0.64, 0.86, 1.35);
    this.heroRimLight.castShadow = false;
    this.heroRimLight.position.set(0.4, 2.2, 0.2);
    this.heroRimLight.target.position.set(0.4, 0.35, 3.2);
    this.scene.add(this.heroRimLight);
    this.scene.add(this.heroRimLight.target);

    // Post-processing: RenderPass -> SSAOPass -> UnrealBloomPass -> BokehPass (Ultra only) -> Vignette+ColorGrade -> OutputPass (ACES Filmic)
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.ssaoPass = new SSAOPass(this.scene, this.camera, w, h, 16);
    this.ssaoPass.kernelRadius = 4.2;
    this.ssaoPass.minDistance = 0.004;
    this.ssaoPass.maxDistance = 0.07;
    this.ssaoPass.enabled = false;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.38, // strength
      0.56, // radius
      0.78, // threshold
    );
    this.bloomPass.enabled = !this.isSoftwareGl;
    this.composer.addPass(this.bloomPass);

    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 5.5,
      aperture: 0.00022,
      maxblur: 0.0042,
    });
    this.bokehPass.enabled = false;
    this.composer.addPass(this.bokehPass);

    this.gradePass = new ShaderPass(MysticalColorGradeShader);
    this.gradePass.enabled = !this.isSoftwareGl;
    this.composer.addPass(this.gradePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.world = createForestWorld(this.scene, this.textures, this.isSoftwareGl);
    this.anchorPosMap.clear();
    for (const a of this.world.anchors) {
      this.anchorPosMap.set(a.id, a.position);
    }
    this.windStreaks = Array.from({ length: 28 }, (_, i) => ({
      x: ((i * 7.3) % 34) - 17,
      y: 0.7 + (i % 6) * 0.65,
      z: ((i * 5.9) % 28) - 16,
      speed: 3.4 + (i % 5) * 0.95,
      len: 0.7 + (i % 4) * 0.38,
      phase: i * 0.8,
    }));

    this.pavutin = createPavutinModel(this.textures);
    this.scene.add(this.pavutin.root);

    this.wasp = createKhryazhSyakayaModel(this.textures);
    this.wasp.root.visible = false;
    this.scene.add(this.wasp.root);

    this.trailingFilamentMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0055, 1, 6),
      new THREE.MeshStandardMaterial({
        color: 0xeaf4ff,
        emissive: 0x7ac2ff,
        emissiveIntensity: 0.72,
        transparent: true,
        opacity: 0.78,
        roughness: 0.14,
      }),
    );
    this.trailingFilamentMesh.visible = false;
    this.scene.add(this.trailingFilamentMesh);

    this.targetSporesGroup = new THREE.Group();
    this.targetSporeGeo = new THREE.SphereGeometry(0.022, 6, 6);
    this.targetSporeMat = new THREE.MeshStandardMaterial({
      color: 0xf4fff9,
      emissive: 0x9effdb,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
    });
    for (let s = 0; s < 3; s++) {
      const spore = new THREE.Mesh(this.targetSporeGeo, this.targetSporeMat);
      this.targetSporesGroup.add(spore);
    }
    this.targetSporesGroup.visible = false;
    this.scene.add(this.targetSporesGroup);

    const moteCount = 156;
    const moteGeo = new THREE.SphereGeometry(0.052, 6, 6);
    const moteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x45e8be,
      emissiveIntensity: 1.55,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
    });
    this.motesMesh = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    this.motesMesh.frustumCulled = false;
    const moteTint = new THREE.Color();
    for (let i = 0; i < moteCount; i++) {
      const ambient = i < 80;
      const isPondFirefly = i < 16;
      this.motes.push({
        active: ambient,
        pos: isPondFirefly
          ? new THREE.Vector3(
              -10.2 + (Math.random() - 0.5) * 5.2,
              POND_WATER_Y + 0.25 + Math.random() * 0.95,
              -0.6 + (Math.random() - 0.5) * 6.8,
            )
          : new THREE.Vector3(
              (Math.random() - 0.5) * 32,
              0.6 + Math.random() * 5.5,
              (Math.random() - 0.5) * 32 - 4,
            ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.25,
          0.08 + Math.random() * 0.18,
          (Math.random() - 0.5) * 0.25,
        ),
        life: Math.random() * 6,
        maxLife: 6 + Math.random() * 4,
        scale: isPondFirefly ? 0.8 + Math.random() * 0.55 : ambient ? 0.55 + Math.random() * 0.55 : 1,
        ambient,
      });
      // Green pond fireflies over water + turquoise forest motes
      if (isPondFirefly) {
        moteTint.setHSL(0.35 + (i % 4) * 0.02, 0.94, 0.58);
      } else {
        moteTint.setHSL(0.43 + (i % 5) * 0.025, 0.82, 0.62);
      }
      this.motesMesh.setColorAt(i, moteTint);
    }
    if (this.motesMesh.instanceColor) this.motesMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.motesMesh);

    const initPr = this.renderer.getPixelRatio();
    this.world.pondWaterUniforms.uResolution.value.set(w * initPr, h * initPr);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
  }

  public updateSettings(next: UserSettings): void {
    const prevDiff = this.settings.difficulty;
    const prevGfx = this.settings.graphics;
    this.settings = next;

    if (prevGfx !== next.graphics) {
      this.applyGraphicsQuality(next.graphics);
    }
    if (prevDiff !== next.difficulty) {
      this.applyDifficultyLive(next.difficulty);
    }
    this.pushHud(true);
  }

  public setInputSuspended(suspended: boolean): void {
    this.inputSuspended = suspended;
    if (suspended) {
      this.keys.clear();
      this.draggingCam = false;
    }
  }

  public setTouchMove(x: number, y: number): void {
    this.touchMoveVec.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1),
    );
  }

  public syncExternalState(state: ExternalEngineState): void {
    this.externalIsMobile = state.isMobile;
    this.externalInputMode = state.inputMode;
    if (state.inputMode === 'keyboard') {
      this.touchMoveVec.set(0, 0);
    }
  }

  public getExternalState(): ExternalEngineState {
    return {
      isMobile: this.externalIsMobile,
      inputMode: this.externalInputMode,
    };
  }

  private applyDifficultyLive(diff: DifficultyLevel): void {
    const cfg = DIFFICULTY_CONFIGS[diff];
    this.maxComposure = cfg.maxComposure;
    this.composure = Math.min(this.composure, this.maxComposure);
    if (this.chapter === 'prologue' && this.patterns.length === 0) {
      this.silk = cfg.initialSilk;
    }
  }

  private applyGraphicsQuality(quality: GraphicsQuality): void {
    if (!this.renderer || !this.world) return;
    const isMinimal = quality === 'lowest';
    const isLowTier = quality === 'lowest' || quality === 'low';
    const isHighOrAbove =
      quality === 'high' || quality === 'ultra' || quality === 'cinematic';
    const isUltraOrAbove = quality === 'ultra' || quality === 'cinematic';

    if (!this.isSoftwareGl) {
      const dprCap =
        quality === 'lowest'
          ? 0.75
          : quality === 'low'
            ? 0.95
            : quality === 'medium'
              ? 1.2
              : quality === 'high'
                ? 1.5
                : quality === 'ultra'
                  ? 1.8
                  : 2.0;
      const pr = Math.min(window.devicePixelRatio, dprCap);
      this.renderer.setPixelRatio(pr);
      this.renderer.shadowMap.enabled = !isLowTier;
      this.moonKeyLight.castShadow = !isLowTier;
      const targetShadowSize = quality === 'medium' ? 1024 : 2048;
      if (this.moonKeyLight.shadow.mapSize.x !== targetShadowSize) {
        this.moonKeyLight.shadow.mapSize.set(targetShadowSize, targetShadowSize);
        this.moonKeyLight.shadow.map?.dispose();
        this.moonKeyLight.shadow.map = null;
      }
      if (this.composer && this.bloomPass) {
        this.composer.setPixelRatio(pr);
        this.ssaoPass.enabled = isUltraOrAbove;
        this.bloomPass.enabled = !isLowTier;
        this.bloomPass.strength =
          quality === 'medium'
            ? 0.22
            : quality === 'high'
              ? 0.36
              : quality === 'ultra'
                ? 0.46
                : 0.56;
        this.bloomPass.radius = quality === 'cinematic' ? 0.62 : 0.56;
        this.bokehPass.enabled = isUltraOrAbove;
        const bokehUniforms = this.bokehPass.uniforms as Record<string, THREE.IUniform>;
        if (bokehUniforms['aperture']) {
          bokehUniforms['aperture'].value = quality === 'cinematic' ? 0.0005 : 0.00038;
        }
        if (bokehUniforms['maxblur']) {
          bokehUniforms['maxblur'].value = quality === 'cinematic' ? 0.0068 : 0.0054;
        }
        this.gradePass.enabled = !isLowTier;
        (this.gradePass.uniforms.uVignetteStrength as { value: number }).value =
          quality === 'cinematic' ? 0.44 : quality === 'ultra' ? 0.39 : 0.33;
      }
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.world.pondWaterUniforms.uResolution.value.set(w * pr, h * pr);
    } else if (this.bloomPass) {
      this.ssaoPass.enabled = false;
      this.bloomPass.enabled = false;
      this.bokehPass.enabled = false;
      this.gradePass.enabled = false;
    }

    // Tier 'lowest' freezes all grass/foliage wind sway completely
    this.world.windEnabledUniform.value = isMinimal ? 0.0 : 1.0;
    this.world.moonBeamsGroup.visible = isHighOrAbove;
    this.world.fernInstances.visible = !isLowTier;
    this.world.cloverInstances.visible = !isLowTier;
    this.world.fallenLeafInstances.visible = !isLowTier;
    this.world.mistInstances.visible = !isLowTier;
    this.world.windStreaksInst.visible = !isMinimal;
    this.world.grassInstances.visible = true;
    this.world.distantGrassSpritesInst.visible = !isMinimal;

    this.activeAmbientMotesLimit =
      quality === 'lowest'
        ? 8
        : quality === 'low'
          ? 18
          : quality === 'medium'
            ? 34
            : quality === 'high'
              ? 50
              : quality === 'ultra'
                ? 64
                : 80;
    this.renderer.toneMappingExposure =
      quality === 'lowest'
        ? 1.02
        : quality === 'low'
          ? 1.06
          : quality === 'medium'
            ? 1.1
            : quality === 'high'
              ? 1.14
              : quality === 'ultra'
                ? 1.19
                : 1.24;
    if (this.scene.fog instanceof THREE.FogExp2) {
      const fogDensity = isMinimal
        ? 0.014
        : quality === 'low'
          ? 0.017
          : isUltraOrAbove
            ? 0.025
            : 0.022;
      this.scene.fog.density = fogDensity;
      this.world.pondWaterUniforms.uFogDensity.value = fogDensity;
      this.world.pondMistUniforms.uFogDensity.value = fogDensity;
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    if (this.world?.pondWaterUniforms) {
      this.world.pondWaterUniforms.uResolution.value.set(w * pr, h * pr);
    }
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
    if (this.scene && this.camera) {
      if (this.isSoftwareGl || !this.bloomPass?.enabled) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.composer?.render();
      }
    }
  }

  private bindInput(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onWindowBlur = () => {
    this.keys.clear();
    this.draggingCam = false;
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.keys.clear();
      this.draggingCam = false;
    }
  };

  private handleActionEdge(code: string): boolean {
    const b = this.settings.bindings;
    if (matchesBinding(code, b, 'pause')) {
      if (this.screen === 'playing') {
        this.pauseGame();
        return true;
      }
      if (this.screen === 'paused') {
        this.resumeGame();
        return true;
      }
    }
    if (matchesBinding(code, b, 'mute')) {
      this.toggleMute();
      return true;
    }
    if (matchesBinding(code, b, 'fullscreen')) {
      this.onToggleFullscreen?.();
      return true;
    }
    if (this.screen !== 'playing') return false;

    if (matchesBinding(code, b, 'jump')) {
      this.triggerJump();
      return true;
    }
    if (matchesBinding(code, b, 'dash')) {
      this.triggerDash();
      return true;
    }
    if (matchesBinding(code, b, 'interact')) {
      this.triggerPrimaryInteract();
      return true;
    }
    if (matchesBinding(code, b, 'harvest')) {
      this.tryHarvestNearbyFly();
      return true;
    }
    if (matchesBinding(code, b, 'grapple')) {
      this.triggerGrapple();
      return true;
    }
    return false;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.sound.ensureStarted();
    if (this.inputSuspended || this.screen !== 'playing') return;

    const mCode = mouseButtonToCode(e.button);
    // Right-click or any mouse button explicitly bound to jump/grapple/harvest/etc.
    if (mCode && mCode !== 'MouseLeft') {
      if (this.handleActionEdge(mCode)) {
        this.keys.add(mCode);
        return;
      }
    }
    if (mCode && matchesBinding(mCode, this.settings.bindings, 'jump')) {
      this.triggerJump();
      this.keys.add(mCode);
      return;
    }

    this.draggingCam = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.draggingCam || this.inputSuspended || this.screen !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const lookSensitivity = this.externalInputMode === 'touch' ? 0.0072 : 0.0055;
    this.camYaw -= dx * lookSensitivity;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + dy * 0.004,
      0.14,
      1.05,
    );
  };

  private onWheel = (e: WheelEvent) => {
    if (this.inputSuspended || this.screen !== 'playing') return;
    e.preventDefault();
    this.camDistTarget = THREE.MathUtils.clamp(
      this.camDistTarget + Math.sign(e.deltaY) * 0.42,
      2.1,
      8.2,
    );
  };

  private onPointerUp = (e: PointerEvent) => {
    const mCode = mouseButtonToCode(e.button);
    if (mCode) {
      if (this.keys.has(mCode) && matchesBinding(mCode, this.settings.bindings, 'jump')) {
        if (this.spiderVelY > 0) this.spiderVelY *= 0.78;
      }
      this.keys.delete(mCode);
    }

    if (!this.draggingCam) return;
    this.draggingCam = false;

    if (
      !this.inputSuspended &&
      this.screen === 'playing' &&
      Math.abs(e.clientX - this.pointerDownX) < 5 &&
      Math.abs(e.clientY - this.pointerDownY) < 5
    ) {
      if (mCode && !this.handleActionEdge(mCode)) {
        // Default left-click on canvas weaves / interacts
        this.triggerPrimaryInteract();
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.inputSuspended) return;
    const code = e.code;

    if (this.screen === 'title') {
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (code === 'KeyR' && (this.screen === 'playing' || this.screen === 'paused')) {
      this.restartGame();
      return;
    }

    if (!this.keys.has(code)) {
      if (this.handleActionEdge(code)) {
        if (code === 'Space' || code === 'Escape') e.preventDefault();
        this.keys.add(code);
        return;
      }

      if (this.screen === 'playing') {
        if (code === 'Digit1') this.setPatternMode('triangle');
        else if (code === 'Digit2') this.setPatternMode('star');
        else if (code === 'Digit3') this.setPatternMode('circle');
        else if (code === 'Digit4') this.setPatternMode('decoy');
        else if (code === 'Backspace' && this.activeThreadFrom) {
          this.activeThreadFrom = null;
          this.trailingFilamentMesh.visible = false;
          this.pushHud(true);
        }
      }
    }

    if (code === 'Space') e.preventDefault();
    this.keys.add(code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const code = e.code;
    if (
      this.keys.has(code) &&
      matchesBinding(code, this.settings.bindings, 'jump') &&
      this.spiderVelY > 0
    ) {
      // Variable jump height cut when releasing early
      this.spiderVelY *= 0.78;
    }
    this.keys.delete(code);
  };

  public triggerJump(): void {
    if (this.screen !== 'playing' || this.grappleActive) return;
    this.sound.ensureStarted();
    this.jumpBufferTimer = 0.14;
    this.tryExecuteJump();
  }

  private tryExecuteJump(): void {
    if (this.jumpBufferTimer <= 0) return;
    if (this.isGrounded || this.coyoteTimer > 0) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.spiderVelY = 7.4;
      this.spiderSquashY = 1.24;
      this.sound.playJump();
      this.burstMotes(this.spiderPos, 5, 0.14);
      this.pushHud(true);
    }
  }

  public triggerDash(): void {
    if (this.screen !== 'playing' || this.grappleActive || this.dashCooldown > 0) {
      return;
    }
    this.sound.ensureStarted();
    let moveFwd = this.touchMoveVec.y;
    let moveRight = this.touchMoveVec.x;
    const b = this.settings.bindings;
    if (isAnyBindingHeld(this.keys, b, 'moveForward')) moveFwd += 1;
    if (isAnyBindingHeld(this.keys, b, 'moveBackward')) moveFwd -= 1;
    if (isAnyBindingHeld(this.keys, b, 'moveRight')) moveRight += 1;
    if (isAnyBindingHeld(this.keys, b, 'moveLeft')) moveRight -= 1;

    const inLen = Math.hypot(moveFwd, moveRight);
    if (inLen > 0.08) {
      const fwdX = -Math.sin(this.camYaw);
      const fwdZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);
      const dx = (fwdX * moveFwd + rightX * moveRight) / inLen;
      const dz = (fwdZ * moveFwd + rightZ * moveRight) / inLen;
      const norm = Math.hypot(dx, dz) || 1;
      this.dashDir.set(dx / norm, dz / norm);
    } else if (this.waspState === 'dive' || this.waspState === 'investigate') {
      // Sidestep perpendicular + slightly away from the diving wasp when standing still
      const awayX = this.spiderPos.x - this.waspPos.x;
      const awayZ = this.spiderPos.z - this.waspPos.z;
      const sideX = -awayZ + awayX * 0.45;
      const sideZ = awayX + awayZ * 0.45;
      const norm = Math.hypot(sideX, sideZ) || 1;
      this.dashDir.set(sideX / norm, sideZ / norm);
    } else {
      this.dashDir.set(Math.sin(this.spiderYaw), Math.cos(this.spiderYaw));
    }

    this.spiderYaw = Math.atan2(this.dashDir.x, this.dashDir.y);
    this.dashCooldown = 1.6;
    this.dashTimer = 0.22;
    this.dashIFrameTimer = 0.36;
    this.spiderSquashY = 0.84;
    this.sound.playDash();
    this.burstMotes(this.spiderPos, 10, 0.24);
    this.pushHud(true);
  }

  public startGame(): void {
    this.sound.ensureStarted();
    this.keys.clear();
    this.spiderYaw = Math.PI;
    this.screen = 'playing';
    document.body.dataset.state = 'playing';
    this.pushHud(true);
  }

  public pauseGame(): void {
    if (this.screen !== 'playing') return;
    this.keys.clear();
    this.draggingCam = false;
    this.screen = 'paused';
    document.body.dataset.state = 'paused';
    this.sound.silenceLoops();
    this.pushHud(true);
  }

  public resumeGame(): void {
    if (this.screen !== 'paused') return;
    this.keys.clear();
    this.screen = 'playing';
    document.body.dataset.state = 'playing';
    this.pushHud(true);
  }

  public restartGame(): void {
    this.keys.clear();
    this.resetWorldState('playing');
  }

  public returnToTitle(): void {
    this.keys.clear();
    this.resetWorldState('title');
  }

  public toggleMute(): void {
    this.sound.toggleMute();
    this.pushHud(true);
  }

  public selectMusicTrack(index: number): void {
    this.sound.selectTrack(index, true);
    this.pushHud(true);
  }

  public nextMusicTrack(): void {
    this.sound.nextTrack();
    this.pushHud(true);
  }

  public prevMusicTrack(): void {
    this.sound.prevTrack();
    this.pushHud(true);
  }

  public toggleMusicPlayback(): void {
    this.sound.toggleMusicPlayback();
    this.pushHud(true);
  }

  public async importCustomMusicFiles(files: FileList | File[]): Promise<number> {
    const count = await this.sound.importCustomMusicFiles(files);
    this.pushHud(true);
    return count;
  }

  public setPatternMode(mode: PatternShape): void {
    this.selectedMode = mode;
    this.pushHud(true);
  }

  private resetWorldState(targetScreen: GameScreenState): void {
    this.webMeshes.forEach((m) => this.scene.remove(m));
    this.webMeshes = [];
    this.disposableWebGeos.forEach((g) => g.dispose());
    this.disposableWebMats.forEach((m) => m.dispose());
    this.disposableWebGeos = [];
    this.disposableWebMats = [];
    this.webPulseEntries = [];

    this.flies.forEach((f) => this.scene.remove(f.rig.root));
    this.flies = [];

    this.strands = [];
    this.patterns = [];
    this.patternById.clear();
    this.activeThreadFrom = null;
    this.cachedNearAnchor = null;
    this.trailingFilamentMesh.visible = false;
    this.targetSporesGroup.visible = false;

    const diffCfg = DIFFICULTY_CONFIGS[this.settings.difficulty];
    this.screen = targetScreen;
    this.outcome = null;
    this.chapter = 'prologue';
    this.silk = diffCfg.initialSilk;
    this.maxComposure = diffCfg.maxComposure;
    this.composure = this.maxComposure;
    this.fear = 0;
    this.hiddenInNettle = false;
    this.selectedMode = 'triangle';
    this.hasGrapple = false;
    this.moonRestored = 0.35;
    this.textures.updateMoonStitch(this.moonRestored);

    this.spiderPos.set(0.4, groundHeightAt(0.4, 3.2), 3.2);
    this.spiderVelY = 0;
    this.isGrounded = true;
    this.onSilkBridge = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.spiderSquashY = 1;
    this.spiderYaw = targetScreen === 'title' ? Math.PI * 0.72 : Math.PI;
    this.walkDistance = 0;
    this.lastStepPhase = 0;
    this.combatStanceBlend = 0;
    this.nearestFlyDist = Infinity;
    this.nearestFlyCamDist = null;
    this.nearestFlyCaught = false;
    this.camYaw = 0;
    this.camPitch = 0.22;
    this.camDist = 5.4;
    this.camDistTarget = 5.4;
    this.camPos.set(0.4, 2.15, 7.6);
    this.camLook.set(0.2, 1.4, -4.5);
    this.knockbackVel.set(0, 0, 0);
    this.grappleActive = false;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashIFrameTimer = 0;
    this.currentZone = 'log';

    this.waspState = 'absent';
    this.waspTimer = 0;
    this.waspDiveHitCommitted = false;
    this.waspPostDiveCooldown = 0;
    this.waspHitInvulnTimer = 0;
    this.waspWebSlowTimer = 0;
    this.calmRegenTimer = 0;
    this.dewRegenAccumulator = 0;
    this.shownStillStealthHint = false;
    this.wasp.root.visible = false;
    this.weather = 'calm';
    this.windWarning = false;
    this.weatherTimer = 0;
    this.windStrength = 0.14;

    this.fliesCaught = 0;
    this.aerialCatches = 0;
    this.shownBridgeHint = false;
    this.caughtSpecies = { fatbelly: 0, nimble: 0, greenie: 0, tearbearer: 0 };
    this.dewQuest = { ...INITIAL_DEW_QUEST };
    this.prologueShattered = false;
    this.tearbearerSpawned = false;
    this.victoryDelayTimer = -1;
    this.elapsedSeconds = 0;

    this.world.sacredFrameLight.intensity = 0.85;
    (this.world.greatFrameGlade.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08;
    (this.world.uspokhLeafShadow.material as THREE.MeshStandardMaterial).opacity = 0;

    this.setWhisper('pavutin', 'prologue_intro', undefined, 8);

    this.spawnAmbientFly('greenie', new THREE.Vector3(0.2, 1.4, 1.0));
    this.spawnAmbientFly('fatbelly', new THREE.Vector3(-1.4, 1.6, 0.4));

    document.body.dataset.state = targetScreen;
    this.pushHud(true);
  }

  private setWhisper(
    speaker: 'pavutin' | 'uspokh' | 'moon',
    id: WhisperId,
    params?: WhisperParams,
    duration = 7,
  ): void {
    this.whisperSpeaker = speaker;
    this.whisperId = id;
    this.whisperParams = params;
    this.whisperTimer = duration;
    this.pushHud(true);
  }

  private findNearestAnchor(maxDist = 3.75): AnchorNode | null {
    let best: AnchorNode | null = null;
    let bestD = maxDist;
    for (const a of this.world.anchors) {
      const dx = a.position.x - this.spiderPos.x;
      const dz = a.position.z - this.spiderPos.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  private findNearestGrappleAnchor(): AnchorNode | null {
    if (!this.hasGrapple) return null;
    let best: AnchorNode | null = null;
    let bestD = 12.5;
    for (const a of this.world.anchors) {
      if (!a.isGrapplePoint) continue;
      const dx = a.position.x - this.spiderPos.x;
      const dz = a.position.z - this.spiderPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.2 && d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  public triggerGrapple(): void {
    if (!this.hasGrapple || this.grappleActive || this.screen !== 'playing') return;
    const target = this.findNearestGrappleAnchor();
    if (!target) {
      this.setWhisper('pavutin', 'grapple_search', undefined, 3.5);
      return;
    }
    this.grappleActive = true;
    this.grappleProgress = 0;
    this.grappleStart.copy(this.spiderPos);
    this.grappleEnd.set(
      target.position.x,
      groundHeightAt(target.position.x, target.position.z),
      target.position.z,
    );
    this.sound.playGrappleZip();
    this.burstMotes(this.spiderPos, 10, 0.25);
  }

  private findWornPatternAtAnchor(anchorId: string): WovenPattern | null {
    for (let i = 0; i < this.patterns.length; i++) {
      const p = this.patterns[i];
      if (p.shape !== 'decoy' && p.durability < 80 && p.nodeIds.includes(anchorId)) {
        return p;
      }
    }
    return null;
  }

  public triggerPrimaryInteract(): void {
    if (this.screen !== 'playing') return;
    if (this.tryHarvestNearbyFly()) return;

    const near = this.findNearestAnchor(3.75);
    if (!near) {
      this.setWhisper('pavutin', 'approach_twig', undefined, 3);
      return;
    }

    if (!this.activeThreadFrom) {
      const worn = this.findWornPatternAtAnchor(near.id);
      if (worn && this.silk >= 3) {
        this.silk -= 3;
        worn.durability = worn.maxDurability;
        this.sound.playWebMend();
        this.burstMotes(
          _v1.set(worn.center.x, worn.center.y, worn.center.z),
          14,
          0.26,
        );
        this.setWhisper('pavutin', 'web_mended', undefined, 4);
        this.pushHud(true);
        return;
      }
    }

    if (this.fear > 78 && !this.hiddenInNettle) {
      this.sound.playSnapWarning();
      this.trauma = Math.min(1, this.trauma + 0.28);
      this.setWhisper('pavutin', 'fear_tremor', undefined, 4);
      return;
    }

    if (!this.activeThreadFrom) {
      this.activeThreadFrom = near;
      this.sound.playSilkPluck(1.2);
      this.burstMotes(
        _v1.set(near.position.x, near.position.y, near.position.z),
        6,
        0.15,
      );
      this.pushHud(true);
      return;
    }

    if (this.activeThreadFrom.id === near.id) {
      this.activeThreadFrom = null;
      this.trailingFilamentMesh.visible = false;
      this.pushHud(true);
      return;
    }

    const from = this.activeThreadFrom;
    const to = near;
    const len = distance3D(from.position, to.position);
    if (len > 16.5) {
      this.sound.playSnapWarning();
      this.setWhisper('pavutin', 'too_far', undefined, 3.5);
      return;
    }

    const isBearing = Boolean(
      (from.isGreatAnchor && to.isFrameNode) ||
        (to.isGreatAnchor && from.isFrameNode),
    );

    if (isBearing) {
      const greatNode = from.isGreatAnchor ? from : to;
      const zone = greatNode.zone as 'stump' | 'left_birch' | 'right_birch';
      const hasBrace = this.patterns.some(
        (p) =>
          p.shape === 'triangle' &&
          p.nodeIds.includes('anchor_left_birch') &&
          (p.nodeIds.includes('left_birch_brace_b') ||
            p.nodeIds.includes('left_birch_brace_c')),
      );
      const check = canBearingStrandHold({
        anchorZone: zone,
        weather: this.weather,
        hasLeftBirchTriangleBrace: hasBrace,
        hasGrapple: this.hasGrapple,
      });
      if (!check.holds) {
        this.sound.playSnapWarning();
        this.trauma = Math.min(1, this.trauma + 0.35);
        this.activeThreadFrom = null;
        this.trailingFilamentMesh.visible = false;
        this.setWhisper(
          'uspokh',
          zone === 'stump' ? 'hollow_need_grapple' : 'birch_wind_snap',
          undefined,
          5,
        );
        return;
      }
    }

    const exists = this.strands.some(
      (s) =>
        (s.fromId === from.id && s.toId === to.id) ||
        (s.fromId === to.id && s.toId === from.id),
    );

    if (!exists) {
      const strandCost = isBearing ? 0 : 4;
      if (this.silk < strandCost) {
        this.sound.playSnapWarning();
        this.setWhisper('pavutin', 'not_enough_silk', undefined, 4);
        return;
      }
      this.silk = Math.max(0, this.silk - strandCost);

      const strand: SilkStrand = {
        id: `s_${Date.now()}_${Math.random()}`,
        fromId: from.id,
        toId: to.id,
        isBearing,
        isDecoy: this.selectedMode === 'decoy',
        durability: 100,
        maxDurability: 100,
        createdAt: this.elapsedSeconds,
      };
      this.strands.push(strand);
      this.createStrandMesh(from.position, to.position, isBearing, strand.isDecoy);
      this.sound.playSilkPluck(len);
      this.burstMotes(
        _v1.set(to.position.x, to.position.y, to.position.z),
        8,
        0.2,
      );

      if (isBearing) {
        this.onBearingStrandAdded();
      }
    }

    const loopNodes = this.findClosedLoop(to.id, from.id);
    if (loopNodes && loopNodes.length >= 3) {
      this.completePatternFromLoop(loopNodes);
      this.activeThreadFrom = null;
      this.trailingFilamentMesh.visible = false;
    } else {
      this.activeThreadFrom = to;
    }

    this.pushHud(true);
  }

  private findClosedLoop(startId: string, targetId: string): string[] | null {
    const adj = new Map<string, string[]>();
    for (const s of this.strands) {
      if (
        (s.fromId === startId && s.toId === targetId) ||
        (s.fromId === targetId && s.toId === startId)
      ) {
        continue;
      }
      if (!adj.has(s.fromId)) adj.set(s.fromId, []);
      if (!adj.has(s.toId)) adj.set(s.toId, []);
      adj.get(s.fromId)!.push(s.toId);
      adj.get(s.toId)!.push(s.fromId);
    }

    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      const neighbors = adj.get(curr) || [];
      for (const nxt of neighbors) {
        if (nxt === targetId && path.length >= 2) {
          return [...path, nxt];
        }
        if (!visited.has(nxt) && path.length < 6) {
          visited.add(nxt);
          queue.push([...path, nxt]);
        }
      }
    }
    return null;
  }

  private completePatternFromLoop(nodeIds: string[]): void {
    const shape = classifyPattern(nodeIds, this.selectedMode);
    const positions: Vec3[] = nodeIds
      .map((id) => this.world.anchors.find((a) => a.id === id)?.position)
      .filter((p): p is Vec3 => Boolean(p));

    if (positions.length < 3) return;

    const cost = Math.max(0, SILK_COST_BY_SHAPE[shape] - 6);
    this.silk = Math.max(0, this.silk - cost);

    const pattern = createPatternRecord({
      id: `pat_${Date.now()}_${Math.random()}`,
      shape,
      nodeIds,
      positions,
      createdAt: this.elapsedSeconds,
    });
    this.patterns.push(pattern);
    this.patternById.set(pattern.id, pattern);
    this.createClosedWebMesh(positions, shape, pattern.id);
    this.sound.playPatternClosed(shape === 'decoy');
    this.burstMotes(
      _v1.set(pattern.center.x, pattern.center.y, pattern.center.z),
      18,
      0.32,
    );

    if (shape !== 'decoy') {
      const spawnPt = new THREE.Vector3(
        pattern.center.x + (Math.random() - 0.5) * 4.5,
        pattern.center.y + 1.8,
        pattern.center.z + (Math.random() - 0.5) * 4.5,
      );
      this.spawnAmbientFly(pattern.targetSpecies, spawnPt);
    }

    if (this.chapter === 'prologue' && !this.prologueShattered) {
      this.triggerPrologueShatter();
    } else if (
      this.chapter === 'ch1_threads' &&
      !this.tearbearerSpawned &&
      this.patterns.length >= 2
    ) {
      this.tearbearerSpawned = true;
      this.spawnAmbientFly(
        'tearbearer',
        new THREE.Vector3(
          pattern.center.x + 1.2,
          pattern.center.y + 1.1,
          pattern.center.z - 1.5,
        ),
      );
      this.setWhisper('pavutin', 'tearbearer_spotted', undefined, 7);
    } else if (shape === 'decoy' && this.chapter === 'ch2_wasp') {
      this.setWhisper('pavutin', 'decoy_glowing', undefined, 5);
    }
  }

  private triggerPrologueShatter(): void {
    this.prologueShattered = true;
    this.hitstopTimer = this.settings.reducedEffects ? 0 : 0.06;
    this.trauma = this.settings.reducedEffects ? 0 : 0.55;
    this.moonRestored = 0.05;
    this.textures.updateMoonStitch(this.moonRestored);
    this.sound.playSnapWarning();

    (this.world.uspokhLeafShadow.material as THREE.MeshStandardMaterial).opacity = 0.62;
    this.chapter = 'ch1_threads';
    this.setWhisper('uspokh', 'prologue_shatter', undefined, 9);
  }

  private onBearingStrandAdded(): void {
    const bearingCount = this.strands.filter((s) => s.isBearing).length;
    this.moonRestored = Math.min(0.85, 0.12 + bearingCount * 0.12);
    this.textures.updateMoonStitch(this.moonRestored);

    const greatCheck = checkGreatPatternComplete(this.strands, this.silk, 100);
    if (greatCheck.ready) {
      this.triggerChapter3Victory();
    } else if (bearingCount >= 6 && greatCheck.missingSilk > 0) {
      this.setWhisper('uspokh', 'great_need_silk', { missing: greatCheck.missingSilk }, 6);
    } else {
      this.setWhisper('pavutin', 'great_strand_progress', { count: bearingCount }, 4.5);
    }
  }

  private triggerChapter3Victory(): void {
    this.chapter = 'victory';
    this.waspState = 'departed';
    this.wasp.root.visible = false;
    this.moonRestored = 1.0;
    this.textures.updateMoonStitch(1.0);
    this.world.sacredFrameLight.intensity = 3.2;
    (this.world.greatFrameGlade.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
    this.sound.playLunarTriumph();
    this.burstMotes(new THREE.Vector3(0, 2.2, -13.5), 40, 0.45);
    this.setWhisper('moon', 'great_victory', undefined, 6);
    this.victoryDelayTimer = 2.2;
    this.pushHud(true);
  }

  public tryHarvestNearbyFly(forcedAerial = false, specificFly?: LiveFly): boolean {
    if (this.screen !== 'playing') return false;
    const airborne = forcedAerial || !this.isGrounded;
    const reach = airborne ? 3.55 : 3.0;
    let bestIdx = -1;
    let bestD = reach;
    if (specificFly) {
      bestIdx = this.flies.indexOf(specificFly);
    } else {
      for (let i = 0; i < this.flies.length; i++) {
        const d = this.flies[i].pos.distanceTo(this.spiderPos);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
    }
    if (bestIdx === -1) return false;

    const fly = this.flies[bestIdx];
    const diffCfg = DIFFICULTY_CONFIGS[this.settings.difficulty];
    const baseReward = Math.round(
      SILK_REWARD_BY_SPECIES[fly.species] * diffCfg.silkRewardMultiplier,
    );
    const isMidAirCatch = airborne || fly.pos.y - this.spiderPos.y > 0.72;
    const { totalReward, aerialBonus } = computeAerialCatchReward(
      baseReward,
      isMidAirCatch,
    );

    let caughtShape: PatternShape | null = null;
    if (fly.caughtPatternId) {
      const pat = this.patternById.get(fly.caughtPatternId);
      if (pat) {
        caughtShape = pat.shape;
        if (pat.shape !== 'decoy') {
          pat.durability = Math.max(12, pat.durability - 22);
        }
      }
    }

    this.silk = Math.min(this.maxSilk, this.silk + totalReward);
    this.fliesCaught++;
    if (aerialBonus > 0) this.aerialCatches++;
    this.caughtSpecies[fly.species]++;
    this.composure = Math.min(this.maxComposure, this.composure + 1);

    const dewStep = stepDewQuest(this.dewQuest, fly.species, caughtShape);
    this.dewQuest = dewStep.next;
    if (dewStep.justCompleted) {
      this.silk = Math.min(this.maxSilk, this.silk + 20);
      this.burstMotes(this.spiderPos, 24, 0.36);
    }

    // Quick predatory lunge snap / aerial pounce toward caught fly
    _v1.subVectors(fly.pos, this.spiderPos).setY(0);
    if (_v1.lengthSq() > 0.04) {
      this.spiderYaw = Math.atan2(_v1.x, _v1.z);
      _v1.normalize().multiplyScalar(aerialBonus > 0 ? 4.1 : 2.8);
      this.knockbackVel.copy(_v1);
    }
    if (aerialBonus > 0 && this.spiderVelY < 2.4) {
      this.spiderVelY = 2.4;
    }
    this.spiderSquashY = aerialBonus > 0 ? 1.28 : 1.2;

    this.sound.playFlyCapture(aerialBonus > 0);
    this.hitstopTimer = this.settings.reducedEffects ? 0 : aerialBonus > 0 ? 0.048 : 0.035;
    this.burstMotes(fly.pos, aerialBonus > 0 ? 18 : 14, aerialBonus > 0 ? 0.34 : 0.28);

    this.scene.remove(fly.rig.root);
    this.flies.splice(bestIdx, 1);

    if (dewStep.justCompleted) {
      this.setWhisper('moon', 'dew_quest_complete', undefined, 6.5);
    } else if (dewStep.progressed) {
      const doneCount =
        (this.dewQuest.fatbellyTriangle ? 1 : 0) +
        (this.dewQuest.nimbleStar ? 1 : 0) +
        (this.dewQuest.greenieCircle ? 1 : 0);
      this.setWhisper('uspokh', 'dew_quest_progress', { count: doneCount, total: 3 }, 4.8);
    } else if (fly.species === 'tearbearer') {
      this.setWhisper('pavutin', 'tearbearer_caught', { amount: totalReward }, 5);
      if (this.chapter === 'ch1_threads') {
        this.advanceToChapter2();
      }
    } else if (aerialBonus > 0) {
      this.setWhisper('pavutin', 'aerial_catch', { amount: totalReward }, 4.2);
    } else {
      this.setWhisper('pavutin', 'fly_caught', { amount: totalReward }, 3.5);
    }

    if (this.chapter === 'ch1_threads' && this.silk >= 60) {
      this.advanceToChapter2();
    } else if (this.chapter === 'ch3_great_pattern') {
      const check = checkGreatPatternComplete(this.strands, this.silk, 100);
      if (check.ready) {
        this.triggerChapter3Victory();
      }
    }

    this.pushHud(true);
    return true;
  }

  private advanceToChapter2(): void {
    if (this.chapter !== 'ch1_threads') return;
    this.chapter = 'ch2_wasp';
    this.waspState = 'patrol';
    this.waspTimer = 0;
    this.waspPos.set(12, 4.2, -7);
    this.wasp.root.visible = true;
    this.setWhisper('uspokh', 'wasp_incoming', undefined, 8);
    this.pushHud(true);
  }

  private createStrandMesh(
    a: Vec3,
    b: Vec3,
    isBearing?: boolean,
    isDecoy?: boolean,
  ): void {
    const pA = new THREE.Vector3(a.x, a.y, a.z);
    const pB = new THREE.Vector3(b.x, b.y, b.z);
    const mid = pA.clone().lerp(pB, 0.5);
    mid.y -= Math.min(0.55, pA.distanceTo(pB) * 0.055);
    const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
    const geo = new THREE.TubeGeometry(curve, 14, isBearing ? 0.036 : 0.019, 6, false);
    const mat = new THREE.MeshPhysicalMaterial({
      color: isDecoy ? 0xffe6aa : isBearing ? 0xf2f8ff : 0xe4f1ff,
      emissive: isDecoy ? 0xd98f24 : isBearing ? 0x7ec0ff : 0x5d9eff,
      emissiveIntensity: isBearing ? 1.55 : isDecoy ? 1.15 : 0.96,
      transparent: true,
      opacity: isBearing ? 0.92 : 0.82,
      roughness: 0.08,
      metalness: 0.12,
      sheen: 0.92,
      sheenColor: new THREE.Color(0xdaf0ff),
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    this.webMeshes.push(mesh);
    this.disposableWebGeos.push(geo);
    this.disposableWebMats.push(mat);
    this.webPulseEntries.push({
      mat,
      baseEmissive: mat.emissiveIntensity,
      baseOpacity: mat.opacity,
      phase: this.webPulseEntries.length * 0.85,
      group: mesh,
    });
  }

  private createClosedWebMesh(
    positions: Vec3[],
    shape: PatternShape,
    patternId?: string,
  ): void {
    const center = new THREE.Vector3();
    positions.forEach((p) => center.add(new THREE.Vector3(p.x, p.y, p.z)));
    center.divideScalar(positions.length);

    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    const dews: THREE.Vector3[] = [];
    const ringRatios = shape === 'decoy' ? [0.25, 0.48, 0.72, 0.92] : [0.32, 0.62, 0.88];
    for (let i = 0; i < positions.length; i++) {
      const p = new THREE.Vector3(positions[i].x, positions[i].y, positions[i].z);
      segs.push([center, p]);
      if (shape === 'star') {
        const opp = positions[(i + 2) % positions.length];
        segs.push([p, new THREE.Vector3(opp.x, opp.y, opp.z)]);
      }
    }
    for (const r of ringRatios) {
      for (let i = 0; i < positions.length; i++) {
        const p1 = positions[i];
        const p2 = positions[(i + 1) % positions.length];
        const a = center.clone().lerp(new THREE.Vector3(p1.x, p1.y, p1.z), r);
        const b = center.clone().lerp(new THREE.Vector3(p2.x, p2.y, p2.z), r);
        segs.push([a, b]);
        dews.push(a);
      }
    }

    const baseColor =
      shape === 'decoy'
        ? 0xffd77e
        : shape === 'circle'
          ? 0xc4fff0
          : shape === 'star'
            ? 0xd6e8ff
            : 0xf0f7ff;
    const emissiveColor =
      shape === 'decoy'
        ? 0xcc821c
        : shape === 'circle'
          ? 0x4fd2ad
          : shape === 'star'
            ? 0x6baeff
            : 0x72b6ff;

    const strandGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
    const strandMat = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity: 1.12,
      transparent: true,
      opacity: 0.82,
      roughness: 0.08,
      metalness: 0.12,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xe6f4ff),
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const strandInst = new THREE.InstancedMesh(strandGeo, strandMat, segs.length);
    const upAxis = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    segs.forEach(([a, b], idx) => {
      dir.subVectors(b, a);
      const len = Math.max(0.001, dir.length());
      mid.addVectors(a, b).multiplyScalar(0.5);
      quat.setFromUnitVectors(upAxis, dir.normalize());
      _dummy.position.copy(mid);
      _dummy.quaternion.copy(quat);
      _dummy.scale.set(1, len, 1);
      _dummy.updateMatrix();
      strandInst.setMatrixAt(idx, _dummy.matrix);
    });
    strandInst.computeBoundingSphere();

    const dewGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const dewMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: emissiveColor,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.88,
      roughness: 0.04,
      clearcoat: 1.0,
    });
    const dewInst = new THREE.InstancedMesh(dewGeo, dewMat, dews.length);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(1);
    dews.forEach((d, idx) => {
      _dummy.position.copy(d);
      _dummy.updateMatrix();
      dewInst.setMatrixAt(idx, _dummy.matrix);
    });
    dewInst.computeBoundingSphere();

    const webGroup = new THREE.Group();
    webGroup.add(strandInst, dewInst);
    this.scene.add(webGroup);
    this.webMeshes.push(webGroup);
    this.disposableWebGeos.push(strandGeo, dewGeo);
    this.disposableWebMats.push(strandMat, dewMat);
    const phase = this.webPulseEntries.length * 0.7;
    this.webPulseEntries.push(
      {
        mat: strandMat,
        baseEmissive: strandMat.emissiveIntensity,
        baseOpacity: strandMat.opacity,
        phase,
        patternId,
        group: webGroup,
      },
      {
        mat: dewMat,
        baseEmissive: dewMat.emissiveIntensity,
        baseOpacity: dewMat.opacity,
        phase: phase + 0.5,
        patternId,
        group: webGroup,
      },
    );
  }

  private spawnAmbientFly(species: FlySpecies, pos: THREE.Vector3): void {
    if (this.flies.length >= 9) return;
    const rig = createFlyModel(species, this.textures);
    rig.root.position.copy(pos);
    this.scene.add(rig.root);
    const diffMult = this.settings.difficulty === 'hard' ? 0.78 : this.settings.difficulty === 'eclipse' ? 0.65 : 1.0;
    this.flies.push({
      id: `fly_${Date.now()}_${Math.random()}`,
      species,
      rig,
      pos: pos.clone(),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        0,
        (Math.random() - 0.5) * 1.4,
      ),
      caughtPatternId: null,
      escapeTimer: (species === 'nimble' ? 9 : 14) * diffMult,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private burstMotes(origin: THREE.Vector3, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < this.motes.length; attempt++) {
        const idx = (this.moteCursor + attempt) % this.motes.length;
        if (!this.motes[idx].ambient) {
          const m = this.motes[idx];
          m.active = true;
          m.pos.copy(origin);
          m.vel.set(
            (Math.random() - 0.5) * speed * 6,
            0.35 + Math.random() * speed * 4,
            (Math.random() - 0.5) * speed * 6,
          );
          m.life = 0;
          m.maxLife = 0.7 + Math.random() * 0.7;
          m.scale = 0.8 + Math.random() * 0.7;
          this.moteCursor = (idx + 1) % this.motes.length;
          break;
        }
      }
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastFrameMs) / 1000);
    this.lastFrameMs = now;
    const dt = Math.min(rawDt, 0.05);
    this.simElapsed = (now - this.startTimeMs) / 1000;
    const elapsed = this.simElapsed;

    if (this.screen === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.elapsedSeconds += dt;
        this.stepSimulation(dt, elapsed);
      }
      this.updateGameplayCamera(dt);
      this.sound.updateAmbience({
        active: true,
        isTitle: false,
        zone: this.currentZone,
        isGusty: this.weather === 'gusty',
        hiddenInNettle: this.hiddenInNettle,
      });
    } else if (this.screen === 'title') {
      this.stepAmbientVisuals(dt, elapsed);
      this.updateTitleCamera(elapsed);
      this.sound.updateAmbience({
        active: true,
        isTitle: true,
        zone: 'log',
        isGusty: false,
        hiddenInNettle: false,
      });
    } else {
      this.sound.updateAmbience({
        active: false,
        isTitle: false,
        zone: this.currentZone,
        isGusty: false,
        hiddenInNettle: false,
      });
    }

    this.updateHeroRimLight(elapsed);

    this.world.windTimeUniform.value = elapsed;
    this.world.windStrengthUniform.value =
      Math.max(0.24, this.windStrength) + Math.sin(elapsed * 0.95) * 0.08;
    this.world.pondWaterUniforms.uTime.value = elapsed;
    this.world.pondWaterUniforms.uWindStrength.value = this.world.windStrengthUniform.value;
    this.world.pondMistUniforms.uTime.value = elapsed;

    // Animate green firefly light cores drifting gently above the left pond mist
    this.world.pondFireflyPositions[0].set(
      -9.4 + Math.sin(elapsed * 0.75) * 1.15,
      POND_WATER_Y + 0.65 + Math.sin(elapsed * 1.45) * 0.22,
      -2.0 + Math.cos(elapsed * 0.62) * 1.35,
    );
    this.world.pondFireflyPositions[1].set(
      -11.2 + Math.cos(elapsed * 0.68) * 1.1,
      POND_WATER_Y + 0.85 + Math.cos(elapsed * 1.32) * 0.24,
      0.8 + Math.sin(elapsed * 0.8) * 1.45,
    );
    this.world.pondFireflyPositions[2].set(
      -8.6 + Math.sin(elapsed * 0.92 + 1.4) * 0.95,
      POND_WATER_Y + 0.58 + Math.sin(elapsed * 1.6 + 0.7) * 0.18,
      2.3 + Math.cos(elapsed * 0.74) * 1.1,
    );
    this.world.pondFireflyLight.position.copy(this.world.pondFireflyPositions[0]);
    this.world.pondFireflyLight.intensity = 2.1 + Math.sin(elapsed * 2.4) * 0.55;
    this.world.pantryLight.intensity =
      2.15 + Math.sin(elapsed * 3.1) * 0.14 + Math.cos(elapsed * 5.7) * 0.08;

    const gustBoost = this.weather === 'gusty' ? 0.24 : 0.1;
    for (let i = 0; i < this.webPulseEntries.length; i++) {
      const entry = this.webPulseEntries[i];
      let durFactor = 1.0;
      if (entry.patternId) {
        const pat = this.patternById.get(entry.patternId);
        if (!pat) {
          if (entry.group) entry.group.visible = false;
          continue;
        }
        if (entry.group) entry.group.visible = true;
        durFactor = Math.max(0.25, pat.durability / pat.maxDurability);
      }
      const shimmer = Math.sin(elapsed * 2.15 + entry.phase) * gustBoost;
      entry.mat.emissiveIntensity =
        entry.baseEmissive * (0.38 + 0.62 * durFactor) + shimmer;
      entry.mat.opacity = entry.baseOpacity * (0.42 + 0.58 * durFactor);
    }

    if (this.world.moonBeamsGroup.visible) {
      this.world.moonBeamMat.opacity = 0.036 + Math.sin(elapsed * 0.55) * 0.012;
    }

    const mistMat = this.world.mistInstances.material as THREE.MeshStandardMaterial;
    mistMat.opacity = 0.2 + Math.sin(elapsed * 0.55) * 0.035;
    this.animateUspokh(elapsed);
    this.updateMotes(dt, elapsed);
    this.updateWindStreaks(dt, elapsed);

    if (_lastLodCamPos.distanceToSquared(this.camera.position) > 0.06) {
      _lastLodCamPos.copy(this.camera.position);
      for (let i = 0; i < this.world.lodRocks.length; i++) {
        this.world.lodRocks[i].update(this.camera);
      }
    }

    if (this.bokehPass.enabled) {
      const spiderCamDist = this.camera.position.distanceTo(this.spiderPos);
      const targetFocus =
        this.screen === 'title'
          ? 7.2
          : computeMacroFocusDistance(
              spiderCamDist,
              this.nearestFlyCamDist,
              this.nearestFlyDist,
            );
      const focusUniform = (this.bokehPass.uniforms as Record<string, THREE.IUniform>)['focus'];
      if (focusUniform) {
        focusUniform.value += (targetFocus - (focusUniform.value as number)) * Math.min(1, dt * 8);
      }
    }

    if (this.screen !== 'playing') {
      this.sound.updateFlyBuzz({
        active: false,
        nearestDistance: Infinity,
        isCaught: false,
        elapsed,
      });
    }

    if (this.isSoftwareGl || !this.bloomPass.enabled) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }

    if (!this.isSoftwareGl && !this.perfDownscaled && this.screen === 'playing') {
      this.perfFrameAccum += rawDt;
      this.perfFrameCount++;
      if (this.perfFrameCount >= 45) {
        const avgDt = this.perfFrameAccum / this.perfFrameCount;
        this.perfFrameAccum = 0;
        this.perfFrameCount = 0;
        const curPr = this.renderer.getPixelRatio();
        if (avgDt > 0.0285 && curPr > 1.05) {
          const nextPr = Math.max(1.0, Number((curPr - 0.15).toFixed(2)));
          this.renderer.setPixelRatio(nextPr);
          this.composer?.setPixelRatio(nextPr);
          const w = Math.max(1, this.container.clientWidth);
          const h = Math.max(1, this.container.clientHeight);
          this.world.pondWaterUniforms.uResolution.value.set(w * nextPr, h * nextPr);
          this.perfDownscaled = true;
        }
      }
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private surfaceHeightAt(x: number, z: number): number {
    return computeSurfaceHeight(x, z, this.world.colliders);
  }

  private stepSimulation(dt: number, elapsed: number): void {
    if (this.victoryDelayTimer > 0) {
      this.victoryDelayTimer -= dt;
      if (this.victoryDelayTimer <= 0) {
        this.victoryDelayTimer = -1;
        this.outcome = 'victory';
        this.screen = 'gameover';
        document.body.dataset.state = 'gameover';
        this.sound.silenceLoops();
        this.pushHud(true);
        return;
      }
    }

    const diffCfg = DIFFICULTY_CONFIGS[this.settings.difficulty];

    // 1. Weather cycle + Chapter 3 wind warning telegraph
    this.weatherTimer += dt;
    if (this.chapter === 'ch3_great_pattern') {
      const period = 18;
      const cycle = this.weatherTimer % period;
      const calmThreshold = period * (1 - diffCfg.windGustDurationRatio);
      this.weather = cycle > calmThreshold ? 'gusty' : 'calm';
      this.windWarning = cycle > calmThreshold - 2.8 && cycle <= calmThreshold;
      this.windStrength =
        this.weather === 'gusty'
          ? 0.72 + Math.sin(elapsed * 3.2) * 0.18
          : this.windWarning
            ? 0.38 + Math.sin(elapsed * 2.1) * 0.08
            : 0.18 + Math.sin(elapsed * 1.1) * 0.06;
    } else {
      this.weather = 'calm';
      this.windWarning = false;
      this.windStrength = 0.15 + Math.sin(elapsed * 1.2) * 0.05;
    }

    // 2. Camera rotation & Locomotion (Keyboard bindings + Virtual Touch Stick)
    if (this.keys.has('KeyJ') || this.keys.has('ArrowLeft')) {
      this.camYaw += 1.9 * dt;
    }
    if (this.keys.has('KeyL') || this.keys.has('ArrowRight')) {
      this.camYaw -= 1.9 * dt;
    }

    let moveFwd = this.touchMoveVec.y;
    let moveRight = this.touchMoveVec.x;
    const b = this.settings.bindings;
    if (isAnyBindingHeld(this.keys, b, 'moveForward')) moveFwd += 1;
    if (isAnyBindingHeld(this.keys, b, 'moveBackward')) moveFwd -= 1;
    if (isAnyBindingHeld(this.keys, b, 'moveRight')) moveRight += 1;
    if (isAnyBindingHeld(this.keys, b, 'moveLeft')) moveRight -= 1;

    // Coyote & jump buffer timers
    if (this.isGrounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      this.tryExecuteJump();
    }

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dashIFrameTimer = Math.max(0, this.dashIFrameTimer - dt);
    this.waspPostDiveCooldown = Math.max(0, this.waspPostDiveCooldown - dt);
    this.waspHitInvulnTimer = Math.max(0, this.waspHitInvulnTimer - dt);

    let isMoving = false;
    const spiderRadius = 0.42;
    this.cachedNearAnchor = this.findNearestAnchor(3.75);
    if (this.grappleActive) {
      this.grappleProgress = Math.min(1, this.grappleProgress + dt * 2.4);
      const t = this.grappleProgress;
      this.spiderPos.lerpVectors(this.grappleStart, this.grappleEnd, t);
      this.spiderPos.y += Math.sin(t * Math.PI) * 2.3;
      this.isGrounded = false;
      this.onSilkBridge = false;
      if (t >= 1) {
        this.grappleActive = false;
        resolveObstacleCollisions(this.spiderPos, spiderRadius, this.world.colliders);
        this.spiderPos.y = this.surfaceHeightAt(this.spiderPos.x, this.spiderPos.z);
        this.isGrounded = true;
        this.spiderSquashY = 0.78;
        this.sound.playLand();
        this.burstMotes(this.spiderPos, 8, 0.18);
      }
    } else {
      const prevX = this.spiderPos.x;
      const prevZ = this.spiderPos.z;
      const inLen = Math.hypot(moveFwd, moveRight);
      if (inLen > 0.04) {
        isMoving = true;
        const clampedLen = Math.min(1, inLen);
        moveFwd = (moveFwd / inLen) * clampedLen;
        moveRight = (moveRight / inLen) * clampedLen;

        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        const rightX = Math.cos(this.camYaw);
        const rightZ = -Math.sin(this.camYaw);

        const dirX = fwdX * moveFwd + rightX * moveRight;
        const dirZ = fwdZ * moveFwd + rightZ * moveRight;

        const speed = this.hiddenInNettle ? 4.3 : this.isGrounded ? 5.8 : 6.1;
        this.spiderPos.x += dirX * speed * dt;
        this.spiderPos.z += dirZ * speed * dt;

        const targetYaw = Math.atan2(dirX, dirZ);
        let diff = targetYaw - this.spiderYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.spiderYaw += diff * Math.min(1, dt * 12);
      }

      if (this.dashTimer > 0) {
        isMoving = true;
        this.spiderPos.x += this.dashDir.x * 13.5 * dt;
        this.spiderPos.z += this.dashDir.y * 13.5 * dt;
      }

      if (this.knockbackVel.lengthSq() > 0.001) {
        this.spiderPos.x += this.knockbackVel.x * dt;
        this.spiderPos.z += this.knockbackVel.z * dt;
        this.knockbackVel.multiplyScalar(Math.exp(-6 * dt));
      }

      // Solid collision resolution against trees, rocks, boulders, and Old Stump
      resolveObstacleCollisions(this.spiderPos, spiderRadius, this.world.colliders);

      // Gravity, Grounding & Silk Tightrope Walking along elevated spun strands
      const groundY = this.surfaceHeightAt(this.spiderPos.x, this.spiderPos.z);
      const bridge = computeSilkBridgeHeight(
        this.spiderPos.x,
        this.spiderPos.z,
        this.spiderPos.y,
        this.strands,
        this.anchorPosMap,
      );
      const surfaceY = bridge.height !== null ? Math.max(groundY, bridge.height) : groundY;
      const wasGrounded = this.isGrounded;

      if (!this.isGrounded || this.spiderVelY > 0.05) {
        this.spiderVelY -= 19.5 * dt;
        this.spiderPos.y += this.spiderVelY * dt;
        if (this.spiderPos.y <= surfaceY) {
          this.spiderPos.y = surfaceY;
          if (!wasGrounded && this.spiderVelY < -2.2) {
            this.spiderSquashY = 0.76;
            this.sound.playLand();
            this.burstMotes(this.spiderPos, 4, 0.12);
          }
          this.spiderVelY = 0;
          this.isGrounded = true;
        }
      } else {
        if (this.spiderPos.y - surfaceY > 0.35) {
          this.isGrounded = false;
        } else {
          this.spiderPos.y = THREE.MathUtils.damp(this.spiderPos.y, surfaceY, 16, dt);
        }
      }

      this.onSilkBridge =
        this.isGrounded && bridge.height !== null && bridge.height > groundY + 0.12;
      if (this.onSilkBridge && !this.shownBridgeHint) {
        this.shownBridgeHint = true;
        this.setWhisper('pavutin', 'silk_bridge', undefined, 5.5);
      }

      if (this.isGrounded && isMoving) {
        this.walkDistance += Math.hypot(
          this.spiderPos.x - prevX,
          this.spiderPos.z - prevZ,
        );
        const stepPhase = Math.floor(this.walkDistance * 2.75);
        if (stepPhase !== this.lastStepPhase) {
          this.lastStepPhase = stepPhase;
          if (this.onSilkBridge) {
            this.sound.playSilkStep();
            this.burstMotes(this.spiderPos, 2, 0.08);
          } else {
            this.sound.playGrassStep(this.hiddenInNettle, this.currentZone);
          }
        }
      }
    }

    // Advance pattern durability wear & calm moon-dew regeneration
    const windDecayScale = this.dewQuest.completed ? 0.65 : 1.0;
    if (stepPatternDurability(this.patterns, dt, this.weather === 'gusty', windDecayScale)) {
      this.patternById.clear();
      for (let i = 0; i < this.patterns.length; i++) {
        this.patternById.set(this.patterns[i].id, this.patterns[i]);
      }
    }
    const dewRegen = stepWebDewRegeneration({
      patterns: this.patterns,
      dt,
      isCalm: this.weather === 'calm',
      dewTempered: this.dewQuest.completed,
      accumulator: this.dewRegenAccumulator,
      silk: this.silk,
      maxSilk: this.maxSilk,
    });
    this.dewRegenAccumulator = dewRegen.nextAccumulator;
    if (dewRegen.silkGained > 0) {
      this.silk = Math.min(this.maxSilk, this.silk + dewRegen.silkGained);
    }

    // 3. Location Zone & Nettle Stealth Cover (squared-distance check)
    let inNettle = false;
    for (let i = 0; i < this.world.nettleZones.length; i++) {
      const nz = this.world.nettleZones[i];
      const dx = this.spiderPos.x - nz.x;
      const dz = this.spiderPos.z - nz.z;
      if (dx * dx + dz * dz <= nz.radius * nz.radius) {
        inNettle = true;
        break;
      }
    }
    this.hiddenInNettle = inNettle;
    this.currentZone = detectLocationZone(this.spiderPos, this.world.nettleZones);

    // 4. Chapter progression
    if (this.chapter === 'ch1_threads' && this.spiderPos.z < -8.5 && this.silk >= 50) {
      this.advanceToChapter2();
    }

    // 5. Fear & Wasp AI
    const fearState = computeFearState({
      spiderPos: this.spiderPos,
      waspPos: this.waspPos,
      waspState: this.waspState,
      isHiddenInNettle: this.hiddenInNettle,
      isMoving,
      windStrength: this.windStrength,
    });
    this.fear = Math.round(fearState.intensity * 100);

    // Passive calm composure recovery while safely hidden or out of danger
    const underSnagCover =
      !isMoving &&
      Math.abs(this.spiderPos.x) < 4.3 &&
      Math.abs(this.spiderPos.z - 0.3) < 1.35 &&
      this.spiderPos.y < 1.05;
    if (
      this.waspState !== 'dive' &&
      this.fear < 14 &&
      this.composure < this.maxComposure
    ) {
      this.calmRegenTimer += dt * (inNettle || underSnagCover ? 1.5 : 1.0);
      if (this.calmRegenTimer >= 18) {
        this.composure = Math.min(this.maxComposure, this.composure + 1);
        this.calmRegenTimer = 0;
        this.pushHud(true);
      }
    } else if (this.waspState === 'dive') {
      this.calmRegenTimer = 0;
    }

    const nearestDecoy = this.patterns.find((p) => p.shape === 'decoy')?.center || null;
    const prevWaspState = this.waspState;
    const isDodging =
      this.dashIFrameTimer > 0 ||
      (!this.isGrounded && this.spiderPos.y > this.waspPos.y + 0.45);
    const aiStep = stepWaspAI({
      state: this.waspState,
      stateTimer: this.waspTimer,
      dt,
      spiderPos: this.spiderPos,
      waspPos: this.waspPos,
      isHiddenInNettle: this.hiddenInNettle,
      isMoving,
      isDodging,
      leafRippleRisk: fearState.leafRippleRisk,
      nearestDecoyPos: nearestDecoy,
      chapter: this.chapter,
      detectionScale: diffCfg.waspDetectionScale,
      diveHitCommitted: this.waspDiveHitCommitted,
      postDiveCooldown: this.waspPostDiveCooldown,
      diveTargetPos: this.waspState === 'dive' ? this.waspDiveTarget : null,
    });
    this.waspState = aiStep.nextState;
    this.waspTimer = aiStep.nextTimer;

    if (prevWaspState !== this.waspState) {
      this.onWaspStateChanged(prevWaspState, this.waspState, isMoving);
    }
    if (aiStep.dodgedDive) {
      this.waspPostDiveCooldown = 4.2;
      this.silk = Math.min(this.maxSilk, this.silk + 5);
      this.setWhisper('pavutin', 'wasp_dodged', undefined, 4.2);
      this.burstMotes(this.spiderPos, 8, 0.2);
    }
    if (aiStep.triggeredDiveHit && this.waspHitInvulnTimer <= 0) {
      this.waspDiveHitCommitted = true;
      this.waspHitInvulnTimer = 2.6;
      this.waspPostDiveCooldown = 4.2;
      this.onWaspKnocksPavutin();
    }

    this.waspWebSlowTimer = Math.max(0, this.waspWebSlowTimer - dt);
    if (
      this.waspState !== 'absent' &&
      this.waspState !== 'departed' &&
      this.waspState !== 'lured' &&
      this.waspWebSlowTimer <= 0 &&
      isWaspSnaredInWeb(this.waspPos, this.patterns)
    ) {
      this.waspWebSlowTimer = 4.2;
      this.sound.playSilkPluck(2.2);
      this.burstMotes(this.waspPos, 8, 0.22);
      this.setWhisper('pavutin', 'wasp_web_snared', undefined, 3.8);
    }

    const effectiveWaspSpeed =
      diffCfg.waspSpeedScale * (this.waspWebSlowTimer > 0 ? 0.78 : 1.0);
    this.stepWaspMotion(dt, elapsed, nearestDecoy, effectiveWaspSpeed);
    this.sound.updateWaspBuzz({
      active: this.waspState !== 'absent' && this.waspState !== 'departed',
      distance: this.waspPos.distanceTo(this.spiderPos),
      hiddenInNettle: this.hiddenInNettle,
      hearingMultiplier: fearState.hearingMultiplier,
      isDiving: this.waspState === 'dive',
    });

    // 6. Flies AI & Flight Wings + Combat Stance / Spatial Fly Buzz
    this.stepFlies(dt, elapsed);

    let closestFlyD = Infinity;
    let closestFlyCamD: number | null = null;
    let closestCaught = false;
    for (let i = 0; i < this.flies.length; i++) {
      const f = this.flies[i];
      const d = f.pos.distanceTo(this.spiderPos);
      if (d < closestFlyD) {
        closestFlyD = d;
        closestFlyCamD = this.camera.position.distanceTo(f.pos);
        closestCaught = Boolean(f.caughtPatternId);
      }
    }
    this.nearestFlyDist = closestFlyD;
    this.nearestFlyCamDist = closestFlyCamD;
    this.nearestFlyCaught = closestCaught;

    const targetCombat = computeCombatStanceBlend(this.nearestFlyDist, this.isGrounded);
    this.combatStanceBlend = THREE.MathUtils.damp(this.combatStanceBlend, targetCombat, 9.5, dt);

    this.sound.updateFlyBuzz({
      active: true,
      nearestDistance: this.nearestFlyDist,
      isCaught: this.nearestFlyCaught,
      elapsed,
    });

    // 7. Animate Pavutin 8-leg rig + squash/stretch + automatic hunting stance
    this.animatePavutin(dt, elapsed, isMoving);

    // 8. Targeting spores & trailing spinneret filament
    this.updateTargetingVisuals(elapsed);
    if (this.whisperTimer > 0) this.whisperTimer -= dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.4);

    // 9. Gentle pulse on active twig dewdrop
    this.world.anchorMeshes.forEach((mesh, id) => {
      const isActive = this.activeThreadFrom?.id === id;
      const scale = isActive ? 1.32 + Math.sin(elapsed * 5) * 0.14 : 1.0;
      mesh.scale.set(0.88 * scale, 1.32 * scale, 0.88 * scale);
    });

    if (elapsed - this.lastHudPush > 0.1) {
      this.pushHud(false);
    }
  }

  private onWaspStateChanged(prev: WaspState, next: WaspState, isMoving = false): void {
    if (next === 'perch') {
      this.setWhisper('uspokh', 'wasp_perch', undefined, 5.5);
    } else if (next === 'lured') {
      this.setWhisper('pavutin', 'wasp_lured', undefined, 5);
    } else if (next === 'departed' && prev === 'lured') {
      const idx = this.patterns.findIndex((p) => p.shape === 'decoy');
      if (idx !== -1) {
        const [removed] = this.patterns.splice(idx, 1);
        if (removed) this.patternById.delete(removed.id);
      }

      if (!this.hasGrapple) {
        this.hasGrapple = true;
        this.chapter = 'ch3_great_pattern';
        this.setWhisper('uspokh', 'wasp_departed_grapple', undefined, 9);
      } else {
        this.setWhisper('pavutin', 'wasp_departed_quick', undefined, 4);
      }
    } else if (next === 'investigate') {
      if (!this.shownStillStealthHint) {
        this.shownStillStealthHint = true;
        this.setWhisper('uspokh', 'still_stealth', undefined, 5);
      } else {
        this.setWhisper('pavutin', 'wasp_investigate', undefined, 4);
      }
    } else if (next === 'dive') {
      this.waspDiveTarget.copy(this.spiderPos);
      this.waspDiveHitCommitted = false;
      this.sound.playWaspDiveTelegraph();
    } else if (next === 'patrol' && prev === 'investigate' && (!isMoving || this.hiddenInNettle)) {
      this.setWhisper('pavutin', 'wasp_lost_sight', undefined, 4.5);
    }
    this.wasp.root.visible = next !== 'absent' && next !== 'departed';
  }

  private onWaspKnocksPavutin(): void {
    this.hitstopTimer = this.settings.reducedEffects ? 0 : 0.06;
    this.trauma = this.settings.reducedEffects ? 0 : 0.8;
    this.composure = Math.max(0, this.composure - 1);
    this.activeThreadFrom = null;
    this.trailingFilamentMesh.visible = false;
    this.sound.playSnapWarning();

    _v1
      .subVectors(this.spiderPos, this.waspPos)
      .setY(0)
      .normalize()
      .multiplyScalar(7.5);
    this.knockbackVel.copy(_v1);

    const outcome = resolveOutcome({
      chapter: this.chapter,
      composure: this.composure,
    });
    if (outcome === 'retreat') {
      this.outcome = 'retreat';
      this.screen = 'gameover';
      document.body.dataset.state = 'gameover';
      this.sound.silenceLoops();
    } else {
      this.setWhisper('uspokh', 'wasp_knockback', undefined, 5);
    }
    this.pushHud(true);
  }

  private stepWaspMotion(
    dt: number,
    elapsed: number,
    nearestDecoy: Vec3 | null,
    speedScale: number,
  ): void {
    if (this.waspState === 'absent' || this.waspState === 'departed') {
      this.wasp.root.visible = false;
      return;
    }
    this.wasp.root.visible = true;

    const target = _v1;
    if (this.waspState === 'patrol') {
      this.waspAngle += dt * 0.42 * speedScale;
      const centerX = this.chapter === 'ch3_great_pattern' ? 6.5 : 3.5;
      const centerZ = this.chapter === 'ch3_great_pattern' ? -8.5 : -4.5;
      target.set(
        centerX + Math.cos(this.waspAngle) * 7.2,
        groundHeightAt(centerX, centerZ) + 2.8 + Math.sin(elapsed * 2.1) * 0.35,
        centerZ + Math.sin(this.waspAngle * 1.2) * 6.5,
      );
    } else if (this.waspState === 'perch') {
      target.set(3.8, groundHeightAt(3.8, -5.5) + 2.4, -5.5);
    } else if (this.waspState === 'lured' && nearestDecoy) {
      target.set(
        nearestDecoy.x,
        nearestDecoy.y + 1.15 + Math.sin(elapsed * 4) * 0.15,
        nearestDecoy.z,
      );
    } else if (this.waspState === 'investigate') {
      target.set(
        this.spiderPos.x + Math.sin(elapsed * 2) * 1.4,
        this.spiderPos.y + 2.1,
        this.spiderPos.z + Math.cos(elapsed * 2) * 1.4,
      );
    } else if (this.waspState === 'dive') {
      if (this.waspTimer < 0.58) {
        // Hover lock-on windup high above the committed target point
        target.set(
          this.waspDiveTarget.x,
          this.waspDiveTarget.y + 2.55,
          this.waspDiveTarget.z,
        );
      } else {
        // Committed swoop toward the telegraphed impact point
        target.set(
          this.waspDiveTarget.x,
          this.waspDiveTarget.y + 0.55,
          this.waspDiveTarget.z,
        );
      }
    }

    _v2.subVectors(target, this.waspPos);
    const dist = _v2.length();
    if (dist > 0.05) {
      _v2.normalize();
      const speed =
        (this.waspState === 'dive'
          ? this.waspTimer < 0.58
            ? 6.4
            : 12.2
          : 5.4) * speedScale;
      this.waspPos.addScaledVector(_v2, Math.min(dist, speed * dt));
      this.wasp.root.rotation.y = Math.atan2(_v2.x, _v2.z);
    }
    this.wasp.root.position.copy(this.waspPos);

    // Figure-8 wing stroke + iridescent flight blur fans + abdomen & antennae animation
    const isPerched = this.waspState === 'perch';
    const isDiving = this.waspState === 'dive';
    const strokeFreq = isDiving ? 72 : isPerched ? 12 : 56;
    const strokeAmp = isPerched ? 0.08 : isDiving ? 0.65 : 0.52;
    const stroke = Math.sin(elapsed * strokeFreq) * strokeAmp;
    const pitchTwist = Math.cos(elapsed * strokeFreq) * (isPerched ? 0.04 : 0.36);

    this.wasp.forewings[0].rotation.y = stroke;
    this.wasp.forewings[1].rotation.y = -stroke;
    this.wasp.forewings[0].rotation.x = -Math.PI / 2 + pitchTwist;
    this.wasp.forewings[1].rotation.x = -Math.PI / 2 + pitchTwist;

    this.wasp.hindwings[0].rotation.y = stroke * 0.85;
    this.wasp.hindwings[1].rotation.y = -stroke * 0.85;

    this.wasp.blurFans[0].visible = !isPerched;
    this.wasp.blurFans[1].visible = !isPerched;
    if (!isPerched) {
      this.wasp.blurMat.opacity = 0.25 + Math.abs(Math.cos(elapsed * 32)) * 0.22;
    }

    const wingEmissive = isDiving
      ? 0xc43a18
      : this.waspState === 'investigate'
        ? 0x9c5a18
        : 0x5c441c;
    this.wasp.wingMat.emissive.setHex(wingEmissive);
    this.wasp.blurMat.emissive.setHex(wingEmissive);

    // Menacing gaster curve & antennae twitch
    this.wasp.abdomen.rotation.x = isDiving
      ? -0.45
      : -0.1 + Math.sin(elapsed * 4.5) * 0.06;
    this.wasp.antennae[0].rotation.x = Math.sin(elapsed * 9) * 0.14;
    this.wasp.antennae[1].rotation.x = -Math.sin(elapsed * 9) * 0.14;

    if (isDiving) {
      const gy = groundHeightAt(this.waspDiveTarget.x, this.waspDiveTarget.z);
      this.wasp.shadowDisc.position.set(
        this.waspDiveTarget.x - this.waspPos.x,
        -(this.waspPos.y - gy) + 0.03,
        this.waspDiveTarget.z - this.waspPos.z,
      );
      this.wasp.shadowDisc.scale.setScalar(1.75 + Math.sin(elapsed * 16) * 0.22);
      this.wasp.shadowDiscMat.color.setHex(0xff5e36);
    } else {
      const gy = groundHeightAt(this.waspPos.x, this.waspPos.z);
      const hAbove = this.waspPos.y - gy;
      this.wasp.shadowDisc.position.set(0, -hAbove + 0.03, 0);
      const isInvestigating = this.waspState === 'investigate';
      this.wasp.shadowDisc.scale.setScalar(
        isInvestigating ? 1.42 + Math.sin(elapsed * 12) * 0.12 : 1.0,
      );
      this.wasp.shadowDiscMat.color.setHex(isInvestigating ? 0xffb65c : 0xffffff);
    }
  }

  private stepFlies(dt: number, elapsed: number): void {
    this.flySpawnTimer += dt;
    if (this.flySpawnTimer > 5.5 && this.flies.length < 6) {
      this.flySpawnTimer = 0;
      const pool: FlySpecies[] = ['greenie', 'nimble', 'fatbelly'];
      const sp = pool[Math.floor(Math.random() * pool.length)];
      const pat =
        this.patterns.length > 0
          ? this.patterns[Math.floor(Math.random() * this.patterns.length)]
          : null;
      const base = pat
        ? new THREE.Vector3(pat.center.x, pat.center.y + 1.5, pat.center.z)
        : new THREE.Vector3((Math.random() - 0.5) * 14, 1.8, -Math.random() * 12);
      this.spawnAmbientFly(sp, base);
    }

    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      f.phase += dt * 18;

      if (!this.isGrounded && f.pos.distanceTo(this.spiderPos) < 1.88) {
        this.tryHarvestNearbyFly(true, f);
        continue;
      }

      if (f.caughtPatternId && f.pos.distanceTo(this.spiderPos) < 1.35) {
        this.tryHarvestNearbyFly(false, f);
        continue;
      }

      f.rig.silkWrapMesh.visible = Boolean(f.caughtPatternId);
      let flyGroundY: number | null = null;
      if (f.caughtPatternId) {
        f.rig.silkWrapMesh.rotation.z = f.phase * 0.4;
        const pat = this.patternById.get(f.caughtPatternId);
        if (!pat) {
          f.caughtPatternId = null;
          f.rig.silkWrapMesh.visible = false;
          continue;
        }
        f.pos.set(
          pat.center.x + Math.sin(f.phase * 1.4) * 0.25,
          pat.center.y + 0.25 + Math.cos(f.phase * 2.1) * 0.12,
          pat.center.z + Math.cos(f.phase * 1.1) * 0.25,
        );
        f.rig.body.rotation.z = Math.sin(f.phase * 2.4) * 0.35;
        f.escapeTimer -= dt;
        if (f.escapeTimer <= 0 && f.species === 'nimble') {
          f.caughtPatternId = null;
          f.rig.silkWrapMesh.visible = false;
          f.vel.set(2.5, 1.2, -2.5);
        }
      } else {
        let targetPat: WovenPattern | null = null;
        let bestDist = 999;
        for (const pat of this.patterns) {
          if (pat.shape === 'decoy') continue;
          const affinity = computePatternSpeciesAffinity(pat.shape, f.species);
          const effRadius = pat.lureRadius * affinity;
          const d = Math.hypot(f.pos.x - pat.center.x, f.pos.z - pat.center.z);
          if (d < effRadius && d < bestDist) {
            bestDist = d;
            targetPat = pat;
          }
        }

        if (targetPat) {
          _v1.set(targetPat.center.x, targetPat.center.y + 0.35, targetPat.center.z).sub(f.pos);
          if (_v1.length() < 0.75) {
            f.caughtPatternId = targetPat.id;
            f.escapeTimer =
              (f.species === 'nimble' ? 9 : 14) * (0.65 + targetPat.strength * 0.7);
          } else {
            const pullSpeed =
              2.8 * computePatternSpeciesAffinity(targetPat.shape, f.species);
            _v1.normalize().multiplyScalar(pullSpeed);
            f.vel.lerp(_v1, dt * 3.5);
          }
        } else if (f.species === 'tearbearer') {
          _v1.set(1.2, 1.4, -10.5).sub(f.pos);
          if (_v1.length() > 1.5) {
            _v1.normalize().multiplyScalar(2.1);
            f.vel.lerp(_v1, dt * 2.0);
          } else {
            f.vel.set(Math.sin(elapsed) * 0.8, 0, Math.cos(elapsed) * 0.8);
          }
        } else {
          // Organic erratic insect flight with smooth random heading turns
          if (Math.random() < dt * 1.4) {
            f.vel.x += (Math.random() - 0.5) * 1.6;
            f.vel.z += (Math.random() - 0.5) * 1.6;
          }
          f.vel.x += Math.sin(elapsed * 2.1 + f.phase * 1.3) * dt * 2.0;
          f.vel.z += Math.cos(elapsed * 1.8 + f.phase * 1.1) * dt * 2.0;
          f.vel.clampLength(0, 2.5);
        }

        f.pos.addScaledVector(f.vel, dt);
        f.pos.x = THREE.MathUtils.clamp(f.pos.x, -18, 18);
        f.pos.z = THREE.MathUtils.clamp(f.pos.z, -18, 10);
        flyGroundY = groundHeightAt(f.pos.x, f.pos.z);
        f.pos.y = Math.max(
          flyGroundY + 0.85,
          Math.min(flyGroundY + 2.8, f.pos.y + Math.sin(f.phase * 0.32) * dt * 0.65),
        );
        f.rig.body.rotation.z = THREE.MathUtils.clamp(-f.vel.x * 0.12, -0.28, 0.28);
      }

      f.rig.root.position.copy(f.pos);
      if (f.vel.lengthSq() > 0.05) {
        f.rig.root.rotation.y = Math.atan2(f.vel.x, f.vel.z);
      }

      // High-frequency wing stroke + pitch + flight scale shimmer
      const buzz = Math.sin(elapsed * 58 + f.phase) * 0.56;
      const wingPitch = Math.cos(elapsed * 58 + f.phase) * 0.35;
      f.rig.wings[0].rotation.y = buzz;
      f.rig.wings[1].rotation.y = -buzz;
      f.rig.wings[0].rotation.x = -Math.PI / 2 + wingPitch;
      f.rig.wings[1].rotation.x = -Math.PI / 2 + wingPitch;

      f.rig.blurFans[0].scale.y = 0.85 + Math.abs(Math.sin(elapsed * 38 + f.phase)) * 0.35;
      f.rig.blurFans[1].scale.y = f.rig.blurFans[0].scale.y;

      // Halteres gyroscopic oscillation
      f.rig.halteres[0].position.y = 0.04 + Math.cos(elapsed * 58 + f.phase) * 0.015;
      f.rig.halteres[1].position.y = 0.04 - Math.cos(elapsed * 58 + f.phase) * 0.015;

      const gy = flyGroundY ?? groundHeightAt(f.pos.x, f.pos.z);
      f.rig.shadowDisc.position.y = -(f.pos.y - gy) + 0.025;
    }
  }

  private animatePavutin(dt: number, elapsed: number, isMoving: boolean): void {
    this.pavutin.root.position.copy(this.spiderPos);
    this.pavutin.root.rotation.y = this.spiderYaw;

    this.spiderSquashY = THREE.MathUtils.damp(this.spiderSquashY, 1.0, 12, dt);
    const combat = this.combatStanceBlend;
    const stealthScaleY = this.hiddenInNettle ? 0.72 : 1.0 - combat * 0.14;
    const finalScaleY = stealthScaleY * this.spiderSquashY;
    const horizComp = 1 / Math.sqrt(Math.max(0.55, this.spiderSquashY));

    const tremble =
      this.fear > 15 ? Math.sin(elapsed * 38) * (this.fear / 100) * 0.035 : 0;

    // Gentle living full-body breathing rhythm (heave, pitch, roll & subtle thorax pulse)
    const breathPhase = elapsed * 2.25;
    const breathPulse = Math.sin(breathPhase);
    const breathHoriz = horizComp * (1 + breathPulse * 0.02 + combat * 0.04);
    const breathVert = finalScaleY * (1 - breathPulse * 0.015);

    this.pavutin.body.scale.set(breathHoriz, breathVert, breathHoriz);
    this.pavutin.body.position.x = tremble;
    this.pavutin.body.position.y =
      0.27 * finalScaleY -
      combat * 0.045 +
      breathPulse * 0.018 +
      (isMoving && this.isGrounded ? Math.abs(Math.sin(this.walkDistance * 7.5)) * 0.04 : 0);
    this.pavutin.body.rotation.x = !this.isGrounded
      ? THREE.MathUtils.clamp(-this.spiderVelY * 0.04, -0.25, 0.25)
      : breathPulse * 0.032 - combat * 0.15;
    this.pavutin.body.rotation.z = Math.sin(elapsed * 1.45) * 0.018;

    // Subtle abdomen breathing & airborne tilt
    this.pavutin.abdomen.rotation.x = !this.isGrounded
      ? THREE.MathUtils.clamp(-this.spiderVelY * 0.06, -0.35, 0.35)
      : Math.sin(breathPhase + 0.4) * 0.048 + combat * 0.14;

    // Live setae (hair) sensory vibration: vertex harmonic wave + subtle micro-rotation oscillation
    const setaeAmp = computeSetaeVibrationAmp({
      breathPulse,
      combatBlend: combat,
      fearIntensity: this.fear / 100,
      windStrength: this.windStrength,
      isGrounded: this.isGrounded,
    });
    this.pavutin.setaeUniforms.uSetaeTime.value = elapsed;
    this.pavutin.setaeUniforms.uSetaeAmp.value = setaeAmp;
    const bristleSpin = 0.012 + combat * 0.014 + (this.fear / 100) * 0.012;
    this.pavutin.abdSetaeGroup.rotation.x = Math.sin(elapsed * 6.4) * bristleSpin;
    this.pavutin.abdSetaeGroup.rotation.z = Math.cos(elapsed * 5.2) * bristleSpin * 0.85;
    this.pavutin.cephSetaeGroup.rotation.x = Math.sin(elapsed * 7.6 + 0.8) * bristleSpin * 0.9;
    this.pavutin.cephSetaeGroup.rotation.y = Math.cos(elapsed * 6.1) * bristleSpin * 0.7;

    this.idleTapSoundCooldown = Math.max(0, this.idleTapSoundCooldown - dt);
    const gaitFreq = 8.5;
    for (const leg of this.pavutin.legs) {
      if (!this.isGrounded) {
        // Dynamic airborne pounce/reach posture
        const airReach = this.spiderVelY > 0 ? -0.32 : 0.25;
        leg.hip.rotation.z = leg.side * (0.24 - airReach * 0.45);
        leg.hip.rotation.x =
          (leg.index < 2 ? -0.34 : 0.3) + Math.sin(elapsed * 14 + leg.index) * 0.08;
        leg.knee.rotation.z = leg.side * airReach * 0.35;
        leg.ankle.rotation.z = -leg.side * 0.14;
      } else {
        const phaseOffset =
          (leg.index % 2 === 0 ? 0 : Math.PI) + (leg.side === 1 ? Math.PI : 0);
        const swing = isMoving
          ? Math.sin(this.walkDistance * gaitFreq + phaseOffset)
          : Math.sin(elapsed * 2 + leg.index) * 0.05;
        const lift = isMoving
          ? Math.max(0, Math.cos(this.walkDistance * gaitFreq + phaseOffset))
          : 0;

        // Idle front-leg sensory soil tapping when Pavutin stands motionless on the ground
        const isIdleStanding = !isMoving && this.isGrounded && !this.grappleActive;
        const tapPulse = computeIdleTapPulse(elapsed, leg.index, leg.side, isIdleStanding);
        if (leg.index === 0) {
          const tapIdx = leg.side === -1 ? 0 : 1;
          const prevTap = this.lastIdleTapPulses[tapIdx];
          this.lastIdleTapPulses[tapIdx] = tapPulse;
          if (
            this.screen === 'playing' &&
            isIdleStanding &&
            prevTap >= 0.42 &&
            tapPulse < 0.42 &&
            this.idleTapSoundCooldown <= 0
          ) {
            this.sound.playPawTap();
            this.idleTapSoundCooldown = 0.42;
          }
        }

        // Combat pounce stance: front legs raise & spread defensively/predatorily, back legs brace wide
        const frontRaise =
          leg.index === 0 ? combat : leg.index === 1 ? combat * 0.45 : 0;
        const rearBrace = leg.index >= 2 ? combat * 0.22 : 0;
        const stanceJitter = frontRaise * Math.sin(elapsed * 12 + leg.side) * 0.06;

        leg.hip.rotation.z =
          leg.side * (lift * 0.26 - frontRaise * 0.46 + rearBrace * 0.12 - tapPulse * 0.24) +
          stanceJitter;
        leg.hip.rotation.x =
          swing * 0.34 - frontRaise * 0.42 + rearBrace * 0.2 - tapPulse * 0.2;
        leg.knee.rotation.z =
          leg.side * (lift * 0.22 - frontRaise * 0.24 + tapPulse * 0.28);
        leg.ankle.rotation.z =
          -leg.side * (lift * 0.16 + frontRaise * 0.18 + tapPulse * 0.24);
      }
    }

    const nearInteract =
      this.screen === 'playing' && !isMoving && this.cachedNearAnchor !== null ? 0.55 : 0;
    const palpSpeed = 3.4 + combat * 7.5 + nearInteract * 2.5;
    const palpAmp = 0.14 + combat * 0.12 + nearInteract * 0.06;
    const palpWave = Math.sin(elapsed * palpSpeed) * palpAmp;
    this.pavutin.pedipalps[0].rotation.x = palpWave - combat * 0.28 - nearInteract * 0.12;
    this.pavutin.pedipalps[1].rotation.x = -palpWave - combat * 0.28 - nearInteract * 0.12;
    this.pavutin.pedipalps[0].rotation.y = -combat * 0.24;
    this.pavutin.pedipalps[1].rotation.y = combat * 0.24;
    this.pavutin.chelicerae[0].rotation.z =
      Math.sin(elapsed * 2.2) * 0.06 - combat * 0.18;
    this.pavutin.chelicerae[1].rotation.z =
      -Math.sin(elapsed * 2.2) * 0.06 + combat * 0.18;

    // Ground contact shadow shrinks gently when spider leaps high
    const groundY = this.surfaceHeightAt(this.spiderPos.x, this.spiderPos.z);
    const heightOffGround = Math.max(0, this.spiderPos.y - groundY);
    this.pavutin.shadowDisc.position.y = -heightOffGround + 0.02;
    const shadowScale = Math.max(0.45, 1 - heightOffGround * 0.22);
    this.pavutin.shadowDisc.scale.setScalar(shadowScale);

    const silkRatio = this.silk / this.maxSilk;
    const invulnPulse =
      this.waspHitInvulnTimer > 0 || this.dashIFrameTimer > 0
        ? 0.9 + Math.abs(Math.sin(elapsed * 18)) * 0.75
        : 0;
    this.pavutin.silkGlowMat.emissiveIntensity =
      0.28 + silkRatio * 1.2 + combat * 0.45 + invulnPulse;
  }

  private updateTargetingVisuals(elapsed: number): void {
    const near = this.cachedNearAnchor ?? this.findNearestAnchor(3.75);
    const flyReach = this.isGrounded ? 3.0 : 3.55;
    const nearFly = this.flies.find((f) => f.pos.distanceTo(this.spiderPos) < flyReach);

    // Subtle organic firefly-pollen spores drifting gently near interactable fly or twig fork
    if (this.screen === 'playing' && nearFly) {
      this.targetSporesGroup.visible = true;
      this.targetSporesGroup.position.copy(nearFly.pos);
      this.targetSporeMat.emissive.setHex(0xffe58f);
      this.targetSporesGroup.children.forEach((child, idx) => {
        const a = elapsed * 2.6 + idx * ((Math.PI * 2) / 3);
        child.position.set(Math.cos(a) * 0.24, Math.sin(elapsed * 3.4 + idx) * 0.09, Math.sin(a) * 0.24);
      });
    } else if (this.screen === 'playing' && near && near.id !== this.activeThreadFrom?.id) {
      this.targetSporesGroup.visible = true;
      this.targetSporesGroup.position.set(near.position.x, near.position.y + 0.05, near.position.z);
      this.targetSporeMat.emissive.setHex(0x9effdb);
      this.targetSporesGroup.children.forEach((child, idx) => {
        const a = elapsed * 1.9 + idx * ((Math.PI * 2) / 3);
        child.position.set(Math.cos(a) * 0.2, Math.sin(elapsed * 2.5 + idx) * 0.08, Math.sin(a) * 0.2);
      });
    } else {
      this.targetSporesGroup.visible = false;
    }

    const from = this.activeThreadFrom;
    if (!from) {
      this.trailingFilamentMesh.visible = false;
      return;
    }

    // Delicate 3D trailing silk filament from anchor twig straight to Pavutin's spinneret
    _v1.set(from.position.x, from.position.y, from.position.z);
    _v2.set(
      this.spiderPos.x - Math.sin(this.spiderYaw) * 0.42,
      this.spiderPos.y + 0.24,
      this.spiderPos.z - Math.cos(this.spiderYaw) * 0.42,
    );
    const dist = _v1.distanceTo(_v2);
    if (dist > 0.12) {
      this.trailingFilamentMesh.visible = true;
      this.trailingFilamentMesh.position.copy(_v1).lerp(_v2, 0.5);
      _v2.sub(_v1).normalize();
      _quat.setFromUnitVectors(_upAxis, _v2);
      this.trailingFilamentMesh.quaternion.copy(_quat);
      this.trailingFilamentMesh.scale.set(1, dist, 1);
    } else {
      this.trailingFilamentMesh.visible = false;
    }
  }

  private animateUspokh(elapsed: number): void {
    const u = this.world.uspokh;
    const talkingBoost = this.whisperSpeaker === 'uspokh' && this.whisperTimer > 0 ? 2.6 : 1.0;
    const breath = Math.sin(elapsed * 1.85);
    u.body.position.y = 0.24 + breath * 0.018;
    u.body.rotation.x = breath * 0.032;
    u.body.rotation.z = Math.sin(elapsed * 1.2) * 0.015;
    u.body.scale.set(1 + breath * 0.018, 1 - breath * 0.012, 1 + breath * 0.018);

    u.abdomen.rotation.x = Math.sin(elapsed * 1.9 + 0.35) * 0.055;
    u.setaeUniforms.uSetaeTime.value = elapsed;
    u.setaeUniforms.uSetaeAmp.value = 0.0042 + Math.abs(breath) * 0.002;
    u.abdSetaeGroup.rotation.x = Math.sin(elapsed * 4.8) * 0.009;
    u.cephSetaeGroup.rotation.x = Math.cos(elapsed * 5.2) * 0.008;

    u.pedipalps[0].rotation.x = Math.sin(elapsed * 2.8 * talkingBoost) * 0.18;
    u.pedipalps[1].rotation.x = -Math.sin(elapsed * 2.8 * talkingBoost) * 0.18;
    u.pedipalps[0].rotation.y = Math.sin(elapsed * 1.6) * 0.02;
    u.chelicerae[0].rotation.z = Math.sin(elapsed * 1.6) * 0.05;
    u.chelicerae[1].rotation.z = -Math.sin(elapsed * 1.6) * 0.05;
    for (const leg of u.legs) {
      const sway = Math.sin(elapsed * 1.4 + leg.index * 0.8 + leg.side) * 0.045;
      leg.hip.rotation.z = leg.side * sway;
      leg.knee.rotation.z = leg.side * sway * 0.6;
    }
    u.silkGlowMat.emissiveIntensity =
      this.whisperSpeaker === 'uspokh' && this.whisperTimer > 0
        ? 0.85 + Math.sin(elapsed * 4) * 0.25
        : 0.45;
  }

  private updateHeroRimLight(elapsed: number): void {
    const dx = this.spiderPos.x - this.camera.position.x;
    const dz = this.spiderPos.z - this.camera.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    const rx = -fz;
    const rz = fx;
    this.heroRimLight.position.set(
      this.spiderPos.x + fx * 2.55 + rx * 0.48,
      this.spiderPos.y + 1.56,
      this.spiderPos.z + fz * 2.55 + rz * 0.48,
    );
    this.heroRimLight.target.position.set(
      this.spiderPos.x,
      this.spiderPos.y + 0.28,
      this.spiderPos.z,
    );
    const tierRimBoost = this.settings.graphics === 'cinematic' ? 1.55 : 0;
    this.heroRimLight.intensity =
      5.6 + tierRimBoost + this.combatStanceBlend * 1.45 + Math.sin(elapsed * 2.2) * 0.28;
  }

  private stepAmbientVisuals(dt: number, elapsed: number): void {
    this.animatePavutin(dt, elapsed, false);
    this.stepFlies(dt, elapsed);
  }

  private updateTitleCamera(elapsed: number): void {
    const sway = Math.sin(elapsed * 0.28) * 0.8;
    _camDesired.set(0.75 + sway, 1.9, 8.5 + Math.cos(elapsed * 0.22) * 0.3);
    _camTarget.set(-0.1, 1.45, -5.8);
    this.camera.position.copy(_camDesired);
    this.camera.lookAt(_camTarget);
  }

  private updateGameplayCamera(dt: number): void {
    this.camDist = THREE.MathUtils.damp(this.camDist, this.camDistTarget, 8.5, dt);
    const dist = this.camDist;
    const horiz = Math.cos(this.camPitch) * dist;
    const vert = Math.sin(this.camPitch) * dist + 0.72;

    _camDesired.set(
      this.spiderPos.x + Math.sin(this.camYaw) * horiz,
      Math.max(groundHeightAt(this.spiderPos.x, this.spiderPos.z) + 0.85, this.spiderPos.y + vert),
      this.spiderPos.z + Math.cos(this.camYaw) * horiz,
    );
    resolveObstacleCollisions(_camDesired, 0.46, this.world.colliders, {
      minX: -26,
      maxX: 26,
      minZ: -25,
      maxZ: 18,
    });

    const k = 1 - Math.exp(-9.5 * dt);
    this.camPos.lerp(_camDesired, k);

    _lookTarget.set(
      this.spiderPos.x - Math.sin(this.camYaw) * 2.4,
      this.spiderPos.y + 0.92,
      this.spiderPos.z - Math.cos(this.camYaw) * 2.4,
    );
    this.camLook.lerp(_lookTarget, k);

    const shakeSq = this.settings.reducedEffects ? 0 : this.trauma * this.trauma;
    const fearTremor =
      !this.settings.reducedEffects && this.fear > 25 ? ((this.fear - 25) / 75) * 0.032 : 0;
    const jx = (Math.random() - 0.5) * (shakeSq * 0.45 + fearTremor);
    const jy = (Math.random() - 0.5) * (shakeSq * 0.45 + fearTremor);

    this.camera.position.set(this.camPos.x + jx, this.camPos.y + jy, this.camPos.z);
    this.camera.lookAt(this.camLook);
  }

  private updateMotes(dt: number, elapsed: number): void {
    let ambientShown = 0;
    let maxUsedIdx = -1;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (!m.active || (m.ambient && ambientShown >= this.activeAmbientMotesLimit)) {
        if (i < this.motesMesh.count) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.updateMatrix();
          this.motesMesh.setMatrixAt(i, _dummy.matrix);
        }
        continue;
      }
      if (m.ambient) ambientShown++;
      maxUsedIdx = i;

      m.life += dt;
      if (m.ambient) {
        if (i < 16) {
          // Dedicated emerald-green pond fireflies gently drifting above the left water
          m.pos.x += (m.vel.x * 0.65 + Math.sin(elapsed * 1.1 + i) * 0.22) * dt;
          m.pos.y =
            POND_WATER_Y +
            0.48 +
            Math.sin(elapsed * 1.3 + i * 0.7) * 0.36 +
            (i % 4) * 0.14;
          m.pos.z += (m.vel.z * 0.65 + Math.cos(elapsed * 0.95 + i) * 0.22) * dt;
          if (m.pos.x > -7.2) m.pos.x = -13.2;
          if (m.pos.x < -13.4) m.pos.x = -7.4;
          if (m.pos.z > 3.6) m.pos.z = -4.6;
          if (m.pos.z < -4.8) m.pos.z = 3.4;
        } else {
          const gustLateral =
            this.weather === 'gusty' ? 0.9 + this.windStrength * 1.35 : this.windStrength * 0.3;
          m.pos.x += (m.vel.x + gustLateral + Math.sin(elapsed + i) * 0.14) * dt;
          m.pos.y += Math.sin(elapsed * 0.9 + i * 0.5) * 0.18 * dt;
          m.pos.z += (m.vel.z + gustLateral * 0.25) * dt;
          if (m.pos.x > 18) m.pos.x = -18;
          if (m.pos.x < -18) m.pos.x = 18;
          if (m.pos.z > 14) m.pos.z = -18;
          if (m.pos.z < -18) m.pos.z = 14;
        }
      } else {
        m.pos.addScaledVector(m.vel, dt);
        m.vel.y -= 1.6 * dt;
        if (m.life >= m.maxLife) {
          m.active = false;
        }
      }

      const fade = m.ambient
        ? 0.75 + Math.sin(elapsed * 2 + i) * 0.25
        : Math.max(0, 1 - m.life / m.maxLife);
      _dummy.position.copy(m.pos);
      _dummy.scale.setScalar(m.scale * fade);
      _dummy.updateMatrix();
      this.motesMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.motesMesh.count = Math.max(0, maxUsedIdx + 1);
    this.motesMesh.instanceMatrix.needsUpdate = true;
  }

  private updateWindStreaks(dt: number, elapsed: number): void {
    const inst = this.world.windStreaksInst;
    if (!inst.visible) return;
    const strength = this.windStrength;
    const show = strength > 0.22 || this.windWarning || this.weather === 'gusty';
    const mat = inst.material as THREE.MeshStandardMaterial;
    mat.opacity = show
      ? Math.min(0.42, 0.08 + strength * 0.34 + (this.windWarning ? 0.08 : 0))
      : 0.05;
    const speedMult = this.weather === 'gusty' ? 2.6 : this.windWarning ? 1.55 : 0.7;

    for (let i = 0; i < this.windStreaks.length; i++) {
      const ws = this.windStreaks[i];
      ws.x += ws.speed * speedMult * dt;
      ws.z += ws.speed * speedMult * 0.28 * dt;
      if (ws.x > 18) ws.x = -18;
      if (ws.z > 14) ws.z = -18;

      _dummy.position.set(
        ws.x,
        ws.y + Math.sin(elapsed * 2.4 + ws.phase) * 0.14,
        ws.z,
      );
      _dummy.rotation.set(0.18, -0.26, 0.04);
      const sx = ws.len * (0.55 + strength * 1.45);
      const sy = show ? 0.8 + strength * 0.65 : 0.35;
      _dummy.scale.set(sx, sy, 1);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  private pushHud(force: boolean): void {
    this.lastHudPush = this.simElapsed;
    if (!force && this.disposed) return;

    const nearAnchor = this.cachedNearAnchor ?? this.findNearestAnchor(3.75);
    const grappleTarget = this.findNearestGrappleAnchor();
    const canClose = Boolean(
      this.activeThreadFrom &&
        nearAnchor &&
        nearAnchor.id !== this.activeThreadFrom.id &&
        this.findClosedLoop(nearAnchor.id, this.activeThreadFrom.id),
    );
    const canRepairPattern = Boolean(
      !this.activeThreadFrom &&
        nearAnchor &&
        this.silk >= 3 &&
        this.findWornPatternAtAnchor(nearAnchor.id),
    );
    const flyReach = this.isGrounded ? 3.0 : 3.55;
    const canHarvestFly = this.flies.some(
      (f) => f.pos.distanceTo(this.spiderPos) < flyReach,
    );
    const music = this.sound.getMusicStatus();

    const bearingStrands = this.strands.filter((s) => s.isBearing);
    const hasAnchorDone = (id: string) =>
      bearingStrands.some((s) => s.fromId === id || s.toId === id);

    const waspActive = this.waspState !== 'absent' && this.waspState !== 'departed';
    const waspDistExact = this.waspPos.distanceTo(this.spiderPos);
    const waspAlertLevel = !waspActive
      ? 0
      : this.waspState === 'dive'
        ? 1.0
        : this.waspState === 'investigate'
          ? 0.7
          : this.waspState === 'patrol'
            ? 0.35
            : 0;

    // Project Pavutin crown for contextual Whisper thought placement
    _v1.set(this.spiderPos.x, this.spiderPos.y + 0.72, this.spiderPos.z);
    _v1.project(this.camera);
    const spiderScreenPos =
      _v1.z >= -1 && _v1.z <= 1
        ? {
            xPct: THREE.MathUtils.clamp((_v1.x * 0.5 + 0.5) * 100, 14, 86),
            yPct: THREE.MathUtils.clamp((-_v1.y * 0.5 + 0.5) * 100, 16, 78),
          }
        : null;

    // Spider-Web Radar Blips (maxRange 22 units)
    const radarBlips: RadarBlip[] = [];
    const playerV = { x: this.spiderPos.x, y: this.spiderPos.y, z: this.spiderPos.z };
    if (waspActive) {
      const r = projectToRadarCoords(playerV, this.camYaw, this.waspPos, 22);
      radarBlips.push({
        id: 'wasp',
        kind: 'wasp',
        x: r.x,
        z: r.z,
        active: this.waspState === 'dive' || this.waspState === 'investigate',
      });
    }
    for (const anc of this.world.anchors) {
      if (anc.isGreatAnchor || anc.id === nearAnchor?.id) {
        const d = Math.hypot(anc.position.x - playerV.x, anc.position.z - playerV.z);
        if (d < 22) {
          const r = projectToRadarCoords(playerV, this.camYaw, anc.position, 22);
          radarBlips.push({
            id: anc.id,
            kind: 'anchor',
            x: r.x,
            z: r.z,
            active: anc.id === nearAnchor?.id,
          });
        }
      }
    }
    this.world.nettleZones.forEach((nz, idx) => {
      const d = Math.hypot(nz.x - playerV.x, nz.z - playerV.z);
      if (d < 22) {
        const r = projectToRadarCoords(playerV, this.camYaw, { x: nz.x, y: 0, z: nz.z }, 22);
        radarBlips.push({ id: `nettle-${idx}`, kind: 'nettle', x: r.x, z: r.z });
      }
    });
    for (const pat of this.patterns) {
      if (pat.shape === 'decoy') {
        const d = Math.hypot(pat.center.x - playerV.x, pat.center.z - playerV.z);
        if (d < 22) {
          const r = projectToRadarCoords(playerV, this.camYaw, pat.center, 22);
          radarBlips.push({ id: pat.id, kind: 'decoy', x: r.x, z: r.z, active: true });
        }
      }
    }
    let fliesAdded = 0;
    for (const f of this.flies) {
      if (fliesAdded >= 4) break;
      const d = Math.hypot(f.pos.x - playerV.x, f.pos.z - playerV.z);
      if (d < 20) {
        const r = projectToRadarCoords(playerV, this.camYaw, f.pos, 22);
        radarBlips.push({
          id: f.id,
          kind: 'fly',
          x: r.x,
          z: r.z,
          active: Boolean(f.caughtPatternId),
        });
        fliesAdded++;
      }
    }

    // World-Web Gaze Check: detect if player is looking toward a built or in-progress web in world space
    let gazeWebShape: PatternShape | null = null;
    if (this.screen === 'playing') {
      this.camera.getWorldDirection(_gazeLookDir);
      let bestDot = 0.78;
      for (const pat of this.patterns) {
        _gazeToWeb.set(
          pat.center.x - this.camera.position.x,
          pat.center.y - this.camera.position.y,
          pat.center.z - this.camera.position.z,
        );
        const dist = _gazeToWeb.length();
        if (dist > 0.4 && dist < 26) {
          _gazeToWeb.divideScalar(dist);
          const dot = _gazeLookDir.dot(_gazeToWeb);
          if (dot > bestDot) {
            bestDot = dot;
            gazeWebShape = pat.shape;
          }
        }
      }
      if (!gazeWebShape && this.activeThreadFrom) {
        _gazeToWeb.set(
          this.activeThreadFrom.position.x - this.camera.position.x,
          this.activeThreadFrom.position.y - this.camera.position.y,
          this.activeThreadFrom.position.z - this.camera.position.z,
        );
        const dist = _gazeToWeb.length();
        if (dist > 0.4 && dist < 22) {
          _gazeToWeb.divideScalar(dist);
          if (_gazeLookDir.dot(_gazeToWeb) > 0.82) {
            gazeWebShape = this.selectedMode;
          }
        }
      }
    }

    this.onHudUpdate({
      screen: this.screen,
      outcome: this.outcome,
      chapter: this.chapter,
      zone: this.currentZone,
      silk: Math.round(this.silk),
      maxSilk: this.maxSilk,
      composure: this.composure,
      maxComposure: this.maxComposure,
      fear: this.fear,
      hiddenInNettle: this.hiddenInNettle,
      isGrounded: this.isGrounded,
      onSilkBridge: this.onSilkBridge,
      dashCooldownSec: Number(Math.max(0, this.dashCooldown).toFixed(1)),
      selectedMode: this.selectedMode,
      hasGrapple: this.hasGrapple,
      waspState: this.waspState,
      waspDistance: Math.round(waspDistExact),
      waspBearingDeg:
        waspActive && waspDistExact < 22
          ? computeWaspRelativeBearingDeg(this.spiderPos, this.camYaw, this.waspPos)
          : null,
      waspAlertLevel,
      waspWebSlowed: this.waspWebSlowTimer > 0,
      weather: this.weather,
      windWarning: this.windWarning,
      windStrength: this.windStrength,
      patternsCount: this.patterns.length,
      fliesCaught: this.fliesCaught,
      aerialCatches: this.aerialCatches,
      caughtSpecies: { ...this.caughtSpecies },
      dewQuest: { ...this.dewQuest },
      unlockedLoreIds: computeUnlockedLoreIds({
        chapter: this.chapter,
        greatStrandsDone: bearingStrands.length,
        dewQuestCompleted: this.dewQuest.completed,
        caughtSpecies: this.caughtSpecies,
      }),
      greatStrandsDone: bearingStrands.length,
      greatStrandsTotal: 6,
      greatAnchorsDone: {
        stump: hasAnchorDone('anchor_stump'),
        leftBirch: hasAnchorDone('anchor_left_birch'),
        rightBirch: hasAnchorDone('anchor_right_birch'),
      },
      whisperId: this.whisperId,
      whisperParams: this.whisperParams,
      whisperSpeaker: this.whisperSpeaker,
      moonRestored: this.moonRestored,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      muted: this.sound.isMuted(),
      nearAnchorId: nearAnchor ? nearAnchor.id : null,
      nearAnchorLabel: nearAnchor ? nearAnchor.label : null,
      activeThreadFromId: this.activeThreadFrom ? this.activeThreadFrom.id : null,
      activeThreadFromLabel: this.activeThreadFrom ? this.activeThreadFrom.label : null,
      canClosePattern: canClose,
      canRepairPattern,
      canHarvestFly,
      combatStance: this.combatStanceBlend > 0.2,
      canGrappleId: grappleTarget ? grappleTarget.id : null,
      canGrappleLabel: grappleTarget ? grappleTarget.label : null,
      spiderScreenPos,
      radarBlips,
      gazeWebShape,
      musicTrackIndex: music.trackIndex,
      musicTrackId: music.trackId,
      musicIsPlaying: music.isPlaying,
      musicPaused: music.paused,
      musicAvailableCount: music.availableCount,
      difficulty: this.settings.difficulty,
      graphics: this.settings.graphics,
      language: this.settings.language,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);

    this.disposableWebGeos.forEach((g) => g.dispose());
    this.disposableWebMats.forEach((m) => m.dispose());
    this.webPulseEntries = [];
    this.trailingFilamentMesh.geometry.dispose();
    (this.trailingFilamentMesh.material as THREE.Material).dispose();
    this.targetSporeGeo.dispose();
    this.targetSporeMat.dispose();
    this.motesMesh.geometry.dispose();
    (this.motesMesh.material as THREE.Material).dispose();
    this.world.dispose();
    this.textures.dispose();
    this.sound.dispose();
    this.envTarget?.dispose();
    this.ssaoPass?.dispose();
    this.bloomPass?.dispose();
    this.bokehPass?.dispose();
    this.gradePass?.dispose();
    this.outputPass?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
