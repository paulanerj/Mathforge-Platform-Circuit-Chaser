/**
 * CC2-02B explicit, versioned pursuit tuning. Values are test candidates,
 * not accepted measures of learner difficulty; no hidden math inputs.
 */
export interface PursuerPresetV1 {
  schemaVersion:'cc2-pursuer/v1';
  profile:'climb-provisional-b1';
  nearSenseRadius:number;
  clearSightRadius:number;
  trailSenseRadius:number;
  trailLifetimeTicks:number;
  staleContactTicks:number;
  speedSearch:number;
  speedPursuit:number;
  actorRadiusRatio:number;
  spawnRowsBelow:number;
  /** Optional CC2-07A search policy. Old presets/replays stay 'frontier'. */
  searchStrategy?:'frontier'|'ascending';
}
export const DEFAULT_PURSUER_PRESET:Readonly<PursuerPresetV1>=Object.freeze({
  schemaVersion:'cc2-pursuer/v1',profile:'climb-provisional-b1',
  nearSenseRadius:260,clearSightRadius:420,trailSenseRadius:110,
  trailLifetimeTicks:240,staleContactTicks:30,
  speedSearch:2.6,speedPursuit:3.7,
  actorRadiusRatio:0.52,spawnRowsBelow:2,
});
export function validatePursuerPreset(value:unknown):PursuerPresetV1{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('PURSUER_PRESET_NOT_OBJECT');
  const v=value as Record<string,unknown>;
  const defaults=Object.keys(DEFAULT_PURSUER_PRESET);
  const keys=Object.keys(v).filter(k=>k!=='searchStrategy');
  if(keys.sort().join('|')!==[...defaults].sort().join('|')||
     (v.searchStrategy!==undefined &&
      !['frontier','ascending'].includes(String(v.searchStrategy))))
    throw Error('PURSUER_PRESET_SHAPE');
  if(v.schemaVersion!=='cc2-pursuer/v1'||v.profile!=='climb-provisional-b1')throw Error('PURSUER_PRESET_VERSION');
  const ranges:Record<string,[number,number]>={
    nearSenseRadius:[50,500],clearSightRadius:[50,600],trailSenseRadius:[0,260],
    trailLifetimeTicks:[0,1200],staleContactTicks:[0,120],
    speedSearch:[0.1,10],speedPursuit:[0.1,12],
    actorRadiusRatio:[0.25,0.7],spawnRowsBelow:[1,4],
  };
  for(const [name,[min,max]] of Object.entries(ranges)){
    if(typeof v[name]!=='number'||!Number.isFinite(v[name])||v[name]<min||v[name]>max)throw Error('PURSUER_PRESET_INVALID_'+name);
  }
  if(!Number.isInteger(v.spawnRowsBelow)||!Number.isInteger(v.staleContactTicks)||
      !Number.isInteger(v.trailLifetimeTicks))throw Error('PURSUER_PRESET_FRACTIONAL_TICKS');
  return {...v} as unknown as PursuerPresetV1;
}
export function defaultPursuerPreset():PursuerPresetV1{
  return {...DEFAULT_PURSUER_PRESET};
}
