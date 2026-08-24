import { getValidatedDefaults } from '../../../public/js/src/enketo-webform';

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

describe('URL defaults (getValidatedDefaults)', () => {
    it('includes a valid leaf node path', () => {
        const result = getValidatedDefaults(MODEL, { '/myform/name': 'Alice' });

        expect(result).to.deep.equal({ '/myform/name': 'Alice' });
    });

    it('returns an empty object when defaults is empty', () => {
        expect(getValidatedDefaults(MODEL, {})).to.deep.equal({});
    });

    it('includes multiple valid paths', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/name': 'Bob',
            '/myform/age': '30',
        });

        expect(result).to.deep.equal({ '/myform/name': 'Bob', '/myform/age': '30' });
    });

    it('excludes a path targeting the primary instance root', () => {
        const result = getValidatedDefaults(MODEL, { '/myform': 'injected' });

        expect(result).to.deep.equal({});
    });

    it('excludes a path targeting an attribute of the primary instance root', () => {
        const result = getValidatedDefaults(MODEL, { '/myform/@id': 'injected' });

        expect(result).to.deep.equal({});
    });

    it('excludes attribute paths while keeping valid sibling paths', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/name': 'Alice',
            '/myform/name/@someattr': 'injected',
        });

        expect(result).to.deep.equal({ '/myform/name': 'Alice' });
    });

    it('includes a field whose name matches a protected meta field name but is outside meta', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/email': 'test@example.com',
        });

        expect(result).to.deep.equal({ '/myform/email': 'test@example.com' });
    });

    it('excludes a path targeting a protected meta field', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/name': 'Alice',
            '/myform/meta/instanceID': 'fixed-uuid',
        });

        expect(result).to.deep.equal({ '/myform/name': 'Alice' });
    });

    it('includes a field nested inside a group', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/respondent/first_name': 'Alice',
        });

        expect(result).to.deep.equal({ '/myform/respondent/first_name': 'Alice' });
    });

    it('excludes a path targeting a group element', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/respondent': 'injected',
        });

        expect(result).to.deep.equal({});
    });

    it('excludes paths outside the primary instance while keeping valid ones', () => {
        const result = getValidatedDefaults(MODEL, {
            '/myform/name': 'Alice',
            '/other/field': 'injected',
        });

        expect(result).to.deep.equal({ '/myform/name': 'Alice' });
    });
});
