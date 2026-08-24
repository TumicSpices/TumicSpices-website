import confetti from 'canvas-confetti';

// ==========================================================================
// Configuration & Constants
// ==========================================================================
const WHATSAPP_NUMBER = '918604446189';
const CART_STORAGE_KEY = 'tumic_cart_items';
const ORDERS_STORAGE_KEY = 'tumic_orders';
const LAST_ORDER_KEY = 'tumic_last_order';

// Products Database Matrix with Verified Odoo 19 Product IDs
const PRODUCTS_DATA = {
  chilli: {
    key: 'chilli',
    name: 'Chilli Powder (लाल मिर्च)',
    shortName: 'Chilli Powder',
    hindi: 'लाल मिर्च पाउडर • High Capsaicin',
    category: 'essentials',
    image: '/assets/chilli-powder.jpg',
    odooId: 20, // Odoo Product: Chilli powder (ID: 20)
    variants: {
      '100g': { weight: '100g', price: 45, mrp: 60, discount: '25%', label: 'Trial' },
      '250g': { weight: '250g', price: 99, mrp: 130, discount: '24%', label: 'Popular' },
      '500g': { weight: '500g', price: 189, mrp: 250, discount: '24%', label: 'Family' },
      '1kg':  { weight: '1kg',  price: 349, mrp: 480, discount: '27%', label: 'Value' }
    }
  },
  garam: {
    key: 'garam',
    name: 'Garam Masala (शाही गरम मसाला)',
    shortName: 'Garam Masala (GRM)',
    hindi: 'शाही गरम मसाला • Whole Roasted',
    category: 'royal',
    image: '/assets/garam-masala.png',
    odooId: 19, // Odoo Product: Garam (ID: 19)
    variants: {
      '100g': { weight: '100g', price: 100, mrp: 140, discount: '28%', label: 'Aroma' },
      '250g': { weight: '250g', price: 229, mrp: 320, discount: '28%', label: 'Popular' },
      '500g': { weight: '500g', price: 439, mrp: 600, discount: '27%', label: "Chef's" },
      '1kg':  { weight: '1kg',  price: 799, mrp: 1100, discount: '27%', label: 'Gourmet' }
    }
  },
  biryani: {
    key: 'biryani',
    name: 'Biryani Masala (बिरयानी मसाला)',
    shortName: 'Biryani Masala',
    hindi: 'बिरयानी मसाला • Royal Dum Aroma',
    category: 'royal',
    image: '/assets/biryani-masala.png',
    odooId: 18, // Odoo Product: Biryani (ID: 18)
    variants: {
      '100g': { weight: '100g', price: 130, mrp: 175, discount: '26%', label: 'Dum' },
      '250g': { weight: '250g', price: 299, mrp: 400, discount: '25%', label: 'Popular' },
      '500g': { weight: '500g', price: 569, mrp: 750, discount: '24%', label: 'Feast' },
      '1kg':  { weight: '1kg',  price: 999, mrp: 1400, discount: '29%', label: 'Catering' }
    }
  },
  turmeric: {
    key: 'turmeric',
    name: 'Turmeric Powder (हल्दी)',
    shortName: 'Turmeric Powder (Haldi)',
    hindi: 'पिसी हल्दी • High Curcumin',
    category: 'essentials',
    image: '/assets/turmeric-powder.png',
    odooId: 16, // Odoo Product: Haldi (ID: 16)
    variants: {
      '100g': { weight: '100g', price: 35, mrp: 50, discount: '30%', label: 'Trial' },
      '250g': { weight: '250g', price: 79, mrp: 110, discount: '28%', label: 'Popular' },
      '500g': { weight: '500g', price: 149, mrp: 200, discount: '25%', label: 'Kitchen' },
      '1kg':  { weight: '1kg',  price: 279, mrp: 380, discount: '27%', label: 'Bulk' }
    }
  },
  coriander: {
    key: 'coriander',
    name: 'Coriander Powder (धनिया)',
    shortName: 'Coriander Powder (Dhaniya)',
    hindi: 'पिसी धनिया • Fresh Earthy Body',
    category: 'essentials',
    image: '/assets/coriander-powder.png',
    odooId: 17, // Odoo Product: Coriander powder (ID: 17)
    variants: {
      '100g': { weight: '100g', price: 35, mrp: 50, discount: '30%', label: 'Trial' },
      '250g': { weight: '250g', price: 79, mrp: 110, discount: '28%', label: 'Popular' },
      '500g': { weight: '500g', price: 149, mrp: 200, discount: '25%', label: 'Kitchen' },
      '1kg':  { weight: '1kg',  price: 279, mrp: 380, discount: '27%', label: 'Bulk' }
    }
  },
  aachar: {
    key: 'aachar',
    name: 'Aachar Masala (अचार मसाला)',
    shortName: 'Aachar Masala (Pickle/Sabzi)',
    hindi: 'अचार / सब्जी मसाला • Tangy Mustard',
    category: 'royal',
    image: '/assets/aachar-masala.png',
    odooId: 21, // Odoo Product: aachar/Sabzi masala (ID: 21)
    variants: {
      '100g': { weight: '100g', price: 35, mrp: 50, discount: '30%', label: 'Trial' },
      '250g': { weight: '250g', price: 79, mrp: 110, discount: '28%', label: 'Popular' },
      '500g': { weight: '500g', price: 149, mrp: 200, discount: '25%', label: 'Pickle' },
      '1kg':  { weight: '1kg',  price: 279, mrp: 380, discount: '27%', label: 'Bulk' }
    }
  }
};

// ==========================================================================
// 1. Toast Notification System
// ==========================================================================
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast-notify');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;

  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

// ==========================================================================
// 2. Shopping Cart Core Logic (Persistent LocalStorage)
// ==========================================================================
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {}
  updateCartBadge();
  renderCartUI();
}

function updateCartBadge() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count-badge');
  const drawerCount = document.getElementById('cart-drawer-count');
  
  if (badge) {
    badge.textContent = totalCount;
  }
  if (drawerCount) {
    drawerCount.textContent = `(${totalCount} item${totalCount === 1 ? '' : 's'})`;
  }
}

function addToCart(itemData) {
  const cart = getCart();
  const itemId = itemData.id || `${itemData.productKey}_${itemData.weight}`;
  const existingIndex = cart.findIndex(i => i.id === itemId);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += itemData.quantity;
    cart[existingIndex].price = itemData.price;
    cart[existingIndex].mrp = itemData.mrp;
    if (itemData.odooId) cart[existingIndex].odooId = itemData.odooId;
  } else {
    cart.push({
      id: itemId,
      productKey: itemData.productKey,
      name: itemData.name,
      weight: itemData.weight,
      price: itemData.price,
      mrp: itemData.mrp,
      discount: itemData.discount || '',
      image: itemData.image,
      odooId: itemData.odooId || (itemData.productKey && PRODUCTS_DATA[itemData.productKey]?.odooId),
      quantity: itemData.quantity
    });
  }

  saveCart(cart);

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#A71935', '#D99119', '#557044', '#241B18', '#FFF8EF']
    });
  }

  showToast(`✨ Added ${itemData.quantity}x ${itemData.name} (${itemData.weight}) to bag!`);
  openCartDrawer();
}

