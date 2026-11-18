import { getIllustration, getCategoryIcon, renderStarRating, renderMarkdown, htmlToMarkdown, generateHoursSummary, UI_ICONS } from "./art.js";

let siteConfig = window.__SITE_CONFIG__ || {};
let adminMenu = window.__ADMIN_MENU__ || [];
let palettes = window.__PALETTES__ || [];
let adminReviews = window.__ADMIN_REVIEWS__ || [];
let currentPaletteMode = "light";
let currentItemImage = null;
let reviewRatingFilter = "all";




const DEFAULT_SCHEDULE = [
  { day: "Monday", short: "Mon", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Tuesday", short: "Tue", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Wednesday", short: "Wed", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Thursday", short: "Thu", isOpen: true, open: "08:00", close: "22:00" },
  { day: "Friday", short: "Fri", isOpen: true, open: "08:00", close: "23:00" },
  { day: "Saturday", short: "Sat", isOpen: true, open: "09:00", close: "23:00" },
  { day: "Sunday", short: "Sun", isOpen: true, open: "09:00", close: "22:00" }
];

let scheduleData = Array.isArray(siteConfig.schedule) && siteConfig.schedule.length
  ? siteConfig.schedule
  : structuredClone(DEFAULT_SCHEDULE);

// Toast helper
const toastEl = document.querySelector("#admin-toast");
let toastTimer;
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// Format money
function formatMoney(amountCents) {
  const currency = siteConfig.currency || "ETB";
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

// Admin Theme Handling (Light / Dark segmented toggle)
function getAdminTheme() {
  try { return localStorage.getItem("bambis-admin-theme") || "light"; } catch { return "light"; }
}

function setAdminTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  try { localStorage.setItem("bambis-admin-theme", isDark ? "dark" : "light"); } catch {}

  const lightPill = document.querySelector("#theme-pill-light");
  const darkPill = document.querySelector("#theme-pill-dark");
  if (lightPill && darkPill) {
    lightPill.classList.toggle("active", !isDark);
    lightPill.setAttribute("aria-pressed", String(!isDark));
    darkPill.classList.toggle("active", isDark);
    darkPill.setAttribute("aria-pressed", String(isDark));
  }
}

setAdminTheme(getAdminTheme());

document.querySelector("#theme-pill-light")?.addEventListener("click", () => setAdminTheme("light"));
document.querySelector("#theme-pill-dark")?.addEventListener("click", () => setAdminTheme("dark"));

// Customer Website Link Navigation Fix
const viewStoreLink = document.querySelector("#view-store-link");
if (viewStoreLink) {
  viewStoreLink.href = window.__CUSTOMER_URL__ || "/customer";
}

// Refresh live preview iframe
function refreshPreview() {
  const iframe = document.querySelector("#customer-preview-iframe");
  if (iframe) {
    iframe.src = `/customer?preview=${Date.now()}`;
  }
}

// Tabs Navigation
const tabButtons = [...document.querySelectorAll(".tab-button")];
const tabPanels = [...document.querySelectorAll(".tab-panel")];

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.tab;
    tabButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    tabPanels.forEach((p) => {
      const active = p.id === targetId;
      p.classList.toggle("active", active);
      p.hidden = !active;
    });
    if (targetId === "tab-appearance") {
      refreshPreview();
    }
  });
});

// ==========================================
// TAB 1: MENU MANAGER
// ==========================================
const groupList = document.querySelector("#group-list");
const btnAddGroup = document.querySelector("#btn-add-group");

function renderMenuTab() {
  if (!groupList) return;
  if (!adminMenu.length) {
    groupList.innerHTML = `<div class="card-panel" style="text-align: center; color: var(--muted); padding: 40px;">No categories yet. Click "Add Category" to get started.</div>`;
    return;
  }

  groupList.innerHTML = adminMenu.map((group, groupIndex) => {
    const itemsHtml = (group.items || []).map((item, itemIndex) => {
      const minPrice = item.prices?.length ? Math.min(...item.prices.map((p) => p.amountCents)) : 0;
      const pricesDesc = item.prices?.length > 1
        ? `from ${formatMoney(minPrice)} (${item.prices.length} sizes)`
        : formatMoney(minPrice);

      const thumbHtml = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.name.en}">`
        :
        //  getIllustration(item, group.name.en);
        getIllustration(item, group.nameEn);

      return `
        <div class="admin-item-row" data-item-id="${item.id}">
          <div class="admin-item-thumb">${thumbHtml}</div>
          <div class="admin-item-info">
            <div class="admin-item-title-row">
              <strong>${item.nameEn}</strong>
              ${item.badge ? `<span class="toggle-badge" style="background: var(--chip); color: var(--accent);">${item.badge}</span>` : ""}
            </div>
            <p>${item.nameAm ? item.nameAm + " · " : ""}${pricesDesc}</p>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="toggle-badge ${item.isAvailable ? "available" : "sold-out"}" data-action="toggle-available" data-item-id="${item.id}">
              ${item.isAvailable ? "Available" : "Sold out"}
            </button>
            <button type="button" class="btn-small" data-action="edit-item" data-group-index="${groupIndex}" data-item-index="${itemIndex}">
              ${UI_ICONS.edit} <span>Edit</span>
            </button>
            <button type="button" class="btn-small" data-action="duplicate-item" data-item-id="${item.id}" title="Duplicate item">
              ${UI_ICONS.copy} <span>Duplicate</span>
            </button>
          </div>
        </div>
      `;
    }).join("");

    const categoryIconSvg = getCategoryIcon(group.emoji || "plate");

    return `
      <article class="category-card" data-group-id="${group.id}">
        <header class="category-header">
          <div class="category-info">
            <span class="category-svg-icon" style="display:grid;place-items:center;width:34px;height:34px;background:var(--surface);border-radius:var(--radius-sm);color:var(--accent);">${categoryIconSvg}</span>
            <div class="category-titles">
              <h3>${group.nameEn}</h3>
              <small>${group.nameAm || ""} ${group.noteEn ? `· ${group.noteEn}` : ""}</small>
            </div>
          </div>
          <div class="category-actions">
            <button type="button" class="btn-small" data-action="move-group-up" data-group-id="${group.id}" ${groupIndex === 0 ? "disabled" : ""} title="Move Up">${UI_ICONS.arrowUp}</button>
            <button type="button" class="btn-small" data-action="move-group-down" data-group-id="${group.id}" ${groupIndex === adminMenu.length - 1 ? "disabled" : ""} title="Move Down">${UI_ICONS.arrowDown}</button>
            <button type="button" class="btn-primary" style="padding: 6px 14px; font-size: 12px;" data-action="add-item" data-group-id="${group.id}">${UI_ICONS.plus} <span>Add Item</span></button>
            <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" data-action="edit-group" data-group-index="${groupIndex}">${UI_ICONS.edit} <span>Edit</span></button>
          </div>
        </header>
        <div class="category-items">
          ${itemsHtml || '<div style="padding: 20px; color: var(--muted); text-align: center;">No items in this category yet.</div>'}
        </div>
      </article>
    `;
  }).join("");
}

