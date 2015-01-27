/// <reference path="types/webidl.d.ts" />
/// <reference path="types/utf8-encoding.d.ts" />

// for dynamic require
declare var require: any;

// import only type info
import te = require('utf8-encoding');

var TextEncoder, TextDecoder;
if (typeof window === 'undefined') { // in node.js
  var TextEncoding: typeof te = require('utf8-encoding');
  TextEncoder = TextEncoding.TextEncoder;
  TextDecoder = TextEncoding.TextDecoder;
}

var encoder = new TextEncoder("utf-8");
var decoder = new TextDecoder();

function encode(s: string): Uint8Array {
  return encoder.encode(s);
}

function decode(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function copy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// https://url.spec.whatwg.org/#percent-encode
function percentEncode(byt: number): string {
  return "%" + byt.toString(16).toUpperCase();
}

function percentEncoder(str: string): string {
  var encoded = encode(str);
  var result = "";
  for (var i = 0; i < encoded.length; i ++) {
    result += percentEncode(encoded[i]);
  }
  return result;
}

// https://url.spec.whatwg.org/#percent-decode
function percentDecode(input: Uint8Array): Uint8Array {
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

        if(!range1 && !range2) {
          output.push(byt);
          continue;
        }
      }
    }

    // step 2-3

    // step 2-3-1
    var u1 = input[i+1];
    var u2 = input[i+2]
    var hex =  decode(new Uint8Array([u1, u2]))
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

function percentDecoder(str: string): string {
  var encoded = encode(str);
  return decode(percentDecode(encoded));
}

// https://url.spec.whatwg.org/#concept-urlencoded-parser
function formURLEncodedParse(input: USVString, encodingOverride?: string, useCharset?: boolean, isIndex?: boolean): pair[] {
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
  var sequences = input.split('&');

  // step 4
  if(isIndex === true) {
    var first= sequences[0];
    if (first.indexOf("=") === -1) {
      sequences[0] = "=" + first;
    }
  }

  // step 5
  var pairs: pair[] = sequences.map((bytes: USVString): pair => {
    if (bytes === "") return;

    // step 3
    var name: USVString, value: USVString;
    if (bytes.indexOf("=")) {
      var b = bytes.split("=");
      name  = b.shift();
      value = b.join("=");
    } else {
      name  = bytes;
      value = "";
    }

    // step 4
    var c0x20 = String.fromCharCode(0x20);
    name.replace(/\+/g, c0x20);
    value.replace(/\+/g, c0x20);

    // step 5
    if (useCharset && name === "_charset_") {
      throw new Error("unsupported flug '_charset_'");
    }

    // TODO: step 8 parsent decode
    name  = decodeURIComponent(name);
    value = decodeURIComponent(value);

    return { name: name, value: value };
  });

  return pairs;
}

// https://url.spec.whatwg.org/#interface-urlsearchparams
//[Constructor(optional (USVString or URLSearchParams) init = ""), Exposed=(Window,Worker)]
//interface URLSearchParams {
//  void append(USVString name, USVString value);
//  void delete(USVString name);
//  USVString? get(USVString name);
//  sequence<USVString> getAll(USVString name);
//  boolean has(USVString name);
//  void set(USVString name, USVString value);
//  iterable<USVString, USVString>;
//  stringifier;
//};
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

interface pair {
  name:  USVString;
  value: USVString;
}

class URLSearchParams implements IURLSearchParams {
  // https://url.spec.whatwg.org/#concept-urlsearchparams-list
  private list: pair[] = [];

  // https://url.spec.whatwg.org/#concept-urlsearchparams-url-object
  private urlObject: URL[] = [];

