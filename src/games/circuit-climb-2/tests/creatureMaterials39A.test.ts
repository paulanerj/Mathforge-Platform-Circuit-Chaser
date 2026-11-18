/**
 * CC2-39A material qualification: six clear identities, visual-only behavior,
 * deterministic source tick projection, independent quality settings.
 */
import {describe,it,expect} from 'vitest';
import {
  CREATURE_MATERIAL_FAMILIES,defaultMaterialPreset,
  validateMaterialPreset,projectCreatureMaterial,
} from '../presentation/creatureMaterials39A';

describe('CC2-39A premium material foundation',()=>{
  it('distinguishes all six creatures by silhouette, not color alone',()=>{
    const families=Object.entries(CREATURE_MATERIAL_FAMILIES);
    expect(families).toHaveLength(6);
    expect(new Set(families.map(([,f])=>f.silhouette)).size).toBe(6);
    expect(new Set(families.map(([,f])=>f.family)).size).toBe(6);
  });
  it('supports restrained through exaggerated visual tuning with strict bounds',()=>{
    const preset=defaultMaterialPreset('RELAY');
    expect(validateMaterialPreset({...preset,energy:0,motion:0,glow:0,particles:0})
      .energy).toBe(0);
    expect(validateMaterialPreset({...preset,energy:1,motion:1,glow:1,particles:1})
      .energy).toBe(1);
    expect(()=>validateMaterialPreset({...preset,glow:1.1}))
      .toThrow('CC2_MATERIAL_RANGE_glow');
    expect(()=>validateMaterialPreset({...preset,particles:-.1}))
      .toThrow('CC2_MATERIAL_RANGE_particles');
  });
  it('never changes gameplay position and never uses wall-clock time',()=>{
    const position={x:132,y:294},preset=defaultMaterialPreset('RELAY');
    const a=projectCreatureMaterial('RELAY',position,150,preset,'full');
    const b=projectCreatureMaterial('RELAY',position,150,preset,'full');
    expect(a).toEqual(b);
    expect(a.center).toEqual(position);
    expect(position).toEqual({x:132,y:294});
    expect(a.silhouette).toBe('weave');
  });
  it('low quality removes costly VFX but keeps source position and energy',()=>{
    const p={...defaultMaterialPreset('FRACTURE_WISP'),particles:1,glow:1};
    const high=projectCreatureMaterial('FRACTURE_WISP',{x:40,y:80},120,p,'full');
    const low=projectCreatureMaterial('FRACTURE_WISP',{x:40,y:80},120,p,'low');
    expect(low.center).toEqual(high.center);
    expect(low.edgeEnergy).toBe(high.edgeEnergy);
    expect(low.particleBudget).toBeLessThan(high.particleBudget);
    expect(low.glow).toBeLessThan(high.glow);
  });
  it('reduced motion disables deformation but never changes source',()=>{
    const p={...defaultMaterialPreset('MOLASSES_GUARDIAN'),motion:1,reducedMotion:true};
    const v=projectCreatureMaterial('MOLASSES_GUARDIAN',{x:7,y:8},42,p);
    expect(v.scale).toBe(1);
    expect(v.deformationX).toBe(0);
    expect(v.deformationY).toBe(0);
    expect(v.center).toEqual({x:7,y:8});
  });
});
