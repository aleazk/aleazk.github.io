(() => {
  'use strict';

  // The full source figures and native video controls also work without JavaScript.
  document.querySelectorAll('[data-paired-video]').forEach((group) => {
    const videos = Array.from(group.querySelectorAll('video'));
    const controls = group.querySelector('.ai-media-controls');
    const play = group.querySelector('[data-play-pair]');
    const reset = group.querySelector('[data-reset-pair]');
    if (videos.length < 2 || !controls || !play || !reset) return;
    controls.hidden = false;
    const playLabel = group.dataset.playLabel || 'Play both training animations';
    const pauseLabel = group.dataset.pauseLabel || 'Pause both training animations';
    const update = () => {
      play.textContent = videos.some((v) => !v.paused) ? pauseLabel : playLabel;
    };
    play.addEventListener('click', async () => {
      if (videos.some((v) => !v.paused)) {
        videos.forEach((v) => v.pause());
      } else {
        videos.forEach((v) => { v.currentTime = 0; });
        const result = await Promise.allSettled(videos.map((v) => v.play()));
        if (result.some((r) => r.status === 'rejected')) videos.forEach((v) => v.pause());
      }
      update();
    });
    reset.addEventListener('click', () => {
      videos.forEach((v) => { v.pause(); v.currentTime = 0; });
      update();
    });
    videos.forEach((v) => { v.addEventListener('play', update); v.addEventListener('pause', update); });
    // Avoid leaving animations running when the reader switches tabs.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) videos.forEach((v) => v.pause());
    });
  });

  const interpolation = document.querySelector('[data-interpolation]');
  if (interpolation) {
    const slider = interpolation.querySelector('input[type="range"]');
    const output = interpolation.querySelector('output');
    const frames = Array.from(interpolation.querySelectorAll('[data-frame]'));
    if (slider && output && frames.length === 2) {
      interpolation.querySelector('.ai-scrubber').hidden = false;
      const update = () => {
        const step = Number(slider.value);
        output.textContent = `${step + 1} of 10`;
        frames.forEach((img) => {
          img.src = img.src.replace(/-\d{2}\.webp$/, `-${String(step).padStart(2, '0')}.webp`);
          img.alt = `${img.dataset.frame === 'standard' ? 'Standard' : 'Compressed'} VAE: zero to one, seven to two, and three to four at saved step ${step + 1} of 10.`;
        });
      };
      slider.addEventListener('input', update);
    }
  }

  document.querySelectorAll('[data-logic-viewer]').forEach((viewer) => {
    const model = viewer.querySelector('#logic-model');
    const slider = viewer.querySelector('#logic-step');
    const output = viewer.querySelector('#logic-step-label');
    const frame = viewer.querySelector('[data-logic-frame]');
    const play = viewer.querySelector('[data-logic-play]');
    const reset = viewer.querySelector('[data-logic-reset]');
    const reference = viewer.querySelector('[data-logic-reference]');
    const frameCaption = viewer.querySelector('[data-logic-frame-caption]');
    const run = viewer.querySelector('[data-logic-run]');
    if (!model || !slider || !frame || !play || !reset) return;
    const root = viewer.dataset.assetRoot;
    const labels = {full: 'With compression', zero: 'Without compression'};
    const runs = {full: 'Compressed model · selected epoch 520 · representative path 665–2649.', zero: 'Model without compression · selected epoch 200 · representative path 1207–2549.'};
    let timer = null;
    let playing = false;
    let revision = 0;
    const cache = new Map();
    const pause = () => {
      playing = false;
      clearTimeout(timer);
      play.textContent = 'Play interpolation';
      play.setAttribute('aria-pressed', 'false');
    };
    const getFrame = (mode, step) => {
      const url = `${root}${mode}-step-${String(step).padStart(2, '0')}.webp`;
      if (!cache.has(url)) {
        const img = new Image();
        const ready = new Promise((resolve, reject) => {
          img.onload = () => resolve(url);
          img.onerror = () => { cache.delete(url); reject(new Error('Frame unavailable')); };
        });
        img.src = url;
        cache.set(url, ready);
      }
      return cache.get(url);
    };
    const show = async () => {
      const version = ++revision;
      const mode = model.value;
      const step = Number(slider.value);
      try {
        const url = await getFrame(mode, step);
        if (version !== revision) return;
        frame.src = url;
        const endpoint = step === 0 || step === 19;
        reference.textContent = endpoint ? 'Original endpoint tree · reference profile' : 'Decoded tree · formula-derived profile';
        frameCaption.textContent = endpoint ? 'At this endpoint, the left tree is the original example.' : 'At this intermediate step, the same decoded structure is evaluated in two ways.';
        frame.alt = `${labels[mode]}, interpolation step ${step + 1} of 20: ${endpoint ? 'original endpoint tree' : 'decoded tree with formula-derived probabilities'} at left; decoded tree with predicted probabilities at right.`;
        output.textContent = `${step + 1} of 20 · t = ${(step / 19).toFixed(2)}`;
        slider.setAttribute('aria-valuetext', `Step ${step + 1} of 20`);
        run.textContent = runs[mode];
        if (step < 19) getFrame(mode, step + 1).catch(() => {});
      } catch (error) {
        if (version !== revision) return;
        pause();
        run.textContent = 'This frame could not be loaded. Try selecting the step again.';
      }
    };
    const tick = async () => {
      if (!playing) return;
      if (Number(slider.value) === 19) { pause(); return; }
      slider.value = Number(slider.value) + 1;
      await show();
      if (playing) timer = setTimeout(tick, 1100);
    };
    play.addEventListener('click', async () => {
      if (playing) { pause(); return; }
      if (Number(slider.value) === 19) slider.value = 0;
      playing = true;
      play.textContent = 'Pause interpolation';
      play.setAttribute('aria-pressed', 'true');
      await show();
      if (playing) timer = setTimeout(tick, 1100);
    });
    slider.addEventListener('input', () => { pause(); show(); });
    reset.addEventListener('click', () => { pause(); slider.value = 0; show(); });
    model.addEventListener('change', () => {
      pause();
      viewer.querySelectorAll('[data-logic-asset]').forEach((img) => {
        img.src = `${root}${model.value}-${img.dataset.logicAsset}.webp`;
        const descriptions = {
          'path-tsne': 't-SNE view of latent means, coloured by reference root probability, with the interpolation path in black',
          'path-coarse': 'Coarse coordinate view of latent means with the interpolation path in black',
          'error-curve': 'Normalized probability error along the 20-step representative interpolation'
        };
        img.alt = `${labels[model.value]}: ${descriptions[img.dataset.logicAsset]}.`;
      });
      show();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    document.addEventListener('ai:figure-open', pause);
    viewer.querySelector('.ai-logic-controls').hidden = false;
    pause();
  });

  if (!document.body.classList.contains('ai-story')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-figure-dialog';
  dialog.setAttribute('aria-label', 'Expanded research figure');
  dialog.innerHTML = '<div class="ai-dialog-toolbar"><a target="_blank" rel="noopener">Open image separately</a><button type="button" class="ai-button" data-figure-zoom>Zoom in</button><button type="button" class="ai-button" data-figure-close>Close figure</button></div><div class="ai-dialog-viewport"><img class="ai-dialog-image" alt=""></div><p></p>';
  document.body.append(dialog);
  const fullImage = dialog.querySelector('img');
  const fullLink = dialog.querySelector('a');
  const caption = dialog.querySelector('p');
  const close = dialog.querySelector('[data-figure-close]');
  const zoom = dialog.querySelector('[data-figure-zoom]');
  zoom.addEventListener('click', () => {
    const enlarged = dialog.classList.toggle('ai-enlarged');
    zoom.textContent = enlarged ? 'Fit figure' : 'Zoom in';
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('main img:not([data-no-zoom])').forEach((img) => {
    if (img.closest('a') || !img.closest('figure')) return;
    const link = document.createElement('a');
    link.href = img.src;
    link.className = 'ai-zoom';
    link.setAttribute('aria-label', `Enlarge figure: ${img.alt}`);
    img.before(link);
    link.append(img);
    img.addEventListener('load', () => { link.href = img.src; link.setAttribute('aria-label', `Enlarge figure: ${img.alt}`); });
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      document.dispatchEvent(new Event('ai:figure-open'));
      dialog.classList.remove('ai-enlarged');
      zoom.textContent = 'Zoom in';
      fullImage.src = img.src;
      fullImage.alt = img.alt;
      fullLink.href = img.src;
      caption.textContent = img.closest('figure').querySelector('figcaption')?.textContent || img.alt;
      dialog.showModal();
      close.focus();
    });
  });
})();
