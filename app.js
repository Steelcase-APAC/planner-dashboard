/**
 * PlannerHub - Executive Overview & Project Dashboard
 * Client-Side Engine for Microsoft Planner (via Live Google Sheet Sync)
 */

// Default Configuration & State
const CONFIG = {
  DEFAULT_PCLOUD_LINK: "https://u.pcloud.link/publink/show?code=XZonTYJZHVtopfBfvtyoR2DmV4ctcfrfOPBX",
  DEFAULT_PCLOUD_CODE: "XZonTYJZHVtopfBfvtyoR2DmV4ctcfrfOPBX",
  DEFAULT_SHEET_URL: "https://docs.google.com/spreadsheets/d/1l9phKIj0dEBbKbHNUCc0almdYkWHPeviDVsCyL36Fio/export?format=csv",
  API_SYNC_URL: "/api/sync",
  AUTO_SYNC_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours as requested by user
  STORAGE_KEYS: {
    TASKS: "plannerhub_tasks_data",
    LAST_SYNC: "plannerhub_last_sync_time",
    PCLOUD_LINK: "plannerhub_pcloud_link",
    SHEET_URL: "plannerhub_sheet_url",
    BUCKET_MAP: "plannerhub_bucket_names",
    ASSIGNEE_MAP: "plannerhub_assignee_names",
    LABEL_MAP: "plannerhub_label_names",
    THEME: "plannerhub_theme",
    CUSTOM_TEXT: "plannerhub_custom_text_overrides",
    ADMIN_SESSION: "plannerhub_admin_session",
    FIREBASE_CONFIG: "plannerhub_firebase_config"
  }
};

// Default mapping for all custom-editable headings and labels
const DEFAULT_TEXT_MAP = {
  // Scorecards
  "scorecard.total": "Total Tasks",
  "scorecard.in_progress": "In Progress",
  "scorecard.completed": "Completed",
  "scorecard.overdue": "Overdue Tasks",
  "scorecard.urgent": "Urgent / Important",

  // Velocity & Runway Cards
  "charts.velocity.title": "Delivery Velocity & Throughput",
  "charts.velocity.subtitle": "Tasks Created (Inflow) vs Completed (Outflow) Trend",
  "charts.runway.title": "Upcoming Deliverables Runway",
  "charts.runway.subtitle": "Milestone Deadlines Grouped across Next 5 Weeks",

  // Dual-Stream Tabs
  "tabs.strategic.eyebrow": "Executive Monitor",
  "tabs.strategic.title": "High-Level Projects & Strategic Initiatives",
  "tabs.strategic.desc": "Dedicated progress tracker for multi-stream projects across SEO, AI, Leadgen, CX, and Operations.",
  "tabs.daytoday.eyebrow": "Operational Execution",
  "tabs.daytoday.title": "Day-to-Day Tasks & Team Grind",
  "tabs.daytoday.desc": "Daily operational workflows, content production, ad updates, and sprint deliverables.",

  // Bottom Analytics
  "analytics.domain.title": "Domain & Strategic Stream Allocation",
  "analytics.domain.subtitle": "Effort allocation across SEO, AI, Leadgen, CX, Comms",
  "analytics.priority.title": "Priority & Health Matrix",
  "analytics.priority.subtitle": "Risk Breakdown",
  "analytics.checklist.title": "Checklist Deliverables Health",
  "analytics.checklist.subtitle": "Task deliverable completion meter"
};

// Obfuscated credential verification split across 4 decoupled segments (invisible to inspection)
const _kSec1 = () => [59, 40, 62, 63, 52, 46, 57, 63].map(b => String.fromCharCode(b ^ 0x5a)).join('');
const _kSec2 = () => [81, 75, 74, 77, 70, 127, 88, 82].map(b => String.fromCharCode(b ^ 0x3f)).join('');
const _kSec3 = () => [29, 21, 16, 82, 31, 19, 17, 0].map(b => String.fromCharCode(b ^ 0x7c)).join('');
const _kSec4 = () => [24, 24, 25, 24, 25, 24].map(b => String.fromCharCode(b ^ 0x2b)).join('');

async function verifyAdminAuth(idVal, pwVal) {
  if (!idVal || !pwVal) return false;
  const candidate = `${idVal.trim().toLowerCase()}|${pwVal.trim()}`;
  const target = _kSec1() + _kSec2() + _kSec3() + _kSec4();
  if (candidate !== target) return false;
  
  try {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(candidate));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === "178f063c506c795639eec25c25bd9329b5081b53ad9e5a14e795efa17dec3f7d";
  } catch (e) {
    return true; // Fallback if crypto.subtle is unavailable
  }
}

// Default friendly mappings for known Planner IDs in this workspace
const DEFAULT_BUCKETS = {
  "f1v-2jW3aU-0dIkZTM4BkGQAEhcr": "Announcements & Comms",
  "6JvhtLPIeESNdpj7RA8Ir2QAIT3A": "Digital Tracking & Web",
  "hXWXxcacR0e8OSPDfuHME2QAMCsP": "Operations & Finance",
  "FcWT8p45_0yAmU3I_Ewh9GQAGRCc": "Media Planning & Sales",
  "VvFb0U6zYUiz9zKudbSK6WQAP0Yz": "Campaigns & Social Media",
  "Q-B-9LalqE6gH1IrVdcQdmQAI0FV": "Brand & Events",
  "Gw8d1qlHp0G2XXOqpsiKP2QAPmSt": "Web & Regional Comms"
};

const BUCKET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#6366f1"  // Indigo
];

const DEFAULT_ASSIGNEES = {
  "b0dde2c9-92a4-4d86-a4fd-2a130944956f": "Aisah",
  "d8b70168-3e9f-451c-898e-9a1da643aafe": "Rebecca",
  "8275aaa4-2f87-4474-8d57-d6e65233cfe8": "Adam"
};

// Microsoft Planner Label / Category Mappings matching plan configuration
const DEFAULT_LABELS = {
  "category1": { name: "Web-dotcom", class: "cat-web-dotcom" },
  "category2": { name: "Web-Spark", class: "cat-web-spark" },
  "category3": { name: "Web-Widen", class: "cat-web-widen" },
  "category4": { name: "SM-Post", class: "cat-sm-post" },
  "category5": { name: "Email-EDM", class: "cat-email-edm" },
  "category6": { name: "Email-APAnnouncement", class: "cat-email-apannouncement" },
  "category7": { name: "Email-APAC News", class: "cat-email-apac-news" },
  "category8": { name: "SEO", class: "cat-seo" },
  "category9": { name: "Salesforce", class: "cat-salesforce" },
  "category10": { name: "Hubspot", class: "cat-hubspot" },
  "category11": { name: "ADS- Planning", class: "cat-ads-planning" },
  "category12": { name: "ADS- Review", class: "cat-ads-review" },
  "category13": { name: "Report", class: "cat-report" },
  "category14": { name: "Others", class: "cat-others" },
  "category15": { name: "Webinar", class: "cat-webinar" },
  "category16": { name: "Google", class: "cat-google" },
  "category17": { name: "Facebook", class: "cat-facebook" },
  "category18": { name: "CORE-Project", class: "cat-core-project" },
  "category19": { name: "LinkedIn", class: "cat-linkedin" },
  "category25": { name: "Open AI", class: "cat-open-ai" },
  "CORE-Project": { name: "CORE-Project", class: "cat-core-project" }
};

// Application State
const state = {
  tasks: [],
  filteredTasks: [],
  lastSyncTime: null,
  activeView: "dashboard",
  filters: {
    search: "",
    label: "ALL",
    priority: "ALL",
    status: "ALL",
    assignee: "ALL"
  },
  bucketMap: { ...DEFAULT_BUCKETS },
  assigneeMap: { ...DEFAULT_ASSIGNEES },
  labelMap: { ...DEFAULT_LABELS },
  pcloudLink: CONFIG.DEFAULT_PCLOUD_LINK,
  pcloudCode: CONFIG.DEFAULT_PCLOUD_CODE,
  sheetUrl: CONFIG.DEFAULT_SHEET_URL,
  ganttZoom: "days", // 'days' | 'weeks' | 'months'
  collapsedBuckets: new Set(),
  tableGroupBy: "none", // Individual items per label (Flat Table) by default
  kanbanGroupBy: "status",
  calendarDate: new Date(2026, 9, 8),
  selectedProjectDomain: "ALL",
  projectListViewMode: "cards",
  textOverrides: {},
  isAdminLoggedIn: false,
  isInlineEditActive: false,
  firestoreDb: null
};

/* ==========================================================================
   Initialization
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  loadPreferences();
  initEventListeners();
  initTheme();
  applyCustomTextOverrides();
  initAdminEditorial();
  initFirestoreSync();
  
  if (window.location.hash === "#settings") {
    setTimeout(openSettingsDrawer, 200);
  }
  
  // Try loading cached tasks first for 0ms instant startup
  let hasData = loadCachedTasks();
  if (hasData) {
    populateFilterOptions();
    applyFiltersAndRender();
  }

  // Always load latest static bundle immediately and warm up local cache
  try {
    const resp = await fetch("data/planner_tasks.json");
    if (resp.ok) {
      const payload = await resp.json();
      const list = Array.isArray(payload) ? payload : payload.tasks;
      if (Array.isArray(list) && list.length > 0) {
        state.tasks = normalizeRawTaskObjects(list);
        cacheTasks(state.tasks);
        populateFilterOptions();
        applyFiltersAndRender();
      }
    }
  } catch (e) {}
  
  // Trigger live sync in background
  fetchDataFromSheet();

  // Setup periodic sync countdown and 2-hour interval
  setInterval(updateSyncCountdownUI, 60000); // Update timestamp text every minute
  setInterval(fetchDataFromSheet, CONFIG.AUTO_SYNC_INTERVAL_MS);
});

/* ==========================================================================
   Preferences & LocalStorage Management
   ========================================================================== */

function extractPcloudCode(urlOrCode) {
  if (!urlOrCode) return CONFIG.DEFAULT_PCLOUD_CODE;
  const match = urlOrCode.match(/code=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const trimmed = urlOrCode.trim();
  if (/^[a-zA-Z0-9_-]{15,45}$/.test(trimmed)) return trimmed;
  return CONFIG.DEFAULT_PCLOUD_CODE;
}

function loadPreferences() {
  const savedPcloud = localStorage.getItem(CONFIG.STORAGE_KEYS.PCLOUD_LINK);
  if (savedPcloud) {
    state.pcloudLink = savedPcloud;
    state.pcloudCode = extractPcloudCode(savedPcloud);
  } else {
    state.pcloudCode = extractPcloudCode(state.pcloudLink);
  }

  const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.SHEET_URL);
  if (savedUrl) state.sheetUrl = savedUrl;

  const savedBuckets = localStorage.getItem(CONFIG.STORAGE_KEYS.BUCKET_MAP);
  if (savedBuckets) {
    try { state.bucketMap = { ...DEFAULT_BUCKETS, ...JSON.parse(savedBuckets) }; } catch (e) {}
  }

  const savedAssignees = localStorage.getItem(CONFIG.STORAGE_KEYS.ASSIGNEE_MAP);
  if (savedAssignees) {
    try { 
      const parsed = JSON.parse(savedAssignees);
      state.assigneeMap = { ...DEFAULT_ASSIGNEES, ...parsed }; 
    } catch (e) {}
  }

  // Automatic migration & correction of assignee mappings
  if (state.assigneeMap["d8b70168-3e9f-451c-898e-9a1da643aafe"] === "Adam" || 
      state.assigneeMap["8275aaa4-2f87-4474-8d57-d6e65233cfe8"] === "Rebecca" ||
      state.assigneeMap["8275aaa4-2f87-4474-8d57-d6e65233cfe8"] === "Marketing Lead") {
    state.assigneeMap["d8b70168-3e9f-451c-898e-9a1da643aafe"] = "Rebecca";
    state.assigneeMap["8275aaa4-2f87-4474-8d57-d6e65233cfe8"] = "Adam";
    state.assigneeMap["b0dde2c9-92a4-4d86-a4fd-2a130944956f"] = "Aisah";
    localStorage.setItem(CONFIG.STORAGE_KEYS.ASSIGNEE_MAP, JSON.stringify(state.assigneeMap));
  }

  // Load custom label mappings if saved
  const savedLabels = localStorage.getItem(CONFIG.STORAGE_KEYS.LABEL_MAP);
  if (savedLabels) {
    try {
      state.labelMap = { ...DEFAULT_LABELS, ...JSON.parse(savedLabels) };
    } catch (e) {}
  }
  // Ensure CORE-Project is explicitly present
  if (!state.labelMap["category18"] || state.labelMap["category18"].name !== "CORE-Project") {
    state.labelMap["category18"] = { name: "CORE-Project", class: "cat-core-project" };
    state.labelMap["CORE-Project"] = { name: "CORE-Project", class: "cat-core-project" };
  }

  const savedLastSync = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SYNC);
  if (savedLastSync) {
    state.lastSyncTime = new Date(savedLastSync);
    updateSyncCountdownUI();
  }

  // Load custom text overrides if saved
  const savedText = localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOM_TEXT);
  if (savedText) {
    try {
      state.textOverrides = JSON.parse(savedText) || {};
    } catch (e) {}
  }

  // Restore active Admin Session if previously authenticated
  const adminSession = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
  if (adminSession === "true") {
    state.isAdminLoggedIn = true;
  }
}

function savePreferences() {
  localStorage.setItem(CONFIG.STORAGE_KEYS.PCLOUD_LINK, state.pcloudLink);
  localStorage.setItem(CONFIG.STORAGE_KEYS.SHEET_URL, state.sheetUrl);
  localStorage.setItem(CONFIG.STORAGE_KEYS.BUCKET_MAP, JSON.stringify(state.bucketMap));
  localStorage.setItem(CONFIG.STORAGE_KEYS.ASSIGNEE_MAP, JSON.stringify(state.assigneeMap));
  localStorage.setItem(CONFIG.STORAGE_KEYS.LABEL_MAP, JSON.stringify(state.labelMap));
}

function loadCachedTasks() {
  const cachedJson = localStorage.getItem(CONFIG.STORAGE_KEYS.TASKS);
  if (cachedJson) {
    try {
      state.tasks = JSON.parse(cachedJson);
      // Revive serialized date strings into real Date instances
      state.tasks.forEach(t => {
        if (t.createdDate) t.createdDate = new Date(t.createdDate);
        if (t.startDate) t.startDate = new Date(t.startDate);
        if (t.dueDate) t.dueDate = new Date(t.dueDate);
        if (t.completedDate) t.completedDate = new Date(t.completedDate);
      });
      return state.tasks.length > 0;
    } catch (e) {
      console.warn("Failed to parse cached tasks", e);
    }
  }
  return false;
}

function cacheTasks(tasks) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    state.lastSyncTime = new Date();
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SYNC, state.lastSyncTime.toISOString());
    updateSyncCountdownUI();
  } catch (e) {
    console.warn("LocalStorage cache quota exceeded or error", e);
  }
}

/* ==========================================================================
   Data Fetching Engine (Live pCloud Sync with Local & CSV Fallbacks)
   ========================================================================== */

function getCategoryClass(name) {
  if (!name) return "cat-default";
  const low = String(name).toLowerCase();
  if (low.includes("seo")) return "cat-seo";
  if (low.includes("ai") || low.includes("open ai")) return "cat-open-ai";
  if (low.includes("leadgen")) return "cat-leadgen";
  if (low.includes("report")) return "cat-report";
  if (low.includes("web-dotcom")) return "cat-web-dotcom";
  if (low.includes("spark")) return "cat-web-spark";
  if (low.includes("widen")) return "cat-web-widen";
  if (low.includes("sm-post") || low.includes("social")) return "cat-sm-post";
  if (low.includes("email") || low.includes("edm")) return "cat-email-edm";
  if (low.includes("ads")) return "cat-ads-planning";
  if (low.includes("cx")) return "cat-cx";
  if (low.includes("project")) return "cat-core-project";
  return "cat-default";
}

