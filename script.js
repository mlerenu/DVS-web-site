/* =========================================================
   DIVISEEM - interacción del sitio
   - Menú móvil
   - Filtro de productos
   - Cotizador: arma el pedido y lo envía por WhatsApp o email
========================================================= */

const WHATSAPP_NUMBER = '5493543532037';
const EMAIL = 'comercial@diviseem.com.ar';
const STORAGE_KEY = 'diviseem-pedido';
const MIN_QTY = 10; // pedido mínimo por prenda
const DEFAULT_QTY = MIN_QTY;

/* ---------- Menú móvil ---------- */

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

function setMenu(open) {
    navMenu.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}

navToggle.addEventListener('click', () => {
    setMenu(!navMenu.classList.contains('is-open'));
});

navMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) setMenu(false);
});

/* ---------- Filtro de productos ---------- */

const filterButtons = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');

filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        filterButtons.forEach((b) => {
            const active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', String(active));
        });

        productCards.forEach((card) => {
            const categories = card.dataset.category.split(' ');
            card.hidden = filter !== 'todos' && !categories.includes(filter);
        });
    });
});

/* ---------- Cotizador ---------- */

// Catálogo armado a partir de las tarjetas del HTML
const catalog = {};
productCards.forEach((card) => {
    const img = card.querySelector('img');
    catalog[card.dataset.id] = {
        name: card.querySelector('h3').textContent.trim(),
        image: img.getAttribute('src')
    };
});

const fab = document.querySelector('.order-fab');
const fabCount = fab.querySelector('.order-fab-count');
const panel = document.getElementById('order-panel');
const overlay = document.querySelector('.order-overlay');
const form = panel.querySelector('.order-form');
const itemsList = panel.querySelector('.order-items');
const emptyMsg = panel.querySelector('.order-empty');
const errorMsg = panel.querySelector('.order-error');
const itemTemplate = document.getElementById('order-item-template');

let lastFocus = null;

// Estado: { items: [{ id, qty, logo, detail }], contact: { empresa, ... } }
let order = loadOrder();

function loadOrder() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.items)) {
            saved.items = saved.items.filter((item) => catalog[item.id]);
            saved.contact = saved.contact || {};
            return saved;
        }
    } catch (e) {
        // Sin almacenamiento disponible: el pedido vive solo en esta visita
    }
    return { items: [], contact: {} };
}

function saveOrder() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch (e) {
        // Ignorado a propósito
    }
}

function findItem(id) {
    return order.items.find((item) => item.id === id);
}

function addItem(id) {
    if (!findItem(id)) {
        order.items.push({ id, qty: DEFAULT_QTY, logo: 'Bordado', detail: '' });
    }
    saveOrder();
    renderAll();
    fab.classList.remove('bump');
    void fab.offsetWidth; // reinicia la animación
    fab.classList.add('bump');
}

function removeItem(id) {
    order.items = order.items.filter((item) => item.id !== id);
    saveOrder();
    renderAll();
}

function setAddButton(btn, inOrder) {
    btn.setAttribute('aria-pressed', String(inOrder));
    btn.textContent = inOrder ? '✓ En tu pedido' : 'Agregar al pedido';
}

function renderCards() {
    productCards.forEach((card) => {
        const inOrder = Boolean(findItem(card.dataset.id));
        card.classList.toggle('is-in-order', inOrder);
        setAddButton(card.querySelector('.product-add'), inOrder);
    });
    if (modal.open) setAddButton(modalAdd, Boolean(findItem(modal.dataset.id)));
}

function renderFab() {
    const count = order.items.length;
    fab.hidden = count === 0;
    fabCount.textContent = count;
    fab.setAttribute('aria-label', `Ver mi pedido (${count} ${count === 1 ? 'prenda' : 'prendas'})`);
}

function renderItems() {
    itemsList.replaceChildren();
    emptyMsg.hidden = order.items.length > 0;

    order.items.forEach((item) => {
        const product = catalog[item.id];
        const li = itemTemplate.content.firstElementChild.cloneNode(true);
        li.dataset.id = item.id;
        li.querySelector('.order-item-img').src = product.image;
        li.querySelector('.order-item-name').textContent = product.name;
        const qtyInput = li.querySelector('[name="cantidad"]');
        qtyInput.value = item.qty;
        li.querySelector('[name="logo"]').value = item.logo;
        li.querySelector('[name="detalle"]').value = item.detail;
        li.querySelector('.order-item-remove').setAttribute('aria-label', `Quitar ${product.name}`);
        itemsList.appendChild(li);
        // Un pedido guardado de antes puede tener menos del mínimo: avisarlo al abrir
        if (item.qty !== '') checkMinQty(qtyInput);
    });
}

