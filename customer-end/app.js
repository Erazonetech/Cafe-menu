import { getIllustration, getCategoryIcon, renderStarRating, computeOpenStatus, generateHoursSummary, UI_ICONS } from "./art.js";

const translations = {
  en: {
    cuisine: "AUTHENTIC ETHIOPIAN & CONTEMPORARY DINING",
    openNow: "Open Now · Closes at 10:00 PM",
    closed: "Closed · Opens at 8:00 AM",
    hours: "Mon - Sun | 8:00 AM - 10:00 PM",
    deliciousFood: "Artisanal flavors,<br />crafted with passion.",
    orderMenu: "Explore Menu",
    exploreMenu: "EXPLORE OUR SELECTION",
    allItems: "All items",
    madeFresh: "Made fresh daily at Bambis Cafe",
    menu: "Menu Categories",
    allCategories: "Select Category",
    allergies: "Dietary & Allergens",
    addToOrder: "Add to Order",
    viewOrder: "View Order",
    yourOrder: "Your Order",
    subtotal: "Subtotal",
    orderWhatsApp: "Send via WhatsApp",
    clearOrder: "Clear",
    add: "ADD",
    searchPlaceholder: "Search dishes, ingredients, drinks...",
    itemsFound: "items found",
    noMatches: "No dishes matched your search.",
    addedToOrder: "added to order",
    from: "from"
  },
  am: {
    cuisine: "ትክክለኛ የኢትዮጵያ እና ዘመናዊ የምግብ ዝግጅት",
    openNow: "አሁን ክፍት ነው · 4:00 ማታ ይዘጋል",
    closed: "ተዘግቷል · 2:00 ጠዋት ይከፈታል",
    hours: "ሰኞ - እሁድ | 2:00 ጠዋት - 4:00 ማታ",
    deliciousFood: "ጥራት ያለው ጣዕም፣<br />በፍቅር የተዘጋጀ።",
    orderMenu: "ምናሌውን ይመልከቱ",
    exploreMenu: "የተመረጡ ምግቦቻችን",
    allItems: "ሁሉም ምግቦች",
    madeFresh: "በየቀኑ ትኩስ የተዘጋጀ በባምቢስ ካፌ",
    menu: "የምግብ ምድቦች",
    allCategories: "ምድብ ይምረጡ",
    allergies: "አለርጂዎች እና ንጥረ ነገሮች",
    addToOrder: "ወደ ትዕዛዝ ጨምር",
    viewOrder: "ትዕዛዝ ይመልከቱ",
    yourOrder: "ትዕዛዝዎ",
    subtotal: "ድምር",
    orderWhatsApp: "በዋትስአፕ ይዘዙ",
    clearOrder: "አጥፋ",
    add: "ጨምር",
    searchPlaceholder: "ምግቦችን ወይም መጠጦችን ይፈልጉ...",
    itemsFound: "የተገኙ ምግቦች",
    noMatches: "ምንም የሚዛመድ ምግብ አልተገኘም።",
    addedToOrder: "ወደ ትዕዛዝዎ ተጨምሯል",
    from: "ከ"
  }
};

let siteConfig = window.__SITE_CONFIG__ || {
  currency: "ETB",
  brandName: "Bambis Cafe",
  hoursText: "Mon - Sun | 8:00 AM - 10:00 PM"
};
let menuData = window.__MENU_DATA__ || [];
let reviewsData = window.__REVIEWS_DATA__ || [];
let currentCategory = "all";
let searchQuery = "";
let cart = [];
let sheetItem = null;
let sheetQuantity = 1;

// Language handling
function getStoredLanguage() {
  try { return localStorage.getItem("bambis-language") || "en"; } catch { return "en"; }
}
let currentLang = getStoredLanguage();

// Theme handling
function getStoredTheme() {
  try { return localStorage.getItem("bambis-theme"); } catch { return null; }
}
function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try { localStorage.setItem("bambis-theme", theme || ""); } catch {}
}
const storedTheme = getStoredTheme();
if (storedTheme) applyTheme(storedTheme);

