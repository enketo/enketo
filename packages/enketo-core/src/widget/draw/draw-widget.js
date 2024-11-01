import $ from 'jquery';
import fileManager from 'enketo/file-manager';
/**
 * @external SignaturePad
 */
import SignaturePad from 'signature_pad';
import { t } from 'enketo/translator';
import dialog from 'enketo/dialog';
import support from '../../js/support';
import events from '../../js/event';
import Widget from '../../js/widget';
import { dataUriToBlobSync, getFilename } from '../../js/utils';
import downloadUtils from '../../js/download-utils';

/**
 * Widget to obtain user-provided drawings or signature.
 *
 * @augments Widget
 */
class DrawWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        // note that the selector needs to match both the pre-instantiated form and the post-instantiated form (type attribute changes)
        return '.or-appearance-draw input[data-type-xml="binary"][accept^="image"], .or-appearance-signature input[data-type-xml="binary"][accept^="image"], .or-appearance-annotate input[data-type-xml="binary"][accept^="image"]';
    }

    _init() {
        const existingFilename = this.element.dataset.loadedFileName;

        this.element.type = 'text';
        this.element.dataset.drawing = true;

        this.element.after(this._getMarkup());
        const { question } = this;

        question.classList.add(`or-${this.props.type}-initialized`);

        this.$widget = $(question.querySelector('.widget'));

        this.canvas = this.$widget[0].querySelector(
            '.draw-widget__body__canvas'
        );
        this.resizeObserver = new ResizeObserver(this._resizeCanvas.bind(this));
        this.promisedRedrawPad = Promise.resolve();

        if (this.props.load) {
            this._handleFiles(existingFilename);
        }

        this.initialize = fileManager.init().then(() => {
            this.pad = new SignaturePad(this.canvas, {
                penColor: this.props.colors[0] || 'black',
            });
            this.pad.addEventListener(
                'endStroke',
                this._updateValue.bind(this)
            );
            this.pad.off();
            if (existingFilename) {
                this.element.value = existingFilename;

                this._resizeCanvas();
                return this._loadFileIntoPad(existingFilename).then(
                    this._updateDownloadLink.bind(this)
                );
            }

            return true;
        });
        this.disable();
        this.initialize
            .then(() => {
                const that = this;
                that.$widget
                    .find('.btn-reset')
                    .on('click', that._reset.bind(that))
                    .end()
                    .find('.draw-widget__colorpicker')
                    .on('click', '.current', function () {
                        $(this).parent().toggleClass('reveal');
                    })
                    .on('click', '[data-color]:not(.current)', function () {
                        $(this)
                            .siblings()
                            .removeClass('current')
                            .end()
                            .addClass('current')
                            .parent()
                            .removeClass('reveal');
                        that.pad.penColor = this.dataset.color;
                    })
                    .end()
                    .find('.draw-widget__undo')
                    .on('click', () => {
                        const data = that.pad.toData();
                        if (data) {
                            data.pop();
                            that.promisedRedrawPad = that.promisedRedrawPad
                                .then(() => that._redrawPad(data))
                                .then(that._updateValue.bind(that));
                        }
                    })
                    .end()
                    .find('.show-canvas-btn')
                    .on('click', () => {
                        that.$widget.addClass('full-screen');
                        that._resizeCanvas();
                        that.enable();

                        return false;
                    })
                    .end()
                    .find('.hide-canvas-btn')
                    .on('click', () => {
                        that.$widget.removeClass('full-screen');
                        that.pad.off();
                        that._resizeCanvas();

                        return false;
                    })
                    .click();

                this.enable();
            })
            .catch((error) => {
                this._showFeedback(error.message);
            });

        $(this.element).on('applyfocus', () => {
            this.canvas.focus();
        });
    }

    // All this is copied from the file-picker widget
    /**
     * @param {string} loadedFileName - the loaded filename
     */
    _handleFiles(loadedFileName) {
        // Monitor maxSize changes to update placeholder text in annotate widget. This facilitates asynchronous
        // obtaining of max size from server without slowing down form loading.
        this._updatePlaceholder();
        this.element
            .closest('form.or')
            .addEventListener(
                events.UpdateMaxSize().type,
                this._updatePlaceholder.bind(this)
            );

        const that = this;

        const $input = this.$widget.find('input[type=file]');
        const $fakeInput = this.$widget.find('.fake-file-input');

        // show loaded file name or placeholder regardless of whether widget is supported
        this._showFileName(loadedFileName);

        $input
            .on('click', (event) => {
                // The purpose of this handler is to block the filepicker window
                // when the label is clicked outside of the input.
                if (that.props.readonly || event.namespace !== 'propagate') {
                    that.$fakeInput.focus();
                    event.stopImmediatePropagation();

                    return false;
                }
            })
            .on('change', function () {
                // Get the file
                const file = this.files[0];

                if (file) {
                    // Process the file
                    if (!fileManager.isTooLarge(file)) {
                        // Update UI
                        that.pad.clear();
                        that._loadFileIntoPad(this.files[0]).then(() => {
                            that._updateValue.call(that);
                            that._showFileName(file.name);
                            that.enable();
                        });
                    } else {
                        that._showFeedback(
                            t('filepicker.toolargeerror', {
                                maxSize: fileManager.getMaxSizeReadable(),
                            })
                        );
                    }
                } else {
                    that._showFileName(null);
                }
            });

        $fakeInput
            .on('click', function (event) {
                /*
                    The purpose of this handler is to selectively propagate clicks on the fake
                    input to the underlying file input (to show the file picker window).
                    It blocks propagation if the filepicker has a value to avoid accidentally
                    clearing files in a loaded record, hereby blocking native browser file input behavior
                    to clear values. Instead the reset button is the only way to clear a value.
                */
                if (
                    that.props.readonly ||
                    $input[0].value ||
                    $fakeInput[0].value
                ) {
                    $(this).focus();
                    event.stopImmediatePropagation();

                    return false;
                }
                event.preventDefault();
                $input.trigger('click.propagate');
            })
            .on(
                'change',
                () =>
                    // For robustness, avoid any editing of filenames by user.
                    false
            );
    }

    /**
     * @param {string} fileName - filename to show
     */
    _showFileName(fileName) {
        this.$widget
            .find('.fake-file-input')
            .val(fileName)
            .prop('readonly', !!fileName);
    }

    /**
     * Updates placeholder
     */
    _updatePlaceholder() {
        this.$widget.find('.fake-file-input').attr(
            'placeholder',
            t('filepicker.placeholder', {
                maxSize: fileManager.getMaxSizeReadable() || '?MB',
            })
        );
    }

    /**
     * @return {DocumentFragment} a document fragment with the widget markup
     */
    _getMarkup() {
        // HTML syntax copied from filepicker widget
        const load = this.props.load
            ? `<input type="file" class="ignore draw-widget__load"${
                  this.props.capture !== null
                      ? ` capture="${this.props.capture}"`
                      : ''
              } accept="${
                  this.props.accept
              }"/><div class="widget file-picker"><input class="ignore fake-file-input"/><div class="file-feedback"></div></div>`
            : '';
        const fullscreenBtns = this.props.touch
            ? '<button type="button" class="show-canvas-btn btn btn-default">Draw/Sign</button>' +
              '<button type="button" class="hide-canvas-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>'
            : '';
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget draw-widget">
                <div class="draw-widget__body">
                    ${fullscreenBtns}
                    ${load}
                    <canvas class="draw-widget__body__canvas noSwipe disabled" tabindex="0"></canvas>
                    <div class="draw-widget__colorpicker"></div>
                    ${
                        this.props.type === 'signature'
                            ? ''
                            : '<button class="btn-icon-only draw-widget__undo" aria-label="undo" type=button><i class="icon icon-undo"> </i></button>'
                    }
                </div>
                <div class="draw-widget__footer">
                    <div class="draw-widget__feedback"></div>
                </div>
            </div>`
        );
        fragment
            .querySelector('.draw-widget__footer')
            .prepend(this.downloadButtonHtml);
        fragment
            .querySelector('.draw-widget__footer')
            .prepend(this.resetButtonHtml);

        const colorpicker = fragment.querySelector('.draw-widget__colorpicker');

        this.props.colors.forEach((color, index) => {
            const current = index === 0 ? ' current' : '';
            const colorDiv = document
                .createRange()
                .createContextualFragment(
                    `<div class="${current}"data-color="${color}" style="background: ${color};" />`
                );
            colorpicker.append(colorDiv);
        });

        return fragment;
    }

    /**
     * Updates value
     */
    _updateValue() {
        const newValue = this.pad.toDataURL();
        if (this.value !== newValue) {
            const now = new Date();
            const postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
            this.element.dataset.filenamePostfix = postfix;
            this.originalInputValue = this.props.filename;
            // pad.toData() doesn't seem to work when redrawing on a smaller canvas. Doesn't scale.
            // pad.toDataURL() is crude and memory-heavy but the advantage is that it will also work for appearance=annotate
            this.value = newValue;
            this._updateDownloadLink(this.value);
        }
    }

    /**
     * Clears pad, cache, loaded file name, download link and others
     */
    _reset() {
        const that = this;

        if (this.element.value) {
            // This discombobulated line is to help the i18next parser pick up all 3 keys.
            const item =
                this.props.type === 'signature'
                    ? t('drawwidget.signature')
                    : this.props.type === 'drawing'
                    ? t('drawwidget.drawing')
                    : t('drawwidget.annotation');
            dialog
                .confirm(t('filepicker.resetWarning', { item }))
                .then((confirmed) => {
                    if (!confirmed) {
                        return;
                    }
                    that.pad.clear();
                    delete that.element.dataset.cache;
                    that.baseImage = null;
                    // Only upon reset is loadedFileName removed, so that "undo" will work
                    // for drawings loaded from storage.
                    delete that.element.dataset.loadedFileName;
                    delete that.element.dataset.loadedUrl;
                    that.element.dataset.filenamePostfix = '';
                    $(that.element).val('').trigger('change');
                    // Annotate file input
                    that.$widget
                        .find('input[type=file]')
                        .val('')
                        .trigger('change');
                    that._updateDownloadLink('');
                    that.disable();
                    that.enable();
                });
        }
    }

    /**
     * @param {string|File} file - Either a filename or a file.
     * @return {Promise} promise resolving with a string
     */
    _loadFileIntoPad(file) {
        if (!file) {
            return Promise.resolve('');
        }
        if (
            typeof file === 'string' &&
            file.startsWith('jr://') &&
            this.element.dataset.loadedUrl
        ) {
            file = this.element.dataset.loadedUrl;
        }

        return fileManager
            .getObjectUrl(file)
            .then(async (objectUrl) => {
                this.baseImage = await this._getBaseImage(objectUrl);
                this.promisedRedrawPad = this.promisedRedrawPad.then(() =>
                    this._redrawPad()
                );
                await this.promisedRedrawPad;
                return this.baseImage.data;
            })
            .catch(() => {
                this._showFeedback(
                    'File could not be loaded (leave unchanged if already submitted and you want to preserve it).',
                    'error'
                );
            });
    }

    /**
     * @param {string} message - the feedback message to show
     */
    _showFeedback(message) {
        message = message || '';

        // replace text and replace all existing classes with the new status class
        this.$widget.find('.draw-widget__feedback').text(message);
    }

    /**
     * @param {string} url - the download URL
     */
    _updateDownloadLink(url) {
        if (url && url.indexOf('data:') === 0) {
            url = URL.createObjectURL(dataUriToBlobSync(url));
        }
        const fileName = url
            ? getFilename(
                  { name: this.element.value },
                  this.element.dataset.filenamePostfix
              )
            : '';
        downloadUtils.updateDownloadLink(
            this.$widget.find('.btn-download')[0],
            url,
            fileName
        );
    }

    async _getBaseImage(dataUrl) {
        return new Promise((resolve) => {
            const image = new Image();
            const deviceRatio = window.devicePixelRatio || 1;
            const width = this.canvas.width / deviceRatio;
            const height = this.canvas.height / deviceRatio;

            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);
                // Cache the base64 data of the image so we never re-fetch it.
                const data = canvas.toDataURL();

                // No point in calculating options until the canvas is visible
                if (!this._isCanvasVisible()) {
                    resolve({ data });
                }

                const imgWidth = image.width;
                const imgHeight = image.height;
                const hRatio = width / imgWidth;
                const vRatio = height / imgHeight;

                if (hRatio < 1 || vRatio < 1) {
                    // if image is bigger than canvas then fit within the canvas
                    const ratio = Math.min(hRatio, vRatio);
                    const left = (width - imgWidth * ratio) / 2;
                    const top = (height - imgHeight * ratio) / 2;
                    resolve({
                        data,
                        options: {
                            xOffset: left,
                            yOffset: top,
                            width: imgWidth * ratio,
                            height: imgHeight * ratio,
                        },
                    });
                }
                // if image is smaller than canvas then show it in the center and don't stretch it
                const left = (width - imgWidth) / 2;
                const top = (height - imgHeight) / 2;
                resolve({
                    data,
                    options: {
                        xOffset: left,
                        yOffset: top,
                        width: imgWidth,
                        height: imgHeight,
                    },
                });
            };
            image.src = dataUrl;
        });
    }

    async _redrawPad(padData = []) {
        if (this.baseImage) {
            if (!this.baseImage.options && this._isCanvasVisible()) {
                // Calculate the options once the canvas is visible
                this.baseImage = await this._getBaseImage(this.baseImage.data);
            }

            this.pad.clear();
            await this.pad.fromDataURL(
                this.baseImage.data,
                this.baseImage.options
            );
            this.pad.fromData(padData, { clear: false });
        } else {
            this.pad.fromData(padData);
        }
    }

    _isCanvasVisible() {
        return this.canvas.offsetWidth > 0;
    }

    /**
     * Adjust canvas coordinate space taking into account pixel ratio,
     * to make it look crisp on mobile devices.
     * This also causes canvas to be cleared.
     *
     * @param {Element} canvas - Canvas element
     */
    _resizeCanvas() {
        // Use a little trick to avoid resizing currently-hidden canvases
        // https://github.com/enketo/enketo-core/issues/605
        if (this._isCanvasVisible()) {
            // When zoomed out to less than 100%, for some very strange reason,
            // some browsers report devicePixelRatio as less than 1
            // and only part of the canvas is cleared then.
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            this.canvas.width = this.canvas.offsetWidth * ratio;
            this.canvas.height = this.canvas.offsetHeight * ratio;
            this.canvas.getContext('2d').scale(ratio, ratio);
            this.promisedRedrawPad = this.promisedRedrawPad.then(() =>
                this._redrawPad(this.pad.toData())
            );
        }
    }

    /**
     * Disables widget
     */
    disable() {
        this.initialize.then(() => {
            this.resizeObserver.disconnect();
            this.pad.off();
            this.canvas.classList.add('disabled');
            this.$widget.find('.btn-reset').prop('disabled', true);
        });
    }

    /**
     * Enables widget
     */
    enable() {
        const touchNotFull =
            this.props.touch && !this.$widget.is('.full-screen');
        const needFile = this.props.load && !this.element.value;

        this.initialize.then(() => {
            this.resizeObserver.observe(
                this.$widget[0].querySelector('.draw-widget__body')
            );

            if (!this.props.readonly && !needFile && !touchNotFull) {
                this.pad.on();
                this.canvas.classList.remove('disabled');
                this.$widget.find('.btn-reset').prop('disabled', false);
            }
            // https://github.com/enketo/enketo-core/issues/450
            // When loading a question with a relevant, it is invisible
            // until branch.js removes the "pre-init" class. The rendering of the
            // canvas may therefore still be ongoing when this widget is instantiated.
            // For that reason we call _resizeCanvas when enable is called to make
            // sure the canvas is rendered properly.
            this._resizeCanvas();
        });
    }

    /**
     * Updates value when it is programmatically cleared.
     * There is no way to programmatically update a file input other than clearing it, so that's all
     * we need to do.
     */
    update() {
        if (this.originalInputValue === '') {
            this._reset();
        }
    }

    /**
     * @type {object}
     */
    get props() {
        const props = this._props;

        props.type = props.appearances.includes('draw')
            ? 'drawing'
            : props.appearances.includes('signature')
            ? 'signature'
            : 'annotation';
        props.filename = `${props.type}.png`;
        props.load = props.type === 'annotation';
        props.colors =
            props.type === 'signature'
                ? []
                : [
                      'black',
                      'lightblue',
                      'blue',
                      'red',
                      'orange',
                      'cyan',
                      'yellow',
                      'lightgreen',
                      'green',
                      'pink',
                      'purple',
                      'lightgray',
                      'darkgray',
                  ];
        props.touch = support.touch;
        props.accept = this.element.getAttribute('accept');
        props.capture = this.element.getAttribute('capture');

        return props;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.element.dataset.cache || '';
    }

    set value(dataUrl) {
        this.element.dataset.cache = dataUrl;
    }
}

export default DrawWidget;
