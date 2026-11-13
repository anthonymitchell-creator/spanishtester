import type { IrregularDef } from './types';

/**
 * Irregular base verbs. Only the parts that deviate from the rule engine are listed;
 * everything else (including stem changes from `tags`) is generated.
 * Compounds point at these via `base` (mantener → tener, sonreír → reír, devolver → volver).
 */
export const IRREGULARS: Record<string, IrregularDef> = {
  ser: {
    pres: ['soy', 'eres', 'es', 'somos', 'son'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
    impf: ['era', 'eras', 'era', 'éramos', 'eran'],
    subj: ['sea', 'seas', 'sea', 'seamos', 'sean'],
    impTu: 'sé',
  },
  ir: {
    pres: ['voy', 'vas', 'va', 'vamos', 'van'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
    impf: ['iba', 'ibas', 'iba', 'íbamos', 'iban'],
    subj: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayan'],
    impTu: 've',
    impNos: 'vamos',
    ger: 'yendo',
  },
  estar: {
    pres: ['estoy', 'estás', 'está', 'estamos', 'están'],
    pretStrong: 'estuv',
    subj: ['esté', 'estés', 'esté', 'estemos', 'estén'],
  },
  dar: {
    pres: ['doy', 'das', 'da', 'damos', 'dan'],
    pret: ['di', 'diste', 'dio', 'dimos', 'dieron'],
    subj: ['dé', 'des', 'dé', 'demos', 'den'],
  },
  haber: {
    pres: ['he', 'has', 'ha', 'hemos', 'han'],
    pretStrong: 'hub',
    futStem: 'habr',
    subj: ['haya', 'hayas', 'haya', 'hayamos', 'hayan'],
    noImperative: true,
  },
  saber: { presYo: 'sé', pretStrong: 'sup', futStem: 'sabr', subjStem: 'sep' },
  caber: { presYo: 'quepo', pretStrong: 'cup', futStem: 'cabr' },
  tener: { tags: ['e-ie'], presYo: 'tengo', pretStrong: 'tuv', futStem: 'tendr', impTu: 'ten' },
  venir: { tags: ['e-ie'], presYo: 'vengo', pretStrong: 'vin', futStem: 'vendr', impTu: 'ven' },
  poner: { presYo: 'pongo', pretStrong: 'pus', futStem: 'pondr', impTu: 'pon', part: 'puesto' },
  salir: { presYo: 'salgo', futStem: 'saldr', impTu: 'sal' },
  valer: { presYo: 'valgo', futStem: 'valdr' },
  hacer: { presYo: 'hago', pretStrong: 'hic', futStem: 'har', impTu: 'haz', part: 'hecho' },
  decir: { tags: ['e-i'], presYo: 'digo', pretStrong: 'dij', futStem: 'dir', impTu: 'di', part: 'dicho' },
  traer: { presYo: 'traigo', pretStrong: 'traj' },
  caer: { presYo: 'caigo' },
  oír: { pres: ['oigo', 'oyes', 'oye', 'oímos', 'oyen'], presYo: 'oigo' },
  ver: {
    presYo: 'veo',
    pret: ['vi', 'viste', 'vio', 'vimos', 'vieron'],
    impf: ['veía', 'veías', 'veía', 'veíamos', 'veían'],
    part: 'visto',
  },
  poder: { tags: ['o-ue'], pretStrong: 'pud', futStem: 'podr', ger: 'pudiendo', noImperative: true },
  querer: { tags: ['e-ie'], pretStrong: 'quis', futStem: 'querr' },
  andar: { pretStrong: 'anduv' },
  reír: {
    pres: ['río', 'ríes', 'ríe', 'reímos', 'ríen'],
    pret: ['reí', 'reíste', 'rio', 'reímos', 'rieron'],
    subj: ['ría', 'rías', 'ría', 'riamos', 'rían'],
    impTu: 'ríe',
    ger: 'riendo',
    part: 'reído',
  },
  morir: { tags: ['o-ue'], part: 'muerto' },
  volver: { tags: ['o-ue'], part: 'vuelto' },
  resolver: { tags: ['o-ue'], part: 'resuelto' },
  abrir: { part: 'abierto' },
  cubrir: { part: 'cubierto' },
  escribir: { part: 'escrito' },
  romper: { part: 'roto' },
  describir: { part: 'descrito' },
  inscribir: { part: 'inscrito' },
  freír: { part: 'frito' },
};

/** Known compounds of irregular bases (used to guess `base` for verbs added on-device). */
export const KNOWN_COMPOUNDS: Record<string, string> = {
  mantener: 'tener', obtener: 'tener', detener: 'tener', contener: 'tener', sostener: 'tener',
  retener: 'tener', entretener: 'tener', abstener: 'tener', atener: 'tener',
  prevenir: 'venir', convenir: 'venir', intervenir: 'venir', provenir: 'venir',
  componer: 'poner', proponer: 'poner', suponer: 'poner', imponer: 'poner', disponer: 'poner',
  exponer: 'poner', oponer: 'poner', reponer: 'poner', posponer: 'poner',
  deshacer: 'hacer', rehacer: 'hacer',
  atraer: 'traer', distraer: 'traer', contraer: 'traer', extraer: 'traer', sustraer: 'traer',
  decaer: 'caer', recaer: 'caer',
  devolver: 'volver', envolver: 'volver', revolver: 'volver',
  descubrir: 'cubrir', encubrir: 'cubrir',
  prever: 'ver', sonreír: 'reír', freír: 'reír', desoír: 'oír', rehacerse: 'hacer',
};
