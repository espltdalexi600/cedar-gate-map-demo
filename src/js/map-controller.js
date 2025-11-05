class MapController {
	static async loadTweakpane() {
		const { Pane } = await import("https://unpkg.com/tweakpane@4.0.5/dist/tweakpane.min.js");
		return Pane;
	}

	static waitForComponentInit(el, name, callback) {
		if (!el) return;

		if (el.components[name]) {
			callback();
		} else {
			el.addEventListener("componentinitialized", ({ detail }) => {
				if (detail.name === name) {
					callback();
				}
			});
		}
	}

	_options = {
		sceneEl: document.getElementById("scene"),
		cameraEl: document.getElementById("camera"),
		mapPivotEl: document.getElementById("map-pivot"),
		mapEl: document.getElementById("map"),
		pinAnchorEls: document.querySelectorAll("[id^=pin-anchor]"),
		pinEls: document.querySelectorAll("[id^=pin]"),
		hemisphereLightEl: document.getElementById("hemisphere-light"),
		directionalLightEl: document.getElementById("directional-light"),
		skyEl: document.getElementById("sky"),
		cameraLookAt: { x: 0, y: 0, z: 0 },
		areaLabels: [],
		debug: false,
	};
	_defaultCameraPosition = new THREE.Vector3();
	_areas = [];
	_tweens = {};

	constructor(options = {}) {
		Object.assign(this._options, options);

		this._onSceneLoaded = this._onSceneLoaded.bind(this);
		this._onMapModelLoaded = this._onMapModelLoaded.bind(this);

		this._init();
	}

	_rotateCameraToDefault() {
		const camera = this._options.cameraEl.getObject3D('camera');
		if (camera) {
			const coords = this._options.cameraLookAt;
			camera.lookAt(coords.x, coords.y, coords.z);
		}
	}

	_setCameraFolder() {
		if (this._options.cameraEl) {
			const camera = this._options.cameraEl.getAttribute('camera');
			const folder = this._debugPanel.addFolder({
				title: "Camera",
				expanded: false,
			});

			folder.addBinding(this._options.cameraEl.getObject3D('camera'), 'position').on('change', ({ value }) => {
				this._rotateCameraToDefault();
			});

			folder.addBinding(this._options, 'cameraLookAt').on('change', ({ value }) => {
				this._options.cameraLookAt = value;
				this._rotateCameraToDefault();
			});

			folder.addBinding(camera, 'fov').on('change', ({ value }) => {
				this._options.cameraEl.setAttribute('camera', {
					...this._options.cameraEl.getAttribute('camera'),
					fov: value,
				});
			});
		}
	}

	_setMapFolder() {
		if (this._options.mapPivotEl && this._options.mapEl) {
			const options = {
				position: this._options.mapEl.getAttribute('position'),
				scale: this._options.mapEl.getAttribute('scale'),
			};
			const pivotOptions = {
				rotation: this._options.mapPivotEl.getAttribute('rotation'),
			}
			const folder = this._debugPanel.addFolder({
				title: "Map",
				expanded: false,
			});

			folder.addBinding(pivotOptions, 'rotation').on('change', ({ value }) => {
				this._options.mapPivotEl.setAttribute('rotation', value);
			});

			Object.keys(options).forEach((key) => {
				folder.addBinding(options, key).on('change', ({ value }) => {
					this._options.mapEl.setAttribute(key, value);
				});
			});
		}
	}

	_setPinAnchorsFolder() {
		if (this._options.pinAnchorEls.length) {
			const options = {
				showPinAnchors: false,
			};
			const folder = this._debugPanel.addFolder({
				title: "Pin Anchors",
				expanded: false,
			});

			folder.addBinding(options, 'showPinAnchors').on('change', ({ value }) => {
				this._options.pinAnchorEls.forEach((pinAnchor) => {
					pinAnchor.setAttribute('visible', value);
				});
			});

			this._options.pinAnchorEls.forEach((pinAnchor) => {
				const options = {
					position: pinAnchor.getAttribute('position'),
				};
				folder.addBinding(options, 'position', { step: 0.01 }).on('change', ({ value }) => {
					pinAnchor.setAttribute('position', value);
				});
			});
		}
	}

	_setHemisphereLightFolder() {
		if (this._options.hemisphereLightEl) {
			const options = {
				position: this._options.hemisphereLightEl.getAttribute('position'),
			};
			const light = this._options.hemisphereLightEl.getAttribute('light');
			const folder = this._debugPanel.addFolder({
				title: "Hemisphere Light",
				expanded: false,
			});

			folder.addBinding(options, 'position', { step: 0.1 }).on('change', ({ value }) => {
				this._options.hemisphereLightEl.setAttribute('position', value);
			});

			[
				{ object: light, key: 'intensity', params: { step: 0.1 } },
				{ object: light, key: 'color' },
			].forEach(({object, key, params}) => {
				folder.addBinding(object, key, params).on('change', ({ value }) => {
					this._options.hemisphereLightEl.setAttribute('light', {
						...this._options.hemisphereLightEl.getAttribute('light'),
						[key]: value,
					});
				});
			});
		}
	}

	_setDirectionalLightFolder() {
		if (this._options.directionalLightEl) {
			const options = {
				position: this._options.directionalLightEl.getAttribute('position'),
			};
			const light = this._options.directionalLightEl.getAttribute('light');
			const folder = this._debugPanel.addFolder({
				title: "Directional Light",
				expanded: false,
			});

			folder.addBinding(options, 'position', { step: 0.1 }).on('change', ({ value }) => {
				this._options.directionalLightEl.setAttribute('position', value);
			});

			[
				{ object: light, key: 'intensity', params: { step: 0.1 } },
				{ object: light, key: 'color' },
				{ object: light, key: 'castShadow' },
				{ object: light, key: 'shadowRadius' },
				{ object: light, key: 'shadowBias', params: { step: 0.00001 } },
			].forEach(({object, key, params}) => {
				folder.addBinding(object, key, params).on('change', ({ value }) => {
					this._options.directionalLightEl.setAttribute('light', {
						...this._options.directionalLightEl.getAttribute('light'),
						[key]: value,
					});
				});
			});

			folder.addBinding(this._options.directionalLightEl.getObject3D('light').shadow, 'normalBias', { step: 0.001 });
		}
	}

	_setSkyFolder() {
		if (this._options.skyEl) {
			const material = this._options.skyEl.getAttribute('material');
			const folder = this._debugPanel.addFolder({
				title: "Sky",
				expanded: false,
			});

			[
				{ object: material, key: 'topColor' },
				{ object: material, key: 'bottomColor' },
			].forEach(({object, key, params}) => {
				folder.addBinding(object, key).on('change', ({ value }) => {
					this._options.skyEl.setAttribute('material', {
						...this._options.skyEl.getAttribute('material'),
						[key]: value,
					});
				});
			});
		}
	}

	_highlightArea(area, { opacity = 0.2, duration = 1 } = {}) {
		this._tweens[area.name]?.kill();
		this._tweens[area.name] = gsap.to(area.material, {
			opacity,
			duration,
		});
	}

	_addListeners() {
		this._options.pinEls.forEach((pinAnchor) => {
			pinAnchor.addEventListener('click', (event) => {
				this._options.cameraEl.setAttribute("move-to-target", {
					targetId: event.target.dataset.anchorId,
					initialPosition: {
						x: this._defaultCameraPosition.x,
						y: this._defaultCameraPosition.y,
						z: this._defaultCameraPosition.z
					},
					debug: this._options.debug,
				});

				const area = this._areas.find(({ name }) => name === event.target.dataset.area);
				if (area) {
					this._highlightArea(area);
				}
			});
		});
	}

	_onDebugLoaded() {
		this._setCameraFolder();
		this._setMapFolder();
		this._setPinAnchorsFolder();
		this._setHemisphereLightFolder();
		this._setDirectionalLightFolder();
		this._setSkyFolder();
	}

	_onSceneLoaded() {
		this._defaultCameraPosition.copy(this._options.cameraEl.getObject3D('camera').position);
		this._options.directionalLightEl.getObject3D('light').shadow.normalBias = 0.034;
		this._rotateCameraToDefault();
		this._addListeners();
	}

	_onMapModelLoaded() {
		const mapModel = this._options.mapEl.getObject3D('mesh');
		this._options.areaLabels.forEach((label) => {
			const mesh = mapModel.getObjectByName(label);
			if (mesh) {
				this._areas.push(mesh);
				this._highlightArea(mesh, { opacity: 0, duration: 0 });
			}
		});
	}

	_init() {
		if (this._options.debug) {
			MapController.loadTweakpane().then((Pane) => {
				this._debugPanel = new Pane({ title: "Settings", expanded: false });

				if (this._options.sceneEl.hasLoaded) {
					this._onDebugLoaded();
				} else {
					this._options.sceneEl.addEventListener('loaded', () => {
						this._onDebugLoaded();
					});
				}
			});
		}

		if (this._options.sceneEl.hasLoaded) {
			this._onSceneLoaded();
		} else {
			this._options.sceneEl.addEventListener('loaded', this._onSceneLoaded);
		}

		if (this._options.mapEl.getObject3D('mesh')) {
			this._onMapModelLoaded();
		} else {
			this._options.mapEl.addEventListener('model-loaded', this._onMapModelLoaded);
		}
	}

	moveCameraToDefault() {
		this._options.cameraEl.removeAttribute("move-to-target");
		this._areas.forEach((area) => this._highlightArea(area, { opacity: 0 }));
	}
}

export default MapController;