// Menu interactions
groupList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "toggle-available") {
    const itemId = btn.dataset.itemId;
    const isAvailable = btn.classList.contains("sold-out");
    try {
      const res = await fetch(`/api/admin/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable })
      });
      if (!res.ok) throw new Error("Could not update availability");
      for (const group of adminMenu) {
        for (const item of (group.items || [])) {
          if (String(item.id) === String(itemId)) {
            item.isAvailable = isAvailable;
          }
        }
      }
      renderMenuTab();
      refreshPreview();
      showToast(isAvailable ? "Item marked available" : "Item marked sold out");
    } catch (err) {
      showToast(err.message);
    }
  }

  if (action === "add-item") {
    openItemModal(btn.dataset.groupId);
  }

  if (action === "edit-item") {
    const groupIdx = Number(btn.dataset.groupIndex);
    const itemIdx = Number(btn.dataset.itemIndex);
    const item = adminMenu[groupIdx].items[itemIdx];
    openItemModal(adminMenu[groupIdx].id, item);
  }

  if (action === "duplicate-item") {
    const itemId = btn.dataset.itemId;
    try {
      const res = await fetch(`/api/admin/duplicate-item/${itemId}`, { method: "POST" });
      if (!res.ok) throw new Error("Could not duplicate item");
      const menuRes = await fetch("/api/admin/menu");
      adminMenu = await menuRes.json();
      renderMenuTab();
      refreshPreview();
      showToast("Item duplicated successfully");
    } catch (err) {
      showToast(err.message);
    }
  }

  if (action === "move-group-up" || action === "move-group-down") {
    const groupId = Number(btn.dataset.groupId);
    const idx = adminMenu.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    const targetIdx = action === "move-group-up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= adminMenu.length) return;

    const temp = adminMenu[idx];
    adminMenu[idx] = adminMenu[targetIdx];
    adminMenu[targetIdx] = temp;

    renderMenuTab();
    try {
      await fetch("/api/admin/groups/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: adminMenu.map((g) => g.id) })
      });
      refreshPreview();
    } catch (err) {
      showToast("Could not save category order");
    }
  }

  if (action === "edit-group") {
    const groupIdx = Number(btn.dataset.groupIndex);
    openGroupModal(adminMenu[groupIdx]);
  }
});

// ==========================================
// ITEM EDITOR MODAL
// ==========================================
const itemModalBackdrop = document.querySelector("#item-modal-backdrop");
const itemEditorModal = document.querySelector("#item-editor-modal");
const closeItemModalBtn = document.querySelector("#close-item-modal");
const cancelItemBtn = document.querySelector("#btn-cancel-item");
const deleteItemBtn = document.querySelector("#btn-delete-item");
const duplicateItemBtn = document.querySelector("#btn-duplicate-item");
const itemEditorForm = document.querySelector("#item-editor-form");
const itemGroupSelect = document.querySelector("#item-group-select");
const priceRowsContainer = document.querySelector("#price-rows-container");
const btnAddPrice = document.querySelector("#btn-add-price");
const itemImageFile = document.querySelector("#item-image-file");
const itemThumbPreview = document.querySelector("#item-thumb-preview");
const itemModalTitle = document.querySelector("#item-modal-title");

function renderPriceRow(label = "Regular", amountCents = 0) {
  const row = document.createElement("div");
  row.className = "price-row";
  row.innerHTML = `
    <input type="text" class="price-row-label" placeholder="Portion (e.g. Regular, Large)" value="${label}" required />
    <input type="number" step="0.01" min="0" class="price-row-amount" placeholder="Price (ETB)" value="${(amountCents / 100).toFixed(2)}" required />
    <button type="button" class="remove-price-btn" title="Remove size">✕</button>
  `;
  row.querySelector(".remove-price-btn").addEventListener("click", () => {
    if (priceRowsContainer.children.length > 1) {
      row.remove();
    } else {
      showToast("An item must have at least one price row.");
    }
  });
  priceRowsContainer.appendChild(row);
}

function readPriceRows() {
  const rows = [...priceRowsContainer.querySelectorAll(".price-row")];
  return rows.map((r, i) => {
    const label = r.querySelector(".price-row-label").value.trim() || "Regular";
    const amountFloat = parseFloat(r.querySelector(".price-row-amount").value) || 0;
    const amountCents = Math.round(amountFloat * 100);
    return { label, amountCents, sortOrder: i };
  });
}

function openItemModal(groupId, item = null) {
  itemGroupSelect.innerHTML = adminMenu.map((g) => `
    <option value="${g.id}" ${String(g.id) === String(groupId) ? "selected" : ""}>${g.nameEn}</option>
  `).join("");

  document.querySelector("#edit-item-id").value = item ? item.id : "";
  itemModalTitle.textContent = item ? "Edit Dish" : "Add Dish";
  document.querySelector("#item-name-en").value = item?.name?.en || "";
  document.querySelector("#item-name-am").value = item?.name?.am || "";
  document.querySelector("#item-desc-en").value = item?.description?.en || "";
  document.querySelector("#item-desc-am").value = item?.description?.am || "";
  document.querySelector("#item-badge").value = item?.badge || "";
  document.querySelector("#item-placeholder-kind").value = item?.placeholderKind || "plate";
  document.querySelector("#item-is-available").checked = item ? item.isAvailable : true;
  document.querySelector("#item-is-visible").checked = item ? item.isVisible !== false : true;
  document.querySelector("#item-allergies-input").value = (item?.allergies || []).join(", ");

  currentItemImage = item?.imageUrl || null;
  itemThumbPreview.innerHTML = currentItemImage ? `<img src="${currentItemImage}" alt="Current image">` : "";

  priceRowsContainer.innerHTML = "";
  if (item && item.prices && item.prices.length) {
    item.prices.forEach((p) => renderPriceRow(p.label, p.amountCents));
  } else {
    renderPriceRow("Regular", 50000);
  }

  deleteItemBtn.hidden = !item;
  duplicateItemBtn.hidden = !item;
  itemModalBackdrop.hidden = false;
  itemEditorModal.hidden = false;
  document.querySelector("#item-name-en").focus();
}

function closeItemModal() {
  itemModalBackdrop.hidden = true;
  itemEditorModal.hidden = true;
  itemImageFile.value = "";
}

btnAddPrice?.addEventListener("click", () => renderPriceRow("Large", 0));
closeItemModalBtn?.addEventListener("click", closeItemModal);
cancelItemBtn?.addEventListener("click", closeItemModal);
itemModalBackdrop?.addEventListener("click", closeItemModal);

itemImageFile?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: reader.result })
      });

      let json;

       const responseText = await res.text();


      try {
        json = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || "Invalid server response");
      }

      if (!res.ok) {
        console.error("Image upload error:", json);
        throw new Error(json.error || json.message || "Image upload failed");
      }

      // const json = await res.json();

      currentItemImage = json.url;
      itemThumbPreview.innerHTML = `<img src="${currentItemImage}" alt="Uploaded preview">`;
      showToast("Photo uploaded successfully");
    } catch (err) {
      showToast(err.message);
    }
  };
  reader.readAsDataURL(file);
});

itemEditorForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.querySelector("#edit-item-id").value;
  const prices = readPriceRows();
  if (!prices.length) {
    showToast("Please provide at least one price row.");
    return;
  }

  const payload = {
    groupId: Number(itemGroupSelect.value),
    nameEn: document.querySelector("#item-name-en").value.trim(),
    nameAm: document.querySelector("#item-name-am").value.trim(),
    descriptionEn: document.querySelector("#item-desc-en").value.trim(),
    descriptionAm: document.querySelector("#item-desc-am").value.trim(),
    badge: document.querySelector("#item-badge").value.trim(),
    placeholderKind: document.querySelector("#item-placeholder-kind").value,
    imageUrl: currentItemImage,
    isAvailable: document.querySelector("#item-is-available").checked,
    isVisible: document.querySelector("#item-is-visible").checked,
    allergies: document.querySelector("#item-allergies-input").value.split(",").map((s) => s.trim()).filter(Boolean),
    prices
  };

  try {
    const url = id ? `/api/admin/items/${id}` : "/api/admin/items";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Could not save item");

    const menuRes = await fetch("/api/admin/menu");
    adminMenu = await menuRes.json();
    renderMenuTab();
    closeItemModal();
    refreshPreview();
    showToast(id ? "Dish updated" : "Dish added");
  } catch (err) {
    showToast(err.message);
  }
});

deleteItemBtn?.addEventListener("click", async () => {
  const id = document.querySelector("#edit-item-id").value;
  if (!id || !confirm("Are you sure you want to delete this dish?")) return;
  try {
    const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Could not delete item");
    const menuRes = await fetch("/api/admin/menu");
    adminMenu = await menuRes.json();
    renderMenuTab();
    closeItemModal();
    refreshPreview();
    showToast("Item deleted");
  } catch (err) {
    showToast(err.message);
  }
});

duplicateItemBtn?.addEventListener("click", async () => {
  const id = document.querySelector("#edit-item-id").value;
  if (!id) return;
  try {
    const res = await fetch(`/api/admin/duplicate-item/${id}`, { method: "POST" });
    if (!res.ok) throw new Error("Could not duplicate item");
    const menuRes = await fetch("/api/admin/menu");
    adminMenu = await menuRes.json();
    renderMenuTab();
    closeItemModal();
    refreshPreview();
    showToast("Item duplicated");
  } catch (err) {
    showToast(err.message);
  }
});

// ==========================================
// GROUP EDITOR MODAL
// ==========================================
const groupModalBackdrop = document.querySelector("#group-modal-backdrop");
const groupEditorModal = document.querySelector("#group-editor-modal");
const closeGroupModalBtn = document.querySelector("#close-group-modal");
const cancelGroupBtn = document.querySelector("#btn-cancel-group");
const deleteGroupBtn = document.querySelector("#btn-delete-group");
const groupEditorForm = document.querySelector("#group-editor-form");
const groupModalTitle = document.querySelector("#group-modal-title");

function openGroupModal(group = null) {
  document.querySelector("#edit-group-id").value = group ? group.id : "";
  groupModalTitle.textContent = group ? "Edit Category" : "Add Category";
  document.querySelector("#group-name-en").value = group?.name?.en || "";
  document.querySelector("#group-name-am").value = group?.name?.am || "";
  document.querySelector("#group-note-en").value = group?.note?.en || "";
  document.querySelector("#group-note-am").value = group?.note?.am || "";
  document.querySelector("#group-emoji").value = group?.emoji || "plate";
  document.querySelector("#group-is-visible").checked = group ? group.isVisible : true;

  deleteGroupBtn.hidden = !group;
  groupModalBackdrop.hidden = false;
  groupEditorModal.hidden = false;
  document.querySelector("#group-name-en").focus();
}

function closeGroupModal() {
  groupModalBackdrop.hidden = true;
  groupEditorModal.hidden = true;
}

btnAddGroup?.addEventListener("click", () => openGroupModal(null));
closeGroupModalBtn?.addEventListener("click", closeGroupModal);
cancelGroupBtn?.addEventListener("click", closeGroupModal);
groupModalBackdrop?.addEventListener("click", closeGroupModal);



groupEditorForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.querySelector("#edit-group-id").value;
  const payload = {
    nameEn: document.querySelector("#group-name-en").value.trim(),
    nameAm: document.querySelector("#group-name-am").value.trim(),
    noteEn: document.querySelector("#group-note-en").value.trim(),
    noteAm: document.querySelector("#group-note-am").value.trim(),
    emoji: document.querySelector("#group-emoji").value.trim() || "plate",
    isVisible: document.querySelector("#group-is-visible").checked
  };

  try {
    const url = id ? `/api/admin/groups/${id}` : "/api/admin/groups";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Could not save category");
    const menuRes = await fetch("/api/admin/menu");

    adminMenu = await menuRes.json();
    
   console.log("MENU DATA:", JSON.stringify(adminMenu, null, 2));
    console.log("Updated adminMenu:", adminMenu);
    console.log("First group:", adminMenu.groups?.[0]);
    
    renderMenuTab();
    closeGroupModal();
    refreshPreview();
    showToast("Category saved");
  } catch (err) {
    showToast(err.message);
    console.log('Category error')
  }

});

deleteGroupBtn?.addEventListener("click", async () => {
  const id = document.querySelector("#edit-group-id").value;
  if (!id || !confirm("Are you sure you want to delete this category?")) return;
  try {
    const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Could not delete category");
    }
    const menuRes = await fetch("/api/admin/menu");
    adminMenu = await menuRes.json();
    renderMenuTab();
    closeGroupModal();
    refreshPreview();
    showToast("Category deleted");
  } catch (err) {
    showToast(err.message);
  }
});

// ==========================================
// TAB 2: REVIEWS MANAGER
// ==========================================
const adminReviewsList = document.querySelector("#admin-reviews-list");
const reviewsStatsSummary = document.querySelector("#reviews-stats-summary");
const reviewsRatingFilters = document.querySelector("#reviews-rating-filters");

function renderReviewsTab() {
  if (!adminReviewsList) return;

  const total = adminReviews.length;
  const avg = total > 0 ? (adminReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / total).toFixed(1) : "5.0";

  if (reviewsStatsSummary) {
    reviewsStatsSummary.innerHTML = `
      <div class="stat-badge">
        <span style="color: #f59e0b; display: inline-flex; align-items: center; gap: 4px;">
          ${UI_ICONS.starFilled}
          <span>${avg} / 5.0</span>
        </span>
        <span style="color: var(--muted);">(${total} ${total === 1 ? "review" : "reviews"})</span>
      </div>
    `;
  }

  const filtered = adminReviews.filter((r) => {
    if (reviewRatingFilter === "all") return true;
    return String(r.rating) === String(reviewRatingFilter);
  });

  if (!filtered.length) {
    adminReviewsList.innerHTML = `
      <div class="card-panel" style="text-align: center; color: var(--muted); padding: 40px;">
        No reviews matching the selected filter.
      </div>
    `;
    return;
  }

  adminReviewsList.innerHTML = filtered.map((r) => {
    const dateFormatted = new Date(r.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    return `
      <article class="admin-review-card ${!r.isVisible ? "hidden-review" : ""}" data-review-id="${r.id}">
        <div class="review-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="review-author">${escapeHtml(r.authorName)}</span>
            ${renderStarRating(r.rating, 14)}
          </div>
          <span class="review-date">${dateFormatted}</span>
        </div>
        <div class="review-comment">${escapeHtml(r.comment)}</div>
        <div class="review-footer">
          <span class="${r.isVisible ? "status-pill-visible" : "status-pill-hidden"}">
            ${r.isVisible ? "Visible to customers" : "Hidden"}
          </span>
          <div class="review-actions">
            <button type="button" class="btn-small" data-action="toggle-review-visibility" data-review-id="${r.id}" title="${r.isVisible ? "Hide review" : "Make visible"}">
              ${r.isVisible ? UI_ICONS.eyeOff : UI_ICONS.eye}
              <span>${r.isVisible ? "Hide" : "Show"}</span>
            </button>
            <button type="button" class="btn-danger" style="padding: 5px 10px; font-size: 11px;" data-action="delete-review" data-review-id="${r.id}" title="Delete review">
              ${UI_ICONS.trash} <span>Delete</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

reviewsRatingFilters?.addEventListener("click", (e) => {
  const pill = e.target.closest("[data-rating-filter]");
  if (!pill) return;
  reviewRatingFilter = pill.dataset.ratingFilter;
  [...reviewsRatingFilters.children].forEach((c) => c.classList.toggle("active", c === pill));
  renderReviewsTab();
});

adminReviewsList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const reviewId = btn.dataset.reviewId;
  const review = adminReviews.find((r) => String(r.id) === String(reviewId));
  if (!review) return;

  if (action === "toggle-review-visibility") {
    const nextVisible = !review.isVisible;
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: nextVisible })
      });
      if (!res.ok) throw new Error("Could not update review visibility");
      review.isVisible = nextVisible;
      renderReviewsTab();
      refreshPreview();
      showToast(nextVisible ? "Review is now visible" : "Review hidden from customers");
    } catch (err) {
      showToast(err.message);
    }
  }

  if (action === "delete-review") {
    if (!confirm("Are you sure you want to delete this customer review?")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete review");
      adminReviews = adminReviews.filter((r) => String(r.id) !== String(reviewId));
      renderReviewsTab();
      refreshPreview();
      showToast("Review deleted");
    } catch (err) {
      showToast(err.message);
    }
  }
});

