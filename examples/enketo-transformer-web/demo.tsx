/* eslint-disable jsx-a11y/label-has-associated-control */
import { Router, Routes, Route, useSearchParams } from '@solidjs/router';
import { transform } from 'enketo-transformer/web';
import {
    createEffect,
    createResource,
    createSignal,
    on,
    splitProps,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { For, Match, Show, Switch, render } from 'solid-js/web';
import { fixtures as baseFixtures } from '../../packages/enketo-transformer/test/fixtures';

interface CodeBlockProps
    extends Omit<JSX.IntrinsicElements['pre'], 'children'> {
    children: string | undefined | Array<string | undefined>;
}

function CodeBlock(props: CodeBlockProps) {
    const [childProps, rest] = splitProps(props, ['children']);
    const code = () =>
        (Array.isArray(childProps.children)
            ? childProps.children
            : [childProps.children]
        )
            .filter((child): child is string => child != null)
            .flatMap((child) => child.trim().split('\n'));

    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <pre {...rest}>
            <code>
                <For each={code()}>
                    {(line) => {
                        const [indentation] = line.match(/^\s*/) ?? [''];
                        const outdent = indentation.length + 4;

                        return (
                            <div
                                style={{
                                    'padding-left': `${outdent}ch`,
                                    'text-indent': `-${outdent}ch`,
                                }}
                            >{`${line}\n`}</div>
                        );
                    }}
                </For>
            </code>
        </pre>
    );
}

const fixtures = baseFixtures.map(({ origin, fileName, ...rest }) => ({
    ...rest,
    origin,
    fileName,
    key: `${origin}-${fileName}`,
}));

const xformsByKey = new Map(
    fixtures.map((fixture) => [fixture.key, fixture.xform])
);

function Demo() {
    const [language, setLanguage] = createSignal<string | null>(null);

    let formContainer!: HTMLDivElement;

    createEffect(
        on(
            language,
            (current) => {
                const active = formContainer.querySelectorAll(
                    '.active[lang]:not([lang=""])'
                );

                active.forEach((element) => {
                    element.classList.remove('active');
                });

                const activate = formContainer.querySelectorAll(
                    `[lang="${CSS.escape(current ?? '')}"]`
                );

                activate.forEach((element) => {
                    element.classList.add('active');
                });
            },
            { defer: true }
        )
    );

    const [params, setParams] = useSearchParams();
    const key = () => params.xform;
    const xform = () => {
        const xform = key();

        if (xform == null) {
            return;
        }

        return xformsByKey.get(xform);
    };
    const [error, setError] = createSignal<Error | null>(null);
    const logo = () => params.logo !== 'false';
    const openclinica = () => params.openclinica === 'true';
    const markdown = () => params.markdown !== 'false';
    const theme = () => params.theme === 'true';
    const [duration, setDuration] = createSignal<number | null>(null);
    const [transformed, setTransformed] = createResource(async () => {
        const selected = xform();

        if (selected == null) {
            return;
        }

        const start = performance.now();

        try {
            const result = await transform({
                xform: selected,
                media: logo() ? { 'form_logo.png': '/icon.png' } : {},
                openclinica: openclinica() ? 1 : 0,
                markdown: markdown(),
                theme: theme() ? 'mytheme' : undefined,
            });

            setDuration(performance.now() - start);

            return result;
        } catch (error) {
            console.error('error', error);

            setError(error as Error);
            setTransformed.mutate(undefined);
        }
    });

    createEffect(
        on(
            [key, xform, logo, openclinica, markdown, theme],
            async () => {
                setError(null);
                setLanguage(null);
                setDuration(null);

                setTimeout(() => {
                    setTransformed.refetch();
                }, 0);
            },
            { defer: true }
        )
    );

    return (
        <>
            <form id="demo" class="grid">
                <h1>
                    <a href="/">Enketo Transformer Demo</a>
                </h1>

                <div>
                    <select
                        id="forms"
                        onChange={(event) => {
                            const { key: xform } =
                                fixtures[Number(event.currentTarget.value)];
                            setParams({
                                ...params,
                                xform,
                            });
                        }}
                    >
                        <option value="" selected={params.xform === null}>
                            Choose a form…
                        </option>
                        <For each={fixtures}>
                            {(fixture, index) => (
                                <option
                                    value={index()}
                                    selected={key() === fixture.key}
                                >
                                    {fixture.fileName} ({fixture.origin})
                                </option>
                            )}
                        </For>
                    </select>
                </div>

                <div id="transform-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={logo()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    logo: checked,
                                });
                            }}
                        />{' '}
                        Logo
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={openclinica()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    openclinica: checked,
                                });
                            }}
                        />{' '}
                        OpenClinica
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={markdown()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    markdown: checked,
                                });
                            }}
                        />{' '}
                        Markdown
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={theme()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    theme: checked,
                                });
                            }}
                        />
                        Theme
                    </label>
                </div>
                <Show when={error() == null && key() != null}>
                    <div id="metrics">
                        ⏲️{' '}
                        <Switch>
                            <Match when={duration() == null}>
                                Transforming...
                            </Match>
                            <Match when={duration() != null}>
                                Transformed in {duration()?.toFixed(2)} ms
                            </Match>
                        </Switch>
                    </div>
                </Show>
            </form>
            <Show when={error()} keyed>
                {(error) => (
                    <div id="error">
                        <h2>Error</h2>

                        <pre>{error.stack}</pre>
                    </div>
                )}
            </Show>
            <Show when={duration() !== null && transformed()} keyed>
                {({ form, model, ...rest }) => (
                    <div id="result" class="grid">
                        <details>
                            <summary class="decorated">
                                <span class="icon">📄</span>
                                XForm
                            </summary>
                            <CodeBlock id="xform">{xform()}</CodeBlock>
                        </details>

                        <div
                            id="form-container"
                            class="grid"
                            innerHTML={form}
                            ref={formContainer}
                            onChange={(e) => {
                                if (e.target.id === 'form-languages') {
                                    setLanguage(
                                        CSS.escape(
                                            (e.target as HTMLSelectElement)
                                                .value
                                        )
                                    );
                                }
                            }}
                        />

                        <details>
                            <summary class="decorated">
                                <span class="icon">🌐</span>
                                Form HTML
                            </summary>
                            <CodeBlock id="form-source">{form}</CodeBlock>
                        </details>

                        <section id="model">
                            <h3>❎ Model</h3>
                            <CodeBlock>{model}</CodeBlock>
                        </section>

                        <section id="data">
                            <h3>Data</h3>
                            <CodeBlock id="data">
                                {JSON.stringify(rest, null, 4)}
                            </CodeBlock>
                        </section>
                    </div>
                )}
            </Show>
        </>
    );
}

render(
    () => (
        <Router>
            <Routes>
                <Route path="/" component={Demo} />
                <Route path="/:xform" component={Demo} />
                {/* <Route path="/*" component={Demo} /> */}
            </Routes>
        </Router>
    ),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById('app')!
);
