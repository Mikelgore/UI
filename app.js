const storageKey = "tech-portal-state-v2";
const pollers = new Map();

const defaultState = {
  integrations: [
    {
      id: crypto.randomUUID(),
      name: "ServiceNow",
      baseUrl: "https://jsonplaceholder.typicode.com",
      type: "ITSM",
      token: "",
    },
    {
      id: crypto.randomUUID(),
      name: "Splunk",
      baseUrl: "https://jsonplaceholder.typicode.com",
      type: "Logs",
      token: "",
    },
  ],
  widgets: [
    {
      id: crypto.randomUUID(),
      title: "Open Tickets",
      sourceId: null,
      method: "GET",
      endpoint: "/todos?_limit=5",
      body: "",
      refreshSeconds: 30,
      lastData: null,
      lastStatus: "Never fetched",
    },
  ],
};

defaultState.widgets[0].sourceId = defaultState.integrations[0].id;

function clearAllPollers() {
  for (const intervalId of pollers.values()) clearInterval(intervalId);
  pollers.clear();
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.integrations) || !Array.isArray(parsed.widgets)) {
      throw new Error("Invalid state");
    }
    return parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

const integrationForm = document.querySelector("#integration-form");
const integrationList = document.querySelector("#integration-list");
const widgetForm = document.querySelector("#widget-form");
const widgetSource = document.querySelector("#widget-source");
const dashboardGrid = document.querySelector("#dashboard-grid");
const widgetTemplate = document.querySelector("#widget-template");
const clearWidgetsBtn = document.querySelector("#clear-widgets");
const exportConfigBtn = document.querySelector("#export-config");
const importConfigInput = document.querySelector("#import-config");

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getIntegration(sourceId) {
  return state.integrations.find((int) => int.id === sourceId);
}

