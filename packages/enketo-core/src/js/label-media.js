/**
 * Label media module.
 *
 * Audio and video in labels is not preloaded, because loading many
 * media elements at once makes some of them fail (e.g. in Safari). To still show
 * e.g. the duration, an element's metadata is loaded once it becomes visible.
 *
 * @module label-media
 */

const LABEL_MEDIA_SELECTOR = 'audio[data-itext-id], video[data-itext-id]';

export default {
    /** @type {IntersectionObserver | null} */
    intersectionObserver: null,

    /** @type {MutationObserver | null} */
    mutationObserver: null,

    init() {
        const formEl = this.form.view.html;

        if (typeof IntersectionObserver !== 'undefined') {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(({ isIntersecting, target }) => {
                    if (isIntersecting) {
                        target.preload = 'metadata';
                        this.intersectionObserver.unobserve(target);
                    }
                });
            });
        }

        this.observe(formEl);

        // Media can be added or removed later, e.g. in repeat instances or itemsets.
        // Removals are handled first, so that moved media is observed again.
        this.mutationObserver = new MutationObserver((records) => {
            records.forEach(({ addedNodes, removedNodes }) => {
                removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.unobserve(node);
                    }
                });
                addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.observe(node);
                    }
                });
            });
        });
        this.mutationObserver.observe(formEl, {
            childList: true,
            subtree: true,
        });
    },

    /**
     * @param {Element} container - element that is, or contains, media elements
     * @return {Element[]} label media elements
     */
    getMediaElements(container) {
        return container.matches(LABEL_MEDIA_SELECTOR)
            ? [container]
            : [...container.querySelectorAll(LABEL_MEDIA_SELECTOR)];
    },

    /**
     * @param {Element} container - element that is, or contains, media elements
     */
    observe(container) {
        this.getMediaElements(container).forEach((element) => {
            // Forms transformed before preload="none" was added to the XSL.
            if (!element.hasAttribute('preload')) {
                element.preload = 'none';
            }

            if (element.preload === 'none' && this.intersectionObserver) {
                this.intersectionObserver.observe(element);
            }
        });
    },

    /**
     * @param {Element} container - element that is, or contains, media elements
     */
    unobserve(container) {
        if (!this.intersectionObserver) {
            return;
        }

        this.getMediaElements(container).forEach((element) => {
            this.intersectionObserver.unobserve(element);
        });
    },

    disconnect() {
        this.intersectionObserver?.disconnect();
        this.mutationObserver?.disconnect();
    },
};
