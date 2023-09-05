import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import Backend, { Format } from "https://madata.dev/src/index.js";
import "https://madata.dev/components/auth/index.js";
import Timer from "./timer.js"
import { parseTime, formatTime } from "./util.js";

let github = Backend.from("https://github.com/devographics/surveys/state_of_html/html2023/questions.yml", {
	format: Format.YAML
});

globalThis.app = createApp({
	data () {
		let timings = localStorage.timings ? JSON.parse(localStorage.timings) : {};
		return {
			github,
			categories: [],
			timings,
			csvURL: null
		}
	},

	computed: {
		allQuestions () {
			return this.categories.flatMap(c => c.questions);
		},

		questionsByTemplate () {
			let ret = {};

			for (let category of this.categories) {
				for (let question of category.questions) {
					let template = question.template ?? category.template;
					(ret[template] ??= []).push(question);
				}
			}

			return ret;
		},

		totalTimeByTemplate () {
			let ret = {};

			for (let [template, questions] of Object.entries(this.questionsByTemplate)) {
				ret[template] = questions.reduce((acc, q) => acc + (this.timings[q.id] ?? 0), 0);
			}

			return ret;
		},

		timingData () {
			return Object.entries(this.timings).map(([id, time]) => ({ id, time }));
		}
	},

	methods: {
		formatTime,

		updated (question, time) {
			this.timings[question.id] = time;
		},

		saveProgress () {
			localStorage.setItem("timings", JSON.stringify(this.timings));
		},

		updateCSVURL () {
			let blob = Format.CSV.toBlob(this.timingData);
			return this.csvURL = URL.createObjectURL(blob);
		},

		clear () {
			if (confirm("Are you sure you want to clear all times?")) {
				localStorage.removeItem("timings");
				this.timings = {};
				location.reload();
			}
		}
	},

	components: {
		"study-timer": Timer
	}
}).mount(document.body);

app.categories = await github.load();

github.addEventListener("mv-login", async e => {
	app.categories = await github.load();
});