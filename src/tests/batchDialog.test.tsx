import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BatchEditDialog } from '../components/BatchEditDialog';
import { SAMPLE_SCENARIOS } from '../domain';

describe('BatchEditDialog', () => {
  it('lists every scenario with its current value and all parameter chips', () => {
    const html = renderToStaticMarkup(<BatchEditDialog scenarios={SAMPLE_SCENARIOS} onApply={() => undefined} onClose={() => undefined} />);
    SAMPLE_SCENARIOS.forEach((scenario) => {
      expect(html).toContain(scenario.name);
      expect(html).toContain(`当前 ${scenario.inflationRate} % / 年`);
    });
    expect(html).toContain('通胀率');
    expect(html).toContain('投资年限');
    expect(html).toContain(`应用到 ${SAMPLE_SCENARIOS.length} 个情景`);
  });

  it('marks scenarios that already hold the shared value', () => {
    // steady/balanced/growth all share inflationRate 2? steady=2, balanced=2, growth=2.5 → no prefill.
    const scenarios = SAMPLE_SCENARIOS.map((scenario) => ({ ...scenario, inflationRate: 2 }));
    const html = renderToStaticMarkup(<BatchEditDialog scenarios={scenarios} onApply={() => undefined} onClose={() => undefined} />);
    expect(html.match(/已是该值/g)).toHaveLength(3);
  });

  it('cancel path never touches the view model: no apply callback fires on close', () => {
    const onApply = vi.fn();
    renderToStaticMarkup(<BatchEditDialog scenarios={SAMPLE_SCENARIOS} onApply={onApply} onClose={() => undefined} />);
    expect(onApply).not.toHaveBeenCalled();
  });
});
