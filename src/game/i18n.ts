import type {
  ChapterPhase,
  DifficultyLevel,
  GraphicsQuality,
  InputAction,
  LanguageCode,
  LocationZone,
  PatternShape,
  WhisperId,
  WhisperParams,
} from './types';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  rtl?: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', rtl: true },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', rtl: true },
  { code: 'elv', nativeName: 'Sindarin (Elvish)', englishName: 'Elvish' },
  { code: 'orc', nativeName: 'Orkish (Black Speech)', englishName: 'Orkish' },
];

export function isRtlLanguage(code: LanguageCode): boolean {
  return code === 'ar' || code === 'fa';
}

export interface TranslationBundle {
  actBadge: string;
  gameTitle: string;
  gameSubtitle: string;
  startBtn: string;
  settingsBtn: string;
  controlsHint: string;

  // HUD
  silkLabel: string;
  composureLabel: string;
  patternsFliesLabel: string;
  stumpLabel: string;
  leftBirchLabel: string;
  rightBirchLabel: string;
  windGusty: string;
  windCalm: string;
  hiddenInNettle: string;
  tremorLabel: string;
  waspDistUnit: string;
  airborneTag: string;

  // Context prompts
  promptHarvest: string;
  promptClosePattern: string;
  promptExtendTo: string;
  promptAttachFrom: string;
  promptGrapple: string;
  promptThreadActive: string;
  grappleBtnLabel: string;
  jumpBtnLabel: string;
  weaveBtnLabel: string;
  harvestBtnLabel: string;

  // Patterns
  patterns: Record<PatternShape, { label: string; hint: string }>;

  // Zones
  zones: Record<LocationZone, string>;

  // Speakers
  speakers: {
    pavutin: string;
    uspokh: string;
    moon: string;
  };

  // Chapters
  chapters: Record<ChapterPhase, { title: string; detail: string }>;

  // Whispers
  whispers: Record<WhisperId, string>;

  // Modals & Buttons
  pauseTitle: string;
  pauseBadge: string;
  pauseSubtitle: string;
  victoryTitle: string;
  victoryBadge: string;
  victorySubtitle: string;
  retreatTitle: string;
  retreatBadge: string;
  retreatSubtitle: string;
  timeLabel: string;
  resumeBtn: string;
  restartBtn: string;
  playAgainBtn: string;
  tryAgainBtn: string;
  mainMenuBtn: string;
  fullscreenEnter: string;
  fullscreenExit: string;
  muteLabel: string;
  unmuteLabel: string;
  menuShortBtn: string;
  pauseShortBtn: string;
  closeBtn: string;
  resetDefaultsBtn: string;
  pressKeyPrompt: string;

  // Settings Tabs & Options
  settingsTitle: string;
  tabLanguage: string;
  tabControls: string;
  tabDifficulty: string;
  tabGraphics: string;
  touchControlsLabel: string;
  touchAuto: string;
  touchOn: string;
  touchOff: string;
  controlsTip: string;
  difficulties: Record<DifficultyLevel, { name: string; desc: string }>;
  graphics: Record<GraphicsQuality, { name: string; desc: string }>;
  actions: Record<InputAction, string>;

  // Anchors
  anchors: Record<string, string>;
}

