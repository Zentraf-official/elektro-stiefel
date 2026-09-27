/* ═══════════════════════════════════════════════════════════════════════
   ELEKTRO STIEFEL GMBH — Bewegung der Website
   Motor propio, sin librerías externas: nada que pueda no cargar.
   1 · Ankunft: die Korriente kommt an (Ladeanimation mit Kabel und Puls)
   2 · Zeilen erscheinen        4 · Vorhang zwischen den Seiten
   3 · Bewegung beim Scrollen   5 · Galerie, Formular, Kopfzeile
   Wenn JavaScript ausfällt, bleibt die Seite vollständig sichtbar (und das
   Kabel einfach schon gezeichnet, weil die Animation an `html.js` hängt).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var facil = 'cubic-bezier(.19,1,.22,1)';
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ══ 0 · EL CABLE Y EL PULSO AMARILLO ═══════════════════════════════
     Dos sitios: la pantalla de carga y la línea de abajo del hero. La
     longitud real del trazado se mide en el navegador (getTotalLength) y
     se pasa al CSS como `--largo`, para que el cable se dibuje entero.   */
  var cables = [];
  function prepararCable(svgSel, pathSel, pulsoSel) {
    var svg = $(svgSel), path = $(pathSel), pulso = $(pulsoSel);
    if (!svg || !path) return null;
    var largo = 2400;
    if (path.getTotalLength) {
      try { largo = Math.ceil(path.getTotalLength()) || 2400; } catch (e) { largo = 2400; }
    }
    path.style.setProperty('--largo', largo);
    var o = { path: path, pulso: pulso, largo: largo };
    moverPulso(o, 0);
    return o;
  }

  function moverPulso(o, t) {
    if (!o || !o.pulso || !o.path.getPointAtLength) return;
    var p;
    try { p = o.path.getPointAtLength(o.largo * Math.max(0, Math.min(1, t))); } catch (e) { return; }
    o.pulso.setAttribute('cx', p.x.toFixed(1));
    o.pulso.setAttribute('cy', p.y.toFixed(1));
  }

  /* El pulso del hero recorre el cable, descansa y vuelve. Sin librerías. */
  function latidoHero(o) {
    if (!o || quieto) return;
    var t0 = null, DUR = 2600, PAUSA = 1900, CICLO = DUR + PAUSA;
    function paso(ts) {
      if (t0 === null) t0 = ts;
      var e = (ts - t0) % CICLO;
      if (e <= DUR) {
        var p = e / DUR;
        moverPulso(o, p * p * (3 - 2 * p));      // arranca y frena suave
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  /* ══ 1 · TITULARES EN LÍNEAS (para que suban una a una) ══════════════ */
  /* Un <em> con varias palabras es UNA unidad y no se podría partir: en un
     móvil se saldría de la pantalla. Por eso primero se «explotan» los
     elementos de dentro a razón de una palabra cada uno, conservando la
     etiqueta (así el color del <em> no se pierde). */
  function explotarInline(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 1 || n.tagName === 'BR') return;
      var palabras = (n.textContent || '').split(/\s+/).filter(Boolean);
      if (palabras.length < 2) return;
      var frag = doc.createDocumentFragment();
      palabras.forEach(function (p, i) {
        var clon = n.cloneNode(false);
        clon.textContent = p;
        frag.appendChild(clon);
        if (i < palabras.length - 1) frag.appendChild(doc.createTextNode(' '));
      });
      el.replaceChild(frag, n);
    });
  }

  function partirEnLineas(el) {
    var unidades = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var palabras = n.textContent.split(/\s+/).filter(Boolean);
        palabras.forEach(function (p, i) {
          var s = doc.createElement('span');
          s.className = 'palabra';
          s.textContent = p;
          el.insertBefore(s, n);
          if (i < palabras.length - 1) el.insertBefore(doc.createTextNode(' '), n);
          unidades.push(s);
        });
        el.removeChild(n);
      } else if (n.nodeType === 1 && n.tagName === 'BR') {
        unidades.push(n);
      } else if (n.nodeType === 1) {
        n.classList.add('palabra');
        unidades.push(n);
      }
    });

    /* Las líneas se calculan con los ANCHOS reales de cada palabra, igual que hace
       el navegador al repartir el texto (lección del 27.09: adivinar en qué línea
       cayó cada palabra falló dos veces). */
    var estilo = getComputedStyle(el);

    /* El ancho de un espacio se mide en una caja aparte, fuera de la página y sin
       poder partirse: dentro del propio titular el navegador lo parte si cae al
       final de una línea y la medida sale absurda (996 px en vez de 40). */
    var espacio = (function () {
      var caja = doc.createElement('span');
      caja.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre';
      caja.style.fontFamily = estilo.fontFamily;
      caja.style.fontSize = estilo.fontSize;
      caja.style.fontWeight = estilo.fontWeight;
      caja.style.fontStyle = estilo.fontStyle;
      caja.style.letterSpacing = estilo.letterSpacing;
      caja.style.wordSpacing = estilo.wordSpacing;
      caja.style.textTransform = estilo.textTransform;
      caja.textContent = 'a a';
      doc.body.appendChild(caja);
      var con = caja.getBoundingClientRect().width;
      caja.textContent = 'aa';
      var sin = caja.getBoundingClientRect().width;
      doc.body.removeChild(caja);
      var w = con - sin;
      return (isFinite(w) && w > 0) ? w : parseFloat(estilo.fontSize) * 0.26;
    })();

    function anchoUnidad(u) {
      var trozos = u.getClientRects ? u.getClientRects() : null;
      if (!trozos || !trozos.length) return u.getBoundingClientRect().width || 0;
      if (trozos.length === 1) return trozos[0].width;
      var suma = 0;
      for (var i = 0; i < trozos.length; i++) suma += trozos[i].width;
      return suma;
    }
    var disponible = el.clientWidth - parseFloat(estilo.paddingLeft || 0) - parseFloat(estilo.paddingRight || 0);
    if (!disponible || disponible < 40) disponible = el.clientWidth || 600;

    var lineas = [], actual = [], ancho = 0;
    unidades.forEach(function (u) {
      if (u.tagName === 'BR') {
        if (actual.length) { lineas.push({ items: actual }); actual = []; ancho = 0; }
        u.parentNode.removeChild(u);
        return;
      }
      var w = anchoUnidad(u);
      var suma = actual.length ? ancho + espacio + w : w;
      if (actual.length && suma > disponible + 1) {
        lineas.push({ items: actual });
        actual = [u]; ancho = w;
      } else {
        actual.push(u); ancho = suma;
      }
    });
    if (actual.length) lineas.push({ items: actual });

    lineas.forEach(function (l) {
      var mascara = doc.createElement('span');
      mascara.className = 'linea-mask';
      var dentro = doc.createElement('span');
      dentro.className = 'linea-int';
      el.appendChild(mascara);
      mascara.appendChild(dentro);
      l.items.forEach(function (u, i) {
        dentro.appendChild(u);
        if (i < l.items.length - 1) dentro.appendChild(doc.createTextNode(' '));
      });
    });

    // Fuera los espacios sueltos que quedan colgando: si no, al leer el texto
    // (Google, lectores de pantalla) las palabras salen pegadas.
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && !n.textContent.trim()) el.removeChild(n);
    });
    return $$('.linea-mask', el);
  }

  var titulares = $$('[data-lineas]').map(function (el) { return { el: el, lineas: [] }; });

  function dividirTitulares(conAnimacion) {
    if (quieto) return;
    titulares.forEach(function (t) {
      var yaVisto = t.el.dataset.revelado === '1';
      if (t.el.dataset.htmlOriginal) t.el.innerHTML = t.el.dataset.htmlOriginal;
      else t.el.dataset.htmlOriginal = t.el.innerHTML;
      explotarInline(t.el);
      t.lineas = partirEnLineas(t.el);
      var enPantalla = t.el.getBoundingClientRect().top < window.innerHeight * 0.92;
      t.lineas.forEach(function (l) {
        if (yaVisto) { l.style.transitionDuration = '0s'; l.classList.add('dentro'); return; }
        if (!enPantalla && !t.el.closest('.hero')) { vigilar(l); return; }
        if (!conAnimacion) { l.style.transitionDuration = '0s'; l.classList.add('dentro'); }
      });
    });
  }

  var observador = null;
  if ('IntersectionObserver' in window) {
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('dentro');
        var titular = e.target.closest ? e.target.closest('[data-lineas]') : null;
        if (titular) titular.dataset.revelado = '1';
        observador.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  }

  function vigilar(el, retraso) {
    if (retraso) el.style.transitionDelay = retraso + 'ms';
    if (observador) observador.observe(el);
    else el.classList.add('dentro');
  }

  /* ══ 2 · ARRANQUE: LADEANIMATION + HERO ══════════════════════════════ */
  function mostrarTodo() {
    $$('[data-anim]').forEach(function (el) { el.classList.add('dentro'); });
    titulares.forEach(function (t) {
      t.el.dataset.revelado = '1';
      t.lineas.forEach(function (l) { l.style.transitionDuration = '0s'; l.classList.add('dentro'); });
    });
  }

  function animarHero() {
    var lineas = [];
    titulares.forEach(function (t) {
      if (t.el.closest('.hero')) { t.el.dataset.revelado = '1'; lineas = lineas.concat(t.lineas); }
    });
    lineas.forEach(function (l, i) {
      l.style.transitionDuration = '1.15s';
      l.style.transitionDelay = (120 + i * 100) + 'ms';
      l.classList.add('dentro');
    });
    $$('.hero [data-anim]').forEach(function (el, i) {
      el.style.transitionDelay = (380 + i * 110) + 'ms';
      el.classList.add('dentro');
    });
    var img = $('.hero__media img');
    if (img) {
      img.style.transform = 'translateY(22px) scale(.97)';
      img.style.transition = 'transform 2.4s ' + facil;
      requestAnimationFrame(function () { img.style.transform = 'none'; });
    }
  }

  /* La animación de entrada: el cable se dibuja, el pulso amarillo lo recorre y
     el personaje se «enchufa» cuando la corriente llega. */
  function carga() {
    var caja = $('#carga'), barra = $('#cargaBarra'), num = $('#cargaNum');
    var velo = $('#velo');
    if (!caja) { animarHero(); return; }
    caja.hidden = false;

    var o = prepararCable('#cargaSvg', '#cargaCable', '#cargaPulso');

    if (velo && html.classList.contains('viene-de-transicion')) {
      html.classList.remove('viene-de-transicion');
      caja.remove();
      $$('#velo span').forEach(function (c) { c.style.transform = 'translateY(0)'; });
      salirDelVelo(0);
      animarHero();
      return;
    }

    // Die Ladeanimation läuft nur einmal pro Besuch (die erste Seite).
    var yaVisto = false;
    try { yaVisto = sessionStorage.getItem('stiefel-visto') === '1'; } catch (e) {}
    if ((yaVisto || quieto) && !quieto) { caja.remove(); animarHero(); return; }
    if (quieto) { caja.remove(); animarHero(); return; }

    var t0 = performance.now(), DUR = 1050;
    function paso(t) {
      var p = Math.min(1, (t - t0) / DUR);
      var suave = 1 - Math.pow(1 - p, 3);
      var v = Math.round(suave * 100);
      if (num) num.textContent = v;
      if (barra) barra.style.width = v + '%';
      moverPulso(o, suave);
      if (p < 1) requestAnimationFrame(paso);
      else setTimeout(salir, 230);
    }

    function salir() {
      var caja2 = $('#cargaCaja') || $('.carga__caja');
      if (caja2) caja2.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }],
        { duration: 360, easing: 'ease-in', fill: 'forwards' });
      var a1 = caja.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
        { duration: 820, delay: 150, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      animarHero();
      a1.finished.catch(function () {}).then(function () {
        caja.remove();
        try { sessionStorage.setItem('stiefel-visto', '1'); } catch (e) {}
      });
    }

    var chispa = $('.carga__cable');
    if (chispa && chispa.animate) {
      chispa.animate([{ opacity: .3 }, { opacity: 1 }, { opacity: .3 }],
        { duration: 900, iterations: 1, easing: 'ease-in-out' });
    }
    requestAnimationFrame(paso);
  }

  /* ══ 3 · DER VORHANG ZWISCHEN DEN SEITEN ═════════════════════════════ */
  function salirDelVelo(retraso) {
    var capas = $$('#velo span');
    if (!capas.length) return;
    var max = 0;
    capas.forEach(function (c, i) {
      c.style.transform = 'translateY(0)';
      var a = c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
        { duration: 720, delay: retraso + i * 60, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      max = Math.max(max, retraso + i * 60 + 720);
    });
    setTimeout(function () {
      capas.forEach(function (c) {
        c.style.transform = 'translateY(101%)';
        c.getAnimations().forEach(function (a) { a.cancel(); });
      });
      var v = $('#velo'); if (v) v.classList.remove('activo');
    }, max + 60);
  }

  function entrarEnVelo(destino) {
    var capas = $$('#velo span');
    var v = $('#velo');
    if (v) v.classList.add('activo');
    capas.forEach(function (c, i) {
      c.animate([{ transform: 'translateY(101%)' }, { transform: 'translateY(0)' }],
        { duration: 560, delay: i * 55, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    });
    try { sessionStorage.setItem('stiefel-transicion', '1'); } catch (e) {}
    setTimeout(function () { location.href = destino; }, capas.length * 55 + 620);
  }

  function esInterna(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|https?:)/i.test(href)) return false;
    return /\.html(\?|#|$)/i.test(href);
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href.length > 1) {
      var destino = $(href);
      if (destino) {
        e.preventDefault();
        window.scrollTo({ top: destino.getBoundingClientRect().top + window.pageYOffset - 70,
                          behavior: quieto ? 'auto' : 'smooth' });
      }
      return;
    }
    if (!esInterna(a)) return;
    var actual = location.pathname.split('/').pop() || 'index.html';
    if (href.split('#')[0] === actual) return;
    if (quieto) return;
    e.preventDefault();
    entrarEnVelo(href);
  });

  /* ══ 4 · BEIM SCROLLEN: Kopfzeile, Fortschritt, Paralaje ═════════════ */
  var barra = $('#barra'), progreso = $('#progreso');
  var paralajes = $$('[data-paralaje]');
  var pidiendo = false;

  function alScroll() {
    var y = window.pageYOffset || doc.documentElement.scrollTop;
    if (barra) barra.classList.toggle('barra--solida', y > 40);
    if (progreso) {
      var alto = doc.documentElement.scrollHeight - window.innerHeight;
      progreso.style.width = (alto > 0 ? (y / alto) * 100 : 0) + '%';
    }
    paralajes.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      var centro = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.transform = 'translate3d(0,' + (centro * -34).toFixed(1) + 'px,0)';
    });
    pidiendo = false;
  }
  addEventListener('scroll', function () {
    if (!pidiendo) { pidiendo = true; requestAnimationFrame(alScroll); }
  }, { passive: true });

  /* ══ 5 · GALERÍA, MENÚ, JAHR, FORMULAR ═══════════════════════════════ */
  function galeria() {
    var luz = $('#luz');
    if (!luz) return;
    var img = $('#luzImg'), cap = $('#luzCap');
    function abrir(src, texto, alt) {
      img.src = src; img.alt = alt || texto || '';
      cap.textContent = texto || '';
      luz.hidden = false;
      luz.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
      img.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, easing: facil, fill: 'forwards' });
      doc.body.style.overflow = 'hidden';
    }
    function cerrar() {
      var a = luz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
      a.finished.catch(function () {}).then(function () {
        luz.hidden = true; doc.body.style.overflow = ''; img.src = '';
      });
    }
    $$('.foto-mini, .pieza').forEach(function (p) {
      p.addEventListener('click', function () {
        var i = p.querySelector('img');
        abrir(p.dataset.src, p.dataset.cap, i ? i.alt : '');
      });
    });
    var cerrarBtn = $('#luzCerrar');
    if (cerrarBtn) cerrarBtn.addEventListener('click', cerrar);
    luz.addEventListener('click', function (e) { if (e.target === luz) cerrar(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !luz.hidden) cerrar(); });
  }

  function menuActivo() {
    var pag = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
    if (pag === '') pag = 'index';
    $$('#menu a').forEach(function (a) {
      if (a.dataset.pagina === pag) a.classList.add('activo');
    });
  }

  function formulario() {
    var form = $('#form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var boton = form.querySelector('button[type=submit]');
      var original = boton.innerHTML;
      var datos = {};
      new FormData(form).forEach(function (v, k) { datos[k] = v; });
      if (!datos.nombre || !datos.email || !datos.mensaje) {
        boton.textContent = 'Bitte alle Felder ausfüllen';
        setTimeout(function () { boton.innerHTML = original; }, 3000);
        return;
      }
      datos.pagina = location.href;
      boton.textContent = 'Wird gesendet …';
      boton.disabled = true;
      fetch('https://studio.zentraf.ch/contacto/api/enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset();
        var ok = $('#formOk');
        if (ok) {
          ok.hidden = false;
          ok.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
            { duration: 500, easing: facil, fill: 'forwards' });
        }
        boton.textContent = 'Gesendet ✓';
      }).catch(function () {
        boton.textContent = 'Fehler — bitte anrufen';
        alert('Das hat leider nicht geklappt. Bitte rufen Sie uns an: 044 341 17 17');
      }).then(function () {
        setTimeout(function () { boton.innerHTML = original; boton.disabled = false; }, 4000);
      });
    });
  }

  /* ══ ANLAUF ══════════════════════════════════════════════════════════ */
  function arrancar() {
    window.__stiefelListo = true;
    menuActivo();
    galeria();
    formulario();
    var anio = $('#anio');
    if (anio) anio.textContent = new Date().getFullYear();

    var cableHero = prepararCable('#heroSvg', '#heroCable', '#heroPulso');
    cables.push(cableHero);
    latidoHero(cableHero);

    $$('[data-anim]').forEach(function (el) {
      if (el.closest('.hero')) return;
      var hermanos = el.parentElement ? Array.prototype.slice.call(el.parentElement.children).indexOf(el) : 0;
      vigilar(el, Math.min(hermanos, 3) * 90);
    });
    dividirTitulares(true);

    // Zweiter Durchgang: wenn die eigene Schrift wirklich da ist (sonst werden die
    // Zeilen mit der Ersatzschrift gemessen und der Text springt später um).
    if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
      doc.fonts.ready.then(function () {
        dividirTitulares(false);
        cables.forEach(function (c) { prepararCable('#heroSvg', '#heroCable', '#heroPulso'); });
        alScroll();
      });
    }
    addEventListener('load', function () { dividirTitulares(false); alScroll(); });

    if ('ResizeObserver' in window) {
      var anchoAnterior = new WeakMap(), tempoAncho = null;
      var obs = new ResizeObserver(function (entradas) {
        entradas.forEach(function (e) {
          var w = Math.round(e.contentRect.width);
          if (anchoAnterior.get(e.target) === w) return;
          anchoAnterior.set(e.target, w);
          clearTimeout(tempoAncho);
          tempoAncho = setTimeout(function () { dividirTitulares(false); }, 120);
        });
      });
      titulares.forEach(function (t) { obs.observe(t.el); });
    }

    var tempo = null;
    addEventListener('resize', function () {
      clearTimeout(tempo);
      tempo = setTimeout(function () { dividirTitulares(false); alScroll(); }, 260);
    });

    alScroll();
    carga();

    addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        $$('#velo span').forEach(function (c) { c.style.transform = 'translateY(101%)'; });
        var c = $('#carga'); if (c) c.remove();
        mostrarTodo();
      }
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
