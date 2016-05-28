(function() {
    var app = angular.module('options', []);

    app.controller('OptionsController', function($scope, $http) {
        this.instanceName="";
        this.statusimg="";
        this.opts = [{
            title: "Instance",
            content: "Enter the name of your instance."
        }, {
            title: "Table",
            content: "What table do you want to query?"
        }, {
            title: "Encoded Query",
            content: "Encoded Query of list you want to monitor. See the following" +
                " URL more information on how to build an Encoded Query"
        }, {
            title: "Refresh Rate",
            content: "How often should we check the list for changes?"
        }, {
            title: "Avg Response",
            content: "Average time it takes to run this query. Based on the previous ten times."
        }, {
            title: "Notifications Enabled",
            content: "When checked, OS notifications will appear."
        }];
        this.activeOption = -1;
    });
})();
