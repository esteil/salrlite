// ==UserScript==
// @name           New Posts in New Tabs
// @description    Adds a button to open all threads with new posts in new tabs.
// @include        http://forums.somethingawful.com/*
// @author         RedKazan
// ==/UserScript==
(function() {
  var forum = document.getElementById("forum");
  if (forum)
  {	
  	var button = document.createElement("a");
  	button.href = "#";
  	button.innerHTML = "Open New Posts in New Tabs";
  	button.style.cssFloat = "right";
  	button.style.marginRight = "8px";
  	button.addEventListener("click", NewPostsInNewTabs, false);

    //console.log('button=', button);
    
  	var where = document.evaluate("//tr/th[contains(@class,'title')]",
  			forum, null, 7, null);
    // var where = forum.querySelector('th.title');
    where = where.snapshotItem(0);
  	//console.log('where=', where);
  	
  	if (where)
  	{
  		where.insertBefore(button,where.firstChild);
  	}
  }

  function NewPostsInNewTabs(event)
  {
  	var eval, node, name;
  	event.preventDefault();
  	eval = document.evaluate("//tbody/tr/td/div/a[contains(@class,'count')]",
  			document.getElementById("forum"), null, 7, null);
    // eval = document.getElementById('forum').querySelectorAll('tbody tr td div a.count');
    // for (i = 0; i < eval.length; i++)
    var i = 0;
    var urls = [];
  	while(node = eval.snapshotItem(i))
  	{
      // node = eval.snapshotItem(i);//[i];
  		console.log('i=', i, 'node=', node, node.href);
  		name = node.parentNode.nextSibling.nextSibling.childNodes[1].innerHTML;
  		urls.push(node.href);
      // window.open(node.href,name);
      // window.open('about:blank', name);
      // window.focus();
      // GM_openInTab(node.href,name);
  		i++;
  	}
	
    chrome.extension.sendRequest({openThreadTabs: urls}, function(response){});
    
  	return;
  }
})();