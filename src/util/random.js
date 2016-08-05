'use strict';

exports.logarithmic = function (len) {
    if(!len) {
        return Math.pow(Math.random(), 10);
    }
    var arr = new Array(len);
    for (var i = 0; i < arr.length; i++) {
        arr[i] = Math.pow(Math.random(), 10);
    }
    return arr;
};
