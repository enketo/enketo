Openrosa XForms Evaluator
=========================

<a href="https://travis-ci.org/medic/openrosa-xpath-evaluator"><img src="https://travis-ci.org/medic/openrosa-xpath-evaluator.svg?branch=master"/></a>

Wrapper for browsers' XPath evaluator with added support for OpenRosa extensions.

For more info on extended XPath expressions/bindings supported by XForms/OpenRosa/OpenDataKit (ODK) see:

* [ODK XForm Specification](https://opendatakit.github.io/odk-xform-spec/)
* [OpenDataKit Binding documentation](https://opendatakit.org/help/form-design/binding/)
* [JavaRosa XPath functions](https://bitbucket.org/javarosa/javarosa/wiki/xform)

# Limitations

Any expression made requesting a node-type result will be delegated to the underlying xpath evaluator.

Also, the expression parser is currently very basic and will fail for some xpath expressions.  Some examples of expressions that are and are not supported follow.

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


## Unsupported XPath expressions:

(Add any examples of known-unsupported expressions here and to `test/extended-xpath.spec.js`.)
