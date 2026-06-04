import { _prepareInstance } from '../../../public/js/src/enketo-webform';

const MODEL = `<model>
  <instance>
    <myform id="myform">
      <name/>
      <age/>
      <email/>
      <respondent>
        <first_name/>
        <last_name/>
      </respondent>
      <meta><instanceID/></meta>
    </myform>
  </instance>
</model>`;

describe.only('URL defaults (_prepareInstance)', () => {
    const parser = new DOMParser();

    it('applies a default value to a matching leaf node', () => {
        const result = _prepareInstance(MODEL, { '/myform/name': 'Alice' });
        const doc = parser.parseFromString(result, 'text/xml');

        expect(doc.querySelector('name').textContent).to.equal('Alice');
    });

    it('returns null when defaults is empty', () => {
        expect(_prepareInstance(MODEL, {})).to.be.null;
    });

    it('applies multiple defaults independently', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/name': 'Bob',
            '/myform/age': '30',
        });
        const doc = parser.parseFromString(result, 'text/xml');

        expect(doc.querySelector('name').textContent).to.equal('Bob');
        expect(doc.querySelector('age').textContent).to.equal('30');
    });

    it('rejects a path targeting the primary instance root', () => {
        const result = _prepareInstance(MODEL, { '/myform': 'injected' });
        // rejected path produces no instance output
        expect(result).to.be.null;
    });

    it('rejects a path targeting an attribute of the primary instance root', () => {
        const result = _prepareInstance(MODEL, { '/myform/@id': 'injected' });
        expect(result).to.be.null;
    });

    it('rejects a path targeting an attribute of a field', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/name': 'Alice',
            '/myform/name/@someattr': 'injected',
        });
        const doc = parser.parseFromString(result, 'text/xml');
        expect(doc.querySelector('name').textContent).to.equal('Alice');
        expect(doc.querySelector('name').hasAttribute('someattr')).to.be.false;
    });

    it('allows a field whose name matches a protected meta field name but is outside meta', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/email': 'test@example.com',
        });
        const doc = parser.parseFromString(result, 'text/xml');
        expect(doc.querySelector('email').textContent).to.equal(
            'test@example.com'
        );
    });

    it('rejects a path targeting a protected meta field', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/name': 'Alice',
            '/myform/meta/instanceID': 'fixed-uuid',
        });
        const doc = parser.parseFromString(result, 'text/xml');
        expect(doc.querySelector('name').textContent).to.equal('Alice');
        expect(doc.querySelector('instanceID').textContent).to.equal('');
    });

    it('allows a default on a field nested inside a group', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/respondent/first_name': 'Alice',
        });
        const doc = parser.parseFromString(result, 'text/xml');
        expect(doc.querySelector('first_name').textContent).to.equal('Alice');
    });

    it('rejects a path targeting a group element', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/respondent': 'injected',
        });
        expect(result).to.be.null;
    });

    it('rejects a path outside the primary instance entirely', () => {
        const result = _prepareInstance(MODEL, {
            '/myform/name': 'Alice',
            '/other/field': 'injected',
        });
        const doc = parser.parseFromString(result, 'text/xml');
        // valid path still applied
        expect(doc.querySelector('name').textContent).to.equal('Alice');
        // no 'other' element was created
        expect(doc.querySelector('other')).to.be.null;
    });
});
