/*
 * Author: Ara Yapejian
 * Credits:
 *      ImagesLoaded: For detecting when fetched images are done loading
 *      Masonry: For great gallery image layout
 *      Colorbox: Displaying images in lightbox
 */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-36762911-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();



function XdaGalleryThread(callback){
    var that = this;

    this.loggingEnabled = false;
    this.debug = false;

    this.currentXdaThread = null;
    this.currentPage = 1;
    this.lastPage = 1;

    this.numberOfBatchFetchRequest = 1;
    this.minImagesToLoad = 15;
    this.currentImageSet = [];
    this.isColorBoxShowing = false;
    this.isLoading = false;
    this.isLoadingAdditionalPages = false;

    // HTML Elements
    this.$imageContainer = null;
    this.$loadingBar = null;

    this.isMasonryInitialized = false;

    chrome.storage.sync.get("options", function(items){
        var options = items.options;
        if(options){
            that.debug = options['debugMode'].value;
            that.loggingEnabled = options['debugMode'].value;

            var imagesToFetch = options['imagesToFetch'].value;
            if( imagesToFetch >= 10 && imagesToFetch <= 50){
                that.minImagesToLoad = imagesToFetch;
            }
        }

        callback();
    });
    // TODO: Fetch options from chrome.storage.sync.get('options',callback) and
}


// Set the xdaThread for the current display of the GalleryDetail page
XdaGalleryThread.prototype.setXdaTopic = function (xdaTopic) {
    this.currentXdaThread = xdaTopic;
    this.currentPage = xdaTopic.topicPage;

    this.setupGalleryHeader();
};

// Set the Gallery Detail header to contain relevant information
XdaGalleryThread.prototype.setupGalleryHeader = function (myXdaTopic) {

    var xdaTopic = myXdaTopic || this.currentXdaThread;

    var html = "<a target='_blank' href='" + xdaTopic.url + "' xdaTopicId='" + xdaTopic.topicId + "' >" + xdaTopic.title + "</a>";
    $("#topicName").html(html);
};

// Refresh the current gallery page
XdaGalleryThread.prototype.refresh = function () {
    this.renderImagesForTopic("1797072", this.currentPage);
    renderImagesForTopic(this.currentXdaThread.topicId, this.currentPage);
};

// Next Gallery Page
XdaGalleryThread.prototype.nextPage = function () {
    if(this.currentPage < this.currentXdaThread.lastPage){
        this.currentPage++;
        this.renderImagesForTopic(this.currentXdaThread.topicId, this.currentPage);
    }
};

// Previous Gallery Page
XdaGalleryThread.prototype.previousPage = function () {
    if(this.currentPage > 2){
        this.currentPage--;
        this.renderImagesForTopic(this.currentXdaThread.topicId, this.currentPage);
    }
};

// Show or hide loading indicator.  Only show if we're loading the first page.
XdaGalleryThread.prototype.setLoadingIndicator = function (isLoading) {

    if(isLoading && !this.isLoadingAdditionalPages){
        this.isLoading = true;
        if(this.$loadingBar){
            this.$loadingBar.slideDown(500);
        }

    }else if(!isLoading){
        this.isLoading = false;
        if(this.$loadingBar){
            this.$loadingBar.slideUp(500);
        }
    }
};

// Kicks off the collection of images starting at the given page number,
// stops when we have reached our minium number of images or have reached
// the last page.  Will also load all images on a page regardless of minimum,
// for instance, if our minimum num images is 10 and the first page had 5 images
// and next page had 15 images, 20 images will be loaded to ensure we get them all
XdaGalleryThread.prototype.renderImagesForTopic = function (topicId, pageNum) {
    this.log("Fetching images for topic id " + topicId + " and page number " + pageNum, "INFO");
    this.$loadingBar.html("Fetching images for thread page: " + pageNum);

    var url = this.currentXdaThread.url;
    url += "&page=" + pageNum;

    this.setLoadingIndicator(true);
    this.isLoadingAdditionalPages = true;

    var that = this;
    // Fetch the HTML doc for parsing
    $.ajax({url: url, async: true}).done(function(data){
        that.renderImagesForTopic_Complete(data, pageNum);
    });
};

