# Customizations

This is an overview of the customizations that were made in this fork.

### Discrepancy Note Widget

Multi-threaded widget that builds upon Enketo's basic comment widget. The widget enables users to discuss data, add queries or annotations (2 different note types) to individual questions, and view a log of various events such as value changes. Ability to Close or Reopen a query thread is restricted to specific user roles.
We automatically update all constraint and required logic (after Pyxform conversion) to include clauses for the item's query status. If an item has New, Updated, or Closed Query status, the constraint/required error message is suppressed. We added a new status (closed-modified) that is automatically assigned to a close Query thread when the item value changes to ensure that the error message can be displayed again in the future after the query has been closed.

[add screenshot]

### Handling Non-relevant questions that have values

As a rule, items with user-entered data are never hidden due to being irrelevant to ensure that users know what data exists in the record and do not mistakenly clear a section of data due to an errant click. If an item evaluates as non-relevant and is not null, a special error message is shown for the item. Calculated values can be cleared when an item/group becomes non-relevant under the assumption that it will be recalculated again if the item/group becomes relevant again.

### Strict required and strict constraints

Two additional 'strict' required and constraint types were added.
If a value is entered and it causes the item to have a strict constraint/required fire, the value is rejected before being added to the model and an error popup appears. The item remains at its previous value. If a value is entered and it causes a different item to have a strict constraint/required fire, that other item displays an error message with a different background color. That error cannot be suppressed by adding queries. While a strict constraint/required error is active, the user is prevented from navigating forward in the form or using the Complete button.
These allow for better assurance that critical bad data/missing data cannot be submitted while our query model allows for standard validation checks to be resolved by adding a query.

### Multiple constraints

Support for multiple constraints to be added shortly.
Separate constraint logic can be added (each with its own constraint message). These additional constraints cannot be defined as strict. The goal is to allow distinct constraint messages for each constraint condition to be defined directly as part of the item definition.
Longer term, we are also planning to link different query threads for an item to each constraint. This would allow the system to automatically reopen an existing query thread if needed if the constraint related to that thread fires again in the future. Eventually, it would also allow for individual query threads to be auto-closed if the associated constraint logic is no longer firing.

### User confirmation before deleting a repeat

Users are prompted to confirm their action when they click the button to remove a repeating group entry so that data is not deleted accidentally.

### Required '\*' visibility

When an item is currently required and currently blank, a red asterisk is displayed for that item. When the required condition is not met or the item has a non-null value, the asterisk is not displayed. This identifies required items that still need values to be entered without showing the required validation message.

### API

This fork is using an alternative API (/oc/api/v1) that returns the specific 'fieldsubmission' and headless views without interfering with the standard Enketo webform views. See [add link to doc].

### Fieldsubmissions

Whenever an individual field changes a submission of that field (XML fragment) is submitted. The whole XML record is never submitted. The server-side API (implemented in OC's backend is documented here [ add link]).
Submitting individual values in real time ensures that data is not lost if a user loses their connection or times out. Several other features described here are at least somewhat driven by the presence of the field submission feature.

#### Close vs Complete

In the normal view, each form has a Close button on each page and a Complete button on the last page. The Complete button is used to signify that data entry is finished for the form. Any form can be closed. If validation errors are present for any items (excluding non-strict required errors) the user will be prompted to go back and fix them or proceed and let the system submit autoqueries for each item with an error.
Once a form has been marked as complete, future changes will require the user to enter a Reason for Change. Users are prevented from marking a form as complete if the following error conditions are present: strict required, strict constraint, and relevant errors. Currently any non-strict required or constraint error will also prevent marking a form complete, but we plan to change this and allow the user to add autoqueries if only these validation errors are present so that they can proceed through forms more efficiently.
For forms opened as already complete, only the Close button is present. When the user closes the form, they will be prompted to fix any errors or allow the system to add autoqueries.

### Reason for Change

When a form is opened as Complete, any data change will require a Reason for Change. This displays a message at each item changed and causes a Reason for Change section to appear at the bottom of the page. The user cannot leave the page or close the form without supplying a Reason or Change for each changed item (or entering a reason and choosing Apply to All).

### Add Next Form

Forms can be opened with an optional parameter to indicate the name of the next form to be opened in sequence. If present, a checkbox is displayed above the Close button on the last page to allow the user to decide whether to navigate directly to the next form or return to the primary OC UI. The status of the checkbox is sent back on Close or Complete so that OC can redirect the user appropriately.

### Headless functionality

API endpoints were added that can process imported data headlessly, run calculations and submit the results, validate the data and add autoqueries to discrepancy note questions as if the form were opened by a user and the user closed the form and chose to have the system add autoqueries.
This is used for many cases, such as when data was imported from an external source and when data originally entered on version 1 of a form is migrated to version 2 of the form. Headless mode allows calculations and queries to be performed as if a user had opened the form manually.

### Theme and styling

An OpenClinica theme was added that slightly tweaks the Formhub/Kobo themes. In addition, several styling changes are made across themes, but primarily to deal with requirements of the customizations described in this document.

### Translations

A mechanism existing in the standard Enketo Express is used to add additional translation strings to the standard strings without augmenting the original files.
