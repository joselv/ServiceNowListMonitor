function save_options() {
    //save values to local storage
    //TODO:add some validation
    var rr = document.getElementById('refreshRate').value;
    chrome.storage.sync.set({
        query: document.getElementById('encodedQuery').value,
        rate: isThisNumeric(rr) ? rr : 120,
        nofications: document.getElementById('enableNotifications').checked
    }, function() {
        //TODO:need a way to give feedback to user that changes were saved
    });
}

// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        query: 'active=true^assigned_to=javascript:getMyAssignments()^u_action_needed=true',
        rate: 10,
        nofications: true,
        avgTime: []
    }, function(items) {
        var sum = _.reduce(items.avgTime, function(memo, num){ return memo + num; }, 0);
        document.getElementById('encodedQuery').value = items.query;
        document.getElementById('refreshRate').value = items.rate;
        document.getElementById('enableNotifications').checked = items.nofications ? true : false;
        document.getElementById('avgResponse').innerText = Math.round((sum/items.avgTime.length) * 1000).toString() + ' ms';
    });
}

function isThisNumeric(val) {return (/^[0-9]+$/.test(val));}

function hideIt(element) { document.getElementById(element).classList.add('hideIt'); }

function showIt(element) { document.getElementById(element).classList.remove('hideIt'); }


document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('save').addEventListener('click', save_options);

document.getElementById("refreshRate").addEventListener('change', function() {
    hideIt("warningMsg");
    hideIt("errorMsg");
    if (isThisNumeric(this.value)) {
        if (parseInt(this.value, 10) < 60) { showIt("warningMsg");}
    } else { showIt('errorMsg'); }
}, true);
