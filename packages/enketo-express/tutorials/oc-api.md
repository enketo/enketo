## OpenClinica API

OpenClinica is using its own custom Enketo API at **/oc/api/v1** and has disabled the default Enketo Express API at /api/v2. This was done to create a cleaner, less verbose API for all views used by OC, including ones that submit data to [OpenClinica's Fieldsubmission API](https://swaggerhub.com/api/martijnr/openclinica-fieldsubmission) instead of the regular OpenRosa Submission API.

### Authentication for all /oc/api/v1/.. requests

Api authentication is done via a Authorization header using the well-known [Basic Authentication Scheme](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication) with the API key as username and an empty string as password (over https always).

### Responses for all /oc/api/v1/.. requests

A successful **POST** response (always has `url` property) with 200 or 201 HTTP status.

```xml
{
    "url": "https://enke.to/preview/::abcd"
}
```

A successful 204 **DELETE** response is an empty body with the 204 HTTP status.

Explanation of all statuscodes:

-   201: Record was created, request succeeded.
-   200: Record existed, request succeeded.
-   204: Request succeeded, empty response.
-   400: Malformed request, maybe parameters are missing.
-   401: Authentication failed, incorrect or expired API token used or none at all.
-   403: Authentication succeeded, but account is not active or quota is filled up.
-   404: Resource was not found in database.
-   405: Request not allowed. This endpoint may be disabled or not implemented.
-   410: This API endpoint is deprecated in this version.

### POST|GET /version

Returns a JSON object with a version property. No authentication **required**. No parameters supported.

### POST /survey/collect

Returns a URL that points to a regular fieldsubmission view to collect a new record. No close button present in the Discrepancy Note Widget.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `next_prompt` parameter that will add a tickbox with the `next_prompt` value (URL-decoded) above close button (on last page only).
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /survey/single/iframe](https://apidocs.enketo.org/v2#/post-survey-single-iframe)

### POST /survey/collect/c

Returns a URL that points to a regular fieldsubmission view to collect a new record. This view has a **Close button** in the Discrepancy Note Widget.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `next_prompt` parameter that will add a tickbox with the `next_prompt` value (URL-decoded) above close button (on last page only).
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as POST /survey/collect.

### POST /survey/collect/rfc

Returns a URL that points to a fieldsubmission view to collect a new record **and a reason-for-change UI**.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `next_prompt` parameter that will add a tickbox with the `next_prompt` value (URL-decoded) above close button (on last page only).
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as POST /survey/collect.

### POST /survey/collect/rfc/c

Same as POST /survey/collect/rfc except that this view has a **Close button** in the Discrepancy Note Widget.

### POST /survey/collect/participant

Returns a URL that points to a special "Participate" view to collect a new record.

-   Has a **required** `ecid` parameter with string value.

Otherwise, use exactly as POST /survey/collect.

### POST /survey/collect/full/participant

Returns a URL that points to a special "Participate" view to collect a new record.

-   Has a **required** `ecid` parameter with string value.

**Note: Submissions go to /submission-full at the OC server, and will be split into individual fieldsubmissions on the OC side.**

Otherwise, use exactly as POST /survey/collect.

### POST /survey/collect/full/offline/participant

Returns an offline-capable URL that points to a special "Participate" offline-capable view to collect a new record.

-   Has a **required** `ecid` parameter with string value.

**Note: Submissions go to /submission-full at the OC server, and will be split into individual fieldsubmissions on the OC side.**

Otherwise, use exactly as POST /survey/collect.

### POST /survey/view

Returns a URL that points to an **empty readonly** form.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `load_warning` parameter for a string value to be displayed in a modal dialog upon load.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /survey/view/iframe](http://apidocs.enketo.org/v2/#/post-survey-view-iframe)

### POST /survey/view/pdf

Returns a PDF of an empty form or a JSON error response.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /survey/view/pdf](https://apidocs.enketo.org/v2#/post-survey-view-pdf)

### POST /survey/preview

Returns a URL that points to an **empty** form preview.

-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `next_prompt` parameter that will add a tickbox with the `next_prompt` value (URL-decoded) above close button (on last page only).
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /survey/preview/iframe](http://apidocs.enketo.org/v2/#/post-survey-preview-iframe)

### POST /survey/preview/participant

Returns a URL that points to an **empty** "Participant" form preview.

-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /survey/preview/iframe](http://apidocs.enketo.org/v2/#/post-survey-preview-iframe)

### DELETE /survey/cache

Remove the cached survey transformation results from Enketo. To be used when an already-launched XForm has been edited and is re-published. Highly recommended to use this only when necessary to avoid severe loading performance degradation.

Use exactly as [DELETE /survey/cache](https://apidocs.enketo.org/v2#/delete-survey-cache)

### POST /instance/edit

Returns a URL that points to a regular webform fieldsubmission view with an **existing record**. No Close button present in the Discrepancy Note Widget.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `interface` parameter with a string value of either `"default"`, `"queries"`, or `"sdv"` that results in tweaked error messages.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /instance/iframe](http://apidocs.enketo.org/v2/#/post-instance-iframe)

### POST /instance/edit/c

Same as POST /instance/edit except that this view has a **Close button** in the Discrepancy Note Widget.

### POST /instance/edit/participant

Returns a URL that points to a special "Participate" webform fieldsubmission view with an **existing record**.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `interface` parameter with a string value of either `"default"`, `"queries"`, or `"sdv"` that results in tweaked error messages.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use as POST /instance/edit.

### POST /instance/edit/rfc

Returns a url that points to webform fieldsubmission view with an existing record **and a reason-for-change UI**. No Close button present in the Discrepancy Note widget. The record has to be marked as complete.

-   Has a **required** `ecid` parameter with string value..
-   Has an optional `pid` parameter.
-   Has an optional `jini` parameter with string value `"true"` or `"false"`. Defaults to `"false"`. Only works if jini was configured in config.json.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `interface` parameter with a string value of either `"default"`, `"queries"`, or `"sdv"` that results in tweaked error messages.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /instance/iframe](http://apidocs.enketo.org/v2/#/post-instance-iframe)

### POST /instance/edit/rfc/c

Same as POST /instance/edit/rfc except that this view has a **Close button** in the Discrepancy Note Widget.

### POST /instance/edit/incomplete/rfc

Same as POST /instance/edit/rfc except that this view works with records that are incomplete.

### POST /instance/edit/incomplete/rfc/c

Same as POST /instance/edit/incomplete/rfc except that this view has a **Close button** in the Discrepancy Note Widget.

### POST /instance/view

Returns a url that points to a **readonly** form with a record loaded into it.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `load_warning` parameter for a string value to be displayed in a modal dialog upon load.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `interface` parameter with a string value of either `"default"`, `"queries"`, or `"sdv"` that results in tweaked error messages.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /instance/view/iframe](https://apidocs.enketo.org/v2#/post-instance-view-iframe)

### POST /instance/view/pdf

Returns a PDF of a form with a record loaded into it or a JSON error response.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.

Otherwise, use exactly as [POST /instance/view/pdf](https://apidocs.enketo.org/v2#/post-instance-view-pdf)

### POST /instance/note

Returns a url that points to a readonly view of an existing record where **only the discrepancy notes widgets are enabled**, and the discrepancy notes widgets **do not have** a Close button.

-   Has a **required** `ecid` parameter with string value.
-   Has an optional `pid` parameter.
-   Has an optional `load_warning` parameter for a string value to be displayed in a modal dialog upon load.
-   Has an optional `go_to` parameter with a string value consisting of the absolute path of the question. A fragment identifier (#hash) can be added to point to a specific discrepancy note thread_id. E.g. `go_to=/path/to/node_comment#345saUDfg`.
-   Has an optional `go_to_error_url` parameter that in conjunction with `go_to` will prompt the user to redirect to a _mini form_ if the go_to target is not available or hidden.
-   Has an optional `interface` parameter with a string value of either `"default"`, `"queries"`, or `"sdv"` that results in tweaked error messages.
-   Has an optional `lang` parameter to override the default form language.

Otherwise, use exactly as [POST /instance/view/iframe](https://apidocs.enketo.org/v2#/post-instance-view-iframe)

### POST /instance/note/c

Same as POST /instance/note except that this view has a **Close button** in the Discrepancy Note Widget.

### POST /instance/headless

Loads a record headlessly, adds autoqueries and submits.

The result object has a `"message"` and if it was succesful also a `"fieldsubmissions"` property. The `"message"` value contains an error message if the HTTP response is not `200` or `201` (otherwise the value is "OK"). The `"fieldsubmissions"` value is the number of fieldsubmissions that were successfully submitted if there was no loading or submission error (otherwise this property is absent). For example:

```json
{
    "message": "OK",
    "fieldsubmissions": 1
}
```

Otherwise, use like [POST /instance/edit](#post-instanceedit) (without `return_url` and `go_to` parameters)

### POST /instance/headless/rfc

Loads a completed record headlessly, adds autoqueries and submits.

The result object has a `"message"` and if it was succesful also a `"fieldsubmissions"` property. The `"message"` value contains an error message if the HTTP response is not `200` or `201` (otherwise the value is "OK"). The `"fieldsubmissions"` value is the number of fieldsubmissions that were successfully submitted if there was no loading or submission error (otherwise this property is absent). For example:

```json
{
    "message": "OK",
    "fieldsubmissions": 1
}
```

Otherwise, use like [POST /instance/edit/rfc](#post-instanceeditrfc) (without `return_url` and `go_to` parameters)

### DELETE /instance

Removes cached instance. This method may not have a practical use as instances POSTed to enketo for editing are only cached/saved very briefly (see [expiry for record cache](https://github.com/enketo/enketo-express/tree/master/config#expiry-for-record-cache) ).

Use exactly as [DELETE /instance](https://apidocs.enketo.org/v2#/delete-instance)