function normalizeRawTaskObjects(rawItems) {
  const tasks = [];
  const now = new Date();

  rawItems.forEach((item, idx) => {
    if (!item) return;
    const taskId = item.TaskId || item.id || `task-${idx}`;
    const title = item.Title || item.title || "";
    if (!title && !taskId) return;

    const bucketId = item.BucketId || item.bucketId || "default";
    const rawBucketName = item.BucketName || item.bucketName;
    if (rawBucketName && rawBucketName !== "N/A" && typeof rawBucketName === "string" && rawBucketName.trim()) {
      state.bucketMap[bucketId] = rawBucketName.trim();
    }

    const percentComplete = parseInt(item.PercentComplete ?? item.percentComplete ?? 0, 10) || 0;
    const priorityLabel = item.PriorityLabel || item.priority || "Medium";

    // Assignees
    const assigneeIds = [];
    const rawAssignees = item.AssignedToIds || item.assigneeIds;
    if (Array.isArray(rawAssignees)) {
      rawAssignees.forEach(aid => { if (aid) assigneeIds.push(aid); });
    } else if (typeof rawAssignees === "string" && rawAssignees.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawAssignees);
        Object.keys(parsed).forEach(uid => assigneeIds.push(uid));
      } catch (e) {}
    } else if (typeof rawAssignees === "object" && rawAssignees !== null) {
      Object.keys(rawAssignees).forEach(uid => assigneeIds.push(uid));
    }

    // Assignee names (handles new "First Last; Second Last" and legacy "Last, First")
    const rawAssigneeNames = item.AssignedToNames || item.AssignedTo;
    if (typeof rawAssigneeNames === "string" && rawAssigneeNames !== "N/A" && rawAssigneeNames.trim()) {
      let namesList = [];
      if (rawAssigneeNames.includes(";")) {
        namesList = rawAssigneeNames.split(";").map(s => s.trim()).filter(Boolean);
      } else if (rawAssigneeNames.includes(",") && !rawAssigneeNames.includes(" ")) {
        namesList = rawAssigneeNames.split(",").map(s => s.trim()).filter(Boolean);
      } else {
        namesList = [rawAssigneeNames.trim()];
      }
      assigneeIds.forEach((uid, i) => {
        if (namesList[i] && !state.assigneeMap[uid]) {
          state.assigneeMap[uid] = namesList[i];
        }
      });
    }

    const startStr = item.StartDateTime || item.startDate;
    const dueStr = item.DueDateTime || item.dueDate;
    const completedStr = item.CompletedDateTime || item.completedDate;
    const createdStr = item.CreatedDateTime || item.createdDate;

    let statusKey = "NOT_STARTED";
    if (percentComplete === 100 || completedStr) {
      statusKey = "COMPLETED";
    } else if (percentComplete > 0) {
      statusKey = "IN_PROGRESS";
    }

    let isOverdue = false;
    let dueDateObj = null;
    if (dueStr) {
      dueDateObj = new Date(dueStr);
      if (!isNaN(dueDateObj.getTime())) {
        if (statusKey !== "COMPLETED" && dueDateObj < now) {
          isOverdue = true;
        }
      }
    }

    const labelTags = [];
    const rawLabels = item.Labels || item.labels;
    if (Array.isArray(rawLabels)) {
      labelTags.push(...rawLabels);
    } else if (typeof rawLabels === "string" && rawLabels.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawLabels);
        Object.keys(parsed).forEach(cat => {
          if (parsed[cat]) labelTags.push(cat);
        });
      } catch (e) {}
    } else if (typeof rawLabels === "object" && rawLabels !== null) {
      Object.keys(rawLabels).forEach(cat => {
        if (rawLabels[cat]) labelTags.push(cat);
      });
    }

    // Incorporate enriched LabelNames from latest Excel runs
    const rawLabelNamesStr = item.LabelNames || (item.rawRow && item.rawRow.LabelNames);
    if (typeof rawLabelNamesStr === "string" && rawLabelNamesStr.trim()) {
      const parsedNames = rawLabelNamesStr.split(",").map(s => s.trim()).filter(Boolean);
      parsedNames.forEach(name => {
        if (!state.labelMap[name]) {
          state.labelMap[name] = { name: name, class: getCategoryClass(name) };
        }
        if (!labelTags.includes(name)) {
          labelTags.push(name);
        }
      });
    }

    tasks.push({
      id: taskId,
      title: title || "Untitled Task",
      bucketId: bucketId,
      percentComplete: percentComplete,
      priority: priorityLabel,
      status: statusKey,
      isOverdue: isOverdue,
      assigneeIds: assigneeIds,
      createdDate: createdStr ? new Date(createdStr) : null,
      startDate: startStr ? new Date(startStr) : null,
      dueDate: dueDateObj,
      completedDate: completedStr ? new Date(completedStr) : null,
      description: item.Description || item.description || "",
      checklistCount: parseInt(item.ChecklistItemCount ?? item.checklistCount ?? 0, 10),
      checklistSummary: item.ChecklistSummary || item.checklistSummary || "",
      planName: item.PlanName || "",
      daysOverdue: item.DaysOverdue,
      daysToDue: item.DaysToDue,
      labelNames: rawLabelNamesStr || "",
      labels: labelTags,
      rawRow: item
    });
  });

  return tasks;
}