const EN: TranslationBundle = {
  actBadge: 'Orb Weaver · Act I',
  gameTitle: 'Orb Weaver: Patterns Beneath the Moon',
  gameSubtitle:
    'Guide little eight-legged weaver Pavutin through Snag Hollow: spin luminous webs between twigs, lure foolish flies, hide in stinging nettles from the hunting wasp, and rekindle the First Great Pattern.',
  startBtn: 'Begin Weaving',
  settingsBtn: 'Settings',
  controlsHint:
    'WASD Move · Space / RMB Jump · Drag Mouse Look · E / LMB Weave · F Harvest · Q Grapple · 1–4 Pattern · Esc Pause',

  silkLabel: 'Silk',
  composureLabel: 'Composure',
  patternsFliesLabel: 'Webs · Flies',
  stumpLabel: 'Stump',
  leftBirchLabel: 'West Birch',
  rightBirchLabel: 'East Birch',
  windGusty: 'Gusting Wind',
  windCalm: 'Calm Night',
  hiddenInNettle: 'Hidden in Nettles',
  tremorLabel: 'Tremor',
  waspDistUnit: 'm',
  airborneTag: 'Leaping',

  promptHarvest: '[{k}] Catch trapped fly & gather silk',
  promptClosePattern: '[{k}] Close pattern at “{anchor}”',
  promptExtendTo: '[{k}] Stretch silk to: {anchor}',
  promptAttachFrom: '[{k}] Anchor silk at: {anchor}',
  promptGrapple: '[{k}] Silk-Grapple → {anchor}',
  promptThreadActive: 'Thread trailing from “{anchor}” — approach another twig',
  grappleBtnLabel: 'Grapple',
  jumpBtnLabel: 'Jump',
  weaveBtnLabel: 'Weave',
  harvestBtnLabel: 'Gather',

  patterns: {
    triangle: {
      label: 'Triangle',
      hint: 'Wind-braced frame · lures plump Fatbelly flies',
    },
    star: {
      label: 'Star',
      hint: 'High-tension cross · lures swift Mirrushka flies',
    },
    circle: {
      label: 'Circle',
      hint: 'Delicate spiral · lures iridescent Greenies from afar',
    },
    decoy: {
      label: 'Decoy Web',
      hint: 'Glows like a rival nest · lures Khryazh-Syakaya away',
    },
  },

  zones: {
    log: 'Mossy Snag',
    stump: 'Old Stump',
    left_birch: 'West Birch',
    right_birch: 'East Birch',
    nettle: 'Nettle Grove',
    field: 'First Field',
    hollow: 'Deep Hollow',
  },

  speakers: {
    pavutin: 'Pavutin',
    uspokh: 'Uspokh',
    moon: 'The Moon',
  },

  chapters: {
    prologue: {
      title: 'Prologue · Night at the Snag',
      detail: 'Connect 3 snag twigs into your first Triangle web (E or Left Click).',
    },
    ch1_threads: {
      title: 'Chapter 1 · First Threads',
      detail: 'Weave patterns (1–3), gather silk from flies ({silk}/60), then head beyond the nettles to First Field.',
    },
    ch2_wasp: {
      title: 'Chapter 2 · The Hunting Wasp',
      detail: 'Hide inside nettle leaves, wait for Khryazh-Syakaya to perch, and weave a Decoy Web (4) to earn Silk-Grapple.',
    },
    ch3_great_pattern: {
      title: 'Chapter 3 · The First Weaving Pattern',
      detail: 'Stretch {count}/6 bearing strands from the 3 Old Anchors (Stump via Q, West & East Birches) to the Frame and store 100 silk.',
    },
    victory: {
      title: 'The First Pattern Awakens',
      detail: 'Silver moonlight answers your Great Web. The path to the Moon Fields stands open.',
    },
  },

  whispers: {
    prologue_intro: 'The night is still. Approach the twigs by the snag and weave your first pattern.',
    grapple_search: 'The grapple thread searches in vain — stand near the Hollow rim or Old Stump.',
    approach_twig: 'Move closer to a glowing twig to anchor your silk.',
    fear_tremor: 'Your legs tremble from the buzzing! Hide in nettles or wait until she perches.',
    too_far: 'Too far for one strand — step to an intermediate twig first.',
    not_enough_silk: 'Not enough silk — harvest trapped flies from your webs!',
    tearbearer_spotted: 'Look — a Tearbearer fly carrying silver light! Catch her or follow toward First Field.',
    decoy_glowing: 'The Decoy Web glows like a rival nest! Wait for Khryazh-Syakaya to take the bait.',
    prologue_shatter: 'A Shadow-Stitch scarred the Moon and scattered the Five Great Patterns! Gather 60 silk on foolish flies and cross into First Field.',
    great_need_silk: 'All 6 bearing strands are taut! Harvest {missing} more silk to seal the Great Pattern.',
    great_strand_progress: 'Bearing strand anchored ({count}/6). The Moon answers brighter.',
    great_victory: 'The First Weaving Pattern closes in silver radiance! The Shadow-Stitch yields.',
    tearbearer_caught: 'Tearbearer caught! +{amount} silk. First Field lies ahead.',
    fly_caught: 'Foolish flyer caught! +{amount} silk added.',
    wasp_incoming: 'Buzzing wings! Khryazh-Syakaya approaches! Take cover in nettles, wait for her to perch, then weave a Decoy (4).',
    wasp_perch: 'Khryazh-Syakaya has perched on a branch! Now weave a Decoy Web (4)!',
    wasp_lured: 'Ha! The fierce wasp mistook our pattern for a rival nest!',
    wasp_departed_grapple: 'She flew off empty-handed! Silk-Grapple unlocked (Q). Anchor 6 bearing strands from the 3 Old Anchors and gather 100 silk!',
    wasp_departed_quick: 'Khryazh-Syakaya flew away. Move swiftly!',
    wasp_investigate: 'She heard leaves rustle — hold still inside the nettles!',
    wasp_knockback: 'Her wing-blast knocked you into the grass! Regroup in the nettles and spin a Decoy.',
    hollow_need_grapple: 'The Hollow is too deep — unlock Silk-Grapple in Chapter 2 first.',
    birch_wind_snap: 'A sharp gust snapped the long strand! Brace the West Birch with a Triangle web or wait for calm.',
    jump_hint: 'Use Space or Right Click to leap onto logs and clear obstacles.',
  },

  pauseTitle: 'Paused',
  pauseBadge: 'Quiet Breath',
  pauseSubtitle: 'Your silk waits motionless upon the moonlit twig.',
  victoryTitle: 'The First Pattern Shines Above the Woods',
  victoryBadge: 'Act I Complete',
  victorySubtitle: 'The Moon clears through the dark stitch. Beyond the birches lie the wide Moon Fields.',
  retreatTitle: 'Driven Into the Thicket',
  retreatBadge: 'Retreat',
  retreatSubtitle: 'Khryazh-Syakaya forced Pavutin beneath the nettle roots. Catch your breath and spin anew.',
  timeLabel: 'Time',
  resumeBtn: 'Resume',
  restartBtn: 'Restart',
  playAgainBtn: 'Weave Again',
  tryAgainBtn: 'Try Again',
  mainMenuBtn: 'Main Menu',
  fullscreenEnter: 'Fullscreen',
  fullscreenExit: 'Exit Fullscreen',
  muteLabel: 'Mute Audio',
  unmuteLabel: 'Unmute Audio',
  menuShortBtn: 'Menu',
  pauseShortBtn: 'Pause',
  closeBtn: 'Done',
  resetDefaultsBtn: 'Reset Defaults',
  pressKeyPrompt: 'Press key or mouse button…',

  settingsTitle: 'Settings',
  tabLanguage: 'Language',
  tabControls: 'Controls',
  tabDifficulty: 'Difficulty',
  tabGraphics: 'Graphics',
  touchControlsLabel: 'On-Screen Touch Controls',
  touchAuto: 'Auto',
  touchOn: 'Always On',
  touchOff: 'Off',
  controlsTip: 'Click any slot and press a keyboard key or mouse button (including Right Click).',
  difficulties: {
    story: {
      name: 'Moonlit Story',
      desc: '5 Composure · abundant silk · gentle wasp patrol · mild winds',
    },
    normal: {
      name: 'True Weaver',
      desc: '3 Composure · balanced stealth, gusts, and fly behavior',
    },
    hard: {
      name: 'Nightstalker',
      desc: '2 Composure · keener wasp hearing · faster escaping flies',
    },
    eclipse: {
      name: 'Shadow Eclipse',
      desc: '1 Composure · relentless wasp dives · fierce gale cycles',
    },
  },
  graphics: {
    low: {
      name: 'Low',
      desc: 'Crisp silhouettes · soft shadows off · minimal particles',
    },
    medium: {
      name: 'Balanced',
      desc: 'Standard reflections · moderate motes & foliage depth',
    },
    high: {
      name: 'High',
      desc: 'Dynamic shadows · iridescent chitin · rich moonlight fog',
    },
    ultra: {
      name: 'Cinematic',
      desc: 'Volumetric moonbeams · fireflies · maximum pixel crispness',
    },
  },
  actions: {
    moveForward: 'Move Forward',
    moveBackward: 'Move Backward',
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    jump: 'Jump',
    interact: 'Weave / Interact',
    harvest: 'Catch & Gather Fly',
    grapple: 'Silk-Grapple',
    pause: 'Pause / Menu',
    mute: 'Toggle Sound',
    fullscreen: 'Toggle Fullscreen',
  },
  anchors: {
    log_a: 'Pantry Twig',
    log_b: 'Dry Snag Twig',
    log_c: 'Mossy Bough',
    log_d: 'Far Snag Branch',
    nettle_a: 'Nettle Stem',
    nettle_b: 'Nettle Edge',
    nettle_c: 'Rear Nettle Bough',
    frame_west: 'West Frame Node',
    frame_east: 'East Frame Node',
    frame_north: 'Lunar Apex Node',
    frame_core: 'Pattern Heart',
    grapple_bank: 'Hollow Overhang Twig',
    anchor_stump: 'Anchor I: Old Stump',
    anchor_left_birch: 'Anchor II: West Birch Roots (Wind)',
    left_birch_brace_b: 'West Bark Brace',
    left_birch_brace_c: 'Birch Root Spur',
    anchor_right_birch: 'Anchor III: East Birch (Wasp Trail)',
  },
};

