function save_options() {
    var rr = document.getElementById('refreshRate').value;
    chrome.storage.sync.set({
        query: document.getElementById('encodedQuery').value,
        rate: isThisNumeric(rr) ? rr : 120,
        nofications: document.getElementById('enableNotifications').checked,
        instance:document.getElementById('instance').value,
        tableName:document.getElementById('tableName').value
    }, function() {
        //TODO:need a way to give feedback to user that changes were saved
    });
}

function restore_options() {
    chrome.storage.sync.get({
        query: 'active=true',
        rate: 60,
        nofications: true,
        avgTime: [],
        instance:'instance-name',
        tableName:'incident'
    }, function(items) {
        var sum = _.reduce(items.avgTime, function(memo, num){ return memo + num; }, 0);
        document.getElementById('encodedQuery').value = items.query;
        document.getElementById('refreshRate').value = items.rate;
        document.getElementById('enableNotifications').checked = items.nofications ? true : false;
        var responseTimeAverage;
        if(items.avgTime.length>0) {
          responseTimeAverage = Math.round((sum/items.avgTime.length) * 1000).toString() + ' ms';
        } else {
          responseTimeAverage = "Waiting for more data to calculate..";
        }
        document.getElementById('avgResponse').innerText = responseTimeAverage;
        document.getElementById('instance').value = items.instance;
        document.getElementById('tableName').value = items.tableName;
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
