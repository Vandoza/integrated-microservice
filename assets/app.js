let jobsState = [];
let selectedJobId = null;
let skillsIndexCache = null;
let skillsIndexLoading = false;

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
  }
  return [];
}

function normalizeTitle(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(senior|junior|jr\.?|sr\.?|middle|mid|lead)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTokenSet(str) {
  var normalized = normalizeTitle(str);
  if (!normalized) return [];
  var parts = normalized.split(" ");
  var result = [];
  parts.forEach(function (w) {
    if (w.length < 3) return;
    if (result.indexOf(w) !== -1) return;
    result.push(w);
  });
  return result;
}

function refreshJobsCount() {
  var el = document.getElementById("jobs-count");
  if (!el) return;
  if (!jobsState || jobsState.length === 0) {
    el.textContent = "0 lowongan";
    return;
  }
  el.textContent = jobsState.length + " lowongan ditampilkan";
}

function renderJobList() {
  var list = document.getElementById("jobs-list");
  var empty = document.getElementById("jobs-empty");
  if (!list || !empty) return;
  list.innerHTML = "";
  if (!jobsState || jobsState.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    refreshJobsCount();
    return;
  }
  list.classList.remove("hidden");
  empty.classList.add("hidden");
  jobsState.forEach(function (job) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "job-item" + (job.id === selectedJobId ? " active" : "");
    item.dataset.jobId = String(job.id);
    var title = document.createElement("div");
    title.className = "job-item-title";
    title.textContent = job.title || "Tanpa judul";
    var company = document.createElement("div");
    company.className = "job-item-company";
    company.textContent = (job.company_name || job.companyName || "Perusahaan tidak diketahui") + (job.location ? " · " + job.location : "");
    var metaRow = document.createElement("div");
    metaRow.className = "job-item-meta";
    var typeBadge = document.createElement("span");
    typeBadge.className = "badge";
    typeBadge.textContent = job.employment_type || job.employmentType || "Tipe tidak diketahui";
    metaRow.appendChild(typeBadge);
    var statusBadge = document.createElement("span");
    statusBadge.className = "badge badge-soft";
    statusBadge.textContent = (job.status || "").toUpperCase();
    metaRow.appendChild(statusBadge);
    item.appendChild(title);
    item.appendChild(company);
    item.appendChild(metaRow);
    item.addEventListener("click", function () {
      var id = Number(item.dataset.jobId);
      if (!Number.isFinite(id)) return;
      selectJob(id);
    });
    list.appendChild(item);
  });
  refreshJobsCount();
}

function setLoadingSkills(isLoading) {
  var loadingEl = document.getElementById("skills-loading");
  if (!loadingEl) return;
  if (isLoading) {
    loadingEl.classList.remove("hidden");
  } else {
    loadingEl.classList.add("hidden");
  }
}

