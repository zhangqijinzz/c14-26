import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_CONFIG, FIELD_ORDER, fieldLabel, validateField } from '../domain';
import type { FinanceScenario, ScenarioField } from '../types';

interface Props {
  scenarios: FinanceScenario[];
  onApply: (field: ScenarioField, value: number, targetIds: string[]) => void;
  onClose: () => void;
}

function sharedCurrentText(scenarios: FinanceScenario[], field: ScenarioField): string {
  // Prefill only when every scenario already agrees; otherwise the field is left blank
  // so nobody mistakes one scenario's value for the intended batch value.
  const first = scenarios[0]?.[field];
  if (first === undefined || !Number.isFinite(first)) return '';
  return scenarios.every((scenario) => scenario[field] === first) ? String(first) : '';
}

function formatCurrent(value: number): string {
  return Number.isFinite(value) ? String(value) : '未填写';
}

export function BatchEditDialog({ scenarios, onApply, onClose }: Props) {
  const [field, setField] = useState<ScenarioField>('inflationRate');
  const [valueText, setValueText] = useState(() => sharedCurrentText(scenarios, 'inflationRate'));
  const [checked, setChecked] = useState<Set<string>>(() => new Set(scenarios.map((scenario) => scenario.id)));
  const valueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { valueInputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const parsedValue = valueText.trim() === '' ? Number.NaN : Number(valueText);
  // Field rules are identical to the per-scenario form; only the probed field matters,
  // so any existing scenario can serve as the validation base.
  const validationError = useMemo(() => {
    if (valueText.trim() === '') return '请输入统一值';
    if (!Number.isFinite(parsedValue)) return '请输入有效数字';
    return validateField({ ...scenarios[0], [field]: parsedValue }, field);
  }, [valueText, parsedValue, field, scenarios]);

  const switchField = (next: ScenarioField) => {
    setField(next);
    setValueText(sharedCurrentText(scenarios, next));
  };

  const toggle = (id: string) => {
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = checked.size === scenarios.length;
  const canApply = !validationError && checked.size > 0;
  const config = FIELD_CONFIG[field];

  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="batch-dialog-title">
        <div className="modal-head">
          <div><span className="eyebrow">BATCH</span><h3 id="batch-dialog-title">按参数批量设置</h3></div>
          <button className="icon-button muted" type="button" onClick={onClose} title="取消" aria-label="关闭批量设置">×</button>
        </div>

        <div className="batch-step">
          <span className="batch-step__label">1 · 选择参数</span>
          <div className="batch-fields" role="radiogroup" aria-label="批量修改的参数">
            {FIELD_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={field === key}
                className={`batch-chip ${field === key ? 'is-active' : ''}`}
                onClick={() => switchField(key)}
              >{fieldLabel(key)}</button>
            ))}
          </div>
        </div>

        <div className="batch-step">
          <label className="batch-step__label" htmlFor="batch-value">2 · 统一值</label>
          <div className={`input-wrap batch-value ${validationError ? 'has-error' : ''}`}>
            <input
              id="batch-value"
              ref={valueInputRef}
              type="number"
              min={config.min}
              max={config.max}
              step={config.step}
              value={valueText}
              placeholder={`输入统一的${fieldLabel(field)}`}
              onChange={(event) => setValueText(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && canApply) onApply(field, parsedValue, [...checked]); }}
            />
            <em>{config.suffix}</em>
          </div>
          {validationError && <small className="error-text">{validationError}</small>}
        </div>

        <div className="batch-step">
          <div className="batch-targets-head">
            <span className="batch-step__label">3 · 作用情景</span>
            <button type="button" className="batch-link" onClick={() => setChecked(allChecked ? new Set() : new Set(scenarios.map((scenario) => scenario.id)))}>
              {allChecked ? '清空选择' : '全选'}
            </button>
          </div>
          <ul className="batch-targets">
            {scenarios.map((scenario) => {
              const isChecked = checked.has(scenario.id);
              const alreadyEqual = Number.isFinite(parsedValue) && scenario[field] === parsedValue;
              return (
                <li key={scenario.id}>
                  <label className={`batch-target ${isChecked ? 'is-checked' : ''}`}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(scenario.id)} />
                    <span className="table-dot" style={{ background: scenario.color }} />
                    <span className="batch-target__name">{scenario.name}</span>
                    <span className="batch-target__current">当前 {formatCurrent(scenario[field])} {config.suffix}</span>
                    {alreadyEqual && <span className="batch-target__same">已是该值</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="modal-foot">
          <span className="batch-summary">{checked.size > 0 ? `将应用到 ${checked.size} 个情景` : '未选择任何情景'}</span>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>取消</button>
            <button
              className="save-button"
              type="button"
              disabled={!canApply}
              onClick={() => onApply(field, parsedValue, [...checked])}
            >应用到 {checked.size} 个情景</button>
          </div>
        </div>
      </div>
    </div>
  );
}
