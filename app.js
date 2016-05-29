(function() {
    var app = angular.module('options', []);

    app.controller('OptionsController', function OptionsController($scope, $http) {
        $scope.instanceName = "instance-name";
        $scope.tableName = "incident";
        $scope.encodedQuery = "caller_id=javascript:gs.getUserID()^active=true";
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
})();