function renderContact() {
    Object.entries(order.contact).forEach(([name, value]) => {
        const field = form.elements[name];
        if (field) field.value = value;
    });
}

function renderAll() {
    renderCards();
    renderFab();
    if (!panel.hidden) renderItems();
}

/* Abrir / cerrar panel */

function openPanel() {
    lastFocus = document.activeElement;
    renderItems();
    renderContact();
    errorMsg.textContent = '';
    panel.hidden = false;
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    setMenu(false);
    const firstField = panel.querySelector('.order-item input, [name="empresa"]');
    (order.items.length ? firstField : panel.querySelector('.order-close')).focus();
}

function closePanel() {
    panel.hidden = true;
    overlay.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
}

document.querySelectorAll('[data-open-order]').forEach((el) => {
    el.addEventListener('click', (e) => {
        // Sin prendas, el botón del contacto lleva al catálogo
        if (el.tagName === 'A' && order.items.length === 0) return;
        e.preventDefault();
        openPanel();
    });
});

panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-order]')) closePanel();
});
overlay.addEventListener('click', closePanel);

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!panel.hidden) closePanel();
    else setMenu(false);
});

// Mantener el foco dentro del panel mientras está abierto
panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...panel.querySelectorAll('button, input, select, textarea, a[href]')]
        .filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
});

/* Botones de las tarjetas */

function toggleItem(id) {
    if (findItem(id)) removeItem(id);
    else addItem(id);
}

productCards.forEach((card) => {
    card.querySelector('.product-add').addEventListener('click', () => toggleItem(card.dataset.id));
    card.querySelector('.product-details').addEventListener('click', () => openModal(card));
    card.querySelector('.product-image img').addEventListener('click', () => openModal(card));
});

/* ---------- Ficha de producto ---------- */

function openModal(card) {
    const img = card.querySelector('.product-image img');
    const badge = card.querySelector('.product-badge');

    // Foto principal + fotos extra (data-gallery="ruta|texto alternativo|x,y,ancho; ...").
    // x,y,ancho es dónde va el logo en esa foto (en %); sin ese dato, la foto no admite logo.
    // Lo mismo para la foto principal con data-logo.
    const photos = [{ src: img.getAttribute('src'), alt: img.alt, spot: card.dataset.logo ? parseLogoSpot(card.dataset.logo) : null }];
    (card.dataset.gallery || '').split(';').filter((s) => s.trim()).forEach((entry) => {
        const [src, alt, spot] = entry.split('|');
        photos.push({ src: src.trim(), alt: (alt || '').trim(), spot: spot ? parseLogoSpot(spot) : null });
    });
    photos.forEach((photo, i) => { photo.key = `${card.dataset.id}:${i}`; });

    modal.dataset.id = card.dataset.id;
    modalTitle.textContent = card.querySelector('h3').textContent.trim();
    modalDescription.textContent = card.querySelector('.product-content p').textContent.trim();
    modalBadge.textContent = badge ? badge.textContent.trim() : '';
    modalBadge.hidden = !badge;
    modalSpecs.replaceChildren(...card.querySelector('.product-specs').cloneNode(true).children);
    modalAsk.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola DIVISEEM, quiero consultar por: ${modalTitle.textContent}`)}`;

    modalPhotos = photos;
    modalThumbs.replaceChildren();
    if (photos.length > 1) {
        photos.forEach((photo, i) => {
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'modal-thumb';
            thumb.setAttribute('aria-label', `Ver foto: ${photo.alt}`);
            const thumbImg = document.createElement('img');
            thumbImg.src = photo.src;
            thumbImg.alt = '';
            thumb.appendChild(thumbImg);
            thumb.addEventListener('click', () => goToPhoto(i));
            modalThumbs.appendChild(thumb);
        });
    }
    photoBox.classList.toggle('has-several', photos.length > 1);
    setExpanded(false);
    goToPhoto(0);

    setAddButton(modalAdd, Boolean(findItem(card.dataset.id)));
    modal.showModal();
    modal.scrollTop = 0;
    document.body.classList.add('no-scroll');
    renderLogo();
}

