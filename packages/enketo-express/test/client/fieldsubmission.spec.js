import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import utils from '../../public/js/src/module/utils';
import FieldSubmissionQueue from '../../public/js/src/module/field-submission-queue';

const { expect } = chai;

chai.use(chaiAsPromised);

const getFieldValue = (fd) =>
    utils.blobToString(fd.getAll('xml_submission_fragment_file')[0]);

describe('Field Submission', () => {
    const p1 = '/a/b/c';
    const p2 = '/a/r[3]/d';
    const id = 'abc';
    const did = 'def';

    describe('queue', () => {
        it('adds regular items', () => {
            const q = new FieldSubmissionQueue();
            q.enable();
            q.addFieldSubmission(p1, '<one>1</one>', id);
            q.addFieldSubmission(p2, '<a>a</a>', id);
            const p1Key = Object.keys(q.get())[0];
            const p2Key = Object.keys(q.get())[1];

            return Promise.all([
                expect(Object.keys(q.get()).length).to.equal(2),
                expect(q.get()[p1Key]).to.be.an.instanceOf(FormData),
                expect(q.get()[p2Key]).to.be.an.instanceOf(FormData),
                expect(getFieldValue(q.get()[p1Key])).to.eventually.equal(
                    '<one>1</one>'
                ),
                expect(getFieldValue(q.get()[p2Key])).to.eventually.equal(
                    '<a>a</a>'
                ),
            ]);
        });

        it('adds edits of already submitted items', () => {
            const q = new FieldSubmissionQueue();
            q.enable();
            q.addFieldSubmission(p1, '<one>1</one>', id, did);
            q.addFieldSubmission(p2, '<a>a</a>', id, did);
            const p1Key = Object.keys(q.get())[0];
            const p2Key = Object.keys(q.get())[1];

            return Promise.all([
                expect(Object.keys(q.get()).length).to.equal(2),
                expect(q.get()[p1Key]).to.be.an.instanceOf(FormData),
                expect(q.get()[p2Key]).to.be.an.instanceOf(FormData),
                expect(getFieldValue(q.get()[p1Key])).to.eventually.equal(
                    '<one>1</one>'
                ),
                expect(getFieldValue(q.get()[p2Key])).to.eventually.equal(
                    '<a>a</a>'
                ),
            ]);
        });

        it('adds items that delete a repeat', () => {
            const q = new FieldSubmissionQueue();
            q.enable();
            q.addRepeatRemoval('one', 1, id);
            q.addRepeatRemoval('a', 2, id);

            return Promise.all([
                expect(q.get().DELETE_0).to.deep.equal({
                    instance: id,
                    repeat: 'one',
                    ordinal: 1,
                }),
                expect(q.get().DELETE_1).to.deep.equal({
                    instance: id,
                    repeat: 'a',
                    ordinal: 2,
                }),
            ]);
        });
    });

    describe('queue manages submission failures and successes', () => {
        let q;
        const failSubmitOne = () => Promise.reject(new Error('Error: 400'));
        const succeedSubmitOne = () => Promise.resolve(201);

        beforeEach(() => {
            q = new FieldSubmissionQueue();
            q.enable();
            q.addFieldSubmission(p1, '1', id);
            q.addFieldSubmission(p2, 'a', id);
        });

        it('removes a queue item if submission was successful', () => {
            q._submitOne = succeedSubmitOne;

            const updatedQueueKeys = q
                .submitAll()
                .then(() => Object.keys(q.get()));

            return expect(updatedQueueKeys).to.eventually.deep.equal([]);
        });

        it('ignores new fieldsubmissions if they are the same as the last for that field', () => {
            q._submitOne = succeedSubmitOne;

            const updatedQueueKeys = q.submitAll().then(() => {
                q.addFieldSubmission(p1, '1', id);
                q.addFieldSubmission(p2, 'a', id);

                return Object.keys(q.get());
            });

            return expect(updatedQueueKeys).to.eventually.deep.equal([]);
        });

        it('retains a queue item if submission failed', () => {
            q._submitOne = failSubmitOne;

            const p1Key = Object.keys(q.get())[0];
            const p2Key = Object.keys(q.get())[1];
            const updatedQueueKeys = q
                .submitAll()
                .then(() => Object.keys(q.get()));

            return expect(updatedQueueKeys).to.eventually.deep.equal([
                p1Key,
                p2Key,
            ]);
        });
    });

    // TODO
    // * timeout
});