function updateCartItemQty(id, delta) {
  let cart = getCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx > -1) {
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }
    saveCart(cart);
  }
}

function removeCartItem(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  showToast('Item removed from bag');
}

function openCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (overlay && drawer) {
    renderCartUI();
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function renderCartUI() {
  const cart = getCart();
  const cartBody = document.getElementById('cart-items-body');
  const footerBox = document.getElementById('cart-footer-box');
  const subtotalEl = document.getElementById('cart-subtotal-amount');
  const totalEl = document.getElementById('cart-total-amount');

  if (!cartBody) return;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty-state">
        <div style="font-size: 2.5rem;">🌶️</div>
        <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-heading);">Your Bag is Empty</h4>
        <p style="font-size: 0.84rem; color: var(--text-muted);">Explore our 100% pure handcrafted spice range and add authentic flavor to your cooking.</p>
        <a href="#products-catalog" class="btn btn-primary btn-sm" id="btn-empty-shop" style="margin-top: 8px;">
          <span>Explore Spices</span>
        </a>
      </div>
    `;
    if (footerBox) footerBox.style.display = 'none';

    const emptyShopBtn = document.getElementById('btn-empty-shop');
    if (emptyShopBtn) {
      emptyShopBtn.addEventListener('click', () => closeCartDrawer());
    }
    return;
  }

  if (footerBox) footerBox.style.display = 'block';

  let subtotal = 0;
  let itemsHtml = '';

  cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    itemsHtml += `
      <div class="cart-item-card" data-id="${item.id}">
        <div class="cart-item-img-wrapper">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div>
          <div class="cart-item-title">${item.name}</div>
          <span class="cart-item-variant">${item.weight}</span>
          <div class="cart-item-price-row">
            <span class="cart-item-price">₹${item.price}</span>
            ${item.mrp ? `<span style="font-size: 0.72rem; color: var(--text-subtle); text-decoration: line-through;">₹${item.mrp}</span>` : ''}
          </div>
        </div>
        <div class="cart-item-stepper">
          <button class="cart-stepper-btn cart-qty-dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="cart-stepper-val">${item.quantity}</span>
          <button class="cart-stepper-btn cart-qty-inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
        <button class="cart-item-remove-btn" data-id="${item.id}" title="Remove item" aria-label="Remove item">🗑️</button>
      </div>
    `;
  });

  cartBody.innerHTML = itemsHtml;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (totalEl) totalEl.textContent = `₹${subtotal}`;

  // Attach event listeners
  cartBody.querySelectorAll('.cart-qty-dec').forEach(btn => {
    btn.addEventListener('click', () => updateCartItemQty(btn.dataset.id, -1));
  });
  cartBody.querySelectorAll('.cart-qty-inc').forEach(btn => {
    btn.addEventListener('click', () => updateCartItemQty(btn.dataset.id, 1));
  });
  cartBody.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeCartItem(btn.dataset.id));
  });
}

// ==========================================================================
// 3. Quick-Variant Bottom Sheet Modal (#quick-variant-modal)
// ==========================================================================
let activeProductKey = 'chilli';
let activeSelectedWeight = '100g';
let activeSheetQty = 1;

function openQuickVariantSheet(productKey, defaultWeight = '100g') {
  const prod = PRODUCTS_DATA[productKey];
  if (!prod) return;

  activeProductKey = productKey;
  activeSelectedWeight = defaultWeight;
  activeSheetQty = 1;

  const modal = document.getElementById('quick-variant-modal');
  const imgEl = document.getElementById('sheet-prod-img');
  const titleEl = document.getElementById('sheet-prod-title');
  const hindiEl = document.getElementById('sheet-prod-hindi');
  const variantsContainer = document.getElementById('sheet-variants-container');
  const qtyValEl = document.getElementById('sheet-qty-val');

  if (imgEl) imgEl.src = prod.image;
  if (titleEl) titleEl.textContent = prod.shortName;
  if (hindiEl) hindiEl.textContent = prod.hindi;
  if (qtyValEl) qtyValEl.textContent = activeSheetQty;

  // Render variant buttons
  if (variantsContainer) {
    let vHtml = '';
    Object.keys(prod.variants).forEach(wKey => {
      const v = prod.variants[wKey];
      const isActive = wKey === activeSelectedWeight ? 'active' : '';
      vHtml += `
        <button class="sheet-variant-btn ${isActive}" data-weight="${v.weight}">
          <span class="sv-weight">${v.weight}</span>
          <span class="sv-price">₹${v.price}</span>
          <span class="sv-sub">${v.label}</span>
        </button>
      `;
    });
    variantsContainer.innerHTML = vHtml;

    variantsContainer.querySelectorAll('.sheet-variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        variantsContainer.querySelectorAll('.sheet-variant-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSelectedWeight = btn.dataset.weight;
        updateSheetPricing();
      });
    });
  }

  updateSheetPricing();

  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeQuickVariantSheet() {
  const modal = document.getElementById('quick-variant-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function updateSheetPricing() {
  const prod = PRODUCTS_DATA[activeProductKey];
  if (!prod) return;
  const variant = prod.variants[activeSelectedWeight] || prod.variants['100g'];

  const activePriceEl = document.getElementById('sheet-active-price');
  const activeMrpEl = document.getElementById('sheet-active-mrp');
  const activeDiscountEl = document.getElementById('sheet-active-discount');
  const btnTotalEl = document.getElementById('sheet-btn-total');
  const waBtn = document.getElementById('sheet-wa-order-btn');

  const lineTotal = variant.price * activeSheetQty;

  if (activePriceEl) activePriceEl.textContent = variant.price;
  if (activeMrpEl) activeMrpEl.textContent = `₹${variant.mrp}`;
  if (activeDiscountEl) activeDiscountEl.textContent = `${variant.discount} OFF`;
  if (btnTotalEl) btnTotalEl.textContent = lineTotal;

  if (waBtn) {
    const msg = encodeURIComponent(
      `Hello Tumic Spices! 🌶️\n\nI want to order ${prod.name}:\n• Pack Size: ${variant.weight}\n• Quantity: ${activeSheetQty}\n• Total Amount: ₹${lineTotal}\n\nPlease share delivery details.`
    );
    waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }
}

function initQuickVariantSheet() {
  const closeBtn = document.getElementById('sheet-close-btn');
  const modal = document.getElementById('quick-variant-modal');
  const decBtn = document.getElementById('sheet-qty-dec');
  const incBtn = document.getElementById('sheet-qty-inc');
  const qtyValEl = document.getElementById('sheet-qty-val');
  const addBtn = document.getElementById('btn-sheet-add-to-cart');

  if (closeBtn) closeBtn.addEventListener('click', closeQuickVariantSheet);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQuickVariantSheet();
    });
  }

  if (decBtn) {
    decBtn.addEventListener('click', () => {
      if (activeSheetQty > 1) {
        activeSheetQty--;
        if (qtyValEl) qtyValEl.textContent = activeSheetQty;
        updateSheetPricing();
      }
    });
  }

  if (incBtn) {
    incBtn.addEventListener('click', () => {
      if (activeSheetQty < 50) {
        activeSheetQty++;
        if (qtyValEl) qtyValEl.textContent = activeSheetQty;
        updateSheetPricing();
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const prod = PRODUCTS_DATA[activeProductKey];
      if (!prod) return;
      const variant = prod.variants[activeSelectedWeight] || prod.variants['100g'];

      addToCart({
        productKey: prod.key,
        name: `Tumic ${prod.shortName}`,
        weight: variant.weight,
        price: variant.price,
        mrp: variant.mrp,
        discount: variant.discount,
        image: prod.image,
        odooId: prod.odooId,
        quantity: activeSheetQty
      });

      closeQuickVariantSheet();
    });
  }
}

// ==========================================================================
// 4. Products Catalogue Grid Interaction (2-Column Mobile)
// ==========================================================================
function initCatalogueGrid() {
  const productTiles = document.querySelectorAll('.product-tile');
  const categoryPills = document.querySelectorAll('.cat-nav-pill');

  // Category Filtering
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.filter;

      if (filter === 'combos') {
        const combosSec = document.getElementById('combos-section');
        if (combosSec) combosSec.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      productTiles.forEach(tile => {
        if (filter === 'all' || tile.dataset.category === filter) {
          tile.style.display = 'flex';
        } else {
          tile.style.display = 'none';
        }
      });
    });
  });

  // Clicking anywhere on product tile opens Quick-Variant Sheet
  productTiles.forEach(tile => {
    const key = tile.dataset.productKey;
    tile.addEventListener('click', (e) => {
      openQuickVariantSheet(key, '100g');
    });
  });

  // Value Combos Direct Add to Bag
  document.querySelectorAll('.btn-add-combo').forEach(btn => {
    btn.addEventListener('click', () => {
      const comboId = btn.dataset.comboId;
      const comboName = btn.dataset.comboName;
      const comboPrice = parseInt(btn.dataset.comboPrice, 10);
      const comboMrp = parseInt(btn.dataset.comboMrp, 10);
      
      let img = '/assets/garam-masala.png';
      if (comboId === 'kitchen-trio') img = '/assets/turmeric-powder.png';
      if (comboId === 'royal-kit') img = '/assets/biryani-masala.png';

      addToCart({
        id: `combo_${comboId}`,
        productKey: `combo_${comboId}`,
        name: `Tumic ${comboName}`,
        weight: 'Combo Bundle',
        price: comboPrice,
        mrp: comboMrp,
        discount: 'Bundle Offer',
        image: img,
        quantity: 1
      });
    });
  });
}

// ==========================================================================
// 5. Mobile Navigation Drawer
// ==========================================================================
function openMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const drawer = document.getElementById('mobile-menu-drawer');
  if (overlay && drawer) {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const drawer = document.getElementById('mobile-menu-drawer');
  if (overlay && drawer) {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// 6. Checkout Modal & Validation Logic (Postal PIN Code Auto-Fill)
// ==========================================================================
function openCheckoutModal() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your bag is empty. Please add spices before checkout!');
    return;
  }
  closeCartDrawer();

  const checkoutModal = document.getElementById('checkout-modal');
  if (checkoutModal) {
    renderCheckoutSummary();
    checkoutModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeCheckoutModal() {
  const checkoutModal = document.getElementById('checkout-modal');
  if (checkoutModal) {
    checkoutModal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function renderCheckoutSummary() {
  const cart = getCart();
  const itemsListEl = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal-val');
  const totalEl = document.getElementById('checkout-total-val');

  if (!itemsListEl) return;

  let subtotal = 0;
  let html = '';

  cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    html += `
      <div class="checkout-item-row">
        <div>
          <div style="font-weight: 700; color: var(--text-heading);">${item.name}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${item.weight} × ${item.quantity}</span>
        </div>
        <div style="font-weight: 700; color: var(--primary);">₹${lineTotal}</div>
      </div>
    `;
  });

  itemsListEl.innerHTML = html;
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (totalEl) totalEl.textContent = `₹${subtotal}`;
}

function setupCheckoutValidation() {
  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const emailInput = document.getElementById('cust-email');
  const addressInput = document.getElementById('cust-address');
  const pinInput = document.getElementById('cust-pincode');
  const cityInput = document.getElementById('cust-city');
  const stateInput = document.getElementById('cust-state');
  const submitBtn = document.getElementById('btn-place-order');
  const pinStatus = document.getElementById('pin-status');

  if (!submitBtn || !pinInput) return;

  const phoneRegex = /^[6-9]\d{9}$/;

  async function lookupPincode(pin) {
    try {
      if (pinStatus) {
        pinStatus.textContent = "Verifying PIN...";
        pinStatus.style.color = "var(--text-muted)";
      }
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        cityInput.value = postOffice.District || postOffice.Block || postOffice.Region || 'Kanpur';
        stateInput.value = postOffice.State || 'Uttar Pradesh';
        if (pinStatus) {
          pinStatus.textContent = "✓ PIN verified";
          pinStatus.style.color = "#10B981";
        }
        return true;
      } else {
        cityInput.value = '';
        stateInput.value = '';
        if (pinStatus) {
          pinStatus.textContent = "❌ Invalid PIN Code";
          pinStatus.style.color = "#EF4444";
        }
        return false;
      }
    } catch (err) {
      if (pinStatus) {
        pinStatus.textContent = "⚠️ Manual PIN check";
        pinStatus.style.color = "var(--secondary)";
      }
      return false;
    }
  }

  let isPincodeValid = false;

  pinInput.addEventListener('input', async (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 6) val = val.substring(0, 6);
    e.target.value = val;
    
    isPincodeValid = false;
    if (val.length === 6) {
      isPincodeValid = await lookupPincode(val);
    } else {
      cityInput.value = '';
      stateInput.value = '';
      if (pinStatus) pinStatus.textContent = "";
    }
    validateForm();
  });

  function validateForm() {
    const isNameValid = nameInput.value.trim().length > 2;
    const isPhoneValid = phoneRegex.test(phoneInput.value.replace(/\D/g, ''));
    const isEmailValid = emailInput.value.includes('@') && emailInput.value.includes('.');
    const isAddressValid = addressInput.value.trim().length > 8;
    const isCityValid = cityInput.value.trim().length > 2;

    if (isNameValid && isPhoneValid && isEmailValid && isAddressValid && isCityValid && isPincodeValid) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
  }

  const inputs = [nameInput, phoneInput, emailInput, addressInput, cityInput, stateInput];
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('input', validateForm);
      input.addEventListener('blur', validateForm);
    }
  });

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
      validateForm();
    });
  }
  
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor = 'not-allowed';
}

// ==========================================================================
// 7. Order Placement Handler (Odoo 19 Sync & WhatsApp Cloud API)
// ==========================================================================
async function handlePlaceOrder(e) {
  e.preventDefault();
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your bag is empty! Please add spices before checking out.');
    return;
  }

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const city = document.getElementById('cust-city').value.trim();
  const state = document.getElementById('cust-state').value.trim();
  const pin = document.getElementById('cust-pincode').value.trim();

  const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentRadio ? paymentRadio.value : 'Cash on Delivery (COD)';

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderId = `TUMIC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const orderPayload = {
    id: orderId,
    date: orderDate,
    customer: {
      name,
      phone,
      email,
      address,
      city,
      state,
      pin
    },
    items: [...cart],
    subtotal,
    deliveryFee: 0,
    totalAmount: subtotal,
    paymentMethod,
    paymentStatus: paymentMethod.includes('Cash') ? 'unpaid' : 'pending',
    orderStatus: 'Confirmed'
  };

  const submitBtn = document.getElementById('btn-place-order');
  if (submitBtn) {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
  }

  // Processing Overlay
  let overlay = document.getElementById('processing-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'processing-overlay';
    overlay.innerHTML = `
      <div class="processing-spinner"></div>
      <div style="font-size: 1.18rem; font-weight: 700; color: var(--tumic-ivory); margin-bottom: 6px; letter-spacing: -0.01em;">Placing your order...</div>
      <div style="font-size: 0.88rem; color: var(--tumic-spice-cream); opacity: 0.9; text-align: center; max-width: 280px;">Securing your fresh spices & preparing confirmation...</div>
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.classList.add('active');

  let finalOrder = orderPayload;

  try {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Unable to place order. Please try again.');
    }

    if (data.order) {
      finalOrder = data.order;
    }
  } catch (err) {
    console.error('[Checkout Error]:', err.message);
    showToast(`❌ Order placement failed: ${err.message}`);
    overlay.classList.remove('active');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Place Order Now</span> <span>🔒</span>';
    }
    return;
  } finally {
    overlay.classList.remove('active');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Place Order Now</span> <span>🔒</span>';
    }
  }

  // Save to local storage
  try {
    const existingOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
    existingOrders.unshift(finalOrder);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existingOrders));
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(finalOrder));
  } catch (err) {}

  // Clear cart
  saveCart([]);

  // Close Checkout Modal & Show Confirmation
  closeCheckoutModal();
  showOrderConfirmation(finalOrder);
}

// ==========================================================================
// 8. Order Confirmation Modal
// ==========================================================================
function showOrderConfirmation(order) {
  const modal = document.getElementById('order-confirmation-modal');
  if (!modal) return;

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#A71935', '#D99119', '#557044', '#241B18', '#FFF8EF']
    });
  }

  document.getElementById('receipt-order-id').textContent = `#${order.id}`;
  document.getElementById('receipt-order-date').textContent = order.date;
  document.getElementById('receipt-payment-method').textContent = order.paymentMethod;
  document.getElementById('receipt-grand-total').textContent = `₹${order.totalAmount}`;

  const invoiceNumber = order.odooInvoiceName || order.odooInvoiceId || 'Pending Confirmation';
  const invIdEl = document.getElementById('receipt-odoo-inv-id');
  if (invIdEl) invIdEl.textContent = `#${invoiceNumber}`;

  document.getElementById('receipt-customer-name').textContent = order.customer.name;
  document.getElementById('receipt-customer-address').textContent = `${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pin}`;
  document.getElementById('receipt-customer-phone').textContent = `Phone: +91 ${order.customer.phone}`;

  // Itemized table
  const tbody = document.getElementById('receipt-items-tbody');
  if (tbody) {
    let tbodyHtml = '';
    order.items.forEach(item => {
      tbodyHtml += `
        <tr>
          <td>
            <strong>${item.name}</strong><br>
            <small style="color: var(--text-muted);">${item.weight || '100g'}</small>
          </td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right; font-family: var(--font-mono);">₹${item.price}</td>
          <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">₹${item.price * item.quantity}</td>
        </tr>
      `;
    });
    tbody.innerHTML = tbodyHtml;
  }

  const waChatBtn = document.getElementById('receipt-wa-chat-btn');
  if (waChatBtn) {
    const inquiryMsg = encodeURIComponent(
      `Hi Tumic Spices, I have a question about my order #${order.id}. Customer Name: ${order.customer.name}.`
    );
    waChatBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${inquiryMsg}`;
  }

  const waDetailsBtn = document.getElementById('receipt-wa-details-btn');
  if (waDetailsBtn) {
    const itemsSummary = order.items.map(i => `• ${i.name} (${i.weight || '100g'}) × ${i.quantity} = ₹${i.price * i.quantity}`).join('\n');
    const invRefLine = order.odooInvoiceName ? `\n• *Odoo Tax Invoice:* #${order.odooInvoiceName}` : '';
    const detailsMsg = encodeURIComponent(
      `Hello Tumic Spices! 🌶️\n\n*Order Details:*\n• *Order Number:* #${order.id}${invRefLine}\n• *Customer Name:* ${order.customer.name}\n• *Items Ordered:*\n${itemsSummary}\n• *Total Amount:* ₹${order.totalAmount} (Free Delivery)\n• *Payment:* ${order.paymentMethod}\n• *Delivery Address:* ${order.customer.address}, ${order.customer.city} - ${order.customer.pin}\n• *Phone:* +91 ${order.customer.phone}\n\nPlease confirm dispatch details!`
    );
    waDetailsBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${detailsMsg}`;
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOrderConfirmation() {
  const modal = document.getElementById('order-confirmation-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// 9. Customer Order Tracking System (Interactive Lifecycle Progress)
// ==========================================================================
function renderOrderTimeline(status) {
  const currentStatus = String(status || 'Confirmed').trim();

  if (currentStatus.toLowerCase() === 'cancelled') {
    return `
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); padding: 16px; text-align: center; margin: 14px 0;">
        <div style="font-size: 2rem; margin-bottom: 4px;">❌</div>
        <h4 style="color: #DC2626; font-size: 1.05rem; font-weight: 800; margin: 0 0 4px 0;">Order Cancelled ❌</h4>
        <p style="color: #991B1B; font-size: 0.8rem; margin: 0; line-height: 1.4;">This order has been marked as cancelled. If you have questions or need assistance, please chat with us on WhatsApp.</p>
      </div>
    `;
  }

  const steps = [
    { key: 'received', label: 'Order Received', icon: '📝' },
    { key: 'confirmed', label: 'Order Confirmed 🎉', icon: '🎉' },
    { key: 'getting_shipped', label: 'Getting Shipped 📦', icon: '📦' },
    { key: 'shipped', label: 'Shipped 🚚', icon: '🚚' },
    { key: 'delivered', label: 'Delivered ✅', icon: '✅' }
  ];

  let activeIndex = 1; // Default Confirmed
  const sLow = currentStatus.toLowerCase();
  if (sLow.includes('pending')) activeIndex = 0;
  else if (sLow.includes('confirm')) activeIndex = 1;
  else if (sLow.includes('getting') || sLow.includes('pack') || sLow.includes('process')) activeIndex = 2;
  else if (sLow.includes('shipped') || sLow.includes('transit') || sLow.includes('way')) activeIndex = 3;
  else if (sLow.includes('deliver')) activeIndex = 4;

  const progressPercent = (activeIndex / (steps.length - 1)) * 100;

  const stepsHtml = steps.map((step, idx) => {
    let stateClass = 'pending';
    let dotContent = `${idx + 1}`;
    if (idx < activeIndex) {
      stateClass = 'completed';
      dotContent = '✓';
    } else if (idx === activeIndex) {
      stateClass = 'active';
      dotContent = step.icon;
    }

    return `
      <div class="timeline-step ${stateClass}">
        <div class="timeline-dot">${dotContent}</div>
        <span class="timeline-label">${step.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="timeline-container">
      <div class="timeline-track">
        <div class="timeline-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
      <div class="timeline-steps">
        ${stepsHtml}
      </div>
    </div>
  `;
}

function getStatusBadgeHtml(status) {
  const s = String(status || 'Confirmed').trim();
  const sLow = s.toLowerCase();
  let bg = '#ECFDF5';
  let color = '#065F46';
  let border = '#A7F3D0';
  let icon = '🎉';

  if (sLow.includes('pending')) {
    bg = '#FEF3C7';
    color = '#92400E';
    border = '#FDE68A';
    icon = '⏳';
  } else if (sLow.includes('getting') || sLow.includes('pack')) {
    bg = '#EDE9FE';
    color = '#5B21B6';
    border = '#DDD6FE';
    icon = '📦';
  } else if (sLow.includes('shipped')) {
    bg = '#DBEAFE';
    color = '#1E40AF';
    border = '#BFDBFE';
    icon = '🚚';
  } else if (sLow.includes('deliver')) {
    bg = '#D1FAE5';
    color = '#065F46';
    border = '#A7F3D0';
    icon = '✅';
  } else if (sLow.includes('cancel')) {
    bg = '#FEE2E2';
    color = '#991B1B';
    border = '#FECACA';
    icon = '❌';
  }

  return `<span style="background: ${bg}; color: ${color}; border: 1px solid ${border}; padding: 3px 8px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">${icon} ${s}</span>`;
}

let openTrackModalGlobal = null;

function initTrackOrder() {
  const navTrackBtn = document.getElementById('nav-track-btn');
  const mobileNavTrackBtn = document.getElementById('mobile-nav-track-btn');
  const footerTrackLink = document.getElementById('footer-track-link');
  const receiptTrackBtn = document.getElementById('receipt-track-order-btn');
  const trackForm = document.getElementById('track-order-form');
  const trackInput = document.getElementById('track-order-input');
  const trackResult = document.getElementById('track-order-result');
  const trackModal = document.getElementById('track-order-modal');
  const trackCloseBtn = document.getElementById('track-modal-close');

  function openTrackModal(orderId = '') {
    closeMobileMenu();
    if (trackModal) {
      trackModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (orderId && trackInput) {
        trackInput.value = orderId;
        if (trackForm) {
          trackForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      } else if (trackInput) {
        setTimeout(() => trackInput.focus(), 150);
      }
    }
  }

  openTrackModalGlobal = openTrackModal;

  function closeTrackModal() {
    if (trackModal) {
      trackModal.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (window.location.hash === '#track') {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  if (navTrackBtn) navTrackBtn.addEventListener('click', (e) => { e.preventDefault(); openTrackModal(); });
  if (mobileNavTrackBtn) mobileNavTrackBtn.addEventListener('click', (e) => { e.preventDefault(); openTrackModal(); });
  if (footerTrackLink) footerTrackLink.addEventListener('click', (e) => { e.preventDefault(); openTrackModal(); });
  if (receiptTrackBtn) receiptTrackBtn.addEventListener('click', (e) => { e.preventDefault(); closeOrderConfirmation(); openTrackModal(); });
  if (trackCloseBtn) trackCloseBtn.addEventListener('click', closeTrackModal);
  if (trackModal) {
    trackModal.addEventListener('click', (e) => {
      if (e.target === trackModal) closeTrackModal();
    });
  }

  // Support #track URL hash on load and dynamic hash change
  if (window.location.hash === '#track') {
    setTimeout(openTrackModal, 100);
  }
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#track') {
      openTrackModal();
    }
  });

  if (trackForm && trackResult) {
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('track-order-input');
      const query = input?.value?.trim() || '';
      if (!query) return;

      const submitBtn = document.getElementById('btn-track-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Searching...';
      }

      trackResult.style.display = 'block';
      trackResult.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 16px;">⏳ Searching live store orders...</p>';

      try {
        const res = await fetch(`/api/orders/lookup?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.order) {
          const o = data.order;
          const itemsList = (o.items || []).map(i => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.82rem;">
              <span>${i.name} (${i.weight || '100g'}) × ${i.quantity}</span>
              <strong>₹${i.price * i.quantity}</strong>
            </div>
          `).join('');
          
          const invTag = o.odooInvoiceName ? `<strong style="color: #10B981; font-family: var(--font-mono);">#${o.odooInvoiceName}</strong>` : '<span style="color: var(--text-muted);">INV Registered</span>';
          const waInquiryUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Tumic Spices, I am checking the status of my order #${o.id}. Customer Name: ${o.customer?.name}`)}`;
          const timelineHtml = renderOrderTimeline(o.orderStatus);
          const statusBadge = getStatusBadgeHtml(o.orderStatus);

          trackResult.innerHTML = `
            <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Website Order ID</span>
                  <strong style="color: var(--primary); font-size: 1.08rem; font-family: var(--font-mono);">#${o.id}</strong>
                </div>
                ${statusBadge}
              </div>

              ${timelineHtml}

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.82rem; margin-bottom: 12px; margin-top: 14px;">
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Customer</span>
                  <strong>${o.customer?.name || 'Customer'}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Order Date</span>
                  <strong>${o.date || new Date(o.createdAt).toLocaleDateString('en-IN')}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Tax Invoice</span>
                  ${invTag}
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Payment Method</span>
                  <strong>${o.paymentMethod || 'COD'}</strong>
                </div>
              </div>

              <div style="background: #FFFFFF; border: 1px solid var(--border-light); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 12px;">
                <span style="color: var(--text-muted); font-size: 0.72rem; display: block; margin-bottom: 4px; font-weight: 600;">Ordered Items:</span>
                ${itemsList}
                <div style="border-top: 1px solid var(--border-light); margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; font-weight: 700; color: var(--primary);">
                  <span>Total Amount:</span>
                  <span>₹${o.totalAmount}</span>
                </div>
              </div>

              <a href="${waInquiryUrl}" target="_blank" class="btn btn-whatsapp btn-sm" style="width: 100%; justify-content: center;">
                <span>💬 Contact Store on WhatsApp</span>
              </a>
            </div>
          `;
        } else {
          trackResult.innerHTML = `
            <div style="padding: 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-sm); color: #DC2626; font-size: 0.84rem; text-align: center;">
              ❌ ${data.error || 'No order found with that ID or phone number.'}
            </div>
          `;
        }
      } catch (err) {
        trackResult.innerHTML = `
          <div style="padding: 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-sm); color: #DC2626; font-size: 0.84rem; text-align: center;">
            ❌ Network error searching for order: ${err.message}
          </div>
        `;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Track 🔍';
        }
      }
    });
  }
}

