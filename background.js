(function() {
    var defaultRefreshRate = 30;
    var knownIncidentList = [];
    var lastRequestCompleted = true;
    var failedRequestCount = 0;
    var debugging = true;
    var needOptions = false;
    var currentRefreshRate = defaultRefreshRate;
    chrome.browserAction.setBadgeBackgroundColor({
        color: '#14CC8C'
    });


    chrome.browserAction.onClicked.addListener(function() {
        logInfo('Loading list into new tab');
        chrome.storage.sync.get({
            query: '',
            instance: '',
            tableName: ''
        }, function(localStorage) {
            if (localStorage.instance && localStorage.tableName && localStorage.query) {
                resetInterval();
                chrome.tabs.create({
                    url: 'https://' + localStorage.instance + '.service-now.com/' + localStorage.tableName + '_list.do?sysparm_query=' + localStorage.query
                });
            } else {
                failedOptionsCheck();
            }
        });
    });

    function refreshBadgeCount() {
        logInfo('refresing badge count');
        if (lastRequestCompleted) {
            var newIncidentList = [];
            chrome.storage.sync.get({
                query: '',
                rate: defaultRefreshRate,
                values: [],
                nofications: false,
                avgTime: [],
                instance: '',
                tableName: ''
            }, function(localStorage) {
                if (localStorage.instance && localStorage.tableName && localStorage.query) {
                    if (needOptions) {
                        needOptions = false;
                        chrome.browserAction.setBadgeBackgroundColor({ color: '#14CC8C' });
                    }
                    lastRequestCompleted = false;
                    logInfo(JSON.stringify(localStorage));
                    var requestStartTime = new Date();
                    knownIncidentList = localStorage.values;
                    var currentAvgTime = localStorage.avgTime;
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", "https://" + localStorage.instance + ".service-now.com/" + localStorage.tableName + ".do?JSONv2&sysparm_action=getRecords&sysparm_query=" + localStorage.query, true);
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4) {
                            lastRequestCompleted = true;
                            logInfo('readyState=' + xhr.readyState);
                            if (xhr.status != 200) {
                                logInfo('status=' + xhr.status);
                                failedRequestCount++;
                                logWarn('Failed to connect to instance. Might have to re-establish your session. attempting again in ' + (localStorage.rate * failedRequestCount) + ' seconds');
                                lastRequestCompleted = true;
                                resetInterval(localStorage.rate * failedRequestCount);
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


                            if (localStorage.nofications) {
                                var newlyAdded = pluckNewUnknownIncidents(knownIncidentList, newIncidentList);
                                var newlyUpdated = pluckUpdatedKnownIncidents(knownIncidentList, newIncidentList);
                                notify('newIncident', 'New Incidents', 'Incidents recently added to list', newlyAdded);
                                notify('UpdatedIncident', 'Updated Incidents', 'Incidents in list recently Updated', newlyUpdated);
                            }
                        }
                    };
                    xhr.send();
                    if (currentRefreshRate !== localStorage.rate) {
                        currentRefreshRate = localStorage.rate;
                        resetInterval(currentRefreshRate);
                    }
                } else {
                    logInfo('Need to configure instance name,table name and query');
                    failedOptionsCheck();
                }
            });
        }
    }

    function notify(id, title, message, list) {
        if (list.length > 0) {
            chrome.notifications.create(id, {
                iconUrl: "list.png",
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

    var intervalID = window.setInterval(refreshBadgeCount, defaultRefreshRate * 1000);

    chrome.idle.onStateChanged.addListener(function(newState) {
        logInfo('state changed to' + newState);
        if (newState == 'active') {
            intervalID = window.setInterval(refreshBadgeCount, defaultRefreshRate * 1000);
        } else {
            clearInterval(intervalID);
        }
    });

    function resetInterval(newRate) {
        window.clearInterval(intervalID);
        chrome.storage.sync.get({
            rate: defaultRefreshRate,
        }, function(lStorage) {
            newRate = newRate ? newRate * 1000 : lStorage.rate * 1000;
            logInfo('Reseting interval to ' + newRate + ' ms');
            intervalID = window.setInterval(refreshBadgeCount, newRate);
        });
    }

    function failedOptionsCheck() {
        chrome.browserAction.setBadgeText({ text: "!" });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#B0171F' });
        needOptions = true;
    }

    function logInfo(msg) {
        if (debugging)
            console.info(new Date().toLocaleTimeString() + ' ' + msg);
    }

    function logWarn(msg) {
        console.warn(new Date().toLocaleTimeString() + ' ' + msg);
    }

    function logError(msg) {
        console.error(new Date().toLocaleTimeString() + ' ' + msg);
    }
})();
