import { EVENT_CATALOG, PHASE_NAMES } from "./simulation-world.js";
import { ILLUMINATION_OVERRIDES, SEASON_OVERRIDES } from "./environment.js";
import { PIP_PREVIEW_TASKS, PIP_TASK_STAGES } from "./pip-behavior.js";
import { CreateStoryDream, ResolveDreamTimeline } from "./pip-rhythm.js";
import { CAMERA_FRAMING_PRESETS, CAMERA_VIEW_MODES } from "./camera-framing.js";
import { CreateExpansionPreview, EXPANSION_LAYOUTS } from "./expansion-preview.js";
import { AdvanceStubbornAntennaIncident, CreateStubbornAntennaIncident, CreateStubbornAntennaPreview, CreateStubbornAntennaResume, STUBBORN_ANTENNA_BEATS, STUBBORN_ANTENNA_VARIANTS } from "./stubborn-antenna.js";
import { AUTUMN_PREVIEW_MODES, GetUpcomingSeasonalShipments } from "./autumn-2026.js";
import CONFIG from "./config.js";
import { DeckDurationMs } from "./service-deck-lifecycle.js";
import { AdvancePhantomVisitorIncident, CreatePhantomVisitorIncident, CreatePhantomVisitorPreview, CreatePhantomVisitorResume, PHANTOM_VISITOR_BEATS, PHANTOM_VISITOR_TYPE, PHANTOM_VISITOR_VARIANTS } from "./phantom-visitor.js";
import { AdvanceRemembranceIncident, CreateRemembranceIncident, CreateRemembrancePreview, CreateRemembranceResume, REMEMBRANCE_BEATS, REMEMBRANCE_TYPE, REMEMBRANCE_VARIANTS } from "./lights-of-remembrance.js";

function MakeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function AddOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function AddField(panel, labelText, control) {
  const field = MakeElement("label", "preview-tools__field");
  field.append(MakeElement("span", "preview-tools__label", labelText), control);
  panel.append(field);
}

