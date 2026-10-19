/* Brasa Norte · demostración local sin backend.
   Los pedidos se guardan en localStorage SOLO para mostrar el flujo.
   NO USAR para pedidos, autenticación, pagos o datos personales reales. */
(() => {
  "use strict";
  const PREFIX = "brasanorte_demo_v1_";
  const CATEGORIES = [
    "Pollos a la brasa",
    "Hamburguesas",
    "Piqueos",
    "Bebidas",
  ];
  const DEFAULT_PRODUCTS = [
    {
      id: "p1",
      name: "1/4 de pollo clásico",
      category: "Pollos a la brasa",
      description:
        "Pollo doradito a la brasa, papas, ensalada y nuestras salsas.",
      price: 18.9,
      emoji: "🍗",
      tag: "El favorito",
      available: true,
      groups: [
        {
          id: "acom",
          name: "Elige tu acompañamiento",
          min: 1,
          max: 1,
          options: [
            { id: "papas", name: "Papas clásicas", price: 0 },
            { id: "grandes", name: "Papas grandes", price: 3 },
            { id: "chaufa", name: "Arroz chaufa", price: 4 },
          ],
        },
        {
          id: "extra",
          name: "Agrega algo más",
          min: 0,
          max: 3,
          options: [
            { id: "aji", name: "Ají extra", price: 1 },
            { id: "ensalada", name: "Ensalada extra", price: 3 },
            { id: "mayo", name: "Mayonesa extra", price: 1 },
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "1/2 pollo a la brasa",
      category: "Pollos a la brasa",
      description:
        "Para compartir o darte un gran gusto. Incluye papas y ensalada.",
      price: 34.9,
      emoji: "🍖",
      tag: "Para compartir",
      available: true,
      groups: [
        {
          id: "acom",
          name: "Elige tu acompañamiento",
          min: 1,
          max: 1,
          options: [
            { id: "papas", name: "Papas clásicas", price: 0 },
            { id: "grandes", name: "Papas grandes", price: 4 },
            { id: "chaufa", name: "Arroz chaufa", price: 5 },
          ],
        },
      ],
    },
    {
      id: "p3",
      name: "Pollo entero familiar",
      category: "Pollos a la brasa",
      description: "Un pollo entero con papas familiares, ensalada y cremas.",
      price: 65.9,
      emoji: "🍗",
      tag: "Familiar",
      available: true,
      groups: [
        {
          id: "extra",
          name: "Complementos",
          min: 0,
          max: 2,
          options: [
            { id: "papas", name: "Papas adicionales", price: 8 },
            { id: "gaseosa", name: "Gaseosa grande", price: 9 },
          ],
        },
      ],
    },
    {
      id: "p4",
      name: "Burger Brasa",
      category: "Hamburguesas",
      description: "Carne jugosa, queso, lechuga, tomate y salsa de la casa.",
      price: 21.9,
      emoji: "🍔",
      tag: "Recomendada",
      available: true,
      groups: [
        {
          id: "termino",
          name: "Término de la carne",
          min: 1,
          max: 1,
          options: [
            { id: "bien", name: "Bien cocida", price: 0 },
            { id: "medio", name: "Tres cuartos", price: 0 },
          ],
        },
        {
          id: "extras",
          name: "Extras",
          min: 0,
          max: 3,
          options: [
            { id: "queso", name: "Queso adicional", price: 3 },
            { id: "tocino", name: "Tocino", price: 4 },
            { id: "papas", name: "Papas fritas", price: 6 },
          ],
        },
      ],
    },
    {
      id: "p5",
      name: "Doble Burger",
      category: "Hamburguesas",
      description:
        "Doble carne, doble queso, cebolla caramelizada y salsa especial.",
      price: 29.9,
      emoji: "🍔",
      tag: "Más vendida",
      available: true,
      groups: [
        {
          id: "extras",
          name: "Agrega extras",
          min: 0,
          max: 2,
          options: [
            { id: "tocino", name: "Tocino crocante", price: 4 },
            { id: "papas", name: "Papas fritas", price: 6 },
          ],
        },
      ],
    },
    {
      id: "p6",
      name: "Salchipapas clásicas",
      category: "Piqueos",
      description:
        "Papas crujientes con salchichas, cremas y el toque de la casa.",
      price: 16.9,
      emoji: "🍟",
      tag: "Para picar",
      available: true,
      groups: [
        {
          id: "extras",
          name: "Complementos",
          min: 0,
          max: 2,
          options: [
            { id: "queso", name: "Queso derretido", price: 3 },
            { id: "huevo", name: "Huevo frito", price: 3 },
          ],
        },
      ],
    },
    {
      id: "p7",
      name: "Alitas BBQ",
      category: "Piqueos",
      description: "Seis alitas bañadas en salsa BBQ con papas crocantes.",
      price: 23.9,
      emoji: "🍗",
      tag: "Nuevo",
      available: true,
      groups: [
        {
          id: "salsa",
          name: "Salsa de las alitas",
          min: 1,
          max: 1,
          options: [
            { id: "bbq", name: "BBQ clásica", price: 0 },
            { id: "picante", name: "Picante", price: 0 },
          ],
        },
      ],
    },
    {
      id: "p8",
      name: "Chicha morada",
      category: "Bebidas",
      description: "Bebida refrescante de maíz morado. Vaso de 500 ml.",
      price: 7,
      emoji: "🥤",
      tag: "Casera",
      available: true,
      groups: [],
    },
    {
      id: "p9",
      name: "Gaseosa personal",
      category: "Bebidas",
      description: "Bebida personal fría para acompañar tu pedido.",
      price: 5,
      emoji: "🥤",
      tag: "",
      available: true,
      groups: [
        {
          id: "sabor",
          name: "Elige la bebida",
          min: 1,
          max: 1,
          options: [
            { id: "inca", name: "Inca Kola", price: 0 },
            { id: "coca", name: "Coca-Cola", price: 0 },
            { id: "sprite", name: "Sprite", price: 0 },
          ],
        },
      ],
    },
  ];
  const DEFAULT_SETTINGS = {
    name: "Brasa Norte",
    phone: "900000000",
    hours: "11:00 a 22:00",
    acceptsOrders: true,
    fees: { cercana: 5, media: 7, extendida: 9 },
  };
  const ZONE_NAMES = {
    cercana: "Zona cercana",
    media: "Zona intermedia",
    extendida: "Zona extendida",
  };
  const ORDER_LABELS = {
    pendiente: "Pendiente",
    confirmado: "Aceptado",
    preparando: "Preparando",
    listo: "Listo",
    en_camino: "En reparto",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };
  const NEXT_STATUS = {
    pendiente: "confirmado",
    confirmado: "preparando",
    preparando: "listo",
    listo: "en_camino",
    en_camino: "entregado",
  };
  const state = {
    products: read("products", DEFAULT_PRODUCTS),
    settings: read("settings", DEFAULT_SETTINGS),
    orders: read("orders", []),
    cart: read("cart", []),
    category: "Todas",
    query: "",
    view: "public",
    tab: "orders",
    currentProduct: null,
    choice: {},
    quantity: 1,
  };
  const $ = (id) => document.getElementById(id);
  const money = (n) => `S/${Number(n || 0).toFixed(2)}`;
  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const uid = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  function read(key, fallback) {
    try {
      let x = localStorage.getItem(PREFIX + key);
      return x === null ? structuredClone(fallback) : JSON.parse(x);
    } catch (e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }
  function save(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
    } catch (e) {
      toast("El navegador no permite guardar la demostración.");
    }
  }
  function notify() {
    save("products", state.products);
    save("settings", state.settings);
    save("orders", state.orders);
    save("cart", state.cart);
  }
  function toast(message) {
    let div = document.createElement("div");
    div.className = "toast";
    div.textContent = message;
    $("toastStack").appendChild(div);
    setTimeout(() => div.remove(), 3200);
  }
  function palette(cat) {
    return (
      {
        "Pollos a la brasa": ["#f7e8c8", "#efcf98"],
        Hamburguesas: ["#f3d9cc", "#f0bb9f"],
        Piqueos: ["#f8e5b9", "#f1ca83"],
        Bebidas: ["#dcece0", "#acdbc6"],
      }[cat] || ["#e9e5dc", "#c7ddcc"]
    );
  }
  function productMarkup(p) {
    const [from, to] = palette(p.category);
    return `<article class="product-card ${p.available ? "" : "sold-out"}"><div class="product-art" style="--from:${from};--to:${to}"><div class="product-art-emoji" aria-hidden="true">${safe(p.emoji)}</div>${p.tag ? `<span class="product-label">${safe(p.tag)}</span>` : ""}</div><div class="product-card-content"><div class="product-category">${safe(p.category)}</div><h3>${safe(p.name)}</h3><p>${safe(p.description)}</p><div class="product-card-bottom"><span class="product-price">${money(p.price)}</span><button type="button" class="add-btn" data-add="${safe(p.id)}" ${p.available ? "" : "disabled"}>${p.available ? "+ Agregar" : "Agotado"}</button></div></div></article>`;
  }
  function renderMenu() {
    let cats = ["Todas", ...CATEGORIES];
    $("categoryPills").innerHTML = cats
      .map(
        (c) =>
          `<button type="button" data-cat="${safe(c)}" class="${state.category === c ? "active" : ""}">${safe(c === "Todas" ? "✦ Todos" : c)}</button>`,
      )
      .join("");
    let products = state.products.filter(
      (p) =>
        (state.category === "Todas" || p.category === state.category) &&
        `${p.name} ${p.description} ${p.category}`
          .toLocaleLowerCase("es-PE")
          .includes(state.query.toLocaleLowerCase("es-PE")),
    );
    $("menuStatus").textContent =
      `${products.length} ${products.length === 1 ? "producto" : "productos"} en la carta`;
    $("productGrid").innerHTML = products.length
      ? products.map(productMarkup).join("")
      : '<div class="pill-no-results">No encontramos productos con esa búsqueda. Prueba otra categoría.</div>';
  }
  function totalQuantity() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }
  function getSelections(product, choice) {
    return (product.groups || []).flatMap((group) =>
      (choice[group.id] || [])
        .map((id) => {
          let o = group.options.find((x) => x.id === id);
          return o ? { name: o.name, price: o.price } : null;
        })
        .filter(Boolean),
    );
  }
  function itemUnit(item) {
    let p = state.products.find((x) => x.id === item.pid);
    if (!p) return 0;
    return (
      p.price + getSelections(p, item.choice).reduce((n, o) => n + o.price, 0)
    );
  }
  function cartSubtotal() {
    return state.cart.reduce(
      (total, item) => total + item.qty * itemUnit(item),
      0,
    );
  }
  function cleanCart() {
    state.cart = state.cart.filter((x) =>
      state.products.some((p) => p.id === x.pid),
    );
    save("cart", state.cart);
  }
  function renderCart() {
    cleanCart();
    $("cartCount").textContent = totalQuantity();
    $("drawerCount").textContent = `(${totalQuantity()})`;
    if (!state.cart.length) {
      $("cartContents").innerHTML =
        '<div class="empty-cart"><div class="empty-graphic">🛍️</div><h3>Tu carrito está vacío</h3><p>Explora nuestra carta y agrega algo rico para empezar.</p><button class="btn btn-outline" type="button" data-close="1">Explorar menú</button></div>';
      $("cartBottom").innerHTML = "";
      return;
    }
    $("cartContents").innerHTML = state.cart
      .map((item) => {
        let p = state.products.find((x) => x.id === item.pid);
        let selections = getSelections(p, item.choice);
        return `<div class="cart-item"><div class="cart-item-emoji" aria-hidden="true">${safe(p.emoji)}</div><div style="flex:1;min-width:0"><h4>${safe(p.name)}</h4>${selections.length ? `<small>${safe(selections.map((x) => x.name).join(" · "))}</small>` : ""}<div class="cart-item-price">${money(itemUnit(item) * item.qty)}</div><div class="cart-item-controls"><div class="qty-stepper"><button aria-label="Disminuir cantidad" data-cart-qty="${safe(item.lineId)}" data-delta="-1">−</button><span>${item.qty}</span><button aria-label="Aumentar cantidad" data-cart-qty="${safe(item.lineId)}" data-delta="1">+</button></div><button class="text-button" data-remove="${safe(item.lineId)}">Eliminar</button></div></div></div>`;
      })
      .join("");
    $("cartBottom").innerHTML =
      `<div class="totals-row"><span>Subtotal</span><strong>${money(cartSubtotal())}</strong></div><div class="totals-row"><span>Costo de delivery</span><span>Se calcula al finalizar</span></div><div class="totals-row grand"><span>Subtotal de productos</span><span>${money(cartSubtotal())}</span></div><button class="btn btn-primary full-width" id="checkoutButton" type="button" ${state.settings.acceptsOrders ? "" : "disabled"}>${state.settings.acceptsOrders ? "Continuar pedido →" : "Recepción de pedidos pausada"}</button><p class="microcopy">Sin pagos ni envíos reales · Demostración local</p>`;
  }
  function openDialog(id) {
    $("overlay").classList.remove("hidden");
    $("overlay").setAttribute("aria-hidden", "false");
    $(id).classList.remove("hidden");
    document.body.classList.add("lock-scroll");
  }
  function closeDialogs() {
    $("overlay").classList.add("hidden");
    $("overlay").setAttribute("aria-hidden", "true");
    for (let id of [
      "cartDrawer",
      "productModal",
      "checkoutModal",
      "confirmationModal",
    ])
      $(id).classList.add("hidden");
    document.body.classList.remove("lock-scroll");
  }
  function displayProduct(productId) {
    let p = state.products.find((x) => x.id === productId);
    if (!p || !p.available) return;
    state.currentProduct = p.id;
    state.choice = {};
    state.quantity = 1;
    for (let group of p.groups || [])
      state.choice[group.id] = group.min
        ? group.options.slice(0, group.min).map((o) => o.id)
        : [];
    let [from, to] = palette(p.category);
    $("productModalContent").innerHTML =
      `<div class="product-modal-art" style="--from:${from};--to:${to}">${safe(p.emoji)}</div><div class="modal-info"><div class="product-category">${safe(p.category)}</div><h2>${safe(p.name)}</h2><p>${safe(p.description)}</p></div><div id="productOptions"></div><div class="modal-qty"><strong>Cantidad</strong><div class="qty-stepper"><button id="minusModal" aria-label="Reducir cantidad" type="button">−</button><span id="modalQty">1</span><button id="plusModal" aria-label="Aumentar cantidad" type="button">+</button></div></div><div class="modal-foot"><button class="btn btn-primary full-width" id="addProductConfirm" type="button">Agregar al carrito · <span id="modalTotal">${money(p.price)}</span></button></div>`;
    renderOptions(p);
    openDialog("productModal");
  }
  function validChoice(p) {
    return (p.groups || []).every(
      (g) =>
        (state.choice[g.id] || []).length >= g.min &&
        (state.choice[g.id] || []).length <= g.max,
    );
  }
  function renderOptions(p) {
    $("productOptions").innerHTML = (p.groups || [])
      .map(
        (g) =>
          `<div class="option-group"><div class="option-head"><strong>${safe(g.name)}</strong><span>${g.min ? (g.min === 1 && g.max === 1 ? "Elige 1" : `Elige de ${g.min} a ${g.max}`) : `Opcional · máximo ${g.max}`}</span></div>${g.options
            .map((o) => {
              let selected = (state.choice[g.id] || []).includes(o.id);
              let type = g.max === 1 ? "radio" : "checkbox";
              return `<div class="option-row"><label><input type="${type}" name="opt-${safe(g.id)}" data-group="${safe(g.id)}" data-option="${safe(o.id)}" ${selected ? "checked" : ""}/><span>${safe(o.name)}</span></label><small>${o.price ? "+ " + money(o.price) : "Incluido"}</small></div>`;
            })
            .join("")}</div>`,
      )
      .join("");
    renderModalTotal(p);
  }
  function renderModalTotal(p) {
    let amount =
      p.price + getSelections(p, state.choice).reduce((x, o) => x + o.price, 0);
    $("modalQty").textContent = state.quantity;
    $("modalTotal").textContent = money(amount * state.quantity);
    $("addProductConfirm").disabled = !validChoice(p);
  }
  function addProduct() {
    let p = state.products.find((x) => x.id === state.currentProduct);
    if (!p || !p.available || !validChoice(p)) return;
    let choices = JSON.parse(JSON.stringify(state.choice));
    let match = state.cart.find(
      (item) =>
        item.pid === p.id &&
        JSON.stringify(item.choice) === JSON.stringify(choices),
    );
    if (match) match.qty += state.quantity;
    else
      state.cart.push({
        lineId: uid(),
        pid: p.id,
        qty: state.quantity,
        choice: choices,
      });
    save("cart", state.cart);
    renderCart();
    closeDialogs();
    toast("Producto agregado al carrito");
  }
  function shipping() {
    let pickup = $("checkoutForm").elements.fulfillment.value === "pickup";
    return pickup ? 0 : Number(state.settings.fees[$("zoneSelect").value] || 0);
  }
  function checkoutUpdate() {
    let pickup = $("checkoutForm").elements.fulfillment.value === "pickup";
    $("deliveryFields").classList.toggle("hidden", pickup);
    $("addressInput").required = !pickup;
    let zoneSel = $("zoneSelect");
    [...zoneSel.options].forEach((op) => {
      op.textContent = `${ZONE_NAMES[op.value]} — ${money(state.settings.fees[op.value])}`;
    });
    let subtotal = cartSubtotal(),
      fee = shipping();
    $("checkoutSummary").innerHTML =
      `<div class="totals-row"><span>Productos</span><strong>${money(subtotal)}</strong></div><div class="totals-row"><span>${pickup ? "Recojo en local" : "Delivery"}</span><strong>${money(fee)}</strong></div><div class="totals-row grand"><span>Total estimado</span><span>${money(subtotal + fee)}</span></div>`;
    $("checkoutTotal").textContent = money(subtotal + fee);
  }
  function openCheckout() {
    if (!state.cart.length || !state.settings.acceptsOrders) {
      toast("No se puede continuar con el pedido");
      return;
    }
    for (let item of state.cart) {
      const p = state.products.find((x) => x.id === item.pid);
      if (!p || !p.available) {
        toast(
          "Hay un producto agotado en tu carrito. Retíralo para continuar.",
        );
        return;
      }
    }
    closeDialogs();
    $("checkoutForm").reset();
    checkoutUpdate();
    openDialog("checkoutModal");
  }
  function finishCheckout(e) {
    e.preventDefault();
    if (!state.cart.length) return;
    if (!state.settings.acceptsOrders) {
      toast("El restaurante ha pausado los pedidos.");
      return;
    }
    if (!$("checkoutForm").reportValidity()) return;
    for (let item of state.cart) {
      let p = state.products.find((x) => x.id === item.pid);
      if (!p || !p.available) {
        toast("Un producto ya no está disponible; revisa tu carrito.");
        return;
      }
    }
    const form = new FormData($("checkoutForm")),
      mode = form.get("fulfillment"),
      sub = cartSubtotal(),
      fee = shipping();
    let order = {
      id: "BN-" + String(Date.now()).slice(-6),
      created: new Date().toISOString(),
      status: "pendiente",
      customer: String(form.get("customer")).trim().slice(0, 60),
      phone: String(form.get("phone")).trim().slice(0, 12),
      fulfillment: mode,
      zone: mode === "delivery" ? form.get("zone") : null,
      address:
        mode === "delivery"
          ? String(form.get("address")).trim().slice(0, 140)
          : "",
      payment: form.get("payment"),
      notes: String(form.get("notes")).slice(0, 220),
      subtotal: sub,
      delivery: fee,
      total: sub + fee,
      items: state.cart.map((i) => {
        let p = state.products.find((x) => x.id === i.pid);
        return {
          name: p.name,
          quantity: i.qty,
          unit: itemUnit(i),
          options: getSelections(p, i.choice),
        };
      }),
      history: [{ status: "pendiente", when: new Date().toISOString() }],
    };
    state.orders.unshift(order);
    state.cart = [];
    save("orders", state.orders);
    save("cart", state.cart);
    renderCart();
    closeDialogs();
    $("confirmationContent").innerHTML =
      `<div class="confirmation-icon">✓</div><div class="section-kicker">PEDIDO SIMULADO</div><h2>¡Pedido de prueba creado!</h2><p>Esta orden se guardó únicamente en tu navegador para que puedas probar el panel restaurante. <strong>No fue enviada ni recibida por un negocio real.</strong></p><div class="receipt-card"><div class="totals-row"><span>Referencia</span><strong>${safe(order.id)}</strong></div><div class="totals-row"><span>Estado</span><strong>Pendiente (simulado)</strong></div><div class="totals-row"><span>Entrega</span><strong>${mode === "delivery" ? "Delivery" : "Recojo"}</strong></div><div class="totals-row grand"><span>Total</span><strong>${money(order.total)}</strong></div></div><button class="btn btn-primary full-width" type="button" id="showAdminFromReceipt">Ver pedido en el panel restaurante →</button><button type="button" class="text-button" style="margin-top:14px" data-close="1">Volver a la carta</button>`;
    openDialog("confirmationModal");
    renderAdmin();
  }
  function enterAdmin() {
    closeDialogs();
    state.view = "admin";
    $("publicApp").classList.add("hidden");
    $("adminApp").classList.remove("hidden");
    $("adminLink").textContent = "Panel restaurante ↗";
    renderAdmin();
    window.scrollTo(0, 0);
  }
  function leaveAdmin() {
    closeDialogs();
    state.view = "public";
    $("adminApp").classList.add("hidden");
    $("publicApp").classList.remove("hidden");
    renderMenu();
    window.scrollTo(0, 0);
  }
  function fmtTime(date) {
    try {
      return new Date(date).toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }
  function renderAdmin() {
    if (state.view !== "admin") return;
    $("adminNav")
      .querySelectorAll("button")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.tab === state.tab),
      );
    const headers = {
      orders: [
        "Pedidos de prueba",
        "Revisa las órdenes que simulas desde la tienda.",
      ],
      products: [
        "Productos y carta",
        "Edita precios, productos y disponibilidad en este navegador.",
      ],
      settings: [
        "Configuración del local",
        "Personaliza los datos que aparecerán en la tienda de prueba.",
      ],
    };
    $("adminHeading").textContent = headers[state.tab][0];
    $("adminSubhead").textContent = headers[state.tab][1];
    if (state.tab === "orders") renderAdminOrders();
    if (state.tab === "products") renderAdminProducts();
    if (state.tab === "settings") renderAdminSettings();
  }
  function renderAdminOrders() {
    let active = state.orders.filter(
      (x) => !["entregado", "cancelado"].includes(x.status),
    );
    let pending = state.orders.filter((x) => x.status === "pendiente");
    let completed = state.orders.filter((x) => x.status === "entregado");
    let stats = [
      ["Pedidos recibidos", state.orders.length],
      ["Pendientes", pending.length],
      ["En proceso", active.length - pending.length],
      ["Entregados", completed.length],
    ];
    let cards = `<div class="stats-grid">${stats.map(([label, n]) => `<div class="stat-card"><span>${label}</span><strong>${n}</strong></div>`).join("")}</div><div class="micro-banner">🧪 Órdenes locales de demostración · No se sincronizan entre celulares ni representan ventas reales.</div>`;
    let list = state.orders
      .map((order) => {
        let next = NEXT_STATUS[order.status];
        let nextLabel = {
          confirmado: "Aceptar",
          preparando: "Preparar",
          listo: "Marcar listo",
          en_camino:
            order.fulfillment === "pickup"
              ? "Listo para recojo"
              : "Enviar a reparto",
          entregado: "Entregado",
        }[next];
        let nextActual =
          order.status === "listo" && order.fulfillment === "pickup"
            ? "entregado"
            : next;
        if (nextActual === "entregado") nextLabel = "Marcar entregado";
        return `<article class="order-card"><div class="order-top"><div><h4>${safe(order.id)} · ${safe(order.customer)}</h4><div class="order-sub">${fmtTime(order.created)} · ${order.fulfillment === "pickup" ? "Recojo en local" : "Delivery · " + safe(ZONE_NAMES[order.zone] || "")}</div></div><span class="state-pill ${safe(order.status)}">${safe(ORDER_LABELS[order.status] || order.status)}</span></div>${order.items.map((i) => `<div class="order-line">${i.quantity} × ${safe(i.name)} ${i.options.length ? "· " + safe(i.options.map((o) => o.name).join(", ")) : ""}</div>`).join("")}<div class="order-line">${order.fulfillment === "delivery" ? "Dirección de prueba: " + safe(order.address) : "Recojo en el local"} · Pago: ${order.payment === "efectivo" ? "efectivo" : "Yape / Plin manual"}</div>${order.notes ? `<div class="order-line">Nota: ${safe(order.notes)}</div>` : ""}<div class="order-bottom">${nextActual ? `<button data-status-id="${safe(order.id)}" data-status-to="${safe(nextActual)}" class="small-action">${safe(nextLabel)} →</button>` : ""}${["pendiente", "confirmado"].includes(order.status) ? `<button data-status-id="${safe(order.id)}" data-status-to="cancelado" class="small-action danger">Cancelar</button>` : ""}<span class="order-total">${money(order.total)}</span></div></article>`;
      })
      .join("");
    $("adminBody").innerHTML =
      cards +
      `<div class="admin-card"><div class="admin-card-header"><h3>Cola de pedidos</h3><small>${state.orders.length} registros</small></div>${state.orders.length ? `<div class="orders-list">${list}</div>` : `<div class="admin-empty"><div style="font-size:42px">🧾</div><b>Sin pedidos todavía</b><p>Crea un pedido ficticio desde la tienda para verlo aquí.</p><button class="btn btn-outline" data-go-store="1">Ir a la tienda →</button></div>`}</div>`;
  }
  function renderAdminProducts() {
    $("adminBody").innerHTML =
      `<div class="micro-banner">✦ Los cambios se guardan solo en este navegador. No hay base de datos ni usuarios reales.</div><div class="admin-card"><div class="admin-card-header"><div><h3>Carta actual</h3><small>${state.products.length} productos registrados</small></div><div class="table-tools"><button type="button" class="small-action" data-new-product="1">+ Producto</button></div></div>${state.products.map((p) => `<div class="product-admin-row"><div class="product-admin-emoji">${safe(p.emoji)}</div><div class="product-admin-label"><strong>${safe(p.name)}</strong><small>${safe(p.category)} · ${p.available ? "Disponible" : "Agotado"}</small></div><span class="product-admin-price">${money(p.price)}</span><button class="small-ghost" type="button" data-edit="${safe(p.id)}">Editar</button><button type="button" class="toggle ${p.available ? "on" : ""}" role="switch" aria-checked="${p.available}" aria-label="Disponibilidad de ${safe(p.name)}" data-toggle="${safe(p.id)}"></button></div>`).join("")}</div>`;
  }
  function renderAdminSettings() {
    let s = state.settings;
    $("adminBody").innerHTML =
      `<div class="micro-banner">🧪 La tienda permanece abierta en modo demo según el interruptor de recepción. Los horarios son informativos y no bloquean automáticamente pedidos.</div><div class="admin-card"><div class="admin-card-header"><h3>Información del restaurante</h3></div><form class="settings-form" id="settingsForm"><div class="settings-grid"><label class="field">Nombre comercial<input required name="name" maxlength="40" value="${safe(s.name)}" /></label><label class="field">WhatsApp de ejemplo<input required name="phone" inputmode="numeric" maxlength="12" value="${safe(s.phone)}" /></label></div><label class="field">Horario informativo<input name="hours" maxlength="50" required value="${safe(s.hours)}" /></label><label class="field"><span>Recepción de pedidos</span><select name="acceptsOrders"><option value="true" ${s.acceptsOrders ? "selected" : ""}>Habilitada</option><option value="false" ${s.acceptsOrders ? "" : "selected"}>Pausada</option></select></label><h3 style="font:800 17px var(--display);margin:8px 0">Tarifas de delivery (S/)</h3><div class="settings-grid">${Object.keys(
        ZONE_NAMES,
      )
        .map(
          (zone) =>
            `<label class="field">${ZONE_NAMES[zone]}<input required type="number" min="0" max="99" step="0.5" name="fee_${zone}" value="${safe(s.fees[zone])}" /></label>`,
        )
        .join(
          "",
        )}</div><button class="btn btn-primary" type="submit">Guardar cambios</button></form></div>`;
  }
  function openProductAdmin(id) {
    let p = state.products.find((x) => x.id === id),
      fresh = !p;
    if (fresh)
      p = {
        id: uid(),
        name: "",
        description: "",
        category: CATEGORIES[0],
        price: 20,
        emoji: "🍽️",
        tag: "",
        available: true,
        groups: [],
      };
    $("productModalContent").innerHTML =
      `<div class="form-dialog"><div style="display:flex;justify-content:space-between;align-items:center"><h2>${fresh ? "Nuevo producto" : "Editar producto"}</h2><button type="button" class="icon-button" data-close="1">✕</button></div><form id="productAdminForm"><label class="field">Nombre<input required name="name" minlength="3" maxlength="60" value="${safe(p.name)}" /></label><label class="field">Descripción<textarea name="description" rows="2" maxlength="230">${safe(p.description)}</textarea></label><div class="form-grid"><label class="field">Categoría<select name="category">${CATEGORIES.map((c) => `<option value="${safe(c)}" ${p.category === c ? "selected" : ""}>${safe(c)}</option>`).join("")}</select></label><label class="field">Precio (S/)<input type="number" required min="0.50" max="999.99" step="0.01" name="price" value="${safe(p.price)}" /></label></div><div class="form-grid"><label class="field">Ilustración<select name="emoji">${["🍗", "🍖", "🍔", "🍟", "🥤", "🍽️", "🥗", "🍕", "🧃", "🌭"].map((c) => `<option value="${c}" ${p.emoji === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="field">Etiqueta<input name="tag" maxlength="24" value="${safe(p.tag)}" /></label></div><div class="callout-soft">Los complementos de los productos precargados se conservan. El editor avanzado de combos se añadirá después.</div><div class="form-actions"><button type="button" class="btn btn-outline" data-close="1">Cancelar</button><button type="submit" class="btn btn-primary">Guardar producto</button></div></form></div>`;
    openDialog("productModal");
    $("productAdminForm").addEventListener("submit", (e) => {
      e.preventDefault();
      let fd = new FormData(e.target);
      let value = Number(fd.get("price"));
      if (!Number.isFinite(value) || value < 0.5 || value > 999.99) return;
      let updated = {
        ...p,
        name: String(fd.get("name")).trim(),
        description: String(fd.get("description")).trim(),
        category: fd.get("category"),
        price: Math.round(value * 100) / 100,
        emoji: fd.get("emoji"),
        tag: String(fd.get("tag")).trim(),
      };
      if (fresh) state.products.push(updated);
      else
        state.products = state.products.map((x) => (x.id === id ? updated : x));
      save("products", state.products);
      closeDialogs();
      renderAdminProducts();
      renderMenu();
      toast(fresh ? "Producto creado (demo)" : "Producto actualizado (demo)");
    });
  }
  function persistSettings(form) {
    const fd = new FormData(form);
    let phone = String(fd.get("phone")).trim();
    if (!/^\d{9,12}$/.test(phone)) {
      toast("Ingresa un número de ejemplo de 9 a 12 dígitos");
      return;
    }
    let fees = {};
    for (let zone of Object.keys(ZONE_NAMES)) {
      let price = Number(fd.get("fee_" + zone));
      if (!Number.isFinite(price) || price < 0 || price > 99) {
        toast("Revisa las tarifas de reparto");
        return;
      }
      fees[zone] = price;
    }
    state.settings = {
      name: String(fd.get("name")).trim().slice(0, 40),
      phone,
      hours: String(fd.get("hours")).trim().slice(0, 50),
      acceptsOrders: fd.get("acceptsOrders") === "true",
      fees,
    };
    save("settings", state.settings);
    updateBusinessInfo();
    renderAdminSettings();
    toast("Configuración guardada (demo)");
  }
  function updateBusinessInfo() {
    $("brandLink").setAttribute(
      "aria-label",
      `${state.settings.name}: ir al inicio`,
    );
    document.querySelector(".info-grid span:nth-child(2)").textContent =
      "🕒 Horario de demo: " + state.settings.hours;
    document.querySelector(".admin-title strong").textContent =
      state.settings.name;
  }
  function resetDemo() {
    if (
      !confirm(
        "Esto borrará todos los pedidos de prueba y restaurará el catálogo. ¿Continuar?",
      )
    )
      return;
    localStorage.removeItem(PREFIX + "orders");
    localStorage.removeItem(PREFIX + "products");
    localStorage.removeItem(PREFIX + "cart");
    localStorage.removeItem(PREFIX + "settings");
    location.reload();
  }
  // Event handlers
  $("searchInput").addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    renderMenu();
  });
  $("categoryPills").addEventListener("click", (e) => {
    let btn = e.target.closest("[data-cat]");
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderMenu();
  });
  $("productGrid").addEventListener("click", (e) => {
    let btn = e.target.closest("[data-add]");
    if (btn) displayProduct(btn.dataset.add);
  });
  $("cartButton").addEventListener("click", () => {
    renderCart();
    openDialog("cartDrawer");
  });
  $("heroCartBtn").addEventListener("click", () => {
    renderCart();
    openDialog("cartDrawer");
  });
  $("closeCart").addEventListener("click", closeDialogs);
  $("closeCheckout").addEventListener("click", closeDialogs);
  $("overlay").addEventListener("click", closeDialogs);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDialogs();
  });
  $("productModalContent").addEventListener("change", (e) => {
    let inp = e.target;
    if (!inp.dataset.group) return;
    let p = state.products.find((x) => x.id === state.currentProduct);
    if (!p) return;
    let g = p.groups.find((x) => x.id === inp.dataset.group),
      old = state.choice[g.id] || [];
    if (g.max === 1) {
      state.choice[g.id] = [inp.dataset.option];
    } else if (inp.checked) {
      if (old.length >= g.max) {
        inp.checked = false;
        toast(`Puedes seleccionar máximo ${g.max}`);
        return;
      }
      state.choice[g.id] = [...old, inp.dataset.option];
    } else state.choice[g.id] = old.filter((id) => id !== inp.dataset.option);
    renderOptions(p);
  });
  $("productModalContent").addEventListener("click", (e) => {
    let btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.close) {
      closeDialogs();
      return;
    }
    if (btn.id === "minusModal") {
      state.quantity = Math.max(1, state.quantity - 1);
      renderModalTotal(
        state.products.find((x) => x.id === state.currentProduct),
      );
    }
    if (btn.id === "plusModal") {
      state.quantity = Math.min(20, state.quantity + 1);
      renderModalTotal(
        state.products.find((x) => x.id === state.currentProduct),
      );
    }
    if (btn.id === "addProductConfirm") addProduct();
  });
  $("cartContents").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) {
      closeDialogs();
      document.querySelector("#menu").scrollIntoView();
      return;
    }
    const qty = e.target.closest("[data-cart-qty]");
    const rm = e.target.closest("[data-remove]");
    if (qty) {
      let item = state.cart.find((x) => x.lineId === qty.dataset.cartQty);
      if (item) {
        item.qty = Math.max(
          1,
          Math.min(20, item.qty + Number(qty.dataset.delta)),
        );
        save("cart", state.cart);
        renderCart();
      }
    } else if (rm) {
      state.cart = state.cart.filter((x) => x.lineId !== rm.dataset.remove);
      save("cart", state.cart);
      renderCart();
    }
  });
  $("cartBottom").addEventListener("click", (e) => {
    if (e.target.closest("#checkoutButton")) openCheckout();
  });
  $("checkoutForm").addEventListener("change", checkoutUpdate);
  $("checkoutForm").addEventListener("submit", finishCheckout);
  $("confirmationContent").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeDialogs();
    if (e.target.closest("#showAdminFromReceipt")) {
      state.tab = "orders";
      enterAdmin();
    }
  });
  $("mobileAdminLink").addEventListener("click", enterAdmin);
  $("howWorks").addEventListener("click", () =>
    document
      .querySelector(".cta-section")
      .scrollIntoView({ behavior: "smooth" }),
  );
  $("adminLink").addEventListener("click", enterAdmin);
  $("backToStore").addEventListener("click", leaveAdmin);
  $("adminNav").addEventListener("click", (e) => {
    let btn = e.target.closest("[data-tab]");
    if (btn) {
      state.tab = btn.dataset.tab;
      renderAdmin();
    }
  });
  $("adminBody").addEventListener("click", (e) => {
    let action = e.target.closest("[data-status-id]"),
      toggle = e.target.closest("[data-toggle]"),
      edit = e.target.closest("[data-edit]");
    if (action) {
      let order = state.orders.find((o) => o.id === action.dataset.statusId);
      if (!order) return;
      let next = action.dataset.statusTo;
      let allowed =
        NEXT_STATUS[order.status] === next ||
        (order.status === "listo" &&
          order.fulfillment === "pickup" &&
          next === "entregado") ||
        (["pendiente", "confirmado"].includes(order.status) &&
          next === "cancelado");
      if (!allowed) {
        toast("Cambio de estado no permitido");
        return;
      }
      order.status = next;
      order.history.push({ status: next, when: new Date().toISOString() });
      save("orders", state.orders);
      renderAdminOrders();
      toast("Estado actualizado en demo");
    } else if (toggle) {
      let p = state.products.find((x) => x.id === toggle.dataset.toggle);
      if (p) {
        p.available = !p.available;
        save("products", state.products);
        renderAdminProducts();
        renderMenu();
      }
    } else if (edit) {
      openProductAdmin(edit.dataset.edit);
    } else if (e.target.closest("[data-new-product]")) {
      openProductAdmin(null);
    } else if (e.target.closest("[data-go-store]")) leaveAdmin();
    else if (e.target.closest("[data-reset-demo]")) resetDemo();
  });
  $("adminBody").addEventListener("submit", (e) => {
    if (e.target.id === "settingsForm") {
      e.preventDefault();
      persistSettings(e.target);
    }
  });
  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    state.products = read("products", DEFAULT_PRODUCTS);
    state.settings = read("settings", DEFAULT_SETTINGS);
    state.orders = read("orders", []);
    state.cart = read("cart", []);
    renderMenu();
    renderCart();
    updateBusinessInfo();
    renderAdmin();
  });
  updateBusinessInfo();
  renderMenu();
  renderCart();
})();
