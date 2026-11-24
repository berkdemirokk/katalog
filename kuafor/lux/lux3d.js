/* lux3d.js: one studio-lit object that turns on its own and follows a drag.
   Needs THREE r149 (UMD global) loaded before this file.
   Mount: <div data-lux3d="cup|bottle|key|mirror"><img class="lux3d__still" ...></div>
   The <img> stays as the picture when WebGL is refused; it is hidden once a frame is drawn. */
(function () {
  'use strict';
  var host = document.querySelector('[data-lux3d]');
  if (!host || !window.THREE) return;
  var T = window.THREE;
  var kind = host.getAttribute('data-lux3d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  var scene = new T.Scene();
  var cam = new T.PerspectiveCamera(24, 1, 0.1, 60);

  // A small photo studio made of light panels, baked into the reflection map.
  (function studio() {
    var s = new T.Scene();
    s.background = new T.Color(0x060606);
    function panel(w, h, d, x, y, z, power, tint) {
      var m = new T.Mesh(new T.BoxGeometry(w, h, d),
        new T.MeshBasicMaterial({ color: new T.Color(tint || 0xffffff).multiplyScalar(power) }));
      m.position.set(x, y, z); s.add(m);
    }
    panel(9, 0.2, 9, 0, 7, 0, 11);                 // overhead softbox
    panel(0.2, 7, 5, -7, 2.5, 2, 12, 0xfff0dc);    // warm key, left
    panel(0.2, 5, 3, 7, 2, -1, 5, 0xdfe9ff);       // cool fill, right
    panel(4, 6, 0.2, 2, 3, -8, 4);                 // back light
    panel(7, 1.2, 0.2, 0, 0.5, 8, 6);              // front strip
    panel(14, 0.2, 14, 0, -4, 0, 0.5, 0xbfb4a6);   // floor bounce
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(s, 0.035).texture;
    pm.dispose();
  })();
  var key = new T.DirectionalLight(0xfff4e6, 1.1); key.position.set(-3, 5, 4); scene.add(key);

  // ---------- materials ----------
  function ceramic(c) { return new T.MeshPhysicalMaterial({ color: c, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 0.6, side: T.DoubleSide }); }
  function metal(c, r) { return new T.MeshStandardMaterial({ color: c, metalness: 1, roughness: r == null ? 0.2 : r, side: T.DoubleSide }); }
  function matte(c, r) { return new T.MeshStandardMaterial({ color: c, roughness: r == null ? 0.7 : r, side: T.DoubleSide }); }
  function lathe(pts, seg) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 128); }
  function add(g, geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; }
  function canvasTex(size, draw) {
    var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }

  // ---------- objects (each about one unit tall, standing on y = 0) ----------
  var build = {
    cup: function () {
      var g = new T.Group(), body = ceramic(0xdccbad), brass = metal(0xb8894a, 0.26);
      add(g, lathe([[0, 0], [0.30, 0], [0.56, 0.05], [0.625, 0.088], [0.605, 0.104], [0.52, 0.064], [0.30, 0.03], [0, 0.03]]), body);
      var cup = new T.Group(); cup.position.y = 0.03; g.add(cup);
      add(cup, lathe([[0, 0.02], [0.19, 0.02], [0.20, 0], [0.215, 0], [0.225, 0.05], [0.30, 0.26], [0.345, 0.45], [0.362, 0.62],
        [0.365, 0.665], [0.352, 0.68], [0.338, 0.665], [0.326, 0.56], [0.29, 0.36], [0.22, 0.2], [0.12, 0.13], [0, 0.12]]), body);
      var crema = canvasTex(256, function (x, s) {
        var r = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        r.addColorStop(0, '#1c0d05'); r.addColorStop(0.7, '#2e170a'); r.addColorStop(0.92, '#7a4d22'); r.addColorStop(1, '#a87a42');
        x.fillStyle = r; x.fillRect(0, 0, s, s);
      });
      var top = add(cup, new T.CircleGeometry(0.327, 96), new T.MeshStandardMaterial({ map: crema, roughness: 0.45, envMapIntensity: 0.35 }), 0, 0.575, 0);
      top.rotation.x = -Math.PI / 2;
      var arc = Math.PI * 1.08;
      var handle = add(cup, new T.TorusGeometry(0.135, 0.03, 24, 64, arc), body, 0.345, 0.36, 0);
      handle.rotation.z = -arc / 2;
      var sh = add(g, new T.CylinderGeometry(0.009, 0.007, 0.34, 24), brass, 0.02, 0.083, 0.46); sh.rotation.z = Math.PI / 2;
      var bowl = add(g, new T.SphereGeometry(1, 32, 16), brass, -0.19, 0.08, 0.46); bowl.scale.set(0.062, 0.012, 0.04);
      return { group: g, tilt: 0.0, elev: 0.36, fill: 0.74, start: -0.6, exposure: 0.82 };
    },
    bottle: function () {
      var g = new T.Group();
      var glass = new T.MeshPhysicalMaterial({ color: 0x6e3208, roughness: 0.03, transparent: true, opacity: 0.46, clearcoat: 1,
        clearcoatRoughness: 0.03, envMapIntensity: 1.1, side: T.DoubleSide, depthWrite: false });
      add(g, lathe([[0, 0.02], [0.185, 0.02], [0.2, 0.035], [0.2, 0.5], [0.182, 0.585], [0.095, 0.66], [0.08, 0.675], [0.08, 0.72]]),
        new T.MeshStandardMaterial({ color: 0x9a4a0e, roughness: 0.35, envMapIntensity: 0.3, emissive: 0x3a1602, emissiveIntensity: 0.6 })); // the serum
      add(g, new T.CylinderGeometry(0.014, 0.01, 0.6, 24), matte(0xe8dcc8, 0.3), 0, 0.42, 0);         // pipette
      var body = add(g, lathe([[0, 0], [0.205, 0], [0.225, 0.02], [0.225, 0.6], [0.205, 0.66], [0.115, 0.725], [0.1, 0.745], [0.1, 0.82]]), glass);
      body.renderOrder = 2;
      var label = add(g, new T.CylinderGeometry(0.2275, 0.2275, 0.27, 128, 1, true), matte(0xefe6d6, 0.85), 0, 0.3, 0); label.renderOrder = 3;
      add(g, new T.CylinderGeometry(0.118, 0.118, 0.1, 96), metal(0xb98a4b, 0.24), 0, 0.865, 0);
      add(g, new T.TorusGeometry(0.118, 0.006, 12, 96), metal(0xb98a4b, 0.3), 0, 0.82, 0).rotation.x = Math.PI / 2;
      add(g, lathe([[0, 0], [0.078, 0], [0.086, 0.015], [0.089, 0.04], [0.088, 0.12], [0.084, 0.17], [0.074, 0.205], [0.055, 0.232], [0.03, 0.246], [0, 0.25]]), new T.MeshStandardMaterial({ color: 0x14110e, roughness: 0.85, envMapIntensity: 0.25 }), 0, 0.915, 0);
      return { group: g, tilt: 0.0, elev: 0.12, fill: 0.82, start: 0.5, exposure: 0.85 };
    },
    key: function () {
      var g = new T.Group(), brass = metal(0xb48a3c, 0.3), steel = metal(0xcfd3d6, 0.18);
      add(g, new T.CylinderGeometry(0.03, 0.03, 0.62, 48), brass, 0, 0.31, 0);
      add(g, new T.SphereGeometry(0.036, 32, 16), brass, 0, 0, 0);
      add(g, new T.BoxGeometry(0.17, 0.045, 0.04), brass, 0.095, 0.045, 0);
      add(g, new T.BoxGeometry(0.11, 0.05, 0.04), brass, 0.065, 0.105, 0);
      add(g, new T.BoxGeometry(0.17, 0.04, 0.04), brass, 0.095, 0.165, 0);
      [0.5, 0.56].forEach(function (y) { add(g, new T.TorusGeometry(0.04, 0.014, 16, 48), brass, 0, y, 0).rotation.x = Math.PI / 2; });
      add(g, new T.TorusGeometry(0.135, 0.032, 24, 96), brass, 0, 0.765, 0);
      add(g, new T.TorusGeometry(0.055, 0.016, 16, 64), brass, 0, 0.765, 0);
      var ring = add(g, new T.TorusGeometry(0.1, 0.009, 12, 96), steel, 0, 0.965, 0); ring.rotation.y = Math.PI / 2;
      var grain = canvasTex(256, function (x, s) {
        x.fillStyle = '#8b6a3e'; x.fillRect(0, 0, s, s);
        for (var i = 0; i < 70; i++) {
          x.strokeStyle = 'rgba(' + (60 + (i * 37) % 60) + ',' + (40 + (i * 13) % 30) + ',20,' + (0.18 + ((i * 7) % 10) / 40) + ')';
          x.lineWidth = 1 + (i % 3); x.beginPath();
          var y = (i * 53) % s; x.moveTo(0, y); x.bezierCurveTo(s / 3, y + 9, s * 2 / 3, y - 9, s, y + 4); x.stroke();
        }
      });
      var tag = add(g, new T.CylinderGeometry(0.2, 0.2, 0.035, 96), new T.MeshStandardMaterial({ map: grain, roughness: 0.6 }), 0.0, 1.235, 0.0);
      tag.rotation.x = Math.PI / 2;
      add(g, new T.TorusGeometry(0.03, 0.012, 12, 48), brass, 0, 1.085, 0.0);
      return { group: g, tilt: -0.42, elev: 0.1, fill: 0.86, start: 0.4 };
    },
    mirror: function () {
      var g = new T.Group(), steel = metal(0xd6dadd, 0.16), dark = metal(0x9da3a8, 0.34);
      add(g, new T.CylinderGeometry(0.03, 0.03, 0.56, 48), steel, 0, 0.28, 0);
      add(g, new T.SphereGeometry(0.03, 32, 16), steel, 0, 0, 0);
      for (var i = 0; i < 18; i++) add(g, new T.TorusGeometry(0.031, 0.0045, 10, 48), dark, 0, 0.1 + i * 0.019, 0).rotation.x = Math.PI / 2;
      add(g, new T.CylinderGeometry(0.012, 0.03, 0.08, 48), steel, 0, 0.6, 0);
      add(g, new T.CylinderGeometry(0.012, 0.012, 0.2, 32), steel, 0, 0.74, 0);
      var a = 0.62, len = 0.13, ex = -Math.sin(a) * len, ey = 0.84 + Math.cos(a) * len;
      var neck = add(g, new T.CylinderGeometry(0.0105, 0.012, len, 32), steel, ex / 2, 0.84 + Math.cos(a) * len / 2, 0); neck.rotation.z = a;
      add(g, new T.SphereGeometry(0.0125, 24, 12), steel, 0, 0.84, 0);
      var head = new T.Group(); head.position.set(ex, ey, 0); head.rotation.z = a + 0.95; g.add(head);
      add(head, new T.CylinderGeometry(0.092, 0.086, 0.018, 96), steel, 0, 0.085, 0).rotation.z = Math.PI / 2;
      var face = add(head, new T.CircleGeometry(0.08, 96), metal(0xf4f6f7, 0.02), 0.0095, 0.085, 0); face.rotation.y = Math.PI / 2;
      return { group: g, tilt: -0.5, elev: 0.14, fill: 0.86, start: 0.9 };
    }
  };
  if (!build[kind]) return;
  var made = build[kind]();

  // Centre the object on its own turning axis and scale it to one unit.
  var box = new T.Box3().setFromObject(made.group), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
  made.group.position.sub(mid);
  var lean = new T.Group(); lean.add(made.group); lean.rotation.z = made.tilt;
  var spin = new T.Group(); spin.add(lean); scene.add(spin);
  var unit = 1 / Math.max(size.x, size.y, size.z); spin.scale.setScalar(unit);
  spin.rotation.y = made.start;
  if (made.exposure) renderer.toneMappingExposure = made.exposure;

  // Soft contact shadow under the object.
  var foot = new T.Box3().setFromObject(spin).getSize(new T.Vector3());
  var sw = Math.min(1.0, Math.max(0.4, Math.max(foot.x, foot.z) * 1.5));
  var shadow = new T.Mesh(new T.PlaneGeometry(sw, sw), new T.MeshBasicMaterial({
    transparent: true, depthWrite: false, opacity: 0.55,
    map: canvasTex(256, function (x, s) {
      var r = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(0,0,0,.7)'); r.addColorStop(0.5, 'rgba(0,0,0,.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = r; x.fillRect(0, 0, s, s);
    })
  }));
  shadow.rotation.x = -Math.PI / 2;
  var lb = new T.Box3().setFromObject(spin); shadow.position.y = lb.min.y - 0.012; scene.add(shadow);

  var dist = (0.5 / made.fill) / Math.tan(T.MathUtils.degToRad(cam.fov / 2));
  cam.position.set(0, Math.sin(made.elev) * dist, Math.cos(made.elev) * dist); cam.lookAt(0, 0, 0);

  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  function resize() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw();
  }
  function draw() { renderer.render(scene, cam); if (!host.classList.contains('is-live')) host.classList.add('is-live'); }

  // Turn: a slow constant spin; a drag takes over, then eases back.
  var AUTO = 0.32, vel = AUTO, dragging = false, lastX = 0, lastT = 0, visible = true, raf = 0;
  function tick(t) {
    raf = 0;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    if (!dragging) { vel += ((reduce ? 0 : AUTO) - vel) * Math.min(1, dt * 1.6); spin.rotation.y += vel * dt; }
    draw();
    if (visible && !document.hidden && (!reduce || dragging || Math.abs(vel) > 0.01)) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

  host.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = e.clientX; host.classList.add('is-dragging');
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
    wake();
  });
  host.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    var d = dx / Math.max(200, host.clientWidth) * Math.PI * 1.6;
    spin.rotation.y += d; vel = d * 60;
  });
  function release() { dragging = false; host.classList.remove('is-dragging'); wake(); }
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { spin.rotation.y += (e.key === 'ArrowLeft' ? -1 : 1) * 0.3; wake(); e.preventDefault(); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); }, { threshold: 0.05 }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
  resize(); wake();
})();