function setSkillsError(message) {
  var el = document.getElementById("skills-error");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function clearSkillsView() {
  var container = document.getElementById("skills-container");
  var empty = document.getElementById("skills-empty");
  if (container) container.innerHTML = "";
  if (empty) empty.classList.add("hidden");
  setSkillsError("");
  setLoadingSkills(false);
}

function renderMatchedSkills(job, skillsIndex) {
  clearSkillsView();
  var container = document.getElementById("skills-container");
  var empty = document.getElementById("skills-empty");
  var sourceLabel = document.getElementById("skills-source");
  if (!container || !empty || !sourceLabel) return;
  if (!skillsIndex || !skillsIndex.data || !Array.isArray(skillsIndex.data)) {
    empty.classList.remove("hidden");
    sourceLabel.textContent = "";
    return;
  }
  var normalizedJobTitle = normalizeTitle(job.title || "");
  var strictMatches = skillsIndex.data.filter(function (item) {
    if (!item || typeof item.title !== "string") return false;
    return normalizeTitle(item.title) === normalizedJobTitle;
  });
  var matches = strictMatches;
  var labelSuffix = "";
  if (!matches || matches.length === 0) {
    var jobTokens = buildTokenSet(job.title || "");
    var candidates = skillsIndex.data
      .map(function (item) {
        if (!item || typeof item.title !== "string") {
          return { item: item, score: 0 };
        }
        var tokens = buildTokenSet(item.title);
        if (tokens.length === 0 || jobTokens.length === 0) {
          return { item: item, score: 0 };
        }
        var intersectionCount = 0;
        tokens.forEach(function (w) {
          if (jobTokens.indexOf(w) !== -1) intersectionCount += 1;
        });
        var unionCount = jobTokens.length + tokens.length - intersectionCount;
        var score = unionCount > 0 ? intersectionCount / unionCount : 0;
        return { item: item, score: score };
      })
      .filter(function (c) {
        return c.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
    if (candidates.length > 0) {
      var threshold = 0.25;
      var filtered = candidates.filter(function (c) {
        return c.score >= threshold;
      });
      if (filtered.length === 0) {
        filtered = candidates.slice(0, 3);
      }
      matches = filtered.map(function (c) {
        return c.item;
      });
      labelSuffix = " (dipilih berdasarkan kemiripan judul)";
    }
  }
  if (!matches || matches.length === 0) {
    empty.classList.remove("hidden");
    sourceLabel.textContent = "Tidak ditemukan entri Job-Skill yang cukup mirip dengan judul lowongan.";
    return;
  }
  sourceLabel.textContent = "Data skill diambil dari Job-Skill Requirements API (" + matches.length + " entri paling relevan)" + labelSuffix + ".";
  matches.forEach(function (entry) {
    var card = document.createElement("article");
    card.className = "skill-card";
    var header = document.createElement("div");
    header.className = "skill-card-header";
    var titleEl = document.createElement("div");
    titleEl.className = "skill-card-title";
    titleEl.textContent = entry.title || "Tanpa judul";
    var categoryEl = document.createElement("div");
    categoryEl.className = "skill-card-category";
    categoryEl.textContent = entry.category ? "Kategori: " + entry.category : "Kategori tidak tersedia";
    header.appendChild(titleEl);
    header.appendChild(categoryEl);
    var pillRow = document.createElement("div");
    pillRow.className = "skill-pill-row";
    var skills = normalizeArray(entry.skills);
    skills.forEach(function (skillName) {
      var pill = document.createElement("span");
      pill.className = "skill-pill";
      pill.textContent = skillName;
      pillRow.appendChild(pill);
    });
    card.appendChild(header);
    if (skills.length > 0) {
      card.appendChild(pillRow);
    }
    container.appendChild(card);
  });
}

function renderJobDetail(job) {
  var placeholder = document.getElementById("job-detail-placeholder");
  var detail = document.getElementById("job-detail");
  if (!placeholder || !detail) return;
  placeholder.classList.add("hidden");
  detail.classList.remove("hidden");
  var titleEl = document.getElementById("job-title");
  var companyEl = document.getElementById("job-company");
  var statusEl = document.getElementById("job-status");
  var locationEl = document.getElementById("job-location");
  var typeEl = document.getElementById("job-type");
  var createdEl = document.getElementById("job-created");
  var descEl = document.getElementById("job-description");
  var tagsEl = document.getElementById("job-tags");
  if (titleEl) titleEl.textContent = job.title || "Tanpa judul";
  var companyName = job.company_name || job.companyName || "";
  var companyText = companyName ? companyName : "Perusahaan tidak diketahui";
  if (companyEl) companyEl.textContent = companyText;
  var statusText = (job.status || "").toUpperCase();
  if (statusEl) statusEl.textContent = statusText || "STATUS TIDAK DIKETAHUI";
  var locationText = job.location || "Lokasi tidak diketahui";
  if (locationEl) locationEl.textContent = "Lokasi: " + locationText;
  var typeText = job.employment_type || job.employmentType || "Tipe tidak diketahui";
  if (typeEl) typeEl.textContent = "Tipe: " + typeText;
  var createdText = job.created_at ? "Diposting: " + formatDate(job.created_at) : "";
  if (createdEl) createdEl.textContent = createdText;
  if (descEl) descEl.textContent = job.description || "Belum ada deskripsi pekerjaan.";
  if (tagsEl) {
    tagsEl.innerHTML = "";
    var tags = normalizeArray(job.tags);
    if (tags.length === 0) {
      var noTag = document.createElement("span");
      noTag.className = "tag";
      noTag.textContent = "Belum ada tag";
      tagsEl.appendChild(noTag);
    } else {
      tags.forEach(function (tag) {
        var t = document.createElement("span");
        t.className = "tag";
        t.textContent = tag;
        tagsEl.appendChild(t);
      });
    }
  }
}

function selectJob(id) {
  if (!Number.isFinite(id)) return;
  selectedJobId = id;
  renderJobList();
  loadJobDetail(id);
}

function loadJobDetail(id) {
  var base = JOB_POSTING_BASE_URL || "";
  var url = base.replace(/\/$/, "") + "/jobs/" + encodeURIComponent(String(id));
  clearSkillsView();
  setLoadingSkills(false);
  var sourceLabel = document.getElementById("skills-source");
  if (sourceLabel) sourceLabel.textContent = "";
  fetch(url)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Gagal mengambil detail lowongan");
      }
      return res.json();
    })
    .then(function (job) {
      renderJobDetail(job);
      loadSkillsForJob(job);
    })
    .catch(function (err) {
      setSkillsError("Gagal memuat detail lowongan: " + err.message);
    });
}