// Escape HTML helper
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ==========================================
// TAB 3: APPEARANCE & BRANDING & INFO
// ==========================================
const cfgBrandName = document.querySelector("#cfg-brand-name");
const cfgCurrency = document.querySelector("#cfg-currency");
const cfgTagline = document.querySelector("#cfg-tagline");
const cfgCuisine = document.querySelector("#cfg-cuisine");
const cfgAddress = document.querySelector("#cfg-address");
const cfgPhone = document.querySelector("#cfg-phone");
const cfgWhatsapp = document.querySelector("#cfg-whatsapp");
const cfgEmail = document.querySelector("#cfg-email");
const cfgHours = document.querySelector("#cfg-hours");
const cfgTimezone = document.querySelector("#cfg-timezone");
const tzLiveHint = document.querySelector("#tz-live-hint");
const cfgFontPair = document.querySelector("#cfg-font-pair");
const cfgAboutEditor = document.querySelector("#cfg-about-editor");
const cfgAboutMarkdown = document.querySelector("#cfg-about-markdown");
const btnMdVisual = document.querySelector("#btn-md-visual");
const btnMdRaw = document.querySelector("#btn-md-raw");
const mdStatsBadge = document.querySelector("#md-stats-badge");
const markdownToolbar = document.querySelector("#markdown-toolbar");
const btnPreviewAboutLink = document.querySelector("#btn-preview-about-link");
const bannerPreview = document.querySelector("#banner-preview");
const bannerFileInput = document.querySelector("#banner-file-input");
const btnRemoveBanner = document.querySelector("#btn-remove-banner");
const palettesGrid = document.querySelector("#palettes-grid");
const btnSaveAppearance = document.querySelector("#btn-save-appearance");
const reloadPreviewBtn = document.querySelector("#reload-preview");

