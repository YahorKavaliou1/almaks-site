/* ===== АлМакс — логика страницы ===== */

/*
 * Куда отправлять заявку.
 * Оставьте пустым, пока нет обработчика: форма просто покажет «Заявка отправлена».
 * Например, адрес формы Formspree ("https://formspree.io/f/xxxxxxx")
 * или свой скрипт на хостинге ("/send.php"). Данные уходят POST-запросом в JSON.
 */
var FORM_ENDPOINT = '';

/*
 * Капча Cloudflare Turnstile: впишите site key из панели Cloudflare (Turnstile → Add widget).
 * Пока пусто, капча не загружается. Токен уходит в заявке полем "cf-turnstile-response",
 * и сервер ОБЯЗАН проверить его секретным ключом (см. README), иначе капча ничего не защищает.
 */
var TURNSTILE_SITEKEY = '';

/* Каталог: чтобы добавить модель, допишите объект в этот список и положите фото в images/ (w и h — размеры фото в пикселях) */
var PRODUCTS = [
  { sku: 'DY-F007', name: 'Турбо, ветрозащитная, многоразовая', spec: '68 × 25,8 × 13 мм · 50 шт. в коробке', badge: 'Хит', img: 'images/dy-f007.webp', w: 1000, h: 533 },
  { sku: 'DY-818', name: 'Пьезо, классическая', spec: '78,4 × 22,9 × 11 мм · 50 шт. в коробке', badge: '', img: 'images/dy-818.webp', w: 1000, h: 633 },
  { sku: 'DY-818 ALMAX', name: 'Пьезо в блистере по 5 шт.', spec: 'Наша марка · готово для полки', badge: 'ALMAX', img: 'images/dy-818-almax.webp', w: 1000, h: 671 },
  { sku: 'DY-B010', name: 'BBQ, многоразовая', spec: 'ISO 22702 · 25 шт. в коробке', badge: '', img: 'images/dy-b010.webp', w: 1000, h: 696 }
];

