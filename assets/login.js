function setLoginError(message) {
  var el = document.getElementById("login-error");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  setLoginError("");
  var emailEl = document.getElementById("login-email");
  var nimEl = document.getElementById("login-nim");
  var passEl = document.getElementById("login-password");
  var email = emailEl ? emailEl.value : "";
  var nim = nimEl ? nimEl.value : "";
  var password = passEl ? passEl.value : "";
  var result = attemptLogin(email, nim, password);
  if (result && result.ok) {
    window.location.href = "index.html";
    return;
  }
  setLoginError((result && result.message) ? result.message : "Login gagal.");
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", handleLoginSubmit);
});