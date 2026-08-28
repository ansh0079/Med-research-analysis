const REQUEST_TYPE = 'SIGNAL_MD_EXTRACT_PAGE';
const DELIVER_TYPE = 'SIGNAL_MD_DELIVER_CAPTURE';
const SNAPSHOT_TYPE = 'SIGNAL_MD_PAGE_UPDATED';
const APP_URL_STORAGE_KEY = 'signalMdAppUrl';
const DEFAULT_APP_URL = 'http://localhost:5173/search';

function chromeCall(fn) {
  return new Promise((resolve, reject) => {
    fn((result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result);
    });
  });
}

async function getAppUrl() {
  const stored = await chromeCall((done) => chrome.storage.sync.get([APP_URL_STORAGE_KEY], done)).catch(() => ({}));
  return stored?.[APP_URL_STORAGE_KEY] || DEFAULT_APP_URL;
}

function originPattern(url) {
  try {
    return `${new URL(url).origin}/*`;
  } catch {
    return `${DEFAULT_APP_URL}*`;
  }
}

async function getActiveTab() {
  const tabs = await chromeCall((done) => chrome.tabs.query({ active: true, currentWindow: true }, done));
  return Array.isArray(tabs) ? tabs[0] : null;
}

async function extractFromTab(tab) {
  if (!tab?.id) throw new Error('No active tab found');
  const response = await chromeCall((done) => chrome.tabs.sendMessage(tab.id, { type: REQUEST_TYPE }, done));
  if (!response?.ok || !response.payload) {
    throw new Error(response?.error || 'The active tab did not return readable content');
  }
  return response.payload;
}

async function findOrOpenAppTab(appUrl) {
  const matches = await chromeCall((done) => chrome.tabs.query({ url: originPattern(appUrl) }, done)).catch(() => []);
  const existing = Array.isArray(matches) ? matches.find((tab) => tab.id) : null;
  if (existing) {
    await chromeCall((done) => chrome.tabs.update(existing.id, { active: true }, done)).catch(() => null);
    if (existing.windowId) {
      await chromeCall((done) => chrome.windows.update(existing.windowId, { focused: true }, done)).catch(() => null);
    }
    return existing;
  }
  return chromeCall((done) => chrome.tabs.create({ url: appUrl }, done));
}

async function waitForTabComplete(tabId) {
  const current = await chromeCall((done) => chrome.tabs.get(tabId, done)).catch(() => null);
  if (current?.status === 'complete') return;
  await new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const timeout = setTimeout(finish, 5000);
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function deliverToApp(payload) {
  const appUrl = await getAppUrl();
  const tab = await findOrOpenAppTab(appUrl);
  if (!tab?.id) throw new Error('Could not open Signal MD');
  await waitForTabComplete(tab.id);
  await chromeCall((done) => chrome.tabs.sendMessage(tab.id, { type: DELIVER_TYPE, payload }, done)).catch(() => null);
}

chrome.action.onClicked.addListener(async () => {
  try {
    const activeTab = await getActiveTab();
    const payload = await extractFromTab(activeTab);
    await chrome.storage.local.set({ signalMdLastPageCapture: payload });
    await deliverToApp(payload);
  } catch (error) {
    await chrome.storage.local.set({
      signalMdLastCaptureError: {
        message: error instanceof Error ? error.message : 'Capture failed',
        at: new Date().toISOString(),
      },
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== SNAPSHOT_TYPE || !message.payload) return false;
  chrome.storage.local.set({ signalMdLastPageSnapshot: message.payload }).then(() => {
    sendResponse({ ok: true });
  });
  return true;
});
