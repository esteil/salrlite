// ==UserScript==
// @name SALR Lite
// @namespace http://ericiii.net/userscripts
// @include http://forums.somethingawful.com/*
// @description Add a SafariLastRead-style page navigator to every page.
// ==/UserScript==
// various parts from SA Last Read for Safari

(function (){
  var $ = jQuery;

  function dlog() {
    var log = Function.prototype.bind.call(console.log, console);
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[SALR] ');
    log.apply(console, args);
  }

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
      dlog(_current_post);
      
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
    
    var page_type = getPageType();
    // initialize marker, only on thread pages
    if(page_type == 'thread') {
      _marker = document.createElement('DIV');
      _marker.style.position = 'absolute';
      _marker.style.fontSize = '125%';
      _marker.style.fontWeight = 'bold';
      _marker.style.marginTop = '5px'
      _marker.innerHTML = '&gt;';
      // document.body.appendChild(_marker);
    
      // initialize current post index, possibly from URL hash
      if(location.hash != '') {
        // figure out index
        var el = document.getElementById(location.hash.replace(/^#/, ''));
        dlog('location.hash', location.hash, el);
        if(el) {
          while(el.tagName != 'TABLE') el = el.parentNode;
        }

        if(el) _current_post = el;
      }
    
      if(!_current_post) {
        var result = document.evaluate('//table[@class="post"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        _current_post = result.singleNodeValue;
      }

      dlog('current post: ' + _current_post);
    
      markCurrentPost();
    }
      
    // initialize events only on thread and forum pages
    if(page_type == 'thread' || page_type == 'forum') window.addEventListener('keyup', function(evt) {
      var chr = String.fromCharCode(evt.which).toLowerCase();

      // handle thread-page only key presses
      if(page_type == 'thread') switch(chr) {
        case 'j': // next post
          navigateNext();
          break;
        case 'k': // previous post
          navigatePrevious();
          break;
        case 'm': // reload new posts
          reloadNewPosts();
          break;
      }
      
      // and global key presses
      switch(chr) {
        case 'f': // first page
          goToFirstPage();
          break;
        case 'p': // previous page
        case 'b':
          goToPreviousPage();
          break;
        case 'n': // next page
          goToNextPage();
          break;
        case 'l': // last page
          goToLastPage();
          break;
        case 'h': // help
          var help = [
            'The following hotkeys are available:',
            '',
            'J    Next Post',
            'K    Previous Post',
            'B    Previous Page',
            'N    Next Page',
            'F    First Page',
            'L    Last Page',
            'M    Load new posts',
            'H    This help'
          ];
          
          alert(help.join("\n"));
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
  var enable_page_navigator = true;
  var enable_keyboard_nav = true;
  
  // Move seen threads to the top (so unread | read | unseen), keeping order
  var move_seen_to_top = true;

  if(typeof(safari) != 'undefined') {
    safari.self.tab.dispatchMessage('settings', '');
    safari.self.addEventListener('message', function(evt) {
      dlog('event', evt, evt.message);
      if(evt.name == 'settings') {
        SALR.settings = evt.message;
        initializeSalrSettings();
        doLastReadStuff();
      }
    }, false);
  } else if(typeof(chrome) != 'undefined') {
    chrome.extension.sendRequest({settings: true}, function(response){
      SALR.settings = response;
      initializeSalrSettings();
      doLastReadStuff();
    });
  }
  
  function initializeSalrSettings() {
    enable_page_navigator = SALR.settings.pageNavigator;
    enable_keyboard_nav = SALR.settings.keyboardNav;
    move_seen_to_top = SALR.settings.floatThreads;
  }
  
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
		dlog("[START] getThreadID");
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
    dlog('Got thread id', _threadId);
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

    dlog('Got forum id', r);

  	return r;
  }
  
  // Get the current page number from the page links at the top of the page
  // Basically, fall back to 1 if we get a problem.
  function getTotalNumberOfPages() {
    var $dropdown = $('div.pages select');
    var pageTotal = $dropdown.find('option:last').val();

    window._salr_page_number_url = $dropdown.data('url') + '&pagenumber=1'
    dlog('Got total number of pages', pageTotal);

    return pageTotal;
  }
 
  function getPageNumber(loc) {
    dlog("[START] getPageNumber");

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

    dlog('Got page number', r);

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
      goToFirstPage();
    }, false);
  
    // previous page
    var prevPage = document.createElement('INPUT');
    prevPage.type = 'button';
    prevPage.value = '<';
    // prevPage.setAttribute('accesskey', 'p');
    prevPage.title = 'Go to previous page (^P)';
    if(this_page == 1) prevPage.disabled = true;
    else prevPage.addEventListener('click', function() { 
      goToPreviousPage();
    }, false);
   
    // next page
    var nextPage = document.createElement('INPUT');
    nextPage.type = 'button';
    nextPage.value = '>';
    // nextPage.setAttribute('accesskey', 'n');
    nextPage.title = 'Go to next page (^N)';
    if(this_page == total_pages) nextPage.disabled = true;
    else nextPage.addEventListener('click', function() { 
      goToNextPage();
    }, false);
 
    // last page
    var lastPage = document.createElement('INPUT');
    lastPage.type = 'button';
    lastPage.value = '>>';
    // lastPage.setAttribute('accesskey', 'l');
    lastPage.title = 'Go to last page (^L)';
    if(this_page == total_pages) lastPage.disabled = true;
    else lastPage.addEventListener('click', function() { 
      goToLastPage();
    }, false);

    // last seen post (@)
    var lastPostButton = document.createElement('INPUT');
    lastPostButton.type = 'button';
    lastPostButton.value = '@';
    // lastPostButton.setAttribute('accesskey', 'm');
    lastPostButton.title = 'Go to latest post (^M)';
    
    if(!is_thread_page) lastPostButton.disabled = true; // can't use on forum pages
    else lastPostButton.addEventListener('click', function() {
      reloadNewPosts();
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
      goToPage(Number(pageSelector.selectedIndex) + 1);
    }, false);

    wrapper.appendChild(firstPage);
    wrapper.appendChild(prevPage);
    wrapper.appendChild(pageSelector);
    wrapper.appendChild(lastPostButton);
    // wrapper.appendChild(forgetThreadButton);
    wrapper.appendChild(nextPage);
    wrapper.appendChild(lastPage);

    document.body.appendChild(wrapper);
  }
  
  function goToPage(page) {
    var total_pages = getTotalNumberOfPages();
    var page_url = window._salr_page_number_url;
    var this_page = Number(getPageNumber(location.href));
    var is_thread_page = (getPageType() == 'thread');

    // special handler for last page
    if(page == 'last') page = total_pages;
    if(page == 'first') page = 1;
    if(page == 'next') page = this_page + 1;
    if(page == 'previous') page = this_page - 1;

    if(this_page == page) return;
    if(page > total_pages) return;
    if(page < 1) return;
    
    document.location = page_url.replace(/pagenumber=(\d+)/, 'pagenumber=' + page);
  }
  
  function goToFirstPage() {
    goToPage(1);
  }
  
  function goToLastPage() {
    goToPage('last');
  }
  
  function goToNextPage() {
    goToPage('next');
  }
  
  function goToPreviousPage() {
    goToPage('previous');
  }
  
  function reloadNewPosts() {
    location.replace('showthread.php?threadid=' + getThreadID(location.href) + '&goto=newpost');
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
    // find the first unseen thread and store it, to use as an anchor for repositioning stuff later
    var first_unseen = $('tr.thread:not(.seen):first');

    var seen_threads = $('tr.thread.seen');

    var move_read = [], move_new = [];

    seen_threads.each(function() {
      var $thread = $(this);

      if($thread.has('div.lastseen a.count').length > 0) {
        // has new posts
        $thread.addClass('salr_seen');
        move_new.push(this);
      } else {
        // has no new posts
        $thread.addClass('salr_nonew');
        move_read.push(this);
      }
    });

    dlog('first unseen', first_unseen, first_unseen.innerText);
    
    if(move_seen_to_top) {
      for(var i in move_new) { $(move_new[i]).insertBefore(first_unseen) }
      for(var i in move_read) { $(move_read[i]).insertBefore(first_unseen) }
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
    dlog('Doing Last Read Stuff');
    
    // add the styles necessary for the page navigator
    addCSS('div.salr_page_navigator { position: fixed; right: 0px; bottom: 0px; background: #ddd; padding: 4px; border: 1px #888 solid; border-bottom: none; border-right: none; }');
    addCSS('div.salr_page_navigator.salr_page_navigator_fade { opacity: 0.3; }');
    addCSS('div.salr_page_navigator.salr_page_navigator_fade:hover { opacity: 1.0; }');

    if(do_styling_changes) {
      // new colors: (blue overlay)
      //   title:                                 c0defc      #E8F0F8
      //   icon icon2 star author views lastpost: ccdcec      #D4E1EE
      //   replies seen rating:                   beccdc      #C7D6E5
      // seen colors: (grey overlay)
      //   title:                                 d8dee4
      //   icon icon2 star author views lastpost: cdd3d9
      //   replies seen rating:                   c0c6cb

      addCSS('#forum tr.salr_seen td.title { background-color: #c0defc !important }');
      addCSS('#forum tr.salr_seen td.icon, #forum tr.salr_seen td.icon2, #forum tr.salr_seen td.star, #forum tr.salr_seen td.author, #forum tr.salr_seen td.views, #forum tr.salr_seen td.lastpost { background-color: #ccdcec !important; }');
      addCSS('#forum tr.salr_seen td.replies, #forum tr.salr_seen td.rating { background-color: #beccdc !important; }');

      addCSS('#forum tr.salr_nonew td.title { background-color: #d8dee4 !important }');
      addCSS('#forum tr.salr_nonew td.icon, #forum tr.salr_nonew td.icon2, #forum tr.salr_nonew td.star, #forum tr.salr_nonew td.author, #forum tr.salr_nonew td.views, #forum tr.salr_nonew td.lastpost { background-color: #cdd3d9 !important; }');
      addCSS('#forum tr.salr_nonew td.replies, #forum tr.salr_nonew td.rating { background-color: #c0c6cb !important; }');

      // seen posts, just the darker blue?
      // addCSS('table.post tr.seen1 td, table.post tr.seen2 td { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAABGdBTUEAANbY1E9YMgAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAXSURBVHjaYp555n8DEwMQjBLkEAABBgDpvwNmEODi1AAAAABJRU5ErkJggg==) !important; }');

      // last seen post
      // addCSS('table.post tr.salr_post_lastseen { border-bottom: 4px dodgerblue dashed !important; }');
    }

    // Hide images from read posts
    if(salr_hide_images_from_read_posts) addCSS('tr.seen1 td.postbody img.img, tr.seen2 td.postbody img.img, tr.seen1 td.postbody img.timg, tr.seen2 td.postbody img.timg { display: none; }');

    // run the important stuff
    if(enable_page_navigator) addPageNavigator();
    fixDropDown();

    // add no-new-posts class to seen ones
    if(do_styling_changes) {
      var page_type = getPageType();
      if(page_type == 'forum') markFullyReadThreads();
      if(page_type == 'thread') markLastSeen();
      if(enable_keyboard_nav) attachKeyboardNav();
    }
  }

  // Fix timg expansion in chrome
  // via https://github.com/scottferg/salr-chrome/commit/c729617316af9f5179921c771d106ea28fdb4dfc
  //
  // This is a hacked up one to not use jquery
  function fixTimg() {
    // add css
    addCSS(".timg-fix.squished { max-width: 200px; max-height: 170px; }");
    addCSS(".timg-fix.expanded { max-width: none; max-height: none; }");
    addCSS(".timg-fix.container { z-index: 5; position: relative; white-space: nowrap; height: 0px; }");
    addCSS(".timg-fix.note { z-index: 20;	opacity: 0.65; background-color: blue;  background-image:url('http://i.somethingawful.com/core/icon/fsilk/shape_move_backwards.png'); background-repeat:no-repeat; position:absolute; top:0; left:0; font-size:9px; color:#fff; padding:2px 6px; cursor:pointer; margin:11px 5px; margin-top: 1px; margin-left: 1px; padding-left:22px; background-position: 4px 0; border:1px #ccc dotted; }");
    addCSS(".timg-fix.note.expanded { background-image:url('http://i.somethingawful.com/core/icon/fsilk/shape_move_forwards.png'); }");
    
    jQuery('.postbody img.timg')
      .removeClass('timg peewee expanded loading complete')
      .removeAttr('width')
      .removeAttr('height')
      .removeAttr('border')
      .addClass('timg-fix squished');
      
    jQuery('img.timg-fix').each(function() {
      var me = jQuery(this);
      
      var div = jQuery('<DIV>')
                  .addClass('timg-fix note')
                  .text(this.naturalHeight + 'x' + this.naturalHeight)
                  .css('display', 'none')
                  .css('top', me.offset().top)
                  .css('left', me.offset().left)
                  .attr('title', 'Click to toggle size')
                  .click(function() { me.toggleClass('squished expanded'); jQuery(this).toggleClass('expanded'); })
                  .hover(function() { div.css('display', 'block'); }, function() { div.css('display', 'none'); });
      
      jQuery(this)
        .before(div)
        .hover(function() { div.css('display', 'block'); }, function() { div.css('display', 'none'); });
    });
    
    jQuery('img.squished').click(function(evt) {
      jQuery(this).toggleClass('squished expanded');
      jQuery(this).prev().toggleClass('expanded');
    });
  }
  
  // on domready
  // Fx+greasemonkey runs at the appropriate time
  if(typeof(safari) == 'undefined' && typeof(chrome) == 'undefined') {
    if(navigator.userAgent.match(/Gecko\//)) doLastReadStuff();
    else if(document.readyState == 'loaded' || document.readyState == 'complete') doLastReadStuff();
    else document.addEventListener('DOMContentLoaded', doLastReadStuff, false);
  }
})();
