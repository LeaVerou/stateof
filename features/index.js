import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import Backend, { Format } from "https://madata.dev/src/index.js";
import "https://madata.dev/components/auth/index.js";

const lineBreaks = /(\r?\n|\r)+/g;
const mdCodeBlock = /```(?<language>[a-zA-Z]*)?\n(?<code>[\S\s]*?)\n```/gm;
const includeIf = new Set(["Yes", "Likely Yes", "Maybe"]);
let github = Backend.from("https://github.com/leaverou/stateof/");
let gh_discussions = Backend.from("https://api.github.com/graphql", {
	query: `query {
  repository(owner: "devographics", name: "surveys") {
    discussions(last: 100, categoryId: "DIC_kwDOHru_As4CYAOU") {
      nodes {
        title,
		number,
        body,
		url,
		upvoteCount
      }
    }
  }
}`
});

gh_discussions.syncWith(github);

let coda_features = new Backend.CodaTable("https://coda.io/apis/v1/docs/TGBFYq175J/tables/grid-AMXj_tfVvc/");

let data = {
	feature_meta: (await fetch("./feature_meta.json").then(r => r.ok && r.json())),
	feature_meta_map: {},
	urls: await fetch("./urlmeta.json").then(r => r.ok && r.json()),
	discussions: await fetch("./discussions.json").then(r => r.ok && r.json()),
};

