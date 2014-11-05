// Make default console/window into those of background page
var backgroundPage = chrome.extension.getBackgroundPage();
var console = backgroundPage.console;
var window = backgroundPage.window;

// Pre-compilation of various regular expressions
var pdlRegex = new RegExp("^(http[s]?:\\/\\/((.)*\\.))pandora.com");
var userIDRegex = /(^http.+version=4&lid=)(\d{8})(&token=.+$)/;
var filenameRegex = /[^A-Za-z0-9_-]/g;

// Initial specs of file download
var downloadSpecs = {url: "", filename: "", saveAs: true};
//var downloadSpecs = {url: "", filename: "", saveAs: false};

/**
 * ===============================================
 * Actions to Take Upon Clicking Page Action
 * ===============================================
 */
function downloadFunction(tabDetails){ 

    /** 
     * 1. Send message to content_script.js
     *    (1) Parse DOM for track metadata
     *    (2) Send back metadata
     * 2. Update filename in downloadSpecs
     * 3. Launch download dialog
     */

    // Step 1 -- Send Message
    chrome.tabs.sendMessage(
	tabDetails.id,  // ID of tab to send message to
	{sendBack: "trackDataJSON"},  // Request spec (listener in content script knows how to interpret)
	function(trackDataJSON) {

	    // Parse metadata out of stringified JSON
	    var d = JSON.parse(trackDataJSON);

	    // Make Filename
	    var unsafeFilename = d.artistSummary +"_"+ d.songTitle +"_"+ d.albumTitle;
	    var filename = unsafeFilename.replace(/\s/g, "-").replace(filenameRegex,"") + ".m4a";

	    // Step 2 -- Update download specs
	    downloadSpecs.filename = filename;

	    // Step 3 -- Initiate Download with updated specs
	    chrome.downloads.download(downloadSpecs); 
	});
}


/** 
 * ==============================================
 * Automatic Actions
 * ==============================================
 */ 

function pdlWebRequestHandler(tabInfo, details){
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

function pdlWebRequestAttachment(tabInfo){

    // Attach the web request
    chrome.webRequest.onCompleted.addListener(
   	// Dispatch function --> Calls pdlWebRequestHandler
   	function(details){ 
	    pdlWebRequestHandler(tabInfo, details); 
	},
	// Filters
	{ "urls": ["http://*/access/?version=*&lid=*&token=*"],
	  "tabId": tabInfo.id } 
    );
}


function tabCreatedWrapper(createdTabInfo) {

    function tabUpdatedWrapper(tabId, changeInfo, tabInfo) {
	/**
	 * Listens for when a previously created Chrome tab navigates to Pdl
	 * then attaches webRequest listener
	 */
	var tabUrl =  tabInfo.url;
	var tabStatus =  changeInfo.status;
	
	if (pdlRegex.test(tabUrl) && tabStatus==="complete") {
	    pdlWebRequestAttachment(tabInfo);
	}
    }
    
    // Attach tabUpdated listener to newly-created tab
    chrome.tabs.onUpdated.addListener(tabUpdatedWrapper);
}




/** 
 * ----------------------------
 * Listeners in Global Scope
 * ----------------------------
 */
// Fires on creation of any new tab
chrome.tabs.onCreated.addListener(tabCreatedWrapper);

// Fires on clicking the PDL page action
chrome.pageAction.onClicked.addListener(
    function (tabDetails){downloadFunction(tabDetails);}
);
