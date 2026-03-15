import './styles.css';

const form = document.querySelector('#window-form');
const statusLine = document.querySelector('#status-line');
const saveButton = document.querySelector('#save-button');
const loadButton = document.querySelector('#load-button');

const sizeOptions = [
  { tier: 'tiny', minUsers: 1, maxUsers: 50 },
  { tier: 'small', minUsers: 51, maxUsers: 100 },
  { tier: 'medium', minUsers: 101, maxUsers: 500 },
  { tier: 'large', minUsers: 501, maxUsers: 2000 },
  { tier: 'xlarge', minUsers: 2001, maxUsers: 10000 },
  { tier: 'xxlarge', minUsers: 10001, maxUsers: 50000 },
  { tier: 'huge', minUsers: 50001, maxUsers: 200000 },
  { tier: 'massive', minUsers: 200001, maxUsers: null }
];
const sizeOptionValues = sizeOptions.map((option) => option.tier);
const sizeByTier = Object.fromEntries(sizeOptions.map((option) => [option.tier, option]));
const llmModes = ['allow', 'discourage', 'disallow', 'custom'];
const relationshipTypes = ['friendly_neighbor', 'high_interaction', 'alternative_home', 'other'];

function setStatus(message, type = '') {
  statusLine.textContent = message;
  statusLine.className = `status-line ${type}`.trim();
}

function asLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function splitLines(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function buildCard(title) {
  const card = document.createElement('section');
  card.className = 'card';
  const heading = document.createElement('h2');
  heading.textContent = title;
  card.appendChild(heading);
  return card;
}

function buildField(labelText, inputElement) {
  const field = document.createElement('div');
  field.className = 'field';
  const label = document.createElement('label');
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(inputElement);
  return field;
}

function addTextInput(parent, label, name, value = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.name = name;
  input.value = value;
  parent.appendChild(buildField(label, input));
  return input;
}

function addNumberInput(parent, label, name, value = '', min = undefined) {
  const input = document.createElement('input');
  input.type = 'number';
  input.name = name;
  input.value = value;
  if (typeof min === 'number') {
    input.min = String(min);
  }
  parent.appendChild(buildField(label, input));
  return input;
}

function addTextarea(parent, label, name, value = '') {
  const input = document.createElement('textarea');
  input.name = name;
  input.rows = 4;
  input.value = value;
  parent.appendChild(buildField(label, input));
  return input;
}

function addSelect(parent, label, name, values, selectedValue) {
  const select = document.createElement('select');
  select.name = name;
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (value === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  parent.appendChild(buildField(label, select));
  return select;
}

function addMultiSelect(parent, label, name, values, selectedValues = []) {
  const select = document.createElement('select');
  select.name = name;
  select.multiple = true;
  const selectedSet = new Set(Array.isArray(selectedValues) ? selectedValues : []);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (selectedSet.has(value)) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  parent.appendChild(buildField(label, select));
  return select;
}

function getSizeConfig(tier) {
  return sizeByTier[tier] || sizeByTier.medium;
}

function buildListEditor(config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.textContent = config.label;
  wrapper.appendChild(label);

  const list = document.createElement('div');
  list.className = 'row-list';
  wrapper.appendChild(list);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'secondary';
  addButton.textContent = `Add ${config.itemLabel}`;
  addButton.addEventListener('click', () => addItem(config.empty()));
  wrapper.appendChild(addButton);

  const read = () =>
    Array.from(list.querySelectorAll('.list-item')).map((item) => {
      const result = {};
      config.fields.forEach((field) => {
        const control = item.querySelector(`[data-field="${field.key}"]`);
        if (!control) {
          result[field.key] = '';
          return;
        }
        if (field.type === 'multiselect') {
          result[field.key] = Array.from(control.selectedOptions).map((option) => option.value);
          return;
        }
        result[field.key] = control.value.trim();
      });
      return result;
    });

  const addItem = (entry) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    config.fields.forEach((field) => {
      if (field.type === 'multiselect') {
        const select = addMultiSelect(
          item,
          field.label,
          `${config.key}.${field.key}`,
          field.options,
          entry[field.key]
        );
        select.dataset.field = field.key;
      } else if (field.type === 'select') {
        const select = addSelect(item, field.label, `${config.key}.${field.key}`, field.options, entry[field.key]);
        select.dataset.field = field.key;
      } else {
        const input = addTextInput(item, field.label, `${config.key}.${field.key}`, entry[field.key] || '');
        input.dataset.field = field.key;
      }
    });
    const actions = document.createElement('div');
    actions.className = 'list-item-actions';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Remove';
    deleteButton.addEventListener('click', () => item.remove());
    actions.appendChild(deleteButton);
    item.appendChild(actions);
    list.appendChild(item);
  };

  (config.items || []).forEach((item) => addItem(item));
  return { wrapper, read };
}

function renderForm(data) {
  form.innerHTML = '';

  const core = buildCard('Core');
  addTextInput(core, 'Spec Version', 'specVersion', data.specVersion || '0.1.0');
  addTextarea(core, 'Description', 'description', data.description || '');
  const selectedMembershipSize = data.membershipSize || getSizeConfig('medium');
  const selectedSizeConfig = getSizeConfig(selectedMembershipSize.tier);
  const membershipTier = addSelect(
    core,
    'Membership Size Tier',
    'membershipSize.tier',
    sizeOptionValues,
    selectedMembershipSize.tier || 'medium'
  );
  const membershipMinUsers = addNumberInput(
    core,
    'Membership Min Users',
    'membershipSize.minUsers',
    String(selectedMembershipSize.minUsers ?? selectedSizeConfig.minUsers),
    1
  );
  const membershipMaxUsers = addNumberInput(
    core,
    'Membership Max Users (blank for open-ended)',
    'membershipSize.maxUsers',
    selectedMembershipSize.maxUsers === null || selectedMembershipSize.maxUsers === undefined
      ? ''
      : String(selectedMembershipSize.maxUsers),
    1
  );
  membershipTier.addEventListener('change', () => {
    const config = getSizeConfig(membershipTier.value);
    membershipMinUsers.value = String(config.minUsers);
    membershipMaxUsers.value = config.maxUsers === null ? '' : String(config.maxUsers);
  });
  addTextarea(core, 'Link Policy', 'linkPolicy', data.linkPolicy || '');
  form.appendChild(core);

  const signals = buildCard('Signals and Guidance');
  addTextarea(signals, 'Content Warnings (one per line)', 'contentWarnings', asLines(data.contentWarnings));
  addTextarea(signals, 'Topic Tags (one per line)', 'topicTags', asLines(data.topicTags));
  addTextarea(
    signals,
    'Looking For (one per line)',
    'memberFitSignals.lookingFor',
    asLines(data.memberFitSignals?.lookingFor)
  );
  addTextarea(
    signals,
    'Not Looking For (one per line)',
    'memberFitSignals.notLookingFor',
    asLines(data.memberFitSignals?.notLookingFor)
  );
  const llmMode = addSelect(signals, 'LLM Scraping Mode', 'llmScrapingPolicy.mode', llmModes, data.llmScrapingPolicy?.mode);
  addTextInput(signals, 'llms.txt URL', 'llmScrapingPolicy.llmsTxtUrl', data.llmScrapingPolicy?.llmsTxtUrl || '');
  form.appendChild(signals);

  const pinned = buildCard('Pinned Content');
  const pinnedEditor = buildListEditor({
    key: 'pinnedContent',
    label: 'Pinned Content Items',
    itemLabel: 'Pinned Item',
    items: data.pinnedContent,
    empty: () => ({ title: '', url: '', notes: '' }),
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'url', label: 'URL' },
      { key: 'notes', label: 'Notes' }
    ]
  });
  pinned.appendChild(pinnedEditor.wrapper);
  form.appendChild(pinned);

  const optional = buildCard('Optional Fields');
  addTextInput(optional, 'Moderation Satisfaction Source', 'moderationSatisfaction.source', data.moderationSatisfaction?.source || '');
  addTextInput(optional, 'Moderation Satisfaction Score (0-1)', 'moderationSatisfaction.score', String(data.moderationSatisfaction?.score ?? ''));
  addTextInput(optional, 'Lurker Ratio (0-1)', 'lurkerRatio', String(data.lurkerRatio ?? ''));

  const customFieldsEditor = buildListEditor({
    key: 'customFields',
    label: 'Custom Fields',
    itemLabel: 'Custom Field',
    items: data.customFields,
    empty: () => ({ key: '', label: '', value: '' }),
    fields: [
      { key: 'key', label: 'Key' },
      { key: 'label', label: 'Label' },
      { key: 'value', label: 'Value' }
    ]
  });
  optional.appendChild(customFieldsEditor.wrapper);

  const adjacentEditor = buildListEditor({
    key: 'adjacentCommunities',
    label: 'Adjacent Communities',
    itemLabel: 'Adjacent Community',
    items: data.adjacentCommunities,
    empty: () => ({ name: '', url: '', relationshipTypes: ['friendly_neighbor'] }),
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'url', label: 'URL' },
      {
        key: 'relationshipTypes',
        label: 'Relationship Types (Command-click for multiple)',
        type: 'multiselect',
        options: relationshipTypes
      }
    ]
  });
  optional.appendChild(adjacentEditor.wrapper);
  form.appendChild(optional);

  return {
    readPayload: () => {
      const getValue = (name) => form.elements.namedItem(name)?.value?.trim() || '';
      const moderationScoreText = getValue('moderationSatisfaction.score');
      const lurkerRatioText = getValue('lurkerRatio');
      const llmsTxtUrl = getValue('llmScrapingPolicy.llmsTxtUrl');

      const payload = {
        specVersion: getValue('specVersion') || '0.1.0',
        description: getValue('description'),
        contentWarnings: splitLines(getValue('contentWarnings')),
        topicTags: splitLines(getValue('topicTags')),
        pinnedContent: pinnedEditor.read().filter((item) => item.title || item.url),
        membershipSize: (() => {
          const tier = getValue('membershipSize.tier');
          const selectedSize = getSizeConfig(tier);
          const minUsersValue = Number.parseInt(getValue('membershipSize.minUsers'), 10);
          const maxUsersText = getValue('membershipSize.maxUsers');
          const maxUsersValue = maxUsersText === '' ? null : Number.parseInt(maxUsersText, 10);
          return {
            tier: selectedSize.tier,
            minUsers: Number.isInteger(minUsersValue) ? minUsersValue : selectedSize.minUsers,
            maxUsers: maxUsersValue === null ? selectedSize.maxUsers : maxUsersValue
          };
        })(),
        linkPolicy: getValue('linkPolicy'),
        memberFitSignals: {
          lookingFor: splitLines(getValue('memberFitSignals.lookingFor')),
          notLookingFor: splitLines(getValue('memberFitSignals.notLookingFor'))
        },
        llmScrapingPolicy: {
          mode: getValue('llmScrapingPolicy.mode')
        },
        customFields: customFieldsEditor.read().filter((item) => item.key || item.label || item.value),
        adjacentCommunities: adjacentEditor.read().filter((item) => item.name || item.url)
      };

      if (llmsTxtUrl) {
        payload.llmScrapingPolicy.llmsTxtUrl = llmsTxtUrl;
      }
      if (moderationScoreText && getValue('moderationSatisfaction.source')) {
        payload.moderationSatisfaction = {
          source: getValue('moderationSatisfaction.source'),
          score: Number(moderationScoreText)
        };
      }
      if (lurkerRatioText) {
        payload.lurkerRatio = Number(lurkerRatioText);
      }
      return payload;
    }
  };
}

let formState = null;

async function loadData() {
  setStatus('Loading...');
  try {
    const response = await fetch('/admin/api/community-window');
    if (!response.ok) {
      throw new Error(`Load failed with status ${response.status}`);
    }
    const data = await response.json();
    formState = renderForm(data);
    setStatus('Loaded current community window document.', 'status-ok');
  } catch (error) {
    setStatus(`Failed to load: ${error.message}`, 'status-error');
  }
}

async function saveData() {
  if (!formState) {
    setStatus('Form is not ready yet.', 'status-error');
    return;
  }
  const payload = formState.readPayload();
  setStatus('Saving...');
  try {
    const response = await fetch('/admin/api/community-window', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (!response.ok) {
      const detail = Array.isArray(body.detail) ? body.detail.map((item) => item.msg).join('; ') : response.statusText;
      throw new Error(detail || 'Validation failed');
    }

    formState = renderForm(body);
    setStatus('Saved successfully.', 'status-ok');
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, 'status-error');
  }
}

loadButton.addEventListener('click', loadData);
saveButton.addEventListener('click', saveData);
loadData();
