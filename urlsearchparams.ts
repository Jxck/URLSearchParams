/// <reference path="types/webidl.d.ts" />
/// <reference path="types/utf8-encoding.d.ts" />

// polyfill for String.fromCodePoint
declare var String: {
  new (value?: any): String;
  (value?: any): string;
  prototype: String;
  fromCharCode(...codes: number[]): string;
  /**
   * Pollyfill of String.fromCodePoint
   */
  fromCodePoint(...codePoints: number[]): string;
};

// for dynamic require
declare var require: any;

// import only type info
import te = require("utf8-encoding");

var TextEncoder, TextDecoder;
if (typeof window === "undefined") { // in node.js
  var TextEncoding: typeof te = require("utf8-encoding");
  TextEncoder = TextEncoding.TextEncoder;
  TextDecoder = TextEncoding.TextDecoder;
}

// save platform implementation if exists
var nativeURLSearchParams;
if (typeof URLSearchParams !== "undefined") {
  nativeURLSearchParams = URLSearchParams;
}

module URLSearchParams {

  var encoder = new TextEncoder("utf-8");
  var decoder = new TextDecoder();

  function encode(s: string): Uint8Array {
    "use strict";

    return encoder.encode(s);
  }

  function decode(bytes: Uint8Array): string {
    "use strict";

    return decoder.decode(bytes);
  }

