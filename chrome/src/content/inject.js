// Monkey patch fetch and WebSocket

var script1 = document.createElement('script');
script1.src = browser.runtime.getURL('lib/fetchSniffer.js');
script1.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script1);

var script2 = document.createElement('script');
script2.src = browser.runtime.getURL('lib/socketSniffer.js');
script2.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script2);