const scheduleEditorGrid = document.querySelector("#schedule-editor-grid");
const btnSchedStandard = document.querySelector("#btn-sched-standard");
const btnSchedWeekends = document.querySelector("#btn-sched-weekends");

const previewModeLight = document.querySelector("#preview-mode-light");
const previewModeDark = document.querySelector("#preview-mode-dark");
const colorAccent = document.querySelector("#color-accent");
const colorBg = document.querySelector("#color-bg");
const colorSurface = document.querySelector("#color-surface");
const colorInk = document.querySelector("#color-ink");

let selectedPaletteId = siteConfig.paletteId || "espresso";
let paletteOverrides = siteConfig.paletteOverrides || {};

function renderScheduleEditor() {
  if (!scheduleEditorGrid) return;
  scheduleEditorGrid.innerHTML = scheduleData.map((d, index) => {
    return `
      <div class="schedule-row" data-day-index="${index}">
        <label class="schedule-day-label">
          <input type="checkbox" class="schedule-is-open" ${d.isOpen ? "checked" : ""} />
          <span>${d.day}</span>
        </label>
        <div class="schedule-times">
          <input type="time" class="time-input schedule-open-time" value="${d.open || "08:00"}" ${!d.isOpen ? "disabled" : ""} />
          <span style="color: var(--muted); font-size: 12px;">to</span>
          <input type="time" class="time-input schedule-close-time" value="${d.close || "22:00"}" ${!d.isOpen ? "disabled" : ""} />
        </div>
        <span class="schedule-status-badge ${d.isOpen ? "open" : "closed"}">
          ${d.isOpen ? "Open" : "Closed"}
        </span>
      </div>
    `;
  }).join("");
}

