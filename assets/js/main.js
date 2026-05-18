(() => {
  "use strict";

  const DATA_URL = "assets/data/recipes.json";
  const PLACEHOLDER_IMAGE = "assets/img/placeholder.jpg";
  const FAVORITES_KEY = "recetario_favorites_v1";
  const QUICK_OPTIONS = ["Todas", "Habituales", "Destacadas", "Favoritas"];
  const CATEGORY_ORDER = ["Todas", "Salado", "Dulce", "Tapas"];
  const SUBCATEGORY_ORDER = ["Todas", "Primeros", "Segundos", "Sencillos", "Elaborados", "Tapas", "Sin clasificar"];
  const MENU_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
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
  const STOPWORDS = new Set([
    "a",
    "al",
    "con",
    "de",
    "del",
    "el",
    "en",
    "la",
    "las",
    "lo",
    "los",
    "para",
    "por",
    "sin",
    "un",
    "una",
    "unas",
    "unos",
    "y",
    "o",
  ]);
  const PANTRY_BASICS = new Set([
    "aceite",
    "agua",
    "azucar",
    "pimienta",
    "sal",
  ]);
  const LOW_VALUE_INGREDIENTS = new Set([
    "aceite",
    "agua",
    "ajo",
    "azucar",
    "cebolla",
    "harina",
    "huevo",
    "huevos",
    "leche",
    "mantequilla",
    "nata",
    "pimienta",
    "sal",
  ]);

  const state = {
    recipes: [],
    filtered: [],
    favoriteIds: new Set(),
    loaded: false,
    filters: {
      quick: "Todas",
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
      recipe.menuCandidate ? "habitual menu semanal" : "",
      recipe.featured ? "destacada" : "",
      ...(recipe.ingredients || []),
      ...(recipe.steps || []),
      ...(recipe.tags || []),
    ].join(" "));
  }

  function singularPlural(count) {
    return count === 1 ? "1 receta" : `${count} recetas`;
  }

  function loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      state.favoriteIds = new Set(Array.isArray(saved) ? saved : []);
    } catch {
      state.favoriteIds = new Set();
    }
  }

  function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favoriteIds]));
  }

  function isFavorite(recipeOrId) {
    const id = typeof recipeOrId === "string" ? recipeOrId : recipeOrId?.id;
    return Boolean(id && state.favoriteIds.has(id));
  }

  function toggleFavorite(id) {
    if (state.favoriteIds.has(id)) {
      state.favoriteIds.delete(id);
    } else {
      state.favoriteIds.add(id);
    }
    saveFavorites();
  }

  function recipePriority(recipe) {
    return (recipe.menuCandidate ? 4 : 0) + (isFavorite(recipe.id) ? 2 : 0) + (recipe.featured ? 1 : 0);
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
        menuCandidate: Boolean(recipe.menuCandidate),
        featured: Boolean(recipe.featured),
        needsReview: Boolean(recipe.needsReview),
      }));
      loadFavorites();
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
    renderQuickFilters();
    renderCategoryFilters();
    renderSubcategoryFilters();
    renderTypeFilters();
  }

  function renderQuickFilters() {
    elements.quickSelect.innerHTML = QUICK_OPTIONS.map((option) => selectOption(option, state.filters.quick)).join("");
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
      const matchesQuick =
        state.filters.quick === "Todas" ||
        (state.filters.quick === "Habituales" && recipe.menuCandidate) ||
        (state.filters.quick === "Destacadas" && recipe.featured) ||
        (state.filters.quick === "Favoritas" && isFavorite(recipe.id));
      return matchesSearch && matchesQuick && matchesCategory && matchesSubcategory && matchesType;
    }).sort((left, right) => recipePriority(right) - recipePriority(left));

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
    if (state.filters.quick !== "Todas") {
      parts.push(state.filters.quick);
    }
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
    const menuCandidate = recipe.menuCandidate ? '<span class="pill routine">Habitual</span>' : "";
    const featured = recipe.featured ? '<span class="pill featured">Destacada</span>' : "";
    const review = recipe.needsReview ? '<span class="pill review">Por revisar</span>' : "";

    return `
      <article class="recipe-card${isFavorite(recipe.id) ? " is-favorite" : ""}">
        ${favoriteButton(recipe, "card")}
        <a class="card-link" href="#receta/${encodeURIComponent(recipe.id)}">
            <img class="card-image" src="${escapeHtml(imageFor(recipe))}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
          <div class="card-body">
            <h2 class="card-title">${escapeHtml(recipe.title)}</h2>
            <div class="card-meta">${menuCandidate}${featured}${meta}${review}</div>
            <p class="card-preview">${escapeHtml(preview || recipe.source || "Receta familiar")}</p>
          </div>
        </a>
      </article>
    `;
  }

  function favoriteButton(recipe, variant) {
    const active = isFavorite(recipe.id);
    const label = active ? "Quitar de favoritas" : "Marcar como favorita";
    const text = variant === "detail" ? `<span>${active ? "Favorita" : "Marcar favorita"}</span>` : "";
    return `
      <button class="favorite-button ${variant === "detail" ? "detail-favorite" : ""}" type="button" data-favorite-id="${escapeHtml(recipe.id)}" aria-pressed="${active}" aria-label="${label}" title="${label}">
        <span aria-hidden="true">${active ? "&#9733;" : "&#9734;"}</span>${text}
      </button>
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
    const menuCandidate = recipe.menuCandidate ? '<span class="pill routine">Habitual</span>' : "";
    const featured = recipe.featured ? '<span class="pill featured">Destacada</span>' : "";
    const review = recipe.needsReview ? '<span class="pill review">Por revisar</span>' : "";

    elements.listView.hidden = true;
    elements.detailView.hidden = false;
    elements.detailView.innerHTML = `
      <div class="detail-actions">
        <button class="back-button" type="button" data-back-to-list>Volver al listado</button>
        ${favoriteButton(recipe, "detail")}
      </div>
      <article class="detail-layout">
        <div>
          <img class="detail-image" src="${escapeHtml(imageFor(recipe))}" alt="" onerror="this.src='${PLACEHOLDER_IMAGE}'">
        </div>
        <div class="detail-content">
          <p class="detail-kicker">${escapeHtml(compactList([recipe.category, recipe.subcategory, recipe.type]).join(" · "))}</p>
          <h1>${escapeHtml(recipe.title)}</h1>
          <div class="detail-meta">
            ${menuCandidate}
            ${featured}
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

  function isMenuTrusted(recipe) {
    return recipe.menuCandidate || recipe.featured || isFavorite(recipe.id);
  }

  function matchesPlannerSource(recipe, source) {
    if (source === "routine") {
      return recipe.menuCandidate;
    }
    if (source === "favorites") {
      return isFavorite(recipe.id);
    }
    if (source === "featured") {
      return recipe.featured;
    }
    return isMenuTrusted(recipe);
  }

  function plannerBasePool(subcategory) {
    return state.recipes.filter((recipe) => recipe.category === "Salado" && recipe.subcategory === subcategory);
  }

  function plannerTrustedPool(subcategory, source) {
    return plannerBasePool(subcategory).filter((recipe) => matchesPlannerSource(recipe, source));
  }

  function plannerPool(subcategory, source, allowFallback) {
    const base = plannerBasePool(subcategory);
    const trusted = plannerTrustedPool(subcategory, source);
    const pool = allowFallback && trusted.length < MENU_DAYS.length ? [...trusted, ...base.filter((recipe) => !trusted.includes(recipe))] : trusted;
    return shuffleRecipes(pool).slice(0, MENU_DAYS.length);
  }

  function shuffleRecipes(recipes) {
    const items = [...recipes].sort((left, right) => recipePriority(right) - recipePriority(left) || left.title.localeCompare(right.title));
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items.sort((left, right) => recipePriority(right) - recipePriority(left));
  }

  function renderPlannerRecipe(recipe) {
    if (!recipe) {
      return '<span class="planner-missing">Falta marcar recetas</span>';
    }

    return `
      <a href="#receta/${encodeURIComponent(recipe.id)}">${escapeHtml(recipe.title)}</a>
      <span>${escapeHtml(compactList([recipe.type, recipe.menuCandidate ? "Habitual" : "", recipe.featured ? "Destacada" : "", isFavorite(recipe.id) ? "Favorita" : ""]).join(" · "))}</span>
    `;
  }

  function sourceLabel(source) {
    if (source === "routine") {
      return "habituales";
    }
    if (source === "favorites") {
      return "favoritas";
    }
    if (source === "featured") {
      return "destacadas";
    }
    return "habituales, destacadas y favoritas";
  }

  function generateWeeklyPlan() {
    const source = elements.plannerSource.value;
    const allowFallback = elements.plannerAllowFallback.checked;
    const trustedFirstCount = plannerTrustedPool("Primeros", source).length;
    const trustedSecondCount = plannerTrustedPool("Segundos", source).length;
    const firsts = plannerPool("Primeros", source, allowFallback);
    const seconds = plannerPool("Segundos", source, allowFallback);
    const firstsEnough = firsts.length >= MENU_DAYS.length;
    const secondsEnough = seconds.length >= MENU_DAYS.length;
    const usedFallback = allowFallback && (trustedFirstCount < MENU_DAYS.length || trustedSecondCount < MENU_DAYS.length);

    elements.weeklyPlan.innerHTML = MENU_DAYS.map((day, index) => `
      <article class="day-card">
        <h3>${day}</h3>
        <div>
          <strong>Primero</strong>
          ${renderPlannerRecipe(firsts[index])}
        </div>
        <div>
          <strong>Segundo</strong>
          ${renderPlannerRecipe(seconds[index])}
        </div>
      </article>
    `).join("");

    const status = [];
    status.push(`Base usada: recetas ${sourceLabel(source)}.`);
    status.push(`${trustedFirstCount}/7 primeros y ${trustedSecondCount}/7 segundos marcados en esa base.`);
    if ((!firstsEnough || !secondsEnough) && !allowFallback) {
      status.push("Marca más recetas como comida habitual en el editor, o activa completar con otras recetas saladas.");
    }
    if (usedFallback) {
      status.push("He intentado completar el menú con recetas saladas no marcadas para evitar huecos.");
    }
    elements.plannerStatus.textContent = status.join(" ");
  }

  function parseIngredientInput(value) {
    let chunks = value
      .split(/[,;]+|\s+y\s+/i)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length <= 1) {
      const words = tokenizeIngredient(value);
      chunks = words.length > 1 ? words : chunks;
    }

    const labels = chunks
      .map((label) => ({
        raw: label,
        tokens: tokenizeIngredient(label),
      }))
      .filter((label) => label.tokens.length);
    const terms = new Set();

    labels.forEach((label) => {
      label.tokens.forEach((token) => terms.add(token));
    });

    return {
      labels,
      terms: [...terms],
    };
  }

  function singularize(word) {
    if (word.endsWith("s") && word.length > 4) {
      return word.slice(0, -1);
    }
    return word;
  }

  function tokenizeIngredient(value) {
    return normalize(value)
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\b\d+([.,/]\d+)?\b/g, " ")
      .split(/[^a-z0-9]+/)
      .map((word) => singularize(word.trim()))
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  }

  function tokenMatches(token, candidate) {
    return token === candidate || (token.length >= 5 && candidate.length >= 5 && (token.includes(candidate) || candidate.includes(token)));
  }

  function containsToken(tokens, token) {
    return tokens.some((candidate) => tokenMatches(token, candidate));
  }

  function labelWeight(label) {
    const importantTokens = label.tokens.filter((token) => !LOW_VALUE_INGREDIENTS.has(token));
    if (importantTokens.length >= 2) {
      return 3;
    }
    if (importantTokens.length === 1) {
      return 2;
    }
    return 0.45;
  }

  function labelMatchesTokens(label, tokens, mode = "strict") {
    const importantTokens = label.tokens.filter((token) => !LOW_VALUE_INGREDIENTS.has(token));
    const tokensToMatch = importantTokens.length ? importantTokens : label.tokens;

    if (!tokensToMatch.length) {
      return false;
    }

    if (mode === "loose" && importantTokens.length >= 2) {
      return tokensToMatch.some((token) => containsToken(tokens, token));
    }

    return tokensToMatch.every((token) => containsToken(tokens, token));
  }

  function splitIngredientLine(value) {
    return cleanIngredientName(value)
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 2 && !/^https?:/i.test(item) && !/^(para\b|preparacion|ingredientes|como se elabora)/i.test(item));
  }

  function recipeIngredientParts(recipe) {
    return (recipe.ingredients || []).flatMap(splitIngredientLine);
  }

  function recipeMatchesLabel(recipe, label, ingredientParts) {
    const ingredientTokens = tokenizeIngredient(ingredientParts.join(" "));
    const titleTokens = tokenizeIngredient([recipe.title, recipe.type, ...(recipe.tags || [])].join(" "));

    if (labelMatchesTokens(label, ingredientTokens)) {
      return "ingredients";
    }

    const isPorkLoin = label.tokens.includes("lomo") && label.tokens.includes("cerdo");
    const looksLikeMeatRecipe = recipe.type === "Carnes";
    if (isPorkLoin && looksLikeMeatRecipe && (containsToken(ingredientTokens, "lomo") || containsToken(titleTokens, "lomo"))) {
      return "ingredients";
    }

    if (labelWeight(label) >= 2 && labelMatchesTokens(label, titleTokens)) {
      return "title";
    }

    return "";
  }

  function ingredientPartMatchesUser(part, labels) {
    const tokens = tokenizeIngredient(part);
    return labels.some((label) => labelMatchesTokens(label, tokens, "loose"));
  }

  function cleanIngredientName(value) {
    return String(value || "")
      .replace(/\([^)]*\)/g, "")
      .replace(/^[\s\-*•·▪️]+/, "")
      .replace(/^\d+([.,/]\d+)?\s*/g, "")
      .replace(/\b(grs|gr|g|kg|ml|cl|dl|l|litro|litros|cucharada|cucharadas|cucharadita|cucharaditas|cda|cdas|taza|tazas|vaso|vasos|sobre|sobres)\b\.?/gi, "")
      .replace(/^\s*(de|del)\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/^[,.;:\s]+|[,.;:\s]+$/g, "")
      .trim();
  }

  function scoreRecipeByIngredients(recipe, parsed) {
    const ingredientParts = recipeIngredientParts(recipe);
    const matched = parsed.labels
      .map((label) => {
        const source = recipeMatchesLabel(recipe, label, ingredientParts);
        return source ? { label: label.raw, weight: labelWeight(label), source } : null;
      })
      .filter(Boolean);
    const uniqueMatches = [...new Map(matched.map((item) => [normalize(item.label), item])).values()];
    const matchWeight = uniqueMatches.reduce((total, item) => total + item.weight, 0);
    const coverage = parsed.labels.length ? uniqueMatches.length / parsed.labels.length : 0;
    const hasStrongMatch = uniqueMatches.some((item) => item.weight >= 2);
    const missing = ingredientParts
      .filter((ingredient) => !ingredientPartMatchesUser(ingredient, parsed.labels))
      .map(cleanIngredientName)
      .filter((ingredient) => {
        const tokens = tokenizeIngredient(ingredient);
        return tokens.length && !tokens.every((token) => PANTRY_BASICS.has(token));
      })
      .slice(0, 8);
    const weakOnlyPenalty = hasStrongMatch ? 0 : 12;
    const score =
      matchWeight * 14 +
      coverage * 10 +
      (coverage === 1 ? 8 : 0) -
      Math.min(missing.length, 8) * 0.6 -
      weakOnlyPenalty -
      (recipe.needsReview ? 2 : 0);

    return {
      recipe,
      score,
      coverage,
      hasStrongMatch,
      matches: uniqueMatches.map((item) => item.label),
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
      .map((recipe) => scoreRecipeByIngredients(recipe, parsed))
      .filter((result) => {
        if (!result.matches.length) {
          return false;
        }
        if (parsed.labels.length === 1) {
          return result.hasStrongMatch || result.coverage === 1;
        }
        return result.hasStrongMatch && (result.coverage >= 0.5 || result.matches.length >= 2);
      })
      .sort((left, right) => right.score - left.score || right.coverage - left.coverage || left.missing.length - right.missing.length)
      .slice(0, 5);

    if (!results.length) {
      appendChatMessage("bot", "No he encontrado recetas claras con esos ingredientes. Prueba con nombres algo mas generales, como cerdo, arroz, pasta o chocolate.");
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

    elements.quickSelect.addEventListener("change", (event) => {
      state.filters.quick = event.target.value;
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

    elements.generatePlanButton.addEventListener("click", generateWeeklyPlan);

    document.addEventListener("click", (event) => {
      const favorite = event.target.closest("[data-favorite-id]");
      if (favorite) {
        event.preventDefault();
        toggleFavorite(favorite.dataset.favoriteId);
        applyFilters();
        route();
        return;
      }

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
    elements.quickSelect = qs("#quick-select");
    elements.categoryFilters = qs("#category-filters");
    elements.subcategorySelect = qs("#subcategory-select");
    elements.typeSelect = qs("#type-select");
    elements.assistantToggle = qs("#assistant-toggle");
    elements.assistantPanel = qs("#assistant-panel");
    elements.chatLog = qs("#chat-log");
    elements.ingredientForm = qs("#ingredient-form");
    elements.ingredientInput = qs("#ingredient-input");
    elements.plannerSource = qs("#planner-source");
    elements.plannerAllowFallback = qs("#planner-allow-fallback");
    elements.generatePlanButton = qs("#generate-plan-button");
    elements.plannerStatus = qs("#planner-status");
    elements.weeklyPlan = qs("#weekly-plan");
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
