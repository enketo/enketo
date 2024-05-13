/**
 * Deals with form logic around required questions.
 *
 * @module required
 */

import $ from 'jquery';

/**
 * @typedef {import('./form').Form} Form
 */

export default {
    /**
     * @type {Form}
     */
    // @ts-expect-error - this will be populated during form init, but assigning
    // its type here improves intellisense.
    form: null,

    init() {
        if (!this.form) {
            throw new Error(
                'Required module not correctly instantiated with form property.'
            );
        }

        if (!this.form.features.required) {
            this.update = () => {
                // Form noop
            };
        }

        this.update();
    },

    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update(updated /* , filter */) {
        const that = this;
        // A "required" update will never result in a node value change so the expression evaluation result can be cached fairly aggressively.
        const requiredCache = {};

        const $nodes = this.form
            .getRelatedNodes('data-required', '', updated)
            // Here OC adds the changed node itself as well (not in Enketo Core, because in Enketo Core we don't take a value into consideration
            // to determine when to show the asterisk.
            .add(this.form.getRelatedNodes('name', '[data-required]', updated))
            .add(
                this.form.getRelatedNodes(
                    'data-name',
                    '[data-required]',
                    updated
                )
            );

        $nodes.each(function () {
            const $input = $(this);
            const input = this;
            let value = that.form.input.getVal(input); // String or Array!

            if (typeof value === 'string') {
                value = value.trim();
            }
            let hide = !!value.length;

            if (!hide) {
                const requiredExpr = that.form.input.getRequired(input);
                const path = that.form.input.getName(input);
                // Minimize index determination because it is expensive.
                const index = that.form.input.getIndex(input);
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

            $input
                .closest('.question')
                .find('.required')
                .toggleClass('hide', hide);
        });
    },
};