function handleScheduleRowChange(e) {
  const row = e.target.closest(".schedule-row");
  if (!row) return;
  const idx = Number(row.dataset.dayIndex);
  const dayConfig = scheduleData[idx];
  if (!dayConfig) return;

  const isOpen = row.querySelector(".schedule-is-open").checked;
  const openInput = row.querySelector(".schedule-open-time");
  const closeInput = row.querySelector(".schedule-close-time");
  const badge = row.querySelector(".schedule-status-badge");

  openInput.disabled = !isOpen;
  closeInput.disabled = !isOpen;

  if (badge) {
    badge.className = `schedule-status-badge ${isOpen ? "open" : "closed"}`;
    badge.textContent = isOpen ? "Open" : "Closed";
  }

  dayConfig.isOpen = isOpen;
  dayConfig.open = openInput.value;
  dayConfig.close = closeInput.value;

  if (cfgHours) {
    cfgHours.value = generateHoursSummary(scheduleData);
  }
}

scheduleEditorGrid?.addEventListener("input", handleScheduleRowChange);
scheduleEditorGrid?.addEventListener("change", handleScheduleRowChange);

btnSchedStandard?.addEventListener("click", () => {
  scheduleData.forEach((d) => {
    d.isOpen = true;
    d.open = "08:00";
    d.close = "22:00";
  });
  renderScheduleEditor();
  if (cfgHours) cfgHours.value = generateHoursSummary(scheduleData);
  showToast("Standard schedule applied");
});

btnSchedWeekends?.addEventListener("click", () => {
  scheduleData.forEach((d) => {
    d.isOpen = true;
    if (["Saturday", "Sunday"].includes(d.day)) {
      d.open = "09:00";
      d.close = "23:00";
    } else {
      d.open = "08:00";
      d.close = "22:00";
    }
  });
  renderScheduleEditor();
  if (cfgHours) cfgHours.value = generateHoursSummary(scheduleData);
  showToast("Weekend extension schedule applied");
});

function updateTimezoneHint() {
  if (!tzLiveHint || !cfgTimezone) return;
  const tz = cfgTimezone.value || "Africa/Addis_Ababa";
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
    tzLiveHint.textContent = `Current time in ${tz}: ${formatted}`;
  } catch {
    tzLiveHint.textContent = "";
  }
}

cfgTimezone?.addEventListener("change", updateTimezoneHint);
setInterval(updateTimezoneHint, 1000);

function populateAppearanceForm() {
  if (cfgBrandName) cfgBrandName.value = siteConfig.brandName || "";
  if (cfgCurrency) cfgCurrency.value = siteConfig.currency || "ETB";
  if (cfgTagline) cfgTagline.value = siteConfig.tagline || "";
  if (cfgCuisine) cfgCuisine.value = siteConfig.cuisineType || "";
  if (cfgAddress) cfgAddress.value = siteConfig.address || "";
  if (cfgPhone) cfgPhone.value = siteConfig.phone || "";
  if (cfgWhatsapp) cfgWhatsapp.value = siteConfig.whatsappNumber || "";
  if (cfgEmail) cfgEmail.value = siteConfig.email || "";
  if (cfgHours) cfgHours.value = siteConfig.hoursText || "";
  if (cfgTimezone) cfgTimezone.value = siteConfig.timezone || "Africa/Addis_Ababa";
  updateTimezoneHint();
  if (cfgFontPair) cfgFontPair.value = siteConfig.fontPair || "Fraunces / Plus Jakarta Sans";
  const initialMd = siteConfig.aboutMarkdown || "";
  if (cfgAboutMarkdown) cfgAboutMarkdown.value = initialMd;
  if (cfgAboutEditor) cfgAboutEditor.innerHTML = renderMarkdown(initialMd);
  setEditorMode("visual");
  updateEditorStats();
  if (btnPreviewAboutLink) {
    const custBase = window.__CUSTOMER_URL__ || "/customer";
    btnPreviewAboutLink.href = custBase.endsWith("/") ? `${custBase}about` : `${custBase}/about`;
  }

  renderScheduleEditor();
  renderBannerPreview();
  renderPalettesGrid();
  updateColorPickersFromActive();
}

function renderBannerPreview() {
  if (!bannerPreview) return;
  bannerPreview.innerHTML = siteConfig.bannerUrl
    ? `<img src="${siteConfig.bannerUrl}" alt="Banner Preview">`
    : `<div style="display:grid;place-items:center;height:100%;color:#fff;font-weight:700;">No banner image</div>`;
  if (btnRemoveBanner) {
    btnRemoveBanner.style.display = siteConfig.bannerUrl ? "inline-flex" : "none";
  }
}

function renderPalettesGrid() {
  if (!palettesGrid) return;
  palettesGrid.innerHTML = palettes.map((p) => {
    const mode = currentPaletteMode;
    const colors = p[mode] || p.light;
    const isSelected = p.id === selectedPaletteId;

    return `
      <div class="palette-card ${isSelected ? "selected" : ""}" data-palette-id="${p.id}">
        <div class="palette-swatches">
          <span style="background: ${colors.bg};"></span>
          <span style="background: ${colors.surface};"></span>
          <span style="background: ${colors.accent};"></span>
          <span style="background: ${colors.ink};"></span>
        </div>
        <div class="palette-name">${p.name}</div>
      </div>
    `;
  }).join("");
}

function updateColorPickersFromActive() {
  const p = palettes.find((pal) => pal.id === selectedPaletteId) || palettes[0];
  if (!p) return;
  const colors = p[currentPaletteMode] || p.light;
  const overrides = (paletteOverrides[currentPaletteMode] || {});

  if (colorAccent) colorAccent.value = overrides.accent || colors.accent || "#d97706";
  if (colorBg) colorBg.value = overrides.bg || colors.bg || "#faf7f2";
  if (colorSurface) colorSurface.value = overrides.surface || colors.surface || "#ffffff";
  if (colorInk) colorInk.value = overrides.ink || colors.ink || "#1d1a17";
}

