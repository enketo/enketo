Openrosa XForms Evaluator
=========================

<a href="https://travis-ci.org/enketo/openrosa-xpath-evaluator"><img src="https://travis-ci.org/enketo/openrosa-xpath-evaluator.svg?branch=master"/></a>

Wrapper for browsers' XPath evaluator with added support for OpenRosa extensions.

For more info on extended XPath expressions/bindings supported by XForms/OpenRosa/OpenDataKit (ODK) see:

* [ODK XForm Specification](https://getodk.github.io/xforms-spec/)


# Installation

## yarn

    yarn add openrosa-xpath-evaluator

## npm

    npm install --save openrosa-xpath-evaluator

# Use

## Initialisation

    ```js
    const orxe = require('openrosa-xpath-evaluator');
    const evaluate = orxe();
    ```

## Querying

    ```js
    var result = evaluate(
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


# Dependencies

This library has no explicit dependencies, but expects various DOM & XPath-related values to be supplied by the browser (`Element`, `Node`, `XPathResult` etc.).

To use the [ODK `digest()` function](https://getodk.github.io/xforms-spec/#fn:digest),
you'll need to add [`node-forge`](https://www.npmjs.com/package/node-forge) to
your project.


# Development

## Useful resources

* https://www.w3.org/TR/1999/REC-xpath-19991116/
* https://getodk.github.io/xforms-spec/
* https://developer.mozilla.org/en-US/docs/Web/API/XPathEvaluator
* https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate
* https://developer.mozilla.org/en-US/docs/Web/XPath/Introduction_to_using_XPath_in_JavaScript
* https://developer.mozilla.org/en-US/docs/Web/API/XPathResult
* https://developer.mozilla.org/en-US/docs/Web/API/Node


# Known limitations

* namespace:: axis is not supported (but it might work in your browser if you're lucky)
* xpath variables (`$var`) are not supported


# Not implemented

The following XPath/ODK/OpenRosa functions are not implemented in this library, but may still work depending on your usage.

## XPath 1.0 functions

* instance()
* current()

## ODK functions

* pulldata()
* jr:choice-name()
* jr:itext()
* indexed-repeat()


# TODO

* arrange source code, e.g. `src/core` and `src/openrosa`

# Acknowledgement

This library was developed by Medic Mobile for their Enketo-based application. In 2020, it was transferred to the Enketo organization. Many thanks to Medic Mobile for this very valuable contribution to the Enketo and ODK world.

Development of this application was made possible by:

* [Medic Mobile](http://medicmobile.org/)
* [DIAL Open Source Center](https://www.osc.dial.community/)
* [OpenClinica](https://www.openclinica.com/)
