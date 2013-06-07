// Ajaxify
// v1.0.1 - 30 September, 2012
// https://github.com/browserstate/ajaxify
var Ajaxify = function(params) {

	// Default values
	var params_reference = {
		content_selector: '#content,article:first,.article:first,.post:first',
		menu_selector: '#menu,#nav,nav:first,.nav:first',
		additional_contents: [],
		scroll_duration: 800,
		scroll_easing: 'swing',
		fade_duration: 800,
		fade_in: false,
		callback: function() {}
	},
	object = this;

	// Constructor(all params are optional)
	$.each(params_reference, function(param, default_value) {

		if(typeof params !== 'undefined' && typeof params[param] !== 'undefined') {

			object[param] = params[param];

		} else {

			object[param] = default_value;

		}
		
	});

	// Type check
	if( Object.prototype.toString.call( additional_contents ) !== '[object Array]' ) {
	    throw new Error('Ajaxify: additional_contents parameter needs to be an array. You can pass an empty array []');
	}

	// Init
	(function(window,undefined){
		
		// Prepare our Variables
		var
			History = window.History,
			$ = window.jQuery,
			document = window.document;

		// Check to see if History.js is enabled for our Browser
		if ( !History.enabled ) {
			return false;
		}

		// Wait for Document
		$(function(){
			// Prepare Variables
			var
				/* Application Specific Variables */
				contentSelector = content_selector,
				$content = $(contentSelector).filter(':first'),
				contentNode = $content.get(0),
				$menu = $(menu_selector).filter(':first'),
				activeClass = 'active selected current youarehere',
				activeSelector = '.active,.selected,.current,.youarehere',
				menuChildrenSelector = '> li,> ul > li',
				completedEventName = 'statechangecomplete',
				/* Application Generic Variables */
				$window = $(window),
				$body = $(document.body),
				rootUrl = History.getRootUrl(),
				scrollOptions = {
					duration: scroll_duration,
					easing: scroll_easing
				};
			
			// Ensure Content
			if ( $content.length === 0 ) {
				$content = $body;
			}
			
			// Internal Helper
			$.expr[':'].internal = function(obj, index, meta, stack){
				// Prepare
				var
					$this = $(obj),
					url = $this.attr('href')||'',
					isInternalLink;
				
				// Check link
				isInternalLink = url.substring(0,rootUrl.length) === rootUrl || url.indexOf(':') === -1;
				
				// Ignore or Keep
				return isInternalLink;
			};
			
			// HTML Helper
			var documentHtml = function(html){
				// Prepare
				var result = String(html)
					.replace(/<\!DOCTYPE[^>]*>/i, '')
					.replace(/<(html|head|body|title|meta|script)([\s\>])/gi,'<div class="document-$1"$2')
					.replace(/<\/(html|head|body|title|meta|script)\>/gi,'</div>')
				;
				
				// Return
				return $.trim(result);
			};
			
			// Ajaxify Helper
			$.fn.ajaxify = function(){
				// Prepare
				var $this = $(this);
				
				// Ajaxify
				$this.find('a:internal:not(.no-ajaxy)').click(function(event){
					// Prepare
					var
						$this = $(this),
						url = $this.attr('href'),
						title = $this.attr('title')||null;
					
					// Continue as normal for cmd clicks etc
					if ( event.which == 2 || event.metaKey ) { return true; }
					
					// Ajaxify this link
					History.pushState(null,title,url);
					event.preventDefault();
					return false;
				});
				
				// Chain
				return $this;
			};
			
			// Ajaxify our Internal Links
			$body.ajaxify();
			
			// Hook into State Changes
			$window.bind('statechange',function(){
				// Prepare Variables
				var
					State = History.getState(),
					url = State.url,
					relativeUrl = url.replace(rootUrl,'');

				// Set Loading
				$body.addClass('loading');

				// Start Fade Out
				// Animating to opacity to 0 still keeps the element's height intact
				// Which prevents that annoying pop bang issue when loading in new content
				$content.animate({opacity:0},fade_duration);
				
				// Ajax Request the Traditional Page
				$.ajax({
					url: url,
					success: function(data, textStatus, jqXHR){
						// Prepare
						var
							$data = $(documentHtml(data)),
							$dataBody = $data.find('.document-body:first'),
							$dataContent = $dataBody.find(contentSelector).filter(':first'),
							title = $data.find('.document-title:first').text(),
							$menuChildren, contentHtml, $scripts;
						
						// Fetch the scripts
						$scripts = $dataContent.find('.document-script');
						if ( $scripts.length ) {
							$scripts.detach();
						}

						// Fetch the content
						contentHtml = $dataContent.html()||$data.html();
						if ( !contentHtml ) {
							document.location.href = url;
							return false;
						}
						
						// Update the menu
						$menuChildren = $menu.find(menuChildrenSelector);
						$menuChildren.filter(activeSelector).removeClass(activeClass);
						$menuChildren = $menuChildren.has('a[href^="'+relativeUrl+'"],a[href^="/'+relativeUrl+'"],a[href^="'+url+'"]');
						if ( $menuChildren.length === 1 ) { $menuChildren.addClass(activeClass); }

						// Update the content
						$content.stop(true,true);

						if(fade_in === true) {

							$content.html(contentHtml).ajaxify().css('opacity',100).fadeIn();

							if(additional_contents.length > 0) {

								for (var i = additional_contents.length - 1; i >= 0; i--) {

									if($(additional_contents[i]).length && $dataBody.find(additional_contents[i]).length) {

										$(additional_contents[i]).html($dataBody.find(additional_contents[i]).html()).ajaxify().css('opacity',100).fadeIn();

									}

								};

							}

						} else {

							$content.html(contentHtml).ajaxify().css('opacity',100).show();

							if(additional_contents.length > 0) {

								for (var i = additional_contents.length - 1; i >= 0; i--) {

									if($(additional_contents[i]).length && $dataBody.find(additional_contents[i]).length) {

										$(additional_contents[i]).html($dataBody.find(additional_contents[i]).html()).ajaxify().css('opacity',100).show();

									}

								};

							}

						}

						// Update the title
						document.title = title;
						try {
							document.getElementsByTagName('title')[0].innerHTML = document.title.replace('<','&lt;').replace('>','&gt;').replace(' & ',' &amp; ');
						}
						catch ( Exception ) { }
						
						// Add the scripts
						$scripts.each(function(){
							var $script = $(this), scriptText = $script.text(), scriptNode = document.createElement('script');
							if ( $script.attr('src') ) {
								if ( !$script[0].async ) { scriptNode.async = false; }
								scriptNode.src = $script.attr('src');
							}
	    						scriptNode.appendChild(document.createTextNode(scriptText));
							contentNode.appendChild(scriptNode);
						});

						// Complete the change
						if ( $body.ScrollTo||false ) { $body.ScrollTo(scrollOptions); } /* http://balupton.com/projects/jquery-scrollto */
						$body.removeClass('loading');
						$window.trigger(completedEventName);
		
						// Inform Google Analytics of the change
						if ( typeof window._gaq !== 'undefined' ) {
							window._gaq.push(['_trackPageview', relativeUrl]);
						}

						// Inform ReInvigorate of a state change
						if ( typeof window.reinvigorate !== 'undefined' && typeof window.reinvigorate.ajax_track !== 'undefined' ) {
							reinvigorate.ajax_track(url);
							// ^ we use the full url here as that is what reinvigorate supports
						}

						if( typeof callback !== 'undefined' && typeof callback === 'function' ) {
							callback(relativeUrl, url, title);
							// callback passing relative url, absolute url and title
						}
					},
					error: function(jqXHR, textStatus, errorThrown){
						document.location.href = url;
						return false;
					}
				}); // end ajax

			}); // end onStateChange

		}); // end onDomLoad

	})(window); // end closure

};