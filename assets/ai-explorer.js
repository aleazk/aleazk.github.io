(() => {
  'use strict';

  // The full source figures and native video controls also work without JavaScript.
  document.querySelectorAll('[data-paired-video]').forEach((group) => {
    const videos = Array.from(group.querySelectorAll('video'));
    const controls = group.querySelector('.ai-media-controls');
    const play = group.querySelector('[data-play-pair]');
    const reset = group.querySelector('[data-reset-pair]');
    if (videos.length !== 2 || !controls || !play || !reset) return;
    controls.hidden = false;
    const update = () => {
      play.textContent = videos.some((v) => !v.paused) ? 'Pause both rotations' : 'Play both rotations';
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

  if (!document.body.classList.contains('ai-story')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-figure-dialog';
  dialog.setAttribute('aria-label', 'Expanded research figure');
  dialog.innerHTML = '<div class="ai-dialog-toolbar"><a target="_blank" rel="noopener">Open image separately</a><button type="button" class="ai-button">Close figure</button></div><img class="ai-dialog-image" alt=""><p></p>';
  document.body.append(dialog);
  const fullImage = dialog.querySelector('img');
  const fullLink = dialog.querySelector('a');
  const caption = dialog.querySelector('p');
  const close = dialog.querySelector('button');
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
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      fullImage.src = img.src;
      fullImage.alt = img.alt;
      fullLink.href = img.src;
      caption.textContent = img.closest('figure').querySelector('figcaption')?.textContent || img.alt;
      dialog.showModal();
      close.focus();
    });
  });
})();
