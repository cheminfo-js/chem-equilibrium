'use strict';

exports.hsl2rgb = function hsl2rgb(h, s, l) {
    var m1, m2, hue, r, g, b;
    s /= 100;
    l /= 100;

    if (s === 0)
        r = g = b = (l * 255);
    else {
        if (l <= 0.5)
            m2 = l * (s + 1);
        else
            m2 = l + s - l * s;

        m1 = l * 2 - m2;
        hue = h / 360;
        r = exports.hue2rgb(m1, m2, hue + 1 / 3);
        g = exports.hue2rgb(m1, m2, hue);
        b = exports.hue2rgb(m1, m2, hue - 1 / 3);
    }
    return {r: r, g: g, b: b};
};

exports.getDistinctColors = function getDistinctColors(numColors) {
    var colors = new Array(numColors);
    var j = 0;
    for (var i = 0; i < 360; i += 360 / numColors) {
        j++;
        var color = exports.hsl2rgb(i, 100, 30 + j % 4 * 15);
        colors[j - 1] = [Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)];
    }
    return colors;
};

exports.hue2rgb = function hue2rgb(p, q, t) {
    if (t < 0)
        t += 1;
    if (t > 1)
        t -= 1;
    if (t < 1 / 6)
        return p + (q - p) * 6 * t;
    if (t < 1 / 2)
        return q;
    if (t < 2 / 3)
        return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};