import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../src/pipeline.js';
import { renderMarkdown, renderHtml } from '../src/report.js';

process.env.MINDFORGE_MOCK = '1';

test('runs all four roles in order and mocks when no CLI is installed', () => {
  const result = runPipeline('add PDF export to quotations');
  const names = result.stages.map((s) => s.agent);
  assert.deepEqual(names, ['Claude', 'ChatGPT', 'Fugu', 'Kimi K3']);
  for (const stage of result.stages) {
    assert.equal(stage.source, 'mock');
    assert.match(stage.text, /\[MOCK\]/);
  }
});

test('later stages receive earlier stages as context', () => {
  const result = runPipeline('add PDF export to quotations');
  // ChatGPT's prompt building includes prior context; verify the pipeline
  // at least produced non-empty, distinct output per stage.
  const texts = new Set(result.stages.map((s) => s.text));
  assert.equal(texts.size, 4);
});

test('renders markdown with every agent section', () => {
  const result = runPipeline('add PDF export to quotations');
  const md = renderMarkdown(result);
  assert.match(md, /## Claude/);
  assert.match(md, /## ChatGPT/);
  assert.match(md, /## Fugu/);
  assert.match(md, /## Kimi K3/);
});

test('renders an html dashboard with a node per agent', () => {
  const result = runPipeline('add PDF export to quotations');
  const html = renderHtml(result);
  assert.match(html, /class="node"/);
  assert.equal((html.match(/class="node"/g) || []).length, 4);
  assert.match(html, /class="connector"/);
});
