/**
 * THE PURSUER TUNING PANEL — 04C.
 *
 * A developer tool, deliberately kept on the far side of the configuration
 * contract from the pursuer itself. Everything this panel does is a call into
 * `config/configurationStore.ts`, which is plain TypeScript; there is no
 * pursuit logic here and no React anywhere near Graph V2. A future host that
 * selects configurations with no interface at all uses the same functions.
 *
 * It is not part of the product HUD and nothing draws it unless somebody asks
 * for it — `?tuning=1`, or Ctrl+Shift+T while playing.
 *
 * Two behaviours are load-bearing rather than cosmetic:
 *
 *   A SLIDER NEVER SAVES. Moving one produces a DRAFT sitting on top of the
 *   selection. The baseline, the built-ins and every named configuration are
 *   left exactly as they were, and the header says MODIFIED until the draft is
 *   applied, saved or thrown away. There is no path here that writes to a
 *   frozen configuration.
 *
 *   WHAT IS RUNNING AND WHAT IS SELECTED ARE SHOWN SEPARATELY. They differ for
 *   a whole run every time somebody edits without applying, which is precisely
 *   the moment a tester would otherwise attribute what they are watching to the
 *   wrong parameters.
 */
import React, { useEffect, useMemo, useState } from 'react';

import type { useCircuitClimbPrototypeRuntime } from '../runtime/useCircuitClimbPrototypeRuntime';
import {
  EDITABLE_LAYERS, BEHAVIOUR_LAYERS, type PursuerConfiguration,
} from '../pursuer-v2/config/pursuerConfigurationSchema';
import { PARAMETER_BOUNDS } from '../pursuer-v2/config/validatePursuerConfiguration';
import {
  BASELINE_04B_R1, BASELINE_CONFIGURATION_ID, DECLARED_EXPERIMENTS,
} from '../pursuer-v2/config/configurationLibrary';
import { configurationHash, shortConfigurationHash } from '../pursuer-v2/config/configurationHash';
import { diffConfigurations, formatDiff } from '../pursuer-v2/config/configurationDiff';
import { AUTHORITY_CONFLICTS, ABSENT_PARAMETERS } from '../pursuer-v2/config/parameterAuthority';
import { TEST_NOTE_DIMENSIONS, type TestNoteRating } from '../pursuer-v2/config/testSessionNotes';
import * as store from '../pursuer-v2/config/configurationStore';

interface Props {
  runtime: ReturnType<typeof useCircuitClimbPrototypeRuntime>;
  onClose: () => void;
}

const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';

/**
 * A right-hand drawer rather than a full-screen overlay, so the game stays
 * visible and playable while somebody tunes it. Watching the pursuer is the
 * whole point of moving a slider, and an overlay that hides the board makes
 * that impossible.
 */
const shell: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px, 94vw)',
  zIndex: 99998, background: 'rgba(6,10,17,0.96)', borderLeft: '1px solid #22314a',
  color: '#dfe7ef', font: `12px ${MONO}`, display: 'flex', flexDirection: 'column',
  padding: 14, gap: 10, overflowY: 'auto',
};
const button: React.CSSProperties = {
  background: '#16202e', color: '#dfe7ef', border: '1px solid #2c3d52',
  borderRadius: 4, padding: '5px 9px', font: `11px ${MONO}`, cursor: 'pointer',
};
const card: React.CSSProperties = {
  border: '1px solid #22314a', borderRadius: 6, padding: 10, background: '#0b1220',
};
const heading: React.CSSProperties = {
  color: '#8fb6e0', letterSpacing: 1, fontSize: 11, marginBottom: 8, textTransform: 'uppercase',
};

/** The paths a human may move here, in the order they matter when tuning. */
const EDITABLE_PATHS = Object.keys(PARAMETER_BOUNDS)
  .filter((path) => (EDITABLE_LAYERS as readonly string[]).includes(path.split('.')[0]));

function readPath(configuration: PursuerConfiguration, path: string): number {
  const [layer, key] = path.split('.');
  return (configuration as any)[layer][key];
}

