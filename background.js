var rateOfRefresh = 10;
var currentIncidentList = [];

function refreshCount() {
    var newIncidentList = [];
    //get properties from storage
    chrome.storage.sync.get({
        query: 'incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40',
        rate: 10,
        values: []
    }, function(items) {

        rateOfRefresh = items.rate;
        currentIncidentList = items.values;

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://hi.service-now.com/" + items.query, true);
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

                newIncidentList.push({
                    number: 'INT126551',
                    updated: new Date().toString(),
                    created: new Date().toString(),
                    short_description: 'Help! I cant do what i really need to do!'
                });
                var newlyAdded = getNewIncidents(currentIncidentList, newIncidentList)

                if (newlyAdded.length>0) {
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
                chrome.storage.sync.set({
                    'values': newIncidentList
                });
            }
        }

        xhr.send();
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

refreshCount();
var intervalID = window.setInterval(refreshCount, rateOfRefresh * 1000);