  function copy<T>(obj: T): T {
    "use strict";

    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * TODO: separate percentEncoder to module
   */

  // https://url.spec.whatwg.org/#percent-encode
  function percentEncode(byt: number): string {
    "use strict";

    return "%" + byt.toString(16).toUpperCase();
  }

  // utility not in spec
  export function percentEncoder(str: string): string {
    "use strict";

    var encoded = encode(str);
    var result = "";
    for (var i = 0; i < encoded.length; i ++) {
      result += percentEncode(encoded[i]);
    }
    return result;
  }

  // TODO: better using []number ?
  // https://url.spec.whatwg.org/#percent-decode
  function percentDecode(input: Uint8Array): Uint8Array {
    "use strict";

    // step 1
    var output: number[] = [];

    // step 2
    for (var i = 0; i < input.length; i ++) {
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
          var b1 = input[i+1];
          var b2 = input[i+2];
          var range1 = (0x30 <= b1 && b1 <= 0x39) ||
                       (0x41 <= b1 && b1 <= 0x46) ||
                       (0x61 <= b1 && b1 <= 0x66);

          var range2 = (0x30 <= b2 && b2 <= 0x39) ||
                       (0x41 <= b2 && b2 <= 0x46) ||
                       (0x61 <= b2 && b2 <= 0x66);

          if (!range1 && !range2) {
            output.push(byt);
            continue;
          }
        }
      }

      // step 2-3

      // step 2-3-1
      var u1 = input[i+1];
      var u2 = input[i+2];
      var hex =  decode(new Uint8Array([u1, u2]));
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
  export function percentDecoder(str: string): string {
    "use strict";

    var encoded = encode(str);
    return decode(percentDecode(encoded));
  }

  // https://url.spec.whatwg.org/#concept-urlencoded-parser
  function URLEncodedParse(input: Uint8Array, encodingOverride?: string, useCharset?: boolean, isIndex?: boolean): IPair[] {
    "use strict";

    // step 1
    if (encodingOverride === undefined) {
      encodingOverride = "utf-8";
    }

    // step 2
    if (encodingOverride !== "utf-8") {
      // omit byte range checking (=<0x7F)
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
      if (sequences[0].indexOf(61) === -1) { // =
        sequences[0].unshift(61);
      }
    }

    // step 5, 6
    var pairs: IPair[] = sequences.map((bytes: number[]): IPair => {
      // step 6-1
      if (bytes.length === 0) return;

      // step 6-2
      var name, value;
      var i = bytes.indexOf(61);
      if (i > 0) { // =
        name = bytes.splice(0, i);
        bytes.shift();
        value = bytes;
      }

      // step 6-3
      else {
        name  = bytes;
        value = [];
      }

      // step 4
      name.map((e: number) => {
        if (e === 43) { // +
          e = 0x20;
        }
        return e;
      });

      // step 5
      if (useCharset && name === "_charset_") {
        throw new Error("unsupported flug '_charset_'");
      }

      // step 8 parsent decode
      name  = decode(percentDecode(new Uint8Array(name)));
      value = decode(percentDecode(new Uint8Array(value)));

      return { name: name, value: value };
    });

    return pairs;
  }

  // https://url.spec.whatwg.org/#concept-urlencoded-serializer
  function URLEncodedSerialize(pairs: IPair[], encodingOverride?: string): string {
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
    pairs.forEach((pair: IPair, index: number) => {
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
      output += `${outputPair.name}=${outputPair.value}`;
    });

    // step 4
    return output;
  }

  // https://url.spec.whatwg.org/#concept-urlencoded-byte-serializer
  function URLEncodedByteSerialize(input: Uint8Array): string {
    "use strict";

    // step 1
    var output = "";

    // step 2
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

  // https://url.spec.whatwg.org/#interface-urlsearchparams
  // [Constructor(optional (USVString or URLSearchParams) init = ""), Exposed=(Window,Worker)]
  // interface URLSearchParams {
  //   void append(USVString name, USVString value);
  //   void delete(USVString name);
  //   USVString? get(USVString name);
  //   sequence<USVString> getAll(USVString name);
  //   boolean has(USVString name);
  //   void set(USVString name, USVString value);
  //   iterable<USVString, USVString>;
  //   stringifier;
  // };
  interface IURLSearchParams {
    append(name: USVString, value: USVString): void;
    delete(name: USVString):                   void;
    get(name: USVString):                      USVString;
    getAll(name: USVString):                   USVString[];
    has(name: USVString):                      boolean;
    set(name: USVString, value: USVString):    void;
    toString():                                string; // stringifier;
    // iterable<USVString, USVString>;
  };

  interface IPair {
    name:  USVString;
    value: USVString;
  }

  export class URLSearchParams implements IURLSearchParams {
    // https://url.spec.whatwg.org/#concept-urlsearchparams-list
    private list: IPair[] = [];

    // https://url.spec.whatwg.org/#concept-urlsearchparams-url-object
    private urlObject: URL[] = [];

    // https://url.spec.whatwg.org/#concept-urlsearchparams-new
    constructor(init?: USVString);
    constructor(init?: URLSearchParams);
    constructor(init?: any) {

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
    append(name: USVString, value: USVString): void {
      if (name === undefined || value === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.append.");
      }

      // step 1
      this.list.push({ name: name, value: value });

      // step 2
      this.update();
    }

    // https://url.spec.whatwg.org/#dom-urlsearchparams-delete
    delete(name: USVString): void {
      if (name === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.delete.");
      }

      // step 1
      this.list = this.list.filter((pair: IPair) => pair.name !== name);

      // step 2
      this.update();
    }

    // https://url.spec.whatwg.org/#dom-urlsearchparams-get
    get(name: USVString): USVString {
      if (name === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.get.");
      }
      return this.getAll(name).shift() || null;
    }

    // https://url.spec.whatwg.org/#dom-urlsearchparams-getall
    getAll(name: USVString): USVString[] {
      if (name === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.getAll.");
      }
      return this.list.reduce((acc: USVString[], pair: IPair) => {
        if (pair.name === name) {
          acc.push(pair.value);
        }
        return acc;
      }, []);
    }

    // https://url.spec.whatwg.org/#dom-urlsearchparams-set
    set(name: USVString, value: USVString): void { // LABEL: performance
      if (name === undefined || value === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.set.");
      }
      // if exists, this appended will remove in filter.
      this.list.push({ name: name, value: value });

      // update all pair
      this.list = this.list.map((pair: IPair) => {
        if (pair.name === name) {
          pair.value = value;
        }
        return pair;
      })
      // filter duplicates
      .filter(function(pair: IPair) {
        if (pair.name === name) {
          if (this.emitted) {
            // current pair is duplicate
            return false;
          } else {
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
    }

    // https://url.spec.whatwg.org/#dom-urlsearchparams-has
    has(name: USVString): boolean {
      if (name === undefined) {
        throw new TypeError("Not enough arguments to URLSearchParams.has.");
      }
      return this.list.some((pair: IPair) => pair.name === name);
    }

    // https://url.spec.whatwg.org/#concept-urlencoded-string-parser
    private parse(input: USVString): IPair[] {
      return URLEncodedParse(encode(input));
    }

    // https://url.spec.whatwg.org/#concept-urlsearchparams-update
    private update(): void {
      // step 1
      this.urlObject.forEach((url) => {
        // TODO: add query to url
        // url.query = this.serialize(this.list);

        // step 2
        // this.urlObject.preupdate();
      });
    }

    toString(): string {
      return URLEncodedSerialize(this.list);
    }
  }
}

// export to
// - window in browser
// - module.exports in node.js
// if platform has implements, use that.
this.URLSearchParams = nativeURLSearchParams || URLSearchParams.URLSearchParams;
