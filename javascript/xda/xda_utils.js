function XdaUtils(){
    var self = this;

    this.topicUrlRegex = /(http:\/\/forum.xda-developers.com\/showthread.php)\?t=(\d+)(?:.*&page=(\d+))*/g;
    this.validTopicUrl = "http://forum.xda-developers.com/showthread.php?t=";
}

// Given a url will return true if it is an XDA topic which this extension
// can work against
XdaUtils.prototype.isValidTopicUrl = function (url) {
    return url.indexOf(this.validTopicUrl) > -1;
};

// Returns an XDA Topic object containing all needed information of a topic
// based on a url
XdaUtils.prototype.getTopicFromUrl = function (url, callback) {

    var that = this;
    // First we fetch the page and see if we can extract the title and last page:
    // Detect the last page of the thread
    this.getTopicLastPageAndTitle(url, function(topicTitleAndLastPage){
        if(topicTitleAndLastPage && topicTitleAndLastPage.title && topicTitleAndLastPage.lastPage){

            // Given URL containing a topic and page:
            //      http://forum.xda-developers.com/showthread.php?t=112233&blah=4&page=443&h=1)
            // url: http://forum.xda-developers.com/showthread.php?t=112233
            // Topic ID: 112233
            // Page: 443
            var matchSets = that.topicUrlRegex.exec(url);

            // Ugly hack to beat a race condition when trying to parse two URLs
            // in quick succession
            if(!matchSets){
                matchSets = that.topicUrlRegex.exec(url);
            }

            if(matchSets && matchSets.length > 1){

                var xdaTopic = {
                    url: matchSets[1] + "?t=" + matchSets[2],
                    title: topicTitleAndLastPage.title,
                    topicId: matchSets[2],
                    topicPage: matchSets[3] || "1",
                    lastPage: topicTitleAndLastPage.lastPage
                };

                callback(xdaTopic);
            }else{
                console.log("Error running regex against url: " + url);
                callback(null);
            }
        }else{
            // If we couldn't find the title and lastpage the return null
            console.log("Error finding topic title and last page");
            callback(null);
        }
    });


};

// Fetches the first page of topic and looks for the anchor with rel="last" attribute
// then kicks off the start of image fetching; we need to know the last page prior to
// fetching
XdaUtils.prototype.getTopicLastPageAndTitle = function (url, callback) {
    console.log("Detecting topic title and max pages for thread at: " + url);

    var that = this;
    $.ajax({
        url: url,

        success: function(data){

            data = that.cleanHtml(data);

            // Try to grab the thread title from the doc
            var title = $(data).find('#breadcrumb span:last');
            if(title){
                title = $(title).text().trim();
            }else{
                title = "Click here to view original thread in new tab...";
            }

            var urlSearchParamForPage = "page=";
            var lastPage;

            // First see if the lastpage is defined in a "Last Page" anchor
            var lastPageAnchor = $(data).find(".pagenavControls a[rel='last']");
            if(lastPageAnchor.length > 0 ){
                var url = lastPageAnchor[0].href;
                lastPage = url.substr(url.indexOf(urlSearchParamForPage) + urlSearchParamForPage.length);
            // If not then look in the other tag
            }else{
                var pageControls = $(data).find(".pagenavControls td span small strong");
                if(pageControls && pageControls[1]){
                    lastPage = pageControls[1].innerText;
                }
            }

            // At this point if we haven't found an element with the last page
            // then assume there is only one page in the topic
            if(!lastPage){
                lastPage = 1;
            }

                lastPage = $.trim(lastPage);

            // If we found a page number then set; otherwise display error
            if(!isNaN(lastPage)){
                console.log("Last Page found in topic: " + lastPage);

                var topicTitleAndLastPage = {
                    title: title,
                    lastPage: lastPage
                };

                callback(topicTitleAndLastPage);
            }else{
                console.log("Error finding last page of topic, cannot continue");
                callback(null);
            }
        },

        error: function(data){
            console.log("Error getting max pages for url: " + url);
            callback(null);
        }

    });
};

// jQuery will use the browser to parse html; which causes resources to be loaded in the background
// here we strip out script and style tags; then we change img 'src' to 'data-src' to stop from
// trying to resolve images and download them when parsing.
XdaUtils.prototype.cleanHtml = function (html) {
    var scriptRegex = new RegExp("<script(.+?)</script>", "g");
    var styleRegex = new RegExp("<link(.+?)/>", "g");

    var htmlDocStripped = html.replace(scriptRegex, '');
    htmlDocStripped = htmlDocStripped.replace(styleRegex, '');

    htmlDocStripped = htmlDocStripped.replace(/<img([^>]*)\ssrc=/gi, '<img$1 data-src=');
    return htmlDocStripped;
};

