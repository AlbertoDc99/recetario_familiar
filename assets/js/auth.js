(() => {
  "use strict";

  // Barrera domestica: no hay texto plano aqui, pero sigue sin ser seguridad real.
  const ACCESS_SALT = "recetario-familiar::2026::";
  const ACCESS_DIGEST = "0e5b7b5f28989329e06e69d2e1329c26c9cf28b449b74a6611c365d68d7b5678";
  const STORAGE_KEY = "recetario_familiar_unlocked_v2";

  const state = {
    authScreen: null,
    app: null,
    form: null,
    passwordInput: null,
    error: null,
    lockButton: null,
  };

  function isUnlocked() {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  }

  function revealApp() {
    state.authScreen.hidden = true;
    state.app.hidden = false;
    state.app.setAttribute("aria-hidden", "false");
    window.dispatchEvent(new CustomEvent("recetario:unlocked"));
  }

  function revealAuth() {
    state.app.hidden = true;
    state.app.setAttribute("aria-hidden", "true");
    state.authScreen.hidden = false;
    state.passwordInput.value = "";
    state.error.hidden = true;
    window.setTimeout(() => state.passwordInput.focus(), 0);
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function unlock(password) {
    const digest = await sha256(`${ACCESS_SALT}${password}`);
    if (digest === ACCESS_DIGEST) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      revealApp();
      return true;
    }

    state.error.hidden = false;
    state.passwordInput.select();
    return false;
  }

  function lock() {
    sessionStorage.removeItem(STORAGE_KEY);
    revealAuth();
    window.dispatchEvent(new CustomEvent("recetario:locked"));
  }

  function setup() {
    state.authScreen = document.querySelector("#auth-screen");
    state.app = document.querySelector("#app");
    state.form = document.querySelector("#auth-form");
    state.passwordInput = document.querySelector("#password-input");
    state.error = document.querySelector("#auth-error");
    state.lockButton = document.querySelector("#lock-button");

    state.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await unlock(state.passwordInput.value);
    });

    state.lockButton.addEventListener("click", lock);

    if (isUnlocked()) {
      revealApp();
    } else {
      revealAuth();
    }
  }

  window.RecetarioAuth = {
    isUnlocked,
    lock,
  };

  document.addEventListener("DOMContentLoaded", setup);
})();