// Fotos de la ficha abierta y cuál se está viendo
let modalPhotos = [];
let photoIndex = 0;

function goToPhoto(i) {
    photoIndex = (i + modalPhotos.length) % modalPhotos.length; // las flechas dan la vuelta
    modalThumbs.querySelectorAll('.modal-thumb').forEach((t, j) => t.setAttribute('aria-pressed', String(j === photoIndex)));
    showPhoto(modalPhotos[photoIndex]);
}

function showPhoto(photo) {
    currentPhoto = photo;
    modalImage.src = photo.src;
    modalImage.alt = photo.alt;
    // Si la foto se recorta, que el recorte priorice la zona del logo
    modalImage.style.objectPosition = `50% ${photoFocusY()}%`;
    renderLogo();
}

/* Foto completa: la misma foto pasa a ocupar toda la pantalla sin recortes
   (el logo del cliente la acompaña porque vive dentro del mismo recuadro) */

function setExpanded(on) {
    photoBox.classList.toggle('is-expanded', on);
    modal.classList.toggle('photo-open', on);
    photoExpandBtn.setAttribute('aria-label', on ? 'Cerrar foto completa' : 'Ver foto completa');
    photoExpandBtn.setAttribute('aria-expanded', String(on));
    renderLogo();
}

function isExpanded() {
    return photoBox.classList.contains('is-expanded');
}

const modal = document.querySelector('.product-modal');
const modalImage = modal.querySelector('.modal-main-image img');
const modalThumbs = modal.querySelector('.modal-thumbs');
const modalTitle = modal.querySelector('#modal-title');
const modalDescription = modal.querySelector('.modal-description');
const modalBadge = modal.querySelector('.modal-badge');
const modalSpecs = modal.querySelector('.modal-specs');
const modalAdd = modal.querySelector('.modal-add');
const modalAsk = modal.querySelector('.modal-ask');

const photoBox = modal.querySelector('.modal-main-image');
const photoExpandBtn = photoBox.querySelector('.photo-expand');

modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
    setExpanded(false);
    document.body.classList.remove('no-scroll');
});

// Con la foto ampliada, Esc primero vuelve a la ficha en vez de cerrarla
modal.addEventListener('cancel', (e) => {
    if (!isExpanded()) return;
    e.preventDefault();
    setExpanded(false);
});

photoExpandBtn.addEventListener('click', () => setExpanded(!isExpanded()));
photoBox.querySelector('.photo-prev').addEventListener('click', () => goToPhoto(photoIndex - 1));
photoBox.querySelector('.photo-next').addEventListener('click', () => goToPhoto(photoIndex + 1));

// Tocar la foto la amplía (el logo tiene su propio arrastre y no cuenta como toque)
modalImage.addEventListener('click', () => { if (!isExpanded()) setExpanded(true); });

// Deslizar el dedo a los costados cambia de foto
let swipeStart = null;
photoBox.addEventListener('pointerdown', (e) => {
    if (e.target === modalImage && e.pointerType !== 'mouse') swipeStart = { x: e.clientX, y: e.clientY };
});
photoBox.addEventListener('pointerup', (e) => {
    if (!swipeStart || modalPhotos.length < 2) { swipeStart = null; return; }
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goToPhoto(photoIndex + (dx < 0 ? 1 : -1));
});
photoBox.addEventListener('pointercancel', () => { swipeStart = null; });

// Flechas del teclado con la foto ampliada
modal.addEventListener('keydown', (e) => {
    if (!isExpanded() || modalPhotos.length < 2) return;
    if (e.key === 'ArrowLeft') goToPhoto(photoIndex - 1);
    if (e.key === 'ArrowRight') goToPhoto(photoIndex + 1);
});

// Clic en el fondo oscuro cierra la ficha
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
});

modalAdd.addEventListener('click', () => toggleItem(modal.dataset.id));

/* ---------- Vista previa con el logo del cliente ---------- */

const LOGO_KEY = 'diviseem-logo';
const LOGO_MAX_SIZE = 600; // px, alcanza para la vista previa y pesa poco
const LOGO_MAX_FILE = 5 * 1024 * 1024;

