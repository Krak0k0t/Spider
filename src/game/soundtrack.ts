import type { LanguageCode } from './types';

export interface SoundtrackTrack {
  id: string;
  file: string;
  url: string;
  fallbackFile: string;
  fallbackUrl: string;
  ruTitle: string;
  enTitle: string;
  ruMood: string;
  enMood: string;
}

export const SOUNDTRACK_TRACKS: SoundtrackTrack[] = [
  {
    id: 'meditation',
    file: 'Meditation.ogg',
    url: '/music/Meditation.ogg',
    fallbackFile: 'silvan_sanctuary.ogg',
    fallbackUrl: '/music/ambient/silvan_sanctuary.ogg',
    ruTitle: 'Шёпот лунной росы',
    enTitle: 'Whisper of Lunar Dew',
    ruMood: 'Тихий покой у мшистой коряги',
    enMood: 'Stillness beside the mossy snag',
  },
  {
    id: 'night_ally',
    file: 'The Night Is Their Ally.ogg',
    url: '/music/The%20Night%20Is%20Their%20Ally.ogg',
    fallbackFile: 'into_the_shadows.ogg',
    fallbackUrl: '/music/ambient/into_the_shadows.ogg',
    ruTitle: 'Тень крылатой ночи',
    enTitle: 'Shadow of the Winged Night',
    ruMood: 'Ночной дозор меж крапивных зарослей',
    enMood: 'Nocturnal hunt through nettle groves',
  },
  {
    id: 'conflict_soul',
    file: 'Conflict of the Soul.ogg',
    url: '/music/Conflict%20of%20the%20Soul.ogg',
    fallbackFile: 'the_deep_path.ogg',
    fallbackUrl: '/music/ambient/the_deep_path.ogg',
    ruTitle: 'Меж страхом и нитью',
    enTitle: 'Between Fear and Thread',
    ruMood: 'Затаённое дыхание перед броском',
    enMood: 'Held breath before spinning the lure',
  },
  {
    id: 'weight_hammer',
    file: 'The Weight of the Hammer.ogg',
    url: '/music/The%20Weight%20of%20the%20Hammer.ogg',
    fallbackFile: 'weight_of_revenge.ogg',
    fallbackUrl: '/music/ambient/weight_of_revenge.ogg',
    ruTitle: 'Натиск грозового шквала',
    enTitle: 'Weight of the Night Gale',
    ruMood: 'Испытание длинных нитей у берёз',
    enMood: 'Bracing long strands against fierce gusts',
  },
  {
    id: 'pain_everything',
    file: 'Pain Is Everything.ogg',
    url: '/music/Pain%20Is%20Everything.ogg',
    fallbackFile: 'suspense.ogg',
    fallbackUrl: '/music/ambient/suspense.ogg',
    ruTitle: 'Жало над крапивой',
    enTitle: 'Stinger Above the Nettles',
    ruMood: 'Когда Хряж-Сякая кружит совсем рядом',
    enMood: 'When Khryazh-Syakaya dives near cover',
  },
  {
    id: 'our_last_dance',
    file: 'Our Last Dance.ogg',
    url: '/music/Our%20Last%20Dance.ogg',
    fallbackFile: 'transience.ogg',
    fallbackUrl: '/music/ambient/transience.ogg',
    ruTitle: 'Серебряный вальс над ложиной',
    enTitle: 'Silver Waltz Over the Hollow',
    ruMood: 'Прыжок на нити к Старому Пню',
    enMood: 'Silk-grapple flight across the hollow',
  },
  {
    id: 'last_stand_heroes',
    file: 'The Last Stand of Heroes.ogg',
    url: '/music/The%20Last%20Stand%20of%20Heroes.ogg',
    fallbackFile: 'heroes_rite.ogg',
    fallbackUrl: '/music/ambient/heroes_rite.ogg',
    ruTitle: 'Последний узел Ткача',
    enTitle: "The Weaver's Last Stand",
    ruMood: 'Замыкание Первого Великого Узора под луной',
    enMood: 'Sealing the First Great Pattern beneath the Moon',
  },
];

export function normalizeTrackIndex(index: number, count = SOUNDTRACK_TRACKS.length): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

export function getNextCarouselIndex(current: number, count = SOUNDTRACK_TRACKS.length): number {
  return normalizeTrackIndex(current + 1, count);
}

export function getPrevCarouselIndex(current: number, count = SOUNDTRACK_TRACKS.length): number {
  return normalizeTrackIndex(current - 1, count);
}

export function getTrackDisplay(track: SoundtrackTrack, lang: LanguageCode): {
  title: string;
  mood: string;
} {
  const isRuFamily = lang === 'ru' || lang === 'uk';
  return {
    title: isRuFamily ? track.ruTitle : track.enTitle,
    mood: isRuFamily ? track.ruMood : track.enMood,
  };
}
