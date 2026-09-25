import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { ScreepsProfile } from '../../api/types';
import {
  POWER_BY_KEY, addPowerCreep, creepLevel, emptyRoster, issuesByPath, parseRosterDraft, removePowerCreep,
  renamePowerCreep, requiredGpl, serializeRoster, setPowerLevel, validateRoster,
  type PowerCreepRoster, type RosterPowerCreep,
} from '../../game/powerRoster';
import { rosterView, summaryLine } from './rosterView';
import settingsStyles from '../Settings/Settings.module.css';
import styles from './PowerCreepRoster.module.css';

interface Props {
  scenario: string;
  text: string;
  onChange: (text: string) => void;
}

// Any power key the draft carries that isn't one of the 19 known ones — a
// typo mid-edit, or a name the engine has retired. rosterView only covers the
// known table, so these get their own (red) row below it.
function unknownKeys(pc: RosterPowerCreep): string[] {
  return Object.keys(pc.powers).filter((key) => !Object.prototype.hasOwnProperty.call(POWER_BY_KEY, key));
}

export function PowerCreepRosterEditor({ scenario, text, onChange }: Props) {
  // Edits live in a draft, not in the text: a field-level mistake must stay on
  // screen next to its field, not turn the whole form into an error page.
  const [draft, setDraft] = useState<PowerCreepRoster | null>(null);
  const emittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (text === emittedRef.current) return;       // our own echo
    setDraft(parseRosterDraft(text).draft);        // external change: load, import, reset
  }, [text]);
  const parsed = parseRosterDraft(text);
  const roster = parsed.fatal ? null : (draft || parsed.draft);
  const update = (next: PowerCreepRoster) => {
    setDraft(next);
    const out = serializeRoster(next);
    emittedRef.current = out;
    onChange(out);
  };
  const issues = roster ? issuesByPath(validateRoster(roster).issues) : {};

  // Import from server: its own server list, as ScenarioSettingsEditor fetches
  // its own registries. Defaults to the scenario's effective server.
  const [servers, setServers] = useState<ScreepsProfile[]>([]);
  const [server, setServer] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([api.servers(), api.scenarioSettings(scenario)])
      .then(([s, settings]) => {
        if (!live) return;
        setServers(s.profiles);
        setServer(settings.effectiveServer || s.default || '');
      })
      .catch(() => {});
    return () => { live = false; };
  }, [scenario]);

  const runImport = async () => {
    setImporting(true); setImportError(null);
    try {
      const result = await api.importPowerCreeps(scenario, server);
      if (result.error) setImportError(result.error);
      // The [text] effect above loads this as an external change; the Edit
      // tab's own dirty machinery then shows it as unsaved. This never saves.
      else if (result.content !== undefined) onChange(result.content);
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (parsed.fatal) {
    return (
      <div className={settingsStyles.section}>
        <div className={settingsStyles.err}>power-creeps.json cannot be shown as a form: {parsed.fatal}</div>
        <div className={settingsStyles.hint}>Switch to the JSON view to repair it — your text is untouched.</div>
        <button className={styles.addCreep} onClick={() => onChange(serializeRoster(emptyRoster()))}>Reset to empty</button>
      </div>
    );
  }

  const rosterValue = roster!;
  const rootIssues = (issues[''] || []).concat(issues['gpl'] || []);

  const setLevel = (creepIndex: number, key: string, level: number) => update(setPowerLevel(rosterValue, creepIndex, key, level));

  return (
    <div className={styles.wrap}>
      <div className={settingsStyles.section}>
        <div className={settingsStyles.label}>Power creeps</div>
        <div className={styles.headerRow}>
          <span>GPL</span>
          <input
            type="number"
            value={rosterValue.gpl === undefined ? '' : rosterValue.gpl}
            placeholder="auto"
            onChange={(e) => update({ ...rosterValue, gpl: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          <span className={styles.gplHint}>needs &ge; {requiredGpl(rosterValue)}</span>
          <span style={{ flex: 1 }} />
          <span>Import from server</span>
          <select value={server} onChange={(e) => setServer(e.target.value)}>
            <option value="">(default)</option>
            {servers.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <button disabled={importing} onClick={runImport}>{importing ? 'importing…' : 'Import from server'}</button>
          {importError && <div className={styles.importError}>{importError}</div>}
        </div>
        {rootIssues.map((issue, i) => (
          <div key={i} className={issue.severity === 'error' ? settingsStyles.err : styles.warnText}>{issue.message}</div>
        ))}
        <div className={settingsStyles.hint}>
          Available to the bot unspawned; it spawns them itself. Placed ones come from a map&rsquo;s powerCreeps.
          Import them with the map import&rsquo;s Power creeps checkbox, or with Import from server above.
        </div>
      </div>

      {rosterValue.powerCreeps.map((pc, index) => {
        const powerIssues = issues['powerCreeps[' + index + '].powers'] || [];
        const nameIssues = issues['powerCreeps[' + index + '].name'] || [];
        const extraKeys = unknownKeys(pc);
        return (
          <div key={index} className={styles.card}>
            <div className={styles.cardHead}>
              <input
                type="text"
                value={pc.name}
                onChange={(e) => update(renamePowerCreep(rosterValue, index, e.target.value))}
              />
              <span className={styles.className}>{pc.className}</span>
              <span className={styles.summary}>{summaryLine(pc)}</span>
              <button
                className={styles.removeCreep}
                title="Remove this power creep"
                onClick={() => {
                  if (creepLevel(pc) > 0 && !window.confirm('Remove ' + pc.name + '? It has levels invested.')) return;
                  update(removePowerCreep(rosterValue, index));
                }}
              >Remove</button>
            </div>
            {nameIssues.map((issue, i) => (
              <div key={i} className={issue.severity === 'error' ? settingsStyles.err : styles.warnText}>{issue.message}</div>
            ))}
            {powerIssues.map((issue, i) => (
              <div key={i} className={issue.severity === 'error' ? settingsStyles.err : styles.warnText}>{issue.message}</div>
            ))}

            <div className={styles.grid}>
              {rosterView(rosterValue, index).map((row) => {
                const canRaise = !row.maxed && row.blocker === null;
                const canLower = row.level > 0;
                const targets = POWER_BY_KEY[row.key]?.targets;
                return (
                  <div key={row.key} className={`${styles.row} ${row.level > 0 ? styles.learned : styles.unlearned}`} title={targets}>
                    <div className={styles.rowIconLabel}>
                      <span className={styles.pill}>{row.short}</span>
                      <span className={styles.rowLabel}>{row.label}</span>
                    </div>
                    <div className={styles.stepper}>
                      <button
                        aria-label={'Lower ' + row.label + ' level'}
                        aria-disabled={!canLower}
                        onClick={() => { if (canLower) setLevel(index, row.key, row.level - 1); }}
                      >&minus;</button>
                      <span className={styles.level}>{row.level}</span>
                      <button
                        aria-label={'Raise ' + row.label + ' level'}
                        aria-disabled={!canRaise}
                        onClick={() => { if (canRaise) setLevel(index, row.key, row.level + 1); }}
                      >+</button>
                    </div>
                    <div className={styles.blocker}>{row.blocker || (row.maxed ? 'max level' : '')}</div>
                    <div className={styles.description}>
                      <span>{row.description}</span>
                      <span className={styles.cost}>{row.costLine}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {extraKeys.map((key) => {
              const keyIssues = issues['powerCreeps[' + index + '].powers.' + key] || [];
              return (
                <div key={key} className={styles.unknownRow}>
                  <span>{key} (L{pc.powers[key]}): {keyIssues.map((issue) => issue.message).join('; ') || 'unknown power'}</span>
                  <button onClick={() => setLevel(index, key, 0)}>Remove</button>
                </div>
              );
            })}
          </div>
        );
      })}

      <button className={styles.addCreep} onClick={() => update(addPowerCreep(rosterValue))}>+ Add power creep</button>
    </div>
  );
}
