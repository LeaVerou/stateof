import { Format } from "https://madata.dev/src/index.js";

let questions = {
	forms: ["forms_pain_points"],
	interactivity: ["interactivity_pain_points"],
	content: ["content_pain_points"],
	web_components: [
		"using_web_components_pain_points",
		"making_web_components_pain_points",
	],
	accessibility: ["accessibility_pain_points"],
	mobile_web_apps: ["mobile_web_apps_pain_points"],
	usage: [
		"html_interoperability_features",
		"html_functionality_features",
		"html_missing_elements",
	]
};

// Min number of letters for a response to be considered valid
const RESPONSE_MIN_LETTERS = 3;

export async function fetchResponses (questions) {

let query = `query GetFreeformData {
	surveys {
		state_of_html {
		html2023 {
			${ Object.entries(questions).map(([pageId, questionIds]) =>	`${pageId} {
				${ questionIds.map(questionId => `${questionId} {
					freeform {
						rawData {
							content
							responseId
						}
					}
				}`).join("\n				")	 }
			}`).join("\n			") }
		}
		}
	}
}`;

console.log(query);

let response = await fetch("https://api.devographics.com/graphql", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({query}),
});
let json = await response.json();

let data = json.data.surveys.state_of_html.html2023;
data = Object.values(data); // we don't need to group by pages
data = Object.assign(...data);

let responseIds = new Map();

for (let questionId in data) {
	let rawData = data[questionId] = data[questionId].freeform.rawData;

	for (let response of rawData) {
		let {content, responseId} = response;
		if (!Array.isArray(content)) {
			content = [content];
		}

		response.content = content.flatMap(a => {
			a = a.trim();

			let lettersOnly = a.replace(/\P{Letter}/gu, "");

			if (lettersOnly.length < RESPONSE_MIN_LETTERS) {
				return [];
			}

			// if (lettersOnly.length < RESPONSE_MIN_LETTERS + 3) {
			// 	console.log(lettersOnly);
			// }

			return a;
		});

		if (!responseIds.has(responseId)) {
			responseIds.set(responseId, responseIds.size + 1);
		}
	}
}

for (let questionId in data) {
	let responses = data[questionId].filter(r => r.content.length > 0);

	// Un-nest individual responses
	data[questionId] = responses.flatMap(r => {
		return r.content.map(c => ({responseId: responseIds.get(r.responseId), questionId, content: c}));
	})
}

data = Object.values(data).flat();

console.log(data);

download_json.href = Format.JSON.toBlobURL(data);
download_csv.href = Format.CSV.toBlobURL(data);

}

fetch_responses_form.onsubmit = e => {
	let questions;
	try {
		questions = Format.YAML.parse(questions_textarea.value);
		questions_textarea.setCustomValidity("");
	}
	catch (e) {
		questions_textarea.setCustomValidity(e.message);
		console.error(e);
	}
	questions_textarea.reportValidity();
	e.preventDefault();
	fetchResponses(questions);
}
// fetchResponses(questions);