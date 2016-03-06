(function() {
    var refreshRate = 10;
    var knownIncidentList = [];
    var lastRequestCompleted = true;
    var failedRequestCount = 0;

    chrome.browserAction.setBadgeBackgroundColor({
        color: '#14CC8C'
    });


    chrome.browserAction.onClicked.addListener(function() {
        chrome.storage.sync.get({
            query: 'active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40'
        }, function(localStorage) {
            chrome.tabs.create({
                url: 'https://hi.service-now.com/incident_list.do?sysparm_query=' + localStorage.query
            });
        });
    });

    function refreshBadgeCount() {
        if (lastRequestCompleted) {
            lastRequestCompleted = false;
            var newIncidentList = [];
            chrome.storage.sync.get({
                query: 'active=true^assigned_to=javascript:getMyAssignments()^stateIN-40,2^ORu_action_needed=true^u_action_needed=true^ORstate=-40',
                rate: 10,
                values: [],
                nofications: false,
                avgTime: []
            }, function(localStorage) {
                var requestStartTime = new Date();
                refreshRate = localStorage.rate;
                knownIncidentList = localStorage.values;
                var currentAvgTime = localStorage.avgTime;
                var xhr = new XMLHttpRequest();
                xhr.open("GET", "https://hi.service-now.com/incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=" + localStorage.query, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                        if (xhr.status == 401) {
                            failedRequestCount++;
                            console.log(new Date().toLocaleTimeString() + 'Failed to connect to instance. Might have to re-establish your session. attempting again in ' + (refreshRate * failedRequestCount) + ' seconds');
                            lastRequestCompleted = true;
                            return;
                        }
                        failedRequestCount = 0;
                        var responseTime = (new Date() - requestStartTime) / 1000;
                        if (currentAvgTime.length > 9) {
                            currentAvgTime.shift();
                        }
                        currentAvgTime.push(responseTime);
                        var response = JSON.parse(xhr.responseText);
                        chrome.browserAction.setBadgeText({
                            text: response.records.length.toString()
                        });

                        for (var i = response.records.length - 1; i >= 0; i--) {
                            newIncidentList.push({
                                number: response.records[i].number,
                                updated: response.records[i].sys_updated_on,
                                created: response.records[i].sys_created_on,
                                short_description: response.records[i].short_description
                            });
                        }

                        chrome.storage.sync.set({
                            'values': newIncidentList,
                            'avgTime': currentAvgTime
                        });

                        lastRequestCompleted = true;

                        if (localStorage.nofications) {
                            var newlyAdded = pluckNewUnknownIncidents(knownIncidentList, newIncidentList);
                            var newlyUpdated = pluckUpdatedKnownIncidents(knownIncidentList, newIncidentList);
                            notify('newIncident', 'New Incidents', 'Incidents recently added to list', newlyAdded);
                            notify('UpdatedIncident', 'Updated Incidents', 'Incidents in list recently Updated', newlyUpdated);
                        }
                    }
                };
                xhr.send();
            });
        }
    }

    function notify(id, title, message, list) {
        if (list.length > 0) {
            chrome.notifications.create(id, {
                iconUrl: "1416810744_kwrite.png",
                type: 'list',
                title: title + ' ' + new Date().toLocaleTimeString(),
                message: message,
                priority: 1,
                items: list
            }, function(notificationId) {
                if (chrome.runtime.lastError) {
                    console.log("Last error:", chrome.runtime.lastError);
                }
            });
        }
    }


    function pluckUpdatedKnownIncidents(knownList, newList) {
        var updatedIncidents = [];
        _.each(knownList, function(incident) {
            var matchingIncident = _.find(newList, function(inc) {
                return inc.number === incident.number;
            });
            if (matchingIncident && matchingIncident.updated > incident.updated) {
                updatedIncidents.push(matchingIncident);
            }
        });
        return _.map(updatedIncidents, function(incident) {
            return {
                title: incident.number,
                message: incident.short_description
            };
        });
    }


    function pluckNewUnknownIncidents(knownList, retrievedList) {
        var diffList = _.difference(_.pluck(retrievedList, 'number'), _.pluck(knownList, 'number'));
        var newIncidents = _.filter(retrievedList, function(incident) {
            return _.contains(diffList, incident.number);
        });
        return _.map(newIncidents, function(incident) {
            return {
                title: incident.number,
                message: incident.short_description
            };
        });
    }


    refreshBadgeCount();

    var intervalID = window.setInterval(refreshBadgeCount, refreshRate * 1000);

    chrome.idle.onStateChanged.addListener(function(newState) {
        if (newState == 'active') {
            intervalID = window.setInterval(refreshBadgeCount, refreshRate * 1000);
        } else {
            clearInterval(intervalID);
        }
    });
})();
