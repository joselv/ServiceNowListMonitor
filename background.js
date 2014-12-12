//rate (in seconds) that the extension will check HI for changes to the list
var rateOfRefresh = 10;
//list of incidents that we already know about
var currentIncidentList = [];
//flag to use to skip a call to refreshCount() when the previous one hasn't completed
var readyForNewREquest = true;

//change the badge color to green (perhaps we should make it a different color based on something...what?)
chrome.browserAction.setBadgeBackgroundColor({
    color: '#14CC8C'
});

//if the extension icon is clicked, open up the list
chrome.browserAction.onClicked.addListener(function() {
    chrome.storage.sync.get({
        query: 'active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40'
    }, function(items) {
        chrome.tabs.create({
            url: 'https://hi.service-now.com/incident_list.do?sysparm_query=' + items.query
        });
    });
});

function refreshCount() {
    //only refresh if not currently waiting for refresh to complete
    if (readyForNewREquest) {
        //starting new refresh
        readyForNewREquest = false;
        var newIncidentList = [];
        //get properties from storage
        chrome.storage.sync.get({
            query: 'active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40',
            rate: 10,
            values: [],
            nofications: false,
            avgTime: []
        }, function(items) {
            var startRequest = new Date();
            rateOfRefresh = items.rate;
            currentIncidentList = items.values;
            currAvgTime = items.avgTime;
            //make the AJAX request to Hi to get the JSON list
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "https://hi.service-now.com/incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=" + items.query, true);
            xhr.onreadystatechange = function() {
                //once the response is returned
                if (xhr.readyState == 4) {
                    var responseTime = (new Date() - startRequest) / 1000;
                    if (currAvgTime.length > 9) {
                        currAvgTime.shift();
                    }
                    currAvgTime.push(responseTime);
                    //parse the response
                    var resp = JSON.parse(xhr.responseText);
                    //update the badge
                    chrome.browserAction.setBadgeText({
                        text: resp.records.length.toString()
                    });

                    //load new list of incidents into array
                    for (var i = resp.records.length - 1; i >= 0; i--) {
                        newIncidentList.push({
                            number: resp.records[i].number,
                            updated: resp.records[i].sys_updated_on,
                            created: resp.records[i].sys_created_on,
                            short_description: resp.records[i].short_description
                        });
                    };
                    //save new list to storage
                    chrome.storage.sync.set({
                        'values': newIncidentList,
                        'avgTime': currAvgTime
                    });
                    //indicate that we are ready for new request
                    readyForNewREquest = true;

                    //if notifications are enabled
                    if (items.nofications) {
                        //get the list of newly added incidents
                        var newlyAdded = getNewIncidents(currentIncidentList, newIncidentList);
                        //get the list of newly updated incidents
                        var newlyUpdated = getRecenlyUpdated(currentIncidentList, newIncidentList);
                        //if we have any newly added incidents, create a notification
                        notify('newIncident', 'New Incidents', 'Incidents recently added to list', newlyAdded);
                        //if we have any newly updated incidents, create a notification
                        notify('UpdatedIncident', 'Updated Incidents', 'Incidents in list recently Updated', newlyUpdated);
                    }
                }
            }
            xhr.send();
        });
    }
}

//create a notification to let the user know that someting occured
function notify(notifyID, notifyTitle, notifyMessage, notifyList) {
    //if we have any newly updated incidents, create a notification
    if (notifyList.length > 0) {
        chrome.notifications.create(notifyID, {
            iconUrl: "1416810744_kwrite.png",
            type: 'list',
            title: notifyTitle + ' ' + new Date().toLocaleTimeString(),
            message: notifyMessage,
            priority: 1,
            items: notifyList
        }, function(notificationId) {
            //if there are any errors creating the notification, then log them
            if (chrome.runtime.lastError) {
                console.log("Last error:", chrome.runtime.lastError);
            }
        })
    }
}

//get a list of recently updated incidents in a form that can be passed to a notification
function getRecenlyUpdated(currentList, newList) {
    var updatedIncidents = [];
    //loop through each incident in the current list
    _.each(currentList, function(incident) {
        //find the matching incident in the new list
        var matchingIncident = _.find(newList, function(inc) {
            return inc.number === incident.number;
        });
        //if we found a matching incident and its updated date is greater than last we new
        if (matchingIncident && matchingIncident.updated > incident.updated) {
            //add it to the list of incidents to notify about
            updatedIncidents.push(matchingIncident);
        }
    });
    //transform our updated incident list to pass it to the notifications
    return _.map(updatedIncidents, function(incident) {
        return {
            title: incident.number,
            message: incident.short_description
        };
    });
}

//get a list of recently added incidents in a form that can be passed to a notification
function getNewIncidents(currentList, newList) {
    //get a list of difference (numbers we didn't already know about)
    var diffList = _.difference(_.pluck(newList, 'number'), _.pluck(currentList, 'number'));
    //filter newList to only those we didnt' know about
    var newIncidents = _.filter(newList, function(incident) {
        return _.contains(diffList, incident.number);
    });
    return _.map(newIncidents, function(incident) {
        return {
            title: incident.number,
            message: incident.short_description
        };
    });
}

//initial call to refresh on load
refreshCount();
//call function on an interval based on settings
var intervalID = window.setInterval(refreshCount, rateOfRefresh * 1000);

chrome.idle.onStateChanged.addListener(function(newState) {
    if (newState == 'active') {
        intervalID = window.setInterval(refreshCount, rateOfRefresh * 1000);
    } else {
        clearInterval(intervalID);
    }
});