function ensureSkillsIndexLoaded() {
  if (skillsIndexCache || skillsIndexLoading) {
    return Promise.resolve(skillsIndexCache);
  }
  skillsIndexLoading = true;
  setLoadingSkills(true);
  var base = JOB_SKILL_BASE_URL || "";
  var url = base.replace(/\/$/, "") + "/skills?limit=1000&page=1";
  var headers = {};
  if (JOB_SKILL_API_KEY) {
    headers["x-api-key"] = JOB_SKILL_API_KEY;
  }
  return fetch(url, { headers: headers })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Gagal mengambil data skill");
      }
      return res.json();
    })
    .then(function (data) {
      skillsIndexCache = data;
      skillsIndexLoading = false;
      setLoadingSkills(false);
      return skillsIndexCache;
    })
    .catch(function (err) {
      skillsIndexLoading = false;
      setLoadingSkills(false);
      setSkillsError("Gagal memuat data skill: " + err.message);
      return null;
    });
}

function loadSkillsForJob(job) {
  ensureSkillsIndexLoaded().then(function (index) {
    if (!index) return;
    renderMatchedSkills(job, index);
  });
}

function loadJobs(searchValue) {
  var base = JOB_POSTING_BASE_URL || "";
  var jobsBase = base.replace(/\/$/, "") + "/jobs";
  var url = new URL(jobsBase, window.location.origin);
  url.searchParams.set("status", "published");
  url.searchParams.set("limit", "20");
  url.searchParams.set("offset", "0");
  if (searchValue && searchValue.trim().length > 0) {
    url.searchParams.set("search", searchValue.trim());
  }
  fetch(url.toString())
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Gagal mengambil daftar lowongan");
      }
      return res.json();
    })
    .then(function (data) {
      jobsState = Array.isArray(data.items) ? data.items : [];
      if (jobsState.length > 0) {
        selectedJobId = jobsState[0].id;
      } else {
        selectedJobId = null;
      }
      renderJobList();
      if (selectedJobId != null) {
        loadJobDetail(selectedJobId);
      } else {
        var placeholder = document.getElementById("job-detail-placeholder");
        var detail = document.getElementById("job-detail");
        if (placeholder && detail) {
          placeholder.classList.remove("hidden");
          detail.classList.add("hidden");
        }
      }
    })
    .catch(function (err) {
      var list = document.getElementById("jobs-list");
      var empty = document.getElementById("jobs-empty");
      if (list) {
        list.innerHTML = "";
      }
      if (empty) {
        empty.classList.remove("hidden");
        empty.textContent = "Gagal memuat daftar lowongan: " + err.message;
      }
      refreshJobsCount();
    });
}

function setupEvents() {
  var form = document.getElementById("search-form");
  var input = document.getElementById("search-input");
  var refreshBtn = document.getElementById("refresh-jobs");
  if (form && input) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      loadJobs(input.value || "");
    });
  }
  if (refreshBtn && input) {
    refreshBtn.addEventListener("click", function () {
      input.value = "";
      loadJobs("");
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupEvents();
  loadJobs("");
});

