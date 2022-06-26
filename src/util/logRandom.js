export function logRandom(random, length) {
  if (length === undefined) {
    return Math.pow(random(), 10);
  }
  let arr = new Array(length);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.pow(random(), 10);
  }
  return arr;
}