// ==========================================================================
// 10. Admin Orders & Odoo Dashboard (PIN Protected)
// ==========================================================================
let adminOrdersCache = [];
const ADMIN_PIN_SESSION_KEY = 'tumic_admin_pin';

function getAdminSessionPin() {
  return sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) || '';
}

function setAdminSessionPin(pin) {
  sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, pin);
}

function clearAdminSessionPin() {
  sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
}

function getAdminHeaders() {
  const pin = getAdminSessionPin();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pin}`,
    'x-admin-pin': pin
  };
}

function showAdminPinModal() {
  const pinModal = document.getElementById('admin-pin-modal');
  const pinInput = document.getElementById('admin-pin-input');
  const pinError = document.getElementById('admin-pin-error');
  if (pinModal) {
    if (pinError) {
      pinError.style.display = 'none';
      pinError.textContent = '';
    }
    if (pinInput) {
      pinInput.value = '';
    }
    pinModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (pinInput) pinInput.focus();
    }, 150);
  }
}

function closeAdminPinModal() {
  const pinModal = document.getElementById('admin-pin-modal');
  if (pinModal) {
    pinModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (window.location.hash === '#admin') {
    history.replaceState(null, '', window.location.pathname);
  }
}

function openAdminDashboardModal() {
  const adminModal = document.getElementById('admin-orders-modal');
  if (adminModal) {
    adminModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    fetchAdminOrders();
  }
}

function closeAdminDashboardModal() {
  const adminModal = document.getElementById('admin-orders-modal');
  if (adminModal) {
    adminModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (window.location.hash === '#admin') {
    history.replaceState(null, '', window.location.pathname);
  }
}

function promptAdminAccess() {
  const existingPin = getAdminSessionPin();
  if (existingPin) {
    openAdminDashboardModal();
  } else {
    showAdminPinModal();
  }
}

async function fetchAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  const totalCountEl = document.getElementById('admin-orders-total-count');
  const odooStatusPill = document.getElementById('admin-odoo-status-pill');
  const odooStatusText = document.getElementById('admin-odoo-status-text');

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">⏳ Loading orders database...</td></tr>`;
  }

  // 1. Fetch Odoo Status with Admin Authorization
  try {
    const statusRes = await fetch('/api/odoo/status', {
      headers: getAdminHeaders()
    });
    
    if (statusRes.status === 401) {
      clearAdminSessionPin();
      closeAdminDashboardModal();
      showAdminPinModal();
      return;
    }

    const statusData = await statusRes.json();
    if (odooStatusPill && odooStatusText) {
      if (statusData.odooConfigured) {
        odooStatusPill.className = 'sync-badge synced';
        odooStatusText.textContent = '🟢 Odoo Connected';
      } else {
        odooStatusPill.className = 'sync-badge pending';
        odooStatusText.textContent = '🟡 Odoo Setup';
      }
    }

    if (statusData.odooUrl) {
      const urlInput = document.getElementById('setup-odoo-url');
      if (urlInput && !urlInput.value) urlInput.value = statusData.odooUrl;
    }
    if (statusData.odooDb) {
      const dbInput = document.getElementById('setup-odoo-db');
      if (dbInput && !dbInput.value) dbInput.value = statusData.odooDb;
    }
    if (statusData.odooUsername) {
      const userInput = document.getElementById('setup-odoo-user');
      if (userInput && !userInput.value) userInput.value = statusData.odooUsername;
    }
  } catch (e) {}

  // 2. Fetch Admin Orders with Admin Authorization
  try {
    const res = await fetch('/api/admin/orders', {
      headers: getAdminHeaders()
    });

    if (res.status === 401) {
      clearAdminSessionPin();
      closeAdminDashboardModal();
      showAdminPinModal();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      adminOrdersCache = data.orders || [];
    } else {
      adminOrdersCache = [];
    }
  } catch (err) {
    adminOrdersCache = [];
  }

  if (totalCountEl) totalCountEl.textContent = adminOrdersCache.length;
  renderAdminOrdersTable(adminOrdersCache);
}

