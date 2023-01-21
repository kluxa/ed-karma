////////////////////////////////////////////////////////////////////////
// Intercept responses

browser.webRequest.onBeforeRequest.addListener(
  userListener,
  {urls: ["https://edstem.org/api/user"]},
  ["blocking"],
);

browser.webRequest.onBeforeRequest.addListener(
  threadListener,
  {urls: ["https://edstem.org/api/threads/*?*"]},
  ["blocking"],
);

////////////////////////////////////////////////////////////////////////

function userListener(details) {
  const requestId = details.requestId;

  const filter = browser.webRequest.filterResponseData(requestId);
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  const data = [];
  filter.ondata = (event) => {
    data.push(event.data);
  };

  filter.onstop = (event) => {
    let str = "";
    for (const buffer of data) {
      str += decoder.decode(buffer, {stream: true});
    }
    str += decoder.decode();
    filter.write(encoder.encode(str));
    filter.disconnect();

    browser.tabs.sendMessage(details.tabId, {
      type: 'user-data',
      data: JSON.parse(str),
    });
  }
}

function threadListener(details) {
  const requestId = details.requestId;

  const filter = browser.webRequest.filterResponseData(requestId);
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  const data = [];
  filter.ondata = (event) => {
    data.push(event.data);
  };

  filter.onstop = (event) => {
    let str = "";
    for (const buffer of data) {
      str += decoder.decode(buffer, {stream: true});
    }
    str += decoder.decode();
    filter.write(encoder.encode(str));
    filter.disconnect();

    browser.tabs.sendMessage(details.tabId, {
      type: 'thread-data',
      data: JSON.parse(str),
    });
  }
}

////////////////////////////////////////////////////////////////////////
