export const ICONS = {
  audioOff: new URL('../../assets/icons/icon_audio_off.png', import.meta.url).href,
  audioOn: new URL('../../assets/icons/icon_audio_on.png', import.meta.url).href,
  back: new URL('../../assets/icons/icon_back.png', import.meta.url).href,
  help: new URL('../../assets/icons/icon_help.png', import.meta.url).href,
  locked: new URL('../../assets/icons/icon_locked.png', import.meta.url).href,
  menu: new URL('../../assets/icons/icon_menu.png', import.meta.url).href,
  removeCard: new URL('../../assets/icons/icon_remove_card.png', import.meta.url).href,
  settings: new URL('../../assets/icons/icon_settings.png', import.meta.url).href,
  star: new URL('../../assets/icons/icon_star.png', import.meta.url).href,
  trophy: new URL('../../assets/icons/icon_trophy.png', import.meta.url).href,
  unlocked: new URL('../../assets/icons/icon_unlocked.png', import.meta.url).href,
} as const;

export type IconKey = keyof typeof ICONS;

export const EFFECTS = {
  flare: new URL('../../assets/fx/fx_flare.png', import.meta.url).href,
  magicBurst: new URL('../../assets/fx/fx_magic_burst.png', import.meta.url).href,
  magicRing: new URL('../../assets/fx/fx_magic_ring.png', import.meta.url).href,
  slash1: new URL('../../assets/fx/fx_slash_01.png', import.meta.url).href,
  slash2: new URL('../../assets/fx/fx_slash_02.png', import.meta.url).href,
  smoke: new URL('../../assets/fx/fx_smoke.png', import.meta.url).href,
  softLight: new URL('../../assets/fx/fx_soft_light.png', import.meta.url).href,
  spark: new URL('../../assets/fx/fx_spark.png', import.meta.url).href,
  star1: new URL('../../assets/fx/fx_star_01.png', import.meta.url).href,
  star2: new URL('../../assets/fx/fx_star_02.png', import.meta.url).href,
  trace: new URL('../../assets/fx/fx_trace.png', import.meta.url).href,
  twirl: new URL('../../assets/fx/fx_twirl.png', import.meta.url).href,
} as const;

export const ALL_ART_ASSET_URLS = [
  ...Object.values(ICONS),
  ...Object.values(EFFECTS),
];