palettesGrid?.addEventListener("click", (e) => {
  const card = e.target.closest(".palette-card");
  if (!card) return;
  selectedPaletteId = card.dataset.paletteId;
  paletteOverrides = {};
  renderPalettesGrid();
  updateColorPickersFromActive();
});

previewModeLight?.addEventListener("click", () => {
  currentPaletteMode = "light";
  previewModeLight.classList.add("active");
  previewModeDark.classList.remove("active");
  renderPalettesGrid();
  updateColorPickersFromActive();
});

previewModeDark?.addEventListener("click", () => {
  currentPaletteMode = "dark";
  previewModeDark.classList.add("active");
  previewModeLight.classList.remove("active");
  renderPalettesGrid();
  updateColorPickersFromActive();
});

colorAccent?.addEventListener("input", (e) => {
  if (!paletteOverrides[currentPaletteMode]) paletteOverrides[currentPaletteMode] = {};
  paletteOverrides[currentPaletteMode].accent = e.target.value;
});
colorBg?.addEventListener("input", (e) => {
  if (!paletteOverrides[currentPaletteMode]) paletteOverrides[currentPaletteMode] = {};
  paletteOverrides[currentPaletteMode].bg = e.target.value;
});
colorSurface?.addEventListener("input", (e) => {
  if (!paletteOverrides[currentPaletteMode]) paletteOverrides[currentPaletteMode] = {};
  paletteOverrides[currentPaletteMode].surface = e.target.value;
});
colorInk?.addEventListener("input", (e) => {
  if (!paletteOverrides[currentPaletteMode]) paletteOverrides[currentPaletteMode] = {};
  paletteOverrides[currentPaletteMode].ink = e.target.value;
});

bannerFileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: reader.result })
      });
      if (!res.ok) throw new Error("Banner upload failed");
      const json = await res.json();
      siteConfig.bannerUrl = json.url;
      renderBannerPreview();
      showToast("Banner image updated");
    } catch (err) {
      showToast(err.message);
    }
  };
  reader.readAsDataURL(file);
});

btnRemoveBanner?.addEventListener("click", async () => {
  siteConfig.bannerUrl = "";
  if (bannerFileInput) bannerFileInput.value = "";
  renderBannerPreview();
  try {
    const res = await fetch("/api/admin/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerUrl: "" })
    });
    if (!res.ok) throw new Error("Could not clear banner on server");
    refreshPreview();
    showToast("Banner image removed");
  } catch (err) {
    showToast("Banner image cleared in editor. Click 'Save All Changes' to apply.");
  }
});

function insertMarkdown(prefix, suffix = "", defaultText = "") {
  if (currentEditorMode === "visual") return;
  if (!cfgAboutMarkdown) return;
  const start = cfgAboutMarkdown.selectionStart;
  const end = cfgAboutMarkdown.selectionEnd;
  const val = cfgAboutMarkdown.value;
  const selected = val.substring(start, end) || defaultText;
  const replacement = prefix + selected + suffix;
  cfgAboutMarkdown.value = val.substring(0, start) + replacement + val.substring(end);
  const nextPos = start + prefix.length + selected.length;
  cfgAboutMarkdown.focus();
  cfgAboutMarkdown.setSelectionRange(start + prefix.length, nextPos);
  updateEditorStats();
}

let currentEditorMode = "visual"; // "visual" | "raw"

function getMarkdownContent() {
  if (currentEditorMode === "visual" && cfgAboutEditor) {
    return htmlToMarkdown(cfgAboutEditor.innerHTML);
  }
  return cfgAboutMarkdown ? cfgAboutMarkdown.value : "";
}

function updateEditorStats() {
  if (!mdStatsBadge) return;
  const md = getMarkdownContent();
  const charCount = md.length;
  const wordCount = md.trim() ? md.trim().split(/\s+/).length : 0;
  mdStatsBadge.textContent = `${wordCount} words · ${charCount} chars`;
}

function setEditorMode(mode) {
  currentEditorMode = mode;
  btnMdVisual?.classList.toggle("active", mode === "visual");
  btnMdVisual?.setAttribute("aria-selected", mode === "visual");
  btnMdRaw?.classList.toggle("active", mode === "raw");
  btnMdRaw?.setAttribute("aria-selected", mode === "raw");

  if (mode === "visual") {
    if (cfgAboutEditor && cfgAboutMarkdown) {
      cfgAboutEditor.innerHTML = renderMarkdown(cfgAboutMarkdown.value);
      cfgAboutEditor.hidden = false;
      cfgAboutMarkdown.hidden = true;
    }
    cfgAboutEditor?.focus();
  } else {
    if (cfgAboutEditor && cfgAboutMarkdown) {
      cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
      cfgAboutMarkdown.hidden = false;
      cfgAboutEditor.hidden = true;
    }
    cfgAboutMarkdown?.focus();
  }
  updateEditorStats();
}

btnMdVisual?.addEventListener("click", () => setEditorMode("visual"));
btnMdRaw?.addEventListener("click", () => setEditorMode("raw"));

cfgAboutEditor?.addEventListener("input", () => {
  if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
  updateEditorStats();
});

cfgAboutMarkdown?.addEventListener("input", updateEditorStats);

// In-place Markdown auto-transformations on Space key
cfgAboutEditor?.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Spacebar") {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || "";
      const offset = sel.anchorOffset;
      const textBefore = text.slice(0, offset);

      if (textBefore === "#") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("formatBlock", false, "<h1>");
        updateEditorStats();
        return;
      }
      if (textBefore === "##") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("formatBlock", false, "<h2>");
        updateEditorStats();
        return;
      }
      if (textBefore === "###") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("formatBlock", false, "<h3>");
        updateEditorStats();
        return;
      }
      if (textBefore === ">") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("formatBlock", false, "<blockquote>");
        updateEditorStats();
        return;
      }
      if (textBefore === "-" || textBefore === "*") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("insertUnorderedList", false, null);
        updateEditorStats();
        return;
      }
      if (textBefore === "1.") {
        e.preventDefault();
        node.nodeValue = text.slice(offset);
        document.execCommand("insertOrderedList", false, null);
        updateEditorStats();
        return;
      }
    }
  }
});

function formatVisualBlock(tag) {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const parentBlock = sel.anchorNode?.parentElement?.closest("h1, h2, h3, blockquote, p");
    if (parentBlock && parentBlock.tagName.toLowerCase() === tag.toLowerCase()) {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand("formatBlock", false, `<${tag}>`);
    }
    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  }
}

document.querySelector("#md-tool-bold")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    document.execCommand("bold", false, null);
    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  } else {
    insertMarkdown("**", "**", "bold text");
  }
});

document.querySelector("#md-tool-italic")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    document.execCommand("italic", false, null);
    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  } else {
    insertMarkdown("*", "*", "italic text");
  }
});

