import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import Backend, { Format } from "https://madata.dev/src/index.js";
import "https://madata.dev/components/auth/index.js";

let github = Backend.from("https://github.com/devographics/surveys/state_of_html/html2023/questions.yml", {
	format: Format.YAML
});

const fixed_data = {
	weights: {
		feature: .75,
		multipleWithOtherSentiment: {score: .25, per: "option"},
		multipleWithOther: {score: .15, per: "option"},
		multiple: {score: .15, per: "option", max: 3},
		textList: 2.5,
		text: 3,
		longtext: 3,
	},

	surveys: {
		js: {min: 2016},
		css: {min: 2019},
		html: {min: 2023},
		graphql: {min: 2022, max: 2022},
		react: {min: 2023},
	}
}

globalThis.app = createApp({
	data () {
		return {
			...fixed_data,
			github,
			categories: [],
			survey: "html",
			year: 2023,
		}
	},

	computed: {
		maxYear () {
			return Math.max(...Object.values(this.surveys).map(s => s.max ?? s.min));
		},

		surveyYears () {
			return this.range(this.surveys[this.survey].min, this.surveys[this.survey].max ?? this.maxYear);
		},

		questionsPath () {
			return `state_of_${ this.survey }/${ this.survey }${ this.year }/questions.yml`
		},

		questions () {
			return this.categories.flatMap(c => {
				c.questions.forEach(q => q.category = c);
				return c.questions;
			});
		},

		questionsByTemplate () {
			let ret = {};

			for (let question of this.questions) {
				let template = question.template ?? question.category.template;
				(ret[template] ??= []).push(question);
			}

			// Sort by count (descending)
			ret = Object.fromEntries(Object.entries(ret).sort((a, b) => b[1].length - a[1].length));

			return ret;
		},

		questionWeights () {
			return this.questions.map(q => this.questionWeight(q));
		}
	},

	methods: {
		range (min, max) {
			return Array.from({length: max - min + 1}, (_, i) => i + min);
		},

		templateWeight (template) {
			let weight = this.weights[template];

			if (weight?.per) {
				return `${ weight.score } / ${ weight.per }`;
			}

			return weight ?? 1;
		},

		questionWeight (question) {
			let weight = this.weights[question.template];
			let ret = weight ?? 1;

			if (weight?.per === "option") {
				ret = weight.score * question.options.length;
			}

			if (weight?.min) {
				ret = Math.max(ret, weight.min);
			}

			if (weight?.max) {
				ret = Math.min(ret, weight.max);
			}

			return ret;
		},

		sum (arr) {
			return arr.reduce((sum, item) => sum + item, 0);
		},

		round (num, decimals = 2) {
			return Math.round(num * 10 ** decimals) / 10 ** decimals;
		},
	},

	watch: {
		async questionsPath (path) {
			this.github.update(path);
			this.categories = await this.github.load();
		}
	}
}).mount(document.body);

app.categories = await github.load();

github.addEventListener("mv-login", async e => {
	app.categories = await github.load();
});