const logoTool = modal.querySelector('.logo-tool');
const logoInput = logoTool.querySelector('input[type="file"]');
const logoUploadText = logoTool.querySelector('.logo-upload-text');
const logoError = logoTool.querySelector('.logo-tool-error');
const logoControls = logoTool.querySelector('.logo-controls');
const logoPosButtons = logoTool.querySelectorAll('[data-pos]');
const logoSizeInput = logoTool.querySelector('.logo-size input');
const logoBgCheck = logoTool.querySelector('[name="quitar-fondo"]');
const logoNoSpot = logoTool.querySelector('.logo-tool-nospot');
const logoOverlay = modal.querySelector('.logo-overlay');

// { original, clean, removeBg }: el logo tal cual y sin fondo blanco, en dataURL
let logo = loadLogo();
// Foto que se está viendo: { src, alt, spot, key }; spot = { x, y, w } en % de la foto, o null
let currentPhoto = null;
// Ajustes que hizo el cliente en cada foto de cada prenda: { [key]: { x, y, scale, pos } }
const logoPlacements = {};

function loadLogo() {
    try {
        const saved = JSON.parse(localStorage.getItem(LOGO_KEY));
        if (saved && saved.original && saved.clean) return saved;
    } catch (e) {
        // Sin almacenamiento: el logo dura solo esta visita
    }
    return null;
}

function saveLogo() {
    try {
        if (logo) localStorage.setItem(LOGO_KEY, JSON.stringify(logo));
        else localStorage.removeItem(LOGO_KEY);
    } catch (e) {
        // Si no entra en el almacenamiento, igual funciona mientras la página esté abierta
    }
}

function parseLogoSpot(value) {
    const [x, y, w] = (value || '50,30,14').split(',').map(Number);
    return { x, y, w };
}

// object-position vertical de la foto (en %): centra el recorte en la zona del logo
function photoFocusY() {
    return currentPhoto && currentPhoto.spot ? Math.max(0, currentPhoto.spot.y - 10) : 50;
}

// Posiciones rápidas: el centro de la foto y los dos lados, a la misma distancia que el punto calibrado
function presetX(spot, pos) {
    const offset = Math.abs(spot.x - 50) || 17;
    return { left: 50 - offset, center: 50, right: 50 + offset }[pos];
}

function defaultPos(spot) {
    if (spot.x > 50) return 'right';
    if (spot.x < 50) return 'left';
    return 'center';
}

