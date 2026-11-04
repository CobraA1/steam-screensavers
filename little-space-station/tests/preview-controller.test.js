import test from 'node:test';
import assert from 'node:assert/strict';
import { CreatePreviewController, TEMPORARY_PREVIEWS } from '../preview-controller.js';

function fixture() {
  const runtime = { paused: false, dismissed: false, stepSeconds: 0, seasonalPreview: 'natural' };
  const calls = [];
  const director = { forceEvent: id => calls.push(id), restart: () => calls.push('restart') };
  return { runtime, calls, controller: CreatePreviewController(runtime, director) };
}

test('selecting and restarting a scene clear competing previews without writing history', () => {
  const { runtime, calls, controller } = fixture();
  for (const key of TEMPORARY_PREVIEWS) runtime[key] = { old: true };
  runtime.treeFullIllumination = true;
  runtime.seasonalPreview = 'halloween-full';
  let starts = 0;
  const scene = { start() { starts++; runtime.adventPreview = { playing: true }; }, playback: () => runtime.adventPreview };
  controller.select(scene);
  assert.equal(starts, 1);
  assert.equal(runtime.adventPreview.playing, true);
  for (const key of TEMPORARY_PREVIEWS.filter(key => key !== 'adventPreview')) assert.equal(runtime[key], null);
  assert.equal(runtime.seasonalPreview, 'natural');
  assert.equal(runtime.treeFullIllumination, false);
  runtime.phantomPreview = {};
  controller.restart();
  assert.equal(starts, 2);
  assert.equal(runtime.phantomPreview, null);
  assert.deepEqual(calls, ['ambient', 'ambient']);
});

test('pause, resume, stepping and stop target the active scene', () => {
  const { runtime, calls, controller } = fixture();
  let steps = 0;
  const scene = { start() { runtime.dreamPreview = { playing: true }; }, playback: () => runtime.dreamPreview, step: () => steps++ };
  controller.select(scene);
  controller.pause();
  assert.equal(runtime.paused, true);
  assert.equal(runtime.dreamPreview.playing, false);
  controller.toggle();
  assert.equal(runtime.paused, false);
  assert.equal(runtime.dreamPreview.playing, true);
  controller.step();
  assert.equal(runtime.paused, true);
  assert.equal(steps, 1);
  controller.stop();
  assert.equal(runtime.dreamPreview, null);
  assert.equal(runtime.paused, false);
  assert.equal(controller.selected, null);
  assert.deepEqual(calls, ['ambient', 'ambient']);
});
