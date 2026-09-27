import { useEffect, useState } from 'react';
import { fieldLabel, SAMPLE_SCENARIOS, validateScenario } from '../domain';
import type { FinanceScenario, ScenarioField } from '../types';
import { SCENARIO_FIELD_META } from './ScenarioForm';

interface Props {
  scenarios: FinanceScenario[];
  onApply: (field: ScenarioField, value: number, ids: string[]) => void;
  onClose: () => void;
}

export function BatchEditDialog({ scenarios, onApply, onClose }: Props) {
  const [field, setField] = useState<ScenarioField>('inflationRate');
  const [rawValue, setRawValue] = useState(() => String(scenarios[0]?.inflationRate ?? ''));
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(scenarios.map((scenario) => scenario.id)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = SCENARIO_FIELD_META.find((item) => item.key === field) ?? SCENARIO_FIELD_META[0];
  const value = rawValue === '' ? Number.NaN : Number(rawValue);
  // Reuse the single-scenario validator on a known-valid probe so the batch
  // value is checked by exactly the same rules as a manual field edit.
  const valueError = Number.isFinite(value) ? validateScenario({ ...SAMPLE_SCENARIOS[0], [field]: value })[field] ?? null : null;

  const selectedIds = scenarios.filter((scenario) => checked.has(scenario.id)).map((scenario) => scenario.id);
  const allChecked = selectedIds.length === scenarios.length;
  const canApply = Number.isFinite(value) && !valueError && selectedIds.length > 0;

  const pickField = (next: ScenarioField) => {
    setField(next);
    setRawValue(String(scenarios[0]?.[next] ?? ''));
  };
  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(scenarios.map((scenario) => scenario.id)));

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="批量设置参数" onClick={(event) => event.stopPropagation()}>
        <div className="dialog__head">
          <div><span className="eyebrow">BATCH EDIT</span><h3>批量设置参数</h3></div>
          <button className="icon-button muted" type="button" onClick={onClose} title="关闭" aria-label="关闭">×</button>
        </div>
        <p className="dialog__hint">选择参数并设定新值，勾选要应用的情景。确认后作为一次完整变更生效，结果与逐个手动修改完全一致；取消不会改动任何情景。</p>

        <div className="batch-field-picker" role="group" aria-label="要修改的参数">
          {SCENARIO_FIELD_META.map(({ key }) => (
            <button key={key} type="button" className={key === field ? 'active' : ''} onClick={() => pickField(key)}>{fieldLabel(key)}</button>
          ))}
        </div>

        <label className="field batch-value">
          <span>{fieldLabel(field)}新值</span>
          <div className={`input-wrap ${valueError ? 'has-error' : ''}`}>
            <input
              aria-label={`批量设置${fieldLabel(field)}`}
              type="number"
              min={field === 'years' ? 1 : undefined}
              max={field === 'years' ? 60 : undefined}
              step={meta.step}
              value={rawValue}
              autoFocus
              onChange={(event) => setRawValue(event.target.value)}
            />
            <em>{meta.suffix}</em>
          </div>
          {valueError && <small className="error-text">{valueError}</small>}
        </label>

        <div className="batch-targets" role="group" aria-label="应用到的情景">
          <label className="batch-target batch-target--all">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            全选 · 已选 {selectedIds.length}/{scenarios.length} 个情景
          </label>
          {scenarios.map((scenario) => (
            <label className="batch-target" key={scenario.id}>
              <input type="checkbox" checked={checked.has(scenario.id)} onChange={() => toggle(scenario.id)} />
              <span className="table-dot" style={{ background: scenario.color }} />
              {scenario.name}
              <em>{fieldLabel(field)}：{Number.isNaN(scenario[field]) ? '—' : scenario[field]}{meta.suffix ? ` ${meta.suffix}` : ''}</em>
            </label>
          ))}
        </div>

        <div className="dialog__footer">
          <button className="secondary-button" type="button" onClick={onClose}>取消</button>
          <button className="save-button" type="button" disabled={!canApply} onClick={() => onApply(field, value, selectedIds)}>应用到 {selectedIds.length} 个情景</button>
        </div>
      </div>
    </div>
  );
}
