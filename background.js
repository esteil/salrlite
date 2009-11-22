chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log("Request from " + (sender.tab ? sender.tab.url : "extension"));
  
  if(request.openThreadTabs) {
    var urls = request.openThreadTabs;
    var i = 0;
    for(i = 0; i < urls.length; i++) {
      console.log("Opening tab for", urls[i]);
      chrome.tabs.create({url: urls[i], selected: false});
    }
  }
  sendResponse({});
});