document.querySelector("#md-tool-h2")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    formatVisualBlock("h2");
  } else {
    insertMarkdown("## ", "", "Heading 2");
  }
});

document.querySelector("#md-tool-h3")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    formatVisualBlock("h3");
  } else {
    insertMarkdown("### ", "", "Heading 3");
  }
});

document.querySelector("#md-tool-quote")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    formatVisualBlock("blockquote");
  } else {
    insertMarkdown("> ", "", "Quote text");
  }
});

document.querySelector("#md-tool-ul")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    document.execCommand("insertUnorderedList", false, null);
    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  } else {
    insertMarkdown("- ", "", "List item");
  }
});

document.querySelector("#md-tool-ol")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    document.execCommand("insertOrderedList", false, null);
    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  } else {
    insertMarkdown("1. ", "", "List item");
  }
});

document.querySelector("#md-tool-link")?.addEventListener("click", () => {
  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    const url = prompt("Enter link URL (e.g. https://... or /menu):", "https://");
    if (url) {
      document.execCommand("createLink", false, url);
      if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
      updateEditorStats();
    }
  } else {
    insertMarkdown("[", "](https://)", "link text");
  }
});

// Image Insertion & Text Wrapping Modal
const btnMdToolImage = document.querySelector("#md-tool-image");
const mdImageModal = document.querySelector("#md-image-modal");
const mdImageModalBackdrop = document.querySelector("#md-image-modal-backdrop");
const btnCloseMdImageModal = document.querySelector("#btn-close-md-image-modal");
const btnCancelMdImage = document.querySelector("#btn-cancel-md-image");
const btnInsertMdImage = document.querySelector("#btn-insert-md-image");
const mdImgFileInput = document.querySelector("#md-img-file-input");
const mdImgDropzone = document.querySelector("#md-img-dropzone");
const mdImgPreviewTag = document.querySelector("#md-img-preview-tag");
const mdImgUploadPrompt = document.querySelector("#md-img-upload-prompt");
const mdImgUrlInput = document.querySelector("#md-img-url-input");
const mdImgAltInput = document.querySelector("#md-img-alt-input");
const alignChoiceBtns = document.querySelectorAll(".align-choice-btn");

let activeImageAlign = "left";
let uploadedStoryImageUrl = "";
let savedEditorRange = null;
let savedTextareaCursor = null;

function saveCursorPosition() {
  if (currentEditorMode === "visual" && cfgAboutEditor) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (cfgAboutEditor.contains(range.commonAncestorContainer)) {
        savedEditorRange = range.cloneRange();
      }
    }
  } else if (currentEditorMode === "raw" && cfgAboutMarkdown) {
    savedTextareaCursor = {
      start: cfgAboutMarkdown.selectionStart,
      end: cfgAboutMarkdown.selectionEnd
    };
  }
}

// Continuously save cursor location on selection/interaction
cfgAboutEditor?.addEventListener("keyup", saveCursorPosition);
cfgAboutEditor?.addEventListener("mouseup", saveCursorPosition);
cfgAboutEditor?.addEventListener("touchend", saveCursorPosition);
cfgAboutEditor?.addEventListener("input", saveCursorPosition);

cfgAboutMarkdown?.addEventListener("keyup", saveCursorPosition);
cfgAboutMarkdown?.addEventListener("mouseup", saveCursorPosition);
cfgAboutMarkdown?.addEventListener("input", saveCursorPosition);

function openMdImageModal() {
  saveCursorPosition();
  uploadedStoryImageUrl = "";
  if (mdImgUrlInput) mdImgUrlInput.value = "";
  if (mdImgAltInput) mdImgAltInput.value = "";
  if (mdImgFileInput) mdImgFileInput.value = "";
  if (mdImgPreviewTag) {
    mdImgPreviewTag.src = "";
    mdImgPreviewTag.style.display = "none";
  }
  if (mdImgUploadPrompt) mdImgUploadPrompt.style.display = "flex";
  activeImageAlign = "left";
  alignChoiceBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.align === "left"));
  if (mdImageModal) mdImageModal.hidden = false;
  if (mdImageModalBackdrop) mdImageModalBackdrop.hidden = false;
}

function closeMdImageModal() {
  if (mdImageModal) mdImageModal.hidden = true;
  if (mdImageModalBackdrop) mdImageModalBackdrop.hidden = true;
}

btnMdToolImage?.addEventListener("click", openMdImageModal);
btnCloseMdImageModal?.addEventListener("click", closeMdImageModal);
btnCancelMdImage?.addEventListener("click", closeMdImageModal);
mdImageModalBackdrop?.addEventListener("click", closeMdImageModal);

alignChoiceBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    alignChoiceBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeImageAlign = btn.dataset.align || "left";
  });
});

mdImgDropzone?.addEventListener("click", () => {
  mdImgFileInput?.click();
});

async function handleStoryImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please choose an image file (JPEG, PNG, WebP)");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      showToast("Uploading story image...");
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: reader.result })
      });
      if (!res.ok) throw new Error("Could not upload image");
      const json = await res.json();
      uploadedStoryImageUrl = json.url;
      if (mdImgPreviewTag) {
        mdImgPreviewTag.src = json.url;
        mdImgPreviewTag.style.display = "block";
      }
      if (mdImgUploadPrompt) mdImgUploadPrompt.style.display = "none";
      showToast("Image uploaded successfully!");
    } catch (err) {
      showToast(err.message);
    }
  };
  reader.readAsDataURL(file);
}

mdImgFileInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleStoryImageFile(file);
});

mdImgDropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  mdImgDropzone.style.borderColor = "var(--accent)";
});

mdImgDropzone?.addEventListener("dragleave", () => {
  mdImgDropzone.style.borderColor = "var(--line)";
});

mdImgDropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  mdImgDropzone.style.borderColor = "var(--line)";
  const file = e.dataTransfer.files?.[0];
  if (file) handleStoryImageFile(file);
});

