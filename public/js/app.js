//-------------ANGULARJS--------
var ovpn = angular.module('ovpn', []);

ovpn.factory('testService', function() {
    return {
        price : '0'
    }
});

ovpn.controller('priceController', function ($scope, testService) {
    $scope.Math = window.Math;
    //alert($scope.price)

    $scope.setPrice = function(newPrice) {
        testService.price = newPrice
    }

    $scope.showPrice = function() {
        //alert(testService.price)
    }

    $scope.getPrice = function() {
        return testService.price
    }

});
