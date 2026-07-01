/**
 * @module readonly
 */

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

    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update(updated) {
        const that = this;
        const readonlyCache = {};

        // Get nodes with both static readonly attribute and dynamic data-readonly attribute
        const staticNodes = this.form
            .getRelatedNodes('readonly', '', updated)
            .get();
        const dynamicNodes = this.form
            .getRelatedNodes('data-readonly', '', updated)
            .get();

        // Combine both sets of nodes, removing duplicates
        const allNodes = [...new Set([...staticNodes, ...dynamicNodes])];

        const { valueChanged } = this.form.collections.actions;

        allNodes.forEach((node) => {
            const input = node;
            const readonlyExpr = that.form.input.getReadonly(input);
            const path = that.form.input.getName(input);

            let isReadonly;

            // If readonlyExpr is a string (dynamic expression), evaluate it
            if (typeof readonlyExpr === 'string') {
                const index = that.form.input.getIndex(input);
                // Use caching similar to required.js for performance
                const cacheIndex = `${readonlyExpr}__${path.substring(
                    0,
                    path.lastIndexOf('/')
                )}__${index}`;

                if (typeof readonlyCache[cacheIndex] === 'undefined') {
                    readonlyCache[cacheIndex] = that.form.model
                        .node(path, index)
                        .isReadonly(readonlyExpr);
                }

                isReadonly = readonlyCache[cacheIndex];
            } else {
                // readonlyExpr is a boolean (static readonly attribute check)
                isReadonly = readonlyExpr;
            }

            const $question = node.closest('.question');

            // Apply or remove readonly state
            if (isReadonly) {
                $question.classList.add('readonly');
                node.setAttribute('readonly', 'readonly');
            } else {
                $question.classList.remove('readonly');
                node.removeAttribute('readonly');
            }

            const action = valueChanged?.hasRef(path);

            // Note: the readonly-forced class is added for special readonly views of a form.
            const empty =
                !node.value &&
                !node.dataset.calculate &&
                !action &&
                !node.classList.contains('readonly-forced');

            node.classList.toggle('empty', empty && isReadonly);

            if (empty && isReadonly) {
                node.setAttribute('aria-hidden', 'true');
            } else {
                node.removeAttribute('aria-hidden');
            }
        });
    },
};
