/* ==========================================================================
   CardGram — v0.4.4 · Motor 3D
   Escena Three.js, geometría procedural de la carta, materiales, fondos,
   cámara, transiciones y utilidades de exportación.
   ========================================================================== */
'use strict';

const Scene = (() => {
  const wrapper = document.getElementById('canvas-window-wrapper');
  const container = document.getElementById('viewport-container');

  const DEFAULTS = {
    corners: 'rounded',
    edgeThickness: 0.016,
    bevel: 0.004,
    edgeColor: 'black',
    gloss: 0.25,
    exposure: 0.9,
    speed: 0.5,
    spinDir: 1,
    float: 'organic',
    camDistance: 4.6,
    posY: 0,
    tilt: 1,
    bg: 'aqua'
  };

  const EDGE_COLORS = {
    black: { color: 0x0a0d10, metalness: 0.15, roughness: 0.45 },
    gold: { color: 0xd4af37, metalness: 0.95, roughness: 0.16 },
    silver: { color: 0xdcdde1, metalness: 0.98, roughness: 0.12 },
    white: { color: 0xf7f7f2, metalness: 0.0, roughness: 0.5 }
  };

  const BACKGROUNDS = {
    aqua: {
      css: 'linear-gradient(160deg, #e6fffa 0%, #a9e6f5 48%, #5fb0e2 100%)',
      stops: [[0, '#f4fffd'], [0.45, '#a9e6f5'], [1, '#4f9fd8']],
      glow1: 'rgba(255, 255, 255, 0.75)',
      glow2: 'rgba(124, 235, 221, 0.4)'
    },
    studio: {
      css: 'linear-gradient(160deg, #ffffff 0%, #dceff4 55%, #b8dce8 100%)',
      stops: [[0, '#ffffff'], [0.5, '#e4f4f7'], [1, '#b8dce8']],
      glow1: 'rgba(255, 255, 255, 0.9)',
      glow2: 'rgba(160, 214, 231, 0.45)'
    },
    oled: {
      css: 'linear-gradient(160deg, #101b24 0%, #060b10 60%, #000000 100%)',
      stops: [[0, '#14222d'], [0.5, '#060c12'], [1, '#000000']],
      glow1: 'rgba(84, 190, 214, 0.24)',
      glow2: 'rgba(47, 143, 221, 0.16)'
    },
    sunset: {
      css: 'linear-gradient(160deg, #ffe9cf 0%, #f6b9c9 50%, #a99be4 100%)',
      stops: [[0, '#ffe9cf'], [0.48, '#f6b9c9'], [1, '#a99be4']],
      glow1: 'rgba(255, 255, 255, 0.7)',
      glow2: 'rgba(255, 184, 140, 0.45)'
    },
    cyber: {
      css: 'linear-gradient(160deg, #0a1330 0%, #16255c 46%, #8a1e86 100%)',
      stops: [[0, '#0a1330'], [0.46, '#16255c'], [1, '#8a1e86']],
      glow1: 'rgba(73, 208, 255, 0.34)',
      glow2: 'rgba(255, 80, 210, 0.3)'
    },
    transparent: null
  };

  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let cardGroup = null;
  let matFront = null;
  let matBack = null;
  let matEdge = null;

  let frontTexture = null;
  let backTexture = null;
  let fullArtTexture = null;
  let placeholderFront = null;
  let placeholderBack = null;

  const FULLART_CYCLE = 10;
  const FULLART_FADE = 1.5;
  const fullArtUniforms = {
    uFullArtMap: { value: null },
    uFullArtMix: { value: 0 },
    uHasFullArt: { value: 0 }
  };
  let fullArtEnabled = true;
  let fullArtHasTexture = false;
  let fullArtMix = 0;
  let fullArtClock = 0;

  let ready = false;
  let renderPaused = false;
  let animationId = 0;
  let contextLost = false;
  let clock = null;
  let floatTime = 0;

  let isTransitioning = false;
  let transitionStart = 0;
  const transitionDuration = 1150;
  let transStartCam = null;
  let transTargetCam = null;
  let transStartCtrl = null;
  let transTargetCtrl = null;

  const settings = { ...DEFAULTS };
  let cardParams = {
    w: 1.35,
    h: 1.89,
    isRounded: true,
    thickness: DEFAULTS.edgeThickness,
    bevelSize: DEFAULTS.bevel
  };

  const bgCache = new Map();
  let envTexture = null;
  let rebuildRaf = 0;

  const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ------------------------------------------------------------------------
     Inicialización
     ------------------------------------------------------------------------ */
  function init() {
    if (!window.THREE || !window.THREE.OrbitControls) return false;
    if (!wrapper) return false;

    try {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, settings.camDistance);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = settings.exposure;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      wrapper.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = false;
      controls.minDistance = 2;
      controls.maxDistance = 9;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 0.75;
      controls.target.set(0, 0, 0);

      buildLighting();

      envTexture = createEnvironmentTexture();
      scene.environment = envTexture;

      cardGroup = new THREE.Group();
      scene.add(cardGroup);

      matFront = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: settings.gloss,
        metalness: 0.04,
        envMapIntensity: 0.55
      });

      matBack = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: settings.gloss,
        metalness: 0.04,
        envMapIntensity: 0.55
      });

      matEdge = new THREE.MeshStandardMaterial({
        color: EDGE_COLORS.black.color,
        roughness: EDGE_COLORS.black.roughness,
        metalness: EDGE_COLORS.black.metalness,
        envMapIntensity: 1.35
      });

      setupFullArtShader();

      // El shader del anverso necesita un mapa válido antes de compilarse.
      ensurePlaceholder('front');
      ensurePlaceholder('back');

      transStartCam = new THREE.Vector3();
      transTargetCam = new THREE.Vector3();
      transStartCtrl = new THREE.Vector3();
      transTargetCtrl = new THREE.Vector3();

      applyEdgeColor(settings.edgeColor);
      applyBackground(settings.bg);
      rebuildCard();

      renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

      clock = new THREE.Clock();
      ready = true;
      animate();
      return true;
    } catch (error) {
      console.error('[CardGram] WebGL init failed', error);
      ready = false;
      return false;
    }
  }

  function buildLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff8ee, 1.2);
    key.position.set(3, 4, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbcd7ff, 0.55);
    fill.position.set(-3, -1, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xd8fff9, 0.9);
    rim.position.set(0, 4, -3);
    scene.add(rim);
  }

  function createEnvironmentTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const base = ctx.createLinearGradient(0, 0, 0, 512);
    base.addColorStop(0, '#f6fffe');
    base.addColorStop(0.34, '#c4f0f3');
    base.addColorStop(0.62, '#4d9fc6');
    base.addColorStop(1, '#0b3d52');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 512);

    const softbox = ctx.createRadialGradient(292, 138, 8, 292, 138, 210);
    softbox.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    softbox.addColorStop(0.5, 'rgba(255, 255, 255, 0.34)');
    softbox.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = softbox;
    ctx.fillRect(0, 0, 1024, 512);

    const warm = ctx.createRadialGradient(820, 210, 8, 820, 210, 170);
    warm.addColorStop(0, 'rgba(255, 236, 198, 0.7)');
    warm.addColorStop(1, 'rgba(255, 236, 198, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, 1024, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  /* ------------------------------------------------------------------------
     Ajustes
     ------------------------------------------------------------------------ */
  function applySettings(next) {
    if (!next || typeof next !== 'object') return;
    const previous = { ...settings };
    Object.assign(settings, next);

    if (next.camDistance !== undefined && Number(next.camDistance) !== previous.camDistance) {
      setCameraDistance(next.camDistance);
    }

    if (next.gloss !== undefined) setGloss(settings.gloss);
    if (next.exposure !== undefined) setExposure(settings.exposure);
    if (next.edgeColor !== undefined) applyEdgeColor(settings.edgeColor);
    if (next.bg !== undefined) applyBackground(settings.bg);

    const nextParams = {
      w: cardParams.w,
      h: cardParams.h,
      isRounded: settings.corners === 'rounded',
      thickness: settings.edgeThickness,
      bevelSize: settings.bevel
    };

    if (
      nextParams.isRounded !== cardParams.isRounded ||
      nextParams.thickness !== cardParams.thickness ||
      nextParams.bevelSize !== cardParams.bevelSize
    ) {
      cardParams = { ...nextParams };
      scheduleRebuild();
    }
  }

  function setGloss(value) {
    settings.gloss = value;
    if (matFront) matFront.roughness = value;
    if (matBack) matBack.roughness = value;
  }

  function setExposure(value) {
    const exposure = clampNumber(Number(value) || DEFAULTS.exposure, 0.4, 1.4);
    settings.exposure = exposure;
    if (renderer) renderer.toneMappingExposure = exposure;
  }

  function applyEdgeColor(key) {
    const edge = EDGE_COLORS[key] || EDGE_COLORS.black;
    settings.edgeColor = key;
    if (!matEdge) return;
    matEdge.color.setHex(edge.color);
    matEdge.metalness = edge.metalness;
    matEdge.roughness = edge.roughness;
    matEdge.needsUpdate = true;
  }

  function applyBackground(key) {
    settings.bg = key;
    if (!scene) return;

    const definition = BACKGROUNDS[key];
    if (!definition) {
      scene.background = null;
      if (wrapper) {
        wrapper.classList.add('bg-transparent');
        wrapper.style.background = '';
      }
      return;
    }

    if (wrapper) {
      wrapper.classList.remove('bg-transparent');
      wrapper.style.background = definition.css;
    }
    scene.background = getBackgroundTexture(key);
  }

  function getBackgroundTexture(key) {
    if (bgCache.has(key)) return bgCache.get(key);
    const definition = BACKGROUNDS[key];
    if (!definition) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    definition.stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const glowA = ctx.createRadialGradient(148, 128, 4, 148, 128, 260);
    glowA.addColorStop(0, definition.glow1);
    glowA.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, 512, 512);

    const glowB = ctx.createRadialGradient(392, 372, 4, 392, 372, 240);
    glowB.addColorStop(0, definition.glow2);
    glowB.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    bgCache.set(key, texture);
    return texture;
  }

  function setCameraDistance(value) {
    const distance = clampNumber(Number(value) || DEFAULTS.camDistance, 2, 9);
    settings.camDistance = distance;
    if (!camera || !controls) return;

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
    direction.normalize().multiplyScalar(distance);
    camera.position.copy(controls.target).add(direction);
    controls.update();
  }

  /* ------------------------------------------------------------------------
     Geometría procedural
     ------------------------------------------------------------------------ */
  function scheduleRebuild() {
    if (rebuildRaf) return;
    rebuildRaf = requestAnimationFrame(() => {
      rebuildRaf = 0;
      rebuildCard();
    });
  }

  function rebuildCard() {
    if (!cardGroup) return;

    while (cardGroup.children.length > 0) {
      const child = cardGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      cardGroup.remove(child);
    }

    const w = cardParams.w;
    const h = cardParams.h;
    const radius = cardParams.isRounded ? 0.09 : 0.0001;
    const depth = cardParams.thickness;
    const bevel = cardParams.bevelSize;

    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + w - radius, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + radius);
    shape.lineTo(x + w, y + h - radius);
    shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    shape.lineTo(x + radius, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0.0005,
      bevelSegments: 3,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel
    });
    geometry.center();

    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const totalHalfDepth = depth / 2 + (bevel > 0.0005 ? bevel : 0);
    const outerW = w + bevel * 2;
    const outerH = h + bevel * 2;

    for (let i = 0; i < position.count; i += 1) {
      const px = position.getX(i);
      const py = position.getY(i);
      const pz = position.getZ(i);

      const u = Math.min(Math.max(px / outerW + 0.5, 0), 1);
      const v = Math.min(Math.max(py / outerH + 0.5, 0), 1);

      if (pz > 0.001) {
        uv.setXY(i, u, v);
      } else if (pz < -0.001) {
        uv.setXY(i, 1 - u, v);
      } else {
        uv.setXY(i, 0.5, 0.5);
      }
    }
    uv.needsUpdate = true;

    const body = new THREE.Mesh(geometry, [matFront, matEdge]);
    cardGroup.add(body);

    const faceGeometry = new THREE.ShapeGeometry(shape, 20);
    const facePosition = faceGeometry.attributes.position;
    const faceUv = faceGeometry.attributes.uv;

    for (let i = 0; i < facePosition.count; i += 1) {
      const px = facePosition.getX(i);
      const py = facePosition.getY(i);
      faceUv.setXY(i, px / w + 0.5, py / h + 0.5);
    }
    faceUv.needsUpdate = true;

    const frontFace = new THREE.Mesh(faceGeometry, matFront);
    frontFace.position.z = totalHalfDepth + 0.0004;
    cardGroup.add(frontFace);

    const backGeometry = faceGeometry.clone();
    const backUv = backGeometry.attributes.uv;
    for (let i = 0; i < backUv.count; i += 1) {
      backUv.setX(i, 1 - backUv.getX(i));
    }
    backUv.needsUpdate = true;

    const backFace = new THREE.Mesh(backGeometry, matBack);
    backFace.position.z = -totalHalfDepth - 0.0004;
    backFace.rotation.y = Math.PI;
    cardGroup.add(backFace);
  }

  /* ------------------------------------------------------------------------
     Texturas de carta
     ------------------------------------------------------------------------ */
  function setupFullArtShader() {
    if (!matFront) return;

    matFront.onBeforeCompile = (shader) => {
      shader.uniforms.uFullArtMap = fullArtUniforms.uFullArtMap;
      shader.uniforms.uFullArtMix = fullArtUniforms.uFullArtMix;
      shader.uniforms.uHasFullArt = fullArtUniforms.uHasFullArt;

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'uniform sampler2D uFullArtMap;',
            'uniform float uFullArtMix;',
            'uniform float uHasFullArt;'
          ].join('\n')
        )
        .replace(
          '#include <map_fragment>',
          [
            '#ifdef USE_MAP',
            '  vec4 texelColor = texture2D( map, vUv );',
            '  texelColor = mapTexelToLinear( texelColor );',
            '  if ( uHasFullArt > 0.5 ) {',
            '    vec4 fullArtColor = texture2D( uFullArtMap, vUv );',
            '    fullArtColor = mapTexelToLinear( fullArtColor );',
            '    texelColor = mix( texelColor, fullArtColor, clamp( uFullArtMix, 0.0, 1.0 ) );',
            '  }',
            '  diffuseColor *= texelColor;',
            '#endif'
          ].join('\n')
        );
    };

    matFront.needsUpdate = true;
  }

  function setFullArtTexture(texture) {
    if (fullArtTexture && fullArtTexture !== texture) {
      fullArtTexture.dispose();
    }

    fullArtTexture = texture || null;
    fullArtHasTexture = Boolean(texture);
    fullArtUniforms.uFullArtMap.value = texture || null;
    fullArtUniforms.uHasFullArt.value = fullArtHasTexture ? 1 : 0;

    if (!fullArtHasTexture) {
      fullArtMix = 0;
      fullArtClock = 0;
      fullArtUniforms.uFullArtMix.value = 0;
    }
  }

  function clearFullArt() {
    setFullArtTexture(null);
  }

  function setFullArtEnabled(enabled) {
    fullArtEnabled = Boolean(enabled);
    fullArtClock = 0;
    if (!fullArtEnabled) {
      fullArtMix = 0;
      fullArtUniforms.uFullArtMix.value = 0;
    }
  }

  function smoothStep(value) {
    const t = clampNumber(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function updateFullArtAnimation(delta) {
    if (!fullArtEnabled || !fullArtHasTexture) {
      if (fullArtMix !== 0) {
        fullArtMix = 0;
        fullArtUniforms.uFullArtMix.value = 0;
      }
      return;
    }

    fullArtClock = (fullArtClock + delta) % FULLART_CYCLE;

    const fadeInStart = 3.5;
    const fadeOutStart = 7.5;
    let mix = 0;

    if (fullArtClock >= fadeInStart && fullArtClock < fadeInStart + FULLART_FADE) {
      mix = smoothStep((fullArtClock - fadeInStart) / FULLART_FADE);
    } else if (fullArtClock >= fadeInStart + FULLART_FADE && fullArtClock < fadeOutStart) {
      mix = 1;
    } else if (fullArtClock >= fadeOutStart && fullArtClock < fadeOutStart + FULLART_FADE) {
      mix = 1 - smoothStep((fullArtClock - fadeOutStart) / FULLART_FADE);
    }

    fullArtMix = mix;
    fullArtUniforms.uFullArtMix.value = mix;
  }

  function loadTexture(url) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        url,
        (texture) => {
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  function setSideTexture(side, texture) {
    if (!texture) return;
    if (side === 'front') {
      if (frontTexture && frontTexture !== texture) {
        frontTexture.dispose();
        if (frontTexture === placeholderFront) placeholderFront = null;
      }
      frontTexture = texture;
      matFront.map = texture;
      matFront.needsUpdate = true;
    } else {
      if (backTexture && backTexture !== texture) {
        backTexture.dispose();
        if (backTexture === placeholderBack) placeholderBack = null;
      }
      backTexture = texture;
      matBack.map = texture;
      matBack.needsUpdate = true;
    }
  }

  function ensurePlaceholder(side) {
    if (!matFront || !matBack) return;

    if (side === 'front' && !frontTexture) {
      placeholderFront = placeholderFront || createPlaceholderTexture('CARDGRAM', 'FRONT');
      setSideTexture('front', placeholderFront);
    }

    if (side === 'back' && !backTexture) {
      placeholderBack = placeholderBack || createPlaceholderTexture('CARDGRAM', 'BACK');
      setSideTexture('back', placeholderBack);
    }
  }

  function createPlaceholderTexture(title, subtitle) {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 750, 1050);
    gradient.addColorStop(0, '#eafffb');
    gradient.addColorStop(0.55, '#a9e6f5');
    gradient.addColorStop(1, '#5fb0e2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 750, 1050);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 10;
    ctx.strokeRect(36, 36, 678, 978);

    ctx.fillStyle = 'rgba(7, 51, 63, 0.82)';
    ctx.textAlign = 'center';
    ctx.font = '800 64px "Segoe UI", sans-serif';
    ctx.fillText(title, 375, 510);

    ctx.font = '600 28px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(7, 51, 63, 0.55)';
    ctx.fillText(subtitle, 375, 562);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  async function loadCardImages(frontUrl, backUrl, fullArtUrl) {
    const jobs = [loadTexture(frontUrl), loadTexture(backUrl)];
    if (fullArtUrl) jobs.push(loadTexture(fullArtUrl));

    const results = await Promise.allSettled(jobs);
    const status = { front: false, back: false, fullArt: false };

    if (results[0].status === 'fulfilled') {
      setSideTexture('front', results[0].value);
      status.front = true;
    } else {
      ensurePlaceholder('front');
    }

    if (results[1].status === 'fulfilled') {
      setSideTexture('back', results[1].value);
      status.back = true;
    } else {
      ensurePlaceholder('back');
    }

    if (fullArtUrl && results[2] && results[2].status === 'fulfilled') {
      setFullArtTexture(results[2].value);
      status.fullArt = true;
    } else {
      clearFullArt();
    }

    return status;
  }

  async function loadCardImage(side, url) {
    try {
      const texture = await loadTexture(url);
      setSideTexture(side, texture);
      return true;
    } catch (error) {
      console.warn(`[CardGram] Texture ${side} failed`, error);
      ensurePlaceholder(side);
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     Cámara y poses
     ------------------------------------------------------------------------ */
  function getPose() {
    if (!ready) return null;
    return {
      pos: camera.position.toArray(),
      target: controls.target.toArray(),
      cardY: settings.posY
    };
  }

  function applyPose(pose) {
    if (!ready || !pose || !Array.isArray(pose.pos) || !Array.isArray(pose.target)) return null;

    transStartCam.copy(camera.position);
    transTargetCam.fromArray(pose.pos);
    transStartCtrl.copy(controls.target);
    transTargetCtrl.fromArray(pose.target);

    settings.posY = Number.isFinite(pose.cardY) ? pose.cardY : 0;
    transitionStart = performance.now();
    isTransitioning = true;

    const distance = transTargetCam.distanceTo(transTargetCtrl);
    settings.camDistance = clampNumber(distance, 2, 9);
    return { distance: settings.camDistance };
  }

  function centerCamera() {
    if (!ready) return;
    isTransitioning = false;
    camera.position.set(0, 0, settings.camDistance);
    controls.target.set(0, 0, 0);
    controls.update();
    cardGroup.rotation.set(0, 0, 0);
  }

  /* ------------------------------------------------------------------------
     Bucle de render
     ------------------------------------------------------------------------ */
  function animate() {
    animationId = requestAnimationFrame(animate);
    if (!ready) return;

    const delta = Math.min(clock.getDelta(), 0.05);
    floatTime += delta;

    if (isTransitioning) {
      const progress = Math.min((performance.now() - transitionStart) / transitionDuration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(transStartCam, transTargetCam, eased);
      controls.target.lerpVectors(transStartCtrl, transTargetCtrl, eased);
      if (progress >= 1) isTransitioning = false;
    }

    if (settings.speed > 0) {
      cardGroup.rotation.y += delta * 1.1 * settings.speed * settings.spinDir;
    }

    updateFullArtAnimation(delta);
    applyFloatMotion(floatTime);
    controls.update();

    if (!renderPaused && !contextLost && !document.hidden) {
      renderer.render(scene, camera);
    }
  }

  function applyFloatMotion(time) {
    const multiplier = settings.tilt;
    let rotX = 0;
    let rotZ = 0;
    let offsetY = 0;

    switch (settings.float) {
      case 'organic':
        rotX = Math.sin(time * 1.5) * 0.12 * multiplier;
        rotZ = Math.cos(time * 1.2) * 0.05 * multiplier;
        offsetY = Math.sin(time * 2) * 0.06;
        break;
      case 'subtle':
        rotX = Math.sin(time) * 0.04 * multiplier;
        rotZ = Math.cos(time * 0.8) * 0.02 * multiplier;
        offsetY = Math.sin(time * 1.2) * 0.025;
        break;
      case 'breathe':
        rotX = Math.sin(time * 1.2) * 0.06 * multiplier;
        rotZ = 0;
        offsetY = Math.sin(time * 1.6) * 0.09;
        break;
      case 'dramatic':
        rotX = Math.sin(time * 2.2) * 0.22 * multiplier;
        rotZ = Math.cos(time * 1.8) * 0.12 * multiplier;
        offsetY = Math.sin(time * 2.6) * 0.08;
        break;
      default:
        rotX = 0;
        rotZ = 0;
        offsetY = 0;
    }

    cardGroup.rotation.x = rotX;
    cardGroup.rotation.z = rotZ;
    cardGroup.position.y = settings.posY + offsetY;
  }

  /* ------------------------------------------------------------------------
     Tamaño del lienzo
     ------------------------------------------------------------------------ */
  function resize(options) {
    if (!ready) return null;

    const opts = options || {};
    const aspect = opts.aspect || '9:16';
    const scale = clampNumber(Number(opts.scale) || 100, 50, 100) / 100;
    const cinematic = Boolean(opts.cinematic);

    const computed = window.getComputedStyle(container);
    let availableWidth = container.clientWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight);
    let availableHeight = container.clientHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom);
    availableWidth = Math.max(160, availableWidth || 320);
    availableHeight = Math.max(160, availableHeight || 480);

    let width;
    let height;

    if (cinematic) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else if (aspect === 'fill') {
      width = availableWidth * scale;
      height = availableHeight * scale;
    } else {
      const ratio = ASPECTS[aspect] || ASPECTS['9:16'];
      const maxWidth = availableWidth * scale;
      const maxHeight = availableHeight * scale;
      if (maxWidth / maxHeight > ratio) {
        height = maxHeight;
        width = height * ratio;
      } else {
        width = maxWidth;
        height = width / ratio;
      }
    }

    width = Math.max(120, Math.round(width));
    height = Math.max(120, Math.round(height));

    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    return { width, height };
  }

  /* ------------------------------------------------------------------------
     Exportación
     ------------------------------------------------------------------------ */
  function createVideoRenderer(width, height) {
    if (!ready) throw new Error('Scene is not ready');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const exportRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    exportRenderer.setPixelRatio(1);
    exportRenderer.setSize(width, height, false);
    exportRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    exportRenderer.toneMappingExposure = renderer.toneMappingExposure;
    exportRenderer.outputEncoding = THREE.sRGBEncoding;
    exportRenderer.setClearColor(0x000000, 0);

    const exportCamera = new THREE.PerspectiveCamera(camera.fov, width / height, 0.1, 100);

    return {
      canvas,
      renderFrame() {
        exportCamera.position.copy(camera.position);
        exportCamera.quaternion.copy(camera.quaternion);
        exportRenderer.render(scene, exportCamera);
      },
      dispose() {
        exportRenderer.dispose();
      }
    };
  }

  function createSnapshot(width, height) {
    return new Promise((resolve, reject) => {
      if (!ready) {
        reject(new Error('Scene is not ready'));
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const snapshotRenderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        });
        snapshotRenderer.setPixelRatio(1);
        snapshotRenderer.setSize(width, height, false);
        snapshotRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        snapshotRenderer.toneMappingExposure = renderer.toneMappingExposure;
        snapshotRenderer.outputEncoding = THREE.sRGBEncoding;
        snapshotRenderer.setClearColor(0x000000, 0);

        const snapshotCamera = new THREE.PerspectiveCamera(camera.fov, width / height, 0.1, 100);
        snapshotCamera.position.copy(camera.position);
        snapshotCamera.quaternion.copy(camera.quaternion);
        snapshotRenderer.render(scene, snapshotCamera);

        canvas.toBlob((blob) => {
          snapshotRenderer.dispose();
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Contexto WebGL
     ------------------------------------------------------------------------ */
  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    window.dispatchEvent(new CustomEvent('cardgram:contextlost'));
  }

  function onContextRestored() {
    contextLost = false;
    window.dispatchEvent(new CustomEvent('cardgram:contextrestored'));
  }

  function setRenderPaused(paused) {
    const next = Boolean(paused);

    /* En el hub no se reanuda el bucle: el estudio está oculto. Evita que el
       final de una exportación vuelva a encender el render tras salir. */
    if (
      !next &&
      document.body &&
      document.body.dataset.view &&
      document.body.dataset.view !== 'studio'
    ) {
      return;
    }

    if (renderPaused === next) return;
    renderPaused = next;

    if (next) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
      return;
    }

    if (!ready || animationId) return;
    if (clock) clock.getDelta();
    animate();
  }

  function isReady() {
    return ready;
  }

  function isRenderPaused() {
    return renderPaused;
  }

  return {
    init,
    isReady,
    isRenderPaused,
    applySettings,
    applyPose,
    getPose,
    centerCamera,
    loadCardImages,
    loadCardImage,
    setFullArtEnabled,
    clearFullArt,
    hasFullArt: () => fullArtHasTexture,
    rebuildCard,
    resize,
    setRenderPaused,
    createVideoRenderer,
    createSnapshot
  };
})();