function makeBundle(overrides: Partial<TranslationBundle>): TranslationBundle {
  return {
    ...EN,
    ...overrides,
    patterns: { ...EN.patterns, ...(overrides.patterns || {}) },
    zones: { ...EN.zones, ...(overrides.zones || {}) },
    speakers: { ...EN.speakers, ...(overrides.speakers || {}) },
    chapters: { ...EN.chapters, ...(overrides.chapters || {}) },
    whispers: { ...EN.whispers, ...(overrides.whispers || {}) },
    difficulties: { ...EN.difficulties, ...(overrides.difficulties || {}) },
    graphics: { ...EN.graphics, ...(overrides.graphics || {}) },
    actions: { ...EN.actions, ...(overrides.actions || {}) },
    anchors: { ...EN.anchors, ...(overrides.anchors || {}) },
  };
}

const RU: TranslationBundle = makeBundle({
  actBadge: 'Паук-Ткач · Акт I',
  gameTitle: 'Паук-Ткач: Узоры под луной',
  gameSubtitle:
    'Веди восьминогого ткача Павутина через Коряжный Лог: плети светящиеся нити меж сучков, приманивай глупых мух, прячься в крапиве от Хряж-Сякой и возроди Великий Узор.',
  startBtn: 'Начать тканьё',
  settingsBtn: 'Настройки',
  controlsHint:
    'WASD Ходьба · Space / ПКМ Прыжок · Мышь Камера · E / ЛКМ Плести · F Муха · Q Нить-хвать · 1–4 Узор · Esc Пауза',

  silkLabel: 'Шёлк',
  composureLabel: 'Самообладание',
  patternsFliesLabel: 'Узоры · Мухи',
  stumpLabel: 'Пень',
  leftBirchLabel: 'Левая берёза',
  rightBirchLabel: 'Правая берёза',
  windGusty: 'Порыв ветра',
  windCalm: 'Штиль',
  hiddenInNettle: 'Укрытие в крапиве',
  tremorLabel: 'Дрожь',
  waspDistUnit: 'м',
  airborneTag: 'Прыжок',

  promptHarvest: '[{k}] Поймать муху и собрать шёлк',
  promptClosePattern: '[{k}] Замкнуть узор на «{anchor}»',
  promptExtendTo: '[{k}] Протянуть нить к: {anchor}',
  promptAttachFrom: '[{k}] Зацепить нить: {anchor}',
  promptGrapple: '[{k}] Нить-хвать → {anchor}',
  promptThreadActive: 'Нить тянется от «{anchor}» — подойди к следующему сучку',
  grappleBtnLabel: 'Хвать',
  jumpBtnLabel: 'Прыжок',
  weaveBtnLabel: 'Плести',
  harvestBtnLabel: 'Собрать',

  patterns: {
    triangle: {
      label: 'Треугольник',
      hint: 'Крепок от ветра · манит толстобрюхих мух',
    },
    star: {
      label: 'Звезда',
      hint: 'Прочна на излом · манит шустрых миррушек',
    },
    circle: {
      label: 'Круг',
      hint: 'Изящен, но рвуч · манит мух-зелонок издалека',
    },
    decoy: {
      label: 'Узор-обман',
      hint: 'Сияет чужим гнездом · отводит Хряж-Сякую',
    },
  },

  zones: {
    log: 'Коряга и Кладовая',
    stump: 'Старый Пень',
    left_birch: 'Левая Берёза',
    right_birch: 'Правая Берёза',
    nettle: 'Заросли Крапивы',
    field: 'Первое Поле',
    hollow: 'Ложина',
  },

  speakers: {
    pavutin: 'Павутин',
    uspokh: 'Успох',
    moon: 'Луна',
  },

  chapters: {
    prologue: {
      title: 'Пролог · Ночь у коряги',
      detail: 'Соедини 3 сучка у коряги в первый Треугольник (E или ЛКМ).',
    },
    ch1_threads: {
      title: 'Глава 1 · Первые нити',
      detail: 'Плети узоры (1–3) и лови мух ({silk}/60), затем иди за крапиву в Первое Поле.',
    },
    ch2_wasp: {
      title: 'Глава 2 · Первая оса-наездница',
      detail: 'Спрячься в крапиве, дождись посадки Хряж-Сякой и сплети Узор-Обман (4), чтобы обрести Нить-хвать.',
    },
    ch3_great_pattern: {
      title: 'Глава 3 · Узор Первый — Ткацкий',
      detail: 'Натяни {count}/6 несущих нитей от 3 Якорей (Пень по Q, Берёзы) к Остову и накопи 100 шёлка.',
    },
    victory: {
      title: 'Узор Первый пробуждён',
      detail: 'Ткацкий Узор сияет до самой Луны. Путь на Лунные Поля открыт.',
    },
  },

  whispers: {
    prologue_intro: 'Ночь тиха. Подойди к сучкам коряги и сплети первый узор.',
    grapple_search: 'Лассо ищет сучок поодаль — подойди к краю ложины или к Старому Пню.',
    approach_twig: 'Подойди ближе к светящемуся сучку, чтобы зацепить нить.',
    fear_tremor: 'Лапы дрожат от жужжания! Спрячься в крапиву или дождись, пока оса сядет.',
    too_far: 'Дальновато для одной нити — переберись к промежуточному сучку.',
    not_enough_silk: 'Шёлка не хватает — поймай глупых мух на готовом узоре!',
    tearbearer_spotted: 'Глянь — Носительница Слезы с каплей света! Поймай её или проследи к Первому Полю.',
    decoy_glowing: 'Узор-обман сияет, как чужое гнездо! Жди, когда Хряж-Сякая клюнет.',
    prologue_shatter: 'Тень Небосвода попортила Луну и рассыпала пять Великих Узоров! Накопи 60 шёлка на глупых мухах и иди к Первому Полю.',
    great_need_silk: 'Все 6 несущих нитей натянуты! Осталось добыть ещё {missing} шёлка для замыкания Узора.',
    great_strand_progress: 'Несущая нить натянута ({count}/6). Луна отвечает светлее.',
    great_victory: 'Великий Ткацкий Узор замкнулся и просиял над лесом! Штопина на Луне дрогнула.',
    tearbearer_caught: 'Носительница Слезы поймана! +{amount} шёлка. Впереди Первое Поле.',
    fly_caught: 'Глупое созданье поймано! +{amount} шёлка в запас.',
    wasp_incoming: 'Жужжит! Хряж-Сякая летит! Прячься в крапиве, жди пока сядет, и сплети Узор-Обман (4).',
    wasp_perch: 'Хряж-Сякая села передохнуть на сук! Время сплести Узор-Обман (4).',
    wasp_lured: 'Ха! Жуткое созданье приняло наш узор за чужое гнездо!',
    wasp_departed_grapple: 'Оса улетела ни с чем! Получена Нить-хвать (Q). Натяни 6 несущих нитей от 3 Якорей и добудь 100 шёлка!',
    wasp_departed_quick: 'Хряж-Сякая улетела прочь. Действуй быстро!',
    wasp_investigate: 'Она заметила шорох в листьях — замри в крапиве!',
    wasp_knockback: 'Хряж-Сякая сбила тебя вихрем в траву! Прячься в крапиве и сплети Узор-Обман.',
    hollow_need_grapple: 'Ложина слишком глубока — нужна Нить-хвать из Главы 2.',
    birch_wind_snap: 'Порыв ветра рвёт длинную нить! Сплети треугольник-распорку у берёзы или дождись штиля.',
    jump_hint: 'Нажми Space или правую кнопку мыши, чтобы перепрыгивать через кочки и коряги.',
  },

  pauseTitle: 'Пауза',
  pauseBadge: 'Передышка',
  pauseSubtitle: 'Нить замерла на сучке и ждёт твоего возвращения.',
  victoryTitle: 'Узор Первый просиял над лесом',
  victoryBadge: 'Акт I завершён',
  victorySubtitle: 'Луна прояснила лик сквозь тучу. Впереди — широкие Лунные Поля.',
  retreatTitle: 'Спугнули в чащу',
  retreatBadge: 'Отступление',
  retreatSubtitle: 'Хряж-Сякая загнала Павутина глубоко под корни крапивы. Передохни и переплети нити сызнова.',
  timeLabel: 'Время',
  resumeBtn: 'Продолжить',
  restartBtn: 'Заново',
  playAgainBtn: 'Сыграть снова',
  tryAgainBtn: 'Попробовать снова',
  mainMenuBtn: 'В главное меню',
  fullscreenEnter: 'Во весь экран',
  fullscreenExit: 'Выйти из экрана',
  muteLabel: 'Выключить звук',
  unmuteLabel: 'Включить звук',
  menuShortBtn: 'Меню',
  pauseShortBtn: 'Пауза',
  closeBtn: 'Готово',
  resetDefaultsBtn: 'Сбросить',
  pressKeyPrompt: 'Нажмите клавишу или кнопку мыши…',

  settingsTitle: 'Настройки',
  tabLanguage: 'Язык',
  tabControls: 'Управление',
  tabDifficulty: 'Сложность',
  tabGraphics: 'Графика',
  touchControlsLabel: 'Сенсорное управление',
  touchAuto: 'Авто',
  touchOn: 'Вкл',
  touchOff: 'Выкл',
  controlsTip: 'Нажмите на ячейку, затем нажмите клавишу клавиатуры или кнопку мыши (включая ПКМ).',
  difficulties: {
    story: { name: 'Лунная сказка', desc: '5 самообладания · много шёлка · спокойная оса' },
    normal: { name: 'Истинный ткач', desc: '3 самообладания · сбалансированный ветер и охота' },
    hard: { name: 'Ночной охотник', desc: '2 самообладания · чуткая оса · юркие мухи' },
    eclipse: { name: 'Затмение Луны', desc: '1 самообладание · свирепые атаки и шквалы' },
  },
  graphics: {
    low: { name: 'Низкая', desc: 'Лёгкий рендер без теней · минимум частиц' },
    medium: { name: 'Средняя', desc: 'Умеренные отражения и плотность света' },
    high: { name: 'Высокая', desc: 'Тени, переливающийся хитин и глубокий туман' },
    ultra: { name: 'Кинематографичная', desc: 'Лунные лучи, светлячки и максимум деталей' },
  },
  actions: {
    moveForward: 'Вперёд',
    moveBackward: 'Назад',
    moveLeft: 'Влево',
    moveRight: 'Вправо',
    jump: 'Прыжок',
    interact: 'Плести / Действие',
    harvest: 'Поймать муху',
    grapple: 'Нить-хвать',
    pause: 'Пауза / Меню',
    mute: 'Звук',
    fullscreen: 'Полный экран',
  },
  anchors: {
    log_a: 'Сучок у кладовой',
    log_b: 'Сухой сучок коряги',
    log_c: 'Мшистая ветка',
    log_d: 'Дальний сук коряги',
    nettle_a: 'Стебель у крапивы',
    nettle_b: 'Кромка крапивы',
    nettle_c: 'Ветвь за крапивой',
    frame_west: 'Западный узел остова',
    frame_east: 'Восточный узел остова',
    frame_north: 'Лунная вершина остова',
    frame_core: 'Сердцевина остова',
    grapple_bank: 'Свисающий сучок над ложиной',
    anchor_stump: 'Якорь №1: Старый Пень',
    anchor_left_birch: 'Якорь №2: Левая Берёза (ветер)',
    left_birch_brace_b: 'Распорка бересты',
    left_birch_brace_c: 'Корень у бересты',
    anchor_right_birch: 'Якорь №3: Правая Берёза',
  },
});