function currentPlacement() {
    const { key, spot } = currentPhoto;
    if (!logoPlacements[key]) {
        logoPlacements[key] = { x: spot.x, y: spot.y, scale: 1, pos: defaultPos(spot) };
    }
    return logoPlacements[key];
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Dibuja el logo achicado, genera una versión sin fondo blanco y recorta los bordes vacíos
async function processLogo(file) {
    const img = await loadImage(await readFile(file));
    const ratio = Math.min(1, LOGO_MAX_SIZE / Math.max(img.naturalWidth || LOGO_MAX_SIZE, img.naturalHeight || LOGO_MAX_SIZE));
    const w = Math.max(1, Math.round((img.naturalWidth || LOGO_MAX_SIZE) * ratio));
    const h = Math.max(1, Math.round((img.naturalHeight || LOGO_MAX_SIZE) * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const original = ctx.getImageData(0, 0, w, h);
    const clean = new ImageData(new Uint8ClampedArray(original.data), w, h);
    const px = clean.data;
    for (let i = 0; i < px.length; i += 4) {
        const light = Math.min(px[i], px[i + 1], px[i + 2]);
        if (light > 235) px[i + 3] = 0;
        else if (light > 205) px[i + 3] = Math.round(px[i + 3] * (235 - light) / 30);
    }

    // Recorte según lo visible en la versión sin fondo
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (px[(y * w + x) * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) throw new Error('vacío');

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const toDataURL = (data) => {
        const out = document.createElement('canvas');
        out.width = cw;
        out.height = ch;
        out.getContext('2d').putImageData(data, -minX, -minY);
        return out.toDataURL('image/png');
    };

    return { original: toDataURL(original), clean: toDataURL(clean) };
}

logoInput.addEventListener('change', async () => {
    const file = logoInput.files[0];
    logoInput.value = '';
    if (!file) return;

    logoError.textContent = '';
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
        logoError.textContent = 'Subí una imagen PNG, JPG, WEBP o SVG.';
        return;
    }
    if (file.size > LOGO_MAX_FILE) {
        logoError.textContent = 'La imagen pesa más de 5 MB. Probá con una más liviana.';
        return;
    }

    logoUploadText.textContent = 'Cargando…';
    try {
        const result = await processLogo(file);
        logo = { ...result, removeBg: logoBgCheck.checked };
        saveLogo();
        renderLogo();
    } catch (e) {
        logoError.textContent = 'No pudimos leer esa imagen. Probá con otro archivo.';
    }
    logoUploadText.textContent = logo ? 'Cambiar logo' : 'Subir mi logo';
});

// Calcula dónde cae la foto dentro del recuadro.
// En la ficha: object-fit cover + object-position. Ampliada: contain y centrada.
function photoGeometry() {
    const cw = photoBox.clientWidth;
    const ch = photoBox.clientHeight;
    const nw = modalImage.naturalWidth;
    const nh = modalImage.naturalHeight;
    if (!cw || !nw) return null;
    const expanded = isExpanded();
    const s = expanded ? Math.min(cw / nw, ch / nh) : Math.max(cw / nw, ch / nh);
    const dw = nw * s;
    const dh = nh * s;
    const focusY = expanded ? 50 : photoFocusY();
    return { dw, dh, ox: (cw - dw) / 2, oy: (ch - dh) * focusY / 100 };
}

function renderLogo() {
    const spot = currentPhoto && currentPhoto.spot;
    logoControls.hidden = !logo || !spot;
    logoNoSpot.hidden = !logo || !currentPhoto || Boolean(spot);
    modal.classList.toggle('has-logo', Boolean(logo));
    logoUploadText.textContent = logo ? 'Cambiar logo' : 'Subir mi logo';
    if (!logo || !spot) {
        logoOverlay.hidden = true;
        return;
    }

    const place = currentPlacement();
    logoBgCheck.checked = logo.removeBg;
    logoSizeInput.value = Math.round(place.scale * 100);
    logoPosButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pos === place.pos)));

    const src = logo.removeBg ? logo.clean : logo.original;
    if (logoOverlay.getAttribute('src') !== src) logoOverlay.src = src;

    const geo = photoGeometry();
    if (!geo || !logoOverlay.naturalWidth) {
        logoOverlay.hidden = true;
        return;
    }

    // El ancho base sale de la foto; si el logo es alto y angosto, se limita por altura
    const aspect = logoOverlay.naturalHeight / logoOverlay.naturalWidth;
    let lw = geo.dw * (spot.w / 100) * place.scale;
    const maxH = lw * 0.8;
    if (lw * aspect > maxH) lw = maxH / aspect;
    const lh = lw * aspect;

    logoOverlay.style.width = `${lw}px`;
    logoOverlay.style.left = `${geo.ox + geo.dw * place.x / 100 - lw / 2}px`;
    logoOverlay.style.top = `${geo.oy + geo.dh * place.y / 100 - lh / 2}px`;
    logoOverlay.hidden = false;
}

// Re-dibujar cuando cargan las imágenes o cambia el tamaño de la ficha
modalImage.addEventListener('load', renderLogo);
logoOverlay.addEventListener('load', renderLogo);
new ResizeObserver(() => { if (modal.open) renderLogo(); }).observe(photoBox);

logoPosButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        const place = currentPlacement();
        place.pos = btn.dataset.pos;
        place.x = presetX(currentPhoto.spot, place.pos);
        place.y = currentPhoto.spot.y;
        renderLogo();
    });
});

logoSizeInput.addEventListener('input', () => {
    currentPlacement().scale = Number(logoSizeInput.value) / 100;
    renderLogo();
});

logoBgCheck.addEventListener('change', () => {
    logo.removeBg = logoBgCheck.checked;
    saveLogo();
    renderLogo();
});

logoTool.querySelector('.logo-remove').addEventListener('click', () => {
    logo = null;
    saveLogo();
    renderLogo();
    logoInput.focus();
});

/* Arrastrar el logo sobre la foto */

let drag = null;

