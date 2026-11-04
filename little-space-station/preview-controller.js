// Preview-only coordination. None of these overrides are saved as story history.
export const TEMPORARY_PREVIEWS = Object.freeze([
  "pipOverride", "restPreview", "dreamPreview", "incidentPreview",
  "phantomPreview", "remembrancePreview", "deckPreview",
  "thanksgivingPreview", "adventPreview",
]);

export function ClearTemporaryPreviews(runtime) {
  for (const key of TEMPORARY_PREVIEWS) runtime[key] = null;
  runtime.treeFullIllumination = false;
  runtime.seasonalPreview = "natural";
  runtime.dismissed = false;
  runtime.stepSeconds = 0;
}

export function CreatePreviewController(runtime, director) {
  let selected = null;
  return {
    get selected() { return selected; },
    adopt(adapter) { selected = adapter; },
    select(adapter) {
      ClearTemporaryPreviews(runtime);
      director.forceEvent("ambient");
      runtime.paused = false;
      selected = adapter;
      adapter.start();
    },
    restart() {
      if (selected) this.select(selected);
      else { runtime.dismissed = false; runtime.paused = false; director.restart(); }
    },
    stop() {
      ClearTemporaryPreviews(runtime);
      director.forceEvent("ambient");
      runtime.paused = false;
      selected = null;
    },
    pause() {
      runtime.paused = true;
      const active = selected && selected.playback && selected.playback();
      if (active) active.playing = false;
    },
    toggle() {
      const active = selected && selected.playback && selected.playback();
      const paused = runtime.paused || (active && !active.playing);
      runtime.dismissed = false;
      runtime.paused = !paused;
      if (active) active.playing = paused;
    },
    step() {
      runtime.paused = true;
      if (selected && selected.step) selected.step();
      else runtime.stepSeconds += 1;
    },
  };
}