const UK = makeBundle({
  actBadge: 'Павук-Ткач · Акт I',
  gameTitle: 'Павук-Ткач: Візерунки під місяцем',
  gameSubtitle:
    'Проведи восьминогого ткача Павутина крізь Коряжний Лог: плети сяючі нитки між гілочками, приваблюй мух, ховайся в кропиві від оси та пробуди Перший Великий Візерунок.',
  startBtn: 'Почати плетіння',
  settingsBtn: 'Налаштування',
  silkLabel: 'Шовк',
  composureLabel: 'Спокій',
  patternsFliesLabel: 'Візерунки · Мухи',
  windGusty: 'Порив вітру',
  windCalm: 'Штиль',
  hiddenInNettle: 'Укриття в кропиві',
  tremorLabel: 'Тремтіння',
  pauseTitle: 'Пауза',
  resumeBtn: 'Продовжити',
  restartBtn: 'Заново',
  mainMenuBtn: 'Головне меню',
  fullscreenEnter: 'На весь екран',
  fullscreenExit: 'Згорнути',
  settingsTitle: 'Налаштування',
  tabLanguage: 'Мова',
  tabControls: 'Керування',
  tabDifficulty: 'Складність',
  tabGraphics: 'Графіка',
  jumpBtnLabel: 'Стрибок',
  weaveBtnLabel: 'Плести',
  harvestBtnLabel: 'Зібрати',
  grappleBtnLabel: 'Нитка-хвать',
  actions: {
    ...RU.actions,
    jump: 'Стрибок',
    interact: 'Плести / Дія',
    harvest: 'Зібрати муху',
    grapple: 'Нитка-хвать',
    fullscreen: 'Повний екран',
  },
});