XdaGalleryThread.prototype.renderImagesForTopic_Complete = function (data, pageNum) {
	var that = this;

    // Strip the html doc of script and style tags; and convert img src to data-src attribute
    data = this.cleanHtml(data);

    var images = this.getAllImages(data);
    that.log("Found " + images.length + " images on page " + pageNum, "DEBUG");

    // Will be null on first initiations of fetching more images
    // reset to null again after hitting our min images or last page
    if(this.currentImageSet.length === 0){
        this.currentImageSet = images;
    }else{
        $.merge(this.currentImageSet, images);
    }

    // Logic to keep fetching pages until minimum number of
    // images are loaded or we've hit last page
    if(this.currentImageSet.length < this.minImagesToLoad && this.currentPage < this.currentXdaThread.lastPage){
        that.log("Currently fetched " + this.currentImageSet.length + " images; looking for more on next page.", "DEBUG");

        this.nextPage();

    // We've reached the last page
    } else if(this.currentPage > this.currentXdaThread.lastPage){
        this.showThreadEndIndicator(true);
    } else {
        // Recursion will cause this to get executed for all additional pages; so we set this to only
        // allow the method that comes here to set this to false since we're done; and block other
        // recursions from entering( Don't like this; should look again later )
        if(this.isLoadingAdditionalPages){
            that.log("*** Done fetching this batch. Loading " + this.currentImageSet.length + " images ***", "INFO");

            // If we got here and have less images then our current minimum then there are not more
            // pages on the thread to fetch
            if(this.currentImageSet.length < this.minImagesToLoad){
                this.showThreadEndIndicator(true);
            }

            var html = this.generateHtml(this.currentImageSet);
            this.currentImageSet = [];

            // Hide the images so they don't appear before
            // imagesLoaded known their ready, then we'll show
            var $html = $(html).hide();
            this.$imageContainer.append($html);

           this.watchImageProgress($html);
        }
    }
};

XdaGalleryThread.prototype.watchImageProgress = function ($html) {
	var that = this;
	var $myHtml = $html;

	var dfd = this.$imageContainer.imagesLoaded({
		progress: function (isBroken, $images, $proper, $broken) {
            that.log("imagesLoaded 'Progress' Fired", "DEBUG");

			if(isBroken){
                this.parents('li').addClass("image-broken");
				this.siblings(".image-broken").show();
			}
		}
	});

    dfd.done(function(){
        that.log("imagesLoaded 'Done' Fired", "DEBUG");
    });

    dfd.always( function(){
        that.log("imagesLoaded 'Always' Fired", "DEBUG");
        // Show the images now that their down loading
        $myHtml.show();

        if(that.isMasonryInitialized){
            that.$imageContainer.masonry('appended', $myHtml, true);
        }else{
            that.$imageContainer.masonry({
                item:    '.item',
                isFitWidth:     true,
                columnWidth:    function( containerWidth ) {
                    return containerWidth / 5;
                }
            });
            that.isMasonryInitialized = true;
        }

        that.isLoadingAdditionalPages = false;
        that.setLoadingIndicator(false);
    });
};


// This generates the html surrounding each image to be injected when fetching new images
XdaGalleryThread.prototype.generateHtml = function (images) {
    var html = "";
    var length = images.length;
    for(var x = 0; x < length; x++){
        var imageHtml = "<li class='item'>";
        imageHtml += "<img src='" + images[x].src + "' />";

        imageHtml += "<div class='postInfo'>";
        imageHtml += "  <a id='postLink' target='_newtab' href='" + images[x].postLink + "'>View Post</a> -- ";
        imageHtml += "  <a id='topicPageLink' target='_newtab' href='" + this.currentXdaThread.url + "&page=" + images[x].topicPage + "'>Page " + images[x].topicPage + "</a>";
        imageHtml += "</div>";
        imageHtml += "<span class='image-loading'></span><span class='image-broken'>";
        imageHtml += "</li>";

        html += imageHtml;
    }

    return html;
};

// Append a thread ending indicator to the page
XdaGalleryThread.prototype.showThreadEndIndicator = function (showIndicator) {
    this.setLoadingIndicator(false);
    if(showIndicator){
        $("#threadEndingIndicator").show();
    }else{
        $("#threadEndingIndicator").hide();
    }
};

// jQuery will use the browser to parse html; which causes resources to be loaded in the background
// here we strip out script and style tags; then we change img 'src' to 'data-src' to stop from
// trying to resolve images and download them when parsing.
XdaGalleryThread.prototype.cleanHtml = function (html) {
    var scriptRegex = new RegExp("<script(.+?)</script>", "g");
    var styleRegex = new RegExp("<link(.+?)/>", "g");

    var htmlDocStripped = html.replace(scriptRegex, '');
    htmlDocStripped = htmlDocStripped.replace(styleRegex, '');

    htmlDocStripped = htmlDocStripped.replace(/<img([^>]*)\ssrc=/gi, '<img$1 data-src=');
    return htmlDocStripped;
};

