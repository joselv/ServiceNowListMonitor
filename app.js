(function() {
    var app = angular.module('options', []);

    app.controller('OptionsController', function OptionsController($scope, $http, SNLMStorage) {
        SNLMStorage.findAll(function(items) {
            $scope.instanceName = items.instance;
            $scope.tableName = items.tableName;
            $scope.encodedQuery = items.query;
        });
        $scope.activeOption = -1;
        $scope.opts = [{
            title: "Instance",
            content: "Enter the name of the instance."
        }, {
            title: "Table",
            content: "Name of the table to monitor."
        }, {
            title: "Encoded Query",
            content: 'Encoded Query for list you want to monitor. Click the blue help icon ' +
                'for more information on how to build an Encoded Query.'
        }, {
            title: "Refresh Rate",
            content: "Frequency in seconds the list should be checked for updates"
        }, {
            title: "Avg Response",
            content: "Average time it takes to run this query. Based on the previous ten times."
        }, {
            title: "Notifications Enabled",
            content: "When checked, OS notifications will appear."
        }];

    });

    app.service('SNLMStorage', function($q) {
        this.findAll = function(callback) {
            chrome.storage.sync.get({
                query: 'caller_id=javascript:gs.getUserID()^active=true',
                rate: 60,
                nofications: true,
                avgTime: [],
                instance: 'instance-name',
                tableName: 'incident'
            }, function(keys) {
                callback(keys);
            });
        };
    });
})();