const FR = makeBundle({
  actBadge: 'Tisseur d’Orbes · Acte I',
  gameTitle: 'Tisseur d’Orbes : Motifs sous la Lune',
  gameSubtitle:
    'Guidez le petit tisseur Pavoutine dans le Creux aux Souches : tissez des toiles lumineuses, attirez les mouches, cachez-vous dans les orties et ravivez le Premier Grand Motif.',
  startBtn: 'Commencer à tisser',
  settingsBtn: 'Paramètres',
  silkLabel: 'Soie',
  composureLabel: 'Sang-froid',
  patternsFliesLabel: 'Toiles · Mouches',
  windGusty: 'Rafales',
  windCalm: 'Nuit calme',
  hiddenInNettle: 'Caché dans les orties',
  tremorLabel: 'Frisson',
  pauseTitle: 'Pause',
  resumeBtn: 'Reprendre',
  restartBtn: 'Recommencer',
  mainMenuBtn: 'Menu principal',
  fullscreenEnter: 'Plein écran',
  fullscreenExit: 'Quitter le plein écran',
  settingsTitle: 'Paramètres',
  tabLanguage: 'Langue',
  tabControls: 'Commandes',
  tabDifficulty: 'Difficulté',
  tabGraphics: 'Graphismes',
  jumpBtnLabel: 'Sauter',
  weaveBtnLabel: 'Tisser',
  harvestBtnLabel: 'Récolter',
  grappleBtnLabel: 'Grappin',
  patterns: {
    triangle: { label: 'Triangle', hint: 'Résiste au vent · attire les grosses mouches' },
    star: { label: 'Étoile', hint: 'Haute tension · attire les mouches rapides' },
    circle: { label: 'Cercle', hint: 'Spirale fine · attire les mouches vertes de loin' },
    decoy: { label: 'Leurre', hint: 'Brille comme un nid rival · éloigne la guêpe' },
  },
  actions: {
    moveForward: 'Avancer',
    moveBackward: 'Reculer',
    moveLeft: 'Gauche',
    moveRight: 'Droite',
    jump: 'Sauter',
    interact: 'Tisser / Agir',
    harvest: 'Capturer mouche',
    grapple: 'Fil-Grappin',
    pause: 'Pause',
    mute: 'Son',
    fullscreen: 'Plein écran',
  },
});

const DE = makeBundle({
  actBadge: 'Radnetzspinner · Akt I',
  gameTitle: 'Radnetzspinner: Muster unterm Mond',
  gameSubtitle:
    'Führe die achtbeinige Spinne Pawutin durch die Wurzelsenke: spinne leuchtende Fäden, locke Fliegen an, verbirg dich in Brennnesseln vor der Wespe und erwecke das Erste Große Muster.',
  startBtn: 'Weben beginnen',
  settingsBtn: 'Einstellungen',
  silkLabel: 'Seide',
  composureLabel: 'Fassung',
  patternsFliesLabel: 'Netze · Fliegen',
  windGusty: 'Böiger Wind',
  windCalm: 'Windstill',
  hiddenInNettle: 'In Brennnesseln verborgen',
  tremorLabel: 'Zittern',
  pauseTitle: 'Pause',
  resumeBtn: 'Fortsetzen',
  restartBtn: 'Neustart',
  mainMenuBtn: 'Hauptmenü',
  fullscreenEnter: 'Vollbild',
  fullscreenExit: 'Vollbild beenden',
  settingsTitle: 'Einstellungen',
  tabLanguage: 'Sprache',
  tabControls: 'Steuerung',
  tabDifficulty: 'Schwierigkeit',
  tabGraphics: 'Grafik',
  jumpBtnLabel: 'Springen',
  weaveBtnLabel: 'Weben',
  harvestBtnLabel: 'Sammeln',
  grappleBtnLabel: 'Faden-Griff',
  patterns: {
    triangle: { label: 'Dreieck', hint: 'Sturmfest · lockt dicke Fliegen an' },
    star: { label: 'Stern', hint: 'Straff gespannt · lockt flinke Fliegen an' },
    circle: { label: 'Kreis', hint: 'Zarte Spirale · lockt grüne Fliegen von fern' },
    decoy: { label: 'Trugnetz', hint: 'Leuchtet wie ein fremdes Nest · lenkt die Wespe ab' },
  },
  actions: {
    moveForward: 'Vorwärts',
    moveBackward: 'Rückwärts',
    moveLeft: 'Links',
    moveRight: 'Rechts',
    jump: 'Springen',
    interact: 'Weben / Interagieren',
    harvest: 'Fliege fangen',
    grapple: 'Faden-Sprung',
    pause: 'Pause',
    mute: 'Ton',
    fullscreen: 'Vollbild',
  },
});

const ES = makeBundle({
  actBadge: 'Tejedor de Orbes · Acto I',
  gameTitle: 'Tejedor de Orbes: Patrones bajo la Luna',
  gameSubtitle:
    'Guía al pequeño tejedor Pavutín por la Hondonada: hila redes luminosas, atrae moscas, escóndete entre ortigas de la avispa y despierta el Primer Gran Patrón.',
  startBtn: 'Comenzar a tejer',
  settingsBtn: 'Ajustes',
  silkLabel: 'Seda',
  composureLabel: 'Templanza',
  patternsFliesLabel: 'Redes · Moscas',
  windGusty: 'Ráfagas',
  windCalm: 'Noche serena',
  hiddenInNettle: 'Oculto en ortigas',
  tremorLabel: 'Temblor',
  pauseTitle: 'Pausa',
  resumeBtn: 'Continuar',
  restartBtn: 'Reiniciar',
  mainMenuBtn: 'Menú principal',
  fullscreenEnter: 'Pantalla completa',
  fullscreenExit: 'Salir de pantalla completa',
  settingsTitle: 'Ajustes',
  tabLanguage: 'Idioma',
  tabControls: 'Controles',
  tabDifficulty: 'Dificultad',
  tabGraphics: 'Gráficos',
  jumpBtnLabel: 'Saltar',
  weaveBtnLabel: 'Tejer',
  harvestBtnLabel: 'Recoger',
  grappleBtnLabel: 'Hilo-Garfio',
});

