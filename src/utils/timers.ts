import { InputOptions, OutputOptions } from '../rollup';
import { load } from './defaults';
import { writeFile } from './fs';
import { resolve } from './path';

type StartTime = [number, number] | number;
type Timer = { time: number, start: StartTime };
type Timers = { [label: string]: Timer };
type SerializedTimings = { [label: string]: number };

const NOOP = () => {};
// We cannot use chalk here due to its dependency on 'path'
const RESET_COLOR = '\x1b[0m';
const BOLD = '\x1b[1m';
const BOLD_RED = '\x1b[1;31m';
const BOLD_GREEN = '\x1b[1;32m';

let getStartTime: () => StartTime = () => 0;
let getElapsedTime: (previous: StartTime) => number = () => 0;

let timers: Timers;

const flattenTime = (time: [number, number]) => time[0] * 1e3 + Math.floor(time[1] / 1e6);

function setTimeHelpers () {
	if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
		getStartTime = process.hrtime.bind(process);
		getElapsedTime = (previous: [number, number]) => flattenTime(process.hrtime(previous));
	} else if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		getStartTime = performance.now.bind(performance);
		getElapsedTime = (previous: number) => performance.now() - previous;
	}
}

function flushTimers (perfFile: string) {
	const existingTimings = getExistingTimings(perfFile);
	const newTimings: SerializedTimings = {};
	Object.keys(timers).forEach(label => {
		const newTime = timers[label].time;
		newTimings[label] = newTime;
		console.info(`${label}: ${newTime}ms ${getDeviationString(newTime, existingTimings[label])}`);
	});
	if (Object.keys(existingTimings).length === 0) {
		console.info(`${BOLD}Storing performance information in ${perfFile}. Delete this file to get a new baseline.${RESET_COLOR}`);
		writeFile(perfFile, JSON.stringify(newTimings, null, 2))
			.catch(error => console.error('Could not update', perfFile, error));
	}
	console.info('');
}

function getExistingTimings (perfFile: string): SerializedTimings {
	try {
		const timings = JSON.parse(load(perfFile));
		console.info(`${BOLD}Comparing with ${perfFile}${RESET_COLOR}`);
		return timings;
	} catch (e) {}
	return {};
}

const COMPARISON_THRESHOLD = 20;

function getDeviationString (newTime: number, existingTime: number): string {
	if (!existingTime) return '';
	const absoluteDeviation = Math.abs(existingTime - newTime);
	if (absoluteDeviation < COMPARISON_THRESHOLD) return '';

	const relativeDeviation = Math.abs(100 * (newTime - existingTime) / existingTime);
	const sign = newTime >= existingTime ? '+' : '-';
	let deviationString = `(${sign}${relativeDeviation.toFixed(1)}%, ${sign}${absoluteDeviation}ms)${RESET_COLOR}`;
	if (relativeDeviation > 5) {
		deviationString = (newTime >= existingTime ? BOLD_RED : BOLD_GREEN) + deviationString;
	}
	return deviationString;
}

function timeStartImpl (label: string) {
	if (!timers.hasOwnProperty(label)) {
		timers[label] = {
			start: undefined,
			time: 0
		};
	}
	timers[label].start = getStartTime();
}

function timeEndImpl (label: string) {
	if (timers.hasOwnProperty(label)) {
		timers[label].time += getElapsedTime(timers[label].start);
	}
}

function flushTimersForInputImpl (inputOptions: InputOptions) {
	const fileBase = Array.isArray(inputOptions.input)
		? inputOptions.input[0]
		: inputOptions.input;
	flushTimers(`${fileBase}.perf.json`);
	timers = {};
}

function flushTimersForOutputImpl (outputOptions: OutputOptions) {
	const fileBase = outputOptions.dir
		? resolve(outputOptions.dir, 'output')
		: outputOptions.file;
	flushTimers(`${fileBase}.perf.json`);
	timers = {};
}

export let timeStart: (label: string) => void = NOOP,
	timeEnd: (label: string) => void = NOOP,
	flushTimersForInput: (inputOptions: InputOptions) => void = NOOP,
	flushTimersForOutput: (outputOptions: OutputOptions) => void = NOOP;

export function initialiseTimers (enableLogging: boolean) {
	if (enableLogging) {
		timers = {};
		setTimeHelpers();
		timeStart = timeStartImpl;
		timeEnd = timeEndImpl;
		flushTimersForInput = flushTimersForInputImpl;
		flushTimersForOutput = flushTimersForOutputImpl;
	} else {
		timeStart = NOOP;
		timeEnd = NOOP;
		flushTimersForInput = NOOP;
		flushTimersForOutput = NOOP;
	}
}
