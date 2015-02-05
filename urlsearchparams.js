/// <reference path="types/webidl.d.ts" />
/// <reference path="types/utf8-encoding.d.ts" />
var TextEncoder, TextDecoder;
if (typeof window === "undefined") {
    var TextEncoding = require("utf8-encoding");
    TextEncoder = TextEncoding.TextEncoder;
    TextDecoder = TextEncoding.TextDecoder;
}
// save platform implementation if exists
var nativeURLSearchParams;
if (typeof URLSearchParams !== "undefined") {
    nativeURLSearchParams = URLSearchParams;
}
var URLSearchParams;
(function (_URLSearchParams) {
    var encoder = new TextEncoder("utf-8");
    var decoder = new TextDecoder();
    function encode(s) {
        "use strict";
        return encoder.encode(s);
    }
    function decode(bytes) {
        "use strict";
        return decoder.decode(bytes);
    }
    function copy(obj) {
        "use strict";
        return JSON.parse(JSON.stringify(obj));
    }
    /**
     * TODO: separate percentEncoder to module
     */
    // https://url.spec.whatwg.org/#percent-encode
    function percentEncode(byt) {
        "use strict";
        return "%" + byt.toString(16).toUpperCase();
    }
    // utility not in spec
    function percentEncoder(str) {
        "use strict";
        var encoded = encode(str);
        var result = "";
        for (var i = 0; i < encoded.length; i++) {
            result += percentEncode(encoded[i]);
        }
        return result;
    }
    _URLSearchParams.percentEncoder = percentEncoder;
    // TODO: better using []number ?
    // https://url.spec.whatwg.org/#percent-decode
    function percentDecode(input) {
        "use strict";
        // step 1
        var output = [];
        for (var i = 0; i < input.length; i++) {
            var byt = input[i];
            // step 2-1
            if (byt !== 37) {
                output.push(byt);
                continue;
            }
            // step 2-2
            if (byt === 37) {
                // has more 2 byte
                if (i + 2 < input.length) {
                    var b1 = input[i + 1];
                    var b2 = input[i + 2];
                    var range1 = (0x30 <= b1 && b1 <= 0x39) || (0x41 <= b1 && b1 <= 0x46) || (0x61 <= b1 && b1 <= 0x66);
                    var range2 = (0x30 <= b2 && b2 <= 0x39) || (0x41 <= b2 && b2 <= 0x46) || (0x61 <= b2 && b2 <= 0x66);
                    if (!range1 && !range2) {
                        output.push(byt);
                        continue;
                    }
                }
            }
            // step 2-3
            // step 2-3-1
            var u1 = input[i + 1];
            var u2 = input[i + 2];
            var hex = decode(new Uint8Array([u1, u2]));
            var bytePoint = parseInt(hex, 16);
            // step 2-3-2
            output.push(bytePoint);
            // step 2-3-3
            i = i + 2;
            continue;
        }
        // step 3
        return new Uint8Array(output);
    }
    // utility not in spec
    function percentDecoder(str) {
        "use strict";
        var encoded = encode(str);
        return decode(percentDecode(encoded));
    }
    _URLSearchParams.percentDecoder = percentDecoder;
    // https://url.spec.whatwg.org/#concept-urlencoded-parser
    function URLEncodedParse(input, encodingOverride, useCharset, isIndex) {
        "use strict";
        // step 1
        if (encodingOverride === undefined) {
            encodingOverride = "utf-8";
        }
        // step 2
        if (encodingOverride !== "utf-8") {
            throw new Error("unsupported encoding");
        }
        // step 3
        var array = Array.prototype.slice.call(input);
        var sequences = [];
        while (true) {
            var i = array.indexOf(38); // &
            if (i < 0) {
                sequences.push(array);
                break;
            }
            sequences.push(array.splice(0, i));
            array.shift();
        }
        // step 4
        if (isIndex === true) {
            if (sequences[0].indexOf(61) === -1) {
                sequences[0].unshift(61);
            }
        }
        // step 5, 6
        var pairs = sequences.map(function (bytes) {
            // step 6-1
            if (bytes.length === 0)
                return;
            // step 6-2
            var name, value;
            var i = bytes.indexOf(61);
            if (i > 0) {
                name = bytes.splice(0, i);
                bytes.shift();
                value = bytes;
            }
            else {
                name = bytes;
                value = [];
            }
            // step 4
            name.map(function (e) {
                if (e === 43) {
                    e = 0x20;
                }
                return e;
            });
            // step 5
            if (useCharset && name === "_charset_") {
                throw new Error("unsupported flug '_charset_'");
            }
            // step 8 parsent decode
            name = decode(percentDecode(new Uint8Array(name)));
            value = decode(percentDecode(new Uint8Array(value)));
            return { name: name, value: value };
        });
        return pairs;
    }
    // https://url.spec.whatwg.org/#concept-urlencoded-serializer
    function URLEncodedSerialize(pairs, encodingOverride) {
        "use strict";
        // step 1
        if (encodingOverride === undefined) {
            encodingOverride = "utf-8";
        }
        // this imeplementation support only utf-8
        if (encodingOverride !== "utf-8") {
            throw new Error("unsupported encoding");
        }
        // step 2
        var output = "";
        // step 3
        pairs.forEach(function (pair, index) {
            // step 3-1
            var outputPair = copy(pair);
            // step 3-2
            var encodedName = encode(outputPair.name);
            var encodedValue = encode(outputPair.value);
            // step 3-3
            outputPair.name = URLEncodedByteSerialize(encodedName);
            outputPair.value = URLEncodedByteSerialize(encodedValue);
            // step 3-4
            if (index !== 0) {
                output += "&";
            }
            // step 3-5
            output += "" + outputPair.name + "=" + outputPair.value;
        });
        // step 4
        return output;
    }
    // https://url.spec.whatwg.org/#concept-urlencoded-byte-serializer
    function URLEncodedByteSerialize(input) {
        "use strict";
        // step 1
        var output = "";
        for (var i = 0; i < input.length; i++) {
            var byt = input[i];
            if (byt === 0x20) {
                output += "+"; // 0x2B
                continue;
            }
            if ([0x2A, 0x2D, 0x2E].indexOf(byt) !== -1) {
                output += String.fromCodePoint(byt);
                continue;
            }
            if (0x30 <= byt && byt <= 0x39) {
                output += String.fromCodePoint(byt);
                continue;
            }
            if (0x41 <= byt && byt <= 0x5A) {
                output += String.fromCodePoint(byt);
                continue;
            }
            if (byt === 0x5F) {
                output += String.fromCodePoint(byt);
                continue;
            }
            if (0x61 <= byt && byt <= 0x7A) {
                output += String.fromCodePoint(byt);
                continue;
            }
            // otherwise
            output += percentEncode(byt);
        }
        // step 3
        return output;
    }
    ;
    var URLSearchParams = (function () {
        function URLSearchParams(init) {
            // https://url.spec.whatwg.org/#concept-urlsearchparams-list
            this.list = [];
            // https://url.spec.whatwg.org/#concept-urlsearchparams-url-object
            this.urlObject = [];
            // step 1
            var query = this;
            // step 2
            if (typeof init === "string") {
                query.list = this.parse(init);
            }
            // step 3
            if (URLSearchParams.prototype.isPrototypeOf(init)) {
                query.list = copy(init.list);
            }
            // step 4
            return query;
        }
        // https://url.spec.whatwg.org/#dom-urlsearchparams-append
        URLSearchParams.prototype.append = function (name, value) {
            if (name === undefined || value === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.append.");
            }
            // step 1
            this.list.push({ name: name, value: value });
            // step 2
            this.update();
        };
        // https://url.spec.whatwg.org/#dom-urlsearchparams-delete
        URLSearchParams.prototype.delete = function (name) {
            if (name === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.delete.");
            }
            // step 1
            this.list = this.list.filter(function (pair) { return pair.name !== name; });
            // step 2
            this.update();
        };
        // https://url.spec.whatwg.org/#dom-urlsearchparams-get
        URLSearchParams.prototype.get = function (name) {
            if (name === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.get.");
            }
            return this.getAll(name).shift() || null;
        };
        // https://url.spec.whatwg.org/#dom-urlsearchparams-getall
        URLSearchParams.prototype.getAll = function (name) {
            if (name === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.getAll.");
            }
            return this.list.reduce(function (acc, pair) {
                if (pair.name === name) {
                    acc.push(pair.value);
                }
                return acc;
            }, []);
        };
        // https://url.spec.whatwg.org/#dom-urlsearchparams-set
        URLSearchParams.prototype.set = function (name, value) {
            if (name === undefined || value === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.set.");
            }
            // if exists, this appended will remove in filter.
            this.list.push({ name: name, value: value });
            // update all pair
            this.list = this.list.map(function (pair) {
                if (pair.name === name) {
                    pair.value = value;
                }
                return pair;
            }).filter(function (pair) {
                if (pair.name === name) {
                    if (this.emitted) {
                        // current pair is duplicate
                        return false;
                    }
                    else {
                        // first pair of key
                        this.emitted = true;
                        return true;
                    }
                }
                // other pair
                return true;
            }, { emitted: false });
            // step 3
            this.update();
        };
        // https://url.spec.whatwg.org/#dom-urlsearchparams-has
        URLSearchParams.prototype.has = function (name) {
            if (name === undefined) {
                throw new TypeError("Not enough arguments to URLSearchParams.has.");
            }
            return this.list.some(function (pair) { return pair.name === name; });
        };
        // https://url.spec.whatwg.org/#concept-urlencoded-string-parser
        URLSearchParams.prototype.parse = function (input) {
            return URLEncodedParse(encode(input));
        };
        // https://url.spec.whatwg.org/#concept-urlsearchparams-update
        URLSearchParams.prototype.update = function () {
            // step 1
            this.urlObject.forEach(function (url) {
                // TODO: add query to url
                // url.query = this.serialize(this.list);
                // step 2
                // this.urlObject.preupdate();
            });
        };
        URLSearchParams.prototype.toString = function () {
            return URLEncodedSerialize(this.list);
        };
        return URLSearchParams;
    })();
    _URLSearchParams.URLSearchParams = URLSearchParams;
})(URLSearchParams || (URLSearchParams = {}));
// export to
// - window in browser
// - module.exports in node.js
// if platform has implements, use that.
this.URLSearchParams = nativeURLSearchParams || URLSearchParams.URLSearchParams;
//# sourceMappingURL=urlsearchparams.js.map