const PT = makeBundle({
  actBadge: 'Tecelão de Orbes · Ato I',
  gameTitle: 'Tecelão de Orbes: Padrões sob a Lua',
  gameSubtitle:
    'Guie a pequena aranha Pavutin pela Clareira do Tronco: teça fios luminosos, atraia moscas, esconda-se nas urtigas da vespa e restaure o Primeiro Grande Padrão.',
  startBtn: 'Começar a tecer',
  settingsBtn: 'Configurações',
  silkLabel: 'Seda',
  composureLabel: 'Serenidade',
  patternsFliesLabel: 'Teias · Moscas',
  windGusty: 'Ventania',
  windCalm: 'Noite calma',
  hiddenInNettle: 'Oculto nas urtigas',
  tremorLabel: 'Tremor',
  pauseTitle: 'Pausa',
  resumeBtn: 'Continuar',
  restartBtn: 'Reiniciar',
  mainMenuBtn: 'Menu principal',
  fullscreenEnter: 'Tela cheia',
  fullscreenExit: 'Sair da tela cheia',
  settingsTitle: 'Configurações',
  tabLanguage: 'Idioma',
  tabControls: 'Controles',
  tabDifficulty: 'Dificuldade',
  tabGraphics: 'Gráficos',
  jumpBtnLabel: 'Pular',
  weaveBtnLabel: 'Tecer',
  harvestBtnLabel: 'Coletar',
  grappleBtnLabel: 'Fio-Gancho',
});

const ZH = makeBundle({
  actBadge: '织网者 · 第一幕',
  gameTitle: '月下织网：林间丝纹',
  gameSubtitle:
    '引领八足小织者帕夫廷穿梭朽木幽谷：在枝桠间编织月光丝网，诱捕飞蝇，藏身荨麻丛躲避狩猎黄蜂，重燃第一伟大丝纹。',
  startBtn: '开始织网',
  settingsBtn: '设置',
  silkLabel: '丝线',
  composureLabel: '镇定',
  patternsFliesLabel: '丝网 · 飞蝇',
  windGusty: '阵风骤起',
  windCalm: '静夜无风',
  hiddenInNettle: '隐于荨麻',
  tremorLabel: '震颤',
  pauseTitle: '暂停',
  resumeBtn: '继续',
  restartBtn: '重新开始',
  mainMenuBtn: '返回主菜单',
  fullscreenEnter: '全屏',
  fullscreenExit: '退出全屏',
  settingsTitle: '设置',
  tabLanguage: '语言',
  tabControls: '按键绑定',
  tabDifficulty: '难度',
  tabGraphics: '画质',
  jumpBtnLabel: '跳跃',
  weaveBtnLabel: '织网',
  harvestBtnLabel: '收集',
  grappleBtnLabel: '丝索飞跃',
  patterns: {
    triangle: { label: '三角网', hint: '抗风坚固 · 吸引肥腹蝇' },
    star: { label: '星辰网', hint: '高张力交织 · 吸引敏捷小蝇' },
    circle: { label: '圆环网', hint: '精巧螺旋 · 远距吸引绿光蝇' },
    decoy: { label: '拟巢诱网', hint: '似敌巢微光 · 诱开狩猎黄蜂' },
  },
});

const AR = makeBundle({
  actBadge: 'نسّاج الأجرام · الفصل الأول',
  gameTitle: 'نسّاج الأجرام: أنماط تحت القمر',
  gameSubtitle:
    'وجّه العنكبوت النسّاج بافوتين عبر جوف الجذوع: انسج خيوطاً مضيئة بين الأغصان، اجذب الذباب، اختبئ في القراص من الدبور الصياد، وأعد إحياء النمط العظيم الأول.',
  startBtn: 'ابدأ النسج',
  settingsBtn: 'الإعدادات',
  silkLabel: 'الحرير',
  composureLabel: 'الهدوء',
  patternsFliesLabel: 'الشباك · الذباب',
  windGusty: 'رياح عاصفة',
  windCalm: 'ليل هادئ',
  hiddenInNettle: 'مختبئ في القراص',
  tremorLabel: 'ارتجاف',
  pauseTitle: 'إيقاف مؤقت',
  resumeBtn: 'متابعة',
  restartBtn: 'إعادة البدء',
  mainMenuBtn: 'القائمة الرئيسية',
  fullscreenEnter: 'ملء الشاشة',
  fullscreenExit: 'إنهاء ملء الشاشة',
  settingsTitle: 'الإعدادات',
  tabLanguage: 'اللغة',
  tabControls: 'التحكم',
  tabDifficulty: 'الصعوبة',
  tabGraphics: 'الرسوميات',
  jumpBtnLabel: 'قفز',
  weaveBtnLabel: 'نسج',
  harvestBtnLabel: 'جمع',
  grappleBtnLabel: 'خطاف الحرير',
});

const JA = makeBundle({
  actBadge: '円網の織り手 · 第一幕',
  gameTitle: '月下の織り手：銀糸の紋様',
  gameSubtitle:
    '八本脚の小さな織り手パヴティンを導き、朽ち木の窪地で月光の糸を紡ごう。小枝を結び、虫を誘い、イラクサに身を潜めて狩り蜂を欺き、第一の大紋様を蘇らせよ。',
  startBtn: '紡ぎ始める',
  settingsBtn: '設定',
  silkLabel: '絹糸',
  composureLabel: '冷静',
  patternsFliesLabel: '網 · 獲物',
  windGusty: '突風',
  windCalm: '静夜',
  hiddenInNettle: 'イラクサに潜伏',
  tremorLabel: '震え',
  pauseTitle: '一時停止',
  resumeBtn: '再開',
  restartBtn: 'やり直す',
  mainMenuBtn: 'タイトルへ',
  fullscreenEnter: '全画面',
  fullscreenExit: '全画面終了',
  settingsTitle: '設定',
  tabLanguage: '言語',
  tabControls: '操作設定',
  tabDifficulty: '難易度',
  tabGraphics: '画質',
  jumpBtnLabel: '跳躍',
  weaveBtnLabel: '織る',
  harvestBtnLabel: '回収',
  grappleBtnLabel: '糸フック',
  patterns: {
    triangle: { label: '三角網', hint: '風に強い支柱 · 太腹バエを誘う' },
    star: { label: '星型網', hint: '高張力の交差 · 俊敏な小バエを誘う' },
    circle: { label: '円環網', hint: '繊細な螺旋 · 遠くの緑バエを誘う' },
    decoy: { label: '偽巣網', hint: '他の巣のように光る · スズメバチを逸らす' },
  },
});

