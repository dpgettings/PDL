// Make default console/window into those of background page
var backgroundPage = chrome.extension.getBackgroundPage();
var console = backgroundPage.console;
var window = backgroundPage.window;

var pandoraRegex = new RegExp("^(http[s]?:\\/\\/((.)*\\.))pandora.com");
var userIDRegex = /(^http.+version=4&lid=)(\d{8})(&token=.+$)/;
var filenameRegex = /[^A-Za-z0-9_-]/g;

var downloadSpecs = {url: "", filename: "", saveAs: true};

/**
 * ===============================================
 * Downloader Functions which should only be run once
 * ===============================================
 */
function downloadFunction(){ 
    console.log(downloadSpecs)
    chrome.downloads.download(downloadSpecs); 
}

chrome.pageAction.onClicked.addListener(
    function (tabNumber){downloadFunction();}
);


/** 
 * ==============================================
 * 
 * ==============================================
 */ 

function trackDownloadHandler(trackURL, filename, tabInfo){

    // Show page action
    chrome.pageAction.show(tabInfo.id);
    // Update global download specs
    downloadSpecs.url = trackURL;
    downloadSpecs.filename = filename;
}


function pandoraTrackHandler(trackURL, trackDataJSON, tabInfo){
    // Stuff to call when there is a matching xmlhttprequest
    console.log("Track URL: "+ trackURL);
    console.log("Track Metadata: ");
    console.log(trackDataJSON);

    // Parse metadata out of stringified JSON
    var d = JSON.parse(trackDataJSON);
    console.log(d);

    // Process filename to make Unix-safe
    var unsafeFilename = d.artistSummary +"_"+ d.songTitle +"_"+ d.albumTitle;
    var filename = unsafeFilename.replace(/\s/g, "-").replace(filenameRegex,"") + ".m4a";

    // Call function to  set up downloading file
    trackDownloadHandler(trackURL, filename, tabInfo);

}


function pandoraWebRequestHandler(tabInfo, details){

    // Step 1 -- Capture URL (and knock out lid)
    var trackURL = details.url.replace(userIDRegex, "$1$3");

    // Step 2 -- Get track details from content script
    chrome.tabs.sendMessage(
	tabInfo.id,  // ID of tab to send message to
	{sendBack: "trackDataJSON"},  // Request spec (listener in content script knows how to interpret)

	function(trackDataJSON) {
	    pandoraTrackHandler(trackURL, trackDataJSON, tabInfo);
	});
    
}

function pandoraWebRequestAttachment(tabInfo){
    console.log("Pandora tab active: "+ tabInfo.active);
    console.log("Attaching webRequest listener for tab "+ tabInfo.id);
    console.log("------------------------------------------");
    
    // Attach the web request
    chrome.webRequest.onCompleted.addListener(
   	// Dispatch function --> Calls pandoraWebRequestHandler
   	function(details){ pandoraWebRequestHandler(tabInfo, details); },
	{ "urls": ["http://*/access/?version=*&lid=*&token=*"],
   	  "types": ["other"], 
	  "tabId": tabInfo.id } 
    );
}


function tabCreatedWrapper(createdTabInfo) {

    // Flag to indicate we've already detected a tab navigating to Pandora
    //var alreadyUpdated = false;

    function tabUpdatedWrapper(tabId, changeInfo, tabInfo) {
	/**
	 * Listens for when a previously created Chrome tab navigates to Pandora, 
	 * then injects songscraper.js into the Pandora page.
	 */
	
	var tabUrl =  tabInfo.url;
	var tabStatus =  changeInfo.status;
	
	//if (pandoraRegex.test(tabUrl) && tabStatus==="complete" && (!alreadyUpdated)) {
	if (pandoraRegex.test(tabUrl) && tabStatus==="complete") {
	    pandoraWebRequestAttachment(tabInfo);
	    //alreadyUpdated = true;  // Reset flag indicating we've already updated
	}
    }
    
    // Attach tabUpdated listener to newly-created tab
    chrome.tabs.onUpdated.addListener(tabUpdatedWrapper);
}

// Listen for new tabs being created
chrome.tabs.onCreated.addListener(tabCreatedWrapper);
