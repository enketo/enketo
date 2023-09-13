const {
    assertBoolean,
    assertNumberValue,
    assertStringValue,
    assertTrue,
    initDoc,
} = require('./helpers');

describe('predicates with function calls', () => {
    it('should handle deep example 1', () => {
        // given
        initDoc(`
      <model>
        <instance>
          <data>
            <PROCEDURE>
              <PROC_GRID>
                <PROC>6</PROC>
              </PROC_GRID>
            </PROCEDURE>
          </data>
        </instance>
      </model>
    `);

        // expect
        assertBoolean(
            ' /model/instance[1]/data/PROCEDURE/PROC_GRID[position() = 1]/PROC = 6 or /model/instance[1]/data/PROCEDURE/PROC_GRID[position() = 2]/PROC = 6',
            true
        );
        assertStringValue(
            ' /model/instance[1]/data/PROCEDURE/PROC_GRID[position() = 1]/PROC = 6 or /model/instance[1]/data/PROCEDURE/PROC_GRID[position() = 2]/PROC = 6',
            'true'
        );
    });

    it('should handle deep example 2', () => {
        // given
        initDoc(`
      <model>
        <instance>
           <new_cascading_selections_inside_repeats id="cascading_select_inside_repeats">
             <group1>
                <country/>
                <city/>
                <neighborhood/>
             </group1>
             <meta>
                <instanceID/>
             </meta>
           </new_cascading_selections_inside_repeats>
        </instance>
        <instance id="cities">
           <root>
             <item>
                <itextId>static_instance-cities-0</itextId>
                <country>nl</country>
                <name>ams</name>
             </item>
             <item>
                <itextId>static_instance-cities-1</itextId>
                <country>usa</country>
                <name>den</name>
             </item>
             <item>
                <itextId>static_instance-cities-2</itextId>
                <country>usa</country>
                <name>nyc</name>
             </item>
           </root>
        </instance>
      </model>
    `);

        // expect
        assertBoolean(
            '/model/instance[@id="cities"]/root/item[country=/model/instance[1]/new_cascading_selections/group4/country4 and name=/model/instance[1]/new_cascading_selections/group4/city4]',
            false
        );
        assertStringValue(
            '/model/instance[@id="cities"]/root/item[country=/model/instance[1]/new_cascading_selections/group4/country4 and name=/model/instance[1]/new_cascading_selections/group4/city4]',
            ''
        );
    });

    describe('little predicates', () => {
        [
            ['//*[@id="3"] and /data/*[@id="1"]', false],
            ['/data/*[@id="3"] and /data/*[@id="1"]', false],
            ['/data/c[@id="3"] and /data/a[@id="1"]', false],
            ['/data/*[@id="1"] and //*[@id="3"]', false],
            ['/data/*[@id="3"] or /data/*[@id="2"]', true],
            ['/data/*[@id="1"] and //*[@id="2"]', true],
            ['/data/*[@id="3"] or /data/*[@id="4"]', false],
        ].forEach(([expr, expected]) => {
            it(`should evaluate ${expr} as ${expected}`, () => {
                initDoc(`
          <data>
            <a id="1">aa</a>
            <b id="2">bb</b>
          </data>
        `);

                assertBoolean(expr, expected);
            });
        });
    });

    describe('fiendishly complicated examples #2', () => {
        const namespaceResolver = {
            lookupNamespaceURI: (prefix) => {
                const namespaces = {
                    OpenClinica: 'http://openclinica.com/odm',
                    enk: 'http://enketo.org/xforms',
                };
                return namespaces[prefix];
            },
        };

        [
            [`/*[1]/item/a/number`, 'siete'],
            [`/data/item/a/number`, 'siete'],
            [`/data/item/a/number/@OpenClinica:this`, 'seven'],
            [`/data/item/a/number[@OpenClinica:this="three"]`, 'tres'],
            [
                `normalize-space(/data/item/a[../number[@OpenClinica:this="three"]])`,
                'cc dd ee',
            ],
            [
                `/data/item/a[../number[@OpenClinica:this="three"]]/name[@enk:that='something']/last[@id='d']/@Value`,
                'ddd',
            ],
            [
                `concat( selected( /data/item/a[../number[@OpenClinica:this='three']]/name[@enk:that="something"]/last/@Value, 'ccc' ), 'ing', '-', sin( pi() div 2))`,
                'trueing-1',
            ],
        ].forEach(([expr, expected]) => {
            it(`should evaluate ${expr} as ${expected}`, () => {
                initDoc(
                    `
          <data xmlns:OpenClinica="http://openclinica.com/odm" xmlns:enk="http://enketo.org/xforms">
            <item>
              <a>
                <number OpenClinica:this="seven">siete</number>
                <name>
                  <last>aa</last>
                </name>
              </a>
            </item>
            <item>
              <a>
                <number OpenClinica:this="three">tres</number>
                <number OpenClinica:this="four"/>
                <name enk:that="something else">
                  <last>bb</last>
                </name>
              </a>
            </item>
            <item>
              <number OpenClinica:this="three"/>
              <a>
                <name enk:that="something">
                  <last id="c" Value="ccc">cc</last>
                  <last id="d" Value="ddd">dd</last>
                  <last id="e" Value="eee">ee</last>
                </name>
              </a>
            </item>
            <meta>
              <instanceID>a</instanceID>
            </meta>
          </data>
        `,
                    namespaceResolver
                );

                assertStringValue(expr, expected);
            });
        });
    });

    describe('nested predicates', () => {
        [
            ['/data/item/number/@this', 'seven'],
            ['/data/item/number[@this]', 'siete'],
            ['/data/item/number[@this="four"]', 'cuatro'],
            ['/data/item/name[../number[@this="four"]]/last', 'bb'],
            ['/data/item/name[../number[./@this="four"]]/last', 'bb'],
            [
                '/data/item/name[../number[string-length(./@this) = 1]]/last',
                'cc',
            ],
            [
                '/data/item/name[../number[string-length(./@this) < pi()]]/last',
                'cc',
            ],
        ].forEach(([expr, expected]) => {
            it(`should evaluate ${expr} as ${expected}`, () => {
                initDoc(`
          <data>
            <item>
              <number>entruchón</number>
              <name>decoy</name>
            </item>
            <item>
              <number this="seven">siete</number>
              <name>
                <last>aa</last>
              </name>
            </item>
            <item>
              <number this="three">tres</number>
              <number this="four">cuatro</number>
              <name>
                <last>bb</last>
              </name>
            </item>
            <item>
              <number this="o">la letra o</number>
              <name>
                <last>cc</last>
              </name>
            </item>
          </data>
        `);

                assertStringValue(expr, expected);
            });
        });
    });

    describe('with native functions', () => {
        [
            ['count(/data/item[true()]) = 2', assertTrue],
            ['count(/data/b[round(2.44) = 2])', assertNumberValue, 2],
            ['/data/item[true()]/number', assertNumberValue, 4],
            ['/data/item[2]/number', assertNumberValue, 6],
            ['/data/item[true()]/number + 1', assertNumberValue, 5],
            ['/data/item[true()]/number + 1', assertStringValue, '5'],
            [
                '/data/item[string-length("a") = 1]/number + 2',
                assertNumberValue,
                6,
            ],
            [
                '/data/item[string-length("]") = 1]/number + 2',
                assertNumberValue,
                6,
            ],
            [
                `/data/item[string-length(']') = 1]/number + 2`,
                assertNumberValue,
                6,
            ],
            ['/data/item[2]/number + 3', assertNumberValue, 9],
            [
                '/data/item[string-length(./number)=1]/number + 3',
                assertNumberValue,
                7,
            ],
            [
                '/data/item[string-length(./number) = 1]/number + 3',
                assertNumberValue,
                7,
            ],
            [
                '/data/item[(./number div 3.14) > 1.9]/number',
                assertNumberValue,
                6,
            ],
        ].forEach(([expr, assertion, ...extraArgs]) => {
            it(`should evaluate ${expr} as expected`, () => {
                initDoc(`
          <data>
            <item>
              <number>4</number>
            </item>
            <item>
              <number>6</number>
            </item>
            <b/>
            <b/>
          </data>
        `);

                assertion(expr, ...extraArgs);
            });
        });
    });

    describe('with extended functions', () => {
        [
            ['pi()', assertNumberValue, 3.141592653589793],
            ['/data/item[1]/number', assertNumberValue, 4],
            ['/data/item[true()]/number', assertNumberValue, 4],
            ['/data/item[pi() > 3]/number', assertNumberValue, 4],
            ['/data/item[tan(./number) > 1]/number', assertNumberValue, 4],
            ['/data/item[tan(./number) <= 1]/number', assertNumberValue, 6],
            [
                '/data/item[(./number div pi()) >  1.9]/number',
                assertNumberValue,
                6,
            ],
            [
                '/data/item[(./number div pi()) <= 1.9]/number',
                assertNumberValue,
                4,
            ],
        ].forEach(([expr, assertion, ...extraArgs]) => {
            it(`should evaluate ${expr} as expected`, () => {
                initDoc(`
          <data>
            <item>
              <number>4</number>
            </item>
            <item>
              <number>6</number>
            </item>
          </data>
        `);

                assertion(expr, ...extraArgs);
            });
        });
    });

    // I put this one separate as it has a different 'too many args' error, and there may be multiple causes for failure
    it('with the #selected function', () => {
        initDoc(`
      <data>
        <a>a</a>
        <a>b</a>
        <a>c</a>
      </data>
    `);

        // assertTrue('selected("a b", "a")');
        assertNumberValue('count(/data/a[selected("a b", "a")])', 3);
    });

    it('should deal with a fiendishly complicated example', () => {
        initDoc(`
        <data>
          <item>
              <number>2</number>
              <name>
                  <first>1</first>
                  <last>bb</last>
              </name>
              <result>incorrect</result>
          </item>
          <item>
              <number>3</number>
              <name>
                  <first>1</first>
                  <last>b</last>
              </name>
              <result>correct</result>
          </item>
      </data>`);

        assertStringValue(
            '/data/item/number[../name/first = string-length(../name/last)]/../result',
            'correct'
        );
    });
});
