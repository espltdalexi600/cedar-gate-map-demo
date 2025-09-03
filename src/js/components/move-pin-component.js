AFRAME.registerComponent('move-pin', {
	schema: {
		targetId: { default: '' },
	},
	init() {
		const { targetId } = this.data;

		this.targetEl = document.getElementById(targetId);
		if (!this.targetEl) {
			throw new Error(`[move-pin] Couldn't find el with id '${targetId}'`);
		}

		this.canvasEl = this.el.sceneEl.renderer.domElement;
		this.camera = this.el.sceneEl.camera;
		this.worldPosition = new THREE.Vector3();
	},
	tick() {
		this.el.object3D.getWorldPosition(this.worldPosition);

		const screenPosition = this.worldPosition.clone().project(this.camera);

		const x = ((screenPosition.x + 1) / 2) * this.canvasEl.clientWidth;
		const y = ((-screenPosition.y + 1) / 2) * this.canvasEl.clientHeight;

		this.targetEl.style.transform = `translate(${x}px, ${y}px)`;
	},
});