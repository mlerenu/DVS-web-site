/* =========================================================
   DIVISEEM - interacción del sitio
   - Menú móvil
   - Filtro de productos
   - Cotizador: arma el pedido y lo envía por WhatsApp o email
========================================================= */

const WHATSAPP_NUMBER = '5493543532037';
const EMAIL = 'comercial@diviseem.com.ar';
const STORAGE_KEY = 'diviseem-pedido';
const DEFAULT_QTY = 10;

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

function renderCards() {
    productCards.forEach((card) => {
        const inOrder = Boolean(findItem(card.dataset.id));
        const btn = card.querySelector('.product-add');
        card.classList.toggle('is-in-order', inOrder);
        btn.setAttribute('aria-pressed', String(inOrder));
        btn.textContent = inOrder ? '✓ En tu pedido' : 'Agregar al pedido';
    });
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
        li.querySelector('[name="cantidad"]').value = item.qty;
        li.querySelector('[name="logo"]').value = item.logo;
        li.querySelector('[name="detalle"]').value = item.detail;
        li.querySelector('.order-item-remove').setAttribute('aria-label', `Quitar ${product.name}`);
        itemsList.appendChild(li);
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

productCards.forEach((card) => {
    card.querySelector('.product-add').addEventListener('click', () => {
        const id = card.dataset.id;
        if (findItem(id)) removeItem(id);
        else addItem(id);
    });
});

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
        if (field.name === 'cantidad') item.qty = field.value === '' ? '' : Math.max(1, parseInt(field.value, 10) || 1);
        if (field.name === 'logo') item.logo = field.value;
        if (field.name === 'detalle') item.detail = field.value;
    } else if (field.name) {
        order.contact[field.name] = field.value;
    }
    saveOrder();
});

/* Armado del mensaje */

function validate() {
    const invalid = [];

    if (order.items.length === 0) {
        return 'Agregá al menos una prenda al pedido.';
    }

    itemsList.querySelectorAll('[name="cantidad"]').forEach((input) => {
        if (!(parseInt(input.value, 10) >= 1)) invalid.push(input);
    });

    ['empresa', 'nombre'].forEach((name) => {
        const field = form.elements[name];
        if (!field.value.trim()) invalid.push(field);
    });

    invalid.forEach((field) => field.classList.add('is-invalid'));
    if (invalid.length) {
        invalid[0].focus();
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

    return lines.join('\n');
}

function send(channel) {
    const error = validate();
    errorMsg.textContent = error;
    if (error) return;

    const text = buildMessage();
    const url = channel === 'whatsapp'
        ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
        : `mailto:${EMAIL}?subject=${encodeURIComponent(`Pedido de cotización - ${order.contact.empresa.trim()}`)}&body=${encodeURIComponent(text)}`;

    if (channel === 'whatsapp') window.open(url, '_blank', 'noopener');
    else window.location.href = url;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    send('whatsapp');
});

panel.querySelector('.order-mail').addEventListener('click', () => send('email'));

/* Inicio */
renderAll();
