'use strict';

exports.logarithmic = function (random, len) {
  if (len === undefined) {
    return Math.pow(random(), 10);
  }
  var arr = new Array(len);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = Math.pow(random(), 10);
  }
  return arr;
};
