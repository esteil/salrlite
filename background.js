function openTabsForUrls(urls) {
  var i = 0;
  for(i = 0; i < urls.length; i++) {
    console.log('Opening tab for', urls[i]);
    
    if(typeof(chrome) != 'undefined') {
      chrome.tabs.create({url: urls[i], selected: false});
    } else if(typeof(safari) != 'undefined') {
      var tab = safari.application.activeBrowserWindow.openTab('background');
      tab.url = urls[i];
    }
  }
}

var isChrome = false;
var isSafari = false;

try {
  isChrome = chrome && chrome.extension;
} catch(err) {
  isChrome = false;
}

try {
  isSafari = safari && safari.application;
} catch(err) {
  isSafari = false;
}

if(isChrome) {
  // Chrome event handler
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    console.log("Request from " + (sender.tab ? sender.tab.url : "extension"));

    if(request.openThreadTabs) {
      openTabsForUrls(request.openThreadTabs);
    }
    sendResponse({});
  });  
} else if(isSafari) {
  // Safari event handler
  safari.application.addEventListener("message", function(msgEvent) {
    console.log('Request ', msgEvent, 'from', msgEvent.target.url);
    
    switch(msgEvent.name) {
      case 'openThreadTabs':
        var data = msgEvent.message;
        if(data.openThreadTabs) {
          openTabsForUrls(data.openThreadTabs);
        }
        break;
      case 'settings':
        var settings = {
          floatThreads: safari.extension.settings.floatThreads,
          keyboardNav: safari.extension.settings.keyboardNav,
          pageNavigator: safari.extension.settings.pageNavigator
        };
        msgEvent.target.page.dispatchMessage('settings', settings);
        break;
    }
  }, false);
}