export function CreatePreviewTools({ director, runtime, scene }) {
  let shipmentScheduleCache = { minute: null, value: [] };
  const expansionPreview = CreateExpansionPreview(scene.station);
  const panel = MakeElement("aside", "preview-tools");
  panel.setAttribute("aria-label", "Screensaver preview tools");

  const heading = MakeElement("div", "preview-tools__heading");
  const titleWrap = MakeElement("div");
  titleWrap.append(
    MakeElement("span", "preview-tools__eyebrow", "PREVIEW MODE"),
    MakeElement("strong", "", "Event console"),
  );
  const fullscreenButton = MakeElement("button", "preview-tools__pause", "Full screen");
  fullscreenButton.type = "button";
  const pauseButton = MakeElement("button", "preview-tools__pause", "Pause");
  pauseButton.type = "button";
  const collapseButton = MakeElement("button", "preview-tools__pause", "Hide");
  collapseButton.type = "button";
  const headingActions = MakeElement("div", "preview-tools__heading-actions");
  headingActions.append(fullscreenButton, pauseButton, collapseButton);
  heading.append(titleWrap, headingActions);
  panel.append(heading);

  const eventSelect = MakeElement("select", "preview-tools__select");
  AddOption(eventSelect, "auto", "Natural schedule");
  for (const event of EVENT_CATALOG) AddOption(eventSelect, event.id, event.label);
  AddOption(eventSelect, "ambient", "Ambient jobs only");
  AddField(panel, "Event", eventSelect);

  const phaseRow = MakeElement("div", "preview-tools__row");
  const phaseSelect = MakeElement("select", "preview-tools__select");
  for (const phase of PHASE_NAMES) AddOption(phaseSelect, phase, phase);
  const jumpButton = MakeElement("button", "preview-tools__button", "Jump");
  jumpButton.type = "button";
  phaseRow.append(phaseSelect, jumpButton);
  AddField(panel, "Phase", phaseRow);

  const speedSelect = MakeElement("select", "preview-tools__select");
  for (const speed of [1, 5, 20, 100]) AddOption(speedSelect, String(speed), speed + "×");
  speedSelect.value = String(runtime.speed);
  AddField(panel, "Speed", speedSelect);

  const seedInput = MakeElement("input", "preview-tools__select");
  seedInput.value = runtime.seed || "";
  AddField(panel, "Seed", seedInput);
  const worldTimeSelect = MakeElement("select", "preview-tools__select");
  for (const [value, label] of [["actual", "Use actual time"], ["hour", "Jump +1 hour"], ["day", "Jump +1 day"], ["week", "Jump +1 week"]]) AddOption(worldTimeSelect, value, label);
  AddField(panel, "World time", worldTimeSelect);

  const dateInput = MakeElement("input", "preview-tools__select");
  dateInput.type = "datetime-local";
  AddField(panel, "Set date/time", dateInput);

  const cameraSection = MakeElement("details", "preview-tools__environment");
  cameraSection.append(MakeElement("summary", "preview-tools__environment-summary", "Camera experiment"));
  const framingSelect = MakeElement("select", "preview-tools__select");
  for (const preset of CAMERA_FRAMING_PRESETS) AddOption(framingSelect, preset.id, preset.label + " · " + Math.round(preset.apparentScale * 100) + "%");
  framingSelect.value = scene.getCameraDiagnostics().preset;
  AddField(cameraSection, "Framing", framingSelect);
  const cameraModeSelect = MakeElement("select", "preview-tools__select");
  for (const mode of CAMERA_VIEW_MODES) AddOption(cameraModeSelect, mode.id, mode.label);
  AddField(cameraSection, "View", cameraModeSelect);
  const resetCameraButton = MakeElement("button", "preview-tools__button", "Reset original overview");
  resetCameraButton.type = "button";
  cameraSection.append(resetCameraButton);
  const cameraReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const cameraValue = MakeElement("dd", "", "original · overview");
  cameraReadout.append(MakeElement("dt", "", "CAMERA"), cameraValue);
  cameraSection.append(cameraReadout);
  panel.append(cameraSection);

  const expansionSection = MakeElement("details", "preview-tools__environment");
  expansionSection.append(MakeElement("summary", "preview-tools__environment-summary", "Station expansion"));
  const expansionSelect = MakeElement("select", "preview-tools__select");
  for (const layout of EXPANSION_LAYOUTS) AddOption(expansionSelect, layout.id, layout.label);
  AddField(expansionSection, "Layout", expansionSelect);
  const expansionVisibility = MakeElement("select", "preview-tools__select");
  AddOption(expansionVisibility, "show", "Show mockups");
  AddOption(expansionVisibility, "hide", "Hide mockups");
  AddField(expansionSection, "Mockups", expansionVisibility);
  const expansionReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const expansionValue = MakeElement("dd", "", "current · 0 additions");
  expansionReadout.append(MakeElement("dt", "", "LAYOUT"), expansionValue);
  expansionSection.append(expansionReadout);
  panel.append(expansionSection);

  const environmentSection = MakeElement("details", "preview-tools__environment");
  environmentSection.append(MakeElement("summary", "preview-tools__environment-summary", "Environment"));
  const illuminationSelect = MakeElement("select", "preview-tools__select");
  for (const option of ILLUMINATION_OVERRIDES) AddOption(illuminationSelect, option.id, option.label);
  AddField(environmentSection, "Illumination", illuminationSelect);
  const seasonSelect = MakeElement("select", "preview-tools__select");
  for (const option of SEASON_OVERRIDES) AddOption(seasonSelect, option.id, option.label);
  AddField(environmentSection, "Season", seasonSelect);
  const resetEnvironmentButton = MakeElement("button", "preview-tools__button", "Use world time");
  resetEnvironmentButton.type = "button";
  environmentSection.append(resetEnvironmentButton);
  const environmentReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const environmentValues = {};
  for (const [key, label] of [["phase", "LIGHT PHASE"], ["light", "LIGHT STATE"], ["rotation", "ROTATION"], ["season", "SEASON"]]) {
    environmentReadout.append(MakeElement("dt", "", label));
    environmentValues[key] = MakeElement("dd", "", "—");
    environmentReadout.append(environmentValues[key]);
  }
  environmentSection.append(environmentReadout);
  panel.append(environmentSection);

  const seasonalSection = MakeElement("details", "preview-tools__environment");
  seasonalSection.append(MakeElement("summary", "preview-tools__environment-summary", "Seasonal Events · 2026 Story Year"));
  const seasonalMode = MakeElement("select", "preview-tools__select");
  for (const option of AUTUMN_PREVIEW_MODES) AddOption(seasonalMode, option.id, option.label);
  AddField(seasonalSection, "Scene", seasonalMode);
  const seasonalDates = MakeElement("div", "preview-tools__actions");
  const dateShortcuts = [
    ["2026-09-21T18:00:00Z", "Before"],
    ["2026-09-22T18:00:00Z", "Sep 22"],
    ["2026-10-24T18:00:00Z", "Oct 24"],
    ["2026-10-31T18:00:00Z", "Oct 31"],
    ["2026-11-01T18:00:00Z", "Nov 1"],
    ["2026-11-04T18:00:00Z", "Nov 4"],
    ["2027-01-06T18:00:00Z", "Jan 6"],
    ["2027-01-07T18:00:00Z", "Reset"],
  ];
  const seasonalDateButtons = dateShortcuts.map(([date, label]) => {
    const button = MakeElement("button", "preview-tools__button", label);
    button.type = "button";
    button.dataset.date = date;
    seasonalDates.append(button);
    return button;
  });
  seasonalSection.append(seasonalDates);
  const deckActions = MakeElement("div", "preview-tools__actions");
  const installDeck = MakeElement("button", "preview-tools__button", "Install module");
  const removeDeck = MakeElement("button", "preview-tools__button", "Remove module");
  const stopDeck = MakeElement("button", "preview-tools__button", "Follow deck calendar");
  for (const button of [installDeck, removeDeck, stopDeck]) button.type = "button";
  deckActions.append(installDeck, removeDeck, stopDeck);
  seasonalSection.append(deckActions);
  const deckRate = MakeElement("select", "preview-tools__select");
  AddOption(deckRate, "1", "Real pace · configured hours");
  AddOption(deckRate, "60", "60× · six minutes at defaults");
  AddOption(deckRate, "360", "360× · one minute at defaults");
  deckRate.value = "60";
  AddField(seasonalSection, "Assembly preview speed", deckRate);
  const deckProgress = MakeElement("input", "preview-tools__select");
  deckProgress.type = "range";
  deckProgress.min = "0";
  deckProgress.max = "1";
  deckProgress.step = "0.001";
  deckProgress.value = "0";
  deckProgress.disabled = true;
  AddField(seasonalSection, "Module sequence point", deckProgress);
  const deckPlay = MakeElement("button", "preview-tools__button", "Play / pause module");
  deckPlay.type = "button";
  deckPlay.disabled = true;
  seasonalSection.append(deckPlay);
  const seasonalReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const seasonalValues = {};
  for (const [key, label] of [["phase", "PHASE"], ["holiday", "HOLIDAY"], ["deck", "SERVICE DECK"], ["shipment", "SHIPMENT"], ["packages", "PACKAGES"], ["decor", "INSTALLED"], ["halloween", "HALLOWEEN"], ["oddity", "ODDITY"], ["cleanup", "CLEANUP"], ["activity", "SEASONAL TASK"], ["pending", "PENDING STORY"], ["completed", "COMPLETED"], ["dream", "DREAM ELIGIBLE"]]) {
    seasonalReadout.append(MakeElement("dt", "", label));
    seasonalValues[key] = MakeElement("dd", "", "—");
    seasonalReadout.append(seasonalValues[key]);
  }
  seasonalSection.append(seasonalReadout);
  panel.append(seasonalSection);

  const pipSection = MakeElement("details", "preview-tools__environment");
  pipSection.append(MakeElement("summary", "preview-tools__environment-summary", "Pip animation"));
  const pipTaskSelect = MakeElement("select", "preview-tools__select");
  AddOption(pipTaskSelect, "auto", "Follow simulation");
  for (const task of PIP_PREVIEW_TASKS) AddOption(pipTaskSelect, task.id, task.label);
  AddField(pipSection, "Task", pipTaskSelect);
  const pipStageSelect = MakeElement("select", "preview-tools__select");
  pipStageSelect.disabled = true;
  AddOption(pipStageSelect, "auto", "Simulation stage");
  AddField(pipSection, "Stage", pipStageSelect);
  const pipProgressInput = MakeElement("input", "preview-tools__select");
  pipProgressInput.type = "range";
  pipProgressInput.min = "0";
  pipProgressInput.max = "1";
  pipProgressInput.step = "0.01";
  pipProgressInput.value = "0.5";
  pipProgressInput.disabled = true;
  AddField(pipSection, "Stage point", pipProgressInput);
  const pipVariantSelect = MakeElement("select", "preview-tools__select");
  AddOption(pipVariantSelect, "0", "Measured");
  AddOption(pipVariantSelect, "1", "Eager");
  AddOption(pipVariantSelect, "2", "Clumsy / startled");
  pipVariantSelect.value = "1";
  pipVariantSelect.disabled = true;
  AddField(pipSection, "Gesture", pipVariantSelect);
  const resetPipButton = MakeElement("button", "preview-tools__button", "Follow simulation");
  resetPipButton.type = "button";
  pipSection.append(resetPipButton);
  const pipReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const pipValues = {};
  for (const [key, label] of [["pose", "POSE"], ["reaction", "REACTION"]]) {
    pipReadout.append(MakeElement("dt", "", label));
    pipValues[key] = MakeElement("dd", "", "—");
    pipReadout.append(pipValues[key]);
  }
  pipSection.append(pipReadout);
  panel.append(pipSection);

  const incidentSection = MakeElement("details", "preview-tools__environment");
  incidentSection.append(MakeElement("summary", "preview-tools__environment-summary", "Incident · Stubborn Antenna"));
  const incidentVariant = MakeElement("select", "preview-tools__select");
  for (let index = 0; index < STUBBORN_ANTENNA_VARIANTS.length; index += 1) AddOption(incidentVariant, String(index), STUBBORN_ANTENNA_VARIANTS[index].label);
  AddField(incidentSection, "Variant", incidentVariant);
  const incidentBeat = MakeElement("select", "preview-tools__select");
  for (const beat of STUBBORN_ANTENNA_BEATS) AddOption(incidentBeat, beat.id, beat.label);
  AddField(incidentSection, "Beat", incidentBeat);
  const incidentProgress = MakeElement("input", "preview-tools__select");
  incidentProgress.type = "range";
  incidentProgress.min = "0";
  incidentProgress.max = "1";
  incidentProgress.step = "0.01";
  incidentProgress.value = "0";
  AddField(incidentSection, "Beat point", incidentProgress);
  const incidentActions = MakeElement("div", "preview-tools__actions");
  const forceIncident = MakeElement("button", "preview-tools__button", "Force / play");
  const stopIncident = MakeElement("button", "preview-tools__button", "Stop preview");
  forceIncident.type = "button";
  stopIncident.type = "button";
  incidentActions.append(forceIncident, stopIncident);
  incidentSection.append(incidentActions);
  const incidentStorageActions = MakeElement("div", "preview-tools__actions");
  const commitIncident = MakeElement("button", "preview-tools__button", "Commit checkpoint");
  const resumeIncident = MakeElement("button", "preview-tools__button", "Resume saved");
  const clearIncident = MakeElement("button", "preview-tools__button", "Clear saved incident");
  commitIncident.type = "button";
  resumeIncident.type = "button";
  clearIncident.type = "button";
  incidentStorageActions.append(commitIncident, resumeIncident, clearIncident);
  incidentSection.append(incidentStorageActions);
  const incidentReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const incidentValue = MakeElement("dd", "", "inactive · temporary");
  incidentReadout.append(MakeElement("dt", "", "STATE"), incidentValue);
  incidentSection.append(incidentReadout);
  panel.append(incidentSection);

  const phantomSection = MakeElement("details", "preview-tools__environment");
  phantomSection.append(MakeElement("summary", "preview-tools__environment-summary", "Story · Phantom Visitor"));
  const phantomVariant = MakeElement("select", "preview-tools__select");
  for (let index = 0; index < PHANTOM_VISITOR_VARIANTS.length; index += 1) AddOption(phantomVariant, String(index), PHANTOM_VISITOR_VARIANTS[index].label);
  AddField(phantomSection, "Variant", phantomVariant);
  const phantomBeat = MakeElement("select", "preview-tools__select");
  for (const beat of PHANTOM_VISITOR_BEATS) AddOption(phantomBeat, beat.id, beat.label);
  AddField(phantomSection, "Beat", phantomBeat);
  const phantomProgress = MakeElement("input", "preview-tools__select");
  phantomProgress.type = "range";
  phantomProgress.min = "0";
  phantomProgress.max = "1";
  phantomProgress.step = "0.01";
  phantomProgress.value = "0";
  AddField(phantomSection, "Beat point", phantomProgress);
  const phantomActions = MakeElement("div", "preview-tools__actions");
  const forcePhantom = MakeElement("button", "preview-tools__button", "Force / play");
  const stopPhantom = MakeElement("button", "preview-tools__button", "Stop preview");
  forcePhantom.type = "button";
  stopPhantom.type = "button";
  phantomActions.append(forcePhantom, stopPhantom);
  phantomSection.append(phantomActions);
  const phantomStorageActions = MakeElement("div", "preview-tools__actions");
  const commitPhantom = MakeElement("button", "preview-tools__button", "Commit checkpoint");
  const resumePhantom = MakeElement("button", "preview-tools__button", "Resume saved");
  const clearPhantom = MakeElement("button", "preview-tools__button", "Clear saved story");
  commitPhantom.type = "button";
  resumePhantom.type = "button";
  clearPhantom.type = "button";
  phantomStorageActions.append(commitPhantom, resumePhantom, clearPhantom);
  phantomSection.append(phantomStorageActions);
  const phantomReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const phantomValue = MakeElement("dd", "", "inactive · temporary");
  phantomReadout.append(MakeElement("dt", "", "STATE"), phantomValue);
  phantomSection.append(phantomReadout);
  panel.append(phantomSection);

  const remembranceSection = MakeElement("details", "preview-tools__environment");
  remembranceSection.append(MakeElement("summary", "preview-tools__environment-summary", "Story · Lights of Remembrance"));
  const remembranceVariant = MakeElement("select", "preview-tools__select");
  for (let index = 0; index < REMEMBRANCE_VARIANTS.length; index += 1) AddOption(remembranceVariant, String(index), REMEMBRANCE_VARIANTS[index].label);
  AddField(remembranceSection, "Variant", remembranceVariant);
  const remembranceBeat = MakeElement("select", "preview-tools__select");
  for (const beat of REMEMBRANCE_BEATS) AddOption(remembranceBeat, beat.id, beat.label);
  AddField(remembranceSection, "Beat", remembranceBeat);
  const remembranceProgress = MakeElement("input", "preview-tools__select");
  remembranceProgress.type = "range";
  remembranceProgress.min = "0";
  remembranceProgress.max = "1";
  remembranceProgress.step = "0.01";
  remembranceProgress.value = "0";
  AddField(remembranceSection, "Beat point", remembranceProgress);
  const remembranceActions = MakeElement("div", "preview-tools__actions");
  const forceRemembrance = MakeElement("button", "preview-tools__button", "Force / play");
  const stopRemembrance = MakeElement("button", "preview-tools__button", "Stop preview");
  forceRemembrance.type = "button";
  stopRemembrance.type = "button";
  remembranceActions.append(forceRemembrance, stopRemembrance);
  remembranceSection.append(remembranceActions);
  const remembranceStorageActions = MakeElement("div", "preview-tools__actions");
  const commitRemembrance = MakeElement("button", "preview-tools__button", "Commit checkpoint");
  const resumeRemembrance = MakeElement("button", "preview-tools__button", "Resume saved");
  const clearRemembrance = MakeElement("button", "preview-tools__button", "Clear saved observance");
  commitRemembrance.type = "button";
  resumeRemembrance.type = "button";
  clearRemembrance.type = "button";
  remembranceStorageActions.append(commitRemembrance, resumeRemembrance, clearRemembrance);
  remembranceSection.append(remembranceStorageActions);
  const remembranceReadout = MakeElement("dl", "preview-tools__readout preview-tools__environment-readout");
  const remembranceValue = MakeElement("dd", "", "inactive · temporary");
  remembranceReadout.append(MakeElement("dt", "", "STATE"), remembranceValue);
  remembranceSection.append(remembranceReadout);
  panel.append(remembranceSection);

  const restSection = MakeElement("details", "preview-tools__environment");
  restSection.append(MakeElement("summary", "preview-tools__environment-summary", "Pip recharge & memory"));
  const restActions = MakeElement("div", "preview-tools__actions");
  const forceCharge = MakeElement("button", "preview-tools__button", "Show recharge");
  const forceDream = MakeElement("button", "preview-tools__button", "Show antenna dream");
  const forcePhantomDream = MakeElement("button", "preview-tools__button", "Show Phantom dream");
  const followRest = MakeElement("button", "preview-tools__button", "Follow rhythm");
  forceCharge.type = "button";
  forceDream.type = "button";
  forcePhantomDream.type = "button";
  followRest.type = "button";
  restActions.append(forceCharge, forceDream, forcePhantomDream, followRest);
  restSection.append(restActions);
  const dreamPoint = MakeElement("input", "preview-tools__select");
  dreamPoint.type = "range";
  dreamPoint.min = "0";
  dreamPoint.max = "1";
  dreamPoint.step = "0.001";
  dreamPoint.value = "0";
  AddField(restSection, "Dream point", dreamPoint);
  const restReadout = MakeElement("p", "preview-tools__hint", "Play or scrub a saved memory, or a temporary example if none exists. No history is written.");
  restSection.append(restReadout);
  panel.append(restSection);

  function SetPipStages(taskId) {
    pipStageSelect.replaceChildren();
    const stages = PIP_TASK_STAGES[taskId] || [];
    for (const stage of stages) AddOption(pipStageSelect, stage, stage.replaceAll("-", " "));
    pipStageSelect.disabled = stages.length === 0;
    pipProgressInput.disabled = stages.length === 0;
    pipVariantSelect.disabled = stages.length === 0;
    return stages;
  }

  function UpdatePipOverride() {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    if (pipTaskSelect.value === "auto") {
      runtime.pipOverride = null;
      return;
    }
    runtime.pipOverride = {
      taskId: pipTaskSelect.value,
      stage: pipStageSelect.value,
      progress: Number(pipProgressInput.value),
      variant: Number(pipVariantSelect.value),
    };
  }

  const actions = MakeElement("div", "preview-tools__actions");
  const restartButton = MakeElement("button", "preview-tools__button", "Restart event");
  const stepButton = MakeElement("button", "preview-tools__button", "Step +1s");
  restartButton.type = "button";
  stepButton.type = "button";
  const commitButton = MakeElement("button", "preview-tools__button", "Commit");
  const dismissButton = MakeElement("button", "preview-tools__button", "Interrupt");
  commitButton.type = "button";
  dismissButton.type = "button";
  actions.append(restartButton, stepButton, commitButton, dismissButton);
  panel.append(actions);

  const storageActions = MakeElement("div", "preview-tools__actions");
  const clearButton = MakeElement("button", "preview-tools__button", "Clear record");
  const offlineButton = MakeElement("button", "preview-tools__button", "Storage off");
  clearButton.type = "button";
  offlineButton.type = "button";
  storageActions.append(clearButton, offlineButton);
  panel.append(storageActions);

  const progressTrack = MakeElement("div", "preview-tools__track");
  const progressBar = MakeElement("div", "preview-tools__progress");
  progressTrack.append(progressBar);
  panel.append(progressTrack);

  const readout = MakeElement("dl", "preview-tools__readout");
  const values = {};
  for (const [key, label] of [
    ["event", "EVENT"],
    ["visit", "VISIT ID"],
    ["purpose", "PURPOSE"],
    ["phase", "PHASE"],
    ["next", "NEXT ARRIVAL"],
    ["departure", "DEPARTURE"],
    ["checkpoint", "CHECKPOINT"],
    ["lifecycle", "LIFECYCLE"],
    ["job", "PIP TASK"],
    ["stage", "TASK STAGE"],
    ["equipment", "EQUIPMENT"],
    ["activity", "LAST ACTIVITY"],
    ["clock", "WORLD CLOCK"],
    ["storage", "STORAGE"],
    ["log", "LATEST LOG"],
    ["perf", "FRAME RATE"],
  ]) {
    readout.append(MakeElement("dt", "", label));
    values[key] = MakeElement("dd", "", "—");
    readout.append(values[key]);
  }
  panel.append(readout);
  document.body.append(panel);

  eventSelect.addEventListener("change", () => {
    director.forceEvent(eventSelect.value);
  });
  jumpButton.addEventListener("click", () => {
    director.jumpToPhase(phaseSelect.value);
  });
  speedSelect.addEventListener("change", () => {
    runtime.speed = Number(speedSelect.value);
  });
  seedInput.addEventListener("change", () => { const url = new URL(window.location.href); url.searchParams.set("preview", "1"); url.searchParams.set("seed", seedInput.value.trim() || runtime.seed); window.location.assign(url); });
  worldTimeSelect.addEventListener("change", () => { if (worldTimeSelect.value === "actual") runtime.clock.useActualTime(); else runtime.clock.jumpWorld(worldTimeSelect.value); worldTimeSelect.value = "actual"; });
  dateInput.addEventListener("change", () => { const time = new Date(dateInput.value).getTime(); if (Number.isFinite(time)) runtime.clock.setWorldTime(time); });
  framingSelect.addEventListener("change", () => scene.cameraFraming.setPreset(framingSelect.value));
  cameraModeSelect.addEventListener("change", () => scene.cameraFraming.setMode(cameraModeSelect.value));
  resetCameraButton.addEventListener("click", () => {
    scene.cameraFraming.reset();
    framingSelect.value = "original";
    cameraModeSelect.value = "overview";
  });
  expansionSelect.addEventListener("change", () => expansionPreview.setLayout(expansionSelect.value));
  expansionVisibility.addEventListener("change", () => expansionPreview.setVisible(expansionVisibility.value === "show"));
  illuminationSelect.addEventListener("change", () => runtime.environment.setIlluminationOverride(illuminationSelect.value));
  seasonSelect.addEventListener("change", () => runtime.environment.setSeasonOverride(seasonSelect.value));
  resetEnvironmentButton.addEventListener("click", () => { runtime.environment.clearOverrides(); illuminationSelect.value = "auto"; seasonSelect.value = "auto"; });
  seasonalMode.addEventListener("change", () => {
    runtime.deckPreview = null;
    runtime.seasonalPreview = seasonalMode.value;
    if (seasonalMode.value === "fall-cargo" || seasonalMode.value === "halloween-cargo" || seasonalMode.value === "remembrance-cargo") {
      director.forceEvent("cargo-run");
      director.jumpToPhase("service");
      eventSelect.value = "cargo-run";
      phaseSelect.value = "service";
    } else if (seasonalMode.value === "fall-install" || seasonalMode.value === "halloween-install" || seasonalMode.value === "halloween-cleanup" || seasonalMode.value === "halloween-oddity-flicker") {
      director.forceEvent("ambient");
      eventSelect.value = "ambient";
    }
    runtime.logs.unshift({ at: new Date().toISOString(), message: "seasonal preview: " + seasonalMode.value + " (temporary)" });
  });
  for (const button of seasonalDateButtons) button.addEventListener("click", () => {
    runtime.deckPreview = null;
    runtime.seasonalPreview = "natural";
    seasonalMode.value = "natural";
    runtime.clock.setWorldTime(new Date(button.dataset.date).getTime());
    runtime.logs.unshift({ at: new Date().toISOString(), message: "jumped to seasonal date " + button.textContent + " (no writes)" });
  });
  const deckDuration = () => DeckDurationMs(CONFIG.serviceDeck) / 1000 / Number(deckRate.value);
  const startDeck = (action) => {
    runtime.seasonalPreview = "natural";
    seasonalMode.value = "natural";
    runtime.deckPreview = { action, progress: 0, playing: true, durationSeconds: deckDuration() };
    deckProgress.disabled = false;
    deckPlay.disabled = false;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "module " + action + " preview (temporary, no writes)" });
  };
  installDeck.addEventListener("click", () => startDeck("install"));
  removeDeck.addEventListener("click", () => startDeck("remove"));
  stopDeck.addEventListener("click", () => { runtime.deckPreview = null; });
  deckRate.addEventListener("change", () => {
    if (runtime.deckPreview) runtime.deckPreview.durationSeconds = deckDuration();
  });
  deckPlay.addEventListener("click", () => {
    if (runtime.deckPreview) {
      if (runtime.deckPreview.progress >= 1) runtime.deckPreview.progress = 0;
      runtime.deckPreview.playing = !runtime.deckPreview.playing;
    }
  });
  deckProgress.addEventListener("input", () => {
    if (runtime.deckPreview) {
      runtime.deckPreview.progress = Number(deckProgress.value);
      runtime.deckPreview.playing = false;
    }
  });
  pipTaskSelect.addEventListener("change", () => {
    const stages = SetPipStages(pipTaskSelect.value);
    if (stages.length > 0) pipStageSelect.value = stages[0];
    UpdatePipOverride();
  });
  pipStageSelect.addEventListener("change", UpdatePipOverride);
  pipProgressInput.addEventListener("input", UpdatePipOverride);
  pipVariantSelect.addEventListener("change", UpdatePipOverride);
  resetPipButton.addEventListener("click", () => {
    runtime.pipOverride = null;
    pipTaskSelect.value = "auto";
    SetPipStages("auto");
  });
  function ScrubIncident() {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = CreateStubbornAntennaPreview({
      variant: Number(incidentVariant.value), beatId: incidentBeat.value,
      progress: Number(incidentProgress.value), playing: false,
    });
  }
  incidentVariant.addEventListener("change", ScrubIncident);
  incidentBeat.addEventListener("change", ScrubIncident);
  incidentProgress.addEventListener("input", ScrubIncident);
  forceIncident.addEventListener("click", () => {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = CreateStubbornAntennaPreview({ variant: Number(incidentVariant.value), playing: true, elapsed: 0 });
    runtime.logs.unshift({ at: new Date().toISOString(), message: "forced stubborn antenna preview (temporary)" });
  });
  stopIncident.addEventListener("click", () => {
    runtime.incidentPreview = null;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "stopped temporary stubborn antenna preview" });
  });
  function ScrubPhantom() {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = null;
    runtime.remembrancePreview = null;
    runtime.phantomPreview = CreatePhantomVisitorPreview({
      variant: Number(phantomVariant.value),
      beatId: phantomBeat.value,
      progress: Number(phantomProgress.value),
      playing: false,
    });
    runtime.phantomPreview.preview = true;
    runtime.seasonalPreview = "halloween-full";
    seasonalMode.value = "halloween-full";
  }
  phantomVariant.addEventListener("change", ScrubPhantom);
  phantomBeat.addEventListener("change", ScrubPhantom);
  phantomProgress.addEventListener("input", ScrubPhantom);
  forcePhantom.addEventListener("click", () => {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = null;
    runtime.remembrancePreview = null;
    runtime.phantomPreview = CreatePhantomVisitorPreview({ variant: Number(phantomVariant.value), playing: true, elapsed: 0 });
    runtime.phantomPreview.preview = true;
    runtime.seasonalPreview = "halloween-full";
    seasonalMode.value = "halloween-full";
    director.forceEvent("ambient");
    eventSelect.value = "ambient";
    runtime.logs.unshift({ at: new Date().toISOString(), message: "forced Phantom Visitor preview (temporary)" });
  });
  stopPhantom.addEventListener("click", () => {
    runtime.phantomPreview = null;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "stopped temporary Phantom Visitor preview" });
  });
  commitPhantom.addEventListener("click", () => {
    const preview = runtime.phantomPreview || CreatePhantomVisitorPreview({ variant: Number(phantomVariant.value), beatId: phantomBeat.value, progress: Number(phantomProgress.value) });
    const base = runtime.phantomRecord || CreatePhantomVisitorIncident({ variant: preview.variant, instanceId: "2026:phantom-visitor:" + runtime.seed });
    const incident = AdvancePhantomVisitorIncident(base, preview.beatId, preview.progress);
    const result = runtime.store.commitSeasonalIncident(runtime.seed, incident);
    if (result.ok) {
      runtime.phantomRecord = result.record.seasonalIncident;
      runtime.persistedNarrative = { record: result.record, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "committed Phantom Visitor " + incident.checkpoint });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "Phantom Visitor commit failed: " + result.status });
  });
  resumePhantom.addEventListener("click", () => {
    const loaded = runtime.store.load(runtime.seed);
    runtime.persistedNarrative = loaded;
    runtime.phantomRecord = loaded.record && loaded.record.seasonalIncident && loaded.record.seasonalIncident.type === PHANTOM_VISITOR_TYPE ? loaded.record.seasonalIncident : null;
    runtime.phantomPreview = CreatePhantomVisitorResume(runtime.phantomRecord);
    if (runtime.phantomPreview) runtime.phantomPreview.preview = true;
    runtime.logs.unshift({ at: new Date().toISOString(), message: runtime.phantomPreview ? "resumed saved Phantom Visitor chapter" : "no saved Phantom Visitor chapter" });
  });
  clearPhantom.addEventListener("click", () => {
    const result = runtime.store.clearSeasonalIncident(runtime.seed, PHANTOM_VISITOR_TYPE);
    if (result.ok) {
      runtime.phantomRecord = null;
      runtime.phantomPreview = null;
      runtime.persistedNarrative = result.record ? { record: result.record, status: result.status } : { record: null, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "cleared saved Phantom Visitor story" });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "clear Phantom Visitor failed: " + result.status });
  });
  function ScrubRemembrance() {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = null;
    runtime.phantomPreview = null;
    runtime.clock.setWorldTime(Date.UTC(2026, 10, 1, 18));
    runtime.remembrancePreview = CreateRemembrancePreview({
      variant: Number(remembranceVariant.value),
      beatId: remembranceBeat.value,
      progress: Number(remembranceProgress.value),
      playing: false,
    });
    runtime.remembrancePreview.preview = true;
  }
  remembranceVariant.addEventListener("change", ScrubRemembrance);
  remembranceBeat.addEventListener("change", ScrubRemembrance);
  remembranceProgress.addEventListener("input", ScrubRemembrance);
  forceRemembrance.addEventListener("click", () => {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.incidentPreview = null;
    runtime.phantomPreview = null;
    runtime.remembrancePreview = CreateRemembrancePreview({ variant: Number(remembranceVariant.value), playing: true, elapsed: 0 });
    runtime.remembrancePreview.preview = true;
    runtime.clock.setWorldTime(Date.UTC(2026, 10, 1, 18));
    director.forceEvent("ambient");
    eventSelect.value = "ambient";
    runtime.logs.unshift({ at: new Date().toISOString(), message: "forced Lights of Remembrance preview (temporary)" });
  });
  stopRemembrance.addEventListener("click", () => {
    runtime.remembrancePreview = null;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "stopped temporary remembrance preview" });
  });
  commitRemembrance.addEventListener("click", () => {
    const preview = runtime.remembrancePreview || CreateRemembrancePreview({ variant: Number(remembranceVariant.value), beatId: remembranceBeat.value, progress: Number(remembranceProgress.value) });
    const base = runtime.remembranceRecord || CreateRemembranceIncident({ variant: preview.variant, instanceId: "2026:lights-of-remembrance:" + runtime.seed });
    const incident = AdvanceRemembranceIncident(base, preview.beatId, preview.progress);
    const result = runtime.store.commitSeasonalIncident(runtime.seed, incident);
    if (result.ok) {
      runtime.remembranceRecord = result.record.seasonalIncident;
      runtime.persistedNarrative = { record: result.record, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "committed Lights of Remembrance " + incident.checkpoint });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "remembrance commit failed: " + result.status });
  });
  resumeRemembrance.addEventListener("click", () => {
    const loaded = runtime.store.load(runtime.seed);
    runtime.persistedNarrative = loaded;
    runtime.remembranceRecord = loaded.record && loaded.record.seasonalIncident && loaded.record.seasonalIncident.type === REMEMBRANCE_TYPE ? loaded.record.seasonalIncident : null;
    runtime.remembrancePreview = CreateRemembranceResume(runtime.remembranceRecord);
    if (runtime.remembrancePreview) runtime.remembrancePreview.preview = true;
    runtime.logs.unshift({ at: new Date().toISOString(), message: runtime.remembrancePreview ? "resumed saved remembrance chapter" : "no saved remembrance chapter" });
  });
  clearRemembrance.addEventListener("click", () => {
    const result = runtime.store.clearSeasonalIncident(runtime.seed, REMEMBRANCE_TYPE);
    if (result.ok) {
      runtime.remembranceRecord = null;
      runtime.remembrancePreview = null;
      runtime.persistedNarrative = result.record ? { record: result.record, status: result.status } : { record: null, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "cleared saved remembrance observance" });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "clear remembrance failed: " + result.status });
  });
  commitIncident.addEventListener("click", () => {
    const preview = runtime.incidentPreview || CreateStubbornAntennaPreview({
      variant: Number(incidentVariant.value), beatId: incidentBeat.value, progress: Number(incidentProgress.value),
    });
    const storyYear = new Date(runtime.clock.worldTimeMs).getFullYear();
    const base = runtime.incidentRecord || CreateStubbornAntennaIncident({
      storyYear,
      variant: preview.variant,
      instanceId: storyYear + ":stubborn-antenna:" + runtime.seed,
    });
    const incident = AdvanceStubbornAntennaIncident(base, preview.beatId, preview.progress);
    const result = runtime.store.commitIncident(runtime.seed, incident);
    if (result.ok) {
      runtime.incidentRecord = result.record.incident;
      runtime.persistedNarrative = { record: result.record, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "committed antenna " + incident.checkpoint });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "antenna commit failed: " + result.status });
  });
  resumeIncident.addEventListener("click", () => {
    const loaded = runtime.store.load(runtime.seed);
    runtime.persistedNarrative = loaded;
    runtime.incidentRecord = loaded.record && loaded.record.incident;
    runtime.incidentPreview = CreateStubbornAntennaResume(runtime.incidentRecord);
    runtime.logs.unshift({ at: new Date().toISOString(), message: runtime.incidentPreview ? "resumed saved antenna chapter" : "no saved antenna chapter" });
  });
  clearIncident.addEventListener("click", () => {
    const result = runtime.store.clearIncident(runtime.seed);
    if (result.ok) {
      runtime.incidentRecord = result.record && result.record.incident;
      runtime.persistedNarrative = result.record ? { record: result.record, status: result.status } : { record: null, status: result.status };
      runtime.logs.unshift({ at: new Date().toISOString(), message: "cleared saved antenna incident" });
    } else runtime.logs.unshift({ at: new Date().toISOString(), message: "clear antenna failed: " + result.status });
  });
  forceCharge.addEventListener("click", () => {
    runtime.restPreview = "charge";
    runtime.dreamPreview = null;
    runtime.incidentPreview = null;
    runtime.pipOverride = null;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "forced recharge preview (temporary)" });
  });
  function PrepareDream(type, playing, progress = 0) {
    const record = runtime.persistedNarrative && runtime.persistedNarrative.record;
    const saved = record && record.completedStories && record.completedStories.find((memory) => memory.type === type && memory.eligibleForDream);
    // This fixture lives only in this preview module. It never becomes history.
    const memory = saved || { type, instanceId: "preview-" + type + "-example",
      storyYear: new Date(runtime.clock.worldTimeMs).getUTCFullYear(), variant: 1,
      outcome: type === PHANTOM_VISITOR_TYPE ? "inspection-drone-freed" : "repaired-with-plate", eligibleForDream: true };
    const dream = CreateStoryDream(memory);
    runtime.restPreview = "dream";
    runtime.incidentPreview = null;
    runtime.phantomPreview = null;
    runtime.remembrancePreview = null;
    runtime.pipOverride = null;
    runtime.dreamPreview = { ...dream, elapsed: progress * dream.duration, playing, example: !saved };
  }
  forceDream.addEventListener("click", () => PrepareDream("stubborn-antenna", true));
  forcePhantomDream.addEventListener("click", () => PrepareDream(PHANTOM_VISITOR_TYPE, true));
  dreamPoint.addEventListener("input", () => PrepareDream(runtime.dreamPreview && runtime.dreamPreview.type || "stubborn-antenna", false, Number(dreamPoint.value)));
  followRest.addEventListener("click", () => {
    runtime.restPreview = null;
    runtime.dreamPreview = null;
    runtime.logs.unshift({ at: new Date().toISOString(), message: "following Pip's normal recharge rhythm" });
  });
  commitButton.addEventListener("click", () => { const state = director.state; const result = runtime.store.commit({ worldSeed: runtime.seed, eventId: state.eventId, eventInstanceId: state.visitId || "forced-preview", checkpoint: state.checkpoint, checkpointKey: state.checkpointKey || "forced-preview:" + state.checkpoint, lifecycle: state.lifecycle, worldTimeMs: runtime.clock.worldTimeMs, presentationSeconds: runtime.clock.presentationSeconds }); runtime.logs.unshift({ at: new Date().toISOString(), message: result.ok ? "explicit commit: " + state.checkpointKey : "commit failed: " + result.status }); });
  dismissButton.addEventListener("click", () => { runtime.dismissed = true; runtime.paused = true; pauseButton.textContent = "Resume"; panel.classList.add("is-paused"); runtime.logs.unshift({ at: new Date().toISOString(), message: "simulated interruption at " + director.state.checkpoint }); });
  clearButton.addEventListener("click", () => { const result = runtime.store.clear(); runtime.logs.unshift({ at: new Date().toISOString(), message: result.ok ? "cleared Little Space Station record" : "clear failed" }); });
  offlineButton.addEventListener("click", () => { const next = !runtime.store.status().simulatedUnavailable; runtime.store.setSimulatedUnavailable(next); offlineButton.textContent = next ? "Storage on" : "Storage off"; });
  function UpdateFullscreenButton() {
    fullscreenButton.textContent = document.fullscreenElement ? "Exit FS" : "Full screen";
  }
  fullscreenButton.addEventListener("click", () => {
    const request = document.documentElement.requestFullscreen;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch((error) => console.warn("[Little Space Station] Could not exit preview fullscreen", error));
    } else if (request) {
      request.call(document.documentElement).catch((error) => console.warn("[Little Space Station] Could not enter preview fullscreen", error));
    }
  });
  document.addEventListener("fullscreenchange", UpdateFullscreenButton);
  collapseButton.addEventListener("click", () => { const collapsed = panel.classList.toggle("is-collapsed"); collapseButton.textContent = collapsed ? "Expand" : "Hide"; });
  pauseButton.addEventListener("click", () => {
    runtime.paused = !runtime.paused;
    pauseButton.textContent = runtime.paused ? "Resume" : "Pause";
    panel.classList.toggle("is-paused", runtime.paused);
  });
  restartButton.addEventListener("click", () => {
    runtime.dismissed = false;
    runtime.paused = false;
    pauseButton.textContent = "Pause";
    director.restart();
  });
  stepButton.addEventListener("click", () => {
    runtime.stepSeconds += 1;
  });

  return {
    update(state, snapshot = {}) {
      if (runtime.restPreview === "dream" && runtime.dreamPreview) {
        const dream = runtime.dreamPreview;
        if (dream.playing) dreamPoint.value = String(dream.elapsed / dream.duration);
        const beat = ResolveDreamTimeline(dream).beat;
        restReadout.textContent = (dream.example ? "Temporary example" : "Saved memory") + " · " +
          (dream.active ? beat.label : "Finished") + " · " + (dream.playing ? "playing" : "paused") + " · no writes";
      }
      phaseSelect.value = state.phase;
      progressBar.style.transform = "scaleX(" + state.progress.toFixed(4) + ")";
      const environment = snapshot.environment || {};
      environmentValues.phase.textContent = (environment.illuminationPhase || "—") + " · " + Math.round((environment.illuminationProgress || 0) * 100) + "%";
      environmentValues.light.textContent = (environment.illuminationState || "—") + (environment.forcedIllumination ? " · forced" : "");
      environmentValues.rotation.textContent = Math.round((environment.planetRotationPhase || 0) * 100) + "%";
      environmentValues.season.textContent = (environment.seasonalLabel || "—") + " · " + Math.round((environment.seasonalPhase || 0) * 100) + "%" + (environment.forcedSeason ? " · forced" : "");
      const seasonal = state.seasonal || {};
      seasonalValues.phase.textContent = (seasonal.phase || "ordinary") + (seasonal.forced ? " · forced" : "");
      seasonalValues.holiday.textContent = seasonal.activeHoliday || "none";
      seasonalValues.deck.textContent = seasonal.serviceDeckActive
        ? "active · " + seasonal.serviceDeckStatus
        : "absent · " + seasonal.serviceDeckStatus;
      if (seasonal.serviceDeck && seasonal.serviceDeck.action) {
        seasonalValues.deck.textContent += " · " + seasonal.serviceDeck.stage + " · " + Math.round(seasonal.serviceDeck.progress * 100) + "%";
      }
      deckProgress.disabled = !runtime.deckPreview;
      deckPlay.disabled = !runtime.deckPreview;
      if (runtime.deckPreview) deckProgress.value = String(runtime.deckPreview.progress);
      seasonalValues.shipment.textContent = state.seasonalCargo
        ? state.seasonalCargo.theme + " · package " + Math.min(state.cargoPackageCount, state.cargoPackageIndex + 1) + "/" + state.cargoPackageCount
        : (() => {
          const minute = Math.floor(state.worldTimeMs / 60_000);
          if (shipmentScheduleCache.minute !== minute) shipmentScheduleCache = { minute, value: GetUpcomingSeasonalShipments(runtime.seed, director.scheduler, state.worldTimeMs) };
          return shipmentScheduleCache.value.length
            ? shipmentScheduleCache.value.map((item) => item.theme + " ×" + item.packageCount + " · " + new Date(item.atMs).toLocaleString()).join(" | ")
            : "none scheduled in next 15 days";
        })();
      seasonalValues.packages.textContent = state.seasonalCargo
        ? state.seasonalCargo.packages.map((item) => item.label).join(", ")
        : "none";
      seasonalValues.decor.textContent = seasonal.installedDecorations && seasonal.installedDecorations.length
        ? seasonal.installedDecorations.join(", ")
        : "none";
      seasonalValues.halloween.textContent = Math.round((seasonal.halloweenDecorLevel || 0) * 100) + "%";
      seasonalValues.oddity.textContent = seasonal.ambientOddity
        ? seasonal.ambientOddity.id + " · " + Math.round(seasonal.ambientOddity.progress * 100) + "%"
        : "none";
      seasonalValues.cleanup.textContent = Math.round((seasonal.cleanupProgress || 0) * 100) + "%";
      seasonalValues.activity.textContent = seasonal.installation
        ? seasonal.installation.targetLabel + " · " + seasonal.installation.stage
        : "none";
      const narrativeRecord = snapshot.runtime && snapshot.runtime.persistedNarrative && snapshot.runtime.persistedNarrative.record;
      const pendingSeasonal = narrativeRecord && narrativeRecord.seasonalIncident;
      const completedSeasonal = narrativeRecord && narrativeRecord.completedStories || [];
      seasonalValues.pending.textContent = pendingSeasonal && pendingSeasonal.lifecycle !== "resolved" ? pendingSeasonal.type + " · " + pendingSeasonal.checkpoint : "none";
      seasonalValues.completed.textContent = completedSeasonal.length ? completedSeasonal.map((entry) => entry.type).join(", ") : "none";
      const dreamEligible = completedSeasonal.filter((entry) => entry.eligibleForDream);
      seasonalValues.dream.textContent = dreamEligible.length ? dreamEligible.map((entry) => entry.type).join(", ") : "none";
      const pip = snapshot.pip || {};
      pipValues.pose.textContent = (pip.pose || "—") + (runtime.pipOverride || runtime.incidentPreview || runtime.restPreview ? " · forced" : "");
      pipValues.reaction.textContent = pip.reaction || "—";
      const camera = snapshot.camera || {};
      cameraValue.textContent = (camera.preset || "original") + " · " + (camera.mode || "overview");
      const expansion = expansionPreview.getDiagnostics();
      expansionValue.textContent = expansion.layout + " · " + expansion.additions + " additions" + (expansion.visible ? "" : " · hidden");
      values.event.textContent = state.eventLabel + " · " + state.visitorType;
      values.visit.textContent = state.visitId || "—";
      values.purpose.textContent = state.visitPurpose || "—";
      values.phase.textContent = state.phase + " · " + Math.round(state.progress * 100) + "%";
      values.next.textContent = state.nextArrivalMs ? new Date(state.nextArrivalMs).toLocaleTimeString() : "—";
      values.departure.textContent = state.scheduledDepartureMs
        ? new Date(state.scheduledDepartureMs).toLocaleTimeString() + " · " + Math.ceil(state.remainingDockSeconds / 60) + "m"
        : "—";
      values.checkpoint.textContent = state.checkpoint;
      values.clock.textContent = snapshot.clocks && snapshot.clocks.worldTimeMs ? new Date(snapshot.clocks.worldTimeMs).toLocaleString() : "—";
      values.storage.textContent = snapshot.storage ? (snapshot.storage.available ? "available" : snapshot.storage.lastStatus) : "—";
      values.perf.textContent = snapshot.runtime && snapshot.runtime.fps ? Math.round(snapshot.runtime.fps) + " fps" : "—";
      values.lifecycle.textContent = state.lifecycle;
      values.log.textContent = snapshot.runtime && snapshot.runtime.logs[0] ? snapshot.runtime.logs[0].message : "—";
      values.job.textContent = state.ambientJobLabel;
      values.stage.textContent = (state.pipTaskStage || "—") + " · " + Math.round((state.pipTaskOverallProgress || 0) * 100) + "%";
      values.equipment.textContent = "light " + (state.equipmentLightState || "—") + " · antenna " + (state.antennaState || "—");
      values.activity.textContent = state.lastSignificantActivity || "—";
      if (runtime.incidentPreview) {
        const incident = state.storyIncident || runtime.incidentPreview;
        incidentValue.textContent = (incident.beatId || "—") + " · " + Math.round((incident.progress || 0) * 100) + "% · temporary";
      } else if (runtime.incidentRecord) {
        incidentValue.textContent = runtime.incidentRecord.checkpoint + " · " + runtime.incidentRecord.lifecycle + " · " + runtime.incidentRecord.storyYear + " · " + runtime.incidentRecord.instanceId + " · saved";
      } else incidentValue.textContent = "inactive · temporary";
      if (runtime.phantomPreview) {
        const phantom = state.phantomVisitor || runtime.phantomPreview;
        phantomValue.textContent = (phantom.beatId || "—") + " · " + Math.round((phantom.progress || 0) * 100) + "% · temporary";
      } else if (runtime.phantomRecord) {
        phantomValue.textContent = runtime.phantomRecord.checkpoint + " · " + runtime.phantomRecord.lifecycle + " · " + runtime.phantomRecord.instanceId + " · saved";
      } else phantomValue.textContent = "inactive · temporary";
      if (runtime.remembrancePreview) {
        const remembrance = state.remembrance || runtime.remembrancePreview;
        remembranceValue.textContent = (remembrance.beatId || "—") + " · " + Math.round((remembrance.progress || 0) * 100) + "% · temporary";
      } else if (runtime.remembranceRecord) {
        remembranceValue.textContent = runtime.remembranceRecord.checkpoint + " · " + runtime.remembranceRecord.lifecycle + " · " + runtime.remembranceRecord.instanceId + " · saved";
      } else remembranceValue.textContent = "inactive · temporary";
    },
  };
}