function renderIntegrations() {
  integrationList.innerHTML = "";
  widgetSource.innerHTML = "";

  for (const integration of state.integrations) {
    const option = document.createElement("option");
    option.value = integration.id;
    option.textContent = `${integration.name} (${integration.type})`;
    widgetSource.append(option);

    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${integration.name}</strong><br>
        <small>${integration.type} • ${integration.baseUrl}</small>
      </span>
    `;

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      state.integrations = state.integrations.filter((i) => i.id !== integration.id);
      state.widgets = state.widgets.filter((w) => w.sourceId !== integration.id);
      saveState();
      renderAll();
    });

    li.append(remove);
    integrationList.append(li);
  }

  if (state.integrations.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No integrations yet. Add one to begin.";
    integrationList.append(empty);
  }
}

function formatData(data) {
  return JSON.stringify(data, null, 2);
}

function parseBody(bodyText) {
  if (!bodyText.trim()) return undefined;
  return JSON.parse(bodyText);
}

async function fetchWidgetData(widget, outputNode, metaNode) {
  const integration = getIntegration(widget.sourceId);
  if (!integration) {
    outputNode.textContent = "Integration missing. Remove or rebind this widget.";
    return;
  }

  const headers = {
    Accept: "application/json",
  };

  if (integration.token) {
    headers.Authorization = integration.token.startsWith("Bearer ")
      ? integration.token
      : `Bearer ${integration.token}`;
  }

  const url = `${integration.baseUrl}${widget.endpoint}`;
  outputNode.textContent = `Loading ${url} ...`;

  try {
    const requestInit = {
      method: widget.method || "GET",
      headers,
    };

    if ((widget.method || "GET") !== "GET") {
      headers["Content-Type"] = "application/json";
      requestInit.body = JSON.stringify(parseBody(widget.body || ""));
    }

    const response = await fetch(url, requestInit);
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    widget.lastData = data;
    widget.lastStatus = `Last updated: ${new Date().toLocaleTimeString()}`;
    outputNode.textContent = formatData(data);
    metaNode.textContent = `${integration.name} • ${widget.method} ${widget.endpoint} • ${widget.lastStatus}`;
    saveState();
  } catch (error) {
    widget.lastStatus = `Fetch error: ${error.message}`;
    outputNode.textContent = widget.lastStatus;
    metaNode.textContent = `${integration.name} • ${widget.method} ${widget.endpoint} • ${widget.lastStatus}`;
    saveState();
  }
}

function renderWidgets() {
  clearAllPollers();
  dashboardGrid.innerHTML = "";

  for (const widget of state.widgets) {
    const fragment = widgetTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".widget-card");
    const title = card.querySelector(".widget-title");
    const meta = card.querySelector(".widget-meta");
    const output = card.querySelector(".widget-output");
    const refreshBtn = card.querySelector(".refresh-btn");
    const removeBtn = card.querySelector(".remove-btn");

    const integration = getIntegration(widget.sourceId);
    title.textContent = widget.title;
    meta.textContent = integration
      ? `${integration.name} • ${widget.method} ${widget.endpoint} • ${widget.lastStatus}`
      : "Integration not found";
    output.textContent = widget.lastData ? formatData(widget.lastData) : "No data yet";

    refreshBtn.addEventListener("click", () => fetchWidgetData(widget, output, meta));
    removeBtn.addEventListener("click", () => {
      state.widgets = state.widgets.filter((w) => w.id !== widget.id);
      saveState();
      renderWidgets();
    });

    dashboardGrid.append(fragment);

    if (integration && !widget.lastData) {
      fetchWidgetData(widget, output, meta);
    }

    if (integration && widget.refreshSeconds > 0) {
      const intervalId = setInterval(
        () => fetchWidgetData(widget, output, meta),
        widget.refreshSeconds * 1000,
      );
      pollers.set(widget.id, intervalId);
    }
  }

  if (state.widgets.length === 0) {
    dashboardGrid.innerHTML = "<p>No widgets yet. Add one from the control panel.</p>";
  }
}

function renderAll() {
  renderIntegrations();
  renderWidgets();
}

function safeJsonParse(inputText) {
  try {
    return JSON.parse(inputText);
  } catch {
    return null;
  }
}

integrationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#integration-name").value.trim();
  const baseUrl = document.querySelector("#integration-url").value.trim();
  const type = document.querySelector("#integration-type").value;
  const token = document.querySelector("#integration-token").value.trim();

  state.integrations.push({ id: crypto.randomUUID(), name, baseUrl, type, token });
  saveState();
  integrationForm.reset();
  renderAll();
});

widgetForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (state.integrations.length === 0) {
    alert("Please add an integration before creating widgets.");
    return;
  }

  const title = document.querySelector("#widget-title").value.trim();
  const sourceId = widgetSource.value;
  const method = document.querySelector("#widget-method").value;
  const endpoint = document.querySelector("#widget-endpoint").value.trim();
  const body = document.querySelector("#widget-body").value.trim();
  const refreshSeconds = Number(document.querySelector("#widget-refresh").value) || 0;

  if (method !== "GET" && body && !safeJsonParse(body)) {
    alert("Request body must be valid JSON.");
    return;
  }

  state.widgets.push({
    id: crypto.randomUUID(),
    title,
    sourceId,
    method,
    endpoint,
    body,
    refreshSeconds,
    lastData: null,
    lastStatus: "Never fetched",
  });

  saveState();
  widgetForm.reset();
  renderWidgets();
});

clearWidgetsBtn.addEventListener("click", () => {
  state.widgets = [];
  saveState();
  renderWidgets();
});

exportConfigBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tech-portal-config.json";
  a.click();
  URL.revokeObjectURL(url);
});

importConfigInput.addEventListener("change", async () => {
  const file = importConfigInput.files?.[0];
  if (!file) return;
  const text = await file.text();
  const imported = safeJsonParse(text);

  if (!imported || !Array.isArray(imported.integrations) || !Array.isArray(imported.widgets)) {
    alert("Invalid config file.");
    return;
  }

  state = imported;
  saveState();
  renderAll();
});

renderAll();
