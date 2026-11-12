/**
 * CC2-05B — deterministic Pursuer personality overlay.
 *
 * A curious Pursuer can hesitate, react to contact, and investigate one
 * public-graph side path. This layer has no access to the math result,
 * selected destination, hidden Spark coordinates or future learner route.
 * Every diversion and hesitation has an integer-tick deadline; the original
 * source-owned finite-sensing Brain remains responsible for search.
 */
export interface PursuerPersonalityV1 {
  schemaVersion:'cc2-pursuer-personality/v1';
  style:'relentless'|'curious';
  hesitationChance:number;
  hesitationMinTicks:number;
  hesitationMaxTicks:number;
  hesitationCooldownTicks:number;
  noticeTicks:number;
  detourChance:number;
  detourTicks:number;
  frustrationTicks:number;
}
export type PursuerEmotionV1=
  'SEARCHING'|'CURIOUS'|'NOTICE'|'FOCUSED'|'HESITATING'|'FRUSTRATED';
export const DEFAULT_PERSONALITY:Readonly<PursuerPersonalityV1>=Object.freeze({
  schemaVersion:'cc2-pursuer-personality/v1',
  style:'relentless',hesitationChance:0,hesitationMinTicks:0,
  hesitationMaxTicks:0,hesitationCooldownTicks:120,noticeTicks:0,
  detourChance:0,detourTicks:0,frustrationTicks:0,
});
export const CURIOUS_PERSONALITY:Readonly<PursuerPersonalityV1>=Object.freeze({
  schemaVersion:'cc2-pursuer-personality/v1',
  style:'curious',hesitationChance:0.22,hesitationMinTicks:18,
  hesitationMaxTicks:45,hesitationCooldownTicks:130,
  noticeTicks:18,detourChance:0.15,detourTicks:48,
  frustrationTicks:42,
});
export function defaultPursuerPersonality():PursuerPersonalityV1{
  return {...DEFAULT_PERSONALITY};
}
export function curiousPursuerPersonality():PursuerPersonalityV1{
  return {...CURIOUS_PERSONALITY};
}
export function validatePursuerPersonality(value:unknown):PursuerPersonalityV1{
  if(!value || typeof value!=='object'||Array.isArray(value))
    throw Error('CC2_PERSONALITY_NOT_OBJECT');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).sort().join('|')!==Object.keys(DEFAULT_PERSONALITY).sort().join('|')||
    v.schemaVersion!=='cc2-pursuer-personality/v1'||
    !['curious','relentless'].includes(String(v.style)))
    throw Error('CC2_PERSONALITY_VERSION_OR_KEYS');
  const bounded:Record<string,[number,number]> = {
    hesitationChance:[0,0.8],hesitationMinTicks:[0,180],
    hesitationMaxTicks:[0,180],hesitationCooldownTicks:[30,1200],
    noticeTicks:[0,90],detourChance:[0,0.75],
    detourTicks:[0,180],frustrationTicks:[0,180],
  };
  for(const [field,[min,max]] of Object.entries(bounded)){
    const n=v[field];
    if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)
      throw Error('CC2_PERSONALITY_INVALID_'+field);
    if(!field.endsWith('Chance')&&!Number.isInteger(n))
      throw Error('CC2_PERSONALITY_FRACTIONAL_'+field);
  }
  if((v.hesitationMinTicks as number)>(v.hesitationMaxTicks as number))
    throw Error('CC2_PERSONALITY_INVALID_HESITATION_BOUNDS');
  return {...v} as unknown as PursuerPersonalityV1;
}
