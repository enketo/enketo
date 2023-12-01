// Modify the Enketo Core Required Module.

import requiredModule from 'enketo-core/src/js/required';

import $ from 'jquery';

/**
 * Updates required "*" visibility
 *
 * @param  {{nodes:Array<string>=, repeatPath: string=, repeatIndex: number=}=} updated - The object containing info on updated data nodes
 */

requiredModule.update = function (updated) {
    const that = this;
    // A "required" update will never result in a node value change so the expression evaluation result can be cached fairly aggressively.
    const requiredCache = {};

    if (!this.form) {
        throw new Error(
            'Required module not correctly instantiated with form property.'
        );
    }

    let $nodes = this.form.getRelatedNodes('data-required', '', updated);
    // Here we add the changed node itself as well (not in Enketo Core, because in Enketo Core we don't take a value into consideration
    // to determine when to show the asterisk.
    $nodes = $nodes
        .add(this.form.getRelatedNodes('name', '[data-required]', updated))
        .add(
            this.form.getRelatedNodes('data-name', '[data-required]', updated)
        );

    const repeatClonesPresent =
        this.form.repeatsPresent &&
        !!this.form.view.html.querySelector('.or-repeat.clone');

    $nodes.each(function () {
        const $input = $(this);
        const control = this;
        let value = that.form.input.getVal(control); // String or Array!

        if (typeof value === 'string') {
            value = value.trim();
        }
        let hide = !!value.length;

        if (!hide) {
            const requiredExpr = that.form.input.getRequired(control);
            const path = that.form.input.getName(control);
            // Minimize index determination because it is expensive.
            const index = repeatClonesPresent
                ? that.form.input.getIndex(control)
                : 0;
            // The path is stripped of the last nodeName to record the context.
            // This might be dangerous, but until we find a bug, it improves performance a lot in those forms where one group contains
            // many sibling questions that each have the same required expression.
            const cacheIndex = `${requiredExpr}__${path.substring(
                0,
                path.lastIndexOf('/')
            )}__${index}`;

            if (typeof requiredCache[cacheIndex] === 'undefined') {
                requiredCache[cacheIndex] = that.form.model
                    .node(path, index)
                    .isRequired(requiredExpr);
            }
            hide = !requiredCache[cacheIndex];
        }

        $input.closest('.question').find('.required').toggleClass('hide', hide);
    });
};
