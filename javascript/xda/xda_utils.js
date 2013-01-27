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
XdaUtils.prototype.getTopicFromUrl = function (url) {

    // Given URL containing a topic and page:
    //      http://forum.xda-developers.com/showthread.php?t=112233&blah=4&page=443&h=1)
    // url: http://forum.xda-developers.com/showthread.php?t=112233
    // Topic ID: 112233
    // Page: 443
    var matchSets = this.topicUrlRegex.exec(url);

    // Ugly hack to beat a race condition when trying to parse two URLs
    // in quick succession
    if(!matchSets){
        matchSets = this.topicUrlRegex.exec(url);
    }

    if(matchSets && matchSets.length > 1){

        var xdaTopic = {
            url: matchSets[1] + "?t=" + matchSets[2],
            topicId: matchSets[2],
            topicPage: matchSets[3] || "1"
        };

        return xdaTopic;
    }else{
        console.log("Error running regex against url: " + url);
    }

};

//Fetches the first page of topic and looks for the anchor with rel="last" attribute
//then kicks off the start of image fetching, we need to know the last page prior to
//fetching
XdaUtils.prototype.getTopicLastPageNum = function (url, callback) {
    console.log("Detecting max pages for thread at: " + url);

    // TODO: Need to look how instance and 'this' works
    var instance = this;
    $.ajax({
        url:url,

        success:function (data) {

            data = this.cleanHtml(data);

            var urlSearchParamForPage = "page=";
            var lastPage;

            // First see if the last page is defined in a "Last Page" anchor
            var lastPageAnchor = $(data).find(".pagenavControls a[rel='last']");
            if (lastPageAnchor.length > 0) {
                var url = lastPageAnchor[0].href;
                lastPage = url.substr(url.indexOf(urlSearchParamForPage) + urlSearchParamForPage.length);
                // If not then look in the other tag
            } else {
                var pageControls = $(data).find(".pagenavControls td span small strong");
                lastPage = pageControls[1].innerText;
            }

            if (lastPage) {
                lastPage = $.trim(lastPage);

                // If we found a page number then set, otherwise display error
                if (!isNaN(lastPage)) {
                    console.log("Last Page found in topic: " + lastPage);

                    instance.lastPage = lastPage;
                    callback(true);
                } else {
                    instance.displayError("Error finding last page of topic, cannot continue");
                    callback(false);
                }
            }
        }
    });
};

