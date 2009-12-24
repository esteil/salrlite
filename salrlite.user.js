// ==UserScript==
// @name SALR Lite
// @namespace http://ericiii.net/userscripts
// @include http://forums.somethingawful.com/*
// @description Add a SafariLastRead-style page navigator to every page.
// ==/UserScript==
// various parts from SA Last Read for Safari

(function (){
  var SALR = {};
  SALR.KeyboardNavigator = function() {
    window._keyboard_nav = this;
    var _current_post = null; // element of current post (TABLE.post)
    var _marker = null; // the arrow on the left marking current post
    
    // private methods
    function getDimensions(el) {
      var top = 0, 
          left = 0, 
          height = 0, 
          width = 0;
      
      var obj = el;
      if(obj.offsetParent) {
        do {
          left += obj.offsetLeft;
          top += obj.offsetTop;
        } while(obj = obj.offsetParent);
      }
      
      height = el.offsetHeight;
      width = el.offsetWidth;
      
      return {
        top: top,
        left: left,
        height: height,
        width: width
      };
    }
    
    function markCurrentPost() {
      if(!_current_post) return;
      
      var pos = getDimensions(_current_post);
      console.log(_current_post);
      
      _marker.style.left = (pos.left - _marker.offsetWidth) + "px";
      _marker.style.top = pos.top + "px";
      
      // location.replace('#' + _current_post.id);
      _current_post.scrollIntoView(true);
    }
    
    function navigateNext() {
      var obj = _current_post.nextSibling;
      while(obj && obj.tagName != 'TABLE') 
        obj = obj.nextSibling;
        
      if(obj) _current_post = obj;
      // if(_current_post.nextSibling) _current_post = _current_post.nextSibling;
      markCurrentPost();
    }
    
    function navigatePrevious() {
      var obj = _current_post.previousSibling;
      while(obj && obj.tagName != 'TABLE') 
        obj = obj.previousSibling;

      if(obj) _current_post = obj;
      // if(_current_post.previousSibling) _current_post = _current_post.previousSibling;
      markCurrentPost();
    }
    
    // initialize marker
    _marker = document.createElement('DIV');
    _marker.style.position = 'absolute';
    _marker.style.fontSize = '125%';
    _marker.style.fontWeight = 'bold';
    _marker.style.marginTop = '5px'
    _marker.innerHTML = '&gt;';
    document.body.appendChild(_marker);
    
    // initialize current post index, possibly from URL hash
    if(location.hash != '') {
      // figure out index
      var el = document.getElementById(location.hash.replace(/^#/, ''));
      // console.log('location.hash', location.hash, el);
      if(el) {
        while(el.tagName != 'TABLE') el = el.parentNode;
      }

      if(el) _current_post = el;
    }
    
    if(!_current_post) {
      var result = document.evaluate('//table[@class="post"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      _current_post = result.singleNodeValue;
    }

    // console.log('current post: ' + _current_post);
    
    markCurrentPost();
      
    // initialize events
    window.addEventListener('keyup', function(evt) {
      var chr = String.fromCharCode(evt.which).toLowerCase();
      switch(chr) {
        case 'j': // next post
          navigateNext();
          
          break;
        case 'k': // previous post
          navigatePrevious();
          
          break;
        case 'h': // help
          alert("J   Next Post\nK   Previous Post");
          break;
      }
    });
    
    // Public API
    
    return this;
  };
  
  // CONFIGURATION VALUES
  var salr_enable_pager_fading = true;
  var salr_hide_images_from_read_posts = false;
  var do_styling_changes = true;
  
  // Move seen threads to the top (so unread | read | unseen), keeping order
  var move_seen_to_top = true;
  
  /* CSS Utility functions (for add/remove class, basically)
  from http://fredbird.org/lire/log/2005-09-16-javascript-css-functions */
  var CSS = {
   /* has the DOM object a certain class ?
   obj = DOM object, cName = a class name
   */
   hasClass: function (obj,cName) {
     return new RegExp('\\b'+cName+'\\b').test(obj.className);
   },
  
   /* has the DOM object a set of classes ?
   obj = DOM object, classes=array of class names
   */
   hasClasses: function (obj,classes) {
     var f;
     for (f=0; f<classes.length; f++) {
       if (!this.hasClass(obj,classes[f])) return false;
     }
     return true;
   },
  
   /* add a class to a DOM object if necessary
   obj = DOM object, cName = a class name
   */
   addClass: function (obj,cName) {
     if (!this.hasClass(obj,cName)) {
       obj.className+=obj.className?' '+cName:cName;
     }
     return true;
   },
  
   /* removes a class from a DOM object
   obj = DOM object, cName = a class name
   */
   removeClass: function (obj,cName) {
     if (!this.hasClass(obj,cName)) return false;
     var rep=obj.className.match(' '+cName)?' '+cName:cName;
     obj.className=obj.className.replace(rep,'');
     return true;
   },
  
   /* swap two classes for a DOM object, whatever provided order
   */
   swapClasses: function (obj,class1,class2) {
     if (this.hasClass(obj,class1)) {
       this.removeClass(obj,class1);
       this.addClass(obj,class2);
       return true;
     }
     if (this.hasClass(obj,class2)) {
       this.removeClass(obj,class2);
       this.addClass(obj,class1);
       return true;
     }
     return false;
   },
  
   /* sets class 'to' to the DOM object obj, removes class 'from' if necessary
   */
   switchClass: function (obj,to,from) {
     if (this.hasClass(obj,from)) this.removeClass(obj,from);
     this.addClass(obj,to);
     return true;
   },
  
   /* returns an array of DOM objects having the provided class name
   within object 'container' and with tag name 'tag'
   some code from http://www.webmasterworld.com/forum91/1757.htm (unbugged)
   */
   getElementsByClassName: function (className,container,tag) {
     // default container to document
     container=container||document;
     // default tag to *
     tag=tag||'*';
     // listing container descendants
     var all = container.all||container.getElementsByTagName(tag);
     var found=new Array();
     // searching for targets
     for (f=0; f<all.length; f++) {
       var el=all[f];
       if (this.hasClass(all[f],className)) {
         found.push(all[f]);
       }
     }
     return found;
   }
  };
  
  var _threadId = null,
      _keyboard_nav = null;

	function getThreadID(loc) {
		if(_threadId) return _threadId;
		//log("[START] getThreadID");
		var r = 0;

		if (loc.match(/threadid=(\d+)/i)) {
			r = RegExp.$1;
		} else if(document.vbform && document.vbform.threadid) {
			r = document.vbform.threadid.value;
		} else {
			/*
			if (document.documentElement.innerHTML.match(/addsubscription&threadid=(\d+)/i))
				r = RegExp.$1;
			else
				r = 0;
			 */

			// find A href="member2.php?s=&addsubscription=..."
			var aTags = document.getElementsByTagName('A');
			var aL = aTags.length;
			for(var j = 0; j < aL; j++) {
			  if(CSS.hasClass(aTags[j], 'pagenumber') && aTags[j].href.match(/threadid=(\d+)/i)) {
			    r = Number(RegExp.$1);
			    break;
				} else if(aTags[j].href.replace(/&amp;/g, '&').match(/action=newreply&threadid=(\d+)/i)) {
					r = Number(RegExp.$1);
					break;
				} else if(aTags[j].href.replace(/&amp;/g, '&').match(/addsubscription&threadid=(\d+)/i)) {
					r = Number(RegExp.$1);
					break;
				} else if(aTags[j].href.replace(/&amp;/g, '&').match(/(showthread|search)\.php\?s=[0-9a-f]*&threadid=(\d+)/i)) {
					r = Number(RegExp.$2);
					break;
				}
			}
		}

		_threadId = r;
		return r;
	}
	
	function getForumID(loc) {
  	var r = 0;

  	// is it in the url?
  	if(loc.match(/forumid=(\d+)/i)) {
  		r = RegExp.$1;
  	} else {
  		// not in the url...
  		var aTags = document.getElementsByTagName('a');
  		var aL = aTags.length;

  		for(var i = 0; i < aL; i++) {
  			if(aTags[i].href.replace(/&amp;/, '&').match(/newthread&forumid=(\d+)/i)) {
  				r = RegExp.$1;
  				break;
  			}
  		}
  	}

  	return r;
  }
  
  // Get the current page number from the page links at the top of the page
  // Basically, fall back to 1 if we get a problem.
  function getTotalNumberOfPages() {
    var loc = location.href;

    var pageNumberDivs = CSS.getElementsByClassName('pages', document, 'div');
    var pageNumberDiv;
    var pageTotal = 1;

    if(pageNumberDiv = pageNumberDivs[0]) {
      if(pageNumberDiv.innerHTML.match(/\((\d+)\): /)) {
        pageTotal = Number(RegExp.$1);
      } else {
        pageTotal = 1;
      }

      // this really shouldn't be here, but eh
      var aTags = CSS.getElementsByClassName('pagenumber', pageNumberDiv, 'a');
      var aTag;
      for(var i = 0; i < aTags.length; i++) {
        if(!aTags[i].href.match(/(forumid|threadid)=/i)) continue;
        if(getPageType() == 'thread' && !aTags[i].href.match(/threadid=/i)) continue;
        if(getPageType() == 'forum' && !aTags[i].href.match(/forumid=/i)) continue;

        aTag = aTags[i];
        window._salr_page_number_url = aTag.href;
        break;
      }
    }

    return pageTotal;
  }
 
  function getPageNumber(loc) {
  //log("[START] getPageNumber");

    var r = 1;
    if(loc.match(/pagenumber=(\d+)/i)) {
      r = RegExp.$1;
    } else {
      // we can't get it from the URL
      var spanTags = CSS.getElementsByClassName('curpage', document, 'SPAN');
      if(spanTags[0]) {
        r = Number(spanTags[0].innerHTML);
      } else {
        r = 1;
      }
    }

    return r;
  }
 
  function getPageType() {
    if(location.href.match(/showthread\.php/)) return 'thread';
    else if(location.href.match(/forumdisplay\.php/)) return 'forum';
    else if(location.href.match(/usercp\.php/) || location.href.match(/member2\.php.*action=viewsubscription/i)) return 'cp';
    else if(location.href.match(/newreply.php/) || location.href.match(/editpost.php/i)) return 'reply';
    else return 'unknown';
  }
 
  // add the page navigator to thread pages
  //  borrowed and modified from the firefox extension
  function addPageNavigator() {
  
    var total_pages = getTotalNumberOfPages();
    var page_url = window._salr_page_number_url;
    var this_page = Number(getPageNumber(location.href));
    var is_thread_page = (getPageType() == 'thread');

    // skip if it's not multiple pages
    //if(page_url == undefined) return;

    var wrapper = document.createElement('DIV');
  
    wrapper.className = 'salr_page_navigator';
    if(salr_enable_pager_fading) wrapper.className += ' salr_page_navigator_fade';

    // we use INPUT TYPE=BUTTON here instead of <BUTTON> because Safari as of 10.4.6 renders <BUTTON> ugly-like
    //  and <INPUT TYPE=BUTTON> natively.
    // first page
    var firstPage = document.createElement('INPUT');
    firstPage.type = 'button';
    firstPage.value = '<<';
    // firstPage.setAttribute('accesskey', 'F');
    firstPage.title = 'Go to first page (^F)';
    if(this_page == 1) firstPage.disabled = true;
    else firstPage.addEventListener('click', function() { 
      document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=1'); 
    }, false);
  
    // previous page
    var prevPage = document.createElement('INPUT');
    prevPage.type = 'button';
    prevPage.value = '<';
    // prevPage.setAttribute('accesskey', 'p');
    prevPage.title = 'Go to previous page (^P)';
    if(this_page == 1) prevPage.disabled = true;
    else prevPage.addEventListener('click', function() { 
      document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (this_page - 1)); 
    }, false);
   
    // next page
    var nextPage = document.createElement('INPUT');
    nextPage.type = 'button';
    nextPage.value = '>';
    // nextPage.setAttribute('accesskey', 'n');
    nextPage.title = 'Go to next page (^N)';
    if(this_page == total_pages) nextPage.disabled = true;
    else nextPage.addEventListener('click', function() { 
      document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (this_page + 1)); 
    }, false);
 
    // last page
    var lastPage = document.createElement('INPUT');
    lastPage.type = 'button';
    lastPage.value = '>>';
    // lastPage.setAttribute('accesskey', 'l');
    lastPage.title = 'Go to last page (^L)';
    if(this_page == total_pages) lastPage.disabled = true;
    else lastPage.addEventListener('click', function() { 
      document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (total_pages)); 
    }, false);

    // last seen post (@)
    var lastPostButton = document.createElement('INPUT');
    lastPostButton.type = 'button';
    lastPostButton.value = '@';
    // lastPostButton.setAttribute('accesskey', 'm');
    lastPostButton.title = 'Go to latest post (^M)';
    
    if(!is_thread_page) lastPostButton.disabled = true; // can't use on forum pages
    else lastPostButton.addEventListener('click', function() {
      location.replace('showthread.php?threadid=' + getThreadID(location.href) + '&goto=newpost');
    }, false);

    // dropdown
    var pageSelector = document.createElement('SELECT');
    pageSelector.size = 1;
    // add the individual page numbers
    for(var i = 1; i <= total_pages; i++) {
      var opt = document.createElement('OPTION');
      opt.appendChild(document.createTextNode(i));
      pageSelector.appendChild(opt);
    }
    pageSelector.selectedIndex = Number(this_page) - 1;
    if(total_pages == 1) pageSelector.disabled = true;
    else pageSelector.addEventListener('change', function() { 
      document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (Number(pageSelector.selectedIndex) + 1)); 
    }, false);

    wrapper.appendChild(firstPage);
    wrapper.appendChild(prevPage);
    wrapper.appendChild(pageSelector);
    wrapper.appendChild(lastPostButton);
    // wrapper.appendChild(forgetThreadButton);
    wrapper.appendChild(nextPage);
    wrapper.appendChild(lastPage);

    document.body.appendChild(wrapper);
    
    // register page listener
    window.addEventListener('keyup', function(evt) {
      if(!evt.ctrlKey) return;
      
      //console.log('which=', evt.which, 'key', String.fromCharCode(evt.which));
      
      switch(String.fromCharCode(evt.which)) {
        case 'F':
          if(this_page != 1) document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=1'); 
          break;
        case 'P':
          if(this_page != 1) document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (this_page - 1)); 
          break;
        case 'N':
          if(this_page != total_pages) document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (this_page + 1)); 
          break;
        case 'L':
          if(this_page != total_pages) document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + (total_pages)); 
          break;
        case 'M':
        case 'K':
          if(is_thread_page) location.replace('showthread.php?threadid=' + getThreadID(location.href) + '&goto=newpost');
          break;
      }
    }, false);
  }
  
  function fixDropDown() {
  	var elements = document.getElementsByTagName('select');
  	var forumid = getForumID(location.href);

  	for(var i = 0; i < elements.length; i++) {
  		var e = elements[i];
  		if(e.name == 'forumid') {

  			// find the right option
  			for(var j = 0; j < e.options.length; j++) {
  				if(e.options[j].value == forumid) e.selectedIndex = j;
  			}
  		}

  		if(false && elements[i].action == 'forumdisplay.php') {
  			// we found the form with the dropdown nav element!
  			for(var j = 0; j < elements[i].forumid.options.length; j++) {
  				if(elements[i].forumid.options[j].value == forumid) {
  					elements[i].forumid.options[j].selected = true;
  				} else {
  					elements[i].forumid.options[j].selected = false;
  				}
  			}
  		}
  	}
  }
  
  // This finds all the threads with class seen, where they're fully read (only the "forget" link included)
  // This marks each TD with an additioanl 'nonew' class
  function markFullyReadThreads() {
    var seen_threads_xpath = "//tr[contains(@class,'seen')]/td[contains(@class,'title')]/div[contains(@class,'lastseen')]";
    
    // find the positions to insert
    var first_unseen = document.getElementById('forum').getElementsByTagName('tbody')[0].getElementsByTagName('tr')[0];
    // skip announcement thread
    //if(first_unseen.id == '' || first_unseen.id == null) first_unseen = first_unseen.nextSibling;
    
    // make sure it is the first unseen thread, not just any thread
    while(first_unseen.className.match(/\bseen\b/i))
      first_unseen = first_unseen.nextSibling;
    
    var move_read = [];
    var move_new = []
    
    var result = document.evaluate(seen_threads_xpath, document, null, 6, null);
    var i = 0, node;
    while(node = result.snapshotItem(i++)) {
      var parent = node.parentNode;
      var parent = node.parentNode;
      while(parent && (parent.tagName != 'tr' && parent.tagName != 'TR')) {
        parent = parent.parentNode;
      }
      
      if(document.evaluate('count(a)', node, null, 1, null).numberValue == 1) {
        if(parent) {
          CSS.swapClasses(parent, 'seen', 'salr_nonew');
          move_read.push(parent);
        }
      } else {
        if(parent) {
          CSS.swapClasses(parent, 'seen', 'salr_seen');
          move_new.push(parent);
        }
      }
    }
    
    console.log('first unseen', first_unseen, first_unseen.innerText);
    
    if(move_seen_to_top) {
      for(var i in move_new) first_unseen.parentNode.insertBefore(move_new[i], first_unseen);
      for(var i in move_read) first_unseen.parentNode.insertBefore(move_read[i], first_unseen);
    }
  }
  
  function markLastSeen() {
    var last_seen_post_xpath = '//table[@class="post" and .//tr[@class="altcolor1" or @class="altcolor2"]][1]/preceding-sibling::table[1]//tr[last()]';
    
    var result = document.evaluate(last_seen_post_xpath, document, null, 6, null);
    var i = 0, node;
    while(node = result.snapshotItem(i++)) {
      CSS.addClass(node, 'salr_post_lastseen');
    }
  }
  
  function addCSS(css) {
    if(false && GM_addStyle) {
      GM_addStyle(css);
    } else {
      var styleElement = document.createElement("style");

      styleElement.type = "text/css";
      if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText = css;
      } else {
        styleElement.appendChild(document.createTextNode(css));
      }
      document.getElementsByTagName("head")[0].appendChild(styleElement);
    }
  }
  
  // hook up page nagivation
  function attachKeyboardNav() {
    _keyboard_nav = new SALR.KeyboardNavigator();
  }
  
  function doLastReadStuff() {
    
    // add the styles necessary for the page navigator
    addCSS('div.salr_page_navigator { position: fixed; right: 0px; bottom: 0px; background: #ddd; padding: 4px; border: 1px #888 solid; border-bottom: none; border-right: none; }');
    addCSS('div.salr_page_navigator.salr_page_navigator_fade { opacity: 0.3; }');
    addCSS('div.salr_page_navigator.salr_page_navigator_fade:hover { opacity: 1.0; }');

    if(do_styling_changes) {
      // and the new thread highlights
      // these are just .png from the SafariLastRead default theme
      // new seen threads (new-posts.png)
      addCSS('tr.thread.salr_seen td { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAABGdBTUEAANbY1E9YMgAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAXSURBVHjaYp555n8DEwMQjBLkEAABBgDpvwNmEODi1AAAAABJRU5ErkJggg==) !important; }');
      // new all-read threads (no-new-posts.png)
      addCSS('tr.thread.salr_nonew td { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwNC8yMC8wNeA4ZJwAAAAldEVYdFNvZnR3YXJlAE1hY3JvbWVkaWEgRmlyZXdvcmtzIE1YIDIwMDSHdqzPAAAAI0lEQVQokWOaOXOmAxMDEDAxMjJCCTQuGoFTlooSg908uAQAN4oDIr2YVscAAAAASUVORK5CYII=) !important; }');
      // seen posts, just the darker blue?
      addCSS('table.post tr.seen1 td, table.post tr.seen2 td { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAABGdBTUEAANbY1E9YMgAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAXSURBVHjaYp555n8DEwMQjBLkEAABBgDpvwNmEODi1AAAAABJRU5ErkJggg==) !important; }');

      // last seen post
      addCSS('table.post tr.salr_post_lastseen { border-bottom: 4px dodgerblue dashed !important; }');
    }

    // Hide images from read posts
    if(salr_hide_images_from_read_posts) addCSS('tr.seen1 td.postbody img.img, tr.seen2 td.postbody img.img, tr.seen1 td.postbody img.timg, tr.seen2 td.postbody img.timg { display: none; }');

    // run the important stuff
    addPageNavigator();
    fixDropDown();

    // add no-new-posts class to seen ones
    if(do_styling_changes) {
      var page_type = getPageType();
      if(page_type == 'forum') markFullyReadThreads();
      if(page_type == 'thread') markLastSeen();
      if(page_type == 'thread') attachKeyboardNav();
    }
  }

  // on domready
  // Fx+greasemonkey runs at the appropriate time
  if(navigator.userAgent.match(/Gecko\//)) doLastReadStuff();
  else if(document.readyState == 'loaded' || document.readyState == 'complete') doLastReadStuff();
  else document.addEventListener('DOMContentLoaded', doLastReadStuff, false);
})();
