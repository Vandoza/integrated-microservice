var AUTH_STORAGE_KEY = "SJ_AUTH_SESSION";
var DEMO_ACCOUNT = {
  email: "demo@kampus.ac.id",
  nim: "13523001",
  password: "demo12345"
};

function readAuthSession() {
  try {
    var raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.email || !parsed.nim) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeAuthSession(session) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    return;
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    return;
  }
}

function isAuthenticated() {
  return !!readAuthSession();
}

function attemptLogin(email, nim, password) {
  var e = String(email || "").trim().toLowerCase();
  var n = String(nim || "").trim();
  var p = String(password || "");
  if (e === DEMO_ACCOUNT.email && n === DEMO_ACCOUNT.nim && p === DEMO_ACCOUNT.password) {
    writeAuthSession({
      email: e,
      nim: n,
      logged_in_at: new Date().toISOString()
    });
    return { ok: true };
  }
  return { ok: false, message: "Email, NIM, atau password tidak sesuai." };
}

function logout() {
  clearAuthSession();
  window.location.href = "login.html";
}

function enforceAuth() {
  if (isAuthenticated()) return;
  window.location.replace("login.html");
}

function redirectIfLoggedIn() {
  if (!isAuthenticated()) return;
  window.location.replace("index.html");
}

function bindLogoutButton() {
  var btn = document.getElementById("btn-logout");
  if (!btn) return;
  btn.addEventListener("click", function () {
    logout();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  var page = (window.location.pathname || "").split("/").pop();
  if (!page || page === "index.html") {
    bindLogoutButton();
  }
});

(function () {
  var page = (window.location.pathname || "").split("/").pop();
  if (!page || page === "index.html") {
    if (!isAuthenticated()) {
      window.location.replace("login.html");
    }
    return;
  }
  if (page === "login.html") {
    if (isAuthenticated()) {
      window.location.replace("index.html");
    }
  }
})();
