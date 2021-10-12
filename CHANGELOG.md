Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[2.0.9] - 2021-10-11
---------------------
##### Fixed
- `decimal-date-time()` treated as local time when no offset specified 

[2.0.8] - 2021-09-10
---------------------
##### Fixed
- Convert date extensions to plain functions

[2.0.7] - 2021-07-13
---------------------
##### Fixed
- Inconsistencies with date-as-string result formats.
- Result of if() is no longer cast to a string (recently updated ODK XForms spec).

[2.0.6] - 2021-04-20
---------------------
##### Removed
- `decimal-date()` function (as it was an accident and is not in the spec).

##### Fixed
- Using `decimal-time()` with a node-set parameter fails.
- The not-equals operator fails when preceded by a node-set without a trailing space.
- Using `uuid()` with a node-set parameter fails.

[2.0.5] - 2021-04-12
---------------------
##### Fixed
- Using `node()` mid-axis, causes an exception.
- Using `ends-with()` with a node parameter causes an exception.
- Using `not()` with an empty node-set parameter returns `false`.
- Using `uuid()` with a node parameter fails.
- Using `exp()`, `exp10()`, `log()`, `log10()`, `sqrt()` with node-set parameters returns incorrect results.
- Using `randomize()` with a non-nodeset parameter does not throw an error.

[2.0.4] - 2021-04-02
------------------------
##### Fixed
- Native XPath functions do not handle node-set arguments.

[2.0.3] - 2021-03-18
------------------------
##### Fixed
- Exception occurs with lazy evaluation of and-or statements.

[2.0.2] - 2021-01-18
------------------------
##### Changed
- The uuid() function implementation has improved with a reduced chance of collisions.

##### Fixed
- Nested expressions with dead branches cause an exception.

[2.0.1] - 2021-01-07
------------------------
##### Fixed
- Lazy and/or evaluation within function arguments.

[2.0.0] - 2020-12-22
-----------------------
##### Added
- Full support for XPath as included in the ODK XForms Spec (when used in Enketo Core).