logoOverlay.addEventListener('pointerdown', (e) => {
    const geo = photoGeometry();
    if (!geo) return;
    e.preventDefault();
    const place = currentPlacement();
    drag = { startX: e.clientX, startY: e.clientY, x: place.x, y: place.y, geo };
    logoOverlay.setPointerCapture(e.pointerId);
    logoOverlay.classList.add('is-dragging');
});

logoOverlay.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const place = currentPlacement();
    place.x = Math.min(95, Math.max(5, drag.x + (e.clientX - drag.startX) / drag.geo.dw * 100));
    place.y = Math.min(95, Math.max(5, drag.y + (e.clientY - drag.startY) / drag.geo.dh * 100));
    place.pos = null;
    renderLogo();
});

function endDrag() {
    drag = null;
    logoOverlay.classList.remove('is-dragging');
}

logoOverlay.addEventListener('pointerup', endDrag);
logoOverlay.addEventListener('pointercancel', endDrag);

/* Cambios dentro del panel */

itemsList.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.order-item-remove');
    if (!removeBtn) return;
    removeItem(removeBtn.closest('.order-item').dataset.id);
    const next = itemsList.querySelector('input') || panel.querySelector('[name="empresa"]');
    next.focus();
});

form.addEventListener('input', (e) => {
    const field = e.target;
    field.classList.remove('is-invalid');
    const li = field.closest('.order-item');

    if (li) {
        const item = findItem(li.dataset.id);
        if (field.name === 'cantidad') {
            item.qty = field.value === '' ? '' : Math.max(1, parseInt(field.value, 10) || 1);
            checkMinQty(field);
        }
        if (field.name === 'logo') item.logo = field.value;
        if (field.name === 'detalle') item.detail = field.value;
    } else if (field.name) {
        order.contact[field.name] = field.value;
    }
    saveOrder();
});

// Marca la cantidad y muestra el aviso de la prenda si no llega al mínimo
function checkMinQty(input) {
    const ok = parseInt(input.value, 10) >= MIN_QTY;
    input.classList.toggle('is-invalid', !ok);
    input.closest('.order-item').querySelector('.order-item-min').hidden = ok;
    return ok;
}

/* Armado del mensaje */

function validate() {
    if (order.items.length === 0) {
        return 'Agregá al menos una prenda al pedido.';
    }

    const lowQty = [...itemsList.querySelectorAll('[name="cantidad"]')].filter((input) => !checkMinQty(input));
    if (lowQty.length) {
        lowQty[0].focus();
        return `El pedido mínimo es de ${MIN_QTY} unidades por prenda.`;
    }

    const missing = ['empresa', 'nombre'].map((name) => form.elements[name]).filter((field) => !field.value.trim());
    missing.forEach((field) => field.classList.add('is-invalid'));
    if (missing.length) {
        missing[0].focus();
        return 'Completá los campos marcados para enviar el pedido.';
    }
    return '';
}

function buildMessage() {
    const c = order.contact;
    const lines = ['Hola DIVISEEM, quiero solicitar una cotización:', ''];

    order.items.forEach((item, i) => {
        let line = `${i + 1}. ${catalog[item.id].name} x ${item.qty} u. (logo: ${item.logo.toLowerCase()})`;
        if (item.detail.trim()) line += ` - ${item.detail.trim()}`;
        lines.push(line);
    });

    lines.push('', `Empresa: ${c.empresa.trim()}`, `Contacto: ${c.nombre.trim()}`);
    if (c.localidad && c.localidad.trim()) lines.push(`Localidad: ${c.localidad.trim()}`);
    if (c.comentarios && c.comentarios.trim()) lines.push('', `Comentarios: ${c.comentarios.trim()}`);
    if (logo) lines.push('', 'Tengo el logo listo, se los envío por este medio.');

    return lines.join('\n');
}

function send(channel) {
    const error = validate();
    errorMsg.textContent = error;
    if (error) return;

    const text = encodeURIComponent(buildMessage());
    const subject = encodeURIComponent(`Pedido de cotización - ${order.contact.empresa.trim()}`);

    if (channel === 'whatsapp') {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener');
    } else {
        // Abre la app de correo que la persona tenga configurada, con el pedido ya escrito
        window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${text}`;
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    send('whatsapp');
});

panel.querySelector('.order-email').addEventListener('click', () => send('email'));

/* Inicio */
renderAll();
