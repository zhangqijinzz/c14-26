import type { CSSProperties } from 'react';
import { FIELD_CONFIG, FIELD_ORDER, fieldLabel } from '../domain';
import type { FinanceScenario, ScenarioField, ValidationErrors } from '../types';

interface Props {
  scenario: FinanceScenario;
  errors: ValidationErrors;
  onUpdate: (field: ScenarioField, value: number) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function ScenarioForm({ scenario, errors, onUpdate, onRename, onDuplicate, onRemove }: Props) {
  return (
    <section className="scenario-card" style={{ '--accent': scenario.color } as CSSProperties}>
      <div className="scenario-card__head">
        <span className="scenario-dot" />
        <input className="scenario-name" aria-label="情景名称" value={scenario.name} onChange={(event) => onRename(event.target.value)} />
        <button className="icon-button" type="button" onClick={onDuplicate} title="复制情景" aria-label="复制情景">＋</button>
        <button className="icon-button muted" type="button" onClick={onRemove} title="删除情景" aria-label="删除情景">×</button>
      </div>
      <div className="field-grid">
        {FIELD_ORDER.map((key) => {
          const { suffix, step, min, max } = FIELD_CONFIG[key];
          return (
          <label className="field" key={key}>
            <span>{fieldLabel(key)}</span>
            <div className={`input-wrap ${errors[key] ? 'has-error' : ''}`}>
              <input
                aria-label={`${scenario.name} ${fieldLabel(key)}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={Number.isNaN(scenario[key]) ? '' : scenario[key]}
                onChange={(event) => onUpdate(key, event.target.value === '' ? Number.NaN : Number(event.target.value))}
              />
              <em>{suffix}</em>
            </div>
            {errors[key] && <small className="error-text">{errors[key]}</small>}
          </label>
          );
        })}
      </div>
    </section>
  );
}
