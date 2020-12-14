Openrosa XForms Evaluator
=========================

<a href="https://travis-ci.org/medic/openrosa-xpath-evaluator"><img src="https://travis-ci.org/medic/openrosa-xpath-evaluator.svg?branch=master"/></a>

Wrapper for browsers' XPath evaluator with added support for OpenRosa extensions.

For more info on extended XPath expressions/bindings supported by XForms/OpenRosa/OpenDataKit (ODK) see:

* [ODK XForm Specification](https://opendatakit.github.io/odk-xform-spec/)
* [OpenDataKit Binding documentation](https://opendatakit.org/help/form-design/binding/)
* [JavaRosa XPath functions](https://bitbucket.org/javarosa/javarosa/wiki/xform)


## Getting Started

  1. Include with `npm install openrosa-xpath-evaluator --save` or manually download and add [dist/orxe.min.js](https://raw.github.com/medic/openrosa-xpath-evaluator/master/dist/orxe.min.js) file.

  2. Include orxe.min.js in the \<head> of your HTML document.
     NOTE: Make sure HTML document is in strict mode i.e. it has a !DOCTYPE declaration at the top!

  2. Initialize orxe:

    ```js
    // bind XPath methods to document and window objects
    // NOTE: This will overwrite native XPath implementation if it exists
    orxe.bindDomLevel3XPath();
    ```

  3. You can now use XPath expressions to query the DOM:

    ```js
    var result = document.evaluate(
        '//ul/li/text()', // XPath expression
        document, // context node
        null, // namespace resolver
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
    );

    // loop through results
    for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        alert(node.nodeValue);
    }
    ```

# External Libraries
This library does not depend on any external libraries.
But the odk digest function can be supported by installing the node-forge library.

## Supported XPath expressions:

* `/model/instance[1]//*`
* `/model/instance[1]/*/meta/*`
* `./author`
* `author`
* `first.name`
* `/bookstore`
* `//author`
* `author/first-name`
* `bookstore//title`
* `bookstore/*/title`
* `bookstore//book/excerpt//emph`
* `.//title`
* `author/*`
* `book/*/last-name`
* `@style`
* `price/@exchange`
* `price/@exchange/total`
* `book[@style]`
* `book/@style`
* `./first-name`
* `first-name`
* `author[1]`
* `author[first-name][3]`
* `my:book`
* `x/y[1]`
* `x[1]/y[2]`
* `book[excerpt]`
* `book[excerpt]/title`
* `book[excerpt]/author[degree]`
* `book[author/degree]`
* `author[degree][award]`
* `ancestor::book[1]`
* `ancestor::book[author][1]`
* `ancestor::author[parent::book][1]`
* `*/*`
* `*[@specialty]`
* `@*`
* `@my:*`
* `my:*`
* `author[degree and award]`
* `author[(degree or award) and publication]`
* `author[degree and not(publication)]`
* `author[not(degree or award) and publication]`
* `author[. = "Matthew Bob"]`
* `author[last-name = "Bob" and ../price &gt; 50]`
* `author[not(last-name = "Bob")]`
* `author[first-name = "Bob"]`
* `author[last-name = "Bob" and first-name = "Joe"]`
* `author[* = "Bob"]`
* `author[last-name = "Bob"]`
* `author[last-name[1] = "Bob"]`
* `author[last-name [position()=1]= "Bob"]`
* `book[last()]`
* `book/author[last()]`
* `book[position() &lt;= 3]`
* `book[/bookstore/@specialty=@style]`
* `degree[position() &lt; 3]`
* `degree[@from != "Harvard"]`
* `p/text()[2]`
* `price[@intl = "Canada"]`
* `x/y[position() = 1]`
* `(book/author)[last()]`
* `(x/y)[1]`
* `today() < (today() + 1)
* `today() < '1970-06-03'
* `today() + 1 < '1970-06-03'
* `today() + 1 > '1970-06-03'
* `../some-path='some-value'`
* `'some-value'=../some-path`
* `/simple/xpath/to/node < today() + 1`
* `"aardvark" < "aligator"`
* `self::node()`
* `namespace::node()`
* `child::node()`
* `descendant::node()`
* `descendant-or-self::node()`
* `parent::node()`
* `following-sibling::node()`
* `preceding-sibling::node()`
* `namespace::node()`
* `preceding-sibling::node()`
* `following::node()`
* `preceding::node()`
* `attribute::node()`
* `boolean('a')`
* `boolean('')`
* `boolean(true())`
* `boolean(false())`
* `boolean(1)`
* `boolean(-1)`
* `boolean(1 div 0)`
* `boolean(0.1)`
* `boolean('0.0001')`
* `boolean(0)`
* `boolean(0.0)`
* `boolean(number(''))`
* `boolean(/xhtml:html)`
* `boolean(/asdf)`
* `boolean(//xhtml:article)`
* `boolean(self::node())`
* `ceiling(-1.55)`
* `ceiling(2.44)`
* `ceiling(0.001)`
* `ceiling(1.5)`
* `id('ComparisonOperatorCaseNodesetNegative5to5')/* < * `
* `lang('en')`
* `lang('EN-us')`
* `attribute::*`
* `namespace::*`
* `child::*`
* `ancestor-or-self::*`
* `namespace::ns2:*`
* `namespace::ns2:ns2`
* `attribute::attrib3`
* `child::node()`
* `child::text()`
* `child::comment()`
* `child::processing-instruction()`
* `child::processing-instruction('custom-process-instruct')`
* `id('FunctionNodesetIdCaseSimple')`
* `last()`
* `xhtml:p[last()]`
* `last(1)`
* `*[position()=last()]`
* `count(xhtml:p)`
* `local-name(namespace::node())`
* `local-name(1, 2)`
* `local-name(1)`
* `namespace-uri(1, 2)`
* `namespace-uri(1)`
* `number(-1.0)`
* `number(1)`
* `number(0.199999)`
* `sum(1, 2)`
* `ceiling(-1.55)`
* `round(-1.55)`
* `sum(self::*)`
* `sum(*)`
* `sum(node())`
* `string('As Df')`
* `string(attribute::node()[1])`
* `string(namespace-uri(/*))`
* `string(namespace::node())`
* `starts-with('a', '')`
* `contains('asdf', 'sd')`
* `substring-before('ab', 'a')`
* `substring-after('aab', 'a')`
* `substring('12345', 2)`
* `string-length('a')`
* `normalize-space('  a')`
* `translate('aabb', 'ab', 'ba')`
* `id('eee40') | id('eee20') | id('eee25') | id('eee10') | id('eee30') | id('eee50')`
* `id('eee40')/attribute::*[1] | id('eee30')`
* `id('nss25')/namespace::*`
* `id('nss40')/namespace::* | id('nss40')/namespace::*`
* `abs(10.5)`
* `area("7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0;7.925 -11.578 0 0;7.9267 -11.5722 0 0;7.9325 -11.5708 0 0;7.9372 -11.5737 0 0;7.9393 -11.579 0 0;7.9377 -11.5845 0 0")`
* `distance("7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0;7.925 -11.578 0 0;7.9267 -11.5722 0 0;7.9325 -11.5708 0 0;7.9372 -11.5737 0 0;7.9393 -11.579 0 0;7.9377 -11.5845 0 0")`
* `boolean-from-string('whatever')`
* `checklist(-1, 2, 2>1)`
* `coalesce(/simple/xpath/to/node, "whatever")`
* `coalesce("FIRST", "whatever")`
* `count-non-empty(//xhtml:div[@id="FunctionCountNonEmpty"]/xhtml:div)`
* `count-selected(self::node())`
* `date-time('1970-01-01')`
* `number(date('1970-01-01'))`
* `date('2100-01-02') > now()`
* `today() > ('2012-01-01' + 10)`
* `decimal-date-time("1969-12-31T00:00:00Z")`
* `decimal-date("1969-12-31")`
* `decimal-time("06:60:00.000-07:00")`
* `digest("abc", "MD5", "hex")`
* `ends-with("ba", "a")`
* `false("a")`
* `floor(-1.005)`
* `format-date-time("2001-12-31", "%b %e, %Y")`
* `if(true(), 5, "abc")`
* `if(self::node(), "exists", "does not exist")`
* `int(/simple/xpath/to/node)`
* `int(7.922021953507237e-12)`
* `join(" :: ", //item)`
* `join(" ", "This", "is", "a", "sentence.")`
* `max(/simple/xpath/to/node)`
* `max(self::*)`
* `max(*)`
* `min(/simple/xpath/to/node)`
* `not(true())`
* `not(false())`
* `once("aa")`
* `once(. * 10)`
* `position(..)`
* `position(.)`
* `position(../..)`
* `pow(/simple/xpath/to/node, 0)`
* `pow(2.5, 2)`
* `random()`
* `randomize(//xhtml:div[@id="FunctionRandomize"]/xhtml:div, 'a')`
* `regex(/simple/xpath/to/node, "[0-9]{3}")`
* `round("-50.55", "-2")`
* `selected-at('zero one two three', '4')`
* `selected("apple baby crimson", "  baby  ")`
* `substr(/simple/xpath/to/node, 5)`
* `sum(*)`
* `sum(self::*)`
* `sum(node())`
* `sum(*)`
* `sum(/root/item)`
* `sin(2)`
* `cos(2)`
* `tan(2)`
* `acos(0.5)`
* `asin(0.5)`
* `atan(0.5)`
* `log(2)`
* `log10("a")`
* `pi()`
* `exp(2)`
* `exp10(2)`
* `sqrt(4)`
* `uuid()`
* `uuid(6)`
* `weighted-checklist(-1, 2, 2>1, 2)`



## Unsupported XPath expressions:

(Add any examples of known-unsupported expressions here and to `test/extended-xpath.spec.js`.)

## Support for custom functions:
To support custom functions, this library can be extended with the following.

```
orxe.customXPathFunction.add('comment-status', function(a) {
  if(arguments.length !== 1) throw new Error('Invalid args');
  const curValue = a.v[0]; // {t: 'arr', v: [{'status': 'good'}]}
  const status = JSON.parse(curValue).status;
  return new orxe.customXPathFunction.type.StringType(status);
});
```

The arguments passed to the custom function (string, number, xpath) will determine the
arguments passed by the library to the function implementation.
The argument format will be any of these:
```
{t: 'arr', v:[]}
{t: 'num', v:123}
{t: 'str', v:'123'}
```

The return types currently supported are these:
```
orxe.customXPathFunction.type.StringType
orxe.customXPathFunction.type.NumberType
orxe.customXPathFunction.type.BooleanType
orxe.customXPathFunction.type.DateType
```

## Configuration support
The library can be configured with:
```
orxe.config = {
  allowStringComparison: false,
  includeTimeForTodayString: false,
  returnCurrentTimeForToday: false
};
```

#### allowStringComparison (default: false)
This flag allows comparing expressions like this: 'bcd' > 'abc'.

#### includeTimeForTodayString (default: false)
This flag allows the inclusion of time for today() expressions that expect XPathResult.STRING_TYPE.

#### returnCurrentTimeForToday (default: false)
This flag allows time to be considered for today() expressions that expect XPathResult.ANY_TYPE, XPathResult.NUMBER_TYPE, etc.
