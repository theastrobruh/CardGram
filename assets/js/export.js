/* ==========================================================================
   CardGram — v0.4.4 · Exportación
   Grabación 9:16 / 1:1 / 16:9 con MediaRecorder y captura PNG.
   ========================================================================== */
'use strict';

let exportRecorder = null;
let exportStream = null;
let exportRenderer = null;
let exportRaf = 0;
let exportTimer = 0;
let exportStartedAt = 0;
let exportDuration = 10;
let snapshotting = false;

function canRecord() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

function pickMime() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch (error) {
      /* El navegador puede lanzar al consultar códecs desconocidos. */
    }
  }
  return '';
}

function bitrateFor(width, height) {
  return Math.round(clamp(width * height * 5, 8_000_000, 20_000_000));
}

function extensionFor(mime) {
  return String(mime || '').includes('mp4') ? 'mp4' : 'webm';
}

function cancelExport() {
  if (!exporting) return;
  exportCancelled = true;
  if (exportRecorder && exportRecorder.state !== 'inactive') {
    try {
      exportRecorder.stop();
    } catch (error) {
      console.warn('[CardGram] Could not stop recorder', error);
    }
  }
}

async function exportVideo() {
  if (exporting) return;

  if (!Scene.isReady()) {
    toast(t('webgl_error'), { type: 'error', duration: 5000 });
    return;
  }

  if (!canRecord()) {
    toast(t('export_unsupported'), { type: 'error', duration: 6500 });
    return;
  }

  const size = getExportSize();
  const chunks = [];
  let failed = false;

  exporting = true;
  exportCancelled = false;
  setBusyUI(true);
  setProgress(0, true);
  setStatus(t('status_preparing'), 'recording');
  Scene.setRenderPaused(true);

  try {
    exportRenderer = Scene.createVideoRenderer(size.width, size.height);
    exportStream = exportRenderer.canvas.captureStream(30);

    const mime = pickMime();
    const options = { videoBitsPerSecond: bitrateFor(size.width, size.height) };
    if (mime) options.mimeType = mime;

    try {
      exportRecorder = new MediaRecorder(exportStream, options);
    } catch (error) {
      console.warn('[CardGram] Falling back to default MediaRecorder options', error);
      exportRecorder = new MediaRecorder(exportStream);
    }

    exportRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    exportRecorder.onerror = (event) => {
      console.error('[CardGram] MediaRecorder error', event);
      failed = true;
      try {
        exportRecorder.stop();
      } catch (error) {
        /* ya está detenido */
      }
    };

    const stopped = new Promise((resolve) => {
      exportRecorder.onstop = resolve;
    });

    const renderLoop = () => {
      if (!exporting) return;
      exportRenderer.renderFrame();
      exportRaf = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    exportStartedAt = performance.now();
    exportDuration = state.duration;
    exportRecorder.start(200);
    setStatus(t('status_recording', { time: '0.0', total: exportDuration }), 'recording');

    exportTimer = setInterval(() => {
      const elapsed = (performance.now() - exportStartedAt) / 1000;
      const ratio = Math.min(elapsed / exportDuration, 1);
      setProgress(ratio * 100, true);
      setStatus(
        t('status_recording', { time: elapsed.toFixed(1), total: exportDuration }),
        'recording'
      );

      if (elapsed >= exportDuration && exportRecorder && exportRecorder.state === 'recording') {
        exportRecorder.stop();
      }
    }, 100);

    const safetyTimeout = new Promise((resolve) => {
      setTimeout(resolve, (exportDuration + 8) * 1000);
    });

    await Promise.race([stopped, safetyTimeout]);

    if (exportRecorder && exportRecorder.state !== 'inactive') {
      failed = true;
      try {
        exportRecorder.stop();
      } catch (error) {
        /* ya está detenido */
      }
    }
  } catch (error) {
    console.error('[CardGram] Export setup failed', error);
    failed = true;
  } finally {
    clearInterval(exportTimer);
    exportTimer = 0;
    cancelAnimationFrame(exportRaf);
    exportRaf = 0;

    try {
      if (exportStream) exportStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn('[CardGram] Could not stop stream tracks', error);
    }

    try {
      if (exportRenderer) exportRenderer.dispose();
    } catch (error) {
      console.warn('[CardGram] Could not dispose export renderer', error);
    }

    exportRenderer = null;
    exportStream = null;
    Scene.setRenderPaused(false);
    exporting = false;
    setBusyUI(false);
    setProgress(0, false);
  }

  if (exportCancelled) {
    setStatus(t('status_cancelled'), 'ready');
    toast(t('export_cancelled'), { type: 'info' });
    exportRecorder = null;
    return;
  }

  if (failed || chunks.length === 0) {
    setStatus(t('status_error'), 'error');
    toast(t('export_error'), { type: 'error', duration: 6500 });
    exportRecorder = null;
    return;
  }

  const mimeType = (exportRecorder && exportRecorder.mimeType) || pickMime() || 'video/webm';
  const blob = new Blob(chunks, { type: mimeType });
  const extension = extensionFor(mimeType);

  downloadBlob(
    blob,
    `CardGram_v${APP_VERSION}_${size.width}x${size.height}_${fileStamp()}.${extension}`
  );

  setStatus(t('status_done'), 'success');
  toast(t('status_done'), { type: 'success' });
  window.dispatchEvent(new CustomEvent('cardgram:exported', { detail: { kind: 'video' } }));
  exportRecorder = null;
}

async function exportSnapshot() {
  if (exporting || snapshotting) return;

  if (!Scene.isReady()) {
    toast(t('webgl_error'), { type: 'error', duration: 5000 });
    return;
  }

  snapshotting = true;
  const size = getExportSize();
  el.snapshotBtn.disabled = true;

  try {
    const blob = await Scene.createSnapshot(size.width, size.height);
    downloadBlob(
      blob,
      `CardGram_v${APP_VERSION}_${size.width}x${size.height}_${fileStamp()}.png`
    );
    setStatus(t('status_png_done'), 'success');
    toast(t('status_png_done'), { type: 'success' });
    window.dispatchEvent(new CustomEvent('cardgram:exported', { detail: { kind: 'snapshot' } }));
  } catch (error) {
    console.error('[CardGram] Snapshot failed', error);
    setStatus(t('status_error'), 'error');
    toast(t('snapshot_error'), { type: 'error' });
  } finally {
    snapshotting = false;
    el.snapshotBtn.disabled = exporting;
  }
}