function labelFor(path: string): string {
  const key = path.split('.')[1];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export const PursuerConfigurationPanel: React.FC<Props> = ({ runtime, onClose }) => {
  const [state, setState] = useState<store.ConfigurationStoreState>(() => store.loadStoreState());
  const [notice, setNotice] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<{ title: string; text: string; paste: boolean } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [running, setRunning] = useState(() => runtime.getPursuerConfigurationSelection());

  // Persist on every change. A tester who closes the tab mid-session should
  // not lose the configuration they were halfway through describing.
  useEffect(() => { store.saveStoreState(state); }, [state]);
  useEffect(() => {
    const id = window.setInterval(() => setRunning(runtime.getPursuerConfigurationSelection()), 500);
    return () => window.clearInterval(id);
  }, [runtime]);

  const effective = store.effectiveConfiguration(state);
  const selected = store.selectedConfiguration(state);
  const modified = store.isModified(state);
  const hash = useMemo(() => configurationHash(effective), [effective]);
  const diff = useMemo(() => diffConfigurations(BASELINE_04B_R1, effective), [effective]);

  const say = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(null), 4000); };

  const applyAndRestart = () => {
    store.saveStoreState(state);
    runtime.restartGame();
    window.setTimeout(() => setRunning(runtime.getPursuerConfigurationSelection()), 50);
    say('Applied. The run restarted on this configuration.');
  };

  const promptFor = (question: string, fallback: string) => {
    const answer = window.prompt(question, fallback);
    return answer === null ? null : answer.trim();
  };

  const runningHash = running?.resolved.hash ?? null;
  const runningMatches = runningHash === hash;

  return (
    <div style={shell} data-testid="pursuer-configuration-panel">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ color: '#9fd0ff', fontSize: 13 }}>PURSUER CONFIGURATION</strong>
        <span style={{ opacity: 0.55 }}>developer tool · not part of the game HUD</span>
        <span style={{ marginLeft: 'auto' }}>
          <button style={button} onClick={onClose}>CLOSE (Ctrl+Shift+T)</button>
        </span>
      </div>

      {notice && <div style={{ ...card, borderColor: '#2f6f4f', color: '#a8e6c0' }}>{notice}</div>}

      {state.loadWarnings.length > 0 && (
        <div style={{ ...card, borderColor: '#7a5a20', color: '#f0d39a' }}>
          {state.loadWarnings.map((warning) => <div key={warning}>{warning}</div>)}
        </div>
      )}

      {running?.fallbackFrom && (
        <div style={{ ...card, borderColor: '#7d3030', color: '#ffb4b4' }}>
          <div style={heading}>The running pursuer is NOT the configuration that was asked for</div>
          <div>Requested: {running.fallbackFrom.requestedConfigurationId ?? '(unnamed)'}</div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{running.fallbackFrom.failure}</pre>
        </div>
      )}

      {/* ── what is running, and what is selected ─────────────────────── */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={heading}>Running now</div>
          {running ? (
            <>
              <div style={{ color: '#9fd0ff' }}>{running.resolved.configuration.identity.label}</div>
              <div style={{ opacity: 0.7 }}>{running.resolved.shortHash} · {running.reason}</div>
            </>
          ) : <div style={{ opacity: 0.6 }}>No run has started yet.</div>}
        </div>
        <div>
          <div style={heading}>Selected here</div>
          <div style={{ color: '#9fd0ff' }}>
            {selected.identity.label}
            {modified && <span style={{ color: '#ffcf7a' }}> · MODIFIED</span>}
            {!modified && selected.metadata.lifecycle !== 'BASELINE' && (
              <span style={{ color: '#c9a6ff' }}> · {selected.metadata.lifecycle}</span>
            )}
          </div>
          <div style={{ opacity: 0.7 }}>{shortConfigurationHash(effective)}</div>
        </div>
        {!runningMatches && (
          <div style={{ gridColumn: '1 / -1', color: '#ffcf7a' }}>
            These differ. What you are watching is the pursuer on the left — apply to change it.
          </div>
        )}
      </div>

      {/* ── selection and actions ─────────────────────────────────────── */}
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <select
          value={state.selectedId}
          onChange={(event) => setState(store.select(state, event.target.value))}
          style={{ ...button, minWidth: 240 }}
        >
          {store.allConfigurations(state).map((configuration) => (
            <option key={configuration.identity.configurationId} value={configuration.identity.configurationId}>
              {configuration.identity.label}
              {store.isBuiltIn(configuration.identity.configurationId) ? '  (built-in)' : ''}
            </option>
          ))}
        </select>

        <button
          style={button}
          onClick={() => {
            const label = promptFor('Name this configuration', `${selected.identity.label} variant`);
            if (label) { setState(store.saveAsNew(state, label, { now: new Date().toISOString() })); say(`Saved "${label}" as EXPERIMENTAL.`); }
          }}
        >NEW FROM CURRENT</button>

        <button
          style={button}
          onClick={() => {
            const label = promptFor('Name the duplicate', `${selected.identity.label} copy`);
            if (label) { setState(store.saveAsNew(store.resetToSelected(state), label, { now: new Date().toISOString() })); say(`Duplicated as "${label}".`); }
          }}
        >DUPLICATE</button>

        <button
          style={{ ...button, opacity: store.isBuiltIn(state.selectedId) ? 0.4 : 1 }}
          disabled={store.isBuiltIn(state.selectedId)}
          title={store.isBuiltIn(state.selectedId) ? 'Built-in configurations cannot be renamed. Duplicate it instead.' : ''}
          onClick={() => {
            const label = promptFor('New name', selected.identity.label);
            if (label) setState(store.rename(state, state.selectedId, label));
          }}
        >RENAME</button>

        <button style={{ ...button, opacity: modified ? 1 : 0.4 }} disabled={!modified}
          onClick={() => setState(store.resetToSelected(state))}>RESET TO SELECTED</button>

        <button style={button} onClick={() => { setState(store.resetToBaseline(state)); say('Back to the accepted 04B-R1 pursuer.'); }}>
          RESET TO 04B-R1
        </button>

        <button style={{ ...button, background: '#1d3a52', borderColor: '#3f6a92' }} onClick={applyAndRestart}>
          APPLY AND RESTART
        </button>

        <button style={button} onClick={() => setTransfer({ title: 'Configuration JSON', text: JSON.stringify(effective, null, 2), paste: false })}>
          COPY JSON
        </button>
        <button style={button} onClick={() => setTransfer({ title: 'Paste a configuration', text: '', paste: true })}>
          PASTE JSON
        </button>
        <button style={button} onClick={() => setTransfer({
          title: 'Identity and behaviour hash',
          text: `${effective.identity.configurationId}\n${hash}`,
          paste: false,
        })}>COPY ID+HASH</button>
        <button style={button} onClick={() => setShowDiff((open) => !open)}>
          {showDiff ? 'HIDE DIFF' : 'COMPARE TO BASELINE'}
        </button>

        {!store.isBuiltIn(state.selectedId) && (
          <button style={{ ...button, borderColor: '#6b3232' }}
            onClick={() => { if (window.confirm(`Delete "${selected.identity.label}"?`)) setState(store.remove(state, state.selectedId)); }}>
            DELETE
          </button>
        )}
      </div>

      {showDiff && (
        <div style={card}>
          <div style={heading}>Difference from 04B-R1 BASELINE</div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{formatDiff(diff).join('\n')}</pre>
        </div>
      )}

      {transfer && (
        <div style={card}>
          <div style={heading}>{transfer.title}</div>
          <textarea
            defaultValue={transfer.text}
            id="pursuerConfigTransfer"
            autoFocus
            onFocus={(event) => { if (!transfer.paste) event.currentTarget.select(); }}
            style={{
              width: '100%', minHeight: 140, background: '#060b14', color: '#cfe0f0',
              border: '1px solid #22314a', borderRadius: 4, font: `11px ${MONO}`, padding: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {transfer.paste && (
              <button style={button} onClick={() => {
                const value = (document.getElementById('pursuerConfigTransfer') as HTMLTextAreaElement).value;
                const outcome = store.pasteConfiguration(state, value, { now: new Date().toISOString() });
                if (outcome.ok) { setState(outcome.state); setTransfer(null); say('Loaded, as a new EXPERIMENTAL configuration.'); }
                else say(`Refused: ${outcome.failure}`);
              }}>LOAD IT</button>
            )}
            <button style={button} onClick={() => setTransfer(null)}>DONE</button>
          </div>
          {!transfer.paste && (
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              Selected and ready to copy. The clipboard API is unavailable in an embedded frame, so this is the reliable route.
            </div>
          )}
        </div>
      )}

      {/* ── the editable parameters ───────────────────────────────────── */}
      <div style={card}>
        <div style={heading}>Tunable · locomotion and perception</div>
        {EDITABLE_PATHS.map((path) => {
          const bound = PARAMETER_BOUNDS[path];
          const value = readPath(effective, path);
          const baseline = readPath(BASELINE_04B_R1, path);
          const changed = value !== baseline;
          return (
            <div key={path} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 130px', gap: 10, alignItems: 'center', marginBottom: 4 }}>
              <label htmlFor={path} title={bound.reason} style={{ color: changed ? '#ffcf7a' : '#c6d3e2' }}>
                {labelFor(path)}{changed ? ' *' : ''}
              </label>
              <input
                id={path}
                type="range"
                min={bound.min}
                max={bound.max}
                step={bound.step}
                value={value}
                onChange={(event) => setState(store.editParameter(state, path, Number(event.target.value)))}
              />
              <span style={{ opacity: 0.85 }}>
                {value}{bound.unit}
                {changed && <span style={{ opacity: 0.5 }}> (was {baseline})</span>}
              </span>
            </div>
          );
        })}
        <div style={{ opacity: 0.6, marginTop: 6 }}>
          Every slider range is the same table the validator checks against, so nothing here can produce a
          configuration that is then refused. Hover a name for why its bound is where it is.
        </div>
      </div>

      {/* ── the frozen parameters ─────────────────────────────────────── */}
      <div style={card}>
        <div style={heading}>Frozen · carried in the payload, not editable in this build</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 4 }}>
          {BEHAVIOUR_LAYERS.filter((layer) => !(EDITABLE_LAYERS as readonly string[]).includes(layer))
            .flatMap((layer) => Object.entries((effective as any)[layer] as Record<string, unknown>)
              .map(([key, value]) => (
                <div key={`${layer}.${key}`} style={{ opacity: 0.75 }}>
                  {layer}.{key} = <span style={{ color: '#9fd0ff' }}>{String(value)}</span>
                </div>
              )))}
        </div>
        <div style={{ opacity: 0.6, marginTop: 8 }}>
          The four confirmation windows are counted in TICKS, not milliseconds — their wall-clock length
          depends on the display refresh rate. They are frozen until a PM task demonstrates which of them
          is a tuning parameter rather than a derived constant.
        </div>
      </div>

      {/* ── test notes ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={heading}>Test notes · recorded with the run, never interpreted</div>
        {TEST_NOTE_DIMENSIONS.map((dimension) => (
          <div key={dimension.key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8, alignItems: 'center', marginBottom: 3 }}>
            <span title={dimension.prompt}>{dimension.label}</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((rating) => {
                const active = state.notes.ratings[dimension.key] === rating;
                return (
                  <button
                    key={rating}
                    style={{ ...button, padding: '2px 8px', background: active ? '#2b5b86' : '#16202e' }}
                    onClick={() => setState(store.setNotes(state, {
                      ...state.notes,
                      ratings: { ...state.notes.ratings, [dimension.key]: (active ? null : rating) as TestNoteRating },
                      recordedAt: new Date().toISOString(),
                    }))}
                  >{rating}</button>
                );
              })}
              <span style={{ opacity: 0.5, fontSize: 10 }}>{dimension.prompt}</span>
            </span>
          </div>
        ))}
        <textarea
          placeholder="What did it actually feel like? This is the most useful field here — the 04B defect arrived as one sentence."
          value={state.notes.freeText}
          onChange={(event) => setState(store.setNotes(state, {
            ...state.notes, freeText: event.target.value, recordedAt: new Date().toISOString(),
          }))}
          style={{
            width: '100%', minHeight: 70, marginTop: 8, background: '#060b14', color: '#cfe0f0',
            border: '1px solid #22314a', borderRadius: 4, font: `11px ${MONO}`, padding: 8,
          }}
        />
        <div style={{ opacity: 0.6, marginTop: 6 }}>
          Exported with the run by Ctrl+Shift+D. Nothing scores or averages these, and no configuration is
          ever selected because of them.
        </div>
      </div>

      {/* ── declared experiments ──────────────────────────────────────── */}
      <div style={card}>
        <div style={heading}>Declared experiments · awaiting authorization</div>
        {DECLARED_EXPERIMENTS.map((experiment) => (
          <div key={experiment.key} style={{ marginBottom: 10 }}>
            <div style={{ color: '#c9a6ff' }}>{experiment.label}</div>
            <div style={{ opacity: 0.8 }}>{experiment.hypothesis}</div>
            <div style={{ opacity: 0.65 }}>Intended effect: {experiment.intendedPlayerVisibleEffect}</div>
            <div style={{ color: '#f0b878' }}>BLOCKED — {experiment.blockedBy}</div>
          </div>
        ))}
      </div>

      {/* ── what the audit found ──────────────────────────────────────── */}
      <div style={card}>
        <div style={heading}>Parameter-authority audit</div>
        {AUTHORITY_CONFLICTS.map((conflict) => (
          <div key={conflict.symbol} style={{ opacity: 0.8 }}>
            {conflict.symbol} declares {conflict.declares}; production runs {conflict.productionRuns}.
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          {ABSENT_PARAMETERS.map((absent) => (
            <div key={absent.requested} style={{ opacity: 0.8 }}>
              {absent.requested} does not exist — the real quantity is {absent.realQuantity}.
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PursuerConfigurationPanel;