const themeToggle = document.querySelector("#theme-toggle");
themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const isDark = current === "dark" || (!current && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const nextTheme = isDark ? "light" : "dark";
  applyTheme(nextTheme);
});

// DOM Elements
const searchInput = document.querySelector("#search-input");
const searchClear = document.querySelector("#search-clear");
const categoryPills = document.querySelector("#category-pills");
const menuItemsContainer = document.querySelector("#menu-items");
const resultsCount = document.querySelector("#results-count");
const menuTitle = document.querySelector("#menu-title");

// Bottom Sheet Elements
const sheetBackdrop = document.querySelector("#sheet-backdrop");
const itemSheet = document.querySelector("#item-sheet");
const sheetClose = document.querySelector("#sheet-close");
const sheetMedia = document.querySelector("#sheet-media");
const sheetCategory = document.querySelector("#sheet-category");
const sheetTitle = document.querySelector("#sheet-title");
const sheetSubtitle = document.querySelector("#sheet-subtitle");
const sheetPrice = document.querySelector("#sheet-price");
const sheetBadges = document.querySelector("#sheet-badges");
const sheetDescription = document.querySelector("#sheet-description");
const sheetAllergiesBox = document.querySelector("#sheet-allergies-box");
const sheetAllergyChips = document.querySelector("#sheet-allergy-chips");
const stepperVal = document.querySelector("#stepper-val");
const stepperDec = document.querySelector("#stepper-dec");
const stepperInc = document.querySelector("#stepper-inc");
const sheetAddBtn = document.querySelector("#sheet-add-btn");
const sheetAddTotal = document.querySelector("#sheet-add-total");

// Floating Order Bar Elements
const orderBar = document.querySelector("#order-bar");
const orderBarCount = document.querySelector("#order-bar-count");
const orderBarTotal = document.querySelector("#order-bar-total");
const orderBarView = document.querySelector("#order-bar-view");
const topbarCartBtn = document.querySelector("#topbar-cart-btn");
const navCartCount = document.querySelector("#nav-cart-count");

// Cart Drawer Elements
const cartBackdrop = document.querySelector("#cart-backdrop");
const cartDrawer = document.querySelector("#cart-drawer");
const cartClose = document.querySelector("#cart-close");
const cartItemsContainer = document.querySelector("#cart-items");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartWhatsApp = document.querySelector("#cart-whatsapp");
const cartClear = document.querySelector("#cart-clear");

