var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-36762911-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var validTopicTab = false;
var xdaUtils = new XdaUtils();

// *********************************************************
// Entry Point
// *********************************************************

chrome.extension.onMessage.addListener(
		function(request, sender, sendResponse) {

			if (request.method == "getXdaTopic"){
				console.log("Received Message From Gallery Detail: " + request.method);
				console.log("For tabId " + request.tabId);

				chrome.tabs.get(request.tabId,
					function(tab){
						var xdaTopic = xdaUtils.getTopicFromUrl(tab.url);
						sendResponse({xdaTopic: xdaTopic})
					}
				);

				// Return to let sender know we received the request
				return(true);
			}
		}
	);

chrome.browserAction.onClicked.addListener(
		function(tab){
			if(validTopicTab){
				chrome.tabs.create(
					{
						'url': chrome.extension.getURL('/views/galleryDetail.html'),
						openerTabId: tab.id
					}
				);
			}
		}
	);

// *********************************************************
// Add listeners for tab actions to change URL for XDA topic
// *********************************************************
chrome.tabs.onUpdated.addListener(
	function(tabId, changeInfo, tab) {
		checkIfTabIsValidTopic(tab.url);
	}
);

chrome.tabs.onActivated.addListener(
	function(activeInfo){
		chrome.tabs.get(activeInfo.tabId,
			function(tab){
				checkIfTabIsValidTopic(tab.url);
			}
		);
	}
);

function checkIfTabIsValidTopic(url){
	if(url != null){
		if(xdaUtils.isValidTopicUrl(url)){
			validTopicTab = true;
			chrome.browserAction.setIcon({path: "/images/icon.png"});
		} else {
			validTopicTab = false;
			chrome.browserAction.setIcon({path: "/images/icon-disabled.png"});
		}
	}
	return validTopicTab;
}
