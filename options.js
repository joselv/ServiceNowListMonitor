function save_options() {
    //get values from elements on form
    var encodedQ = document.getElementById('encodedQuery');
    var refreshR = document.getElementById('refreshRate');
    var notiEnabled = document.getElementById('enableNotifications');
    //save values to local storage
    chrome.storage.sync.set({
        query: encodedQ.value,
        rate: refreshR.value,
        nofications:notiEnabled.checked
    }, function() {
        // Update status to show that options were saved 
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() { status.textContent = '';}, 750);
    });
}

// stored in chrome.storage.
function restore_options() {
    console.log('starting loading options');
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        query: 'incident.do?JSONv2&sysparm_action=getRecords&sysparm_query=active=true^assigned_to=javascript:getMyAssignments()^u_action_needed=true',
        rate: 10,
        nofications:true
    }, function(items) {
        console.log('in call back of restore_options');
        console.log(items);
        document.getElementById('encodedQuery').value = items.query;
        document.getElementById('refreshRate').value = items.rate;
        document.getElementById('enableNotifications').checked = items.nofications ? true : false;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('save').addEventListener('click', save_options);