globalThis.app = createApp({
	data() {
		return {
			data,
			format: {
				features: "yml",
				discussions: "json",
				feature_meta: "json",
				urls: "json",
			},
			includeIf: ["Yes", "Likely Yes", "Maybe"],
			includeAll: true,
			github: Backend.from("https://github.com/leaverou/stateof/"),
			gh_discussions,
			coda_features,
			problems: {}
		}
	},

	methods: {
		copy (text) {
			navigator.clipboard.writeText(text);
		},

		stringify (data, format = "JSON") {
			let FormatClass = Format[format] ?? Format.find({ extension: format });
			return FormatClass.stringify(data);
		},

		async fetch_url_titles() {
			let data = this.data;
			let newURLs = 0;
			for (let url in data.urls) {
				if (data.urls[url] === undefined) {
					let title = data.urls[url] = await this.fetch_url_title(url);

					if (title !== null)  {
						newURLs++;
					}
				}
			}

			if (newURLs > 0) {
				console.warn(`Found ${newURLs} new URLs, please update urlmeta.json`);
			}
		},

		async fetch_url_title (url) {
			let response;
			try {
				response = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
				if (response.ok) {
					let title = await response.text();
					title = title.match(/<title>(?<title>[^<]+)<\/title>/)?.groups?.title;

					if (title) {
						title = title.trim().replace(/[\r\n]+/g, " ");
						return title;
					}
				}
			}
			catch (e) {
				console.warn("Failed to fetch", url, response?.status);
				return null;
			}
		},
	},

	computed: {
		stringified_features () {
			if (this.format.features === "yml") {
				return this.features.map(f => this.stringify([f], "yml")).join("\n");
			}

			return this.stringify(this.features, this.format.features);
		},

		consideration_states () {
			return new Set(this.data.feature_meta?.map?.(meta => meta["In Part 1"]));
		},

		features () {
			let { discussions, feature_meta, feature_meta_map, urls } = this.data;

			if (!feature_meta) {
				return [];
			}

			return feature_meta.flatMap((meta, i) => {
				let discussion_url = meta.Discussion;
				let id = meta.id;

				// if (!discussion_url) {
				// 	(this.problems[id] ??= new Set()).add("discussion");
				// }

				let discussion = discussions.find(d => d.url === discussion_url);
				feature_meta_map[id] = meta;

				if (!this.includeIf.includes(meta["In Part 1"])) {
					return [];
				}

				let ret = {
					id: meta.id,
					name: discussion?.title ?? meta.Question,
					needsTranslation: meta["Needs Translation"],
				};

				let body = discussion?.body.replace(lineBreaks, "\n");

				// Extract description
				if (meta.Description) {
					ret.description = meta.Description;
				}
				else if (body) {
					let description = body.match(/^[^#]+?(?=\n+###|\n+```)/);
					if (description) {
						ret.description = description[0].trim();
						body = body.slice(description.length);
					}
				}

				if (!ret.description) {
					(this.problems[id] ??= new Set()).add("description");
				}

				// Extract code example, if present
				if (meta["Code snippet"]) {
					let code = meta["Code snippet"];
					code = code.replace(/^```|```$/g, "").split("\n");
					let language = code.shift().trim();
					code = code.join("\n");

					if (!language) {
						if (meta.Type.includes("CSS")) {
							language = "css";
						}
						else if (meta.Type.includes("HTML Element") || meta.Type.includes("HTML attribute") || meta.Type.includes("HTML attribute value")) {
							language = "html";
						}
						else if (meta.Type.includes("JS API")) {
							language = "js";
						}
					}

					ret.example = { language, code };
				}
				else if (body?.includes("```")) {
					// Extract first code example from markdown
					const matches = body.matchAll(mdCodeBlock);

					let codeOffsets = {};
					for (let match of matches) {
						if (!ret.example) {
							// We only want the first code example in the question
							let code = match.groups.code;

							ret.example = {
								language: match.groups.language,
								code
							};

							codeOffsets.start = match.index;
						}

						codeOffsets.end = match.index + match[0].length;
					}

					// Remove code examples from body to not trip up other matching (e.g. URLs)
					if (codeOffsets.start !== undefined && codeOffsets.end !== undefined) {
						body = body.slice(0, codeOffsets.start) + body.slice(codeOffsets.end);
					}
				}

				if (!ret.example) {
					(this.problems[id] ??= new Set()).add("code");
				}

				// Extract URLs
				let urlText = meta.URLs || body;

				if (/https?:\/\//.test(urlText)) {
					let urlMatches = urlText.matchAll(/https?:\/\/[^\s\)]+/g);

					for (let url of urlMatches) {
						url = url[0];
						url = new URL(url);
						let origin = url.origin;

						if (origin === "https://developer.mozilla.org") {
							ret.mdn = url.href.substring(origin.length + 1);
						}
						else if (origin === "https://caniuse.com") {
							ret.caniuse = url.href.substring(origin.length + 1);
						}
						else if (origin === "https://w3.org" || origin === "https://www.w3.org") {
							ret.w3c = url.href.substring(origin.length + 1);
						}
						else if (url.href.startsWith("https://github.com/Devographics/surveys/discussions") || origin === "https://survey.devographics.com") {
							// Ignore
						}
						else {
							ret.resources ??= [];
							url = url.href;
							let resource = {url};

							if (urls[url]) {
								resource.title = urls[url];
							}
							else if (urls[url] === undefined) {
								urls[url] = undefined;
							}

							ret.resources.push(resource);
						}
					}
				}

				ret.tags = ["features"];

				return ret;
			});
		},

		unknown_url_count () {
			let { urls } = this.data;
			return Object.values(urls).filter((title) => title === undefined).length;
		},

		discussions_csv () {
			return this.data.discussions.map(d => {
				d = {...d};
				delete d.body;
				return d;
			});
		}
	},

	components: {
		"download-button": {
			props: {
				filename: String,
				data: Object | String,
			},
			data () {
				return {
					blob: null
				}
			},
			methods: {
				update_url () {
					let FormatClass = Format.find({ extension: this.filename.split(".").pop() });
					let blob = FormatClass.toBlob(this.data);
					return this.blob = URL.createObjectURL(blob);
				},
			},
			template: `<a :href="blob" class="button" :download="filename" @pointerdown="update_url(data)">Download</a>`
		}
	}
}).mount(document.body);

gh_discussions.addEventListener("mv-load", evt => {
	app.data.discussions = evt.detail.data?.repository?.discussions.nodes;
	console.info(`Loaded ${app.data.discussions.length} discussions`);
});

coda_features.addEventListener("mv-login", evt => {
	if (!app.data.feature_meta) {
		coda_features.load();
	}
});

coda_features.addEventListener("mv-load", evt => {
	app.data.feature_meta = Backend.CodaTable.simplifyData(evt.detail.data);
});