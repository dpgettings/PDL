
function getTrackDataJSON(){
    /** 
     * Scrape track information
     * But when background.js requests it
     * (Presumably this saves memory, CPU, or something like that)
     */
    console.log("FUNCTION: "+ document.readyState);

    var trackData = document.querySelector("div.trackData");

    var songTitleText = trackData.querySelector("a.songTitle").textContent;
    var artistSummaryText = trackData.querySelector("a.artistSummary").textContent;
    var albumTitleText = trackData.querySelector("a.albumTitle").textContent;
    
    var trackDataJSON = {songTitle: songTitleText, 
			 artistSummary: artistSummaryText, 
			 albumTitle: albumTitleText};

    return JSON.stringify(trackDataJSON);
}

/**
 * Listener to Send trackDataJSON back to background.js
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Check what background script wants
    if (request.sendBack === "trackDataJSON"){
	console.log("OUTER LISTENER: "+ document.readyState);
	
	var s = getTrackDataJSON();
	console.log(s);
	console.log(JSON.parse(s));
	sendResponse(s); 
	
    }
});

