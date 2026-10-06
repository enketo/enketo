import fileManager from '../../public/js/src/module/file-manager';
import settings from '../../public/js/src/module/settings';
import store from '../../public/js/src/module/store';
import { t } from '../../public/js/src/module/translator';

describe('File manager', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('getting file URLs', () => {
        it('gets an absolute path', async () => {
            const result = await fileManager.getFileUrl('/absolute.png');

            expect(result).to.equal('/absolute.png');
        });

        describe('instance attachments', () => {
            afterEach(() => {
                fileManager.setInstanceAttachments(null);
            });

            it('gets a URL from instance attachments by filename', async () => {
                fileManager.setInstanceAttachments({
                    'relative.png': 'https://example.com/path/to/relative.png',
                });

                const result = await fileManager.getFileUrl('relative.png');

                expect(result).to.equal(
                    'https://example.com/path/to/relative.png'
                );
            });

            it('gets a URL from instance attachments by filename with a space', async () => {
                fileManager.setInstanceAttachments({
                    'space madness.png':
                        'https://example.com/path/to/space%20madness.png',
                });

                const result =
                    await fileManager.getFileUrl('space madness.png');

                expect(result).to.equal(
                    'https://example.com/path/to/space%20madness.png'
                );
            });

            it('gets a URL from instance attachments by filename with an escaped space', async () => {
                fileManager.setInstanceAttachments({
                    'space%20madness.png':
                        'https://example.com/path/to/space%20madness.png',
                });

                const result =
                    await fileManager.getFileUrl('space madness.png');

                expect(result).to.equal(
                    'https://example.com/path/to/space%20madness.png'
                );
            });

            it('gets a URL from instance attachments by filename with an ampersand', async () => {
                fileManager.setInstanceAttachments({
                    'r&amp;d.png': 'https://example.com/path/to/r&d.png',
                });

                const result = await fileManager.getFileUrl('r&d.png');

                expect(result).to.equal('https://example.com/path/to/r&d.png');
            });

            it('gets a URL from instance attachments by filename with a percent', async () => {
                fileManager.setInstanceAttachments({
                    '50%%20done.jpg':
                        'https://example.com/path/to/50%25%20done.jpg',
                });

                const result = await fileManager.getFileUrl('50% done.jpg');

                expect(result).to.equal(
                    'https://example.com/path/to/50%25%20done.jpg'
                );
            });

            it('gets a URL from instance attachments by escaped filename with an escaped space', async () => {
                fileManager.setInstanceAttachments({
                    'space%20madness.png':
                        'https://example.com/path/to/space%20madness.png',
                });

                const result = await fileManager.getFileUrl(
                    'space%20madness.png'
                );

                expect(result).to.equal(
                    'https://example.com/path/to/space%20madness.png'
                );
            });
        });

        describe('cached resources', () => {
            const enketoId = 'survey a';
            const recordId = 'record 1';

            /** @type {boolean} */
            let isOffline;

            /** @type {boolean} */
            let isStoreAvailable;

            /** @type {number} */
            let maxSize;

            beforeEach(async () => {
                isOffline = true;

                sandbox.stub(settings, 'offline').get(() => isOffline);

                sandbox.stub(settings, 'enketoId').get(() => enketoId);

                if (
                    !Object.prototype.hasOwnProperty.call(settings, 'recordId')
                ) {
                    settings.recordId = undefined;
                }

                sandbox.stub(settings, 'recordId').get(() => recordId);

                isStoreAvailable = true;

                sandbox.stub(store, 'available').get(() => isStoreAvailable);

                maxSize = Number.MAX_SAFE_INTEGER;

                sandbox.stub(settings, 'maxSize').get(() => maxSize);

                await store.init();
            });

            it('gets a blob URL from a cached resource URL', async () => {
                const fileContents = 'file contents';
                const url = 'https://example.com/the%20blob.png';
                const resource = {
                    item: new Blob([fileContents]),
                    url,
                };

                await store.survey.resource.update(enketoId, resource);

                const blobURL = await fileManager.getFileUrl(url);

                expect(blobURL).to.match(/^blob:/);

                const response = await fetch(blobURL);
                const blobResult = await response.blob();

                expect(blobResult).to.be.an.instanceof(Blob);

                const data = await blobResult.text();

                expect(data).to.equal(fileContents);
            });

            it('fails if the cache store is not available', async () => {
                const resourceGetStub = sandbox.stub(
                    store.survey.resource,
                    'get'
                );

                /** @type {Error} */
                let caught;

                isStoreAvailable = false;

                try {
                    await fileManager.getFileUrl(
                        'https://example.com/anything.png'
                    );
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
                expect(resourceGetStub).not.to.have.been.called;
            });

            it('fails if the resource URL is not cached', async () => {
                const resourceURL = 'https://example.com/anything.png';

                /** @type {Error} */
                let caught;

                try {
                    await fileManager.getFileUrl(resourceURL);
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
            });

            it('gets a blob URL from a cached file upload', async () => {
                const fileContents = 'file contents';
                const name = 'the blob.png';
                const resource = {
                    item: new Blob([fileContents]),
                    name,
                };

                await store.record.file.update(recordId, resource);

                const blobURL = await fileManager.getFileUrl(name);

                expect(blobURL).to.match(/^blob:/);

                const response = await fetch(blobURL);
                const blobResult = await response.blob();

                expect(blobResult).to.be.an.instanceof(Blob);

                const data = await blobResult.text();

                expect(data).to.equal(fileContents);
            });

            it('fails if not in offline-capable mode, if the store is available and the resource is cached', async () => {
                const fileContents = 'file contents';
                const name = 'the blob.png';
                const resource = {
                    item: new Blob([fileContents]),
                    name,
                };

                await store.record.file.update(recordId, resource);

                const resourceGetStub = sandbox.stub(
                    store.survey.resource,
                    'get'
                );

                /** @type {Error} */
                let caught;

                isOffline = false;

                try {
                    await fileManager.getFileUrl(name);
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
                expect(resourceGetStub).not.to.have.been.called;
            });

            it('fails if the file is not cached', async () => {
                const fileName = 'anything.png';

                /** @type {Error} */
                let caught;

                try {
                    await fileManager.getFileUrl(fileName);
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
            });

            it('fails if the cached file is too large', async () => {
                /** @type {Error} */
                let caught;

                const fileContents = 'file contents';
                const name = 'the blob.png';
                const resource = {
                    item: new Blob([fileContents]),
                    name,
                };

                maxSize = resource.item.size - 1;

                await store.record.file.update(recordId, resource);

                try {
                    await fileManager.getFileUrl(name);
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
            });

            it('gets a blob URL from a Blob object', async () => {
                const fileContents = 'file contents';
                const blob = new Blob([fileContents]);

                const blobURL = await fileManager.getFileUrl(blob);

                expect(blobURL).to.match(/^blob:/);

                const response = await fetch(blobURL);
                const blobResult = await response.blob();

                expect(blobResult).to.be.an.instanceof(Blob);

                const data = await blobResult.text();

                expect(data).to.equal(fileContents);
            });

            it('fails if a Blob object is too large', async () => {
                /** @type {Error} */
                let caught;

                const fileContents = 'file contents';
                const blob = new Blob([fileContents]);

                maxSize = blob.size - 1;

                try {
                    await fileManager.getFileUrl(blob);
                } catch (error) {
                    caught = error;
                }

                expect(caught).to.be.an.instanceof(Error);
            });
        });
    });

    describe('attachments of the record being edited', () => {
        const dataURL = (contents, type = 'image/jpeg') =>
            `data:${type};base64,${btoa(contents)}`;

        /** @type {HTMLFormElement} */
        let formEl;

        /** @type {number} */
        let maxSize;

        beforeEach(() => {
            maxSize = Number.MAX_SAFE_INTEGER;

            sandbox.stub(settings, 'maxSize').get(() => maxSize);

            formEl = document.createElement('form');
            formEl.className = 'or';
            document.body.appendChild(formEl);
        });

        afterEach(() => {
            fileManager.setInstanceAttachments(null);
            formEl.remove();
        });

        /**
         * @param {string} loadedFileName - value of data-loaded-file-name
         * @return {HTMLInputElement} the added file input
         */
        const addFileInput = (loadedFileName) => {
            const input = document.createElement('input');
            input.type = 'file';

            if (loadedFileName != null) {
                input.setAttribute('data-loaded-file-name', loadedFileName);
            }

            formEl.appendChild(input);

            return input;
        };

        /**
         * @param {HTMLInputElement} input - the file input to select a file on
         * @param {File} file - the file to select
         */
        const selectFile = (input, file) => {
            const transfer = new DataTransfer();

            transfer.items.add(file);
            input.files = transfer.files;
        };

        it('returns the downloaded blob for an unchanged attachment', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('photo.jpg');

            const [file] = await fileManager.getCurrentFiles();

            expect(file).to.be.an.instanceof(Blob);
            expect(file.name).to.equal('photo.jpg');
            expect(await file.text()).to.equal('a photo');
        });

        // keys as the server escapes them, per `escapeFileName` in
        // /app/lib/media.js: percent-encoded as a URL path, then `&<>"`
        // replaced with markup entities
        it('returns the downloaded blob for an attachment whose name was escaped', async () => {
            fileManager.setInstanceAttachments({
                'space%20madness.png': dataURL('a photo', 'image/png'),
                'me%20&amp;%20you.png': dataURL('another photo', 'image/png'),
                'r&amp;d.png': dataURL('a third photo', 'image/png'),
                'a%3Cb%3E.png': dataURL('a fourth photo', 'image/png'),
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('space madness.png');
            addFileInput('me & you.png');
            addFileInput('r&d.png');
            addFileInput('a<b>.png');

            const files = await fileManager.getCurrentFiles();

            expect(files.map((file) => file.name)).to.deep.equal([
                'space madness.png',
                'me & you.png',
                'r&d.png',
                'a<b>.png',
            ]);
            files.forEach((file) => expect(file).to.be.an.instanceof(Blob));
        });

        // the server's escaping is not reversible: these names survive it
        // unchanged, or collide with an escape sequence
        // the server escapes a name that opens with something it reads as a
        // URL scheme as a URL in its own right
        it('returns the downloaded blob for an attachment whose name looks like a URL', async () => {
            fileManager.setInstanceAttachments({
                'c:a%5Cb.jpg': dataURL('a photo'),
                'jr:%2F%2Fy.jpg%2F': dataURL('another photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('c:a\\b.jpg');
            addFileInput('jr:y.jpg');

            const files = await fileManager.getCurrentFiles();

            expect(files.map((file) => file.name)).to.deep.equal([
                'c:a\\b.jpg',
                'jr:y.jpg',
            ]);
            expect(await files[0].text()).to.equal('a photo');
            expect(await files[1].text()).to.equal('another photo');
        });

        it('returns the downloaded blob for an attachment whose name contains a percent', async () => {
            fileManager.setInstanceAttachments({
                '100%20thing.jpg': dataURL('a photo'),
                '50%%20done.jpg': dataURL('another photo'),
                '50%.jpg': dataURL('a third photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('100%20thing.jpg');
            addFileInput('50% done.jpg');
            addFileInput('50%.jpg');

            const files = await fileManager.getCurrentFiles();

            expect(files.map((file) => file.name)).to.deep.equal([
                '100%20thing.jpg',
                '50% done.jpg',
                '50%.jpg',
            ]);
            expect(await files[0].text()).to.equal('a photo');
            expect(await files[1].text()).to.equal('another photo');
            expect(await files[2].text()).to.equal('a third photo');
        });

        it('waits for a download that is still in progress', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            addFileInput('photo.jpg');

            // deliberately not awaited
            fileManager.prefetchInstanceAttachments();

            const [file] = await fileManager.getCurrentFiles();

            expect(file).to.be.an.instanceof(Blob);
        });

        it('fails with the name of an attachment that could not be downloaded', async () => {
            sandbox
                .stub(window, 'fetch')
                .resolves(new Response('', { status: 404 }));

            fileManager.setInstanceAttachments({
                'photo.jpg': 'https://example.com/photo.jpg',
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('photo.jpg');

            /** @type {Error} */
            let caught;

            try {
                await fileManager.getCurrentFiles();
            } catch (error) {
                caught = error;
            }

            expect(caught).to.be.an.instanceof(Error);
            expect(caught.message).to.equal(
                t('error.dataloadfailed', { filename: 'photo.jpg' })
            );
        });

        it('fails with the name of an attachment that is too large', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            addFileInput('photo.jpg');

            maxSize = 1;

            /** @type {Error} */
            let caught;

            try {
                await fileManager.getCurrentFiles();
            } catch (error) {
                caught = error;
            }

            expect(caught).to.be.an.instanceof(Error);
            expect(caught.message).to.contain('photo.jpg');
        });

        it('does not return an attachment the user has replaced', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            // the filepicker only removes data-loaded-file-name once the newly
            // selected file has been processed
            const input = addFileInput('photo.jpg');

            selectFile(input, new File(['a new photo'], 'new.jpg'));

            const files = await fileManager.getCurrentFiles();

            expect(files.length).to.equal(1);
            expect(await files[0].text()).to.equal('a new photo');
        });

        it('does not return the attachment of a question that became non-relevant', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            // enketo-core clears the model value and marks the branch
            // disabled, but leaves data-loaded-file-name in place
            const question = document.createElement('label');

            question.className = 'question or-branch disabled';
            formEl.appendChild(question);
            question.appendChild(addFileInput('photo.jpg'));

            const files = await fileManager.getCurrentFiles();

            expect(files).to.deep.equal([]);
        });

        it('does not return the attachment of a question inside a non-relevant group', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            const group = document.createElement('fieldset');

            group.className = 'or-group or-branch disabled';
            formEl.appendChild(group);

            const question = document.createElement('label');

            question.className = 'question';
            group.appendChild(question);
            question.appendChild(addFileInput('photo.jpg'));

            const files = await fileManager.getCurrentFiles();

            expect(files).to.deep.equal([]);
        });

        // the filepicker disables the control of a readonly question for the
        // life of the widget, so being disabled says nothing about relevance
        it('returns the attachment of a readonly question', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            const question = document.createElement('label');

            question.className = 'question readonly';
            formEl.appendChild(question);

            const input = addFileInput('photo.jpg');

            input.disabled = true;
            question.appendChild(input);

            const [file] = await fileManager.getCurrentFiles();

            expect(file).to.be.an.instanceof(Blob);
            expect(file.name).to.equal('photo.jpg');
        });

        it('forgets the attachments of a previously loaded record', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': dataURL('a photo'),
            });

            await fileManager.prefetchInstanceAttachments();

            fileManager.setInstanceAttachments({
                'other.jpg': dataURL('another photo'),
            });

            addFileInput('photo.jpg');

            const [file] = await fileManager.getCurrentFiles();

            expect(file).to.equal('photo.jpg');
        });

        it('returns the file name of an unchanged attachment when nothing was downloaded', async () => {
            fileManager.setInstanceAttachments({
                'photo.jpg': 'https://example.com/photo.jpg',
            });

            addFileInput('photo.jpg');

            const [file] = await fileManager.getCurrentFiles();

            expect(file).to.equal('photo.jpg');
        });
    });
});