(function () {
  'use strict';

  var ICON_PLUS = 'M12 5v14M5 12h14';
  var ICON_CHECK = 'm5 12 5 5 9-10';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bySku(sku) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].sku === sku) return PRODUCTS[i]; return null; }

  /* ---------- Слайдер решений ---------- */
  var track = $('track');
  var slides = track ? track.children : [];
  var total = slides.length;
  var current = 0;
  var dotsBox = $('dots');

  for (var d = 0; d < total; d++) {
    (function (i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.setAttribute('aria-label', slides[i].getAttribute('data-label') || ('Слайд ' + (i + 1)));
      b.addEventListener('click', function () { goTo(i); });
      dotsBox.appendChild(b);
    })(d);
  }

  function goTo(i) {
    current = (i + total) % total;
    track.style.transform = 'translateX(' + (-current * 100) + '%)';
    $('slidePos').textContent = (current + 1) + ' / ' + total;
    for (var k = 0; k < total; k++) {
      var on = k === current;
      slides[k].setAttribute('aria-hidden', on ? 'false' : 'true');
      var links = slides[k].querySelectorAll('a, button');
      for (var j = 0; j < links.length; j++) links[j].tabIndex = on ? 0 : -1;
      dotsBox.children[k].setAttribute('aria-current', on ? 'true' : 'false');
    }
  }

  document.querySelector('[data-slide="prev"]').addEventListener('click', function () { goTo(current - 1); });
  document.querySelector('[data-slide="next"]').addEventListener('click', function () { goTo(current + 1); });

  // свайп на телефоне
  var startX = null;
  track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    startX = null;
  });

  goTo(0);

  /* ---------- Заявка (корзина) ---------- */
  var cart = []; // [{ sku, qty }]

  function inCart(sku) { return cart.some(function (c) { return c.sku === sku; }); }

  function toggle(sku) {
    cart = inCart(sku) ? cart.filter(function (c) { return c.sku !== sku; }) : cart.concat([{ sku: sku, qty: '' }]);
    render();
  }

  function plural(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'модель';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'модели';
    return 'моделей';
  }

  /* ---------- Каталог ---------- */
  var grid = $('catalogGrid');
  grid.innerHTML = PRODUCTS.map(function (p) {
    return '<button class="card" type="button" data-sku="' + esc(p.sku) + '" aria-pressed="false">' +
      '<span class="card__media">' +
        (p.badge ? '<span class="card__badge">' + esc(p.badge) + '</span>' : '') +
        '<span class="card__check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICON_PLUS + '"/></svg></span>' +
        '<img src="' + esc(p.img) + '" width="' + p.w + '" height="' + p.h + '" alt="" loading="lazy">' +
      '</span>' +
      '<span class="card__text">' +
        '<span class="card__sku">' + esc(p.sku) + '</span>' +
        '<span class="card__name">' + esc(p.name) + '</span>' +
        '<span class="card__spec">' + esc(p.spec) + '</span>' +
      '</span>' +
      '<span class="card__add">+ В заявку</span>' +
    '</button>';
  }).join('');

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card) toggle(card.getAttribute('data-sku'));
  });

  function render() {
    // карточки
    var cards = grid.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var sku = cards[i].getAttribute('data-sku');
      var p = bySku(sku);
      var on = inCart(sku);
      cards[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      cards[i].setAttribute('aria-label', sku + ', ' + p.name + (on ? ' — в заявке, нажмите, чтобы убрать' : ' — нажмите, чтобы добавить в заявку'));
      cards[i].querySelector('.card__add').textContent = on ? '✓ В заявке' : '+ В заявку';
      cards[i].querySelector('.card__check path').setAttribute('d', on ? ICON_CHECK : ICON_PLUS);
    }

    // счётчик в шапке
    var n = cart.length;
    var badge = $('cartBadge');
    badge.textContent = n;
    badge.hidden = n === 0;
    $('cartSummary').textContent = n ? n + ' ' + plural(n) : '';

    // таблица заявки
    $('cartEmpty').hidden = n > 0;
    $('cartTable').hidden = n === 0;
    var body = $('cartBody');
    var known = {};
    for (var r = 0; r < body.rows.length; r++) known[body.rows[r].getAttribute('data-sku')] = true;
    body.innerHTML = cart.map(function (c) {
      var p = bySku(c.sku);
      return '<tr data-sku="' + esc(c.sku) + '"' + (known[c.sku] ? '' : ' class="row-in"') + '>' +
        '<td><span class="cart__model"><img src="' + esc(p.img) + '" alt=""><span><b>' + esc(p.sku) + '</b><small>' + esc(p.name) + '</small></span></span></td>' +
        '<td><label><span class="sr-only">Количество ' + esc(p.sku) + '</span><input type="number" min="0" step="50" inputmode="numeric" placeholder="1000" value="' + esc(c.qty) + '"></label></td>' +
        '<td style="text-align:center"><button type="button" class="cart__remove" aria-label="Удалить ' + esc(p.sku) + ' из заявки">×</button></td>' +
      '</tr>';
    }).join('');
  }

  $('cartBody').addEventListener('input', function (e) {
    if (e.target.tagName !== 'INPUT') return;
    var sku = e.target.closest('tr').getAttribute('data-sku');
    cart.forEach(function (c) { if (c.sku === sku) c.qty = e.target.value; });
  });
  $('cartBody').addEventListener('click', function (e) {
    if (!e.target.classList.contains('cart__remove')) return;
    var sku = e.target.closest('tr').getAttribute('data-sku');
    cart = cart.filter(function (c) { return c.sku !== sku; });
    render();
  });

  /* ---------- Капча ---------- */
  var captchaId = null;
  if (TURNSTILE_SITEKEY) {
    window.onTurnstileLoad = function () {
      captchaId = window.turnstile.render('#captcha', { sitekey: TURNSTILE_SITEKEY, language: 'ru' });
    };
    var cs = document.createElement('script');
    cs.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    cs.async = true;
    document.head.appendChild(cs);
  }
  function captchaToken() { return captchaId === null ? '' : window.turnstile.getResponse(captchaId) || ''; }
  function captchaReset() { if (captchaId !== null) window.turnstile.reset(captchaId); }

  /* ---------- Отправка ---------- */
  var form = $('orderForm');
  var submitBtn = $('submitBtn');
  var field = function (n) { return form.elements.namedItem(n); };

  // +375 29 123-45-67, 8 029 123 45 67, а также зарубежные номера: от 9 до 15 цифр
  function validPhone(v) {
    if (!/^[+\d\s()\-]+$/.test(v)) return false;
    var digits = v.replace(/\D/g, '');
    if (/^375/.test(digits)) return digits.length === 12;
    if (/^80/.test(digits)) return digits.length === 11;
    return digits.length >= 9 && digits.length <= 15;
  }

  function showError(msg, el) {
    $('formError').textContent = msg;
    $('formError').hidden = !msg;
    if (el) el.focus();
  }

  function setBusy(on) {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    submitBtn.textContent = on ? 'Отправляем…' : 'Отправить заявку';
  }

  ['name', 'phone', 'consent'].forEach(function (n) {
    field(n).addEventListener('input', function () { field(n).removeAttribute('aria-invalid'); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    var name = field('name').value.trim();
    var phone = field('phone').value.trim();
    var nameOk = !!name;
    var phoneOk = validPhone(phone);
    var consentOk = field('consent').checked;
    field('name').setAttribute('aria-invalid', nameOk ? 'false' : 'true');
    field('phone').setAttribute('aria-invalid', phoneOk ? 'false' : 'true');
    field('consent').setAttribute('aria-invalid', consentOk ? 'false' : 'true');

    if (!nameOk) return showError('Укажите имя, чтобы мы знали, как к вам обращаться', field('name'));
    if (!phoneOk) return showError(phone ? 'Проверьте номер телефона, например +375 29 123-45-67' : 'Укажите телефон, чтобы менеджер мог перезвонить', field('phone'));
    if (!consentOk) return showError('Чтобы отправить заявку, отметьте согласие на обработку персональных данных', field('consent'));

    var token = captchaToken();
    if (TURNSTILE_SITEKEY && !token) return showError('Подтвердите, что вы не робот, и отправьте заявку ещё раз');
    showError('');

    var done = function () {
      setBusy(false);
      form.hidden = true;
      $('sentBox').hidden = false;
    };

    // ловушка заполнена — это бот: делаем вид, что всё отправлено
    if (field('website').value) { done(); return; }

    var payload = {
      name: name,
      phone: phone,
      comment: field('comment').value.trim(),
      items: cart.map(function (c) { return { sku: c.sku, name: bySku(c.sku).name, qty: c.qty }; }),
      consent: true,
      website: '',
      'cf-turnstile-response': token
    };

    if (!FORM_ENDPOINT) { console.warn('FORM_ENDPOINT не задан, заявка никуда не отправлена:', payload); done(); return; }

    setBusy(true);
    fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) { if (!res.ok) throw new Error(res.status); captchaReset(); done(); })
      .catch(function () {
        setBusy(false);
        captchaReset();
        showError('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.');
      });
  });

  $('sendAgain').addEventListener('click', function () {
    cart = [];
    form.reset();
    ['name', 'phone', 'consent'].forEach(function (n) { field(n).removeAttribute('aria-invalid'); });
    render();
    $('sentBox').hidden = true;
    form.hidden = false;
  });

  render();
})();
