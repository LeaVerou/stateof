import { parseTime, formatTime } from "./util.js";

export default {
	props: {
		initial: [Number, String]
	},

	data () {
		let ret = {
			running: false,
			time: 0,
			edited: false,
			elapsed: 0,
			interval: null,
			startTime: null,
		};

		if (this.initial) {
			let time = parseTime(this.initial);
			if (time !== undefined) {
				ret.time = ret.elapsed = time;
			}
		}

		return ret;
	},

	emits: ["update", "pause", "override", "change", "clear"],

	methods: {
		start () {
			this.running = true;
			this.startTime = Date.now();
			this.interval = setInterval(() => this.updateTime(), 100);
			// this.$emit("start", this.elapsed);
		},

		pause () {
			this.running = false;
			this.elapsed += Date.now() - this.startTime;
			clearInterval(this.interval);
			this.$emit("pause", this.elapsed);
			this.$emit("change", this.elapsed);
		},

		clear () {
			this.running = false;
			this.elapsed = 0;
			this.time = 0;
			this.startTime = null;
			this.edited = false;
			clearInterval(this.interval);
			this.$emit("clear");
		},

		updateTime () {
			this.time = this.elapsed + (Date.now() - this.startTime);
			this.$emit("update", this.time);
		},

		formatTime,

		// Tweak time manually and be able to resume
		overrideTime (formattedTime) {
			let time = parseTime(formattedTime);
			if (time !== undefined) {
				let prevTime = this.time;
				let diff = time - prevTime;
				this.edited = true;
				this.time = time;
				this.elapsed = this.elapsed + diff;
				this.$emit("update", this.time);
				this.$emit("change", this.time);
			}
		}
	},

	template: `
	<div class="timer" :class="{ edited: edited, empty: time === 0 }">
		<input class="time" pattern="\d+:\d{2}.\d" :value="formatTime(time)" @input="overrideTime($event.target.value);" />
		<button class=start @click="running? pause() : start()">{{ running? '⏸️ Pause' : (startTime? '▶️ Resume' : '▶️ Start') }}</button>
		<button class=stop @click="clear()" :disabled="!(running || time > 0)" title="Clear">❌</button>
	</div>`,
}