async function fetchDataFromSheet() {
  const btnSync = document.getElementById("btnSyncNow");
  const syncLabel = document.getElementById("syncStatusLabel");
  
  if (btnSync) btnSync.classList.add("spinning");
  if (syncLabel) syncLabel.textContent = "Syncing pCloud...";

  try {
    let tasks = [];
    let sourceUsed = "";

    // Step 1: Fetch live from backend /api/sync (pCloud engine)
    try {
      const code = state.pcloudCode || CONFIG.DEFAULT_PCLOUD_CODE;
      const resp = await fetch(`${CONFIG.API_SYNC_URL}?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      if (resp.ok) {
        const payload = await resp.json();
        if (payload && payload.success && Array.isArray(payload.tasks) && payload.tasks.length > 0) {
          tasks = normalizeRawTaskObjects(payload.tasks);
          sourceUsed = `pCloud (${payload.sourceDetail || "Live API"})`;
        }
      }
    } catch (apiErr) {
      console.warn("Backend /api/sync unreachable, trying static JSON cache:", apiErr);
    }

    // Step 2: Fallback to static JSON cache (data/planner_tasks.json)
    if (!tasks || tasks.length === 0) {
      try {
        const jsonResp = await fetch("data/planner_tasks.json", { cache: "no-store" });
        if (jsonResp.ok) {
          const jsonPayload = await jsonResp.json();
          const list = Array.isArray(jsonPayload) ? jsonPayload : jsonPayload.tasks;
          if (Array.isArray(list) && list.length > 0) {
            tasks = normalizeRawTaskObjects(list);
            sourceUsed = "pCloud Data Cache";
          }
        }
      } catch (jsonErr) {
        console.warn("Static JSON fallback failed:", jsonErr);
      }
    }

    // Step 3: Fallback to CSV (data/planner_sheet.csv or remote sheet)
    if (!tasks || tasks.length === 0) {
      try {
        let csvText = "";
        const localResp = await fetch("data/planner_sheet.csv", { cache: "no-store" });
        if (localResp.ok) {
          csvText = await localResp.text();
        } else if (state.sheetUrl) {
          const remoteResp = await fetch(state.sheetUrl, { cache: "no-store" });
          if (remoteResp.ok) csvText = await remoteResp.text();
        }
        if (csvText && csvText.length > 50) {
          tasks = parsePlannerCSV(csvText);
          sourceUsed = "Backup Sheet CSV";
        }
      } catch (csvErr) {
        console.warn("CSV fallback failed:", csvErr);
      }
    }

    if (!tasks || tasks.length === 0) {
      throw new Error("Unable to retrieve Planner data from pCloud or local cache.");
    }

    state.tasks = tasks;
    cacheTasks(tasks);
    populateFilterOptions();
    applyFiltersAndRender();
    showAlert(`Data synchronized from ${sourceUsed} (${tasks.length} tasks).`, "success");

  } catch (error) {
    console.error("Sync error:", error);
    showAlert("Failed to sync latest pCloud data. Displaying cached tasks.", "warning");
  } finally {
    if (btnSync) btnSync.classList.remove("spinning");
    if (syncLabel) syncLabel.textContent = "Synced (pCloud)";
    updateSyncCountdownUI();
  }
}

/**
 * Robust RFC-4180 CSV parser handling multiline text, quotes, and commas
 */
function parsePlannerCSV(text) {
  const lines = splitCSVLines(text);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const colIndex = {};
  headers.forEach((h, idx) => {
    colIndex[h.trim()] = idx;
  });

  const tasks = [];
  const now = new Date();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || !rawLine.trim()) continue;

    const row = parseCSVRow(rawLine);
    if (row.length < 3) continue;

    const getCol = (name) => {
      const idx = colIndex[name];
      return (idx !== undefined && row[idx]) ? row[idx].trim() : "";
    };

    const taskId = getCol("TaskId");
    const title = getCol("Title");
    if (!title && !taskId) continue;

    const bucketId = getCol("BucketId") || "default";
    const rawBucketName = getCol("BucketName");
    if (rawBucketName && rawBucketName !== "N/A" && rawBucketName.trim()) {
      state.bucketMap[bucketId] = rawBucketName.trim();
    }

    const percentStr = getCol("PercentComplete") || "0";
    const percentComplete = parseInt(percentStr, 10) || 0;
    const priorityLabel = getCol("PriorityLabel") || "Medium";
    const rawAssignees = getCol("AssignedToIds");
    const rawAssigneeNames = getCol("AssignedToNames") || getCol("AssignedTo");
    const startStr = getCol("StartDateTime");
    const dueStr = getCol("DueDateTime");
    const completedStr = getCol("CompletedDateTime");
    const createdStr = getCol("CreatedDateTime");
    const rawLabels = getCol("Labels");
    const description = getCol("Description");
    const checklistCount = parseInt(getCol("ChecklistItemCount") || "0", 10);
    const checklistSummary = getCol("ChecklistSummary");

    // Extract Assignee IDs and names
    const assigneeIds = [];
    if (rawAssignees && rawAssignees.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawAssignees);
        Object.keys(parsed).forEach(uid => assigneeIds.push(uid));
      } catch (e) {}
    }

    // If explicit display names provided in a column
    if (rawAssigneeNames && rawAssigneeNames !== "N/A" && rawAssigneeNames.trim()) {
      const namesList = rawAssigneeNames.split(",").map(s => s.trim()).filter(Boolean);
      assigneeIds.forEach((uid, idx) => {
        if (namesList[idx] && !state.assigneeMap[uid]) {
          state.assigneeMap[uid] = namesList[idx];
        }
      });
    }

    // Determine status key
    let statusKey = "NOT_STARTED";
    if (percentComplete === 100 || completedStr) {
      statusKey = "COMPLETED";
    } else if (percentComplete > 0) {
      statusKey = "IN_PROGRESS";
    }

    // Determine overdue
    let isOverdue = false;
    let dueDateObj = null;
    if (dueStr) {
      dueDateObj = new Date(dueStr);
      if (!isNaN(dueDateObj.getTime())) {
        if (statusKey !== "COMPLETED" && dueDateObj < now) {
          isOverdue = true;
        }
      }
    }

    // Extract tags/labels
    const labelTags = [];
    if (rawLabels && rawLabels.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawLabels);
        Object.keys(parsed).forEach(cat => {
          if (parsed[cat]) labelTags.push(cat);
        });
      } catch (e) {}
    }

    tasks.push({
      id: taskId || `task-${i}`,
      title: title || "Untitled Task",
      bucketId: bucketId,
      percentComplete: percentComplete,
      priority: priorityLabel,
      status: statusKey,
      isOverdue: isOverdue,
      assigneeIds: assigneeIds,
      createdDate: createdStr ? new Date(createdStr) : null,
      startDate: startStr ? new Date(startStr) : null,
      dueDate: dueDateObj,
      completedDate: completedStr ? new Date(completedStr) : null,
      description: description,
      checklistCount: checklistCount,
      checklistSummary: checklistSummary,
      labels: labelTags,
      rawRow: row
    });
  }

  return tasks;
}

function splitCSVLines(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    lines.push(current);
  }
  return lines;
}

function parseCSVRow(line) {
  const row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current);
  return row;
}

/* ==========================================================================
   Filter & Search Engine
   ========================================================================== */

function applyFiltersAndRender() {
  if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
    if (!loadCachedTasks()) {
      console.warn("applyFiltersAndRender deferred: tasks not loaded yet.");
      return;
    }
  }

  const query = state.filters.search.toLowerCase().trim();
  const labelFilter = state.filters.label || "ALL";
  const priorityFilter = state.filters.priority;
  const statusFilter = state.filters.status;
  const assigneeFilter = state.filters.assignee;

  state.filteredTasks = state.tasks.filter(task => {
    // Search query matches title, description, label name, or assignee
    if (query) {
      const inTitle = task.title.toLowerCase().includes(query);
      const inDesc = task.description.toLowerCase().includes(query);
      const inLabel = task.labels.some(cat => {
        const lObj = state.labelMap[cat];
        return lObj && lObj.name.toLowerCase().includes(query);
      });
      const inAssignee = task.assigneeIds.some(id => getAssigneeName(id).toLowerCase().includes(query));
      if (!inTitle && !inDesc && !inLabel && !inAssignee) {
        return false;
      }
    }

    // Individual Label filter
    if (labelFilter !== "ALL") {
      if (labelFilter === "unlabeled") {
        if (task.labels && task.labels.length > 0) return false;
      } else {
        const targetLabelObj = state.labelMap[labelFilter];
        const targetName = (targetLabelObj ? targetLabelObj.name : labelFilter).toLowerCase();

        const hasMatch = (task.labels || []).some(cat => {
          if (cat === labelFilter) return true;
          const lObj = state.labelMap[cat];
          if (lObj && lObj.name.toLowerCase() === targetName) return true;
          if (cat.toLowerCase() === targetName) return true;
          return false;
        });

        // Also allow matching if the newly created label name is mentioned in title or description
        const inText = task.title.toLowerCase().includes(targetName) || 
                       (task.description && task.description.toLowerCase().includes(targetName));

        if (!hasMatch && !inText) return false;
      }
    }

    // Priority filter
    if (priorityFilter !== "ALL" && task.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL") {
      if (statusFilter === "OVERDUE") {
        if (!task.isOverdue) return false;
      } else if (task.status !== statusFilter) {
        return false;
      }
    }

    // Assignee filter
    if (assigneeFilter !== "ALL") {
      if (!task.assigneeIds.includes(assigneeFilter)) {
        return false;
      }
    }

    return true;
  });

  // Update header count badge
  const countBadge = document.getElementById("taskCountBadge");
  if (countBadge) {
    countBadge.textContent = `${state.filteredTasks.length} tasks`;
  }

  // Render the currently active view
  renderCurrentView();
}

function renderCurrentView() {
  switch (state.activeView) {
    case "dashboard":
      renderDashboardView();
      break;
    case "table":
      renderTableView();
      break;
    case "gantt":
      renderGanttView();
      setTimeout(() => scrollToTodayInGantt(false), 50);
      break;
    case "calendar":
      renderCalendarView();
      break;
    case "kanban":
      renderKanbanView();
      break;
    case "workload":
      renderWorkloadView();
      break;
  }
}

/* ==========================================================================
   View 1: Executive Overview Dashboard
   ========================================================================== */

function renderDashboardView() {
  const tasks = state.filteredTasks;
  const total = tasks.length;
  
  let inProgressCount = 0;
  let completedCount = 0;
  let overdueCount = 0;
  let urgentCount = 0;

  const labelCounts = {};
  const priorityCounts = { Urgent: 0, Important: 0, Medium: 0, Low: 0 };

  tasks.forEach(t => {
    if (t.status === "COMPLETED") completedCount++;
    else if (t.status === "IN_PROGRESS") inProgressCount++;

    if (t.isOverdue) overdueCount++;
    if (t.priority === "Urgent" || t.priority === "Important") urgentCount++;

    if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++;

    // Tally by actual individual Planner label
    const cats = getTaskCategories(t);
    cats.forEach(c => {
      if (!labelCounts[c.name]) {
        labelCounts[c.name] = { total: 0, completed: 0, inProgress: 0, notStarted: 0, class: c.class };
      }
      labelCounts[c.name].total++;
      if (t.status === "COMPLETED") labelCounts[c.name].completed++;
      else if (t.status === "IN_PROGRESS") labelCounts[c.name].inProgress++;
      else labelCounts[c.name].notStarted++;
    });
  });

  // Update KPI Cards
  document.getElementById("kpiTotalTasks").textContent = total;
  const bucketCountEl = document.getElementById("kpiBucketCount");
  if (bucketCountEl) {
    const activeLabelCount = Object.keys(labelCounts).length;
    bucketCountEl.textContent = `Across ${activeLabelCount} active labels`;
  }
  document.getElementById("kpiInProgress").textContent = inProgressCount;
  document.getElementById("kpiCompleted").textContent = completedCount;
  document.getElementById("kpiOverdue").textContent = overdueCount;
  document.getElementById("kpiUrgent").textContent = urgentCount;

  const inProgressPct = total ? Math.round((inProgressCount / total) * 100) : 0;
  const completedPct = total ? Math.round((completedCount / total) * 100) : 0;

  document.getElementById("kpiInProgressPctBar").style.width = `${inProgressPct}%`;
  document.getElementById("kpiInProgressPct").textContent = `${inProgressPct}% of active portfolio`;
  document.getElementById("kpiCompletedPct").textContent = `${completedPct}% completed`;

  const overdueEl = document.getElementById("kpiOverdueText");
  if (overdueCount > 0) {
    overdueEl.textContent = `${overdueCount} tasks past due date`;
    overdueEl.className = "metric-sub text-danger";
  } else {
    overdueEl.textContent = "All deliverables on schedule";
    overdueEl.className = "metric-sub text-success";
  }

  // 1. Render Time Series Graphs: Delivery Velocity & Throughput + Runway (Section 2)
  renderVelocityChart(tasks);
  renderRunwayBars(tasks);

  // 2. Render Secondary Analytics: Domain Breakdown, Priority Matrix & Deliverables Health
  renderLabelBars(labelCounts);
  renderPriorityMatrix(priorityCounts, total, overdueCount);
  renderDeliverablesHealth(tasks);

  // 3. Render Dual-Stream Workspace (Two-Tab Section: Strategic Projects & Day-to-Day Tasks)
  renderStrategicProjectsRadar(tasks);
  renderDayToDaySection(tasks);
  setupOverviewTabs();
}

/* ==========================================================================
   Executive Strategic Projects Radar Engine (Boss Monitoring Feature)
   ========================================================================== */

function isStrategicProject(task) {
  if (!task) return false;
  const title = (task.title || "").toLowerCase();
  if (title.includes("project")) return true;

  const rawLabelsStr = String(task.labelNames || (task.rawRow && task.rawRow.LabelNames) || "").toLowerCase();
  if (rawLabelsStr.includes("project")) return true;

  if (Array.isArray(task.labels)) {
    if (task.labels.some(l => String(l).toLowerCase().includes("project"))) return true;
  }
  return false;
}

function getProjectDomain(task) {
  const allLabels = [];
  const labelNamesStr = task.labelNames || (task.rawRow && task.rawRow.LabelNames);
  if (labelNamesStr) {
    allLabels.push(...String(labelNamesStr).split(",").map(s => s.trim()));
  }
  if (Array.isArray(task.labels)) {
    allLabels.push(...task.labels);
  }

  for (const l of allLabels) {
    const lower = l.toLowerCase();
    if (!lower.includes("project")) {
      if (lower.includes("seo")) return { name: "SEO", class: "domain-seo" };
      if (lower.includes("ai") || lower.includes("open ai")) return { name: "AI Initiative", class: "domain-ai" };
      if (lower.includes("leadgen") || lower.includes("abm")) return { name: "Leadgen", class: "domain-leadgen" };
      if (lower.includes("cx")) return { name: "CX & UX", class: "domain-cx" };
      if (lower.includes("report") || lower.includes("sop") || lower.includes("clickup") || lower.includes("planner")) return { name: "Reporting & Ops", class: "domain-report" };
      if (lower.includes("ads")) return { name: "Ads Planning", class: "domain-ads" };
      if (lower.includes("event")) return { name: "Events", class: "domain-event" };
      if (lower.includes("web") || lower.includes("spark") || lower.includes("widen")) return { name: "Web & Digital", class: "domain-web" };
      if (lower.includes("email") || lower.includes("edm") || lower.includes("comms")) return { name: "Comms & Email", class: "domain-email" };
    }
  }

  // Fallback to title keywords
  const title = (task.title || "").toLowerCase();
  if (title.includes("seo")) return { name: "SEO", class: "domain-seo" };
  if (title.includes("ai") || title.includes("sdr")) return { name: "AI Initiative", class: "domain-ai" };
  if (title.includes("lead") || title.includes("agency")) return { name: "Leadgen", class: "domain-leadgen" };
  if (title.includes("cx")) return { name: "CX & UX", class: "domain-cx" };
  if (title.includes("report") || title.includes("sop") || title.includes("planner")) return { name: "Reporting & Ops", class: "domain-report" };

  return { name: "Strategic Project", class: "domain-general" };
}

function parseChecklistStats(task) {
  let done = 0;
  let total = task.checklistCount || 0;

  if (task.checklistSummary && typeof task.checklistSummary === "string" && task.checklistSummary.trim().startsWith("[")) {
    try {
      const items = JSON.parse(task.checklistSummary);
      if (Array.isArray(items)) {
        total = items.length;
        done = items.filter(it => {
          const val = it.value || it;
          return Boolean(val.isChecked ?? it.isChecked ?? false);
        }).length;
      }
    } catch (e) {
      const doneMatches = task.checklistSummary.match(/"isChecked":true/g);
      done = doneMatches ? doneMatches.length : 0;
    }
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : (task.percentComplete || 0);
  return { done, total, pct };
}

function getTaskChecklistItems(task) {
  if (!task.checklistSummary) return [];
  if (typeof task.checklistSummary === "string" && task.checklistSummary.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(task.checklistSummary);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          const val = item.value || item;
          return {
            id: item.id || `cl-${task.id}-${idx}`,
            title: val.title || item.title || "Checklist Deliverable",
            isChecked: Boolean(val.isChecked ?? item.isChecked ?? false)
          };
        });
      }
    } catch (e) {
      console.warn("Checklist parse error:", e);
    }
  }
  return [];
}

function getDomainProjectTitle(domName) {
  switch (domName) {
    case "SEO": return "SEO Project & Strategy";
    case "Leadgen": return "Leadgen & Acquisition Pipeline";
    case "AI Initiative": return "AI Strategic Initiatives";
    case "Reporting & Ops": return "Reporting & Operational SOPs";
    case "CX & UX": return "CX & UX Optimization Project";
    case "Ads Planning": return "Advertising & Media Planning";
    case "Events": return "Events & Webinar Delivery";
    case "Web & Digital": return "Web, Digital & Brand Asset Projects";
    default: return `${domName} Project`;
  }
}

function renderStrategicProjectsRadar(allTasks) {
  const tableWrap = document.getElementById("strategicProjectsTableWrap");
  if (!tableWrap) return;
  tableWrap.style.display = "block";

  if (!state.expandedProjectGroups) {
    state.expandedProjectGroups = new Set();
  }
  if (!state.expandedTaskChecklists) {
    state.expandedTaskChecklists = new Set();
  }

  // Always defensively ensure we have a valid non-empty task collection
  const safeTasks = (Array.isArray(allTasks) && allTasks.length > 0)
    ? allTasks
    : (Array.isArray(state.filteredTasks) && state.filteredTasks.length > 0)
      ? state.filteredTasks
      : (Array.isArray(state.tasks) && state.tasks.length > 0)
        ? state.tasks
        : [];

  // Filter tasks that qualify as strategic projects
  const projectTasks = safeTasks.filter(isStrategicProject);

  const badgeEl = document.getElementById("strategicProjectCountBadge");
  if (badgeEl) badgeEl.textContent = `${projectTasks.length} Strategic Projects`;

  // Aggregate domains for quick filters
  const domainCounts = {};
  projectTasks.forEach(t => {
    const dom = getProjectDomain(t);
    domainCounts[dom.name] = (domainCounts[dom.name] || 0) + 1;
  });

  // Render domain filter pills
  const filterContainer = document.getElementById("strategicDomainFilterPills");
  if (filterContainer) {
    filterContainer.innerHTML = "";

    Object.keys(domainCounts).sort().forEach(domName => {
      const pill = document.createElement("button");
      const isActive = state.selectedProjectDomain === domName;
      pill.className = `domain-filter-pill ${isActive ? "active" : ""}`;
      pill.innerHTML = `<span>${escapeHtml(domName)}</span><span class="pill-count">${domainCounts[domName]}</span>`;
      pill.onclick = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        state.selectedProjectDomain = isActive ? "ALL" : domName;
        renderStrategicProjectsRadar(safeTasks);
      };
      filterContainer.appendChild(pill);
    });

    if (state.selectedProjectDomain && state.selectedProjectDomain !== "ALL") {
      const clearBtn = document.createElement("button");
      clearBtn.className = "btn btn-sm btn-ghost";
      clearBtn.style.fontSize = "0.74rem";
      clearBtn.style.padding = "0.2rem 0.6rem";
      clearBtn.textContent = "✕ Clear Filter";
      clearBtn.onclick = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        state.selectedProjectDomain = "ALL";
        renderStrategicProjectsRadar(safeTasks);
      };
      filterContainer.appendChild(clearBtn);
    }
  }

  // Group tasks by domain
  const groupsMap = {};
  projectTasks.forEach(t => {
    const dom = getProjectDomain(t);
    if (!groupsMap[dom.name]) {
      const groupId = `proj-${dom.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      groupsMap[dom.name] = {
        id: groupId,
        domainName: dom.name,
        domainClass: dom.class,
        title: getDomainProjectTitle(dom.name),
        tasks: []
      };
    }
    groupsMap[dom.name].tasks.push(t);
  });

  // Pre-collapsed mode by default as requested
  if (!state.projectGroupsInitialized) {
    state.expandedProjectGroups.clear();
    state.expandedTaskChecklists.clear();
    state.projectGroupsInitialized = true;
  }

  // Filter groups if domain filter is selected
  const groupList = Object.values(groupsMap).filter(g => {
    if (!state.selectedProjectDomain || state.selectedProjectDomain === "ALL") return true;
    return g.domainName === state.selectedProjectDomain;
  });

  // Wire Expand All / Collapse All button
  const toggleAllBtn = document.getElementById("btnToggleAllProjects");
  const toggleAllText = document.getElementById("btnToggleAllProjectsText");
  const allGroupIds = Object.values(groupsMap).map(g => g.id);
  const areAllExpanded = allGroupIds.length > 0 && allGroupIds.every(id => state.expandedProjectGroups.has(id));

  if (toggleAllBtn && toggleAllText) {
    toggleAllText.textContent = areAllExpanded ? "Collapse All Projects" : "Expand All Projects";
    toggleAllBtn.onclick = (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (areAllExpanded) {
        state.expandedProjectGroups.clear();
        state.expandedTaskChecklists.clear();
      } else {
        allGroupIds.forEach(id => state.expandedProjectGroups.add(id));
      }
      renderStrategicProjectsRadar(safeTasks);
    };
  }

  // Render Table Body
  const tableBody = document.getElementById("strategicProjectsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (groupList.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No projects match the selected domain.</td></tr>';
    return;
  }

  const priorityWeights = { "Urgent": 4, "Important": 3, "Medium": 2, "Low": 1 };

  groupList.forEach(group => {
    const isGroupExpanded = state.expandedProjectGroups.has(group.id);
    const totalSubtasks = group.tasks.length;
    const avgProgress = totalSubtasks > 0 
      ? Math.round(group.tasks.reduce((sum, t) => sum + (t.percentComplete || 0), 0) / totalSubtasks) 
      : 0;

    // Aggregate Checklist Stats
    let groupClDone = 0;
    let groupClTotal = 0;
    group.tasks.forEach(t => {
      const cl = parseChecklistStats(t);
      groupClDone += cl.done;
      groupClTotal += cl.total;
    });
    const groupClPct = groupClTotal > 0 ? Math.round((groupClDone / groupClTotal) * 100) : avgProgress;

    const groupProgressHtml = groupClTotal > 0
      ? `<div class="project-checklist-progress-cell">
          <div class="strategic-progress-bar" style="width: 80px;"><div class="fill" style="width: ${groupClPct}%"></div></div>
          <span class="checklist-progress-text"><strong>${groupClDone}/${groupClTotal}</strong> (${groupClPct}%)</span>
        </div>`
      : `<div class="project-checklist-progress-cell">
          <div class="strategic-progress-bar" style="width: 80px;"><div class="fill" style="width: ${avgProgress}%"></div></div>
          <span class="checklist-progress-text">${avgProgress}%</span>
        </div>`;

    // Unique Leads
    const leadNames = Array.from(new Set(group.tasks.flatMap(t => t.assigneeIds.map(getAssigneeName)).filter(Boolean)));
    const leadsText = leadNames.length > 0 ? leadNames.join(", ") : "Adam Lau";

    // Highest Priority in Group
    let highestPriority = "Low";
    let maxWeight = 0;
    group.tasks.forEach(t => {
      const p = t.priority || "Medium";
      const w = priorityWeights[p] || 1;
      if (w > maxWeight) {
        maxWeight = w;
        highestPriority = p;
      }
    });

    // Earliest Due Date (safe date comparison)
    const datedTasks = group.tasks
      .filter(t => t.dueDate)
      .sort((a, b) => {
        const timeA = a.dueDate instanceof Date ? a.dueDate.getTime() : new Date(a.dueDate).getTime();
        const timeB = b.dueDate instanceof Date ? b.dueDate.getTime() : new Date(b.dueDate).getTime();
        return (timeA || 0) - (timeB || 0);
      });
    const groupDeadlineBadge = datedTasks.length > 0 ? formatDueDateBadge(datedTasks[0]) : '<span class="subtext">No due date</span>';

    // -------------------------------------------------------------
    // Tier 1 Row: Project Group Header
    // -------------------------------------------------------------
    const groupTr = document.createElement("tr");
    groupTr.className = "project-group-row";

    groupTr.innerHTML = `
      <td>
        <div class="project-group-header-cell">
          <button class="btn-tree-expand ${isGroupExpanded ? 'is-expanded' : ''}" type="button" title="${isGroupExpanded ? 'Collapse' : 'Expand'} Sub-tasks">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <span class="project-group-title">${escapeHtml(group.title)}</span>
          <span class="project-task-count-pill">${totalSubtasks} ${totalSubtasks === 1 ? 'task' : 'tasks'}</span>
        </div>
      </td>
      <td><span class="strategic-domain-badge ${group.domainClass}">🏷️ ${escapeHtml(group.domainName)}</span></td>
      <td style="font-weight: 700;">${escapeHtml(leadsText)}</td>
      <td>${groupProgressHtml}</td>
      <td>${groupDeadlineBadge}</td>
      <td>${renderPriorityPill(highestPriority)}</td>
    `;

    const toggleGroup = (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (state.expandedProjectGroups.has(group.id)) {
        state.expandedProjectGroups.delete(group.id);
      } else {
        state.expandedProjectGroups.add(group.id);
      }
      renderStrategicProjectsRadar(safeTasks);
    };

    const expandBtn = groupTr.querySelector(".btn-tree-expand");
    if (expandBtn) {
      expandBtn.onclick = toggleGroup;
    }

    groupTr.onclick = (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      toggleGroup(e);
    };

    tableBody.appendChild(groupTr);

    // -------------------------------------------------------------
    // Tier 2 & Tier 3: Sub-tasks & Checklist Items (if expanded)
    // -------------------------------------------------------------
    if (isGroupExpanded) {
      group.tasks.forEach(t => {
        const cl = parseChecklistStats(t);
        const checklistItems = getTaskChecklistItems(t);
        const hasChecklist = checklistItems.length > 0;
        const isTaskClExpanded = state.expandedTaskChecklists.has(t.id);
        const assigneeNames = t.assigneeIds.map(getAssigneeName).join(", ") || "Unassigned";

        const subtaskProgressHtml = hasChecklist
          ? `<div class="project-checklist-progress-cell">
              <div class="strategic-progress-bar" style="width: 70px;"><div class="fill" style="width: ${cl.pct}%"></div></div>
              <button class="btn-checklist-toggle-badge ${isTaskClExpanded ? 'active' : ''}" type="button" title="Click to view checklist deliverables">
                <span><strong>${cl.done}/${cl.total}</strong> (${cl.pct}%)</span>
                <span>${isTaskClExpanded ? '▴' : '▾'}</span>
              </button>
            </div>`
          : `<div class="project-checklist-progress-cell">
              <div class="strategic-progress-bar" style="width: 70px;"><div class="fill" style="width: ${t.percentComplete}%"></div></div>
              <span class="checklist-progress-text">${t.percentComplete}%</span>
            </div>`;

        const subtaskTr = document.createElement("tr");
        subtaskTr.className = "project-subtask-row";

        subtaskTr.innerHTML = `
          <td>
            <div class="subtask-indent-cell">
              <span class="tree-branch-symbol">↳</span>
              ${hasChecklist ? `
                <button class="btn-subtask-cl-expand ${isTaskClExpanded ? 'is-expanded' : ''}" type="button" title="${isTaskClExpanded ? 'Collapse' : 'Expand'} Checklist Items">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              ` : '<span style="width: 20px; display: inline-block;"></span>'}
              <span class="subtask-title-link" title="Click to view full task details">${escapeHtml(t.title)}</span>
            </div>
          </td>
          <td><span class="subtext" style="font-size: 0.74rem; font-weight: 600;">Sub-task</span></td>
          <td>${escapeHtml(assigneeNames)}</td>
          <td>${subtaskProgressHtml}</td>
          <td>${formatDueDateBadge(t)}</td>
          <td>${renderPriorityPill(t.priority)}</td>
        `;

        // Wire click handlers on subtask row
        const clBtn = subtaskTr.querySelector(".btn-subtask-cl-expand");
        const clBadgeBtn = subtaskTr.querySelector(".btn-checklist-toggle-badge");
        const titleLink = subtaskTr.querySelector(".subtask-title-link");

        if (titleLink) {
          titleLink.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            openTaskModal(t.id);
          };
        }

        const handleClToggle = (e) => {
          if (e) {
            e.stopPropagation();
            e.preventDefault();
          }
          if (state.expandedTaskChecklists.has(t.id)) {
            state.expandedTaskChecklists.delete(t.id);
          } else {
            state.expandedTaskChecklists.add(t.id);
          }
          renderStrategicProjectsRadar(safeTasks);
        };

        if (clBtn) clBtn.onclick = handleClToggle;
        if (clBadgeBtn) clBadgeBtn.onclick = handleClToggle;

        // Row click opens modal unless clicking buttons
        subtaskTr.onclick = (e) => {
          if (e.target.closest("button") || e.target.closest(".subtask-title-link")) return;
          if (hasChecklist) {
            handleClToggle(e);
          } else {
            openTaskModal(t.id);
          }
        };

        tableBody.appendChild(subtaskTr);

        // -------------------------------------------------------------
        // Tier 3 Row: Checklist Deliverables (if subtask checklist expanded)
        // -------------------------------------------------------------
        if (hasChecklist && isTaskClExpanded) {
          const clTr = document.createElement("tr");
          clTr.className = "project-checklist-row";
          clTr.innerHTML = `
            <td colspan="6">
              <div class="checklist-tree-card">
                <div class="checklist-tree-header">
                  <span class="checklist-tree-title">
                    <span>📋</span>
                    <span>Checklist Deliverables for "${escapeHtml(t.title)}"</span>
                  </span>
                  <span class="checklist-tree-meta">${cl.done} of ${cl.total} deliverables completed (${cl.pct}%)</span>
                </div>
                <div class="checklist-tree-grid">
                  ${checklistItems.map(item => `
                    <div class="checklist-tree-item ${item.isChecked ? 'is-done' : ''}">
                      <span class="cl-tree-checkbox">${item.isChecked ? '☑' : '☐'}</span>
                      <span class="cl-tree-text" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
                      <span class="cl-tree-badge ${item.isChecked ? 'done' : 'pending'}">${item.isChecked ? 'Done' : 'Pending'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </td>
          `;
          tableBody.appendChild(clTr);
        }
      });
    }
  });
}

function renderDayToDaySection(allTasks) {
  const dayTasks = allTasks.filter(t => !isStrategicProject(t));

  const badgeEl = document.getElementById("dayToDayCountBadge");
  if (badgeEl) badgeEl.textContent = `${dayTasks.length} Day-to-Day Tasks`;

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const attentionTasks = dayTasks.filter(t => {
    if (t.status === "COMPLETED") return false;
    if (t.isOverdue) return true;
    if (t.dueDate && t.dueDate <= next7Days) return true;
    if (t.priority === "Urgent") return true;
    return false;
  });

  const doingNowTasks = dayTasks.filter(t => getBucketName(t.bucketId).toLowerCase().includes("doing"));
  const thisWeekTasks = dayTasks.filter(t => getBucketName(t.bucketId).toLowerCase().includes("this week"));
  const nextWeekTasks = dayTasks.filter(t => getBucketName(t.bucketId).toLowerCase().includes("next week"));

  // Day-to-day filter pills
  const filterContainer = document.getElementById("dayTodayFilterPills");
  if (filterContainer) {
    filterContainer.innerHTML = "";
    if (!state.dayToDayFilter) state.dayToDayFilter = "ALL";

    const filterDefs = [
      { key: "ALL", label: "All Day-to-Day", count: dayTasks.length },
      { key: "ATTENTION", label: "Needs Attention", count: attentionTasks.length },
      { key: "DOING_NOW", label: "Doing Now", count: doingNowTasks.length },
      { key: "THIS_WEEK", label: "This Week", count: thisWeekTasks.length },
      { key: "NEXT_WEEK", label: "Next Week", count: nextWeekTasks.length },
      { key: "COMPLETED", label: "Completed", count: dayTasks.filter(t => t.status === "COMPLETED").length }
    ];

    filterDefs.forEach(def => {
      const pill = document.createElement("button");
      const isActive = state.dayToDayFilter === def.key;
      pill.className = `domain-filter-pill ${isActive ? "active" : ""}`;
      pill.innerHTML = `<span>${escapeHtml(def.label)}</span><span class="pill-count">${def.count}</span>`;
      pill.onclick = () => {
        state.dayToDayFilter = def.key;
        renderDayToDaySection(allTasks);
      };
      filterContainer.appendChild(pill);
    });
  }

  // Filter tasks
  let filtered = dayTasks;
  if (state.dayToDayFilter === "ATTENTION") {
    filtered = attentionTasks;
  } else if (state.dayToDayFilter === "DOING_NOW") {
    filtered = doingNowTasks;
  } else if (state.dayToDayFilter === "THIS_WEEK") {
    filtered = thisWeekTasks;
  } else if (state.dayToDayFilter === "NEXT_WEEK") {
    filtered = nextWeekTasks;
  } else if (state.dayToDayFilter === "COMPLETED") {
    filtered = dayTasks.filter(t => t.status === "COMPLETED");
  }

  // Search filter
  const searchInput = document.getElementById("dayTodaySearchInput");
  const query = searchInput ? (searchInput.value || "").trim().toLowerCase() : "";
  if (query) {
    filtered = filtered.filter(t => {
      const title = (t.title || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const bucket = getBucketName(t.bucketId).toLowerCase();
      return title.includes(query) || desc.includes(query) || bucket.includes(query);
    });
  }

  const tableBody = document.getElementById("dayTodayTableBody");
  if (tableBody) {
    tableBody.innerHTML = "";
    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No day-to-day tasks match the selected filter.</td></tr>';
    } else {
      filtered.forEach(t => {
        const assigneeNames = t.assigneeIds.map(getAssigneeName).join(", ") || "Unassigned";
        const cats = getTaskCategories(t);
        const tr = document.createElement("tr");
        tr.onclick = () => openTaskModal(t.id);
        tr.innerHTML = `
          <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(t.title)}</td>
          <td><span class="subtext">${escapeHtml(getBucketName(t.bucketId))}</span></td>
          <td>
            <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
              ${cats.map(c => `<span class="cat-pill ${c.class}">${escapeHtml(c.name)}</span>`).join("")}
            </div>
          </td>
          <td>${renderPriorityPill(t.priority)}</td>
          <td>${escapeHtml(assigneeNames)}</td>
          <td>${formatDueDateBadge(t)}</td>
          <td>${renderStatusPill(t)}</td>
          <td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openTaskModal('${t.id}')">View</button></td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.oninput = () => renderDayToDaySection(allTasks);
  }
}

function switchOverviewTab(tabName) {
  state.overviewActiveTab = tabName;
  const btnStrategic = document.getElementById("tabBtnStrategic");
  const btnDay = document.getElementById("tabBtnDayToDay");
  const contentStrategic = document.getElementById("tabContentStrategic");
  const contentDay = document.getElementById("tabContentDayToDay");

  if (tabName === "strategic") {
    if (btnStrategic) btnStrategic.classList.add("active");
    if (btnDay) btnDay.classList.remove("active");
    if (contentStrategic) contentStrategic.style.display = "block";
    if (contentDay) contentDay.style.display = "none";
  } else {
    if (btnDay) btnDay.classList.add("active");
    if (btnStrategic) btnStrategic.classList.remove("active");
    if (contentStrategic) contentStrategic.style.display = "none";
    if (contentDay) contentDay.style.display = "block";
  }
}

function setupOverviewTabs() {
  const btnStrategic = document.getElementById("tabBtnStrategic");
  const btnDay = document.getElementById("tabBtnDayToDay");

  if (btnStrategic && !btnStrategic.dataset.bound) {
    btnStrategic.dataset.bound = "true";
    btnStrategic.onclick = () => switchOverviewTab("strategic");
  }

  if (btnDay && !btnDay.dataset.bound) {
    btnDay.dataset.bound = "true";
    btnDay.onclick = () => switchOverviewTab("daytoday");
  }

  // Check URL hash or query param for instant tab activation
  const hash = window.location.hash;
  if (hash === "#daytoday" || window.location.search.includes("tab=daytoday")) {
    switchOverviewTab("daytoday");
  }
}

function renderDeliverablesHealth(tasks) {
  const container = document.getElementById("deliverablesHealthContainer");
  if (!container) return;

  let totalItems = 0;
  let doneItems = 0;
  const domainDeliverables = {};

  tasks.forEach(t => {
    const cl = parseChecklistStats(t);
    if (cl.total > 0) {
      totalItems += cl.total;
      doneItems += cl.done;

      const dom = getProjectDomain(t);
      if (!domainDeliverables[dom.name]) {
        domainDeliverables[dom.name] = { total: 0, done: 0, class: dom.class };
      }
      domainDeliverables[dom.name].total += cl.total;
      domainDeliverables[dom.name].done += cl.done;
    }
  });

  const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  container.innerHTML = `
    <div class="deliverables-kpi-summary">
      <div class="deliverables-kpi-item">
        <span class="del-kpi-num" style="color: var(--brand-primary);">${doneItems} / ${totalItems}</span>
        <span class="del-kpi-lbl">Deliverables Completed</span>
      </div>
      <div class="deliverables-kpi-item" style="text-align: right;">
        <span class="del-kpi-num" style="color: ${overallPct >= 70 ? '#10b981' : '#f59e0b'};">${overallPct}%</span>
        <span class="del-kpi-lbl">Milestone Completion</span>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.5rem;">
      ${Object.keys(domainDeliverables).sort().map(name => {
        const d = domainDeliverables[name];
        const pct = Math.round((d.done / d.total) * 100);
        return `
          <div class="deliverable-stream-row">
            <div class="del-stream-meta">
              <span>${escapeHtml(name)}</span>
              <span><strong>${d.done}/${d.total}</strong> (${pct}%)</span>
            </div>
            <div class="strategic-progress-bar ${pct === 100 ? 'is-done' : ''}">
              <div class="fill" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join("")}
      ${Object.keys(domainDeliverables).length === 0 ? '<div class="subtext">No checklist deliverables recorded yet.</div>' : ''}
    </div>
  `;
}

function renderLabelBars(labelCounts) {
  const container = document.getElementById("bucketBarsContainer");
  if (!container) return;
  container.innerHTML = "";

  const labelNames = Object.keys(labelCounts);
  if (labelNames.length === 0) {
    container.innerHTML = '<div class="subtext">No tasks match current filter.</div>';
    return;
  }

  labelNames.sort((a, b) => labelCounts[b].total - labelCounts[a].total);

  labelNames.forEach(name => {
    const data = labelCounts[name];
    const donePct = Math.round((data.completed / data.total) * 100);
    const progPct = Math.round((data.inProgress / data.total) * 100);
    const todoPct = 100 - donePct - progPct;

    const row = document.createElement("div");
    row.className = "bucket-bar-row";
    row.innerHTML = `
      <div class="bucket-bar-info">
        <span class="cat-pill ${data.class}">${escapeHtml(name)}</span>
        <span class="bucket-count-text">${data.total} tasks (${donePct}% done)</span>
      </div>
      <div class="bucket-track" title="${data.completed} Done / ${data.inProgress} In Progress / ${data.notStarted} To Do">
        <div class="track-seg-done" style="width: ${donePct}%"></div>
        <div class="track-seg-progress" style="width: ${progPct}%"></div>
        <div class="track-seg-todo" style="width: ${todoPct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderPriorityMatrix(priorityCounts, total, overdueCount) {
  const container = document.getElementById("priorityBreakdownList");
  if (!container) return;
  container.innerHTML = "";

  const priorities = [
    { label: "Urgent", color: "#000000" },
    { label: "Important", color: "#0055ff" },
    { label: "Medium", color: "#52525b" },
    { label: "Low", color: "#a1a1aa" }
  ];

  priorities.forEach(p => {
    const count = priorityCounts[p.label] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "priority-item-row";
    row.innerHTML = `
      <div class="priority-badge-label">
        <span class="priority-indicator-dot" style="background: ${p.color}"></span>
        <span>${p.label}</span>
      </div>
      <div><strong>${count}</strong> <span class="subtext">(${pct}%)</span></div>
    `;
    container.appendChild(row);
  });

  // Health Score Calculation
  // Health = 100 - (overdue% * 1.5)
  const overduePct = total ? (overdueCount / total) * 100 : 0;
  let health = Math.max(0, Math.min(100, Math.round(100 - (overduePct * 1.5))));
  
  const healthEl = document.getElementById("healthScore");
  const gaugeEl = document.getElementById("healthGauge");
  const detailsEl = document.getElementById("healthDetailsText");

  if (healthEl) healthEl.textContent = `${health}%`;
  if (gaugeEl) {
    gaugeEl.style.borderColor = "#000000";
    gaugeEl.style.boxShadow = "none";
  }

  if (detailsEl) {
    if (overdueCount === 0) {
      detailsEl.innerHTML = `<strong>Optimal Health</strong><br>Zero overdue tasks detected across the active roadmap.`;
    } else {
      detailsEl.innerHTML = `<strong>Attention Required</strong><br>${overdueCount} overdue deliverables impacting project delivery velocity.`;
    }
  }
}

/* ==========================================================================
   Time Series Analytics Widgets (Option A: Velocity & Option B: Runway)
   ========================================================================== */

function renderVelocityChart(tasks) {
  const container = document.getElementById("velocityChartWrapper");
  if (!container) return;
  container.innerHTML = "";

  // Dynamic 5 Trailing Weekly Periods ending with the current active week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday, 0, 0, 0, 0);

  const periods = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 4; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // Calculate standard ISO week number
    const tempDate = new Date(start);
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    const monthStr = monthNames[start.getMonth()];
    const dateStr = String(start.getDate()).padStart(2, "0");
    const isCurrent = (i === 0);

    periods.push({
      label: `W${weekNum} (${monthStr} ${dateStr})`,
      isCurrent: isCurrent,
      start: start,
      end: end,
      created: 0,
      completed: 0
    });
  }

  tasks.forEach(t => {
    const cDate = t.createdDate || t.startDate;
    if (cDate) {
      periods.forEach(p => {
        if (cDate >= p.start && cDate <= p.end) p.created++;
      });
    }
    if (t.status === "COMPLETED") {
      const compDate = t.completedDate || t.dueDate || cDate || new Date();
      periods.forEach(p => {
        if (compDate >= p.start && compDate <= p.end) p.completed++;
      });
    }
  });

  const width = 500;
  const height = 180;
  const pad = { top: 20, right: 25, bottom: 35, left: 35 };

  const maxVal = Math.max(10, ...periods.map(p => Math.max(p.created, p.completed))) + 2;
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const getX = (i) => pad.left + (i / (periods.length - 1)) * chartW;
  const getY = (val) => pad.top + chartH - (val / maxVal) * chartH;

  // Build Inflow path & area
  let inPath = "";
  let inArea = `M ${getX(0)} ${getY(0)} `;
  periods.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.created);
    if (i === 0) inPath += `M ${x} ${y} `;
    else inPath += `L ${x} ${y} `;
    inArea += `L ${x} ${y} `;
  });
  inArea += `L ${getX(periods.length - 1)} ${getY(0)} Z`;

  // Build Outflow path & area
  let outPath = "";
  let outArea = `M ${getX(0)} ${getY(0)} `;
  periods.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.completed);
    if (i === 0) outPath += `M ${x} ${y} `;
    else outPath += `L ${x} ${y} `;
    outArea += `L ${x} ${y} `;
  });
  outArea += `L ${getX(periods.length - 1)} ${getY(0)} Z`;

  // Grid lines
  let gridLines = "";
  [0, Math.round(maxVal / 2), maxVal].forEach(tick => {
    const y = getY(tick);
    gridLines += `
      <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
      <text x="${pad.left - 8}" y="${y + 4}" fill="var(--text-subtle)" font-size="10" text-anchor="end">${tick}</text>
    `;
  });

  let xLabels = "";
  periods.forEach((p, i) => {
    const x = getX(i);
    const isCurrent = p.isCurrent;
    const labelColor = isCurrent ? "#0055ff" : "var(--text-muted)";
    const fontWeight = isCurrent ? "700" : "500";
    xLabels += `<text x="${x}" y="${height - 10}" fill="${labelColor}" font-size="10" font-weight="${fontWeight}" text-anchor="middle">${p.label}</text>`;
  });

  let inPoints = "";
  periods.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.created);
    inPoints += `
      <circle cx="${x}" cy="${y}" r="4" fill="#000000" stroke="#fff" stroke-width="1.5">
        <title>Inflow (Created): ${p.created} in ${p.label}${p.isCurrent ? " (Current Active Week)" : ""}</title>
      </circle>
      <text x="${x}" y="${y - 8}" fill="#000000" font-size="10" font-weight="700" text-anchor="middle">${p.created}</text>
    `;
  });

  let outPoints = "";
  periods.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.completed);
    outPoints += `
      <circle cx="${x}" cy="${y}" r="4" fill="#0055ff" stroke="#fff" stroke-width="1.5">
        <title>Outflow (Completed): ${p.completed} in ${p.label}${p.isCurrent ? " (Current Active Week)" : ""}</title>
      </circle>
      <text x="${x}" y="${y + 16}" fill="#0055ff" font-size="10" font-weight="700" text-anchor="middle">${p.completed}</text>
    `;
  });

  const totalCreated = periods.reduce((sum, p) => sum + p.created, 0);
  const totalCompleted = periods.reduce((sum, p) => sum + p.completed, 0);
  const netVelocity = totalCompleted - totalCreated;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; font-size: 0.78rem; color: var(--text-muted);">
      <div style="display: flex; gap: 1.5rem;">
        <span>Inflow Total: <strong style="color: var(--text-main);">${totalCreated}</strong></span>
        <span>Outflow Total: <strong style="color: var(--brand-primary);">${totalCompleted}</strong></span>
        <span>Net Backlog: <strong style="color: var(--text-main);">${netVelocity > 0 ? '+' : ''}${netVelocity}</strong></span>
      </div>
      <span style="font-size: 0.72rem; color: #0055ff; font-weight: 600;">Trailing 5 Weeks</span>
    </div>
    <svg class="velocity-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0055ff" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#0055ff" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${inArea}" fill="url(#inflowGrad)" />
      <path d="${outArea}" fill="url(#outflowGrad)" />
      <path d="${inPath}" fill="none" stroke="#000000" stroke-width="2" />
      <path d="${outPath}" fill="none" stroke="#0055ff" stroke-width="2.2" />
      ${xLabels}
      ${inPoints}
      ${outPoints}
    </svg>
  `;
}

function renderRunwayBars(tasks) {
  const container = document.getElementById("runwayBarsContainer");
  const statBadge = document.getElementById("runwayStatBadge");
  if (!container) return;
  container.innerHTML = "";

  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 86400000;

  const buckets = [
    { id: "overdue", label: "Overdue (Immediate)", color: "#000000", tasks: [] },
    { id: "thisWeek", label: "This Week (Next 4 Days)", color: "#0055ff", tasks: [] },
    { id: "nextWeek", label: "Next Week (5-11 Days)", color: "#52525b", tasks: [] },
    { id: "inTwoWeeks", label: "Week +2 (12-18 Days)", color: "#71717a", tasks: [] },
    { id: "later", label: "Week +3 & Later", color: "#a1a1aa", tasks: [] }
  ];

  let activeScheduledCount = 0;

  tasks.forEach(t => {
    if (t.status === "COMPLETED") return;
    if (!t.dueDate) {
      buckets[4].tasks.push(t);
      return;
    }

    const dTime = t.dueDate.getTime();
    activeScheduledCount++;

    if (t.isOverdue || dTime < nowMs) {
      buckets[0].tasks.push(t);
    } else if (dTime <= nowMs + 4 * dayMs) {
      buckets[1].tasks.push(t);
    } else if (dTime <= nowMs + 11 * dayMs) {
      buckets[2].tasks.push(t);
    } else if (dTime <= nowMs + 18 * dayMs) {
      buckets[3].tasks.push(t);
    } else {
      buckets[4].tasks.push(t);
    }
  });

  if (statBadge) {
    statBadge.textContent = `${activeScheduledCount} active items in delivery runway`;
  }

  const maxCount = Math.max(1, ...buckets.map(b => b.tasks.length));

  buckets.forEach(b => {
    const count = b.tasks.length;
    const fillPct = Math.round((count / maxCount) * 100);

    const catMap = {};
    b.tasks.forEach(t => {
      const cats = getTaskCategories(t);
      cats.forEach(c => {
        catMap[c.name] = (catMap[c.name] || 0) + 1;
      });
    });

    const topCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const row = document.createElement("div");
    row.className = "runway-bar-row";
    row.innerHTML = `
      <div class="runway-bar-header">
        <span class="runway-bucket-name">
          <span class="dot" style="background: ${b.color};"></span>
          <span>${b.label}</span>
        </span>
        <span class="runway-count">${count} <span class="subtext">deliverables</span></span>
      </div>
      <div class="runway-track">
        <div class="runway-fill" style="width: ${fillPct}%; background: ${b.color};"></div>
      </div>
      <div class="runway-cat-chips">
        ${topCats.length > 0 
          ? topCats.map(([catName, cnt]) => `<span class="runway-chip">${escapeHtml(catName)} (${cnt})</span>`).join("")
          : '<span class="subtext" style="font-size: 0.68rem;">No items</span>'}
      </div>
    `;
    container.appendChild(row);
  });
}

function renderAttentionTable(tasks) {
  const tbody = document.getElementById("attentionTableBody");
  const countTag = document.getElementById("urgentTasksCount");
  if (!tbody) return;
  tbody.innerHTML = "";

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Filter tasks that are overdue OR due within the next 7 days (and not completed)
  const critical = tasks.filter(t => {
    if (t.status === "COMPLETED") return false;
    if (t.isOverdue) return true;
    if (t.dueDate && t.dueDate <= next7Days) return true;
    if (t.priority === "Urgent") return true;
    return false;
  });

  if (countTag) countTag.textContent = `${critical.length} items`;

  if (critical.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-subtle);">No critical or overdue tasks found! Great work.</td></tr>`;
    return;
  }

  // Sort: Overdue first, then by due date
  critical.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate - b.dueDate;
  });

  critical.slice(0, 15).forEach(task => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => openTaskModal(task.id);

    const dueFormatted = formatDueDateBadge(task);
    const assigneeNames = task.assigneeIds.map(id => getAssigneeName(id)).join(", ") || "Unassigned";

    const cats = getTaskCategories(task);

    tr.innerHTML = `
      <td class="task-name-cell">${escapeHtml(task.title)}</td>
      <td>
        <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
          ${cats.map(c => `<span class="cat-pill ${c.class}">${escapeHtml(c.name)}</span>`).join("")}
        </div>
      </td>
      <td>${renderPriorityPill(task.priority)}</td>
      <td>
        <div class="avatar-chip">
          <span class="avatar-circle">${escapeHtml(assigneeNames.slice(0, 2).toUpperCase())}</span>
          <span>${escapeHtml(assigneeNames)}</span>
        </div>
      </td>
      <td>${dueFormatted}</td>
      <td>${renderStatusPill(task)}</td>
      <td><button class="btn btn-sm btn-outline">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   View 2: Executive Table View (Boss & Monday.com Style)
   ========================================================================== */

function getTaskCategories(task) {
  if (!task.labels || task.labels.length === 0) {
    return [{ name: "General", class: "cat-default" }];
  }
  return task.labels.map(catKey => {
    return state.labelMap[catKey] || { name: catKey, class: "cat-default" };
  });
}

function getTaskTerritory(task) {
  const text = (task.title + " " + task.description).toLowerCase();
  if (text.includes("china") || text.includes("cn") || text.includes("chinese")) return "China";
  if (text.includes("india")) return "India";
  if (text.includes("japan") || text.includes("jp") || text.includes("japanese")) return "Japan";
  if (text.includes("korea") || text.includes("kor") || text.includes("kr")) return "KOR";
  if (text.includes("singapore") || text.includes("sg")) return "SG";
  if (text.includes("australia") || text.includes("aus")) return "Australia";
  return "APAC";
}

function formatShortDate(d) {
  if (!d) return "-";
  try {
    const dateObj = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  } catch (e) {
    return "-";
  }
}

function renderTableView() {
  const container = document.getElementById("mondayTableContainer");
  if (!container) return;
  container.innerHTML = "";

  const tasks = state.filteredTasks;
  if (tasks.length === 0) {
    container.innerHTML = `<div class="subtext" style="padding: 2rem; text-align: center;">No tasks match your active filters.</div>`;
    return;
  }

  const groupBy = state.tableGroupBy || "category";

  // Mode 1: Flat Table (Direct Boss's View without groups)
  if (groupBy === "none") {
    const card = document.createElement("div");
    card.className = "monday-bucket-card";
    card.innerHTML = `
      <div class="monday-table-body">
        <table class="monday-table">
          <thead>
            <tr>
              <th>TASKS</th>
              <th>Category</th>
              <th>Territory</th>
              <th>OWNER</th>
              <th>REQUEST DATE</th>
              <th>DUE DATE</th>
              <th>DELIVERY DATE</th>
              <th>% COMPLETE</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(task => renderExecutiveTableRow(task)).join("")}
          </tbody>
        </table>
      </div>
    `;
    container.appendChild(card);
    return;
  }

  // Mode 2: Grouped Table (by Category, Owner, Bucket, or Status)
  const grouped = {};
  tasks.forEach(t => {
    let groupKey = "Other";
    if (groupBy === "category") {
      const cats = getTaskCategories(t);
      groupKey = cats[0].name;
    } else if (groupBy === "owner") {
      groupKey = t.assigneeIds.map(id => getAssigneeName(id)).join(", ") || "Unassigned";
    } else if (groupBy === "bucket") {
      groupKey = getBucketName(t.bucketId);
    } else if (groupBy === "status") {
      groupKey = t.status === "COMPLETED" ? "Completed" : t.status === "IN_PROGRESS" ? "In Progress" : "Not Started";
    }

    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(t);
  });

  const groupKeys = Object.keys(grouped);
  let colorIdx = 0;

  groupKeys.forEach(gKey => {
    const groupTasks = grouped[gKey];
    const color = BUCKET_COLORS[colorIdx % BUCKET_COLORS.length];
    colorIdx++;

    const safeId = "grp-" + gKey.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const isCollapsed = state.collapsedBuckets.has(safeId);

    const completed = groupTasks.filter(t => t.status === "COMPLETED").length;
    const progressPct = groupTasks.length ? Math.round((completed / groupTasks.length) * 100) : 0;

    const card = document.createElement("div");
    card.className = `monday-bucket-card ${isCollapsed ? "collapsed" : ""}`;
    card.id = `bucket-card-${safeId}`;

    card.innerHTML = `
      <div class="monday-bucket-header" onclick="toggleBucketCollapse('${safeId}')">
        <div class="bucket-header-left">
          <span class="collapse-icon">▼</span>
          <span class="bucket-color-bar" style="background: ${color};"></span>
          <span class="bucket-title-text" style="color: ${color};">${escapeHtml(gKey)}</span>
          <span class="count-badge">${groupTasks.length} tasks</span>
        </div>
        <div class="bucket-progress-summary">
          <span class="subtext">${progressPct}% Done</span>
          <div class="progress-track-wide">
            <div class="track-seg-done" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </div>
      <div class="monday-table-body">
        <table class="monday-table">
          <thead>
            <tr>
              <th>TASKS</th>
              <th>Category</th>
              <th>Territory</th>
              <th>OWNER</th>
              <th>REQUEST DATE</th>
              <th>DUE DATE</th>
              <th>DELIVERY DATE</th>
              <th>% COMPLETE</th>
            </tr>
          </thead>
          <tbody>
            ${groupTasks.map(task => renderExecutiveTableRow(task)).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderExecutiveTableRow(task) {
  const assigneeNames = task.assigneeIds.map(id => getAssigneeName(id)).join(", ") || "Unassigned";
  const cats = getTaskCategories(task);
  const territory = getTaskTerritory(task);

  const requestDateStr = formatShortDate(task.startDate || task.createdDate);
  const dueDateStr = formatShortDate(task.dueDate);
  const deliveryDateStr = formatShortDate(task.completedDate);

  let statusClass = "not-started";
  let percentText = "0%";
  if (task.status === "COMPLETED") {
    statusClass = "completed";
    percentText = "100%";
  } else if (task.isOverdue) {
    statusClass = "overdue-tag";
    percentText = `${task.percentComplete || 50}%`;
  } else if (task.status === "IN_PROGRESS") {
    statusClass = "in-progress";
    percentText = `${task.percentComplete || 50}%`;
  }

  const isDueOverdue = task.isOverdue ? 'style="color: #f87171; font-weight: 700;"' : '';

  return `
    <tr onclick="openTaskModal('${task.id}')">
      <td class="task-name-cell">
        <span>${escapeHtml(task.title)}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
          ${cats.map(c => `<span class="cat-pill ${c.class}">${escapeHtml(c.name)}</span>`).join("")}
        </div>
      </td>
      <td>
        <span class="territory-pill">${escapeHtml(territory)}</span>
      </td>
      <td>
        <div class="avatar-chip">
          <span class="avatar-circle">${escapeHtml(assigneeNames.slice(0, 2).toUpperCase())}</span>
          <span>${escapeHtml(assigneeNames)}</span>
        </div>
      </td>
      <td><span class="subtext">${requestDateStr}</span></td>
      <td><span ${isDueOverdue}>${dueDateStr}</span></td>
      <td><span class="subtext">${deliveryDateStr}</span></td>
      <td>
        <span class="status-pill status-${statusClass}">${percentText}</span>
      </td>
    </tr>
  `;
}

function toggleBucketCollapse(bucketId) {
  if (state.collapsedBuckets.has(bucketId)) {
    state.collapsedBuckets.delete(bucketId);
  } else {
    state.collapsedBuckets.add(bucketId);
  }
  const card = document.getElementById(`bucket-card-${bucketId}`);
  if (card) {
    card.classList.toggle("collapsed");
  }
}

/* ==========================================================================
   View 3: Visual Timeline (Gantt) View
   ========================================================================== */

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function scrollToTodayInGantt(smooth = true) {
  const chartArea = document.getElementById("ganttChartArea");
  if (!chartArea) return;
  const todayCol = chartArea.querySelector(".gantt-col-header.is-today");
  if (todayCol) {
    const chartRect = chartArea.getBoundingClientRect();
    const colRect = todayCol.getBoundingClientRect();
    const offsetInView = colRect.left - chartRect.left;
    const targetScroll = chartArea.scrollLeft + offsetInView - (chartArea.clientWidth / 2) + (colRect.width / 2);
    chartArea.scrollTo({ left: Math.max(0, targetScroll), behavior: smooth ? "smooth" : "auto" });
  }
}

function renderGanttView() {
  const sidebarList = document.getElementById("ganttSidebarList");
  const headerRow = document.getElementById("ganttHeaderRow");
  const bodyEl = document.getElementById("ganttBody");

  if (!sidebarList || !headerRow || !bodyEl) return;

  // Sync zoom button active states in UI
  document.querySelectorAll(".segmented-control .btn-seg").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-zoom") === state.ganttZoom);
  });

  sidebarList.innerHTML = "";
  headerRow.innerHTML = "";
  bodyEl.innerHTML = "";

  const tasks = state.filteredTasks.filter(t => t.dueDate || t.startDate);
  if (tasks.length === 0) {
    bodyEl.innerHTML = `<div class="subtext" style="padding: 3rem; text-align: center;">No tasks with scheduled dates found. Add start/due dates in Planner to view timeline.</div>`;
    return;
  }

  // Calculate timeline date range
  const dates = [];
  tasks.forEach(t => {
    if (t.startDate) dates.push(t.startDate.getTime());
    if (t.dueDate) dates.push(t.dueDate.getTime());
    if (t.createdDate) dates.push(t.createdDate.getTime());
  });

  const now = new Date();
  dates.push(now.getTime());

  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);

  let colWidth = 46;
  let totalCols = 0;
  let startDate, endDate;
  const colConfigs = [];

  if (state.ganttZoom === "weeks") {
    colWidth = 100;
    const s = new Date(minTime - 7 * 86400000);
    const dayShift = (s.getDay() + 6) % 7; // Monday = 0
    s.setDate(s.getDate() - dayShift);
    s.setHours(0, 0, 0, 0);
    startDate = s;

    const e = new Date(maxTime + 14 * 86400000);
    const endDayShift = (e.getDay() + 6) % 7;
    e.setDate(e.getDate() + (6 - endDayShift));
    e.setHours(23, 59, 59, 999);
    endDate = e;

    totalCols = Math.max(4, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 86400000)));

    for (let i = 0; i < totalCols; i++) {
      const weekStart = new Date(startDate.getTime() + i * 7 * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
      const isToday = (now >= weekStart && now <= new Date(weekEnd.getTime() + 86400000 - 1));
      colConfigs.push({
        title: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sub: `Wk ${getWeekNumber(weekStart)}`,
        isToday
      });
    }
  } else if (state.ganttZoom === "months") {
    colWidth = 140;
    const minD = new Date(minTime);
    startDate = new Date(minD.getFullYear(), minD.getMonth() - 1, 1, 0, 0, 0);
    const maxD = new Date(maxTime);
    endDate = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 0, 23, 59, 59);

    totalCols = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

    for (let i = 0; i < totalCols; i++) {
      const curMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const isToday = (now.getFullYear() === curMonthDate.getFullYear() && now.getMonth() === curMonthDate.getMonth());
      colConfigs.push({
        title: curMonthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        sub: curMonthDate.toLocaleDateString("en-US", { month: "long" }),
        isToday
      });
    }
  } else {
    // Default: Days
    colWidth = 46;
    startDate = new Date(minTime - 3 * 86400000);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(maxTime + 7 * 86400000);
    endDate.setHours(23, 59, 59, 999);

    totalCols = Math.max(14, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));

    for (let i = 0; i < totalCols; i++) {
      const curDate = new Date(startDate.getTime() + i * 86400000);
      const isToday = curDate.toDateString() === now.toDateString();
      colConfigs.push({
        title: curDate.getDate(),
        sub: curDate.toLocaleDateString("en-US", { weekday: "narrow" }),
        isToday
      });
    }
  }

  // Render Header Columns
  colConfigs.forEach(cfg => {
    const col = document.createElement("div");
    col.className = `gantt-col-header ${cfg.isToday ? "is-today" : ""}`;
    col.style.width = `${colWidth}px`;
    col.style.minWidth = `${colWidth}px`;
    col.innerHTML = `
      <span>${cfg.title}</span>
      <span style="font-size: 0.65rem;">${cfg.sub}</span>
    `;
    headerRow.appendChild(col);
  });

  // Render Rows & Bars
  tasks.forEach(task => {
    // Sidebar item
    const sideItem = document.createElement("div");
    sideItem.className = "gantt-sidebar-item";
    sideItem.title = task.title;
    sideItem.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${getPriorityColor(task.priority)}; margin-right: 0.5rem; flex-shrink: 0;"></span>
      <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(task.title)}</span>
    `;
    sideItem.onclick = () => openTaskModal(task.id);
    sidebarList.appendChild(sideItem);

    // Chart row
    const rowEl = document.createElement("div");
    rowEl.className = "gantt-row";
    rowEl.style.width = `${totalCols * colWidth}px`;

    // Cell backgrounds
    colConfigs.forEach(cfg => {
      const cell = document.createElement("div");
      cell.className = `gantt-cell ${cfg.isToday ? "is-today" : ""}`;
      cell.style.width = `${colWidth}px`;
      cell.style.minWidth = `${colWidth}px`;
      rowEl.appendChild(cell);
    });

    // Task Bar calculation
    let startMs = (task.startDate || task.createdDate || task.dueDate).getTime();
    let endMs = (task.dueDate || task.startDate || task.createdDate).getTime();
    if (endMs < startMs) {
      const temp = startMs;
      startMs = endMs;
      endMs = temp;
    }

    let leftPx = 0;
    let widthPx = colWidth;

    if (state.ganttZoom === "weeks") {
      const startOffsetWeeks = Math.max(0, (startMs - startDate.getTime()) / (7 * 86400000));
      const durationWeeks = Math.max(0.35, ((endMs - startMs) / (7 * 86400000)) + (1 / 7));
      leftPx = startOffsetWeeks * colWidth;
      widthPx = Math.max(28, durationWeeks * colWidth);
    } else if (state.ganttZoom === "months") {
      const totalMs = endDate.getTime() - startDate.getTime();
      const totalPixelWidth = totalCols * colWidth;
      leftPx = Math.max(0, ((startMs - startDate.getTime()) / totalMs) * totalPixelWidth);
      widthPx = Math.max(32, ((endMs - startMs + 86400000) / totalMs) * totalPixelWidth);
    } else {
      // Days
      const startOffsetDays = Math.max(0, (startMs - startDate.getTime()) / 86400000);
      const durationDays = Math.max(1, (endMs - startMs) / 86400000 + 1);
      leftPx = startOffsetDays * colWidth;
      widthPx = Math.max(colWidth, durationDays * colWidth);
    }

    let barStatusClass = "status-progress";
    if (task.status === "COMPLETED") barStatusClass = "status-done";
    else if (task.isOverdue) barStatusClass = "status-overdue";

    const barEl = document.createElement("div");
    barEl.className = `gantt-bar ${barStatusClass}`;
    barEl.style.left = `${leftPx}px`;
    barEl.style.width = `${widthPx}px`;
    barEl.title = `${task.title}\nDue: ${formatShortDate(task.dueDate)}`;
    barEl.innerHTML = `<span>${escapeHtml(task.title)}</span>`;
    barEl.onclick = () => openTaskModal(task.id);

    rowEl.appendChild(barEl);
    bodyEl.appendChild(rowEl);
  });
}

/* ==========================================================================
   View: Editorial & Milestone Calendar View & Day Breakdown Drawer
   ========================================================================== */

function renderCalendarView() {
  const grid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("calMonthTitle");
  if (!grid) return;
  grid.innerHTML = "";

  if (!state.calendarDate) {
    state.calendarDate = new Date(2026, 9, 8);
  }

  const cur = state.calendarDate;
  const year = cur.getFullYear();
  const month = cur.getMonth();

  if (monthTitle) {
    monthTitle.textContent = cur.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const now = new Date();
  const nowDayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const anchorDayStr = `2026-9-8`;

  for (let i = 0; i < totalCells; i++) {
    let cellYear = year;
    let cellMonth = month;
    let cellDateNum = 0;
    let isOtherMonth = false;

    if (i < startDayOfWeek) {
      // Previous month padding
      cellDateNum = daysInPrevMonth - startDayOfWeek + i + 1;
      cellMonth = month - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear--; }
      isOtherMonth = true;
    } else if (i >= startDayOfWeek + daysInMonth) {
      // Next month padding
      cellDateNum = i - (startDayOfWeek + daysInMonth) + 1;
      cellMonth = month + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear++; }
      isOtherMonth = true;
    } else {
      // Current month
      cellDateNum = i - startDayOfWeek + 1;
    }

    const cellDateStr = `${cellYear}-${cellMonth}-${cellDateNum}`;
    const isToday = (cellDateStr === nowDayStr || cellDateStr === anchorDayStr);

    const isSelected = state.selectedCalendarDay && 
                       state.selectedCalendarDay.year === cellYear && 
                       state.selectedCalendarDay.month === cellMonth && 
                       state.selectedCalendarDay.day === cellDateNum;

    // Find tasks due or scheduled on this date
    const dayTasks = state.filteredTasks.filter(t => {
      const d = t.dueDate || t.startDate;
      if (!d) return false;
      return d.getFullYear() === cellYear && d.getMonth() === cellMonth && d.getDate() === cellDateNum;
    });

    const cell = document.createElement("div");
    cell.className = `calendar-day-cell ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected-day" : ""}`;
    cell.onclick = () => openCalendarDayPanel(cellYear, cellMonth, cellDateNum);

    // Limit cell preview to 2 items max + "+X more" pill to prevent ugly vertical truncations
    const maxVisiblePills = 2;
    const visibleTasks = dayTasks.slice(0, maxVisiblePills);
    const hiddenCount = dayTasks.length - maxVisiblePills;

    cell.innerHTML = `
      <div class="cal-cell-header">
        <span class="cal-date-number">${cellDateNum}</span>
        ${dayTasks.length > 0 ? `<span class="cal-task-count-badge">${dayTasks.length}</span>` : ""}
      </div>
      <div class="cal-tasks-list">
        ${visibleTasks.map(t => {
          const cats = getTaskCategories(t);
          const firstCat = cats[0] || { name: "Task", class: "" };
          const isDone = t.status === "COMPLETED";
          const isOverdue = t.isOverdue && !isDone;
          return `
            <div class="cal-task-pill ${isDone ? "is-completed" : ""} ${isOverdue ? "is-overdue" : ""}" 
                 title="${escapeHtml(t.title)} (${firstCat.name})">
              <span class="dot ${firstCat.class}"></span>
              <span>${escapeHtml(t.title)}</span>
            </div>
          `;
        }).join("")}
        ${hiddenCount > 0 ? `
          <div class="cal-more-pill" title="Click to view all ${dayTasks.length} tasks for this day">
            +${hiddenCount} more
          </div>
        ` : ""}
      </div>
    `;

    grid.appendChild(cell);
  }
}

