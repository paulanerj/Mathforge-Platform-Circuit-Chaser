/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CurriculumBlock } from '../../../types';
import { INITIAL_CURRICULUM_BLOCKS, STORAGE_KEYS } from '../../../constants';

const CurriculumValidator = {
  validate(curriculum: CurriculumBlock[]) {
    const errors: string[] = [];
    if (!curriculum || curriculum.length === 0) return { valid: false, errors: ['Curriculum cannot be empty.'] };
    const sorted = [...curriculum].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 1) errors.push('Curriculum must start at step 1.');
    for (let i = 0; i < sorted.length; i++) {
      const block = sorted[i];
      if (block.start >= block.end) errors.push(`Block ${i + 1}: Start (${block.start}) must be strictly less than End (${block.end}).`);
      if (block.modifiers < 1 || block.modifiers > 3) errors.push(`Block ${i + 1}: Modifiers must be between 1 and 3.`);
      if (block.timer < 3) errors.push(`Block ${i + 1}: Timer must be at least 3 seconds.`);
      if (block.rangeMax < 2) errors.push(`Block ${i + 1}: RangeMax must be at least 2.`);
      if (block.distractors < 1 || block.distractors > 3) errors.push(`Block ${i + 1}: Distractors must be between 1 and 3.`);
      if (!/^[+\-×÷]+$/.test(block.operations)) errors.push(`Block ${i + 1}: Operations must only contain +, -, ×, ÷.`);
      if (i > 0) {
        const prev = sorted[i - 1];
        if (block.start < prev.end + 1)
          errors.push(`Overlap: Block starting at ${block.start} overlaps with previous block ending at ${prev.end}.`);
        else if (block.start > prev.end + 1) errors.push(`Gap: Missing steps between ${prev.end} and ${block.start}.`);
      }
    }
    return { valid: errors.length === 0, errors };
  },
};

