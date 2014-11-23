var rateOfRefresh = 10;
var currentIncidentList = [];
var readyForNewREquest = true;
//change the badge color to green (perhaps we should make it a different color based on something...what?)
chrome.browserAction.setBadgeBackgroundColor({
    color: '#14CC8C'
});

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
    if (readyForNewREquest) {
        readyForNewREquest=false;
        var newIncidentList = [];
        //get properties from storage
        chrome.storage.sync.get({
            query: 'active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40',
            rate: 10,
            values: [],
            nofications: false
        }, function(items) {

            rateOfRefresh = items.rate;
            currentIncidentList = items.values;

            var xhr = new XMLHttpRequest();
            xhr.open("GET", "https://hi.service-now.com/incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=" + items.query, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
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
                    chrome.storage.sync.set({
                        'values': newIncidentList
                    });
                    readyForNewREquest = true;
                    if (items.nofications) {
                        var newlyAdded = getNewIncidents(currentIncidentList, newIncidentList);
                        var newlyUpdated = getRecenlyUpdated(currentIncidentList, newIncidentList);
                        if (newlyAdded.length > 0) {
                            chrome.notifications.create('newIncident', {
                                iconUrl: "icon.png",
                                type: 'list',
                                title: 'New Incidents',
                                message: 'Incidents recently added to list',
                                priority: 1,
                                items: newlyAdded
                            }, function(notificationId) {
                                console.log("Last error:", chrome.runtime.lastError)
                            })
                        }
                        if (newlyUpdated.length > 0) {
                            chrome.notifications.create('UpdatedIncident', {
                                iconUrl: "icon.png",
                                type: 'list',
                                title: 'Updated Incidents',
                                message: 'Incidents in list recently Updated',
                                priority: 1,
                                items: newlyUpdated
                            }, function(notificationId) {
                                if (chrome.runtime.lastError) {
                                    console.log("Last error:", chrome.runtime.lastError);
                                }
                            })
                        }
                    }
                }
            }
            xhr.send();
        });
    }
}

function getRecenlyUpdated(currentList, newList) {
    var updatedIncidents = [];
    //get the incident numbers we know about
    var currentNumbers = _.pluck(currentList, 'number');
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

function getNewIncidents(currentList, newList) {
    //get the incident numbers we already new about
    var currentNumbers = _.pluck(currentList, 'number');
    //get the incident numbers that are in the list we just retrieved
    var newNumbers = _.pluck(newList, 'number');
    //get a list of difference (numbers we didn't already know about)
    var diffList = _.difference(newNumbers, currentNumbers);
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
