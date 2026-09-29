(() => {
  const value = window.FREE_CONSULTATION_CONFIG?.webAppUrl;
  if (typeof value !== 'string' || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value)) return;
  const link = document.getElementById('consultation-link');
  link.href = value;
  link.hidden = false;
  document.getElementById('consultation-setup').textContent = '予約画面で日時をお選びいただけます。';
})();