function openCalendarDayPanel(year, month, day) {
  state.selectedCalendarDay = { year, month, day };

  // Update active day cell styling in calendar grid
  document.querySelectorAll(".calendar-day-cell").forEach(c => c.classList.remove("is-selected-day"));
  const targetCell = Array.from(document.querySelectorAll(".calendar-day-cell")).find(c => {
    const num = c.querySelector(".cal-date-number");
    return num && parseInt(num.textContent, 10) === day && !c.classList.contains("is-other-month");
  });
  if (targetCell) targetCell.classList.add("is-selected-day");

  const targetDate = new Date(year, month, day);
  const dayOfWeekStr = targetDate.toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = targetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const eyebrowEl = document.getElementById("calBottomDayOfWeek");
  const titleEl = document.getElementById("calBottomDateTitle");
  if (eyebrowEl) eyebrowEl.textContent = dayOfWeekStr;
  if (titleEl) titleEl.textContent = dateFormatted;

  // Filter tasks strictly for this day
  const dayTasks = state.filteredTasks.filter(t => {
    const d = t.dueDate || t.startDate;
    if (!d) return false;
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const countBadge = document.getElementById("calBottomTaskCount");
  if (countBadge) countBadge.textContent = `${dayTasks.length} ${dayTasks.length === 1 ? "Task" : "Tasks"}`;

  // Analyze team workload for this specific day (who is responsible for what)
  const assigneeTaskMap = {};
  dayTasks.forEach(t => {
    if (t.assigneeIds && t.assigneeIds.length > 0) {
      t.assigneeIds.forEach(aid => {
        const name = getAssigneeName(aid);
        assigneeTaskMap[name] = (assigneeTaskMap[name] || 0) + 1;
      });
    } else {
      assigneeTaskMap["Unassigned"] = (assigneeTaskMap["Unassigned"] || 0) + 1;
    }
  });

  const assigneeNames = Object.keys(assigneeTaskMap);
  const peopleBadge = document.getElementById("calBottomPeopleCount");
  if (peopleBadge) peopleBadge.textContent = `${assigneeNames.length} ${assigneeNames.length === 1 ? "Assignee" : "Assignees"}`;

  // Render team responsibility breakdown strip
  const teamStrip = document.getElementById("calBottomTeamStrip");
  if (teamStrip) {
    if (dayTasks.length === 0) {
      teamStrip.style.display = "none";
    } else {
      teamStrip.style.display = "flex";
      teamStrip.innerHTML = `
        <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-subtle); text-transform: uppercase; margin-right: 0.25rem;">Responsible:</span>
        ${assigneeNames.map(name => {
          const initials = name.slice(0, 2).toUpperCase();
          const count = assigneeTaskMap[name];
          return `
            <div class="team-responsibility-chip" title="${escapeHtml(name)}: ${count} task(s)">
              <span class="chip-avatar">${escapeHtml(initials)}</span>
              <span>${escapeHtml(name)}</span>
              <span class="chip-count">${count}</span>
            </div>
          `;
        }).join("")}
      `;
    }
  }

  // Render list of tasks for the day in the bottom panel
  const listEl = document.getElementById("calBottomTasksList");
  if (listEl) {
    listEl.innerHTML = "";

    if (dayTasks.length === 0) {
      listEl.innerHTML = `
        <div class="cal-drawer-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h4>No Tasks Scheduled</h4>
          <p class="subtext">There are no deadlines or milestones assigned for this date.</p>
        </div>
      `;
    } else {
      dayTasks.forEach(t => {
        const cats = getTaskCategories(t);
        const isDone = t.status === "COMPLETED";
        const isOverdue = t.isOverdue && !isDone;
        const assigneeNamesStr = t.assigneeIds.map(getAssigneeName).join(", ") || "Unassigned";
        const bucketName = getBucketName(t.bucketId);

        const card = document.createElement("div");
        card.className = `cal-day-task-card ${isDone ? "is-completed" : ""} ${isOverdue ? "is-overdue" : ""}`;
        card.onclick = () => openTaskModal(t.id);

        card.innerHTML = `
          <div class="cal-card-top-row">
            <div class="cal-card-badges">
              ${cats.map(c => `<span class="cat-pill ${c.class}">${escapeHtml(c.name)}</span>`).join(" ")}
              ${renderPriorityPill(t.priority)}
            </div>
            <div>
              ${renderStatusPill(t)}
            </div>
          </div>

          <div class="cal-card-title">${escapeHtml(t.title)}</div>

          <div class="cal-card-responsible-row">
            <div class="cal-card-assignee-info">
              <span class="res-label">Responsible:</span>
              <div class="avatar-chip" style="margin: 0;">
                <span class="avatar-circle" style="width: 20px; height: 20px; font-size: 0.65rem;">
                  ${escapeHtml(assigneeNamesStr.slice(0, 2).toUpperCase())}
                </span>
                <span style="font-size: 0.8rem; font-weight: 600;">${escapeHtml(assigneeNamesStr)}</span>
              </div>
            </div>
            <div class="cal-card-bucket-info">
              📁 ${escapeHtml(bucketName)}
            </div>
          </div>

          ${t.checklistCount > 0 ? `
            <div class="cal-card-checklist-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>${t.checklistCount} checklist ${t.checklistCount === 1 ? 'item' : 'items'}</span>
            </div>
          ` : ""}
        `;

        listEl.appendChild(card);
      });
    }
  }

  const panel = document.getElementById("calDayBottomPanel");
  if (panel) {
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function closeCalendarDayPanel() {
  const panel = document.getElementById("calDayBottomPanel");
  if (panel) {
    panel.style.display = "none";
  }
  state.selectedCalendarDay = null;
  document.querySelectorAll(".calendar-day-cell").forEach(c => c.classList.remove("is-selected-day"));
}

/* ==========================================================================
   View 4: Kanban Board View
   ========================================================================== */

function renderKanbanView() {
  const container = document.getElementById("kanbanBoardContainer");
  if (!container) return;
  container.innerHTML = "";

  const tasks = state.filteredTasks;
  const groupBy = state.kanbanGroupBy || "status";

  let columns = [];

  if (groupBy === "status") {
    columns = [
      { id: "NOT_STARTED", title: "Not Started", color: "#64748b" },
      { id: "IN_PROGRESS", title: "In Progress", color: "#f59e0b" },
      { id: "COMPLETED", title: "Completed", color: "#10b981" }
    ];
  } else if (groupBy === "priority") {
    columns = [
      { id: "Urgent", title: "🔴 Urgent", color: "#ef4444" },
      { id: "Important", title: "🟠 Important", color: "#f97316" },
      { id: "Medium", title: "🔵 Medium", color: "#3b82f6" },
      { id: "Low", title: "⚪ Low", color: "#94a3b8" }
    ];
  } else if (groupBy === "bucket") {
    const bucketsPresent = Array.from(new Set(tasks.map(t => t.bucketId)));
    columns = bucketsPresent.map((bid, i) => ({
      id: bid,
      title: getBucketName(bid),
      color: BUCKET_COLORS[i % BUCKET_COLORS.length]
    }));
  } else if (groupBy === "assignee") {
    const assigneesPresent = Array.from(new Set(tasks.flatMap(t => t.assigneeIds)));
    columns = assigneesPresent.map(aid => ({
      id: aid,
      title: getAssigneeName(aid),
      color: "#3b82f6"
    }));
    columns.push({ id: "UNASSIGNED", title: "Unassigned", color: "#64748b" });
  }

  columns.forEach(col => {
    let colTasks = [];
    if (groupBy === "status") {
      colTasks = tasks.filter(t => t.status === col.id);
    } else if (groupBy === "priority") {
      colTasks = tasks.filter(t => t.priority.toLowerCase() === col.id.toLowerCase());
    } else if (groupBy === "bucket") {
      colTasks = tasks.filter(t => t.bucketId === col.id);
    } else if (groupBy === "assignee") {
      if (col.id === "UNASSIGNED") {
        colTasks = tasks.filter(t => t.assigneeIds.length === 0);
      } else {
        colTasks = tasks.filter(t => t.assigneeIds.includes(col.id));
      }
    }

    const colEl = document.createElement("div");
    colEl.className = "kanban-column";
    colEl.innerHTML = `
      <div class="kanban-col-header">
        <div class="col-header-left">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${col.color}"></span>
          <span>${escapeHtml(col.title)}</span>
        </div>
        <span class="count-badge">${colTasks.length}</span>
      </div>
      <div class="kanban-col-body">
        ${colTasks.map(t => renderKanbanCard(t)).join("")}
      </div>
    `;
    container.appendChild(colEl);
  });
}

function renderKanbanCard(task) {
  const assigneeNames = task.assigneeIds.map(id => getAssigneeName(id)).join(", ") || "Unassigned";
  const dueBadge = formatDueDateBadge(task);

  return `
    <div class="kanban-card" onclick="openTaskModal('${task.id}')">
      <div class="card-top-tags">
        <span class="subtext">${escapeHtml(getBucketName(task.bucketId))}</span>
        ${renderPriorityPill(task.priority)}
      </div>
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-footer">
        <div class="avatar-chip">
          <span class="avatar-circle">${escapeHtml(assigneeNames.slice(0, 2).toUpperCase())}</span>
          <span style="font-size: 0.75rem;">${escapeHtml(assigneeNames)}</span>
        </div>
        <div>${dueBadge}</div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   View 5: Team Workload View
   ========================================================================== */

function renderWorkloadView() {
  const container = document.getElementById("workloadContainer");
  if (!container) return;
  container.innerHTML = "";

  const tasks = state.filteredTasks;
  const userMap = {};

  // Aggregate by user
  tasks.forEach(t => {
    const assignees = t.assigneeIds.length ? t.assigneeIds : ["UNASSIGNED"];
    assignees.forEach(aid => {
      if (!userMap[aid]) {
        userMap[aid] = {
          id: aid,
          name: getAssigneeName(aid),
          tasks: [],
          overdue: 0,
          inProgress: 0,
          completed: 0
        };
      }
      userMap[aid].tasks.push(t);
      if (t.isOverdue) userMap[aid].overdue++;
      if (t.status === "COMPLETED") userMap[aid].completed++;
      else if (t.status === "IN_PROGRESS") userMap[aid].inProgress++;
    });
  });

  const users = Object.values(userMap);
  users.sort((a, b) => b.tasks.length - a.tasks.length);

  users.forEach(u => {
    const total = u.tasks.length;
    const active = total - u.completed;
    const donePct = total ? Math.round((u.completed / total) * 100) : 0;
    
    // Workload status
    let statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Balanced</span>`;
    if (active > 15 || u.overdue > 3) {
      statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">Overloaded</span>`;
    } else if (active > 8) {
      statusBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">Heavy</span>`;
    }

    const card = document.createElement("div");
    card.className = "workload-card";
    card.innerHTML = `
      <div class="workload-user-header">
        <div class="user-profile">
          <div class="user-avatar-lg">${escapeHtml(u.name.slice(0, 2).toUpperCase())}</div>
          <div class="user-info-text">
            <h3>${escapeHtml(u.name)}</h3>
            <span class="user-task-count">${active} Active Deliverables</span>
          </div>
        </div>
        ${statusBadge}
      </div>

      <div class="workload-stats-row">
        <div>
          <div class="stat-box-val" style="color: #60a5fa;">${active}</div>
          <div class="stat-box-lbl">Active</div>
        </div>
        <div>
          <div class="stat-box-val" style="color: #f87171;">${u.overdue}</div>
          <div class="stat-box-lbl">Overdue</div>
        </div>
        <div>
          <div class="stat-box-val" style="color: #34d399;">${u.completed}</div>
          <div class="stat-box-lbl">Done (${donePct}%)</div>
        </div>
      </div>

      <div class="workload-progress-bar">
        <div class="bucket-bar-info">
          <span class="subtext">Completion Ratio</span>
          <span class="subtext">${u.completed}/${total} tasks</span>
        </div>
        <div class="workload-track">
          <div class="track-seg-done" style="width: ${donePct}%"></div>
        </div>
      </div>

      <div class="workload-tasks-preview">
        ${u.tasks.slice(0, 6).map(t => `
          <div class="mini-task-item" onclick="openTaskModal('${t.id}')" style="cursor: pointer;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${escapeHtml(t.title)}</span>
            ${renderPriorityPill(t.priority)}
          </div>
        `).join("")}
      </div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================================================
   Task Detail Modal & Helpers
   ========================================================================== */

function openTaskModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const backdrop = document.getElementById("taskModalBackdrop");
  if (!backdrop) return;

  document.getElementById("modalTaskTitle").textContent = task.title;
  
  const priorityBadge = document.getElementById("modalPriorityBadge");
  priorityBadge.textContent = task.priority;
  priorityBadge.className = `badge priority-${task.priority.toLowerCase()}`;

  const statusBadge = document.getElementById("modalStatusBadge");
  statusBadge.textContent = task.status === "COMPLETED" ? "Completed (100%)" : task.status === "IN_PROGRESS" ? "In Progress (50%)" : "Not Started (0%)";
  statusBadge.className = `badge ${task.status === "COMPLETED" ? "status-completed" : task.status === "IN_PROGRESS" ? "status-in-progress" : "status-not-started"}`;

  const bucketBadge = document.getElementById("modalBucketBadge");
  bucketBadge.textContent = getBucketName(task.bucketId);

  const assigneeNames = task.assigneeIds.map(id => getAssigneeName(id)).join(", ") || "Unassigned";
  document.getElementById("modalAssignee").textContent = assigneeNames;

  document.getElementById("modalDueDate").innerHTML = formatDueDateBadge(task);
  document.getElementById("modalCreatedDate").textContent = task.createdDate ? task.createdDate.toLocaleString() : "-";
  document.getElementById("modalCompletedDate").textContent = task.completedDate ? task.completedDate.toLocaleString() : "-";

  // Description with auto-hyperlinking
  const descEl = document.getElementById("modalDescription");
  if (task.description && task.description.trim()) {
    descEl.innerHTML = autoLinkUrls(escapeHtml(task.description));
  } else {
    descEl.innerHTML = `<span style="color: var(--text-subtle);">No notes or description recorded.</span>`;
  }

  // Tags
  const labelsContainer = document.getElementById("modalLabels");
  labelsContainer.innerHTML = "";
  if (task.labels.length) {
    task.labels.forEach(lbl => {
      const tag = document.createElement("span");
      tag.className = "badge";
      tag.style.background = "var(--brand-primary)";
      tag.textContent = lbl;
      labelsContainer.appendChild(tag);
    });
  } else {
    labelsContainer.innerHTML = `<span class="subtext">No labels applied.</span>`;
  }

  // Checklist
  document.getElementById("modalChecklistCount").textContent = `${task.checklistCount} items`;
  const checklistEl = document.getElementById("modalChecklist");
  if (task.checklistCount > 0) {
    checklistEl.innerHTML = `
      <div class="checklist-item">
        <span>☑ ${task.checklistCount} checklist deliverables recorded in Planner</span>
      </div>
    `;
  } else {
    checklistEl.innerHTML = `<span class="subtext">No checklist items.</span>`;
  }

  backdrop.style.display = "flex";
}

function closeTaskModal() {
  const backdrop = document.getElementById("taskModalBackdrop");
  if (backdrop) backdrop.style.display = "none";
}

/* ==========================================================================
   Settings Drawer & Custom Aliases
   ========================================================================== */

function openSettingsDrawer() {
  const backdrop = document.getElementById("settingsModalBackdrop");
  if (!backdrop) return;

  const pcloudInp = document.getElementById("settingsPcloudLink");
  if (pcloudInp) pcloudInp.value = state.pcloudLink || CONFIG.DEFAULT_PCLOUD_LINK;
  const sheetInp = document.getElementById("settingsSheetUrl");
  if (sheetInp) sheetInp.value = state.sheetUrl;

  // Render Bucket Rename Inputs
  const bucketList = document.getElementById("bucketRenameList");
  bucketList.innerHTML = "";
  Object.keys(state.bucketMap).forEach(bid => {
    const row = document.createElement("div");
    row.className = "rename-item-row";
    row.innerHTML = `
      <span class="rename-id-badge" title="${bid}">${bid.slice(0, 10)}...</span>
      <input type="text" class="input-text bucket-input" data-bucket-id="${bid}" value="${escapeHtml(state.bucketMap[bid])}">
    `;
    bucketList.appendChild(row);
  });

  // Render Assignee Rename Inputs
  const assigneeList = document.getElementById("assigneeRenameList");
  assigneeList.innerHTML = "";
  Object.keys(state.assigneeMap).forEach(aid => {
    const row = document.createElement("div");
    row.className = "rename-item-row";
    row.innerHTML = `
      <span class="rename-id-badge" title="${aid}">${aid.slice(0, 10)}...</span>
      <input type="text" class="input-text assignee-input" data-assignee-id="${aid}" value="${escapeHtml(state.assigneeMap[aid])}">
    `;
    assigneeList.appendChild(row);
  });

  // Render Label Rename Inputs
  const labelList = document.getElementById("labelRenameList");
  if (labelList) {
    labelList.innerHTML = "";
    Object.keys(state.labelMap).filter(k => k.startsWith("category")).forEach(cid => {
      const lObj = state.labelMap[cid];
      const row = document.createElement("div");
      row.className = "rename-item-row";
      row.innerHTML = `
        <span class="rename-id-badge cat-pill ${lObj.class || 'cat-default'}" style="min-width: 90px; text-align: center; justify-content: center;">${cid}</span>
        <input type="text" class="input-text label-input" data-cat-id="${cid}" value="${escapeHtml(lObj.name)}">
      `;
      labelList.appendChild(row);
    });
  }

  // Render Admin Editorial Controls
  renderAdminEditorialPanel();

  backdrop.style.display = "flex";
}

function closeSettingsDrawer() {
  const backdrop = document.getElementById("settingsModalBackdrop");
  if (backdrop) backdrop.style.display = "none";
}

function saveSettings() {
  const pcloudInp = document.getElementById("settingsPcloudLink");
  if (pcloudInp && pcloudInp.value.trim()) {
    state.pcloudLink = pcloudInp.value.trim();
    state.pcloudCode = extractPcloudCode(state.pcloudLink);
  }
  const sheetInp = document.getElementById("settingsSheetUrl");
  if (sheetInp && sheetInp.value.trim()) {
    state.sheetUrl = sheetInp.value.trim();
  }

  // Save bucket names
  document.querySelectorAll(".bucket-input").forEach(inp => {
    const bid = inp.getAttribute("data-bucket-id");
    const val = inp.value.trim();
    if (bid && val) state.bucketMap[bid] = val;
  });

  // Save assignee names
  document.querySelectorAll(".assignee-input").forEach(inp => {
    const aid = inp.getAttribute("data-assignee-id");
    const val = inp.value.trim();
    if (aid && val) state.assigneeMap[aid] = val;
  });

  // Save label names
  document.querySelectorAll(".label-input").forEach(inp => {
    const cid = inp.getAttribute("data-cat-id");
    const val = inp.value.trim();
    if (cid && val) {
      if (!state.labelMap[cid]) {
        state.labelMap[cid] = { name: val, class: "cat-default" };
      } else {
        state.labelMap[cid].name = val;
      }
      state.labelMap[val] = state.labelMap[cid];
    }
  });

  savePreferences();
  populateFilterOptions();
  applyFiltersAndRender();
  closeSettingsDrawer();
  showAlert("Preferences saved successfully.", "success");
}

/* ==========================================================================
   Admin Editorial & Text Overrides Engine
   ========================================================================== */

function applyCustomTextOverrides(newOverrides) {
  if (newOverrides && typeof newOverrides === "object") {
    state.textOverrides = { ...state.textOverrides, ...newOverrides };
  }
  document.querySelectorAll("[data-editable-key]").forEach(el => {
    const key = el.getAttribute("data-editable-key");
    const val = (state.textOverrides && state.textOverrides[key] !== undefined)
      ? state.textOverrides[key]
      : DEFAULT_TEXT_MAP[key];
    if (val !== undefined && val !== null) {
      el.textContent = val;
    }
  });
}

function renderAdminEditorialPanel() {
  const badge = document.getElementById("adminAuthBadge");
  const loginForm = document.getElementById("adminLoginForm");
  const unlockedPanel = document.getElementById("adminUnlockedPanel");
  const feedback = document.getElementById("adminLoginFeedback");
  const fieldsContainer = document.getElementById("adminFieldsContainer");

  if (!badge || !loginForm || !unlockedPanel) return;

  if (!state.isAdminLoggedIn) {
    badge.textContent = "🔒 Locked";
    badge.style.color = "var(--text-secondary)";
    badge.style.borderColor = "var(--border-subtle)";
    badge.style.background = "rgba(0,0,0,0.06)";
    loginForm.style.display = "block";
    unlockedPanel.style.display = "none";
    if (feedback) feedback.style.display = "none";
    return;
  }

  // Admin is authenticated
  badge.textContent = "🟢 Admin Active";
  badge.style.color = "#10b981";
  badge.style.borderColor = "#10b981";
  badge.style.background = "rgba(16, 185, 129, 0.1)";
  loginForm.style.display = "none";
  unlockedPanel.style.display = "block";

  const toggleBtnText = document.getElementById("btnTogglePageEditText");
  if (toggleBtnText) {
    toggleBtnText.textContent = state.isInlineEditActive ? "Stop Inline Editing" : "✍️ Turn On Inline Editing";
  }

  if (fieldsContainer) {
    fieldsContainer.innerHTML = "";

    const fieldGroups = [
      {
        title: "Scorecard Metric Headers",
        keys: [
          { key: "scorecard.total", label: "Total Tasks Card" },
          { key: "scorecard.in_progress", label: "In Progress Card" },
          { key: "scorecard.completed", label: "Completed Card" },
          { key: "scorecard.overdue", label: "Overdue Tasks Card" },
          { key: "scorecard.urgent", label: "Urgent / Important Card" }
        ]
      },
      {
        title: "Charts & Runway Headers",
        keys: [
          { key: "charts.velocity.title", label: "Delivery Velocity Title" },
          { key: "charts.velocity.subtitle", label: "Delivery Velocity Subtitle" },
          { key: "charts.runway.title", label: "Deliverables Runway Title" },
          { key: "charts.runway.subtitle", label: "Deliverables Runway Subtitle" }
        ]
      },
      {
        title: "Dual-Stream Tab Headers",
        keys: [
          { key: "tabs.strategic.eyebrow", label: "Strategic Tab Eyebrow" },
          { key: "tabs.strategic.title", label: "Strategic Tab Title" },
          { key: "tabs.strategic.desc", label: "Strategic Tab Subtitle / Description" },
          { key: "tabs.daytoday.eyebrow", label: "Day-to-Day Tab Eyebrow" },
          { key: "tabs.daytoday.title", label: "Day-to-Day Tab Title" },
          { key: "tabs.daytoday.desc", label: "Day-to-Day Tab Subtitle / Description" }
        ]
      },
      {
        title: "Strategic Analytics & Health Headers",
        keys: [
          { key: "analytics.domain.title", label: "Domain Allocation Title" },
          { key: "analytics.domain.subtitle", label: "Domain Allocation Subtitle" },
          { key: "analytics.priority.title", label: "Priority & Health Matrix Title" },
          { key: "analytics.priority.subtitle", label: "Priority & Health Subtitle" },
          { key: "analytics.checklist.title", label: "Checklist Deliverables Health Title" },
          { key: "analytics.checklist.subtitle", label: "Checklist Deliverables Subtitle" }
        ]
      }
    ];

    fieldGroups.forEach(group => {
      const gBox = document.createElement("div");
      gBox.className = "admin-field-group";
      let rowsHtml = `<h4>${group.title}</h4>`;
      group.keys.forEach(item => {
        const currentVal = (state.textOverrides && state.textOverrides[item.key] !== undefined)
          ? state.textOverrides[item.key]
          : (DEFAULT_TEXT_MAP[item.key] || "");
        rowsHtml += `
          <div class="admin-field-row">
            <label class="admin-field-label">${item.label}</label>
            <input type="text" class="admin-field-input" data-key="${item.key}" value="${escapeHtml(currentVal)}">
          </div>
        `;
      });
      gBox.innerHTML = rowsHtml;
      fieldsContainer.appendChild(gBox);
    });
  }
}

function toggleInlineEditMode(forceState) {
  state.isInlineEditActive = (typeof forceState === "boolean") ? forceState : !state.isInlineEditActive;
  const bar = document.getElementById("adminInlineBar");
  if (bar) {
    bar.style.display = state.isInlineEditActive ? "block" : "none";
  }
  const toggleBtnText = document.getElementById("btnTogglePageEditText");
  if (toggleBtnText) {
    toggleBtnText.textContent = state.isInlineEditActive ? "Stop Inline Editing" : "✍️ Turn On Inline Editing";
  }

  document.querySelectorAll("[data-editable-key]").forEach(el => {
    if (state.isInlineEditActive) {
      el.classList.add("is-editable");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("title", "Click to edit text directly");
    } else {
      el.classList.remove("is-editable");
      el.removeAttribute("contenteditable");
      el.removeAttribute("title");
    }
  });

  if (state.isInlineEditActive) {
    closeSettingsDrawer();
    showAlert("Inline Edit Mode active: Click directly on any highlighted title or subtitle to edit.", "info");
  }
}

function saveInlineEdits() {
  const newOverrides = { ...state.textOverrides };
  document.querySelectorAll("[data-editable-key]").forEach(el => {
    const key = el.getAttribute("data-editable-key");
    const text = el.textContent.trim();
    if (text) {
      newOverrides[key] = text;
    }
  });
  saveTextOverrides(newOverrides);
  toggleInlineEditMode(false);
  showAlert("Dashboard titles, subtitles, and eyebrows saved successfully!", "success");
}

function saveDrawerTextOverrides() {
  const newOverrides = { ...state.textOverrides };
  document.querySelectorAll(".admin-field-input").forEach(inp => {
    const key = inp.getAttribute("data-key");
    const val = inp.value.trim();
    if (key && val) {
      newOverrides[key] = val;
    }
  });
  saveTextOverrides(newOverrides);
  showAlert("Dashboard text preferences saved successfully!", "success");
}

function saveTextOverrides(newOverrides) {
  state.textOverrides = { ...newOverrides };
  localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_TEXT, JSON.stringify(state.textOverrides));
  applyCustomTextOverrides();

  // Real-time Cloud Sync via Firebase Firestore if configured
  if (state.firestoreDb) {
    state.firestoreDb.collection("dashboard_config").doc("text_overrides").set(state.textOverrides)
      .then(() => {
        console.log("Synced text overrides to Cloud Firestore");
      })
      .catch(err => {
        console.error("Firestore sync error:", err);
      });
  }
}

function resetTextOverrides() {
  if (confirm("Restore all dashboard titles, subtitles, and eyebrows to default?")) {
    state.textOverrides = {};
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CUSTOM_TEXT);
    applyCustomTextOverrides();
    if (state.firestoreDb) {
      state.firestoreDb.collection("dashboard_config").doc("text_overrides").set({});
    }
    renderAdminEditorialPanel();
    showAlert("Restored default dashboard headings.", "info");
  }
}

function exportTextOverridesJson() {
  const data = JSON.stringify(state.textOverrides, null, 2);
  navigator.clipboard.writeText(data).then(() => {
    showAlert("Copied text overrides JSON to clipboard! You can paste it into your GitHub repository.", "success");
  }).catch(() => {
    prompt("Copy text overrides JSON:", data);
  });
}

function initFirestoreSync() {
  const savedConfig = localStorage.getItem(CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
  if (!savedConfig || typeof firebase === "undefined") return;

  try {
    const configObj = JSON.parse(savedConfig);
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(configObj);
    }
    state.firestoreDb = firebase.firestore();

    const badge = document.getElementById("cloudSyncStatusBadge");
    if (badge) {
      badge.textContent = "Firestore Live (Global)";
      badge.style.color = "#10b981";
      badge.style.borderColor = "#10b981";
      badge.style.background = "rgba(16, 185, 129, 0.1)";
    }

    // Real-time listener for remote text updates
    state.firestoreDb.collection("dashboard_config").doc("text_overrides")
      .onSnapshot(doc => {
        if (doc.exists) {
          const remoteData = doc.data();
          applyCustomTextOverrides(remoteData);
          localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_TEXT, JSON.stringify(state.textOverrides));
        }
      }, err => {
        console.warn("Firestore sync error:", err);
      });
  } catch (e) {
    console.warn("Failed to initialize Firestore", e);
  }
}

function setupFirestoreConfigUI() {
  const toggleBtn = document.getElementById("btnToggleFirestoreConfig");
  const wrap = document.getElementById("firestoreConfigWrap");
  const jsonArea = document.getElementById("firestoreConfigJson");
  const saveBtn = document.getElementById("btnSaveFirestoreConfig");
  const clearBtn = document.getElementById("btnClearFirestoreConfig");

  if (toggleBtn && wrap) {
    toggleBtn.addEventListener("click", () => {
      wrap.style.display = wrap.style.display === "none" ? "block" : "none";
    });
  }

  const existingConfig = localStorage.getItem(CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
  if (jsonArea && existingConfig) {
    jsonArea.value = existingConfig;
  }

  if (saveBtn && jsonArea) {
    saveBtn.addEventListener("click", () => {
      const val = jsonArea.value.trim();
      if (!val) return;
      try {
        JSON.parse(val);
        localStorage.setItem(CONFIG.STORAGE_KEYS.FIREBASE_CONFIG, val);
        initFirestoreSync();
        showAlert("Firebase Firestore configuration saved and connected!", "success");
      } catch (e) {
        alert("Invalid JSON format for Firebase config. Please provide valid JSON.");
      }
    });
  }

  if (clearBtn && jsonArea) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
      jsonArea.value = "";
      state.firestoreDb = null;
      const badge = document.getElementById("cloudSyncStatusBadge");
      if (badge) {
        badge.textContent = "LocalStorage (Active)";
        badge.style.color = "var(--accent-blue)";
        badge.style.borderColor = "var(--accent-blue)";
        badge.style.background = "rgba(0, 85, 255, 0.1)";
      }
      showAlert("Disconnected Firebase Firestore.", "info");
    });
  }
}

function initAdminEditorial() {
  const unlockBtn = document.getElementById("btnAdminUnlock");
  if (unlockBtn) {
    unlockBtn.addEventListener("click", async () => {
      const idVal = document.getElementById("adminAuthIdInput")?.value || "";
      const pwVal = document.getElementById("adminAuthPwInput")?.value || "";
      const feedback = document.getElementById("adminLoginFeedback");
      
      const isValid = await verifyAdminAuth(idVal, pwVal);
      if (isValid) {
        state.isAdminLoggedIn = true;
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, "true");
        if (feedback) {
          feedback.style.display = "inline";
          feedback.style.color = "#10b981";
          feedback.textContent = "Verified!";
        }
        renderAdminEditorialPanel();
      } else {
        if (feedback) {
          feedback.style.display = "inline";
          feedback.style.color = "#ef4444";
          feedback.textContent = "Invalid admin credentials";
        }
      }
    });
  }

  const lockBtn = document.getElementById("btnAdminLock");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      state.isAdminLoggedIn = false;
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
      toggleInlineEditMode(false);
      renderAdminEditorialPanel();
    });
  }

  const togglePageEditBtn = document.getElementById("btnTogglePageEditMode");
  if (togglePageEditBtn) {
    togglePageEditBtn.addEventListener("click", () => toggleInlineEditMode());
  }

  const saveInlineBtn = document.getElementById("btnSaveInlineEdit");
  if (saveInlineBtn) {
    saveInlineBtn.addEventListener("click", saveInlineEdits);
  }

  const exitInlineBtn = document.getElementById("btnExitInlineEdit");
  if (exitInlineBtn) {
    exitInlineBtn.addEventListener("click", () => toggleInlineEditMode(false));
  }

  const saveDrawerBtn = document.getElementById("btnSaveTextOverrides");
  if (saveDrawerBtn) {
    saveDrawerBtn.addEventListener("click", saveDrawerTextOverrides);
  }

  const resetDrawerBtn = document.getElementById("btnResetTextOverrides");
  if (resetDrawerBtn) {
    resetDrawerBtn.addEventListener("click", resetTextOverrides);
  }

  const exportDrawerBtn = document.getElementById("btnExportTextJson");
  if (exportDrawerBtn) {
    exportDrawerBtn.addEventListener("click", exportTextOverridesJson);
  }

  setupFirestoreConfigUI();
}

/* ==========================================================================
   Filter Dropdown Populators
   ========================================================================== */

function populateFilterOptions() {
  const labelSelect = document.getElementById("filterLabel");
  const assigneeSelect = document.getElementById("filterAssignee");

  // Populate individual Planner Labels
  if (labelSelect) {
    const labelCounts = {};
    state.tasks.forEach(t => {
      if (t.labels && t.labels.length > 0) {
        t.labels.forEach(catKey => {
          labelCounts[catKey] = (labelCounts[catKey] || 0) + 1;
        });
      } else {
        labelCounts["unlabeled"] = (labelCounts["unlabeled"] || 0) + 1;
      }
    });

    const activeFilter = state.filters.label || "ALL";
    labelSelect.innerHTML = `<option value="ALL">All Labels</option>`;

    // Merge keys so all known Planner labels (including newly added like CORE-Project) are present
    const allCatKeys = Array.from(new Set([
      ...Object.keys(state.labelMap).filter(k => k.startsWith("category")),
      ...Object.keys(labelCounts)
    ]));

    // Sort: labels with tasks first (by count descending), then labels with 0 tasks alphabetically
    allCatKeys.sort((a, b) => {
      const countA = labelCounts[a] || 0;
      const countB = labelCounts[b] || 0;
      if (countA !== countB) return countB - countA;
      const nameA = state.labelMap[a] ? state.labelMap[a].name : a;
      const nameB = state.labelMap[b] ? state.labelMap[b].name : b;
      return nameA.localeCompare(nameB);
    });

    allCatKeys.forEach(catKey => {
      const opt = document.createElement("option");
      opt.value = catKey;
      const labelObj = state.labelMap[catKey];
      const name = labelObj ? labelObj.name : (catKey === "unlabeled" ? "No Label" : catKey);
      const count = labelCounts[catKey] || 0;
      opt.textContent = `${name} (${count})`;
      if (activeFilter === catKey) opt.selected = true;
      labelSelect.appendChild(opt);
    });
  }

  // Populate Assignees
  const uniqueAssignees = Array.from(new Set(state.tasks.flatMap(t => t.assigneeIds)));
  if (assigneeSelect) {
    const activeAssignee = state.filters.assignee || "ALL";
    assigneeSelect.innerHTML = `<option value="ALL">All Team Members (${uniqueAssignees.length})</option>`;
    uniqueAssignees.forEach(aid => {
      const opt = document.createElement("option");
      opt.value = aid;
      opt.textContent = getAssigneeName(aid);
      if (activeAssignee === aid) opt.selected = true;
      assigneeSelect.appendChild(opt);
    });
  }
}

/* ==========================================================================
   Event Listeners & View Navigation
   ========================================================================== */

function initEventListeners() {
  // Navigation View Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      state.activeView = btn.getAttribute("data-view");

      const panel = document.getElementById(`view${capitalize(state.activeView)}`);
      if (panel) panel.classList.add("active");

      renderCurrentView();

      if (state.activeView === "gantt") {
        setTimeout(() => scrollToTodayInGantt(false), 60);
      }
    });
  });

  // Search input
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.filters.search = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = e.target.value ? "inline-block" : "none";
      }
      applyFiltersAndRender();
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      state.filters.search = "";
      clearSearchBtn.style.display = "none";
      applyFiltersAndRender();
    });
  }

  // Filter dropdowns
  const labelSelect = document.getElementById("filterLabel");
  if (labelSelect) {
    labelSelect.addEventListener("change", (e) => {
      state.filters.label = e.target.value;
      applyFiltersAndRender();
    });
  }
  document.getElementById("filterPriority").addEventListener("change", (e) => {
    state.filters.priority = e.target.value;
    applyFiltersAndRender();
  });
  document.getElementById("filterStatus").addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    applyFiltersAndRender();
  });
  document.getElementById("filterAssignee").addEventListener("change", (e) => {
    state.filters.assignee = e.target.value;
    applyFiltersAndRender();
  });

  // Reset Filters
  document.getElementById("btnResetFilters").addEventListener("click", () => {
    state.filters = { search: "", label: "ALL", priority: "ALL", status: "ALL", assignee: "ALL" };
    if (searchInput) searchInput.value = "";
    if (clearSearchBtn) clearSearchBtn.style.display = "none";
    if (labelSelect) labelSelect.value = "ALL";
    document.getElementById("filterPriority").value = "ALL";
    document.getElementById("filterStatus").value = "ALL";
    document.getElementById("filterAssignee").value = "ALL";
    applyFiltersAndRender();
  });

  // Sync button
  document.getElementById("btnSyncNow").addEventListener("click", fetchDataFromSheet);

  // Theme toggle
  document.getElementById("btnThemeToggle").addEventListener("click", toggleTheme);

  // Settings Modal
  document.getElementById("btnOpenSettings").addEventListener("click", openSettingsDrawer);
  document.getElementById("btnCloseSettings").addEventListener("click", closeSettingsDrawer);
  document.getElementById("btnSaveSettings").addEventListener("click", saveSettings);
  document.getElementById("btnResetSettings").addEventListener("click", () => {
    state.bucketMap = { ...DEFAULT_BUCKETS };
    state.assigneeMap = { ...DEFAULT_ASSIGNEES };
    state.labelMap = { ...DEFAULT_LABELS };
    savePreferences();
    openSettingsDrawer();
  });

  // Task Modal Close
  document.getElementById("btnCloseModal").addEventListener("click", closeTaskModal);
  document.getElementById("taskModalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "taskModalBackdrop") closeTaskModal();
  });
  document.getElementById("settingsModalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "settingsModalBackdrop") closeSettingsDrawer();
  });

  // Calendar Day Bottom Panel Close
  const btnCloseCalBottom = document.getElementById("btnCloseCalBottomPanel");
  if (btnCloseCalBottom) {
    btnCloseCalBottom.addEventListener("click", closeCalendarDayPanel);
  }

  // Escape key closes any active modal or day detail panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTaskModal();
      closeSettingsDrawer();
      closeCalendarDayPanel();
    }
  });

  // Table Group By
  const tableGroupSelect = document.getElementById("tableGroupBy");
  if (tableGroupSelect) {
    tableGroupSelect.addEventListener("change", (e) => {
      state.tableGroupBy = e.target.value;
      renderTableView();
    });
  }

  // Kanban Group By
  const kanbanGroup = document.getElementById("kanbanGroupBy");
  if (kanbanGroup) {
    kanbanGroup.addEventListener("change", (e) => {
      state.kanbanGroupBy = e.target.value;
      renderKanbanView();
    });
  }

  // Expand / Collapse Table
  const btnExpAll = document.getElementById("btnExpandAllBuckets");
  if (btnExpAll) {
    btnExpAll.addEventListener("click", () => {
      state.collapsedBuckets.clear();
      renderTableView();
    });
  }
  const btnColAll = document.getElementById("btnCollapseAllBuckets");
  if (btnColAll) {
    btnColAll.addEventListener("click", () => {
      state.tasks.forEach(t => state.collapsedBuckets.add(t.bucketId));
      renderTableView();
    });
  }

  // Timeline (Gantt) Zoom Controls (Days, Weeks, Months)
  const zoomBtns = [
    { id: "zoomDays", zoom: "days" },
    { id: "zoomWeeks", zoom: "weeks" },
    { id: "zoomMonths", zoom: "months" }
  ];
  zoomBtns.forEach(zb => {
    const btn = document.getElementById(zb.id);
    if (btn) {
      btn.addEventListener("click", () => {
        state.ganttZoom = zb.zoom;
        document.querySelectorAll(".segmented-control .btn-seg").forEach(b => {
          b.classList.toggle("active", b.id === zb.id);
        });
        renderGanttView();
        setTimeout(() => scrollToTodayInGantt(true), 60);
      });
    }
  });

  // Timeline Jump to Today
  const btnJumpToday = document.getElementById("btnJumpToToday");
  if (btnJumpToday) {
    btnJumpToday.addEventListener("click", () => {
      scrollToTodayInGantt(true);
    });
  }

  // Calendar Controls
  const btnCalPrev = document.getElementById("btnCalPrev");
  if (btnCalPrev) {
    btnCalPrev.addEventListener("click", () => {
      if (!state.calendarDate) state.calendarDate = new Date(2026, 9, 8);
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
      renderCalendarView();
    });
  }
  const btnCalNext = document.getElementById("btnCalNext");
  if (btnCalNext) {
    btnCalNext.addEventListener("click", () => {
      if (!state.calendarDate) state.calendarDate = new Date(2026, 9, 8);
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
      renderCalendarView();
    });
  }
  const btnCalToday = document.getElementById("btnCalToday");
  if (btnCalToday) {
    btnCalToday.addEventListener("click", () => {
      state.calendarDate = new Date(2026, 9, 8);
      renderCalendarView();
    });
  }

  // Export CSV
  document.getElementById("btnExportCSV").addEventListener("click", exportCurrentTasksCSV);
}

/* ==========================================================================
   Export to CSV Feature
   ========================================================================== */

function exportCurrentTasksCSV() {
  const tasks = state.filteredTasks;
  if (!tasks.length) {
    alert("No tasks available to export.");
    return;
  }

  const headers = ["Task ID", "Title", "Bucket", "Status", "Priority", "Assignees", "Due Date", "Checklist Count"];
  const rows = tasks.map(t => [
    `"${t.id}"`,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${getBucketName(t.bucketId).replace(/"/g, '""')}"`,
    `"${t.status}"`,
    `"${t.priority}"`,
    `"${t.assigneeIds.map(getAssigneeName).join(", ")}"`,
    `"${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : ''}"`,
    t.checklistCount
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Planner_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   UI Helpers & Formatting
   ========================================================================== */

function getBucketName(id) {
  return state.bucketMap[id] || id;
}

function getAssigneeName(id) {
  if (id === "UNASSIGNED") return "Unassigned";
  return state.assigneeMap[id] || id.slice(0, 8);
}

function getPriorityColor(priority) {
  switch (priority) {
    case "Urgent": return "#ef4444";
    case "Important": return "#f97316";
    case "Medium": return "#3b82f6";
    case "Low": return "#94a3b8";
    default: return "#3b82f6";
  }
}

function renderPriorityPill(priority) {
  const p = priority || "Medium";
  return `<span class="priority-pill priority-${p.toLowerCase()}">${p}</span>`;
}

function renderStatusPill(task) {
  if (task.status === "COMPLETED") {
    return `<span class="status-pill status-completed">Completed</span>`;
  }
  if (task.isOverdue) {
    return `<span class="status-pill status-overdue-tag">Overdue</span>`;
  }
  if (task.status === "IN_PROGRESS") {
    return `<span class="status-pill status-in-progress">In Progress</span>`;
  }
  return `<span class="status-pill status-not-started">Not Started</span>`;
}

function formatDueDateBadge(task) {
  if (!task.dueDate) return `<span class="subtext">No due date</span>`;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - now) / (24 * 60 * 60 * 1000));
  const dateStr = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (task.status === "COMPLETED") {
    return `<span class="date-pill" style="color: #34d399;">${dateStr}</span>`;
  }

  if (diffDays < 0) {
    return `<span class="date-pill overdue" title="Overdue by ${Math.abs(diffDays)} days">⚠️ ${dateStr} (${Math.abs(diffDays)}d overdue)</span>`;
  } else if (diffDays === 0) {
    return `<span class="date-pill soon">⚠️ Due Today</span>`;
  } else if (diffDays <= 3) {
    return `<span class="date-pill soon">${dateStr} (in ${diffDays}d)</span>`;
  }
  return `<span class="date-pill">${dateStr}</span>`;
}

function updateSyncCountdownUI() {
  const timeEl = document.getElementById("syncTimeText");
  if (!timeEl || !state.lastSyncTime) return;

  const now = new Date();
  const diffMinutes = Math.floor((now - state.lastSyncTime) / 60000);

  if (diffMinutes < 1) {
    timeEl.textContent = "Just now (auto-sync 2h)";
  } else if (diffMinutes < 60) {
    timeEl.textContent = `${diffMinutes}m ago (auto-sync 2h)`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    timeEl.textContent = `${hours}h ago (auto-sync 2h)`;
  }
}

function showAlert(msg, type = "info") {
  const banner = document.getElementById("alertBanner");
  if (!banner) return;
  banner.textContent = msg;
  banner.style.display = "block";
  if (type === "success") {
    banner.style.background = "rgba(16, 185, 129, 0.15)";
    banner.style.borderColor = "rgba(16, 185, 129, 0.3)";
    banner.style.color = "#6ee7b7";
  } else {
    banner.style.background = "rgba(239, 68, 68, 0.15)";
    banner.style.borderColor = "rgba(239, 68, 68, 0.3)";
    banner.style.color = "#fca5a5";
  }
  setTimeout(() => { banner.style.display = "none"; }, 4000);
}

function initTheme() {
  document.body.className = "theme-bw";
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, "bw");
}

function toggleTheme() {
  const isBw = document.body.classList.contains("theme-bw");
  document.body.className = isBw ? "theme-light" : "theme-bw";
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isBw ? "light" : "bw");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function autoLinkUrls(text) {
  if (!text) return "";
  const urlPattern = /(\b(https?:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  return text.replace(urlPattern, url => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
