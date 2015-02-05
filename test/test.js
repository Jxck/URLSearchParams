var URLSearchParams = URLSearchParams || require('../urlsearchparams').URLSearchParams;

// tests
function assert(actual, expected) {
  console.log('.');
  console.assert(actual === expected, '\nact: ' + actual + '\nexp: ' + expected);
}

// function TestPercentEncoding() {
//   ['aAzZ09',
//    '~`!@',
//    '#$%^&',
//    '*()_+-=',
//    '{}|[]\:',
//    ';"<>?,./',
//    "'",
//    'あ亞',
//    '叱𠮟',
//    '🍻',
//    '',
//    'aAzZ09%E3%81%82%F0%A0%AE%9F%E5%8F%B1='
//   ].forEach(function(expected) {
//     var actual = percentDecoder(percentEncoder(expected));
//     assert(actual, expected);
//   });
// }

function constructorTest(urlsearchparams) {
  [
   // TODO:
   // ['', ''],
   // [null, ''],
   ['a=b&c=d', 'a=b&c=d'],
   ['a=b&a=d', 'a=b&a=d'],
   ['aAzZ09あ𠮟叱' , 'aAzZ09%E3%81%82%F0%A0%AE%9F%E5%8F%B1='],
   [' *-._', '+*-._='],
   ["!~'()", '%21%7E%27%28%29=']
  ].forEach(function(e) {
    var s = new urlsearchparams(e[0]);
    assert(s.toString(), e[1]);
  });
}

function apiTest(urlsearchparams) {
  // append
  var s = new urlsearchparams();
  s.append('a', 'b');
  s.append('c', 'd');
  assert(s.toString(), 'a=b&c=d');
  s.append('a', 'b');
  assert(s.toString(), 'a=b&c=d&a=b');

  var s = new urlsearchparams('a=b');
  s.append('a', 'b');
  assert(s.toString(), 'a=b&a=b');

  // get
  var s = new urlsearchparams('a=b');
  assert(s.get('a'), 'b');

  var s = new urlsearchparams('a=b&a=c');
  assert(s.get('a'), 'b');
  assert(s.get('b'), null);
  s.append('a', 'd');
  assert(s.get('a'), 'b');

  // getAll
  var s = new urlsearchparams('a=b&b=c&a=c');
  var all = s.getAll('a');
  assert(all.length, 2);
  assert(all[0], 'b');
  assert(all[1], 'c');
  assert(s.getAll('z').length, 0);

  // set
  var s = new urlsearchparams('a=b&b=c&a=c');
  s.set('a', 'd');
  var all = s.getAll('a');
  assert(all.length, 1);
  assert(all[0], 'd');
  assert(s.toString(), 'a=d&b=c');

  // delete
  var s = new urlsearchparams('a=b&a=c&x=y');
  s.delete('a');
  var all = s.getAll('a');
  assert(all.length, 0);

  s.delete('z');
  assert(s.get('x'), 'y');

  // has
  var s = new urlsearchparams('a=b&a=c&x=y');
  assert(s.has('a'), true);
  assert(s.has('x'), true);
  assert(s.has('z'), false);
}

function storyTest(urlsearchparams) {
  // from https://developer.mozilla.org/ja/docs/Web/API/URLSearchParams
  var paramsString = 'q=URLUtils.s&topic=api';
  var s = new urlsearchparams(paramsString);

  assert(s.has('topic'), true);
  assert(s.get('topic'), 'api');
  assert(s.getAll('topic')[0], 'api');
  assert(s.get('foo'), null); // true

  s.append('topic', 'webdev');
  assert(s.toString(), 'q=URLUtils.s&topic=api&topic=webdev');

  s.delete('topic');
  assert(s.toString(), 'q=URLUtils.s');
}

function argumentsErrorTest(urlsearchparams) {
  var error_message = 'Not enough arguments to URLSearchParams';
  var s = new urlsearchparams();

  // append
  try {
    s.append('a', undefined);
  } catch (err) {
    assert(err.message, error_message + '.append.');
  }

  try {
    s.append(undefined, 'b');
  } catch (err) {
    assert(err.message, error_message + '.append.');
  }

  try {
    s.append(undefined, undefined);
  } catch (err) {
    assert(err.message, error_message + '.append.');
  }

  // get
  try {
    s.get(undefined);
  } catch (err) {
    assert(err.message, error_message + '.get.');
  }

  // getAll
  try {
    s.getAll(undefined);
  } catch (err) {
    assert(err.message, error_message + '.getAll.');
  }

  // set
  try {
    s.set('a', undefined);
  } catch (err) {
    assert(err.message, error_message + '.set.');
  }

  try {
    s.set(undefined, 'b');
  } catch (err) {
    assert(err.message, error_message + '.set.');
  }

  try {
    s.set(undefined, undefined);
  } catch (err) {
    assert(err.message, error_message + '.set.');
  }

  // has
  try {
    s.has(undefined);
  } catch (err) {
    assert(err.message, error_message + '.has.');
  }

  // delete
  try {
    s.delete(undefined);
  } catch (err) {
    assert(err.message, error_message + '.delete.');
  }
}

(function TestURLSearchParams() {
  try {
    // TestPercentEncoding();

    constructorTest(URLSearchParams);
    apiTest(URLSearchParams);
    storyTest(URLSearchParams);
    argumentsErrorTest(URLSearchParams);

    // compat
    if (typeof nativeURLSearchParams !== 'undefined') {
      constructorTest(nativeURLSearchParams);
      apiTest(nativeURLSearchParams);
      storyTest(nativeURLSearchParams);
      argumentsErrorTest(nativeURLSearchParams);
    }

  } catch (err) {
    console.error(err);
  }
})();
