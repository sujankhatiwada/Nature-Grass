(function () {
  "use strict";

  const canvas = document.getElementById("grass-canvas");
  const ctx = canvas.getContext("2d");
  const hint = document.querySelector(".hint");
  const hintClose = document.querySelector(".hint-close");

  function hideHint() {
    if (hint) hint.classList.add("hidden");
  }

  if (hintClose) {
    hintClose.addEventListener("click", (e) => {
      e.stopPropagation();
      hideHint();
    });
    hintClose.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  let width = 0;
  let height = 0;
  let groundY = 0;
  let blades = [];
  let time = 0;

  const pointer = {
    x: -9999,
    y: -9999,
    active: false,
    strength: 0,
    targetStrength: 0,
  };

  const wind = {
    base: 0.35,
    gust: 0,
    gustTarget: 0,
    gustTimer: 0,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = height * 0.72;
    initBlades();
  }

  function initBlades() {
    blades = [];
    const density = Math.floor(width / 5);
    for (let i = 0; i < density; i++) {
      const x = (i / density) * width + (Math.random() - 0.5) * 8;
      const layer = Math.random();
      blades.push({
        x,
        baseY: groundY + (Math.random() - 0.5) * 6,
        height: 28 + layer * 55 + Math.random() * 25,
        width: 1.2 + layer * 1.8,
        phase: Math.random() * Math.PI * 2,
        stiffness: 0.04 + Math.random() * 0.03,
        damping: 0.88 + Math.random() * 0.06,
        bend: 0,
        bendVel: 0,
        windFactor: 0.6 + Math.random() * 0.8,
        hue: 95 + layer * 35 + Math.random() * 15,
        lightness: 28 + layer * 18 + Math.random() * 12,
        layer,
      });
    }
    blades.sort((a, b) => a.layer - b.layer);
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, "#5ba3c9");
    sky.addColorStop(0.45, "#8ecae6");
    sky.addColorStop(0.85, "#b8d4a8");
    sky.addColorStop(1, "#6b8f4e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, groundY + 40);

    const sunX = width * 0.78;
    const sunY = height * 0.18;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 70);
    sunGrad.addColorStop(0, "rgba(255, 248, 200, 0.95)");
    sunGrad.addColorStop(0.4, "rgba(255, 230, 150, 0.4)");
    sunGrad.addColorStop(1, "rgba(255, 230, 150, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    const earth = ctx.createLinearGradient(0, groundY - 20, 0, height);
    earth.addColorStop(0, "#4a6b35");
    earth.addColorStop(0.15, "#3d5a2c");
    earth.addColorStop(1, "#2a3d1f");
    ctx.fillStyle = earth;
    ctx.fillRect(0, groundY - 10, width, height - groundY + 10);
  }

  function updateWind(dt) {
    wind.gustTimer -= dt;
    if (wind.gustTimer <= 0) {
      wind.gustTarget = (Math.random() - 0.5) * 0.5;
      wind.gustTimer = 1.5 + Math.random() * 3;
    }
    wind.gust += (wind.gustTarget - wind.gust) * 0.02;
  }

  function getWindForce(blade, t) {
    const primary = Math.sin(t * 0.0012 + blade.phase) * wind.base;
    const secondary = Math.sin(t * 0.0028 + blade.phase * 1.7) * 0.18;
    const ripple = Math.sin(t * 0.004 + blade.x * 0.02) * 0.12;
    return (primary + secondary + ripple + wind.gust) * blade.windFactor;
  }

  function getTouchForce(blade) {
    if (pointer.strength < 0.01) return 0;

    const dx = blade.x - pointer.x;
    const dy = blade.baseY - pointer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = 140 + pointer.strength * 80;

    if (dist > radius) return 0;

    const falloff = 1 - dist / radius;
    const smooth = falloff * falloff * (3 - 2 * falloff);

    const pushDir = dx > 0 ? 1 : -1;
    const bendAmount = smooth * pointer.strength * 1.4;

    return pushDir * bendAmount + (pointer.x - blade.x) * 0.004 * smooth;
  }

  function updateBlade(blade, t) {
    const windForce = getWindForce(blade, t);
    const touchForce = getTouchForce(blade);
    const target = windForce + touchForce;

    const accel = (target - blade.bend) * blade.stiffness;
    blade.bendVel += accel;
    blade.bendVel *= blade.damping;
    blade.bend += blade.bendVel;
  }

  function drawBlade(blade) {
    const bend = blade.bend;
    const h = blade.height;
    const x = blade.x;
    const y = blade.baseY;

    const tipX = x + Math.sin(bend) * h * 0.85;
    const tipY = y - Math.cos(bend * 0.3) * h;

    const ctrlX = x + Math.sin(bend * 0.6) * h * 0.45;
    const ctrlY = y - h * 0.55;

    const grad = ctx.createLinearGradient(x, y, tipX, tipY);
    grad.addColorStop(0, `hsl(${blade.hue}, 42%, ${blade.lightness * 0.7}%)`);
    grad.addColorStop(0.5, `hsl(${blade.hue + 8}, 48%, ${blade.lightness}%)`);
    grad.addColorStop(1, `hsl(${blade.hue + 15}, 38%, ${blade.lightness + 18}%)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = blade.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    if (blade.layer > 0.6 && blade.width > 2) {
      ctx.strokeStyle = `hsla(${blade.hue + 20}, 50%, 55%, 0.25)`;
      ctx.lineWidth = blade.width * 0.35;
      ctx.beginPath();
      ctx.moveTo(ctrlX, ctrlY);
      ctx.lineTo(tipX - 2, tipY + 4);
      ctx.stroke();
    }
  }

  function drawTouchRipple() {
    if (pointer.strength < 0.05) return;

    const r = 30 + pointer.strength * 100;
    const g = ctx.createRadialGradient(
      pointer.x,
      pointer.y,
      0,
      pointer.x,
      pointer.y,
      r
    );
    g.addColorStop(0, `rgba(120, 180, 80, ${pointer.strength * 0.15})`);
    g.addColorStop(1, "rgba(120, 180, 80, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(pointer.x, pointer.y, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function setPointer(clientX, clientY, active) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = active;
    pointer.targetStrength = active ? 1 : 0;

    if (active) hideHint();
  }

  function onPointerDown(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    setPointer(e.clientX, e.clientY, true);
  }

  function onPointerMove(e) {
    if (!pointer.active) return;
    setPointer(e.clientX, e.clientY, true);
  }

  function onPointerUp(e) {
    pointer.active = false;
    pointer.targetStrength = 0;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  let lastTime = 0;

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    time = now;

    updateWind(dt);

    const strengthSpeed = pointer.active ? 0.18 : 0.06;
    pointer.strength +=
      (pointer.targetStrength - pointer.strength) * strengthSpeed;
    if (!pointer.active && pointer.strength < 0.01) {
      pointer.strength = 0;
    }

    drawSky();
    drawGround();

    for (let i = 0; i < blades.length; i++) {
      updateBlade(blades[i], time);
    }

    drawTouchRipple();

    for (let i = 0; i < blades.length; i++) {
      drawBlade(blades[i]);
    }

    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(loop);
})();
