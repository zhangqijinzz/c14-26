import type {
  FinanceScenario,
  ProjectionPoint,
  ScenarioField,
  ScenarioProjection,
  ValidationErrors,
} from './types';

export const COLORS = ['#e4774e', '#286f68', '#5e65c7', '#c49336', '#b45d88'];

export const FIELD_ORDER: ScenarioField[] = ['principal', 'recurring', 'years', 'annualRate', 'inflationRate', 'feeRate'];

export interface FieldConfig {
  suffix: string;
  step: string;
  min?: number;
  max?: number;
}

export const FIELD_CONFIG: Record<ScenarioField, FieldConfig> = {
  principal: { suffix: '元', step: '1000' },
  recurring: { suffix: '元 / 月', step: '100' },
  years: { suffix: '年', step: '1', min: 1, max: 60 },
  annualRate: { suffix: '% / 年', step: '0.1' },
  inflationRate: { suffix: '% / 年', step: '0.1' },
  feeRate: { suffix: '% / 年', step: '0.1' },
};

export const SAMPLE_SCENARIOS: FinanceScenario[] = [
  { id: 'steady', name: '稳健积累', color: COLORS[0], principal: 30000, recurring: 1500, years: 20, annualRate: 4.5, inflationRate: 2, feeRate: 0.4 },
  { id: 'balanced', name: '平衡增长', color: COLORS[1], principal: 30000, recurring: 1500, years: 20, annualRate: 7, inflationRate: 2, feeRate: 0.6 },
  { id: 'growth', name: '长期增长', color: COLORS[2], principal: 30000, recurring: 1500, years: 20, annualRate: 9, inflationRate: 2.5, feeRate: 0.8 },
];

const FIELD_RULES: Record<ScenarioField, (scenario: FinanceScenario) => string | undefined> = {
  principal: (scenario) => (!Number.isFinite(scenario.principal) || scenario.principal < 0 ? '请输入不小于 0 的金额' : undefined),
  recurring: (scenario) => (!Number.isFinite(scenario.recurring) || scenario.recurring < 0 ? '请输入不小于 0 的金额' : undefined),
  years: (scenario) => (!Number.isInteger(scenario.years) || scenario.years < 1 || scenario.years > 60 ? '年限需为 1–60 年的整数' : undefined),
  annualRate: (scenario) => (!Number.isFinite(scenario.annualRate) || scenario.annualRate < -50 || scenario.annualRate > 100 ? '收益率需在 -50% 至 100% 之间' : undefined),
  inflationRate: (scenario) => (!Number.isFinite(scenario.inflationRate) || scenario.inflationRate < 0 || scenario.inflationRate > 30 ? '通胀率需在 0% 至 30% 之间' : undefined),
  feeRate: (scenario) => (!Number.isFinite(scenario.feeRate) || scenario.feeRate < 0 || scenario.feeRate > 10 ? '费用率需在 0% 至 10% 之间' : undefined),
};

export function validateField(scenario: FinanceScenario, field: ScenarioField): string | undefined {
  return FIELD_RULES[field](scenario);
}

export function validateScenario(scenario: FinanceScenario): ValidationErrors {
  const errors: ValidationErrors = {};
  FIELD_ORDER.forEach((field) => {
    const message = FIELD_RULES[field](scenario);
    if (message) errors[field] = message;
  });
  return errors;
}

export function calculateProjection(scenario: FinanceScenario): ScenarioProjection {
  const monthlyRate = Math.pow(1 + (scenario.annualRate - scenario.feeRate) / 100, 1 / 12) - 1;
  let nominal = scenario.principal;
  let invested = scenario.principal;
  const points: ProjectionPoint[] = [{ year: 0, nominal, real: nominal, invested }];

  for (let month = 1; month <= scenario.years * 12; month += 1) {
    nominal = nominal * (1 + monthlyRate) + scenario.recurring;
    invested += scenario.recurring;
    if (month % 12 === 0) {
      const year = month / 12;
      points.push({ year, nominal, real: nominal / Math.pow(1 + scenario.inflationRate / 100, year), invested });
    }
  }
  const final = points[points.length - 1];
  return { scenarioId: scenario.id, points, finalValue: final.nominal, finalRealValue: final.real, totalInvested: final.invested };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function fieldLabel(field: ScenarioField): string {
  return { principal: '初始金额', recurring: '每月投入', years: '投资年限', annualRate: '年化收益', inflationRate: '通胀率', feeRate: '费用率' }[field];
}
