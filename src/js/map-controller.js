class MapController {
	static async loadTweakpane() {
		const { Pane } = await import("https://unpkg.com/tweakpane@4.0.5/dist/tweakpane.min.js");
		return Pane;
	}

	_options = {
		sceneEl: document.getElementById("scene"),
		cameraEl: document.getElementById("camera"),
		mapEl: document.getElementById("map"),
		hemisphereLightEl: document.getElementById("hemisphere-light"),
		directionalLightEl: document.getElementById("directional-light"),
		debug: true,
	};

	constructor(options = {}) {
		Object.assign(this._options, options);

		this._init();
	}

	_setHemisphereLightFolder() {
		if (this._options.hemisphereLightEl) {
			const light = this._options.hemisphereLightEl.getAttribute('light');
			const folder = this._debugPanel.addFolder({
				title: "Hemisphere Light",
				expanded: false,
			});

			[
				{ object: light, key: 'intensity', params: { step: 0.1 } },
				{ object: light, key: 'color' },
			].forEach(({object, key, params}) => {
				folder.addBinding(object, key, params).on('change', ({ value }) => {
					this._options.directionalLightEl.setAttribute('light', {
						...this._options.directionalLightEl.getAttribute('light'),
						[key]: value,
					});
				});
			});
		}
	}

	_setDirectionalLightFolder() {
		if (this._options.directionalLightEl) {
			const position = {
				position: this._options.directionalLightEl.getAttribute('position'),
			};
			const light = this._options.directionalLightEl.getAttribute('light');
			const folder = this._debugPanel.addFolder({
				title: "Directional Light",
				expanded: false,
			});

			// console.log(light);

			folder.addBinding(position, 'position', { step: 0.1 }).on('change', ({ value }) => {
				this._options.directionalLightEl.setAttribute('position', value);
			});

			[
				{ object: light, key: 'intensity', params: { step: 0.1 } },
				{ object: light, key: 'color' },
				{ object: light, key: 'castShadow' },
				{ object: light, key: 'shadowBias', params: { step: 0.00001 } },
				{ object: light, key: 'shadowRadius' },
			].forEach(({object, key, params}) => {
				folder.addBinding(object, key, params).on('change', ({ value }) => {
					this._options.directionalLightEl.setAttribute('light', {
						...this._options.directionalLightEl.getAttribute('light'),
						[key]: value,
					});
				});
			});
		}
	}

	async _init() {
		if (this._options.debug) {
			const Pane = await MapController.loadTweakpane();
			this._debugPanel = new Pane({ title: "Settings", expanded: false });

			this._setHemisphereLightFolder();
			this._setDirectionalLightFolder();
		}
	}
}

export default MapController;