const PL = makeBundle({
  actBadge: 'Tkacz Kręgów · Akt I',
  gameTitle: 'Tkacz Kręgów: Wzory pod Księżycem',
  gameSubtitle:
    'Poprowadź ośmionogiego tkacza Pawutina przez Kłodowy Jar: snuj świetliste nici między gałązkami, zwabiaj muchy, kryj się w pokrzywach przed osą i wskrześ Pierwszy Wielki Wzór.',
  startBtn: 'Rozpocznij tkanie',
  settingsBtn: 'Ustawienia',
  silkLabel: 'Jedwab',
  composureLabel: 'Opanowanie',
  patternsFliesLabel: 'Sieci · Muchy',
  windGusty: 'Porywisty wiatr',
  windCalm: 'Cicha noc',
  hiddenInNettle: 'Ukryty w pokrzywach',
  tremorLabel: 'Drżenie',
  pauseTitle: 'Pauza',
  resumeBtn: 'Wznów',
  restartBtn: 'Od nowa',
  mainMenuBtn: 'Menu główne',
  fullscreenEnter: 'Pełny ekran',
  fullscreenExit: 'Wyjdź z pełnego ekranu',
  settingsTitle: 'Ustawienia',
  tabLanguage: 'Język',
  tabControls: 'Sterowanie',
  tabDifficulty: 'Poziom trudności',
  tabGraphics: 'Grafika',
  jumpBtnLabel: 'Skok',
  weaveBtnLabel: 'Tkaj',
  harvestBtnLabel: 'Zbierz',
  grappleBtnLabel: 'Hak nici',
});

const IT = makeBundle({
  actBadge: 'Tessitore d’Orbe · Atto I',
  gameTitle: 'Tessitore d’Orbe: Trame sotto la Luna',
  gameSubtitle:
    'Guida il piccolo tessitore Pavutin nella Conca dei Tronchi: tendi fili argentei, attira le mosche, nasconditi tra le ortiche dalla vespa e risveglia il Primo Grande Disegno.',
  startBtn: 'Inizia a tessere',
  settingsBtn: 'Impostazioni',
  silkLabel: 'Seta',
  composureLabel: 'Calma',
  patternsFliesLabel: 'Tele · Mosche',
  windGusty: 'Raffiche di vento',
  windCalm: 'Notte calma',
  hiddenInNettle: 'Nascosto nelle ortiche',
  tremorLabel: 'Tremore',
  pauseTitle: 'Pausa',
  resumeBtn: 'Riprendi',
  restartBtn: 'Ricomincia',
  mainMenuBtn: 'Menu principale',
  fullscreenEnter: 'Schermo intero',
  fullscreenExit: 'Esci da schermo intero',
  settingsTitle: 'Impostazioni',
  tabLanguage: 'Lingua',
  tabControls: 'Comandi',
  tabDifficulty: 'Difficoltà',
  tabGraphics: 'Grafica',
  jumpBtnLabel: 'Salta',
  weaveBtnLabel: 'Tessi',
  harvestBtnLabel: 'Raccogli',
  grappleBtnLabel: 'Rampino',
});

const VI = makeBundle({
  actBadge: 'Người Dệt Trăng · Hồi I',
  gameTitle: 'Người Dệt Trăng: Hoa Văn Đêm Rừng',
  gameSubtitle:
    'Dẫn dắt chú nhện thợ dệt Pavutin qua Hốc Gỗ Mục: giăng tơ phát sáng giữa các cành, nhử ruồi ngốc, ẩn nấp trong bụi tầm ma tránh ong bắp cày và thắp sáng Đại Hoa Văn.',
  startBtn: 'Bắt đầu dệt tơ',
  settingsBtn: 'Cài đặt',
  silkLabel: 'Tơ',
  composureLabel: 'Bình tĩnh',
  patternsFliesLabel: 'Mạng · Ruồi',
  windGusty: 'Gió giật',
  windCalm: 'Đêm tĩnh',
  hiddenInNettle: 'Ẩn trong tầm ma',
  tremorLabel: 'Run rẩy',
  pauseTitle: 'Tạm dừng',
  resumeBtn: 'Tiếp tục',
  restartBtn: 'Chơi lại',
  mainMenuBtn: 'Menu chính',
  fullscreenEnter: 'Toàn màn hình',
  fullscreenExit: 'Thoát toàn màn hình',
  settingsTitle: 'Cài đặt',
  tabLanguage: 'Ngôn ngữ',
  tabControls: 'Điều khiển',
  tabDifficulty: 'Độ khó',
  tabGraphics: 'Đồ họa',
  jumpBtnLabel: 'Nhảy',
  weaveBtnLabel: 'Dệt',
  harvestBtnLabel: 'Thu tơ',
  grappleBtnLabel: 'Bắn tơ',
});

const FA = makeBundle({
  actBadge: 'تارپاش ماه · پرده نخست',
  gameTitle: 'تارپاش ماه: نقش‌های زیر مهتاب',
  gameSubtitle:
    'عنکبوت کوچک بافنده، پاووتین، را در گودال کنده هدایت کن: میان شاخه‌ها تارهای نقره‌ای بباف، مگس‌ها را به دام بینداز، از زنبور شکارچی در گزنه پنهان شو و نخستین نقش بزرگ را زنده کن.',
  startBtn: 'آغاز بافتن',
  settingsBtn: 'تنظیمات',
  silkLabel: 'ابریشم',
  composureLabel: 'آرامش',
  patternsFliesLabel: 'تارها · مگس‌ها',
  windGusty: 'تندباد',
  windCalm: 'شب آرام',
  hiddenInNettle: 'پنهان در گزنه',
  tremorLabel: 'لرزش',
  pauseTitle: 'توقف',
  resumeBtn: 'ادامه',
  restartBtn: 'شروع دوباره',
  mainMenuBtn: 'منوی اصلی',
  fullscreenEnter: 'تمام‌صفحه',
  fullscreenExit: 'خروج از تمام‌صفحه',
  settingsTitle: 'تنظیمات',
  tabLanguage: 'زبان',
  tabControls: 'کنترل‌ها',
  tabDifficulty: 'سختی',
  tabGraphics: 'گرافیک',
  jumpBtnLabel: 'پرش',
  weaveBtnLabel: 'بافتن',
  harvestBtnLabel: 'گردآوری',
  grappleBtnLabel: 'قلاب ابریشم',
});

