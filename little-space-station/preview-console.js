import { LocalDate, AddLocalDays, LocalInputValue, LocalZone } from './local-calendar.js';
import { CreatePreviewController } from './preview-controller.js';
import { STUBBORN_ANTENNA_BEATS, STUBBORN_ANTENNA_TOTAL_SECONDS, ResolveStubbornAntennaTimeline, CreateStubbornAntennaPreview } from './stubborn-antenna.js';
import { PHANTOM_VISITOR_BEATS, PHANTOM_VISITOR_TOTAL_SECONDS, ResolvePhantomVisitorTimeline, CreatePhantomVisitorPreview } from './phantom-visitor.js';
import { REMEMBRANCE_BEATS, REMEMBRANCE_TOTAL_SECONDS, ResolveRemembranceTimeline, CreateRemembrancePreview } from './lights-of-remembrance.js';
import { WREATH_BEATS, WREATH_SECONDS, WreathCeremonySpec, WreathTimeline, WreathBeatStart, WreathLampState } from './advent-wreath.js';
import { CreateSchedulerPreview, SCHEDULER_SCENARIOS } from './scheduler-preview.js';

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const button = (label, action) => {
  const node = element('button', 'preview-tools__button', label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
};
const field = (label, control) => {
  const node = element('label', 'preview-tools__field');
  node.append(element('span', 'preview-tools__label', label), control);
  return node;
};
const change = node => node.dispatchEvent(new Event('change', { bubbles: true }));

// This module is imported only by the preview-gated preview-tools module.
// Existing domain controls are moved into the shell so their behavior remains
// owned by the same preview systems as before.
export function BuildPreviewConsole({ panel, runtime, director, scene, controls: c }) {
  const controller = CreatePreviewController(runtime, director);
  const holiday = panel.querySelector('details:last-of-type');
  const holidayControls = Array.from(holiday.children);
  const holidayButton = label => holidayControls.find(node => node.tagName === 'BUTTON' && node.textContent === label);
  const holidayInput = label => holiday.querySelector(`[aria-label="${label}"]`);
  const hBeat = holidayInput('Thanksgiving beat');
  const hScrub = holidayInput('Thanksgiving seconds');
  const hReadout = holidayInput('Thanksgiving state');
  const aKind = holidayInput('Advent activity');
  const aGift = holidayInput('Advent gift');
  const aVariation = holidayInput('Advent decoration variation');
  const aBeat = holidayInput('Advent activity beat');
  const aScrub = holidayInput('Advent activity seconds');
  const aReadout = holidayInput('Advent activity state');

  const shell = element('div', 'preview-console');
  const tabs = element('div', 'preview-console__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Preview sections');
  const content = element('div', 'preview-console__content');
  const panes = {};
  const tabButtons = {};
  let tab = 'scenes';
  for (const [id, label] of [['scenes', 'Scenes'], ['world', 'World'], ['inspect', 'Inspect']]) {
    const pane = element('section', 'preview-console__pane');
    pane.id = `preview-pane-${id}`;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-label', label);
    const tabButton = button(label, () => showTab(id));
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-controls', pane.id);
    tabButton.dataset.tab = id;
    tabs.append(tabButton);
    content.append(pane);
    panes[id] = pane;
    tabButtons[id] = tabButton;
  }
  function showTab(id) {
    tab = id;
    for (const key of Object.keys(panes)) {
      panes[key].hidden = key !== id;
      tabButtons[key].setAttribute('aria-selected', String(key === id));
      tabButtons[key].tabIndex = key === id ? 0 : -1;
    }
  }
  tabs.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const keys = Object.keys(panes);
    const index = keys.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    event.preventDefault();
    showTab(keys[next]);
    tabButtons[keys[next]].focus();
  });

  const activeTitle = c.titleWrap.querySelector('strong');
  activeTitle.textContent = 'Live simulation';
  c.collapseButton.textContent = 'Collapse';
  c.collapseButton.setAttribute('aria-expanded', 'true');
  c.collapseButton.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    c.collapseButton.textContent = collapsed ? 'Expand' : 'Collapse';
    c.collapseButton.setAttribute('aria-expanded', String(!collapsed));
  });
  c.pauseButton.addEventListener('click', () => controller.toggle());
  c.restartButton.textContent = 'Restart';
  c.restartButton.addEventListener('click', () => controller.restart());
  c.stepButton.addEventListener('click', () => controller.step());
  const stopButton = button('Stop', () => { controller.stop(); selectDisplay(null); });
  const cameraBar = element('div', 'preview-console__camera');
  cameraBar.setAttribute('aria-label', 'Camera views');
  for (const [id, label] of [['overview', 'Perspective'], ['top', 'Top'], ['front', 'Front'], ['side', 'Side'], ['bottom', 'Bottom'], ['back', 'Back'], ['other-side', 'Other side']]) {
    const b = button(label, () => { c.cameraModeSelect.value = id; change(c.cameraModeSelect); });
    b.dataset.camera = id;
    cameraBar.append(b);
  }
  const transport = element('div', 'preview-console__transport');
  transport.append(c.restartButton, stopButton, c.stepButton, field('Speed', c.speedSelect));
  const context = element('div', 'preview-console__context');
  context.setAttribute('aria-live', 'off');

  const scenes = panes.scenes;
  const search = element('input', 'preview-tools__select');
  search.type = 'search';
  search.placeholder = 'Search scenes';
  search.setAttribute('aria-label', 'Search scenes');
  const catalog = element('select', 'preview-tools__select');
  catalog.setAttribute('aria-label', 'Choose a scene');
  const detail = element('div', 'preview-console__scene-detail');
  scenes.append(field('Find a scene', search), field('Choose a scene', catalog), detail);

  const adapters = [];
  const register = (group, id, label, pane, start, options = {}) => {
    const adapter = { group, id, label, pane, start, ...options };
    adapters.push(adapter);
    return adapter;
  };
  const wrapper = (...nodes) => { const div = element('div', 'preview-console__settings'); div.append(...nodes); return div; };
  const fieldOf = node => node.closest('label.preview-tools__field') || node;
  const click = node => () => node.click();
  const visitPane = wrapper(fieldOf(c.phaseSelect), c.progressTrack);
  c.jumpButton.addEventListener('click', () => controller.pause());
  for (const option of [...c.eventSelect.options].filter(o => !['auto', 'ambient'].includes(o.value))) {
    const value = option.value;
    register('Visits', value, option.textContent, visitPane, () => { c.eventSelect.value = value; change(c.eventSelect); });
  }

  // One timed story adapter provides complete-timeline seeking while retaining
  // the existing beat-specific controls and the original timeline definitions.
  function story(id, label, section, force, variant, beat, progress, key, total, resolve, create) {
    const summary = section.querySelector('summary');
    if (summary) summary.remove();
    const settings = wrapper(...section.children);
    const slider = element('input', 'preview-tools__select');
    slider.type = 'range'; slider.min = '0'; slider.max = String(total); slider.step = '0.01';
    slider.setAttribute('aria-label', `${label} timeline seconds`);
    settings.append(field('Full timeline (seconds)', slider));
    const seek = seconds => {
      const time = Math.max(0, Math.min(total, Number(seconds) || 0));
      const state = resolve(time);
      const result = create({ variant: Number(variant.value), beatId: state.beat.id, progress: state.progress, playing: false });
      result.elapsed = time;
      if (key !== 'incidentPreview') result.preview = true;
      runtime[key] = result;
      beat.value = state.beat.id;
      progress.value = String(state.progress);
      controller.pause();
    };
    slider.addEventListener('input', () => seek(slider.value));
    for (const control of [beat, progress]) control.addEventListener(control === beat ? 'change' : 'input', () => {
      const current = runtime[key];
      const chosenBeat = [...beat.options].findIndex(option => option.value === beat.value);
      const definitions = id === 'antenna' ? antennaBeats : id === 'phantom' ? phantomBeats : remembranceBeats;
      const elapsed = definitions.slice(0, Math.max(0, chosenBeat)).reduce((sum, item) => sum + item.duration, 0) + (definitions[chosenBeat]?.duration || 0) * Number(progress.value);
      if (current) current.elapsed = elapsed;
      controller.pause();
    });
    let adapter;
    variant.addEventListener('change', () => { if (controller.selected === adapter) controller.select(adapter); });
    adapter = register('Stories', id, label, settings, () => {
      if (id === 'phantom') runtime.clock.setWorldTime(LocalDate(2026, 9, 31, 18));
      force.click();
    }, {
      playback: () => runtime[key],
      step: () => seek((runtime[key]?.elapsed || 0) + 1),
      refresh: () => {
        const current = runtime[key];
        if (!current) return;
        if (document.activeElement !== slider) slider.value = String(current.elapsed);
        if (document.activeElement !== beat) beat.value = current.beatId;
        if (document.activeElement !== progress) progress.value = String(current.progress);
      },
    });
  }
  // Durations come from the same exported beat catalogs used by the stories.
  const antennaBeats = STUBBORN_ANTENNA_BEATS;
  const phantomBeats = PHANTOM_VISITOR_BEATS;
  const remembranceBeats = REMEMBRANCE_BEATS;
  c.incidentActions.remove(); c.phantomActions.remove(); c.remembranceActions.remove();
  story('antenna', 'Stubborn Antenna', c.incidentSection, c.forceIncident, c.incidentVariant, c.incidentBeat, c.incidentProgress, 'incidentPreview', STUBBORN_ANTENNA_TOTAL_SECONDS, ResolveStubbornAntennaTimeline, CreateStubbornAntennaPreview);
  story('phantom', 'Phantom Visitor', c.phantomSection, c.forcePhantom, c.phantomVariant, c.phantomBeat, c.phantomProgress, 'phantomPreview', PHANTOM_VISITOR_TOTAL_SECONDS, ResolvePhantomVisitorTimeline, CreatePhantomVisitorPreview);
  story('remembrance', 'Lights of Remembrance', c.remembranceSection, c.forceRemembrance, c.remembranceVariant, c.remembranceBeat, c.remembranceProgress, 'remembrancePreview', REMEMBRANCE_TOTAL_SECONDS, ResolveRemembranceTimeline, CreateRemembrancePreview);

  const gatheringPane = wrapper(field('Beat', hBeat), field('Timeline (seconds)', hScrub), hReadout);
  register('Stories', 'thanksgiving', 'Thanksgiving gathering', gatheringPane, click(holidayButton('Play gathering')), {
    playback: () => runtime.thanksgivingPreview,
    step: () => { if (runtime.thanksgivingPreview) { hScrub.value = String(Number(runtime.thanksgivingPreview.elapsed) + 1); hScrub.dispatchEvent(new Event('input')); } },
  });
  register('Stories', 'thanksgiving-farewell', 'Thanksgiving farewells', gatheringPane, click(holidayButton('Play farewells')), {
    playback: () => runtime.thanksgivingPreview,
    step: () => { if (runtime.thanksgivingPreview) { hScrub.value = String(Number(runtime.thanksgivingPreview.elapsed) + 1); hScrub.dispatchEvent(new Event('input')); } },
  });
  for (const control of [hBeat, hScrub]) control.addEventListener(control === hBeat ? 'change' : 'input', () => controller.pause());

  c.pipSection.querySelector('summary').remove();
  const posePane = wrapper(element('p', 'preview-tools__hint', 'Pose inspection: choose a task and stage to hold a pose.'), ...c.pipSection.children);
  register('Pip Activities', 'pip-pose', 'Pip pose inspector', posePane, () => {
    if (c.pipTaskSelect.value === 'auto') c.pipTaskSelect.selectedIndex = 1;
    change(c.pipTaskSelect); runtime.paused = true;
  }, { static: true });
  for (const option of [...c.pipTaskSelect.options].filter(option => option.value !== 'auto')) {
    const value = option.value;
    register('Pip Activities', `pose-${value}`, `Pose: ${option.textContent}`, posePane, () => {
      c.pipTaskSelect.value = value; change(c.pipTaskSelect); runtime.paused = true;
    }, { static: true });
  }
  const activityPane = wrapper(field('Activity', aKind), field('Present', aGift), field('Decoration variation', aVariation), field('Beat', aBeat), field('Timeline (seconds)', aScrub), aReadout);
  const activity = register('Pip Activities', 'advent', 'Advent decorating', activityPane, click(holidayButton('Play Advent activity')), {
    playback: () => runtime.adventPreview,
    step: () => { if (runtime.adventPreview) { aScrub.value = String(Number(runtime.adventPreview.elapsed) + 1); aScrub.dispatchEvent(new Event('input')); } },
  });
  for (const option of [...aKind.options]) {
    const kind = option.value;
    register('Pip Activities', `advent-${kind}`, `Advent: ${option.textContent}`, activityPane, () => {
      aKind.value = kind;
      holidayButton('Play Advent activity').click();
    }, { playback: activity.playback, step: activity.step });
  }
  for (const control of [aKind, aGift, aVariation]) control.addEventListener('change', () => {
    if (controller.selected?.id === 'advent' || controller.selected?.id.startsWith('advent-')) {
      const next = controller.selected.id === 'advent' ? activity : adapters.find(item => item.id === `advent-${aKind.value}`);
      controller.select(next); selectDisplay(next);
    }
  });
  for (const control of [aBeat, aScrub]) control.addEventListener(control === aBeat ? 'change' : 'input', () => controller.pause());

  const wreathWeek = element('select', 'preview-tools__select');
  wreathWeek.setAttribute('aria-label', 'Advent wreath Sunday');
  for(let i=0;i<4;i++) {
    const spec=WreathCeremonySpec(i),option=element('option','',`${spec.label} · ${LocalInputValue(spec.date).slice(0,10)}`);
    option.value=String(i);wreathWeek.append(option);
  }
  const wreathBeat=element('select','preview-tools__select');wreathBeat.setAttribute('aria-label','Wreath ceremony beat');
  for(const beat of WREATH_BEATS){const option=element('option','',beat.id);option.value=beat.id;wreathBeat.append(option);}
  const wreathScrub=element('input','preview-tools__select');
  wreathScrub.type='range';wreathScrub.min='0';wreathScrub.max=String(WREATH_SECONDS);wreathScrub.step='.01';
  wreathScrub.setAttribute('aria-label','Wreath ceremony seconds');
  const wreathReadout=element('output','preview-tools__hint');wreathReadout.setAttribute('aria-label','Wreath ceremony state');
  const wreathPane=wrapper(field('Advent Sunday',wreathWeek),field('Beat',wreathBeat),field('Timeline (seconds)',wreathScrub),wreathReadout,
    element('p','preview-tools__hint','The candle stays unlit until Pip touches its wick at 18 seconds. Missed ceremonies remain pending until their fallback deadline.'));
  function seekWreath(seconds) {
    const p=runtime.wreathPreview;
    if(!p)return;
    p.elapsed=WreathTimeline(seconds).elapsed;runtime.clock.setWorldTime(p.date+p.elapsed*1000);controller.pause();
  }
  const wreathAdapters=[];
  for(let i=0;i<4;i++) {
    const spec=WreathCeremonySpec(i);
    wreathAdapters.push(register('Pip Activities',`wreath-${i+1}`,`Wreath: ${spec.label}`,wreathPane,()=>{
      wreathWeek.value=String(i);runtime.wreathPreview={...spec,elapsed:0,playing:true};runtime.clock.setWorldTime(spec.date);
    },{
      playback:()=>runtime.wreathPreview,
      step:()=>seekWreath((runtime.wreathPreview?.elapsed||0)+1),
      refresh:()=>{
        const p=runtime.wreathPreview;if(!p)return;
        const timeline=WreathTimeline(p.elapsed);
        if(document.activeElement!==wreathScrub)wreathScrub.value=String(p.elapsed);
        if(document.activeElement!==wreathBeat)wreathBeat.value=timeline.beat;
        const lit=WreathLampState(director.state.holiday || {},p.week,p).lit;
        wreathReadout.textContent=`${p.label} · ${timeline.beat} · ${p.elapsed.toFixed(2)} / ${WREATH_SECONDS} s · candle ${lit?'lit':'unlit'} · temporary`;
      },
    }));
  }
  wreathWeek.addEventListener('change',()=>{const adapter=wreathAdapters[Number(wreathWeek.value)];controller.select(adapter);selectDisplay(adapter);});
  wreathBeat.addEventListener('change',()=>seekWreath(WreathBeatStart(wreathBeat.value)));
  wreathScrub.addEventListener('input',()=>seekWreath(wreathScrub.value));

  const dreamBeat = element('select', 'preview-tools__select');
  dreamBeat.setAttribute('aria-label', 'Dream beat');
  const dreamPane = wrapper(field('Beat', dreamBeat), fieldOf(c.dreamPoint), c.restSection.querySelector('.preview-tools__hint'));
  let dreamBeats = [];
  dreamBeat.addEventListener('change', () => {
    const index = Math.max(0, dreamBeats.findIndex(beat => beat.id === dreamBeat.value));
    const elapsed = dreamBeats.slice(0, index).reduce((sum, beat) => sum + beat.duration, 0);
    const total = dreamBeats.reduce((sum, beat) => sum + beat.duration, 0);
    c.dreamPoint.value = String(elapsed / total);
    c.dreamPoint.dispatchEvent(new Event('input'));
  });
  const dreamAdapter = (id, label, trigger, beats) => register('Dreams', id, label, dreamPane, () => {
    dreamBeats = beats;
    dreamBeat.replaceChildren();
    for (const beat of beats) { const option = element('option', '', beat.label); option.value = beat.id; dreamBeat.append(option); }
    trigger.click();
  }, {
    playback: () => runtime.dreamPreview,
    step: () => { const p = runtime.dreamPreview; if (p) { c.dreamPoint.value = String(Math.min(1, (p.elapsed + 1) / p.duration)); c.dreamPoint.dispatchEvent(new Event('input')); controller.pause(); } },
  });
  dreamAdapter('antenna-dream', 'Stubborn Antenna dream', c.forceDream, antennaBeats);
  dreamAdapter('phantom-dream', 'Phantom Visitor dream', c.forcePhantomDream, phantomBeats);
  register('Pip Activities', 'recharge', 'Pip recharging', wrapper(element('p', 'preview-tools__hint', 'A quiet recharge pose.')), click(c.forceCharge), { static: true });
  c.dreamPoint.addEventListener('input', () => controller.pause());

  const deckPane = wrapper(fieldOf(c.deckRate), fieldOf(c.deckProgress), fieldOf(c.deckStageSelect), fieldOf(c.deckWorkSelect), c.deckJumpWork);
  for (const [id, label, trigger] of [['install', 'Install Commons Deck', c.installDeck], ['remove', 'Remove Commons Deck', c.removeDeck]]) {
    register('Station Assembly', `deck-${id}`, label, deckPane, click(trigger), {
      playback: () => runtime.deckPreview,
      step: () => { if (runtime.deckPreview) runtime.deckPreview.progress = Math.min(1, runtime.deckPreview.progress + 1 / runtime.deckPreview.durationSeconds); },
    });
  }
  c.deckProgress.addEventListener('input', () => controller.pause());
  c.deckJumpWork.addEventListener('click', () => controller.pause());

  const seasonalPane = wrapper(fieldOf(c.seasonalMode));
  register('Seasonal Scenes', 'seasonal', 'Autumn scenery and activities', seasonalPane, () => { if (c.seasonalMode.value === 'natural') c.seasonalMode.selectedIndex = 1; change(c.seasonalMode); });
  const seasonalDateSelect = element('select', 'preview-tools__select');
  seasonalDateSelect.setAttribute('aria-label', 'Autumn date');
  const addChoice = (select, label, value) => { const option = element('option', '', label); option.value = value; select.append(option); };
  for (const [i, b] of [...c.seasonalDates.querySelectorAll('button')].entries()) addChoice(seasonalDateSelect, `${b.textContent} · ${b.dataset.date.slice(0, 10)}`, String(i));
  seasonalDateSelect.addEventListener('change', () => { controller.stop(); c.seasonalDates.querySelectorAll('button')[Number(seasonalDateSelect.value)].click(); });
  seasonalPane.append(field('Autumn calendar dates', seasonalDateSelect));

  const dateButtons = holidayControls.filter(node => node.tagName === 'BUTTON' && !['Play gathering', 'Play farewells', 'Play Advent activity', 'Pause / resume Advent activity', 'Stop Advent activity', 'Natural calendar'].includes(node.textContent));
  const holidayDates = element('select', 'preview-tools__select');
  holidayDates.setAttribute('aria-label', 'Holiday date and tree stage');
  dateButtons.forEach((b, i) => addChoice(holidayDates, b.textContent, String(i)));
  const calendarPane = wrapper(field('Holiday date and tree stage', holidayDates));
  const calendar = register('Seasonal Scenes', 'calendar', 'Thanksgiving and Advent calendar', calendarPane, () => dateButtons[Number(holidayDates.value)].click());
  holidayDates.addEventListener('change', () => { controller.select(calendar); selectDisplay(calendar); });
  dateButtons.forEach((dateButton, i) => register('Seasonal Scenes', `holiday-date-${i}`, dateButton.textContent, calendarPane, () => {
    holidayDates.value = String(i); dateButton.click();
  }));

  const archived = element('div', 'preview-console__archive');
  archived.hidden = true;
  // Keep the remaining domain buttons alive for their original handlers.
  archived.append(c.eventSelect, c.deckActions, c.seasonalDates, c.actions, c.restSection, holiday);
  panel.append(archived);

  const world = panes.world;
  world.append(fieldOf(c.worldTimeSelect), fieldOf(c.dateInput));
  fieldOf(c.dateInput).querySelector('.preview-tools__label').textContent = 'Set date / time (local)';
  for (const section of [c.cameraSection, c.planetSection, c.expansionSection, c.environmentSection]) { section.open = true; world.append(section); }
  const live = button('Return to live simulation', () => {
    controller.stop(); director.forceEvent('auto'); runtime.clock.useActualTime(); runtime.speed = 1; c.speedSelect.value = '1';
    runtime.environment.clearOverrides(); c.illuminationSelect.value = 'auto'; c.seasonSelect.value = 'auto';
    scene.setPlanetRotationPreview(null); c.expansionPreview.setVisible(false); c.expansionVisibility && (c.expansionVisibility.value = 'hide');
    scene.cameraFraming.setPreset('very-close'); scene.cameraFraming.setMode('overview'); c.framingSelect.value = 'very-close'; c.cameraModeSelect.value = 'overview';
    selectDisplay(null);
  });
  world.prepend(live);
  for (const node of [c.worldTimeSelect, c.dateInput]) node.addEventListener('change', () => { controller.stop(); selectDisplay(null); });

  const inspect = panes.inspect;
  inspect.append(fieldOf(c.seedInput), c.readout, c.seasonalReadout);
  const schedulerSection = element('details', 'preview-tools__environment');
  schedulerSection.open = true;
  schedulerSection.append(element('summary', '', 'Shared event scheduler'));
  const schedulerReadout = element('pre', 'preview-tools__hint');
  schedulerReadout.style.whiteSpace = 'pre-wrap';
  schedulerReadout.setAttribute('aria-label', 'Scheduler diagnostics');
  const schedulerScenario = element('select', 'preview-tools__select');
  schedulerScenario.setAttribute('aria-label', 'Scheduler scenario');
  for (const [id, label] of SCHEDULER_SCENARIOS) addChoice(schedulerScenario, label, id);
  function runScheduler(restart = false) {
    const old = runtime.schedulerPreview;
    const options = restart && old ? { time: runtime.clock.worldTimeMs, records: [...old.events.scheduler.records.values()] } : {};
    controller.stop(); selectDisplay(null);
    runtime.schedulerPreview = CreateSchedulerPreview(runtime.config, schedulerScenario.value, options);
    runtime.clock.setWorldTime(runtime.schedulerPreview.time); director.forceEvent('auto');
    runtime.rechargeActive = false;
  }
  schedulerSection.append(schedulerReadout, field('Read-only scenario', schedulerScenario),
    button('Run scheduler scenario', () => runScheduler()), button('Simulate scheduler restart', () => runScheduler(true)),
    element('p', 'preview-tools__hint', 'Scenarios use isolated in-memory records. Restart retains only their checkpoints. Stop or any scene selection clears the experiment. Dates are local; absolute timestamps remain below.'));
  inspect.append(schedulerSection);
  const saved = element('details', 'preview-tools__environment');
  saved.append(element('summary', 'preview-tools__environment-summary', 'Saved data and failure testing'));
  saved.append(element('p', 'preview-tools__hint', 'These actions affect saved Little Space Station records. Preview playback is temporary.'));
  for (const [name, node] of [['Stubborn Antenna', c.incidentStorageActions], ['Phantom Visitor', c.phantomStorageActions], ['Lights of Remembrance', c.remembranceStorageActions]]) {
    saved.append(element('strong', 'preview-console__subheading', name), node);
  }
  saved.append(c.actions, c.storageActions, button('Clear scheduler occurrence records', () => {
    const result = runtime.scheduledEvents.storage.clear({ explicit: true });
    if (result.ok) runtime.scheduledEvents.scheduler.records.clear();
    runtime.logs.unshift({ at: new Date().toISOString(), message: result.ok ? 'cleared scheduler occurrence records; narrative memories unchanged' : result.status });
  }));
  // These operations are explicit and scoped to the existing store.
  for (const b of [c.commitButton, c.clearButton, ...saved.querySelectorAll('button')].filter((b, i, a) => a.indexOf(b) === i && /^(Commit|Clear)/.test(b.textContent))) {
    b.addEventListener('click', event => {
      if (!window.confirm(`${b.textContent} for seed ${runtime.seed}? This changes saved Little Space Station data.`)) event.stopImmediatePropagation();
    }, true);
  }
  for (const [resume, id] of [[c.resumeIncident, 'antenna'], [c.resumePhantom, 'phantom'], [c.resumeRemembrance, 'remembrance']]) {
    resume.addEventListener('click', () => {
      controller.stop();
      if (id === 'phantom') { runtime.clock.setWorldTime(LocalDate(2026, 9, 31, 18)); runtime.seasonalPreview = 'halloween-full'; }
      if (id === 'remembrance') runtime.clock.setWorldTime(LocalDate(2026, 10, 1, 18));
    }, true);
    resume.addEventListener('click', () => {
      const adapter = adapters.find(item => item.id === id);
      if (adapter.playback()) { controller.adopt(adapter); selectDisplay(adapter); }
    });
  }
  inspect.append(saved);

  c.headingActions = c.heading.querySelector('.preview-tools__heading-actions');
  c.headingActions.append(c.pauseButton, c.fullscreenButton, c.collapseButton);
  shell.append(tabs, cameraBar, context, content, transport);
  panel.replaceChildren(c.heading, shell, archived);

  function fillCatalog() {
    const term = search.value.trim().toLowerCase();
    const selected = controller.selected?.id || '';
    catalog.replaceChildren();
    addChoice(catalog, 'Choose a scene…', '');
    for (const group of ['Visits', 'Stories', 'Pip Activities', 'Seasonal Scenes', 'Dreams', 'Station Assembly']) {
      const matches = adapters.filter(item => item.group === group && `${item.label} ${group}`.toLowerCase().includes(term));
      if (!matches.length) continue;
      const optgroup = document.createElement('optgroup'); optgroup.label = group;
      for (const item of matches) addChoice(optgroup, item.label, item.id);
      catalog.append(optgroup);
    }
    catalog.value = [...catalog.options].some(o => o.value === selected) ? selected : '';
  }
  function selectDisplay(adapter) {
    activeTitle.textContent = adapter?.label || 'Live simulation';
    detail.replaceChildren();
    if (adapter) detail.append(adapter.pane);
    else detail.append(element('p', 'preview-tools__hint', 'Choose a scene to start a temporary preview.'));
    panel.dataset.sceneId = adapter?.id || 'live';
    c.stepButton.disabled = Boolean(adapter?.static);
    fillCatalog();
  }
  search.addEventListener('input', fillCatalog);
  catalog.addEventListener('change', () => {
    const adapter = adapters.find(item => item.id === catalog.value);
    if (!adapter) return;
    controller.select(adapter);
    selectDisplay(adapter);
  });
  showTab('scenes'); selectDisplay(null);
  let lastUpdate = 0;
  let updateDetails = false;
  return {
    shouldUpdateDetails() { return updateDetails; },
    update(state, snapshot) {
      const active = controller.selected?.playback?.();
      const paused = runtime.paused || (active && !active.playing);
      c.pauseButton.textContent = paused ? 'Play' : 'Pause';
      panel.classList.toggle('is-paused', Boolean(paused));
      updateDetails = !panel.classList.contains('is-collapsed') && performance.now() - lastUpdate >= 200;
      if (!updateDetails) return;
      lastUpdate = performance.now();
      controller.selected?.refresh?.();
      const camera = snapshot.camera || scene.getCameraDiagnostics();
      const env = snapshot.environment || {};
      if (runtime.schedulerPreview) activeTitle.textContent = runtime.schedulerPreview.events.scheduler.active?.event.label || 'Scheduler scenario';
      context.textContent = `${LocalInputValue(state.worldTimeMs).replace('T', ' ')} ${LocalZone()} · ${camera.preset || 'very-close'} / ${camera.mode || 'overview'} · light ${c.illuminationSelect.value} · season ${c.seasonSelect.value}`;
      if (tab === 'inspect' && schedulerSection.open) {
        const d = snapshot.scheduler || {};
        schedulerReadout.textContent = [
          `Active: ${d.active ? d.active.id + ' · priority ' + d.active.priority + ' · ' + d.active.elapsed.toFixed(1) + 's' : 'none'}`,
          `Waiting: ${d.waiting || 'ready'}`,
          `Earliest opportunity: ${d.nextOpportunity ? new Date(d.nextOpportunity).toLocaleString() : '—'} (estimate; admitted work may finish later)`,
          `Zone: ${d.zone} · records: ${d.storage}`,
          'Pending:', ...(d.pending || []).map(e => `  P${e.priority} ${e.id}${e.deferred ? ' · deferred' : ''}\n    Due: ${new Date(e.due).toLocaleString()}\n    ${e.waiting || 'ready'}`),
          'Completed / retired:', ...(d.records || []).filter(e => ['completed','expired','superseded'].includes(e.status)).map(e => `  ${e.id}: ${e.status}${e.reason ? ' · '+e.reason : ''}`),
          'Physical effects:', ...(d.records || []).filter(e => e.fallback).map(e => `  ${e.id}: ${e.effectState}; presentation ${e.status}\n    Fallback: ${new Date(e.fallback).toLocaleString()} · ${e.fallback}`),
          'Traffic admission:', ...(d.traffic || []).map(e => `  ${e.id}: ${e.action}`),
          `Absolute: ${state.worldTimeMs} · ${new Date(state.worldTimeMs).toISOString()}`,
        ].join('\n');
      }
      for (const b of cameraBar.children) b.setAttribute('aria-pressed', String(b.dataset.camera === camera.mode));
    },
  };
}

