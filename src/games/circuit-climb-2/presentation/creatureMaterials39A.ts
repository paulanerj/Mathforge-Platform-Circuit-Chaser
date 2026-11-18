/**
 * CC2-39A — source-derived, configuration-driven material language.
 *
 * This is a headless visual projection module for the future in-game painter.
 * It NEVER modifies core, Pursuer, math, SDK, contacts, or effect durations.
 * Future renderer consumes these numbers and may reduce visual intensity for
 * thermal/low-power devices without altering any source simulation.
 */
import type {EncounterSpecies} from '../features/creatureEcologyRelay34';

export const CREATURE_MATERIAL_SCHEMA='cc2-creature-material/v1' as const;
export type MaterialSpecies=EncounterSpecies;
export type MaterialFamily='VISCOUS_GLASS'|'CONDUCTIVE_THREAD'|
  'FRACTURED_MINERAL'|'ELASTIC_FILAMENT'|'CHARGED_AMBER'|'PRISMATIC_GLASS';
export interface CreatureMaterialPreset {
  schema:typeof CREATURE_MATERIAL_SCHEMA;
  family:MaterialFamily;
  energy:number;
  motion:number;
  glow:number;
  opacity:number;
  outline:number;
  particles:number;
  reducedMotion:boolean;
}
export const CREATURE_MATERIAL_FAMILIES:Readonly<Record<MaterialSpecies,{
  family:MaterialFamily;
  color:string;
  silhouette:'drop'|'weave'|'shard'|'tether'|'spark'|'crystal';
}>>=Object.freeze({
  MOLASSES_GUARDIAN:{family:'VISCOUS_GLASS',color:'#94d9c0',silhouette:'drop'},
  RELAY:{family:'CONDUCTIVE_THREAD',color:'#76cfdd',silhouette:'weave'},
  FRACTURE_WISP:{family:'FRACTURED_MINERAL',color:'#c68a72',silhouette:'shard'},
  TETHER_SLUG:{family:'ELASTIC_FILAMENT',color:'#9eab97',silhouette:'tether'},
  CAPACITOR:{family:'CHARGED_AMBER',color:'#ddbf78',silhouette:'spark'},
  PRISM_SHUFFLER:{family:'PRISMATIC_GLASS',color:'#a3a2c5',silhouette:'crystal'},
});
export function defaultMaterialPreset(species:MaterialSpecies):CreatureMaterialPreset{
  const family=CREATURE_MATERIAL_FAMILIES[species].family;
  return {schema:CREATURE_MATERIAL_SCHEMA,family,
    energy:.32,motion:.38,glow:.18,opacity:.78,outline:.76,
    particles:.22,reducedMotion:false};
}
export function validateMaterialPreset(raw:CreatureMaterialPreset):CreatureMaterialPreset{
  if(!raw||raw.schema!==CREATURE_MATERIAL_SCHEMA||
    !Object.values(CREATURE_MATERIAL_FAMILIES).some(x=>x.family===raw.family))
    throw Error('CC2_MATERIAL_SCHEMA');
  const values=['energy','motion','glow','opacity','outline','particles'] as const;
  for(const key of values){
    const n=raw[key];
    if(!Number.isFinite(n)||n<0||n>1)throw Error('CC2_MATERIAL_RANGE_'+key);
  }
  if(typeof raw.reducedMotion!=='boolean')throw Error('CC2_MATERIAL_REDUCED_MOTION');
  if(Object.keys(raw).sort().join('|')!==
    ['schema','family','energy','motion','glow','opacity','outline','particles','reducedMotion'].sort().join('|'))
    throw Error('CC2_MATERIAL_EXTRA_FIELDS');
  return structuredClone(raw);
}
export interface VisualProjection {
  readonly species:MaterialSpecies;
  readonly tick:number;
  readonly center:{x:number;y:number};
  readonly scale:number;
  readonly edgeEnergy:number;
  readonly glow:number;
  readonly alpha:number;
  readonly particleBudget:number;
  readonly deformationX:number;
  readonly deformationY:number;
  readonly silhouette:string;
  readonly color:string;
}
/** Seeded by authoritative source tick and source-owned position, not wall clock. */
export function projectCreatureMaterial(
  species:MaterialSpecies,
  position:{x:number;y:number},
  tick:number,
  raw:CreatureMaterialPreset=defaultMaterialPreset(species),
  quality:'full'|'balanced'|'low'='full',
):VisualProjection{
  const preset=validateMaterialPreset(raw);
  const identity=CREATURE_MATERIAL_FAMILIES[species];
  if(identity.family!==preset.family)throw Error('CC2_MATERIAL_SPECIES_MISMATCH');
  if(!Number.isInteger(tick)||tick<0||
    !Number.isFinite(position.x)||!Number.isFinite(position.y))
    throw Error('CC2_MATERIAL_SOURCE_POSITION');
  const visualMotion=preset.reducedMotion?0:preset.motion;
  const qualityScalar=quality==='full'?1:quality==='balanced'?.55:.2;
  const oscillator=Math.sin((tick%3600)*.045);
  const secondary=Math.cos((tick%3600)*.031);
  return Object.freeze({
    species,tick,center:{x:position.x,y:position.y},
    scale:1+visualMotion*.16*oscillator,
    edgeEnergy:preset.energy,
    glow:preset.glow*qualityScalar,
    alpha:preset.opacity,
    particleBudget:Math.floor(preset.particles*24*qualityScalar),
    deformationX:visualMotion*5*oscillator,
    deformationY:visualMotion*4*secondary,
    silhouette:identity.silhouette,
    color:identity.color,
  });
}
