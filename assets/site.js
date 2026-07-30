(() => {
  const buttons = document.querySelectorAll('.filter-button');
  const cards = document.querySelectorAll('.publication-card[data-field]');
  if (!buttons.length || !cards.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      cards.forEach((card) => {
        const visible = filter === 'all' || card.dataset.field === filter;
        card.hidden = !visible;
      });
    });
  });
})();
