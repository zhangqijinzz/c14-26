import { describe, expect, it } from 'vitest';
import { SAMPLE_SCENARIOS } from '../domain';
import type { PersistedWorkspace } from '../types';
import { MoneyScenarioViewModel } from '../viewModel';
import type { ScenarioRepository } from '../repository';

class MemoryRepository implements ScenarioRepository {
  constructor(private value: PersistedWorkspace | null = null, private failSave = false) {}
  async load() { return this.value; }
  async save(workspace: PersistedWorkspace) { if (this.failSave) throw new Error('storage'); this.value = workspace; }
}

describe('MoneyScenarioViewModel', () => {
  it('initializes sample scenarios and updates projections', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    expect(vm.getSnapshot().scenarios).toHaveLength(3);
    vm.updateField('steady', 'years', 30);
    expect(vm.getSnapshot().projections[0].points).toHaveLength(31);
  });

  it('restores saved state and surfaces invalid input', async () => {
    const saved = { version: 1 as const, scenarios: [{ ...SAMPLE_SCENARIOS[0], years: 12 }], selectedId: 'steady' };
    const vm = new MoneyScenarioViewModel(new MemoryRepository(saved));
    await vm.init();
    expect(vm.getSnapshot().scenarios[0].years).toBe(12);
    vm.updateField('steady', 'years', 99);
    expect(vm.getSnapshot().errors.steady.years).toBeTruthy();
    expect(vm.getSnapshot().projections).toHaveLength(0);
  });

  it('handles persistence failure without losing the editing state', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository(null, true));
    await vm.init();
    await vm.save();
    expect(vm.getSnapshot().status).toBe('error');
    expect(vm.getSnapshot().scenarios).toHaveLength(3);
  });

  it('applies a batch update identical to editing each scenario manually', async () => {
    const batch = new MoneyScenarioViewModel(new MemoryRepository());
    await batch.init();
    batch.applyBatchUpdate('inflationRate', 3, ['steady', 'growth']);

    const manual = new MoneyScenarioViewModel(new MemoryRepository());
    await manual.init();
    manual.updateField('steady', 'inflationRate', 3);
    manual.updateField('growth', 'inflationRate', 3);

    expect(batch.getSnapshot().scenarios).toEqual(manual.getSnapshot().scenarios);
    expect(batch.getSnapshot().projections).toEqual(manual.getSnapshot().projections);
    expect(batch.getSnapshot().errors).toEqual(manual.getSnapshot().errors);
    expect(batch.getSnapshot().scenarios.find((scenario) => scenario.id === 'balanced')?.inflationRate).toBe(2);
  });

  it('refreshes validation and projections synchronously on batch update', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    vm.applyBatchUpdate('years', 30, ['steady', 'balanced', 'growth']);
    expect(vm.getSnapshot().projections.map((projection) => projection.points)).toSatisfy((points: unknown[][]) => points.every((point) => point.length === 31));

    vm.applyBatchUpdate('years', 99, ['steady']);
    expect(vm.getSnapshot().errors.steady.years).toBeTruthy();
    expect(vm.getSnapshot().projections.map((projection) => projection.scenarioId)).toEqual(['balanced', 'growth']);
  });

  it('leaves state untouched when a batch update has no valid targets', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    const before = vm.getSnapshot();
    vm.applyBatchUpdate('annualRate', 5, []);
    vm.applyBatchUpdate('annualRate', 5, ['missing-id']);
    expect(vm.getSnapshot().scenarios).toBe(before.scenarios);
    expect(vm.getSnapshot().projections).toBe(before.projections);
  });
});