btnInsertMdImage?.addEventListener("click", () => {
  const url = uploadedStoryImageUrl || mdImgUrlInput?.value.trim();
  if (!url) {
    showToast("Please select an image file or enter an image URL");
    return;
  }
  const alt = mdImgAltInput?.value.trim() || "";

  if (currentEditorMode === "visual") {
    cfgAboutEditor?.focus();
    const captionHtml = alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : "";
    const figureEl = document.createElement("figure");
    figureEl.className = `md-figure align-${activeImageAlign}`;
    figureEl.setAttribute("contenteditable", "false");
    figureEl.innerHTML = `<img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" />${captionHtml}`;

    const sel = window.getSelection();
    let inserted = false;

    if (savedEditorRange && cfgAboutEditor?.contains(savedEditorRange.commonAncestorContainer)) {
      try {
        const container = savedEditorRange.startContainer;
        const parentEl = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
        const targetBlock = parentEl ? parentEl.closest("h1, h2, h3, blockquote, p, ul, ol") : null;

        if (targetBlock && targetBlock !== cfgAboutEditor && cfgAboutEditor.contains(targetBlock)) {
          // If inserting at or inside a heading, insert figure outside to prevent heading unwrap
          const isHeading = /^H[1-6]$/i.test(targetBlock.tagName);
          if (isHeading) {
            const textLen = (container.nodeValue || container.textContent || "").length;
            if (savedEditorRange.startOffset === 0) {
              targetBlock.parentNode.insertBefore(figureEl, targetBlock);
            } else if (savedEditorRange.startOffset >= textLen) {
              targetBlock.parentNode.insertBefore(figureEl, targetBlock.nextSibling);
            } else {
              // Split heading cleanly so both halves remain headings
              const splitHeading = document.createElement(targetBlock.tagName);
              const splitRange = savedEditorRange.cloneRange();
              splitRange.setEndAfter(targetBlock.lastChild);
              splitHeading.appendChild(splitRange.extractContents());
              targetBlock.parentNode.insertBefore(figureEl, targetBlock.nextSibling);
              targetBlock.parentNode.insertBefore(splitHeading, figureEl.nextSibling);
            }
            inserted = true;
          }
        }

        if (!inserted) {
          savedEditorRange.deleteContents();
          savedEditorRange.insertNode(figureEl);
          inserted = true;
        }

        const nextRange = document.createRange();
        nextRange.setStartAfter(figureEl);
        nextRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextRange);
        savedEditorRange = nextRange.cloneRange();
      } catch (err) {
        console.warn("Cursor range insertion fallback", err);
      }
    }

    if (!inserted && cfgAboutEditor) {
      cfgAboutEditor.appendChild(figureEl);
    }

    if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
    updateEditorStats();
  } else {
    // Raw Markdown mode
    const mdTag = alt ? `![${alt}|${activeImageAlign}](${url})\n\n` : `![image|${activeImageAlign}](${url})\n\n`;
    if (cfgAboutMarkdown) {
      const start = savedTextareaCursor ? savedTextareaCursor.start : cfgAboutMarkdown.selectionStart;
      const end = savedTextareaCursor ? savedTextareaCursor.end : cfgAboutMarkdown.selectionEnd;
      const val = cfgAboutMarkdown.value;
      cfgAboutMarkdown.value = val.substring(0, start) + mdTag + val.substring(end);
      const nextPos = start + mdTag.length;
      cfgAboutMarkdown.focus();
      cfgAboutMarkdown.setSelectionRange(nextPos, nextPos);
      savedTextareaCursor = { start: nextPos, end: nextPos };
      updateEditorStats();
    }
  }

  closeMdImageModal();
  showToast("Story image inserted at cursor position!");
});

// Interactive alignment cycling on clicking images in visual editor
cfgAboutEditor?.addEventListener("click", (e) => {
  const fig = e.target.closest(".md-figure");
  if (!fig) return;
  if (fig.classList.contains("align-left")) {
    fig.classList.remove("align-left");
    fig.classList.add("align-right");
    showToast("Text wrap: Float Right");
  } else if (fig.classList.contains("align-right")) {
    fig.classList.remove("align-right");
    fig.classList.add("align-center");
    showToast("Layout: Centered (Full Width)");
  } else {
    fig.classList.remove("align-center");
    fig.classList.add("align-left");
    showToast("Text wrap: Float Left");
  }
  if (cfgAboutMarkdown) cfgAboutMarkdown.value = htmlToMarkdown(cfgAboutEditor.innerHTML);
  updateEditorStats();
});

btnSaveAppearance?.addEventListener("click", async () => {
  // Sync live schedule directly from DOM inputs before saving
  const rows = document.querySelectorAll("#schedule-editor-grid .schedule-row");
  if (rows.length) {
    scheduleData = Array.from(rows).map((row, idx) => {
      const orig = scheduleData[idx] || {};
      const isOpen = row.querySelector(".schedule-is-open").checked;
      const openTime = row.querySelector(".schedule-open-time").value || orig.open || "08:00";
      const closeTime = row.querySelector(".schedule-close-time").value || orig.close || "22:00";
      return {
        ...orig,
        isOpen,
        open: openTime,
        close: closeTime
      };
    });
  }

  const computedHours = generateHoursSummary(scheduleData);
  if (cfgHours) {
    cfgHours.value = cfgHours.value.trim() || computedHours;
  }

  const payload = {
    brandName: cfgBrandName.value.trim(),
    currency: cfgCurrency.value.trim(),
    tagline: cfgTagline.value.trim(),
    cuisineType: cfgCuisine.value.trim(),
    address: cfgAddress.value.trim(),
    phone: cfgPhone.value.trim(),
    whatsappNumber: cfgWhatsapp.value.trim(),
    email: cfgEmail.value.trim(),
    hoursText: cfgHours.value.trim() || computedHours,
    timezone: cfgTimezone ? cfgTimezone.value : (siteConfig.timezone || "Africa/Addis_Ababa"),
    schedule: scheduleData,
    aboutMarkdown: getMarkdownContent() || siteConfig.aboutMarkdown || "",
    fontPair: cfgFontPair.value,
    paletteId: selectedPaletteId,
    paletteOverrides,
    bannerUrl: siteConfig.bannerUrl || ""
  };

  try {
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Could not save site settings");
    siteConfig = await res.json();
    document.querySelector("#brand-header-title").textContent = siteConfig.brandName;
    refreshPreview();
    showToast("All settings & schedule saved successfully!");
  } catch (err) {
    showToast(err.message);
  }
});

reloadPreviewBtn?.addEventListener("click", refreshPreview);

// ==========================================
// TAB 4: SECURITY & PASSWORD (Requires Old Password)
// ==========================================
const passwordForm = document.querySelector("#password-form");
passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const oldPassword = document.querySelector("#old-password").value;
  const newPassword = document.querySelector("#new-password").value;
  const confirmPassword = document.querySelector("#confirm-password").value;

  if (newPassword !== confirmPassword) {
    showToast("New passwords do not match");
    return;
  }
  if (newPassword.length < 12) {
    showToast("New password must be at least 12 characters long");
    return;
  }

  try {
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not change password");
    }
    showToast("Password updated successfully!");
    passwordForm.reset();
  } catch (err) {
    showToast(err.message);
  }
});

// Initialize
renderMenuTab();
renderReviewsTab();
populateAppearanceForm();
