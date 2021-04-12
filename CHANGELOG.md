Change Log
=========
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

[Unreleased]
------------------------
##### Fixed
- Using `node()` mid-axis, causes an exception.
- The `ends-with()` function causes an exception when the first parameter is a node.
- Using `not()` with an empty node-set parameter returns `false`.

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