XdaGalleryThread.prototype.getAllImages = function (htmlDoc) {
    var xdaImages = [];

    var allImages = $(htmlDoc).find("img.thumbnail");
    var postContentImages = $(htmlDoc).find("td.postContent img");

    $.merge(allImages, postContentImages);

    // Since XDA uses relative links; sanitize the URLs
    // ( Browser will try to put extension in the URL since relative )
    var length = allImages.length;
    for(var x = 0; x < length; x++){
        var currentImage = allImages[x];
        var hasThumbnail = false;
        var thumbnailSrc = null;

        // Weed out post signiture images; and other non relevants
        if(this.isValidImage(currentImage)){
            var imageSrc = currentImage.attributes.getNamedItem("data-src").nodeValue;


            if(!(/http(s?)/.test(imageSrc))){
                imageSrc = imageSrc.substr(imageSrc.indexOf("attach"));
                imageSrc = "http://forum.xda-developers.com/" + imageSrc;
            }

            if((imageSrc.indexOf("&stc=1") > -1 ) || (imageSrc.indexOf("&thumb=1") > -1)){
                thumbnailSrc = imageSrc;
                hasThumbnail = true;

                // Remove the lightbox query parameters
                imageSrc = imageSrc.replace("&stc=1", "");
                imageSrc = imageSrc.replace("&thumb=1", "");
            }

            // Find the direct Topic post link
            var postLink = $(currentImage).parents("div.page");
            postLink = $(postLink).find("a.postCount");
            postLink = postLink[0].href;
            postLink = postLink.substr(postLink.indexOf("showpost"));
            postLink = "http://forum.xda-developers.com/" + postLink;

            var image = {
                    postLink: postLink,
                    topicPage: this.currentPage,
                    src: imageSrc,
                    hasThumbnail: hasThumbnail,
                    thumbnailSrc: thumbnailSrc
            };
            xdaImages.push(image);
        }
    }
    return xdaImages;
};

// Validates a given image tag for things like emoticons and
// signiture images
XdaGalleryThread.prototype.isValidImage = function (imageTag) {
    var validImage = true;

    // If images is within postsig div then exclude
    if($(imageTag).parents(".postsig").length > 0){
        validImage = false;
    }

    // Emoticons
    if(imageTag.className == "inlineimg"){
        validImage = false;
    }

    return validImage;
};

XdaGalleryThread.prototype.onScroll = function (event) {
    if(!this.isLoading && !this.isLoadingAdditionalPages && !this.isColorBoxShowing){

        var closeToBottom = ($(window).scrollTop() + $(window).height() > $(document).height() - 300);

        if(closeToBottom) {

            var currentXdaThread = this.currentXdaThread;

            if(currentXdaThread){
                if(this.currentPage < this.currentXdaThread.lastPage){
                    var topicName = currentXdaThread.title || "XDA Thread Unknown";
                    this.log("*** Fetching new batch of images starting on page " + this.currentPage + 1 + " (Batch Request #" + (this.numberOfBatchFetchRequest + 1) + ")", "INFO");
                    this.trackEvent("Fetch Images", "Number of requests this session: " + this.numberOfBatchFetchRequest++);
                    this.nextPage();
                }
            }
        }
    }
};

XdaGalleryThread.prototype.trackEvent = function (category, action, label) {
    if(!this.debug){
        if(category && action){
            if(label){
                this.log("Tracking Event: Category: " + category + "; Action: " + action + "; Label: " + label, "DEBUG");
                _gaq.push(['_trackEvent', category, action, label]);
            }else{
                this.log("Tracking Event: Category: " + category + "; Action: " + action, "DEBUG");
                _gaq.push(['_trackEvent', category, action]);
            }
        }else{
            this.log("Can't track event. Category or action is null", "ERROR");
        }
    }
};

/**
 * Logs a message baseed on severity
 * @param  {[STRING]} message  Message to log
 * @param  {[STRING]} severity ERROR, WARN, INFO, DEBUG or null ( null defaults to console.log)
 */
