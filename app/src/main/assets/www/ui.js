'use strict';
/* Mejoras de interfaz: flechas de capítulo y barra de progreso de lectura */
$('#prevBtn').onclick = () => step(-1);
$('#nextBtn').onclick = () => step(1);

const readView = $('#v-read'), bar = $('#progress');
function updateProgress() {
  const max = readView.scrollHeight - readView.clientHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, readView.scrollTop / max) : 0})`;
}
readView.addEventListener('scroll', updateProgress, { passive: true });
new MutationObserver(updateProgress).observe($('#reader'), { childList: true });
