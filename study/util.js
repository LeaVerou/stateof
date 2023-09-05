export function getDurationParts (time) {
	let minutes = Math.floor(time / 60000);
	let seconds = Math.floor((time % 60000) / 1000);
	let ms = time % 1000;
	return { minutes, seconds, ms };
}

export function formatTime (time, { format = "readable" } = {}) {
	let { minutes, seconds, ms } = getDurationParts(time);

	let ms100 = Math.floor(ms / 100);
	return `${ minutes }:${ (seconds + "").padStart(2, "0") }.${ ms100 }`;
}

export function parseTime (formattedTime) {
	if (typeof formattedTime === "number") {
		return formattedTime;
	}

	let parts = formattedTime.match(/(?<minutes>\d+):(?<seconds>\d{1,2})(?:.(?<ms>\d))?/)?.groups;
	if (parts) {
		let { minutes, seconds, ms } = parts;
		ms ??= 0;
		return minutes * 60000 + seconds * 1000 + ms * 100;
	}
}