XdaGalleryThread.prototype.log = function (message, severity) {
    if(this.loggingEnabled){
        if(severity){
            if(severity == "ERROR"){
                console.error(message);
            }else if(severity == "WARN"){
                console.warn(message);
            }else if(severity == "INFO"){
                console.info(message);
            }else if(severity == "DEBUG"){
                if(this.debug){
                    console.debug(message);
                }
            }else{
                console.log(message);
            }
        }else{
            console.log(message);
        }
    }
};

XdaGalleryThread.prototype.displayError = function (errorMessage) {
    this.setLoadingIndicator(false);
    this.log(errorMessage, "ERROR");
    $("#debugDetails span").html(errorMessage);
    $("#debugDetails").addClass("error");
    $("#debugInfo").slideDown();
};

XdaGalleryThread.prototype.hideError = function () {
    $("#debugInfo").slideUp(function(){
        $("#debugDetails").removeClass("error");
    });
};


// Get the current tab of this gallery; and request the xda gallery info from
// the XDA tab that this was opened from
XdaGalleryThread.prototype.fetchXdaTopicFromExtensionBackground = function () {
    var that = this;
    chrome.tabs.query({active: true, currentWindow: true},
        function(tabs){

            if(tabs && tabs[0].openerTabId){
                chrome.extension.sendMessage(
                    {
                        method: "getXdaTopic",
                        tabId: tabs[0].openerTabId
                    },
                    function(response){
                        if(response.xdaTopic){
                            that.log("Received XDA Topic from extension", "DEBUG");

                            that.initGallery(response.xdaTopic);

                        } else {
                            that.displayError("Error fetching XDA Topic from extension");
                        }
                    }
                );
            }else{
                that.displayError("Error finding thread. If you are trying to refresh this page please close the tab and relaunch from the XDA Topic instead.");
            }
        }
    );
};

XdaGalleryThread.prototype.initGallery = function (xdaTopic) {
    this.trackEvent("Gallery Tab Opened", xdaTopic.title, xdaTopic.url);

	this.$imageContainer = $("#xdaGalleryContent");
    this.$loadingBar = $("#loadingBar");
    this.setXdaTopic(xdaTopic);
    this.setupGlobalEventBindings();
    this.setupImageEventBindings();

    this.log("*** Fetching new batch of images starting on page " + this.currentPage + "(Batch Request #" + this.numberOfBatchFetchRequest + ")", "INFO");
    this.renderImagesForTopic(this.currentXdaThread.topicId, this.currentPage);
};

XdaGalleryThread.prototype.setupGlobalEventBindings = function () {
    var that = this;

    // When Colorbox is opened set an indicator to pause the fetching of more images if open
    $(document).bind('cbox_open', function(){
        // This should effectivly disable scorlling, indicator is a fallback
        $('html').css({overflow:'hidden'});
        that.isColorBoxShowing = true;
    });

    // When Colorbox is closed reset the indicator so scroll will function again
    $(document).bind('cbox_closed', function(){
        // This should effectivly re-enable scrolling
        $('html').css({overflow:'auto'});
        that.isColorBoxShowing = false;
    });


    // Fetch more images on scroll
    $(document).bind('scroll', $.proxy(that.onScroll, that));

    // Hide the debug/error messages on click
    $("#debugInfo").bind('click', $.proxy(that.hideError, that));

};
// Set the mouseenter, exit and click handlers for images
XdaGalleryThread.prototype.setupImageEventBindings = function () {
    var that = this;

    // Show colorbox of image on click
    // TODO: Enable 'rel' parameter to allow forward/backward ability
	this.$imageContainer.on('click', 'img', function( event ) {
        var $image = $(this);

        if($image){
            $image.colorbox({
                photo: true,
                href: $image.attr('src'),
                fixed: true,
                maxHeight: "100%",
                scalePhotos: true,
                scrolling: false
            });
        }
    });

    // Show/Hide hover info on each gallery item
	this.$imageContainer.on('mouseenter', '.item', function( event ) {
		$(this).addClass('item-hover');
	}).on('mouseleave', '.item', function( event ) {
		$(this).removeClass('item-hover');
	});

};

// ************************************************************************************************
// Event bindings and entry point for fetching the xdaTopic from the extension for the tab that
// opened this gallery detail tab.
// ************************************************************************************************
var xdaUtils = new XdaUtils();

$(document).ready(function(){
    var xdaGalleryThread = new XdaGalleryThread(function(){
        xdaGalleryThread.fetchXdaTopicFromExtensionBackground();
    });
});
