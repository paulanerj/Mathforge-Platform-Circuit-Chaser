/**
 * CC2-32: strict species registry parity between ecology and typed ability SDK.
 *
 * This guards against enabling a creature through its art/ecology catalog while
 * its game-state adapter is still reserved, and prevents accidental cross-game
 * reuse from silently attributing the wrong world authority.
 *
 * Important: this is contract protection, not proof that five remaining species
 * are implemented or a substitute for real-browser and physical device tests.
 */
import {describe,it,expect} from 'vitest';
import {
  CREATURE_MANIFESTS,CREATURE_SDK_SCHEMA,createCreatureAbility,
  type CreatureSpecies,
} from '../features/creatureAbilitySDK30B';
import {
  ABILITY_CATALOG,
} from '../features/creatureEcology30';

const ROSTER = [
  'MOLASSES_GUARDIAN','CAPACITOR','RELAY',
  'TETHER_SLUG','PRISM_SHUFFLER','FRACTURE_WISP',
] as const;

describe('CC2-32 creature expansion capability safety',()=>{
  it('has one unambiguous roster across the ecology and SDK contracts',()=>{
    expect(Object.keys(CREATURE_MANIFESTS).sort()).toEqual([...ROSTER].sort());
    expect(Object.keys(ABILITY_CATALOG).sort()).toEqual([...ROSTER].sort());
    for(const species of ROSTER){
      const manifest=CREATURE_MANIFESTS[species];
      const ecology=ABILITY_CATALOG[species];
      expect(manifest.sdk).toBe(CREATURE_SDK_SCHEMA);
      expect(manifest.species).toBe(species);
      expect(ecology.kind).toBe(manifest.ability);
      expect(ecology.authority).toBe(manifest.authority);
      expect(ecology.supportsDemo).toBe(manifest.enabled);
      expect(manifest.visualFamily.length).toBeGreaterThan(0);
      expect(manifest.soundVoice.length).toBeGreaterThan(0);
    }
  });

  it('keeps the declared three helpful / three harmful creature distribution',()=>{
    const manifests=ROSTER.map(species=>CREATURE_MANIFESTS[species]);
    expect(manifests.filter(m=>m.team==='HELPFUL')).toHaveLength(3);
    expect(manifests.filter(m=>m.team==='HARMFUL')).toHaveLength(3);
    expect(new Set(manifests.map(m=>m.ability)).size).toBe(6);
  });

  it('fails closed for five reserved powers rather than borrowing Molasses',()=>{
    const enabled=ROSTER.filter(species=>CREATURE_MANIFESTS[species].enabled);
    expect(enabled).toEqual(['MOLASSES_GUARDIAN']);
    for(const species of ROSTER){
      if(species==='MOLASSES_GUARDIAN')continue;
      expect(()=>createCreatureAbility(species as CreatureSpecies,'test-run'))
        .toThrow('CREATURE_ABILITY_NOT_IMPLEMENTED');
    }
    const guardian=createCreatureAbility('MOLASSES_GUARDIAN','test-run');
    expect(guardian.kind).toBe('PURSUER_VISCOUS_FIELD');
    expect(guardian.authority).toBe('PURSUER_MOTION');
  });
});
