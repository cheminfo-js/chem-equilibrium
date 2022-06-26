

exports.logarithmic = function (random, len) {
  if (len === undefined) {
    return Math.pow(random(), 10);
  }
  let arr = new Array(len);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.pow(random(), 10);
  }
  return arr;
};
