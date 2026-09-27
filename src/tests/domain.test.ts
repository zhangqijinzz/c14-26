import { describe, expect, it } from 'vitest';
import { calculateProjection, validateScenario, validateField, SAMPLE_SCENARIOS } from '../domain';
import { FIELD_ORDER } from '../domain';

describe('scenario domain', () => {
  it('calculates monthly contributions and inflation-adjusted value', () => {
    const projection = calculateProjection(SAMPLE_SCENARIOS[0]);
    expect(projection.points).toHaveLength(21);
    expect(projection.totalInvested).toBe(390000);
    expect(projection.finalValue).toBeGreaterThan(projection.totalInvested);
    expect(projection.finalRealValue).toBeLessThan(projection.finalValue);
  });

  it('rejects unreasonable years and rates', () => {
    const errors = validateScenario({ ...SAMPLE_SCENARIOS[0], years: 61, feeRate: -1 });
    expect(errors.years).toBeTruthy();
    expect(errors.feeRate).toBeTruthy();
  });

  it('keeps zero contribution scenarios valid', () => {
    const scenario = { ...SAMPLE_SCENARIOS[0], principal: 0, recurring: 0 };
    expect(validateScenario(scenario)).toEqual({});
    expect(calculateProjection(scenario).finalValue).toBe(0);
  });

  it('validateField matches validateScenario per field, so batch and manual edits share rules', () => {
    const invalid = { ...SAMPLE_SCENARIOS[0], years: 61, feeRate: -1, inflationRate: 40 };
    const whole = validateScenario(invalid);
    FIELD_ORDER.forEach((field) => {
      expect(validateField(invalid, field)).toBe(whole[field]);
    });
    expect(validateField(SAMPLE_SCENARIOS[0], 'years')).toBeUndefined();
  });
});