  // https://url.spec.whatwg.org/#concept-urlsearchparams-new
  constructor(init?: USVString);
  constructor(init?: URLSearchParams);
  constructor(init?: any) {

    // step 1
    var query = this;

    // step 2
    if (init === "" || init === null) {
      return query
    }

    // step 3
    if (typeof init === "string") {
      query.list = this.parse(init);
    }

    // step 4
    if (URLSearchParams.prototype.isPrototypeOf(init)) {
      query.list = copy(init.list);
    }

    // step 5
    return query;
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-append
  append(name: USVString, value: USVString): void {
    if(name === undefined || value === undefined) {
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
    this.list = this.list.filter(pair => pair.name !== name);

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
    return this.list.reduce((acc, pair) => {
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
    this.list = this.list.map(pair => {
      if (pair.name === name) {
        pair.value = value;
      }
      return pair
    })
    // filter duplicates
    .filter(function(pair) {
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
  // TODO: implement correctly
  has(name: USVString): boolean {
    if (name === undefined) {
      throw new TypeError("Not enough arguments to URLSearchParams.has.");
    }
    return this.list.some(pair => pair.name === name);
  }

  // https://url.spec.whatwg.org/#concept-urlencoded-byte-serializer
  private byteSerialize(input: Uint8Array): string {
    // step 1
    var output = "";

    // step 2
    for(var i=0; i < input.length; i++) {
      var byt = input[i];
      if (byt === 0x20) {
        output += "+"; // 0x2B
        continue;
      }

      if ([0x2A, 0x2D, 0x2E].indexOf(byt) > -1) {
        output += String.fromCharCode(byt);
        continue;
      }

      if (0x30 <= byt && byt <= 0x39) {
        output += String.fromCharCode(byt);
        continue;
      }

      if (0x41 <= byt && byt <= 0x5A) {
        output += String.fromCharCode(byt);
        continue;
      }

      if (byt === 0x5F) {
        output += String.fromCharCode(byt);
        continue;
      }

      if (0x61 <= byt && byt <= 0x7A) {
        output += String.fromCharCode(byt);
        continue;
      }

      // Otherwise
      output += percentEncode(byt);
    }

    // step 3
    return output;
  }

  // shim of byte serializer using encodeURIComponent
  // without Encoding API
  private _byteSerialize(input: string): string {
    input = encodeURIComponent(input);

    // revert space to '+'
    input = input.replace("%20", "+");

    // replace chars which encodeURIComponent dosen't cover
    input = input.replace("!", "%21")
                 .replace("~", "%7E")
                 .replace("'", "%27")
                 .replace("(", "%28")
                 .replace(")", "%29")

    return input
  }

  // https://url.spec.whatwg.org/#concept-urlencoded-serializer
  private serialize(pairs: pair[], encodingOverride?: string): string {
    // step 1
    if (encodingOverride === undefined) {
      encodingOverride = "utf-8";
    }

    // step 2
    var output = "";

    // step 3
    pairs.forEach((pair, index) => {
      // step 3-1
      var outputPair = copy(pair);

      // step 3-2
      if (TextEncoder !== undefined) {
        // using TextEncoder
        var encodedName = encode(outputPair.name);
        var encodedValue = encode(outputPair.value);

        // step 3-3
        outputPair.name = this.byteSerialize(encodedName);
        outputPair.value = this.byteSerialize(encodedValue);
      } else {
        // using encodeURIComponents
        outputPair.name = this._byteSerialize(outputPair.name);
        outputPair.value = this._byteSerialize(outputPair.value);
      }

      // step 3-4
      if (index !== 0) {
        output += "&";
      }

      output += outputPair.name + "=" + outputPair.value;
    });

    // step 4
    return output;
  }


  // https://url.spec.whatwg.org/#concept-urlencoded-string-parser
  /**
   * CAUTION
   * this implementation support only UTF-8 encoding
   * so ignore 'encodingOverride' and '_charset_' flag
   */
  private parse(input: USVString): pair[] {
    // var encoded = new TextEncoder("utf-8").encode(input);
    return formURLEncodedParse(input);
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
    return this.serialize(this.list);
  }
}

this.percentEncoder = percentEncoder;
this.percentDecoder = percentDecoder;
this.URLSearchParams = URLSearchParams;
