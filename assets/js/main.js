(() => {
  "use strict";

  const DATA_URL = "assets/data/recipes.json";
  const PLACEHOLDER_IMAGE = "assets/img/placeholder.jpg";
  const CATEGORY_ORDER = ["Todas", "Salado", "Dulce", "Tapas"];
  const SUBCATEGORY_ORDER = ["Todas", "Primeros", "Segundos", "Sencillos", "Elaborados", "Tapas", "Sin clasificar"];
  const TYPE_ORDER = [
    "Todas",
    "Sopas y cremas",
    "Arroces",
    "Pasta",
    "Legumbres",
    "Verduras y hortalizas",
    "Ensaladas",
    "Guisos y potajes",
    "Huevos y tortillas",
    "Salsas y bases",
    "Pollo y aves",
    "Carnes",
    "Albondigas y rellenos",
    "Pescados",
    "Mariscos",
    "Asados",
    "Canapes",
    "Croquetas y fritos",
    "Montaditos y pinchos",
    "Empanadillas y hojaldres",
    "Aperitivos",
    "Bizcochos",
    "Tartas y pasteles",
    "Galletas",
    "Flanes y natillas",
    "Cremas y mousses",
    "Helados",
    "Magdalenas y muffins",
    "Brownies y chocolate",
    "Masas dulces",
    "Postres de fruta",
    "Bebidas dulces",
    "Reposteria frita",
    "Sin clasificar",
  ];

  const state = {
    recipes: [],
    filtered: [],
    loaded: false,
    filters: {
      search: "",
      category: "Todas",
      subcategory: "Todas",
      type: "Todas",
    },
  };

  const elements = {};

  function qs(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function imageFor(recipe) {
    return recipe.image && recipe.image.trim() ? recipe.image : PLACEHOLDER_IMAGE;
  }

  function compactList(values) {
    return values.filter((value) => value && String(value).trim());
  }

  function recipeText(recipe) {
    return normalize([
      recipe.title,
      recipe.category,
      recipe.subcategory,
      recipe.type,
      recipe.time,
      recipe.difficulty,
      recipe.servings,
      recipe.notes,
      recipe.source,
      ...(recipe.ingredients || []),
      ...(recipe.steps || []),
      ...(recipe.tags || []),
    ].join(" "));
  }

  function singularPlural(count) {
    return count === 1 ? "1 receta" : `${count} recetas`;
  }

  async function loadRecipes() {
    if (state.loaded) {
      return;
    }

    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`No se pudo leer ${DATA_URL}`);
      }

      const data = await response.json();
      const recipes = Array.isArray(data) ? data : data.recipes;
      state.recipes = (recipes || []).map((recipe) => ({
        id: recipe.id,
        title: recipe.title || "Receta sin título",
        category: recipe.category || "Sin clasificar",
        subcategory: recipe.subcategory || "Sin clasificar",
        type: recipe.type || "Sin clasificar",
        image: recipe.image || "",
        time: recipe.time || "",
        difficulty: recipe.difficulty || "",
        servings: recipe.servings || "",
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        notes: recipe.notes || "",
        tags: Array.isArray(recipe.tags) ? recipe.tags : [],
        source: recipe.source || "",
        needsReview: Boolean(recipe.needsReview),
      }));
      state.loaded = true;
      renderFilters();
      applyFilters();
      route();
    } catch (error) {
      elements.recipeGrid.innerHTML = `
        <div class="load-error">
          No se han podido cargar las recetas. Si has abierto el HTML directamente, prueba con
          <strong>python -m http.server 8000</strong> y entra en <strong>http://localhost:8000</strong>.
        </div>
      `;
    }
  }

  function getSubcategoriesForCurrentCategory() {
    const categories = state.filters.category === "Todas"
      ? state.recipes
      : state.recipes.filter((recipe) => recipe.category === state.filters.category);

    const available = new Set(categories.map((recipe) => recipe.subcategory || "Sin clasificar"));
    return SUBCATEGORY_ORDER.filter((subcategory) => subcategory === "Todas" || available.has(subcategory));
  }

  function getTypesForCurrentFilters() {
    const recipes = state.recipes.filter((recipe) => {
      const matchesCategory = state.filters.category === "Todas" || recipe.category === state.filters.category;
      const matchesSubcategory = state.filters.subcategory === "Todas" || recipe.subcategory === state.filters.subcategory;
      return matchesCategory && matchesSubcategory;
    });
    const available = new Set(recipes.map((recipe) => recipe.type || "Sin clasificar"));
    const ordered = TYPE_ORDER.filter((type) => type === "Todas" || available.has(type));
    const extra = [...available].filter((type) => !TYPE_ORDER.includes(type)).sort();
    return [...ordered, ...extra];
  }

  function renderFilters() {
    renderCategoryFilters();
    renderSubcategoryFilters();
    renderTypeFilters();
  }

  function renderCategoryFilters() {
    elements.categoryFilters.innerHTML = CATEGORY_ORDER.map((category) => filterButton(category, "category")).join("");
  }

  function renderSubcategoryFilters() {
    const subcategories = getSubcategoriesForCurrentCategory();
    if (!subcategories.includes(state.filters.subcategory)) {
      state.filters.subcategory = "Todas";
    }

    elements.subcategorySelect.innerHTML = subcategories.map((subcategory) => selectOption(subcategory, state.filters.subcategory)).join("");
  }

  function renderTypeFilters() {
    const types = getTypesForCurrentFilters();
    if (!types.includes(state.filters.type)) {
      state.filters.type = "Todas";
    }

    elements.typeSelect.innerHTML = types.map((type) => selectOption(type, state.filters.type)).join("");
  }

  function filterButton(label, type) {
    const pressed = state.filters[type] === label ? "true" : "false";
    return `<button type="button" data-filter-type="${type}" data-filter-value="${escapeHtml(label)}" aria-pressed="${pressed}">${escapeHtml(label)}</button>`;
  }

  function selectOption(label, activeValue) {
    const selected = label === activeValue ? " selected" : "";
    return `<option value="${escapeHtml(label)}"${selected}>${escapeHtml(label)}</option>`;
  }

  function applyFilters() {
    const query = normalize(state.filters.search.trim());

    state.filtered = state.recipes.filter((recipe) => {
      const matchesSearch = !query || recipeText(recipe).includes(query);
      const matchesCategory = state.filters.category === "Todas" || recipe.category === state.filters.category;
      const matchesSubcategory = state.filters.subcategory === "Todas" || recipe.subcategory === state.filters.subcategory;
      const matchesType = state.filters.type === "Todas" || recipe.type === state.filters.type;
      return matchesSearch && matchesCategory && matchesSubcategory && matchesType;
    });

    renderCategoryFilters();
    renderSubcategoryFilters();
    renderTypeFilters();
    renderList();
  }

  function renderList() {
    elements.visibleCount.textContent = singularPlural(state.filtered.length);
    elements.activeSummary.textContent = summaryText();
    elements.emptyState.hidden = state.filtered.length > 0;
    elements.recipeGrid.innerHTML = state.filtered.map(renderCard).join("");
  }

  function summaryText() {
    const parts = [];
    if (state.filters.category !== "Todas") {
      parts.push(state.filters.category);
    }
    if (state.filters.subcategory !== "Todas") {
      parts.push(state.filters.subcategory);
    }
    if (state.filters.type !== "Todas") {
      parts.push(state.filters.type);
    }
    if (state.filters.search.trim()) {
      parts.push(`"${state.filters.search.trim()}"`);
    }
    return parts.length ? `Filtro activo: ${parts.join(" · ")}` : "Todas las recetas disponibles.";
  }

  function renderCard(recipe) {
    const preview = compactList(recipe.ingredients).slice(0, 3).join(" · ");
    const meta = compactList([recipe.category, recipe.subcategory, recipe.type]).map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
    const review = recipe.needsReview ? '<span class="pill review">Por revisar</span>' : "";

    return `
      <a class="recipe-card" href="#receta/${encodeURIComponent(recipe.id)}">
        <img class="card-image" src="${escapeHtml(imageFor(recipe))}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(recipe.title)}</h2>
          <div class="card-meta">${meta}${review}</div>
          <p class="card-preview">${escapeHtml(preview || recipe.source || "Receta familiar")}</p>
        </div>
      </a>
    `;
  }

  function route() {
    const hash = decodeURIComponent(window.location.hash || "#listado");
    if (hash.startsWith("#receta/")) {
      const id = hash.replace("#receta/", "");
      const recipe = state.recipes.find((item) => item.id === id);
      if (recipe) {
        renderDetail(recipe);
        return;
      }
    }

    showList();
  }

  function showList() {
    elements.detailView.hidden = true;
    elements.listView.hidden = false;
  }

  function renderDetail(recipe) {
    const metaItems = compactList([recipe.category, recipe.subcategory, recipe.type, recipe.time, recipe.difficulty, recipe.servings]);
    const review = recipe.needsReview ? '<span class="pill review">Por revisar</span>' : "";

    elements.listView.hidden = true;
    elements.detailView.hidden = false;
    elements.detailView.innerHTML = `
      <button class="back-button" type="button" data-back-to-list>Volver al listado</button>
      <article class="detail-layout">
        <div>
          <img class="detail-image" src="${escapeHtml(imageFor(recipe))}" alt="" onerror="this.src='${PLACEHOLDER_IMAGE}'">
        </div>
        <div class="detail-content">
          <p class="detail-kicker">${escapeHtml(compactList([recipe.category, recipe.subcategory, recipe.type]).join(" · "))}</p>
          <h1>${escapeHtml(recipe.title)}</h1>
          <div class="detail-meta">
            ${metaItems.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
            ${review}
          </div>
          ${renderRecipeSection("Ingredientes", recipe.ingredients, "ul")}
          ${renderRecipeSection("Preparación", recipe.steps, "ol")}
          ${renderNotes(recipe.notes)}
          ${renderTags(recipe.tags)}
          ${recipe.source ? `<p class="source-line">Fuente: ${escapeHtml(recipe.source)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function renderRecipeSection(title, items, listType) {
    const values = compactList(items || []);
    const tag = listType === "ol" ? "ol" : "ul";
    const emptyText = title === "Ingredientes" ? "Sin ingredientes detectados." : "Sin pasos detectados.";

    if (!values.length) {
      return `
        <section class="recipe-section">
          <h2>${title}</h2>
          <p>${emptyText}</p>
        </section>
      `;
    }

    return `
      <section class="recipe-section">
        <h2>${title}</h2>
        <${tag}>
          ${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </${tag}>
      </section>
    `;
  }

  function renderNotes(notes) {
    if (!notes || !notes.trim()) {
      return "";
    }

    return `
      <section class="recipe-section">
        <h2>Notas</h2>
        <p class="notes-box">${escapeHtml(notes)}</p>
      </section>
    `;
  }

  function renderTags(tags) {
    const values = compactList(tags || []);
    if (!values.length) {
      return "";
    }

    return `
      <section class="recipe-section">
        <h2>Etiquetas</h2>
        <div class="tag-list">${values.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>
      </section>
    `;
  }

  function parseIngredientInput(value) {
    const chunks = value
      .split(/[,;]+|\s+y\s+/i)
      .map((item) => item.trim())
      .filter(Boolean);
    const stopwords = new Set(["con", "para", "una", "uno", "unos", "unas", "de", "del", "las", "los", "el", "la"]);
    const labels = chunks.length > 1
      ? chunks
      : value.split(/\s+/).map((item) => item.trim()).filter((item) => item.length > 2 && !stopwords.has(normalize(item)));
    const terms = new Set();

    labels.forEach((label) => {
      const normalizedLabel = normalize(label);
      if (normalizedLabel.length > 2) {
        terms.add(normalizedLabel);
      }
      normalizedLabel.split(/\s+/).forEach((word) => {
        if (word.length > 2 && !stopwords.has(word)) {
          terms.add(word);
        }
      });
    });

    return {
      labels,
      terms: [...terms],
    };
  }

  function ingredientMatches(text, terms) {
    const normalizedText = normalize(text);
    return terms.some((term) => normalizedText.includes(term));
  }

  function cleanIngredientName(value) {
    return String(value || "")
      .replace(/\([^)]*\)/g, "")
      .replace(/^[\s\-*•·▪]+/, "")
      .replace(/^\d+([.,/]\d+)?\s*/g, "")
      .replace(/\b(gr|g|kg|ml|l|litro|litros|cucharada|cucharadas|cucharadita|cucharaditas|taza|tazas|vaso|vasos|sobre|sobres)\b\.?/gi, "")
      .replace(/\s+/g, " ")
      .replace(/^[,.;:\s]+|[,.;:\s]+$/g, "")
      .trim();
  }

  function scoreRecipeByIngredients(recipe, labels, terms) {
    const pantryBasics = new Set(["sal", "aceite", "agua", "pimienta", "azucar", "azúcar"]);
    const haystack = [
      recipe.title,
      recipe.type,
      ...(recipe.ingredients || []),
      ...(recipe.tags || []),
    ].join(" ");
    const matchedLabels = labels.filter((label) => ingredientMatches(haystack, [normalize(label), ...normalize(label).split(/\s+/)]));
    const uniqueMatches = [...new Set(matchedLabels)];
    const missing = (recipe.ingredients || [])
      .filter((ingredient) => !ingredientMatches(ingredient, terms))
      .map(cleanIngredientName)
      .filter((ingredient) => ingredient.length > 2 && !pantryBasics.has(normalize(ingredient)))
      .slice(0, 6);

    const score = uniqueMatches.length * 12 - Math.min(missing.length, 6) + (recipe.needsReview ? -2 : 0);
    return {
      recipe,
      score,
      matches: uniqueMatches,
      missing,
    };
  }

  function appendChatMessage(kind, html) {
    const message = document.createElement("div");
    message.className = `chat-message ${kind}`;
    message.innerHTML = html;
    elements.chatLog.append(message);
    elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
  }

  function renderSuggestion(result) {
    const recipe = result.recipe;
    const missingText = result.missing.length ? result.missing.join(", ") : "No detecto ingredientes importantes que falten.";
    return `
      <h3><a href="#receta/${encodeURIComponent(recipe.id)}">${escapeHtml(recipe.title)}</a></h3>
      <p><strong>Coinciden:</strong> ${escapeHtml(result.matches.join(", "))}</p>
      <p><strong>Quizá faltan:</strong> ${escapeHtml(missingText)}</p>
      <p>${escapeHtml(compactList([recipe.category, recipe.subcategory, recipe.type]).join(" · "))}</p>
    `;
  }

  function handleIngredientQuery() {
    const query = elements.ingredientInput.value.trim();
    if (!query) {
      appendChatMessage("bot", "Dime al menos un ingrediente, por ejemplo: arroz, pollo, cebolla.");
      return;
    }

    appendChatMessage("user", escapeHtml(query));
    elements.ingredientInput.value = "";

    const parsed = parseIngredientInput(query);
    const results = state.recipes
      .map((recipe) => scoreRecipeByIngredients(recipe, parsed.labels, parsed.terms))
      .filter((result) => result.matches.length > 0)
      .sort((left, right) => right.score - left.score || left.missing.length - right.missing.length)
      .slice(0, 5);

    if (!results.length) {
      appendChatMessage("bot", "No he encontrado recetas claras con esos ingredientes. Prueba con nombres más generales, como pollo, arroz, pasta o chocolate.");
      return;
    }

    appendChatMessage(
      "bot",
      `Te propongo estas recetas. Las ordeno por coincidencia y te marco ingredientes que quizá falten:<br><br>${results.map(renderSuggestion).join("<hr>")}`
    );
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.filters.search = event.target.value;
      applyFilters();
    });

    elements.subcategorySelect.addEventListener("change", (event) => {
      state.filters.subcategory = event.target.value;
      state.filters.type = "Todas";
      applyFilters();
    });

    elements.typeSelect.addEventListener("change", (event) => {
      state.filters.type = event.target.value;
      applyFilters();
    });

    elements.assistantToggle.addEventListener("click", () => {
      const isOpen = !elements.assistantPanel.hidden;
      elements.assistantPanel.hidden = isOpen;
      elements.assistantToggle.setAttribute("aria-expanded", String(!isOpen));
      elements.assistantToggle.querySelector("[aria-hidden='true']").textContent = isOpen ? "+" : "-";
      if (!isOpen) {
        window.setTimeout(() => elements.ingredientInput.focus(), 0);
      }
    });

    elements.ingredientForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleIngredientQuery();
    });

    document.addEventListener("click", (event) => {
      const filter = event.target.closest("[data-filter-type]");
      if (filter) {
        const type = filter.dataset.filterType;
        state.filters[type] = filter.dataset.filterValue;
        if (type === "category") {
          state.filters.subcategory = "Todas";
          state.filters.type = "Todas";
        }
        if (type === "subcategory") {
          state.filters.type = "Todas";
        }
        applyFilters();
        return;
      }

      if (event.target.closest("[data-back-to-list]")) {
        window.location.hash = "#listado";
      }
    });

    window.addEventListener("hashchange", route);
  }

  function cacheElements() {
    elements.listView = qs("#list-view");
    elements.detailView = qs("#detail-view");
    elements.recipeGrid = qs("#recipe-grid");
    elements.emptyState = qs("#empty-state");
    elements.visibleCount = qs("#visible-count");
    elements.activeSummary = qs("#active-summary");
    elements.searchInput = qs("#search-input");
    elements.categoryFilters = qs("#category-filters");
    elements.subcategorySelect = qs("#subcategory-select");
    elements.typeSelect = qs("#type-select");
    elements.assistantToggle = qs("#assistant-toggle");
    elements.assistantPanel = qs("#assistant-panel");
    elements.chatLog = qs("#chat-log");
    elements.ingredientForm = qs("#ingredient-form");
    elements.ingredientInput = qs("#ingredient-input");
  }

  function startApp() {
    cacheElements();
    bindEvents();
    loadRecipes();
  }

  document.addEventListener("DOMContentLoaded", () => {
    let started = false;
    const startOnce = () => {
      if (!started) {
        started = true;
        startApp();
      }
    };

    window.addEventListener("recetario:unlocked", startOnce);
    if (window.RecetarioAuth?.isUnlocked()) {
      startOnce();
    }
  });
})();
