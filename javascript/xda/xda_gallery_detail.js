/*
 * Author: Ara Yapejian
 * Credits: Credit to Wookmark and imageLoaded plugin for gallery detail page
 *      Wookmark: https://github.com/GBKS/Wookmark-jQuery
 *      ImagesLoaded: https://github.com/desandro/imagesloaded
 */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-36762911-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();



function XdaGalleryThread(){
    this.debug = false;
    this.debugTopic = "http://forum.xda-developers.com/showthread.php?t=1416159";

    this.currentXdaThread = null;
    this.currentPage = 1;
    this.lastPage = 1;
    this.minImagesToLoad = 10;
    this.currentImageSet = [];
    this.isLoading = false;
    this.isLoadingAdditionalPages = false;
}


// Set the xdaThread for the current display of the GalleryDetail page
XdaGalleryThread.prototype.setXdaTopic = function (xdaTopic) {
    this.currentXdaThread = xdaTopic;
    this.currentPage = xdaTopic.topicPage;

    this.setupGalleryHeader();
};

// Set the Gallery Detail header to contain relevant information
XdaGalleryThread.prototype.setupGalleryHeader = function (xdaTopic) {

    var xdaTopic = xdaTopic || this.currentXdaThread;

    var html = "<a target='_blank' href='" + xdaTopic.url + "' >" + xdaTopic.title + "</a>";
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
        isLoading = true;

        var loaderDiv = $("#loaderIndicator");
        loaderDiv.css("position", "absolute");
        loaderDiv.css("top", Math.max(0, (($(window).height() - loaderDiv.outerHeight()) / 2) + $(window).scrollTop()) + "px");
        loaderDiv.css("left", Math.max(0, (($(window).width() - loaderDiv.outerWidth()) / 2) +  $(window).scrollLeft()) + "px");
        loaderDiv.show();
    }else{
        isLoading = false;
        $("#loaderIndicator").hide();
    }
};

 XdaGalleryThread.prototype.renderImagesForTopic = function (topicId, pageNum) {
    console.log("Fetching images for topic id " + topicId + " and page number " + pageNum);

    var url = this.currentXdaThread.url;
    url += "&page=" + pageNum;

    this.setLoadingIndicator(true);
    this.isLoadingAdditionalPages = true;

    // Fetch the HTML doc for parsing
    var data = $.ajax({url: url, async: false}).responseText;

    // Strip the html doc of script and style tags; and convert img src to data-src attribute
    data = this.cleanHtml(data);

    var images = this.getAllImages(data);
    console.log("Found " + images.length + " images on page " + pageNum);

    // Will be null on first initiations of fetching more images
    // reset to null again after hitting our min images or last page
    if(this.currentImageSet.length == 0){
        this.currentImageSet = images;
    }else{
        $.merge(this.currentImageSet, images);
    }

    // Logic to keep fetching pages until minimum number of
    // images are loaded or we've hit last page
    if(this.currentImageSet.length < this.minImagesToLoad && this.currentPage < this.currentXdaThread.lastPage){
        console.log("Currently fetched " + this.currentImageSet.length + " images; looking for more on next page");

        this.nextPage();
    } else {
        // Recursion will cause this to get executed for all additional pages; so we set this to only
        // allow the method that comes here to set this to false since we're done; and block other
        // recursions from entering( Don't like this; should look again later )
        if(this.isLoadingAdditionalPages){
            console.log("*** Done fetching this batch. Loading " + this.currentImageSet.length + " images ***");
            this.isLoadingAdditionalPages = false;

            this.setLoadingIndicator(false);

            var html = this.generateHtml(this.currentImageSet);
            this.currentImageSet = [];

            $("#xdaGalleryContent").append(html);
            $('#xdaGalleryContent').imagesLoaded(this.imagesDoneLoading());
        }
    }
};

// This generates the html surrounding each image to be injected when fetching new images
XdaGalleryThread.prototype.generateHtml = function (images) {
    var html = "";
    var length = images.length;
    for(var x = 0; x < length; x++){
        var imageHtml = "<li>";

        imageHtml += "<img src='" + images[x].src + "' ";

        // Need to force width and height since we don't know
        // them yet ( imageLoaded jquery plugin doesn't seem to
        // fire correctly )
        imageHtml += " width='300' height='400' />";

        imageHtml += "<div class='postInfo'>";
        imageHtml += "  <a id='postLink' target='_blank' href='" + images[x].postLink + "'>View Post</a>";
        imageHtml += "  <a id='topicPageLink' target='_blank' href='" + this.currentXdaThread.url + "&page=" + images[x].topicPage + "'>Page " + images[x].topicPage + "</a>";
        imageHtml += "</div>";
        imageHtml += "</li>";

        html += imageHtml;
    }

    return html;
};


XdaGalleryThread.prototype.imagesDoneLoading = function () {
      // Prepare layout options.
      var options = {
        autoResize: true, // This will auto-update the layout when the browser window is resized.
        container: $('#main'),
        offset: 2 // Optional; the distance between grid items
      };

      // Get a reference to your grid items.
      var handler = $('#xdaGalleryContent').find('li');

      // Call the layout function.
      handler.wookmark(options);

      // Handle any stuff we want to do for clicking the li
      handler.click(function(){
        // TODO: Put in handler to display full size on click
      });
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
    if(!this.isLoading){
        var closeToBottom = ($(window).scrollTop() + $(window).height() > $(document).height() - 300);
        if(closeToBottom) {
            _gaq.push(['_trackEvent', "Fetch Images - Scroll", 'clicked']);
            this.nextPage();
        }
    }
};

XdaGalleryThread.prototype.displayError = function (errorMessage) {
    this.setLoadingIndicator(false);
    $("#debugDetails span").html(errorMessage);
    $("#debugInfo").show();
};

XdaGalleryThread.prototype.hideError = function () {
        $("#debugInfo").hide();
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
                            console.log("Received XDA Topic from extension");

                            that.initGallery(response.xdaTopic);

                        } else {
                            that.displayError("Error fetching XDA Topic from extension");
                        }
                    }
                );
            }else{
                that.displayError("Error finding the current XDA Gallery tab");
            }
        }
    );
};

XdaGalleryThread.prototype.initGallery = function (xdaTopic) {

    this.setXdaTopic(xdaTopic);
    this.renderImagesForTopic(this.currentXdaThread.topicId, this.currentPage);
};


// ************************************************************************************************
// Event bindings and entry point for fetching the xdaTopic from the extension for the tab that
// opened this gallery detail tab.
// ************************************************************************************************
var xdaUtils = new XdaUtils();
var xdaGalleryThread = new XdaGalleryThread();

$(document).ready(function(){
    xdaGalleryThread.debug = false;

    // Debug - Thread with lots of images and pages
    xdaGalleryThread.debugTopic = "http://forum.xda-developers.com/showthread.php?t=1740482";

    // If we're debugging fetch and load the xdaTopic from the background js from
    // extension, otherwise load a test page
    if(!xdaGalleryThread.debug){
        xdaGalleryThread.setLoadingIndicator(true);
        xdaGalleryThread.fetchXdaTopicFromExtensionBackground();
    }else{
        xdaGalleryThread.displayError("Testing Error");
        xdaGalleryThread.initGallery(xdaUtils.getTopicFromUrl(xdaGalleryThread.debugTopic));
    }

     // Capture scroll event
    $(document).bind('scroll', $.proxy(xdaGalleryThread.onScroll, xdaGalleryThread));
    $("#debugInfo").bind('click', $.proxy(xdaGalleryThread.hideError, xdaGalleryThread));
});