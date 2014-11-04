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
 * Actions to Take Upon Clicking Page Action
 * ===============================================
 */
function downloadFunction(tabNumber){ 


    /** 
     * 1. Send message to content_script.js
     *    (1) Parse DOM for track metadata
     *    (2) Send back metadata
     * 2. Update filename in downloadSpecs
     * 3. Launch download dialog
     */

    // Step 1 -- Send Message
    chrome.tabs.sendMessage(
	tabNumber,  // ID of tab to send message to
	{sendBack: "trackDataJSON"},  // Request spec (listener in content script knows how to interpret)
	function(trackDataJSON) {

	    // Parse metadata out of stringified JSON
	    var d = JSON.parse(trackDataJSON);
	    console.log("Parsed Track Metadata");
	    console.log(d);

	    // Make Filename
	    var unsafeFilename = d.artistSummary +"_"+ d.songTitle +"_"+ d.albumTitle;
	    var filename = unsafeFilename.replace(/\s/g, "-").replace(filenameRegex,"") + ".m4a";

	    // Step 2 -- Update download specs
	    downloadSpecs.filename = filename;
	    console.log("Filename: "+ filename);

	});

    // Step 3 -- Initiate Download with updated specs
    chrome.downloads.download(downloadSpecs); 
}


/** 
 * ==============================================
 * Automatic Actions
 * ==============================================
 */ 

function pandoraWebRequestHandler(tabInfo, details){
    /**
     * Upon web request:
     *   1. Retrieve and sanitize track URL
     *   2. Update global download specs object
     *   3. Show page action icon
     */

    var trackURL = details.url.replace(userIDRegex, "$1$3");
    downloadSpecs.url = trackURL;
    chrome.pageAction.show(tabInfo.id);
}

function pandoraWebRequestAttachment(tabInfo){
    console.log("Pandora tab active: "+ tabInfo.active);
    console.log("Attaching webRequest listener for tab "+ tabInfo.id);
    console.log("------------------------------------------");
    
    // Attach the web request
    chrome.webRequest.onCompleted.addListener(
   	// Dispatch function --> Calls pandoraWebRequestHandler
   	function(details){ 
	    pandoraWebRequestHandler(tabInfo, details); 
	},
	// Filters
	{ "urls": ["http://*/access/?version=*&lid=*&token=*"],
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

// Page action onClick Listner
chrome.pageAction.onClicked.addListener(
    function (tabNumber){downloadFunction(tabNumber);}
);
