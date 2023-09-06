import { Question, SingleChoiceQuestion, MultiChoiceQuestion } from './models.js'

export default [
	new MultiChoiceQuestion({
		id: "input_types",
		question: "Tools",
		description: "What frameworks, libraries, or tools do you use across multiple projects?",
		allowCustom: true,
		// maxCustomCount: 3,
		options: [
			{
				"value": "none",
				"label": "🚫 None",
			},
			{
				"value": "react",
				"label": "ReactJS",

			},
			{
				"value": "vue",
				"label": "VueJS",
			},
			{
				"value": "jquery",
				"label": "jQuery",
			},
			{
				"value": "postcss",
				"label": "PostCSS",
			},
		],
	}),
	// new MultiChoiceQuestion({
	// 	id: "pain_points",
	// 	question: "What are your biggest pain points around making Web Components?",
	// 	allowCustom: true,
	// 	initialCustomCount: 2,
	// 	options: [],
	// }),
	// new SingleChoiceQuestion({
	// 	id: "gender",
	// 	question: "Your gender:",
	// 	allowCustom: true,
	// 	options: [
	// 		{
	// 			"label": "🚫 Prefer not to say",
	// 			"value": "na",
	// 		},
	// 		{
	// 			"label": "Female",
	// 			"value": "female",
	// 		},
	// 		{
	// 			"label": "Male",
	// 			"value": "male",
	// 		},
	// 		{
	// 			"label": "Non-binary",
	// 			"value": "nonbinary",
	// 		}
	// 	],
	// })
];