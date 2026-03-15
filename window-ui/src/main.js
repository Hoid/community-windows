import "./styles.css";

const app = document.querySelector("#app");
const endpoint =
  import.meta.env.VITE_WINDOW_ENDPOINT ||
  "http://127.0.0.1:8000/.well-known/community-window";

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSafeUrl(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
}

function renderExternalLink(url, label) {
  const safeUrl = toSafeUrl(url);
  const safeLabel = escapeHtml(label || url || "");
  if (!safeUrl) {
    return `<span class="muted">${safeLabel}</span>`;
  }
  return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeLabel}</a>`;
}

const MEMBERSHIP_SIZE_LABELS = {
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "XLarge",
  xxlarge: "XXLarge",
  huge: "Huge",
  massive: "Massive",
};

function formatMembershipSize(value) {
  if (!value || typeof value !== "object") {
    return "n/a";
  }
  const tier = typeof value.tier === "string" ? value.tier : null;
  const minUsers = Number.isInteger(value.minUsers) ? value.minUsers : null;
  const maxUsers = value.maxUsers === null || Number.isInteger(value.maxUsers) ? value.maxUsers : null;

  if (!tier || minUsers === null || maxUsers === undefined) {
    return "n/a";
  }
  const label = MEMBERSHIP_SIZE_LABELS[tier] || tier;
  const range = maxUsers === null ? `${minUsers}+ users` : `${minUsers}-${maxUsers} users`;
  return `${label} (${range})`;
}

function renderSection(title, bodyHtml, intro = "") {
  const safeTitle = escapeHtml(title);
  const introHtml = intro ? `<p class="section-intro">${escapeHtml(intro)}</p>` : "";
  return `
    <section class="section panel">
      <header class="section-header">
        <h2>${safeTitle}</h2>
        ${introHtml}
      </header>
      ${bodyHtml}
    </section>
  `;
}

function renderChips(values, variant = "neutral") {
  if (!Array.isArray(values) || values.length === 0) {
    return '<p class="muted">Not provided.</p>';
  }
  const chips = values
    .map((value) => `<span class="chip chip-${variant}">${escapeHtml(value)}</span>`)
    .join("");
  return `<div class="chips">${chips}</div>`;
}

function renderListItems(values, emptyMessage = "Not provided.") {
  if (!Array.isArray(values) || values.length === 0) {
    return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  }
  return `<ul class="list">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderData(data) {
  const instanceName = escapeHtml(data.instance?.name || "Community Window");
  const description = escapeHtml(data.description || "No description provided.");
  const membershipSize = escapeHtml(formatMembershipSize(data.membershipSize));
  const llmMode = escapeHtml(data.llmScrapingPolicy?.mode || "n/a");
  const moderationScore =
    typeof data.moderationSatisfaction?.score === "number"
      ? Math.round(data.moderationSatisfaction.score * 100)
      : null;
  const moderationSource = escapeHtml(data.moderationSatisfaction?.source || "Not provided");
  const lurkerPercent =
    typeof data.lurkerRatio === "number" ? Math.round(data.lurkerRatio * 100) : null;

  const pinned = (data.pinnedContent || [])
    .map(
      (item) => `
      <article class="panel card">
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p>${renderExternalLink(item.url, item.url)}</p>
        ${item.notes ? `<p class="muted">${escapeHtml(item.notes)}</p>` : ""}
      </article>
    `,
    )
    .join("");

  const adjacent = (data.adjacentCommunities || [])
    .map(
      (item) => `
      <li class="adjacent-item">
        <div>${renderExternalLink(item.url, item.name || item.url)}</div>
        <span class="chip chip-neutral">${escapeHtml(
          Array.isArray(item.relationshipTypes)
            ? item.relationshipTypes.join(", ")
            : item.relationshipType || "unspecified",
        )}</span>
      </li>
    `,
    )
    .join("");

  const customFields = (data.customFields || [])
    .map(
      (item) => `
      <article class="panel card">
        <h3>${escapeHtml(item.label || "Additional Field")}</h3>
        <p class="muted">${escapeHtml(item.value || "Not provided.")}</p>
      </article>
    `,
    )
    .join("");

  app.innerHTML = `
    <section class="panel hero">
      <p class="eyebrow">Community Window</p>
      <h1>${instanceName}</h1>
      <p>${description}</p>
      <div class="chips">
        <span class="chip chip-neutral">spec ${escapeHtml(data.specVersion || "n/a")}</span>
        <span class="chip chip-neutral">${membershipSize}</span>
        <span class="chip chip-info">LLM policy: ${llmMode}</span>
      </div>
    </section>

    <section class="section split">
      <article class="panel">
        <header class="section-header">
          <h2>Who This Community Is For</h2>
        </header>
        <div class="grid fit-grid">
          <article class="panel card fit-card fit-good">
            <h3>Looking For</h3>
            ${renderListItems(data.memberFitSignals?.lookingFor, "No fit signals provided.")}
          </article>
          <article class="panel card fit-card fit-caution">
            <h3>Not Looking For</h3>
            ${renderListItems(data.memberFitSignals?.notLookingFor, "No exclusions provided.")}
          </article>
        </div>
      </article>
      <article class="panel">
        <header class="section-header">
          <h2>Content Warnings</h2>
        </header>
        ${renderChips(data.contentWarnings, "warning")}
      </article>
    </section>

    ${renderSection("Topics", renderChips(data.topicTags, "info"))}

    <section class="section">
      <header class="section-header">
        <h2>Pinned Content</h2>
        <p class="section-intro">Featured links and starting points for newcomers.</p>
      </header>
      <div class="grid">
        ${pinned || '<p class="muted">No pinned content published.</p>'}
      </div>
    </section>

    <section class="section split">
      <article class="panel">
        <header class="section-header">
          <h2>Trust Signals</h2>
        </header>
        <div class="grid metrics-grid">
          <article class="panel card metric-card">
            <h3>Moderation Satisfaction</h3>
            ${
              moderationScore !== null
                ? `
              <p class="metric-value">${moderationScore}%</p>
              <div class="meter" role="img" aria-label="Moderation score ${moderationScore}%">
                <span style="width:${moderationScore}%"></span>
              </div>
              <p class="muted">Source: ${moderationSource}</p>
            `
                : '<p class="muted">No moderation satisfaction score provided.</p>'
            }
          </article>
          <article class="panel card metric-card">
            <h3>Lurker Ratio</h3>
            ${
              lurkerPercent !== null
                ? `
              <p class="metric-value">${lurkerPercent}%</p>
              <div class="meter" role="img" aria-label="Lurker ratio ${lurkerPercent}%">
                <span style="width:${lurkerPercent}%"></span>
              </div>
              <p class="muted">Estimated share of less-active members.</p>
            `
                : '<p class="muted">No lurker ratio provided.</p>'
            }
          </article>
        </div>
      </article>
      <article class="panel">
        <header class="section-header">
          <h2>Policies</h2>
        </header>
        <div class="policy-stack">
          <article class="panel card">
            <h3>Link Policy</h3>
            <p>${escapeHtml(data.linkPolicy || "Not provided.")}</p>
          </article>
          <article class="panel card">
            <h3>LLM Scraping Policy</h3>
            <p class="muted">Mode: ${llmMode}</p>
            ${
              data.llmScrapingPolicy?.llmsTxtUrl
                ? `<p>${renderExternalLink(
                    data.llmScrapingPolicy.llmsTxtUrl,
                    data.llmScrapingPolicy.llmsTxtUrl,
                  )}</p>`
                : '<p class="muted">llms.txt not published.</p>'
            }
          </article>
        </div>
      </article>
    </section>

    ${
      customFields
        ? `
      <section class="section">
        <header class="section-header">
          <h2>Additional Notes</h2>
        </header>
        <div class="grid">${customFields}</div>
      </section>
    `
        : ""
    }

    ${
      adjacent
        ? `
      <section class="section panel">
        <header class="section-header">
          <h2>Adjacent Communities</h2>
          <p class="section-intro">Related spaces and relationship context.</p>
        </header>
        <ul class="list adjacent-list">
          ${adjacent}
        </ul>
      </section>
    `
        : ""
    }

    <section class="panel footer-meta">
      <div class="meta-row">
        <span class="muted">Source endpoint</span>
        <code>${escapeHtml(endpoint)}</code>
      </div>
      ${
        data.generatedAt
          ? `<div class="meta-row"><span class="muted">Generated at</span><time>${escapeHtml(data.generatedAt)}</time></div>`
          : ""
      }
    </section>
  `;
}

function renderError(message) {
  app.innerHTML = `
    <section class="panel state-card state-error">
      <h1>Unable to load community window</h1>
      <p>${escapeHtml(message)}</p>
      <p class="muted">Endpoint: <code>${escapeHtml(endpoint)}</code></p>
    </section>
  `;
}

async function load() {
  app.innerHTML = `
    <section class="panel state-card loading">
      <p>Loading community window...</p>
      <div class="skeleton-row"></div>
      <div class="skeleton-row short"></div>
    </section>
  `;
  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !data.description ||
      !data.memberFitSignals
    ) {
      throw new Error("Response is not a valid community window document.");
    }
    renderData(data);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Unexpected error.");
  }
}

load();
