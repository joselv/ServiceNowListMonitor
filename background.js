function refreshCount() {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "https://hi.service-now.com/incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=active=true^assigned_to=javascript:getMyAssignments()^u_action_needed=true", true);
	xhr.onreadystatechange = function() {
  		if (xhr.readyState == 4) {
    		// JSON.parse does not evaluate the attacker's scripts.
    		var resp = JSON.parse(xhr.responseText);
    		chrome.browserAction.setBadgeText({text: resp.records.length.toString()});
    		var activeNumbers = [];
    		for (var i = resp.records.length - 1; i >= 0; i--) {
    			activeNumbers.push(resp.records[i].number);
    		};
    		chrome.storage.local.set({'values':activeNumbers});
    	    chrome.storage.local.getBytesInUse(null,function(v){console.log(v);});
  		}
	}
	xhr.send();
}
refreshCount();
var intervalID = window.setInterval(refreshCount, 60000);
