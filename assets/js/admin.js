(() => {
  "use strict";

  const DATA_URL = "assets/data/recipes.json";
  const DRAFT_KEY = "recetario_editor_draft_v2";
  const LEGACY_DRAFT_KEY = "recetario_editor_draft_v1";
  const PLACEHOLDER_IMAGE = "assets/img/placeholder.jpg";
  const CATEGORIES = ["Salado", "Dulce", "Tapas"];
  const SUBCATEGORIES = ["Primeros", "Segundos", "Sencillos", "Elaborados", "Tapas", "Sin clasificar"];
  const TYPES = [
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
    selectedId: "",
    dirtyCount: 0,
    draftLoaded: false,
    filter: "all",
  };

  const el = {};

  function qs(selector) {
    return document.querySelector(selector);
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "receta";
  }

  function uniqueSlug(title, currentId = "") {
    const base = slugify(title);
    let candidate = base;
    let index = 2;
    const ids = new Set(state.recipes.filter((recipe) => recipe.id !== currentId).map((recipe) => recipe.id));
    while (ids.has(candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  function optionList(values, active) {
    const all = values.includes(active) ? values : [active, ...values].filter(Boolean);
    return all.map((value) => `<option value="${escapeHtml(value)}"${value === active ? " selected" : ""}>${escapeHtml(value)}</option>`).join("");
  }

  async function loadRecipes() {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    const recipes = await response.json();
    const draft = localStorage.getItem(DRAFT_KEY) || sessionStorage.getItem(LEGACY_DRAFT_KEY);
    state.draftLoaded = Boolean(draft);
    state.recipes = (draft ? JSON.parse(draft) : recipes).map((recipe) => ({
      ...recipe,
      needsImageReview: Boolean(recipe.needsImageReview || !recipe.image),
    }));
    state.selectedId = state.recipes[0]?.id || "";
    renderAll();
  }

  function persistDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.recipes));
    state.draftLoaded = true;
    state.dirtyCount += 1;
    renderPending();
  }

  function renderAll() {
    el.editorCount.textContent = `${state.recipes.length} recetas`;
    renderList();
    renderForm();
    renderPending();
  }

  function recipeMatches(recipe, query) {
    if (!query) {
      return true;
    }
    const text = normalize([
      recipe.title,
      recipe.category,
      recipe.subcategory,
      recipe.type,
      recipe.menuCandidate ? "habitual menu semanal" : "",
      recipe.featured ? "destacada" : "",
      recipe.notes,
      ...(recipe.ingredients || []),
      ...((recipe.ingredientSections || []).flatMap((section) => [section.title, ...(section.items || [])])),
      ...(recipe.steps || []),
      ...((recipe.preparation || []).map((block) => block.text || "")),
      ...(recipe.tags || []),
    ].join(" "));
    return text.includes(query);
  }

  function renderList() {
    const query = normalize(el.search.value.trim());
    const matches = state.recipes.filter((recipe) => recipeMatches(recipe, query) && recipeMatchesFilter(recipe));
    const visible = matches.slice(0, 120);
    el.sidebarStatus.textContent = `${matches.length} recetas en este filtro`;
    el.recipeList.innerHTML = visible.map((recipe) => `
      <button class="admin-recipe-item${recipe.id === state.selectedId ? " active" : ""}" type="button" data-recipe-id="${escapeHtml(recipe.id)}">
        <strong>${escapeHtml(recipe.title)}</strong>
        <span>${escapeHtml([
          recipe.menuCandidate ? "Habitual" : "",
          recipe.featured ? "Destacada" : "",
          recipe.needsReview ? "Por revisar" : "",
          recipe.needsImageReview ? "Revisar imagen" : "",
          !hasRealImage(recipe) ? "Sin foto" : "",
          recipe.category,
          recipe.subcategory,
          recipe.type
        ].filter(Boolean).join(" · "))}</span>
      </button>
    `).join("");
  }

  function selectedRecipe() {
    return state.recipes.find((recipe) => recipe.id === state.selectedId);
  }

  function setFieldValue(id, value) {
    qs(id).value = value || "";
  }

  function compactList(values) {
    return values.filter((value) => value && String(value).trim());
  }

  function imageList(recipe) {
    const values = [];
    if (recipe.image && recipe.image.trim()) {
      values.push(recipe.image.trim());
    }
    if (Array.isArray(recipe.images)) {
      recipe.images.forEach((image) => {
        if (image && String(image).trim()) {
          values.push(String(image).trim());
        }
      });
    }
    return [...new Set(values)];
  }

  function hasRealImage(recipe) {
    return Boolean(recipe.image && String(recipe.image).trim());
  }

  function recipeMatchesFilter(recipe) {
    if (state.filter === "routine") {
      return Boolean(recipe.menuCandidate);
    }
    if (state.filter === "featured") {
      return Boolean(recipe.featured);
    }
    if (state.filter === "review") {
      return Boolean(recipe.needsReview);
    }
    if (state.filter === "imageReview") {
      return Boolean(recipe.needsImageReview);
    }
    if (state.filter === "noImage") {
      return !hasRealImage(recipe);
    }
    return true;
  }

  function renderForm() {
    const recipe = selectedRecipe();
    if (!recipe) {
      return;
    }

    el.editorTitle.textContent = recipe.title || "Receta sin título";
    el.category.innerHTML = optionList(CATEGORIES, recipe.category || "Salado");
    el.subcategory.innerHTML = optionList(SUBCATEGORIES, recipe.subcategory || "Sin clasificar");
    el.type.innerHTML = optionList(TYPES, recipe.type || "Sin clasificar");

    setFieldValue("#field-title", recipe.title);
    setFieldValue("#field-id", recipe.id);
    setFieldValue("#field-time", recipe.time);
    setFieldValue("#field-difficulty", recipe.difficulty);
    setFieldValue("#field-servings", recipe.servings);
    setFieldValue("#field-image", recipe.image);
    setFieldValue("#field-images", imageList(recipe).join("\n"));
    setFieldValue("#field-ingredients", (recipe.ingredients || []).join("\n"));
    setFieldValue("#field-steps", (recipe.steps || []).join("\n"));
    setFieldValue("#field-notes", recipe.notes);
    setFieldValue("#field-tags", (recipe.tags || []).join(", "));
    setFieldValue("#field-source", recipe.source);
    el.menuCandidate.checked = Boolean(recipe.menuCandidate);
    el.featured.checked = Boolean(recipe.featured);
    el.review.checked = Boolean(recipe.needsReview);
    el.imageReview.checked = Boolean(recipe.needsImageReview);
    updatePreview(recipe.image);
  }

  function linesFromTextarea(value) {
    return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  function tagsFromInput(value) {
    return value.split(/[,;\n]+/).map((tag) => tag.trim()).filter(Boolean);
  }

  function syncPreparation(preparation, steps) {
    if (!Array.isArray(preparation) || !preparation.length) {
      return [];
    }

    const nextSteps = compactList(steps);
    let stepIndex = 0;
    const nextPreparation = [];

    preparation.forEach((block) => {
      if (!block || typeof block !== "object") {
        return;
      }
      if (block.type === "image" && block.src) {
        nextPreparation.push({ type: "image", src: String(block.src).trim() });
        return;
      }
      if (block.type === "heading" && block.text) {
        nextPreparation.push({ type: "heading", text: String(block.text).trim() });
        return;
      }
      if (block.type === "step" && stepIndex < nextSteps.length) {
        nextPreparation.push({ type: "step", text: nextSteps[stepIndex] });
        stepIndex += 1;
      }
    });

    while (stepIndex < nextSteps.length) {
      nextPreparation.push({ type: "step", text: nextSteps[stepIndex] });
      stepIndex += 1;
    }

    return nextPreparation;
  }

  function syncIngredientSections(sections, ingredients) {
    if (!Array.isArray(sections) || !sections.length) {
      return [];
    }

    const nextIngredients = compactList(ingredients);
    let itemIndex = 0;
    const nextSections = sections.map((section) => {
      const previousItems = Array.isArray(section?.items) ? section.items : [];
      const itemCount = previousItems.length;
      const items = nextIngredients.slice(itemIndex, itemIndex + itemCount);
      itemIndex += itemCount;
      return {
        title: section?.title || "",
        items,
      };
    }).filter((section) => section.items.length);

    if (itemIndex < nextIngredients.length) {
      const extras = nextIngredients.slice(itemIndex);
      if (nextSections.length) {
        nextSections[nextSections.length - 1].items.push(...extras);
      } else {
        nextSections.push({ title: "Otros", items: extras });
      }
    }

    return nextSections;
  }

  function formRecipe() {
    const current = selectedRecipe() || {};
    const title = el.title.value.trim() || "Receta sin título";
    const id = uniqueSlug(el.id.value.trim() || title, current.id);
    const galleryImages = linesFromTextarea(el.images.value);
    const mainImage = el.image.value.trim() || galleryImages[0] || "";
    const images = [...new Set(compactList([mainImage, ...galleryImages]))];
    const ingredients = linesFromTextarea(el.ingredients.value);
    const steps = linesFromTextarea(el.steps.value);
    return {
      ...current,
      id,
      title,
      category: el.category.value,
      subcategory: el.subcategory.value,
      type: el.type.value,
      image: mainImage,
      images,
      time: el.time.value.trim(),
      difficulty: el.difficulty.value.trim(),
      servings: el.servings.value.trim(),
      ingredients,
      ingredientSections: syncIngredientSections(current.ingredientSections, ingredients),
      steps,
      preparation: syncPreparation(current.preparation, steps),
      notes: el.notes.value.trim(),
      tags: tagsFromInput(el.tags.value),
      source: el.source.value.trim() || "Edición manual",
      menuCandidate: el.menuCandidate.checked,
      featured: el.featured.checked,
      needsReview: el.review.checked,
      needsImageReview: el.imageReview.checked,
    };
  }

  function saveCurrent(event) {
    event?.preventDefault();
    const updated = formRecipe();
    const index = state.recipes.findIndex((recipe) => recipe.id === state.selectedId);
    if (index >= 0) {
      state.recipes[index] = updated;
    } else {
      state.recipes.unshift(updated);
    }
    state.selectedId = updated.id;
    persistDraft();
    renderAll();
  }

  function newRecipe() {
    const recipe = {
      id: uniqueSlug("Nueva receta"),
      title: "Nueva receta",
      category: "Salado",
      subcategory: "Sin clasificar",
      type: "Sin clasificar",
      image: "",
      images: [],
      time: "",
      difficulty: "",
      servings: "",
      ingredients: [],
      steps: [],
      notes: "",
      tags: [],
      source: "Edición manual",
      menuCandidate: false,
      featured: false,
      needsReview: true,
      needsImageReview: true,
    };
    state.recipes.unshift(recipe);
    state.selectedId = recipe.id;
    persistDraft();
    renderAll();
  }

  function duplicateRecipe() {
    const recipe = selectedRecipe();
    if (!recipe) {
      return;
    }
    const copy = {
      ...JSON.parse(JSON.stringify(recipe)),
      id: uniqueSlug(`${recipe.title} copia`),
      title: `${recipe.title} copia`,
      menuCandidate: false,
      featured: false,
      needsReview: true,
      needsImageReview: true,
    };
    state.recipes.unshift(copy);
    state.selectedId = copy.id;
    persistDraft();
    renderAll();
  }

  function exportJson() {
    saveCurrent();
    const blob = new Blob([JSON.stringify(state.recipes, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recipes.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function discardDraft() {
    if (!window.confirm("¿Descartar el borrador guardado en este navegador y volver al JSON publicado?")) {
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(LEGACY_DRAFT_KEY);
    state.dirtyCount = 0;
    state.draftLoaded = false;
    const response = await fetch(DATA_URL, { cache: "no-store" });
    state.recipes = await response.json();
    state.selectedId = state.recipes[0]?.id || "";
    renderAll();
  }

  function updatePreview(path) {
    el.imagePreview.src = path && path.trim() ? path : PLACEHOLDER_IMAGE;
  }

  function handleImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const id = el.id.value.trim() || uniqueSlug(el.title.value || "receta");
    el.image.value = `assets/img/recetas/${id}.${extension}`;
    if (!el.images.value.trim()) {
      el.images.value = el.image.value;
    }
    el.imagePreview.src = URL.createObjectURL(file);
  }

  function renderPending() {
    if (state.draftLoaded && state.dirtyCount === 0) {
      el.pendingCount.textContent = "Borrador local cargado";
      el.editorHelper.textContent = "Hay un borrador guardado en este navegador. Descarga el archivo para publicarlo o descártalo para volver al JSON publicado.";
      return;
    }
    el.pendingCount.textContent = state.dirtyCount === 1 ? "1 cambio pendiente" : `${state.dirtyCount} cambios pendientes`;
    el.editorHelper.textContent = state.dirtyCount
      ? "Cuando termines la tanda, descarga el archivo para Alberto. Incluye todas las recetas, habituales, destacadas y correcciones."
      : "Los cambios quedan en este navegador hasta descargar el archivo y publicarlo.";
  }

  function bindEvents() {
    el.search.addEventListener("input", renderList);
    el.filter.addEventListener("change", (event) => {
      state.filter = event.target.value;
      renderList();
    });
    el.recipeList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-recipe-id]");
      if (!button) {
        return;
      }
      state.selectedId = button.dataset.recipeId;
      renderAll();
    });
    el.form.addEventListener("submit", saveCurrent);
    el.newButton.addEventListener("click", newRecipe);
    el.duplicateButton.addEventListener("click", duplicateRecipe);
    el.exportButton.addEventListener("click", exportJson);
    el.discardDraftButton.addEventListener("click", discardDraft);
    el.image.addEventListener("input", () => updatePreview(el.image.value));
    el.imageFile.addEventListener("change", handleImageFile);
    el.title.addEventListener("blur", () => {
      if (!el.id.value.trim()) {
        el.id.value = uniqueSlug(el.title.value);
      }
    });
  }

  function cacheElements() {
    el.editorCount = qs("#editor-count");
    el.search = qs("#admin-search");
    el.filter = qs("#admin-filter");
    el.sidebarStatus = qs("#admin-sidebar-status");
    el.recipeList = qs("#admin-recipe-list");
    el.editorTitle = qs("#editor-title");
    el.pendingCount = qs("#pending-count");
    el.form = qs("#recipe-form");
    el.newButton = qs("#new-recipe-button");
    el.duplicateButton = qs("#duplicate-button");
    el.exportButton = qs("#export-button");
    el.discardDraftButton = qs("#discard-draft-button");
    el.title = qs("#field-title");
    el.id = qs("#field-id");
    el.category = qs("#field-category");
    el.subcategory = qs("#field-subcategory");
    el.type = qs("#field-type");
    el.time = qs("#field-time");
    el.difficulty = qs("#field-difficulty");
    el.servings = qs("#field-servings");
    el.image = qs("#field-image");
    el.images = qs("#field-images");
    el.imageFile = qs("#field-image-file");
    el.imagePreview = qs("#image-preview");
    el.ingredients = qs("#field-ingredients");
    el.steps = qs("#field-steps");
    el.notes = qs("#field-notes");
    el.tags = qs("#field-tags");
    el.source = qs("#field-source");
    el.menuCandidate = qs("#field-menu-candidate");
    el.featured = qs("#field-featured");
    el.review = qs("#field-review");
    el.imageReview = qs("#field-image-review");
    el.editorHelper = qs("#editor-helper");
  }

  function start() {
    cacheElements();
    bindEvents();
    loadRecipes().catch(() => {
      qs(".admin-editor").innerHTML = '<div class="load-error">No se han podido cargar las recetas.</div>';
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    let started = false;
    const startOnce = () => {
      if (!started) {
        started = true;
        start();
      }
    };

    window.addEventListener("recetario:unlocked", startOnce);
    if (window.RecetarioAuth?.isUnlocked()) {
      startOnce();
    }
  });
})();
