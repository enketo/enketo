import { Suite } from 'benchmark';
import type Benchmark from 'benchmark';
import { writeFileSync } from 'fs';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { fileURLToPath } from 'url';
import { setup } from './web/setup';

if (ENV === 'web') {
    await setup();
}

const { fixtures, reload, transform } = await import('./shared');

/**
 * @see {@link https://stackoverflow.com/a/75007985}
 *
 * We manually invoke the garbage collector after each cycle on each form, to
 * minimize its impact on margin of error.
 */
const gc: () => void = (() => {
    setFlagsFromString('--expose-gc');

    return runInNewContext('gc');
})();

const origins = new Set(fixtures.map(({ origin }) => origin));

const suites = new Map<string, Suite>(
    [...origins].map((origin) => [origin, new Suite(origin)])
);

const expectedOutliersPattern = /SOAR|va_who/i;

const RELOAD_WORKAROUND = 'RELOAD WORKAROUND';

fixtures.forEach(({ fileName, origin, xform }) => {
    const suite = suites.get(origin)!;
    const outlierMultiplier = expectedOutliersPattern.test(fileName) ? 5 : 1;

    suite.add(
        fileName,
        async (deferred: Benchmark.Deferred) => {
            await transform({ xform });
            deferred.resolve();
        },
        {
            async: true,
            defer: true,
            delay: 0.05,
            maxTime: 1 * outlierMultiplier,
            minSamples: 5,
            minTime: 0.25 * outlierMultiplier,
            onStart: () => {
                if (ENV === 'node') {
                    gc();
                }
            },
            onCycle: () => {
                if (ENV === 'node') {
                    gc();
                }
            },
        }
    );

    if (ENV === 'web') {
        suite.add(
            RELOAD_WORKAROUND,
            async (deferred: Benchmark.Deferred) => {
                await reload();
                deferred.resolve();
            },
            {
                async: true,
                defer: true,
                delay: 0,
                maxTime: 0.01,
                minSamples: 1,
                minTime: 0.01,
                onStart: () => {
                    gc();
                },
                onCycle: () => {
                    gc();
                },
            }
        );
    }
});

interface CycleEvent {
    target: Benchmark;
}

const runSuite = async (suite: Suite) =>
    new Promise((resolve) => {
        suite.on('cycle', async (event: CycleEvent) => {
            if (event.target.name !== RELOAD_WORKAROUND) {
                console.log(String(event.target));
            }
        });
        suite.on('complete', resolve);
        suite.run({ async: true });
    });

for await (const suite of suites.values()) {
    await runSuite(suite);
}

const SUMMARY_PATH = fileURLToPath(
    new URL('../.benchmarks.md', import.meta.url)
);

const sum = (ns: number[]) => ns.reduce((acc, n) => acc + n, 0);
const avg = (ns: number[]) => sum(ns) / ns.length;

const benchmarks = [...suites.values()]
    .flatMap((suite): Benchmark[] => suite.slice(0, suite.length))
    .filter((benchmark) => benchmark.name !== RELOAD_WORKAROUND)
    .sort((a, b) => a.hz - b.hz);

const times = benchmarks.map(({ times }) => times!.elapsed);
const time = sum(times).toFixed(2);
const means = benchmarks.map(({ stats }) => stats.mean * 1000);
const average = avg(means);
const nonOutlierIndex = Math.max(
    means.findIndex((mean, index) => {
        if (index === 0 || index > means.length - 2) {
            return false;
        }

        const previous = means[index - 1];
        const next = means[index + 1];

        return (
            previous / average > (mean / average) * 2 &&
            mean / average <= (next / average) * 2
        );
    }),
    0
);
const averageWithoutOutliers = avg(means.slice(nonOutlierIndex));

/**
 * Roughly based on {@link https://github.com/bestiejs/benchmark.js/blob/42f3b732bac3640eddb3ae5f50e445f3141016fd/benchmark.js#L1525}, simplified and modified to output a GitHub Actions summary.
 */
const summaries = benchmarks.map((bench, index) => {
    const { error, name, stats } = bench;
    let result = error?.message;

    if (result == null) {
        const size = stats.sample.length;
        const mean = `${means[index].toFixed(2)} ms`;

        const [hzWhole, hzFractional] = String(
            bench.hz.toFixed(bench.hz < 100 ? 2 : 0)
        ).split('.');
        const hz =
            hzWhole.replace(/(?=(?:\d{3})+$)(?!\b)/g, ',') +
            (hzFractional ? `.${hzFractional}` : '');
        const rme = `±${stats.rme.toFixed(2)}%`;
        const samples = `${size} run${size === 1 ? '' : 's'}`;

        result = `${mean} (${hz} ops/s ${rme}, ${samples})`;
    }

    return [name, result];
});
const [slowest] = summaries;
const fastest = summaries[summaries.length - 1];

const summary = /* html */ `
        <table>
            <tr>
                <th></th>
                <th>Name</th>
                <th>Result</th>
            </tr>
            <tr>
                <td>Slowest</td>
                <td>${slowest[0]}</td>
                <td>${slowest[1]}</td>
            </tr>
            <tr>
                <td>Fastest</td>
                <td>${fastest[0]}</td>
                <td>${fastest[1]}</td>
            </tr>
            <tr>
                <td>Average overall</td>
                <td colspan="2">${average.toFixed(2)}ms</td>
            </tr>
            <tr>
                <td>Average without outliers</td>
                <td colspan="2">${averageWithoutOutliers.toFixed(2)}ms</td>
            </tr>
            <tr>
                <td>Total runtime</td>
                <td colspan="2">${time}s</td>
            </tr>
        </table>

        <details>
            <summary>All results</summary>

            <table>
                <tr>
                    <th>Name</th>
                    <th>Result</th>
                </tr>
                ${summaries
                    .map(
                        ([name, result]) =>
                            /* html */ `<tr><td>${name}</td><td>${result}</td></tr>`
                    )
                    .join('\n')}
            </table>
        </details>
    `
    .trim()
    .replace(/(^|\n)\s+/g, '$1');

writeFileSync(SUMMARY_PATH, summary);

const { GITHUB_STEP_SUMMARY } = process.env;

if (GITHUB_STEP_SUMMARY != null) {
    writeFileSync(GITHUB_STEP_SUMMARY, summary);
}

process.exit(0);
