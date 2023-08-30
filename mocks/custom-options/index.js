import questions from './sample-questions.js';
import { createApp, fetchSurveyCSS } from '../util.js';
import VFocus from "https://mavue.mavo.io/v-focus/v-focus.js";

globalThis.app = createApp({
	data() {
		return {
			questions
		};
	},

	methods: {
		handle_keyup ($event, { question, option, index }) {
			// These are only relevant for multiple custom options
			if (!question.multiple) {
				return;
			}

			let options = question.customOptions;
			let key = $event.key;
			let relOption;

			if (!question.longform) {
				// Enter inserts a new option and focuses it
				// UNLESS there is an empty option right underneath, in which case it focuses that
				if (key === "Enter") {
					let nextOption = options[index + 1];
					relOption = nextOption && nextOption.value === ""? nextOption : question.add_custom_option(index);
				}
				// Arrows should move focus up and down (wrapping around at the ends)
				else if (key === "ArrowUp") {
					relOption = options[index - 1] ?? options[options.length - 1];
				}
				else if (key === "ArrowDown") {
					relOption = options[index + 1] ?? options[0];
				}
			}

			// Backspace on an empty option should delete it and focus the previous option (or the next one if there is none)
			// Unless there are no custom options left, in which case we can't delete the last one (then we won't be able to add any!)
			if (key === "Backspace" && option.value === "" && options.length > 1) {
				$event.preventDefault();
				relOption = options[index - 1] ?? options[index + 1];
				options.splice(index, 1);
			}

			if (relOption) {
				relOption.active = true;
			}
		},
	},

	directives: {
		"focus": VFocus
	}
}).mount(document.body);

fetchSurveyCSS();

