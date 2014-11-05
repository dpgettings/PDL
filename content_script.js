/**
 * ----------------------------------------------------
 * Function to Parse the DOM for Metadata
 * ----------------------------------------------------
 */
function getTrackDataJSON(){
    /** 
     * Scrape track information
     * But when background.js requests it
     * (Presumably this saves memory, CPU, or something like that)
     */

    // Gather track metadata
    var trackData = document.querySelector("div.trackData");
    var songTitleText = trackData.querySelector("a.songTitle").textContent;
    var artistSummaryText = trackData.querySelector("a.artistSummary").textContent;
    var albumTitleText = trackData.querySelector("a.albumTitle").textContent;
    // Package into JSON
    var trackDataJSON = {songTitle: songTitleText, 
			 artistSummary: artistSummaryText, 
			 albumTitle: albumTitleText};
    // Stringify for transmission
    return JSON.stringify(trackDataJSON);
}

/**
 * ----------------------------------------------------
 * Listener to Send trackDataJSON back to background.js
 * ----------------------------------------------------
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Check what background script wants
    if (request.sendBack === "trackDataJSON"){
	var s = getTrackDataJSON();  // Get serialized JSON response
	sendResponse(s); 
    }
});