const DifficultyVisualizer = ({ curriculum }: { curriculum: CurriculumBlock[] }) => {
  const dataPoints = useMemo(() => {
    const points: { step: number; score: number }[] = [];
    curriculum.forEach((b) => {
      const score = Math.min(
        1,
        Math.min(1, b.rangeMax / 50) * 0.25 +
          (b.modifiers / 3) * 0.25 +
          (b.operations.length / 4) * 0.15 +
          (b.distractors / 3) * 0.1 +
          Math.max(0, (15 - b.timer) / 12) * 0.15 +
          (b.variables ? 0.1 : 0)
      );
      for (let i = b.start; i <= b.end; i++) points.push({ step: i, score });
    });
    return points;
  }, [curriculum]);
  if (dataPoints.length === 0) return null;
  const maxSteps = dataPoints[dataPoints.length - 1].step;
  return (
    <div className="w-full mt-4">
      <h3 className="text-xs font-bold text-[var(--sa-ui-text-muted)] uppercase mb-2">Difficulty Ramp</h3>
      <div className="w-full h-32 bg-[var(--sa-card)] rounded-xl border border-[var(--sa-ui-border)] relative overflow-hidden flex items-end">
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${maxSteps} 100`} preserveAspectRatio="none">
          <polygon
            fill="rgba(56, 189, 248, 0.2)"
            points={`0,100 ${dataPoints.map((dp) => `${dp.step},${100 - dp.score * 100}`).join(' ')} ${maxSteps},100`}
          />
          <polyline
            fill="none"
            stroke="var(--sa-primary)"
            strokeWidth="3"
            strokeLinejoin="round"
            points={dataPoints.map((dp) => `${dp.step},${100 - dp.score * 100}`).join(' ')}
          />
        </svg>
      </div>
    </div>
  );
};

export const CurriculumEditor = () => {
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRICULUM);
    if (stored) {
      try {
        setBlocks(JSON.parse(stored));
      } catch (e) {
        setBlocks(INITIAL_CURRICULUM_BLOCKS);
      }
    } else {
      setBlocks(INITIAL_CURRICULUM_BLOCKS);
    }
  }, []);

  const handleSave = () => {
    const validation = CurriculumValidator.validate(blocks);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSuccessMsg('');
      return;
    }
    setErrors([]);
    localStorage.setItem(STORAGE_KEYS.CURRICULUM, JSON.stringify(blocks));
    (window as any).CURRICULUM_BLOCKS = blocks;
    setSuccessMsg('Curriculum saved & validated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const updateBlock = (index: number, key: keyof CurriculumBlock, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [key]: value };
    setBlocks(newBlocks);
  };

  const addBlock = () => {
    const last = blocks[blocks.length - 1];
    setBlocks([
      ...blocks,
      {
        start: last ? last.end + 1 : 1,
        end: last ? last.end + 5 : 5,
        rangeMax: 10,
        modifiers: 2,
        operations: '+-',
        timer: 10,
        distractors: 2,
        variables: false,
      },
    ]);
  };

  const removeBlock = (index: number) => setBlocks(blocks.filter((_, i) => i !== index));

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(blocks, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'speedmath_curriculum.json');
    dlAnchorElem.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const validation = CurriculumValidator.validate(parsed);
        if (!validation.valid) {
          setErrors(validation.errors);
          return;
        }
        setBlocks(parsed);
        setErrors([]);
      } catch (err) {
        setErrors(['Invalid JSON file format.']);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {errors.length > 0 && (
        <div className="bg-[var(--sa-error)] text-[var(--sa-text-inverse)] p-3 rounded-xl text-xs font-bold">
          {errors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}
      {successMsg && (
        <div className="bg-[var(--sa-success)] text-[var(--sa-text-inverse)] p-3 rounded-xl text-xs font-bold text-center">
          {successMsg}
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-3 p-2 rounded-xl bg-[var(--sa-ui-bg)] border border-[var(--sa-ui-border)] scrollbar-hide">
        {blocks.map((block, i) => (
          <div key={i} className="sa-card p-3 grid grid-cols-2 gap-2 text-xs relative border border-[var(--sa-ui-border)] shadow-sm">
            <button
              onClick={() => removeBlock(i)}
              className="absolute top-1 right-2 text-[var(--sa-error)] font-black text-lg leading-none hover:scale-110"
            >
              &times;
            </button>

            <div className="col-span-2 font-bold text-[var(--sa-ui-text-muted)] mb-1 border-b border-[var(--sa-ui-border)] pb-1">
              Block {i + 1}
            </div>

            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Start Step{' '}
              <input
                type="number"
                value={block.start}
                onChange={(e) => updateBlock(i, 'start', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              End Step{' '}
              <input
                type="number"
                value={block.end}
                onChange={(e) => updateBlock(i, 'end', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Range Max{' '}
              <input
                type="number"
                value={block.rangeMax}
                onChange={(e) => updateBlock(i, 'rangeMax', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Timer (s){' '}
              <input
                type="number"
                value={block.timer}
                onChange={(e) => updateBlock(i, 'timer', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Modifiers{' '}
              <input
                type="number"
                max="3"
                value={block.modifiers}
                onChange={(e) => updateBlock(i, 'modifiers', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Distractors{' '}
              <input
                type="number"
                max="3"
                value={block.distractors}
                onChange={(e) => updateBlock(i, 'distractors', parseInt(e.target.value))}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex flex-col text-[var(--sa-ui-text)] font-bold">
              Ops (+-×÷){' '}
              <input
                type="text"
                value={block.operations}
                onChange={(e) => updateBlock(i, 'operations', e.target.value)}
                className="sa-input p-1 rounded mt-1"
              />
            </label>
            <label className="flex items-center gap-2 mt-4 text-[var(--sa-ui-text)] font-bold">
              <input
                type="checkbox"
                checked={block.variables}
                onChange={(e) => updateBlock(i, 'variables', e.target.checked)}
                className="accent-[var(--sa-primary)] w-4 h-4"
              />{' '}
              Variables
            </label>
          </div>
        ))}
      </div>

      <DifficultyVisualizer curriculum={blocks} />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={addBlock} className="sa-btn py-3 text-xs font-bold bg-[var(--sa-ui-panel)]">
          Add Block
        </button>
        <button
          onClick={handleSave}
          className="sa-btn py-3 text-xs font-bold !bg-[var(--sa-primary)] !text-[var(--sa-text-inverse)] !border-[var(--sa-primary)]"
        >
          Validate & Save
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1 border-t border-[var(--sa-ui-border)] pt-3">
        <button onClick={handleExport} className="sa-btn py-3 text-xs font-bold bg-[var(--sa-ui-panel)]">
          Export JSON
        </button>
        <label className="sa-btn py-3 text-xs font-bold bg-[var(--sa-ui-panel)] text-center cursor-pointer flex items-center justify-center m-0">
          Import JSON
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </div>
  );
};