// Drawer Navigation Elements
const categoryDrawer = document.querySelector("#category-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const menuButton = document.querySelector("#menu-button");
const closeDrawerBtn = document.querySelector("#close-drawer");
const drawerCategories = document.querySelector("#drawer-categories");

// Language Elements
const languageButton = document.querySelector("#language-button");
const languageMenu = document.querySelector("#language-menu");
const currentLanguageText = document.querySelector("#current-language");
const languageOptions = [...document.querySelectorAll(".language-option")];

// Toast
const toast = document.querySelector("#toast");
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getText(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[currentLang] || obj.en || "";
}

function formatMoney(amountCents) {
  const currency = siteConfig.currency || "ETB";
  const num = (amountCents / 100).toFixed(2);
  return `${currency} ${num}`;
}

function getMinPriceCents(item) {
  if (!item.prices || !item.prices.length) return 0;
  return Math.min(...item.prices.map((p) => p.amountCents));
}

function renderCategoryPills() {
  if (!categoryPills) return;
  const t = translations[currentLang];
  const pills = [
    { id: "all", label: t.allItems, icon: "plate" },
    ...menuData.map((g) => ({ id: String(g.id), label: getText(g.name), icon: g.emoji || g.name?.en || "plate" }))
  ];

  categoryPills.innerHTML = pills.map((p) => `
    <button type="button" class="category-pill ${p.id === currentCategory ? "active" : ""}" data-category-id="${p.id}" role="tab" aria-selected="${p.id === currentCategory}">
      <span class="category-pill-icon">${getCategoryIcon(p.icon)}</span>
      <span>${p.label}</span>
    </button>
  `).join("");

  if (drawerCategories) {
    drawerCategories.innerHTML = pills.map((p) => `
      <button type="button" class="drawer-nav-item ${p.id === currentCategory ? "active" : ""}" data-category-id="${p.id}">
        <span class="category-pill-icon">${getCategoryIcon(p.icon)}</span>
        <span>${p.label}</span>
      </button>
    `).join("");
  }
}

function renderMenuItems() {
  if (!menuItemsContainer) return;
  const t = translations[currentLang];
  const q = searchQuery.trim().toLowerCase();

  const filteredGroups = menuData.map((group) => {
    if (currentCategory !== "all" && String(group.id) !== currentCategory) {
      return null;
    }
    const matchingItems = (group.items || []).filter((item) => {
      if (!q) return true;
      const en = (item.name?.en || "" + " " + item.description?.en || "").toLowerCase();
      const am = (item.name?.am || "" + " " + item.description?.am || "").toLowerCase();
      return en.includes(q) || am.includes(q);
    });
    return { ...group, items: matchingItems };
  }).filter(Boolean);

  let totalItemsCount = 0;
  filteredGroups.forEach((g) => { totalItemsCount += g.items.length; });

  if (resultsCount) {
    resultsCount.textContent = `${totalItemsCount} ${t.itemsFound}`;
  }

  if (totalItemsCount === 0) {
    menuItemsContainer.innerHTML = `<div class="empty-state" style="padding: 40px 0; text-align: center; color: var(--muted);">${t.noMatches}</div>`;
    return;
  }

  menuItemsContainer.innerHTML = filteredGroups.map((group) => {
    if (!group.items.length) return "";
    const groupName = getText(group.name);
    const groupNote = getText(group.note);

    const itemsHtml = group.items.map((item) => {
      const name = getText(item.name);
      const desc = getText(item.description);
      const minPrice = getMinPriceCents(item);
      const hasMultiplePrices = item.prices && item.prices.length > 1;
      const priceLabel = hasMultiplePrices
        ? `${t.from} ${formatMoney(minPrice)}`
        : formatMoney(minPrice);

      const mediaHtml = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${name}" loading="lazy">`
        : getIllustration(item, groupName);

      return `
        <article class="menu-item ${!item.isAvailable ? "sold-out" : ""}" data-item-id="${item.id}" data-group-id="${group.id}">
          <div class="food-image" aria-hidden="true">${mediaHtml}</div>
          <div class="item-copy">
            <div class="item-title-row">
              <h3>${name}</h3>
              ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ""}
            </div>
            <p class="item-desc">${desc}</p>
            <div class="item-action-row">
              <span class="price-display">${priceLabel}</span>
              ${item.isAvailable ? `
                <button type="button" class="btn-add" data-action="add" data-item-id="${item.id}" aria-label="Add ${name} to order">
                  <span>${t.add}</span> <span aria-hidden="true">＋</span>
                </button>
              ` : `
                <span class="sold-out-badge">Sold Out</span>
              `}
            </div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="group-block" id="group-${group.id}">
        <div class="category-divider">
          <div class="category-header-wrap">
            <span class="category-icon-wrapper">${getCategoryIcon(group.emoji || group.name?.en)}</span>
            <h2>${groupName}</h2>
          </div>
          ${groupNote ? `<p class="category-note">${groupNote}</p>` : ""}
        </div>
        <div class="category-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join("");
}

// Find item helper
function findItemById(id) {
  for (const group of menuData) {
    for (const item of (group.items || [])) {
      if (String(item.id) === String(id)) {
        return { item, group };
      }
    }
  }
  return null;
}

// Bottom Sheet logic
function openItemSheet(itemId) {
  const res = findItemById(itemId);
  if (!res) return;
  const { item, group } = res;
  sheetItem = item;
  sheetQuantity = 1;

  const name = getText(item.name);
  sheetTitle.textContent = name;
  sheetSubtitle.textContent = item.name?.am || "";
  sheetCategory.textContent = getText(group.name);
  sheetDescription.textContent = getText(item.description);

  sheetMedia.innerHTML = item.imageUrl
    ? `<img src="${item.imageUrl}" alt="${name}">`
    : getIllustration(item, getText(group.name));

  const minPrice = getMinPriceCents(item);
  sheetPrice.textContent = formatMoney(minPrice);

  if (item.badge) {
    sheetBadges.innerHTML = `<span class="item-badge">${item.badge}</span>`;
  } else {
    sheetBadges.innerHTML = "";
  }

  if (item.allergies && item.allergies.length) {
    sheetAllergiesBox.hidden = false;
    sheetAllergyChips.innerHTML = item.allergies.map((a) => `<span class="allergy-chip">${a}</span>`).join("");
  } else {
    sheetAllergiesBox.hidden = true;
  }

  stepperVal.textContent = "1";
  updateSheetTotal();

  itemSheet.hidden = false;
  sheetBackdrop.hidden = false;
  requestAnimationFrame(() => itemSheet.classList.add("open"));
}

function closeItemSheet() {
  itemSheet?.classList.remove("open");
  setTimeout(() => {
    if (itemSheet) itemSheet.hidden = true;
    if (sheetBackdrop) sheetBackdrop.hidden = true;
    sheetItem = null;
  }, 250);
}

function updateSheetQuantity(delta) {
  sheetQuantity = Math.max(1, sheetQuantity + delta);
  stepperVal.textContent = String(sheetQuantity);
  updateSheetTotal();
}

function updateSheetTotal() {
  if (!sheetItem) return;
  const unitCents = getMinPriceCents(sheetItem);
  sheetAddTotal.textContent = `· ${formatMoney(unitCents * sheetQuantity)}`;
}

// Cart & Order Bar
function addToCart(item, quantity = 1) {
  const existing = cart.find((i) => i.id === item.id);
  const unitCents = getMinPriceCents(item);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      priceCents: unitCents,
      quantity
    });
  }

  renderOrderBar();
  showToast(`${getText(item.name)} ${translations[currentLang].addedToOrder}`);
}

function updateCartQuantity(itemId, delta) {
  const item = cart.find((i) => String(i.id) === String(itemId));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((i) => String(i.id) !== String(itemId));
  }
  renderOrderBar();
  renderCartDrawer();
}

function renderOrderBar() {
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalCents = cart.reduce((sum, i) => sum + (i.priceCents * i.quantity), 0);

  if (navCartCount) {
    navCartCount.textContent = String(totalItems);
    navCartCount.classList.toggle("has-items", totalItems > 0);
  }

  if (!orderBar) return;
  if (totalItems > 0) {
    orderBar.hidden = false;
    orderBar.classList.add("visible");
    orderBarCount.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"}`;
    orderBarTotal.textContent = formatMoney(totalCents);
  } else {
    orderBar.classList.remove("visible");
    orderBar.hidden = true;
  }
}

function openCartDrawer() {
  renderCartDrawer();
  cartDrawer.hidden = false;
  cartBackdrop.hidden = false;
  requestAnimationFrame(() => cartDrawer.classList.add("open"));
}

function closeCartDrawer() {
  cartDrawer?.classList.remove("open");
  setTimeout(() => {
    if (cartDrawer) cartDrawer.hidden = true;
    if (cartBackdrop) cartBackdrop.hidden = true;
  }, 250);
}

function renderCartDrawer() {
  if (!cartItemsContainer) return;
  const totalCents = cart.reduce((sum, i) => sum + (i.priceCents * i.quantity), 0);
  if (cartSubtotal) cartSubtotal.textContent = formatMoney(totalCents);

  if (!cart.length) {
    cartItemsContainer.innerHTML = `<p style="text-align: center; color: var(--muted); padding: 24px 0;">No items in your order yet.</p>`;
    return;
  }

  cartItemsContainer.innerHTML = cart.map((i) => `
    <div class="cart-item-row" data-cart-id="${i.id}">
      <div class="cart-item-info">
        <strong>${getText(i.name)}</strong>
        <small>${formatMoney(i.priceCents)} each</small>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-stepper" style="padding: 2px;">
          <button type="button" class="stepper-btn" data-action="cart-dec" data-id="${i.id}" style="width: 28px; height: 28px; font-size: 14px;">−</button>
          <span style="min-width: 24px; text-align: center; font-weight: 700; font-size: 13px;">${i.quantity}</span>
          <button type="button" class="stepper-btn" data-action="cart-inc" data-id="${i.id}" style="width: 28px; height: 28px; font-size: 14px;">＋</button>
        </div>
      </div>
    </div>
  `).join("");
}

// WhatsApp Order Formatting
function sendOrderToWhatsApp() {
  if (!cart.length) return;
  const brand = siteConfig.brandName || "Bambis Cafe";
  const itemsText = cart.map((i) => `${i.quantity}x ${getText(i.name)} (${formatMoney(i.priceCents * i.quantity)})`).join("\n");
  const totalCents = cart.reduce((sum, i) => sum + (i.priceCents * i.quantity), 0);
  const msg = `Hello ${brand}!\nI would like to place an order:\n\n${itemsText}\n\nTotal: ${formatMoney(totalCents)}`;
  const phone = (siteConfig.whatsappNumber || "251993206426").replace(/[^0-9]/g, "");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// Drawer logic
function openDrawer() {
  categoryDrawer?.classList.add("open");
  drawerBackdrop?.classList.add("open");
  menuButton?.setAttribute("aria-expanded", "true");
}
function closeDrawer() {
  categoryDrawer?.classList.remove("open");
  drawerBackdrop?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
}

// Language switching
function setLanguage(lang) {
  if (lang !== "en" && lang !== "am") return;
  currentLang = lang;
  try { localStorage.setItem("bambis-language", lang); } catch {}
  document.documentElement.lang = lang;
  document.body.classList.toggle("amharic", lang === "am");
  if (currentLanguageText) currentLanguageText.textContent = lang === "en" ? "EN" : "አማ";

  const t = translations[lang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (t[key]) el.innerHTML = t[key];
  });

  if (searchInput) {
    searchInput.placeholder = t.searchPlaceholder;
  }

  languageOptions.forEach((opt) => {
    opt.setAttribute("aria-selected", String(opt.dataset.language === lang));
  });

  renderCategoryPills();
  renderMenuItems();
  renderOrderBar();
  languageMenu.hidden = true;
  updateStoreMeta();
}

// Scroll and banner helpers
function getStaticOffsetTop(element) {
  let top = 0;
  let current = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent;
  }
  return top;
}

function scrollToMenuTop() {
  const menuList = document.querySelector("#menu-list");
  const stickyNav = document.querySelector("#sticky-nav");
  const topbar = document.querySelector(".topbar");
  const topbarHeight = topbar ? topbar.offsetHeight : 64;

  if (menuList) {
    const navHeight = stickyNav ? stickyNav.offsetHeight : 0;
    const targetScrollY = Math.max(0, getStaticOffsetTop(menuList) - navHeight - topbarHeight);
    window.scrollTo({
      top: targetScrollY,
      behavior: "smooth"
    });
  } else if (stickyNav) {
    stickyNav.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function applyBannerState() {
  const heroBanner = document.querySelector(".hero-banner");
  if (!heroBanner) return;
  if (!siteConfig.bannerUrl) {
    heroBanner.classList.add("no-image");
    const img = heroBanner.querySelector("img");
    if (img) img.remove();
  }
}

// Dynamic Store Metadata & Opening Hours
function updateStoreMeta() {
  if (siteConfig.brandName) {
    const el = document.querySelector("#display-brand-name");
    if (el) el.textContent = siteConfig.brandName;
  }
  if (siteConfig.cuisineType) {
    const el = document.querySelector("#display-cuisine");
    if (el) el.textContent = siteConfig.cuisineType;
  }
  if (siteConfig.address) {
    const el = document.querySelector("#display-address");
    if (el) el.textContent = siteConfig.address;
    const footerEl = document.querySelector("#footer-address");
    if (footerEl) footerEl.textContent = siteConfig.address;
  }
  if (siteConfig.phone) {
    const el = document.querySelector("#display-phone");
    if (el) el.textContent = siteConfig.phone;
    const link = document.querySelector("#display-phone-link");
    if (link) link.href = `tel:${siteConfig.phone.replace(/[^0-9+]/g, "")}`;
  }

  // Display opening hours text
  const displayHours = document.querySelector("#display-hours");
  if (displayHours) {
    displayHours.textContent = siteConfig.hoursText || generateHoursSummary(siteConfig.schedule);
  }

  // Dynamic links to /about and /reviews respecting host and protocol
  const customerBase = (window.__CUSTOMER_URL__ || window.location.origin || "/").replace(/\/+$/, "");
  const aboutUrl = `${customerBase}/about`;
  const reviewsUrl = `${customerBase}/reviews`;
  const menuUrl = `${customerBase}/`;
  
  const drawerMenu = document.querySelector("#drawer-link-menu");
  if (drawerMenu) drawerMenu.href = menuUrl;

  const brandLink = document.querySelector("#topbar-brand-link");
  if (brandLink) brandLink.href = menuUrl;

  const drawerAbout = document.querySelector("#drawer-link-about");
  if (drawerAbout) drawerAbout.href = aboutUrl;

  const footerAbout = document.querySelector("#footer-link-about");
  if (footerAbout) footerAbout.href = aboutUrl;
  
  const drawerReviews = document.querySelector("#drawer-link-reviews");
  if (drawerReviews) drawerReviews.href = reviewsUrl;

  const footerReviews = document.querySelector("#footer-link-reviews");
  if (footerReviews) footerReviews.href = reviewsUrl;

  // Real-time open/closed status calculation
  const statusInfo = computeOpenStatus(siteConfig.schedule, siteConfig.timezone || "Africa/Addis_Ababa");
  const statusBadge = document.querySelector("#status-badge");
  const statusText = document.querySelector("#status-text");
  if (statusBadge && statusText) {
    statusText.textContent = statusInfo.text;
    statusBadge.className = `status-badge ${statusInfo.statusClass}`;
    const dot = statusBadge.querySelector(".status-dot");
    if (dot) {
      dot.className = statusInfo.isOpen ? "status-dot pulsing" : "status-dot";
      dot.style.background = statusInfo.isOpen ? "#10b981" : "#f59e0b";
    }
  }
}

// Keep status updated every 30 seconds
setInterval(updateStoreMeta, 30000);

// Weekly Schedule Modal
const chipHours = document.querySelector("#chip-hours");
const scheduleModal = document.querySelector("#schedule-modal");
const scheduleModalBackdrop = document.querySelector("#schedule-modal-backdrop");
const closeScheduleModalBtn = document.querySelector("#close-schedule-modal");
const customerScheduleList = document.querySelector("#customer-schedule-list");

function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hours12 = h % 12 || 12;
  return `${hours12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

function openScheduleModal() {
  if (!customerScheduleList) return;
  const schedule = Array.isArray(siteConfig.schedule) && siteConfig.schedule.length ? siteConfig.schedule : [];
  let todayName = "Monday";
  try {
    todayName = new Intl.DateTimeFormat("en-US", {
      timeZone: siteConfig.timezone || "Africa/Addis_Ababa",
      weekday: "long"
    }).format(new Date());
  } catch {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    todayName = dayNames[new Date().getDay()];
  }

  customerScheduleList.innerHTML = schedule.map((d) => {
    const isToday = d.day === todayName;
    const timeStr = d.isOpen ? `${formatTime12h(d.open)} - ${formatTime12h(d.close)}` : "Closed";
    return `
      <div class="customer-schedule-row ${isToday ? "today-row" : ""}">
        <span>${d.day} ${isToday ? "(Today)" : ""}</span>
        <span style="${!d.isOpen ? "color: var(--muted);" : ""}">${timeStr}</span>
      </div>
    `;
  }).join("");

  scheduleModal.hidden = false;
  scheduleModalBackdrop.hidden = false;
}

function closeScheduleModal() {
  scheduleModal.hidden = true;
  scheduleModalBackdrop.hidden = true;
}

chipHours?.addEventListener("click", openScheduleModal);
closeScheduleModalBtn?.addEventListener("click", closeScheduleModal);
scheduleModalBackdrop?.addEventListener("click", closeScheduleModal);

// Customer Reviews & Feedback
const reviewsContainer = document.querySelector("#customer-reviews-carousel");
const btnOpenReviewModal = document.querySelector("#btn-open-review-modal");
const reviewModal = document.querySelector("#review-modal");
const reviewModalBackdrop = document.querySelector("#review-modal-backdrop");
const closeReviewModalBtn = document.querySelector("#close-review-modal");
const customerReviewForm = document.querySelector("#customer-review-form");
const starPickerRow = document.querySelector("#star-picker-row");
const reviewRatingVal = document.querySelector("#review-rating-val");

function renderCustomerReviews() {
  if (!reviewsContainer) return;
  if (!reviewsData.length) {
    reviewsContainer.innerHTML = `<div style="grid-column: 1 / -1; color: var(--muted); padding: 20px; text-align: center;">No reviews yet. Be the first to share your experience!</div>`;
    return;
  }

  reviewsContainer.innerHTML = reviewsData.slice(0, 12).map((r) => {
    const dateStr = new Date(r.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `
      <div class="customer-review-card">
        <div class="customer-review-header">
          <span class="customer-review-author">${escapeHtml(r.authorName)}</span>
          <span class="customer-review-date">${dateStr}</span>
        </div>
        ${renderStarRating(r.rating, 14)}
        <p class="customer-review-comment">${escapeHtml(r.comment)}</p>
      </div>
    `;
  }).join("");
}

function renderStarPicker(activeRating = 5) {
  if (!starPickerRow) return;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= activeRating;
    html += `
      <button type="button" class="star-pick-btn" data-star="${i}" title="${i} stars">
        ${isFilled ? UI_ICONS.starFilled.replace('width="16"', 'width="24"').replace('height="16"', 'height="24"') : UI_ICONS.starEmpty.replace('width="16"', 'width="24"').replace('height="16"', 'height="24"')}
      </button>
    `;
  }
  starPickerRow.innerHTML = html;
}

starPickerRow?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-star]");
  if (!btn) return;
  const rating = Number(btn.dataset.star);
  reviewRatingVal.value = rating;
  renderStarPicker(rating);
});

function openReviewModal() {
  renderStarPicker(5);
  reviewRatingVal.value = "5";
  reviewModal.hidden = false;
  reviewModalBackdrop.hidden = false;
  document.querySelector("#review-author").focus();
}

function closeReviewModal() {
  reviewModal.hidden = true;
  reviewModalBackdrop.hidden = true;
}

btnOpenReviewModal?.addEventListener("click", openReviewModal);
closeReviewModalBtn?.addEventListener("click", closeReviewModal);
reviewModalBackdrop?.addEventListener("click", closeReviewModal);

customerReviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const authorName = document.querySelector("#review-author").value.trim();
  const rating = Number(reviewRatingVal.value) || 5;
  const comment = document.querySelector("#review-comment").value.trim();

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, rating, comment })
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Could not submit review");
    }
    const newReview = await res.json();
    reviewsData.unshift(newReview);
    renderCustomerReviews();
    closeReviewModal();
    customerReviewForm.reset();
    showToast("Thank you! Your review has been published.");
  } catch (err) {
    showToast(err.message);
  }
});

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Event Listeners
searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  if (searchClear) searchClear.hidden = !searchQuery;
  renderMenuItems();
});
searchClear?.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  searchClear.hidden = true;
  renderMenuItems();
  scrollToMenuTop();
  searchInput.focus();
});

categoryPills?.addEventListener("click", (e) => {
  const pill = e.target.closest("[data-category-id]");
  if (!pill) return;
  currentCategory = pill.dataset.categoryId;
  renderCategoryPills();
  renderMenuItems();
  scrollToMenuTop();
});

drawerCategories?.addEventListener("click", (e) => {
  const item = e.target.closest("[data-category-id]");
  if (!item) return;
  currentCategory = item.dataset.categoryId;
  renderCategoryPills();
  renderMenuItems();
  closeDrawer();
  scrollToMenuTop();
});

document.querySelector(".hero-cta")?.addEventListener("click", scrollToMenuTop);

menuItemsContainer?.addEventListener("click", (e) => {
  const addBtn = e.target.closest("[data-action='add']");
  if (addBtn) {
    e.stopPropagation();
    const res = findItemById(addBtn.dataset.itemId);
    if (res) addToCart(res.item, 1);
    return;
  }
  const itemCard = e.target.closest(".menu-item");
  if (itemCard) {
    openItemSheet(itemCard.dataset.itemId);
  }
});

sheetClose?.addEventListener("click", closeItemSheet);
sheetBackdrop?.addEventListener("click", closeItemSheet);
stepperDec?.addEventListener("click", () => updateSheetQuantity(-1));
stepperInc?.addEventListener("click", () => updateSheetQuantity(1));
sheetAddBtn?.addEventListener("click", () => {
  if (sheetItem) {
    addToCart(sheetItem, sheetQuantity);
    closeItemSheet();
  }
});

orderBarView?.addEventListener("click", openCartDrawer);
topbarCartBtn?.addEventListener("click", openCartDrawer);
cartClose?.addEventListener("click", closeCartDrawer);
cartBackdrop?.addEventListener("click", closeCartDrawer);
cartClear?.addEventListener("click", () => {
  cart = [];
  renderOrderBar();
  closeCartDrawer();
  showToast("Order cleared");
});
cartWhatsApp?.addEventListener("click", sendOrderToWhatsApp);

cartItemsContainer?.addEventListener("click", (e) => {
  const dec = e.target.closest("[data-action='cart-dec']");
  const inc = e.target.closest("[data-action='cart-inc']");
  if (dec) updateCartQuantity(dec.dataset.id, -1);
  if (inc) updateCartQuantity(inc.dataset.id, 1);
});

menuButton?.addEventListener("click", openDrawer);
closeDrawerBtn?.addEventListener("click", closeDrawer);
drawerBackdrop?.addEventListener("click", closeDrawer);

languageButton?.addEventListener("click", () => {
  languageMenu.hidden = !languageMenu.hidden;
});
languageOptions.forEach((opt) => {
  opt.addEventListener("click", () => setLanguage(opt.dataset.language));
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".language-picker") && languageMenu) {
    languageMenu.hidden = true;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeItemSheet();
    closeCartDrawer();
    closeDrawer();
    closeReviewModal();
    closeScheduleModal();
    if (languageMenu) languageMenu.hidden = true;
  }
});

// Initialize
applyBannerState();
updateStoreMeta();
setLanguage(currentLang);
renderCategoryPills();
renderMenuItems();
renderOrderBar();
renderCustomerReviews();