function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-muted);">
          🌶️ No orders found in store database.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  orders.forEach(order => {
    const productsSummary = (order.items || []).map(i => `${i.name} (${i.weight || '100g'}) × ${i.quantity}`).join('<br>');
    
    let syncBadgeHtml = '';
    if (order.odooSyncStatus === 'synced') {
      syncBadgeHtml = `<span class="sync-badge synced">✓ Synced</span>`;
    } else if (order.odooSyncStatus === 'failed') {
      syncBadgeHtml = `<span class="sync-badge failed" title="${order.odooError || 'Sync failed'}">✕ Failed</span>`;
    } else {
      syncBadgeHtml = `<span class="sync-badge pending">⏳ Pending</span>`;
    }

    const invDisplay = order.odooInvoiceName 
      ? `<strong style="color: #10B981; font-family: var(--font-mono);">#${order.odooInvoiceName}</strong>` 
      : (order.odooInvoiceId ? `<strong style="color: #10B981; font-family: var(--font-mono);">INV-${order.odooInvoiceId}</strong>` : `<span style="color: var(--text-muted);">None</span>`);

    const currentStatus = order.orderStatus || 'Confirmed';
    const isDelivered = currentStatus === 'Delivered' || currentStatus === 'Delivered & Payment Received';
    const statusSelectHtml = `
      <select class="admin-order-status-select form-input" data-order-id="${order.id}" data-invoice-id="${order.odooInvoiceId || ''}" data-current-status="${currentStatus}">
        <option value="Pending Confirmation" ${currentStatus === 'Pending Confirmation' ? 'selected' : ''}>⏳ Pending Confirmation</option>
        <option value="Confirmed" ${currentStatus === 'Confirmed' ? 'selected' : ''}>🎉 Confirmed</option>
        <option value="Getting Shipped" ${currentStatus === 'Getting Shipped' ? 'selected' : ''}>📦 Getting Shipped</option>
        <option value="Shipped" ${currentStatus === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
        <option value="Delivered & Payment Received" ${isDelivered ? 'selected' : ''}>💰 Delivered & Payment Received</option>
        <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
      </select>
    `;

    const actionHtml = order.odooSyncStatus === 'synced'
      ? `<span style="color: #10B981; font-size: 0.78rem; font-weight: 700;">✓ Ready</span>`
      : `<button class="btn-retry-sync btn btn-outline btn-sm" data-order-id="${order.id}">🔄 Retry</button>`;

    html += `
      <tr>
        <td><strong>#${order.id}</strong></td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${order.date || new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
        <td>
          <strong>${order.customer?.name || 'Customer'}</strong><br>
          <small style="color: var(--text-muted);">${order.customer?.phone || ''} (${order.customer?.city || 'Kanpur'})</small>
        </td>
        <td style="font-size: 0.8rem;">${productsSummary}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">₹${order.totalAmount}</td>
        <td>
          <small>${order.paymentMethod || 'COD'}</small>
        </td>
        <td>${invDisplay}</td>
        <td>${statusSelectHtml}</td>
        <td>${syncBadgeHtml}</td>
        <td>${actionHtml}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Status update listeners
  tbody.querySelectorAll('.admin-order-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const orderId = sel.dataset.orderId;
      const odooInvoiceId = sel.dataset.invoiceId;
      const newStatus = sel.value;
      const prevStatus = sel.dataset.currentStatus || 'Confirmed';

      sel.disabled = true;
      try {
        const res = await fetch('/api/admin/orders/update-status', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({
            orderId,
            odooInvoiceId: odooInvoiceId ? Number(odooInvoiceId) : null,
            status: newStatus
          })
        });

        if (res.status === 401) {
          clearAdminSessionPin();
          closeAdminDashboardModal();
          showAdminPinModal();
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (newStatus.includes('Payment') || data.paymentRegistered) {
            showToast(`✓ Order #${orderId} marked Delivered & Payment recorded in Odoo!`);
          } else {
            showToast(`✓ Order #${orderId} updated to "${newStatus}"`);
          }
          sel.dataset.currentStatus = data.status || 'Delivered';
          const match = adminOrdersCache.find(o => o.id === orderId || (o.odooInvoiceId && String(o.odooInvoiceId) === String(odooInvoiceId)));
          if (match) {
            match.orderStatus = data.status || 'Delivered';
            if (data.paymentState) match.paymentStatus = 'paid';
          }
        } else {
          showToast(`⚠️ Status update failed: ${data.error || 'Check server logs'}`);
          sel.value = prevStatus === 'Delivered' ? 'Delivered & Payment Received' : prevStatus;
        }
      } catch (err) {
        showToast(`Error updating status: ${err.message}`);
        sel.value = prevStatus === 'Delivered' ? 'Delivered & Payment Received' : prevStatus;
      } finally {
        sel.disabled = false;
      }
    });
  });

  // Retry sync listeners
  tbody.querySelectorAll('.btn-retry-sync').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.orderId;
      btn.disabled = true;
      btn.textContent = 'Syncing...';

      try {
        const res = await fetch('/api/admin/orders/retry-sync', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ orderId })
        });

        if (res.status === 401) {
          clearAdminSessionPin();
          closeAdminDashboardModal();
          showAdminPinModal();
          return;
        }

        const data = await res.json();
        if (data.success) {
          showToast(`✓ Order ${orderId} synced to Odoo successfully!`);
        } else {
          showToast(`⚠️ Sync failed: ${data.odooError || 'Check credentials'}`);
        }
      } catch (err) {
        showToast(`Sync error: ${err.message}`);
      } finally {
        fetchAdminOrders();
      }
    });
  });
}