const ELV = makeBundle({
  actBadge: 'Narthiel · Lúth I',
  gameTitle: 'Linnathron: Thindriel nuin Ithil',
  gameSubtitle:
    'Tolo Pavutin i nathron tîr: natho lîn silith mi galad, tulo i filig, nurtho mi thar-laeg o i ’waew-raug ar echuio i Phain-Nathron Minui.',
  startBtn: 'Echio Nathad',
  settingsBtn: 'Gwaith-Nîd',
  controlsHint:
    'WASD Padad · Space / RMB Labad · Mouse Tîr · E / LMB Nathad · F Cavad · Q Rîf · 1–4 Cant · Esc Dartha',
  silkLabel: 'Sîl-Lîn',
  composureLabel: 'Îd-Rîn',
  patternsFliesLabel: 'Nathron · Filig',
  stumpLabel: 'Taur-Gûl',
  leftBirchLabel: 'Brethil Annûn',
  rightBirchLabel: 'Brethil Rhûn',
  windGusty: 'Sûl-Rîs',
  windCalm: 'Dûr-Lîn',
  hiddenInNettle: 'Nurthed mi Thar-Laeg',
  tremorLabel: 'Girith',
  airborneTag: 'Labol',
  pauseTitle: 'Darthad',
  resumeBtn: 'Aphado',
  restartBtn: 'En-Echio',
  mainMenuBtn: 'Gwaith-Tîr',
  fullscreenEnter: 'Tîr-Or',
  fullscreenExit: 'Gwanna Or',
  settingsTitle: 'Gwaith-Nîd',
  tabLanguage: 'Lam',
  tabControls: 'Rîm-Pad',
  tabDifficulty: 'Ang-Rîn',
  tabGraphics: 'Cala-Tîr',
  jumpBtnLabel: 'Labo',
  weaveBtnLabel: 'Natho',
  harvestBtnLabel: 'Cavo',
  grappleBtnLabel: 'Lîn-Rîf',
  speakers: {
    pavutin: 'Pavutin',
    uspokh: 'Uspokh',
    moon: 'Ithil',
  },
  patterns: {
    triangle: { label: 'Neldor-Cant', hint: 'Thalion o sûl · tula filig daer' },
    star: { label: 'Elen-Cant', hint: 'Lîn tanc · tula filig lim' },
    circle: { label: 'Rîn-Cant', hint: 'Lîn lend · tula filig laeg o hae' },
    decoy: { label: 'Gûl-Nathron', hint: 'Sîla sui haudh · ritha i ’waew-raug' },
  },
});

const ORC = makeBundle({
  actBadge: 'Skai-Spinna · Waaagh I',
  gameTitle: 'Ghash-Krimp: Lug-Skai udu Nazg',
  gameSubtitle:
    'Krump ‘n creep wid Pavutin da eight-legged git! Spin shiny web-traps, snag fat buzz-grubs, skulk in sting-weeds from da big wing-stabba, an’ light up da Moon-Boss Web!',
  startBtn: 'Start Spinnin’',
  settingsBtn: 'Tink’rin',
  controlsHint:
    'WASD Skulk · Space / RMB Leap · Mouse Look · E / LMB Spin · F Munch · Q Yank-Web · 1–4 Shape · Esc Halt',
  silkLabel: 'Goo-Thread',
  composureLabel: 'Grit',
  patternsFliesLabel: 'Webs · Grubs',
  stumpLabel: 'Rot-Stump',
  leftBirchLabel: 'Pale-Tree West',
  rightBirchLabel: 'Pale-Tree East',
  windGusty: 'Howlin’ Gale',
  windCalm: 'Dead Quiet',
  hiddenInNettle: 'Skulkin’ in Weeds',
  tremorLabel: 'Shakes',
  airborneTag: 'Pouncin’',
  pauseTitle: 'Breather',
  resumeBtn: 'Get Back In',
  restartBtn: 'Redo It',
  mainMenuBtn: 'Camp Fire',
  fullscreenEnter: 'Big Eye',
  fullscreenExit: 'Shrink Eye',
  settingsTitle: 'Tink’rin',
  tabLanguage: 'Tongue',
  tabControls: 'Claws',
  tabDifficulty: 'Brutality',
  tabGraphics: 'Shinies',
  jumpBtnLabel: 'Pounce',
  weaveBtnLabel: 'Spin',
  harvestBtnLabel: 'Snatch',
  grappleBtnLabel: 'Yank-Line',
  speakers: {
    pavutin: 'Pavutin',
    uspokh: 'Old Uspokh',
    moon: 'Pale-Eye Moon',
  },
  patterns: {
    triangle: { label: 'Tri-Spike', hint: 'Tough ‘gainst gale · baits chubby buzzers' },
    star: { label: 'Zag-Star', hint: 'Mean grip · snags zippy gnats' },
    circle: { label: 'Loop-Trap', hint: 'Wide snare · pulls greenies from afar' },
    decoy: { label: 'Trick-Nest', hint: 'Glows like rival turf · fools da Horned Wasp' },
  },
});

const BUNDLES: Record<LanguageCode, TranslationBundle> = {
  en: EN,
  fr: FR,
  de: DE,
  es: ES,
  pt: PT,
  zh: ZH,
  ar: AR,
  uk: UK,
  ru: RU,
  ja: JA,
  pl: PL,
  it: IT,
  vi: VI,
  fa: FA,
  elv: ELV,
  orc: ORC,
};

export function getTranslations(lang: LanguageCode): TranslationBundle {
  return BUNDLES[lang] || EN;
}

export function formatWhisperText(
  lang: LanguageCode,
  id: WhisperId,
  params?: WhisperParams,
): string {
  const t = getTranslations(lang);
  let raw = t.whispers[id] || EN.whispers[id] || '';
  if (params) {
    if (params.count !== undefined) raw = raw.replace('{count}', String(params.count));
    if (params.total !== undefined) raw = raw.replace('{total}', String(params.total));
    if (params.amount !== undefined) raw = raw.replace('{amount}', String(params.amount));
    if (params.missing !== undefined) raw = raw.replace('{missing}', String(params.missing));
  }
  return raw;
}

export function formatPromptText(
  template: string,
  values: { k?: string; anchor?: string },
): string {
  let out = template;
  if (values.k !== undefined) out = out.replace('{k}', values.k);
  if (values.anchor !== undefined) out = out.replace('{anchor}', values.anchor);
  return out;
}
