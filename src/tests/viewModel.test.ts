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

  it('batch update is equivalent to editing each scenario manually', async () => {
    const manual = new MoneyScenarioViewModel(new MemoryRepository());
    const batched = new MoneyScenarioViewModel(new MemoryRepository());
    await Promise.all([manual.init(), batched.init()]);

    manual.updateField('steady', 'inflationRate', 3);
    manual.updateField('balanced', 'inflationRate', 3);
    manual.updateField('growth', 'inflationRate', 3);
    const affected = batched.batchUpdateField('inflationRate', 3, ['steady', 'balanced', 'growth']);

    expect(affected).toBe(3);
    const manualState = manual.getSnapshot();
    const batchedState = batched.getSnapshot();
    expect(batchedState.scenarios).toEqual(manualState.scenarios);
    expect(batchedState.errors).toEqual(manualState.errors);
    expect(batchedState.projections).toEqual(manualState.projections);
    expect(batchedState.scenarios.every((scenario) => scenario.inflationRate === 3)).toBe(true);
  });

  it('batch update applies only to selected, currently-existing scenarios', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    vm.batchUpdateField('years', 30, ['steady', 'missing-scenario', 'steady']);
    const scenarios = vm.getSnapshot().scenarios;
    expect(scenarios.find((scenario) => scenario.id === 'steady')?.years).toBe(30);
    expect(scenarios.find((scenario) => scenario.id === 'balanced')?.years).toBe(20);
    expect(scenarios.find((scenario) => scenario.id === 'growth')?.years).toBe(20);
    // Projections refresh for the changed scenario and stay consistent with validation.
    const steady = vm.getSnapshot().projections.find((projection) => projection.scenarioId === 'steady');
    expect(steady?.points).toHaveLength(31);
  });

  it('batch update with no effective targets changes nothing and emits no change', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    const before = vm.getSnapshot();
    const affected = vm.batchUpdateField('years', 30, []);
    const after = vm.getSnapshot();
    expect(affected).toBe(0);
    expect(after.scenarios).toBe(before.scenarios);
    expect(after.projections).toBe(before.projections);
    expect(after.message).toBe(before.message);
  });

  it('batch update surfaces validation errors for every affected scenario', async () => {
    const vm = new MoneyScenarioViewModel(new MemoryRepository());
    await vm.init();
    vm.batchUpdateField('years', 99, ['steady', 'balanced']);
    const { errors, projections, status } = vm.getSnapshot();
    expect(errors.steady.years).toBeTruthy();
    expect(errors.balanced.years).toBeTruthy();
    expect(errors.growth).toBeUndefined();
    // Invalid scenarios contribute no projections; the untouched valid one still does.
    expect(projections.map((projection) => projection.scenarioId)).toEqual(['growth']);
    expect(status).toBe('editing');
  });
});