function initAdminDashboard() {
  const pinModal = document.getElementById('admin-pin-modal');
  const pinForm = document.getElementById('admin-pin-form');
  const pinInput = document.getElementById('admin-pin-input');
  const pinError = document.getElementById('admin-pin-error');
  const pinCancelBtn = document.getElementById('admin-pin-cancel-btn');
  const adminPortalLink = document.getElementById('admin-portal-link');

  const adminModal = document.getElementById('admin-orders-modal');
  const adminCloseBtn = document.getElementById('admin-modal-close');
  const adminRefreshBtn = document.getElementById('admin-refresh-orders-btn');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const searchInput = document.getElementById('admin-search-input');

  const toggleSetupBtn = document.getElementById('btn-toggle-odoo-setup');
  const setupPanel = document.getElementById('admin-odoo-setup-panel');
  const testConnBtn = document.getElementById('btn-test-odoo-conn');
  const testResultBox = document.getElementById('odoo-test-result-box');
  const odooForm = document.getElementById('admin-odoo-credentials-form');

  // PIN Form Submission
  if (pinForm) {
    pinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = (pinInput?.value || '').trim();
      if (!pin) return;

      const submitBtn = document.getElementById('admin-pin-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }
      if (pinError) pinError.style.display = 'none';

      try {
        const res = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setAdminSessionPin(pin);
          closeAdminPinModal();
          openAdminDashboardModal();
          showToast('🔓 Admin Dashboard Unlocked');
        } else {
          if (pinError) {
            pinError.textContent = data.error || 'Invalid Admin Secret PIN.';
            pinError.style.display = 'block';
          }
          if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
          }
        }
      } catch (err) {
        if (pinError) {
          pinError.textContent = 'Verification error. Please try again.';
          pinError.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Unlock Dashboard 🔒';
        }
      }
    });
  }

  if (pinCancelBtn) pinCancelBtn.addEventListener('click', closeAdminPinModal);
  if (pinModal) {
    pinModal.addEventListener('click', (e) => {
      if (e.target === pinModal) closeAdminPinModal();
    });
  }

  if (adminPortalLink) {
    adminPortalLink.addEventListener('click', (e) => {
      e.preventDefault();
      promptAdminAccess();
    });
  }

  // URL Hash check for #admin
  if (window.location.hash === '#admin') {
    promptAdminAccess();
  }
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      promptAdminAccess();
    }
  });

  // Secret keyboard shortcut: Ctrl+Shift+A (or Cmd+Shift+A)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      promptAdminAccess();
    }
  });

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      clearAdminSessionPin();
      closeAdminDashboardModal();
      showToast('🔒 Admin session locked.');
    });
  }

  if (toggleSetupBtn && setupPanel) {
    toggleSetupBtn.addEventListener('click', () => {
      const isHidden = setupPanel.style.display === 'none';
      setupPanel.style.display = isHidden ? 'block' : 'none';
    });
  }

  if (testConnBtn && testResultBox) {
    testConnBtn.addEventListener('click', async () => {
      testConnBtn.disabled = true;
      testConnBtn.textContent = 'Testing...';
      testResultBox.style.display = 'block';
      testResultBox.style.background = 'rgba(0, 0, 0, 0.05)';
      testResultBox.innerHTML = '⏳ Connecting to Odoo JSON-2 endpoint...';

      try {
        const res = await fetch('/api/odoo/test-connection', {
          headers: getAdminHeaders()
        });

        if (res.status === 401) {
          clearAdminSessionPin();
          closeAdminDashboardModal();
          showAdminPinModal();
          return;
        }

        const data = await res.json();

        if (data.connected) {
          testResultBox.style.background = '#ECFDF5';
          testResultBox.style.color = '#065F46';
          testResultBox.style.border = '1px solid #A7F3D0';
          testResultBox.innerHTML = `
            <strong>✅ Connected Successfully to Odoo Enterprise!</strong><br>
            • <strong>User:</strong> ${data.user?.name} (${data.user?.login})<br>
            • <strong>Company:</strong> ${data.company?.name} (${data.company?.currency})
          `;
        } else {
          testResultBox.style.background = '#FEF2F2';
          testResultBox.style.color = '#991B1B';
          testResultBox.style.border = '1px solid #FECACA';
          testResultBox.innerHTML = `<strong>❌ Connection Failed:</strong> ${data.error}`;
        }
      } catch (err) {
        testResultBox.style.background = '#FEF2F2';
        testResultBox.style.color = '#991B1B';
        testResultBox.innerHTML = `<strong>❌ Request Error:</strong> ${err.message}`;
      } finally {
        testConnBtn.disabled = false;
        testConnBtn.textContent = '🧪 Test Connection';
      }
    });
  }

  if (odooForm) {
    odooForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const odooUrl = document.getElementById('setup-odoo-url').value.trim();
      const odooDb = document.getElementById('setup-odoo-db').value.trim();
      const odooUsername = document.getElementById('setup-odoo-user').value.trim();
      const odooApiKey = document.getElementById('setup-odoo-apikey').value.trim();
      const submitBtn = document.getElementById('btn-save-odoo-config');

      if (!odooUrl || !odooDb || !odooUsername || !odooApiKey) {
        showToast('Please fill all Odoo credential fields.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }

      try {
        const res = await fetch('/api/odoo/save-config', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ odooUrl, odooDb, odooUsername, odooApiKey })
        });

        if (res.status === 401) {
          clearAdminSessionPin();
          closeAdminDashboardModal();
          showAdminPinModal();
          return;
        }

        const data = await res.json();
        if (data.success && data.connectionTest?.connected) {
          showToast('✅ Odoo Enterprise credentials verified & saved!');
          if (setupPanel) setupPanel.style.display = 'none';
        } else {
          showToast(`⚠️ Config saved, but test failed: ${data.connectionTest?.error || data.error}`);
        }
      } catch (err) {
        showToast(`❌ Network error: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '💾 Save & Verify';
        }
        fetchAdminOrders();
      }
    });
  }

  if (adminCloseBtn) adminCloseBtn.addEventListener('click', closeAdminDashboardModal);
  if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', fetchAdminOrders);

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeAdminDashboardModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderAdminOrdersTable(adminOrdersCache);
        return;
      }
      const filtered = adminOrdersCache.filter(o => 
        (o.id && o.id.toLowerCase().includes(query)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(query)) ||
        (o.customer?.phone && o.customer.phone.includes(query)) ||
        (o.odooOrderName && o.odooOrderName.toLowerCase().includes(query)) ||
        (o.odooInvoiceName && o.odooInvoiceName.toLowerCase().includes(query))
      );
      renderAdminOrdersTable(filtered);
    });
  }
}

// ==========================================================================
// 11. Global Initialization
// ==========================================================================
function init() {
  initCatalogueGrid();
  initQuickVariantSheet();
  setupCheckoutValidation();
  initTrackOrder();
  initAdminDashboard();

  // Cart Drawer listeners
  const cartToggleBtn = document.getElementById('cart-drawer-toggle');
  const cartCloseBtn = document.getElementById('cart-drawer-close');
  const cartOverlay = document.getElementById('cart-drawer-overlay');
  const proceedBtn = document.getElementById('btn-proceed-checkout');

  if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCartDrawer);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);
  if (proceedBtn) proceedBtn.addEventListener('click', openCheckoutModal);

  // Mobile Menu Listeners
  const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenuCloseBtn = document.getElementById('mobile-menu-close');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  
  if (mobileMenuToggleBtn) mobileMenuToggleBtn.addEventListener('click', openMobileMenu);
  if (mobileMenuCloseBtn) mobileMenuCloseBtn.addEventListener('click', closeMobileMenu);
  if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Checkout Modal listeners
  const checkoutBackBtn = document.getElementById('checkout-back-btn');
  const checkoutCloseBtn = document.getElementById('checkout-close-btn');
  const checkoutOverlay = document.getElementById('checkout-modal');
  const checkoutForm = document.getElementById('checkout-order-form');

  if (checkoutBackBtn) checkoutBackBtn.addEventListener('click', () => {
    closeCheckoutModal();
    openCartDrawer();
  });
  if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeCheckoutModal);
  if (checkoutOverlay) {
    checkoutOverlay.addEventListener('click', (e) => {
      if (e.target === checkoutOverlay) closeCheckoutModal();
    });
  }
  if (checkoutForm) checkoutForm.addEventListener('submit', handlePlaceOrder);

  // Payment radio option styling
  const paymentCards = document.querySelectorAll('.payment-option-card');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Order Confirmation Modal listeners
  const receiptContinueBtn = document.getElementById('receipt-continue-btn');
  const receiptOverlay = document.getElementById('order-confirmation-modal');

  if (receiptContinueBtn) {
    receiptContinueBtn.addEventListener('click', () => {
      closeOrderConfirmation();
      const allProdSection = document.getElementById('products-catalog');
      if (allProdSection) allProdSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (receiptOverlay) {
    receiptOverlay.addEventListener('click', (e) => {
      if (e.target === receiptOverlay) closeOrderConfirmation();
    });
  }

  // Header scroll shadow toggle (rAF throttled, zero layout thrashing)
  const header = document.getElementById('main-header');
  let isScrolled = false;
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const shouldBeScrolled = window.scrollY > 20;
        if (shouldBeScrolled !== isScrolled) {
          isScrolled = shouldBeScrolled;
          if (header) {
            header.classList.toggle('scrolled', isScrolled);
          }
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // Initial cart load
  updateCartBadge();
  renderCartUI();
}

document.addEventListener('DOMContentLoaded', init);
