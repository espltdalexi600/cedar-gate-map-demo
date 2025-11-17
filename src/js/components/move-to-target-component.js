AFRAME.registerComponent('move-to-target', {
	schema: {
		targetId: { default: '' },
		debug: { default: false },
		target: { default: { x: 0, y: 0, z: 0 } },
		initialPosition: { default: { x: 0, y: 0, z: 0 } },
	},
	init() {
		const { targetId } = this.data;

		this.targetEl = document.getElementById(targetId);
		if (!this.targetEl) {
			throw new Error(
				`[move-to-target] Couldn't find el with id '${targetId}'`
			);
		}

		this.scene = this.el.sceneEl.object3D;
		this.camera = this.el.getObject3D('camera');
		this.targetPosition = new THREE.Vector3();
		this.targetEl.object3D.getWorldPosition(this.targetPosition);

		const curve = this.buildCurve(
			this.camera.position,
			this.targetPosition,
			1,
			3
		);

		this.el.pause();
		this.moveCamera({ path: curve, target: this.targetPosition, onComplete: () => {
			this.el.setAttribute('orbit-controls', { target: this.targetPosition });
			this.el.play();
		} });
	},
	remove() {
		this.moveCameraToDefault();
	},
	buildCurve(startPos, endPos, offsetY = 0, radius = 0) {
		const { debug } = this.data;
		const startPoint = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
		const v1 = this.getControlPoint(startPos, endPos, 0.5);
		const endPoint = new THREE.Vector3(endPos.x, endPos.y + offsetY, endPos.z);

		const ort = new THREE.Vector2(
			startPos.x - endPoint.x,
			startPos.z - endPoint.z
		);

		ort.divideScalar(ort.length());

		endPoint.set(
			endPoint.x + ort.x * radius,
			endPoint.y,
			endPoint.z + ort.y * radius
		);

		const curve = new THREE.QuadraticBezierCurve3(startPoint, v1, endPoint);

		if (debug) {
			const points = curve.getPoints(30);
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const curveObject = new THREE.Line(
				geometry,
				new THREE.LineBasicMaterial({
					color: 0xff0000,
					transparent: true,
					opacity: 1,
				})
			);
			curveObject.name = 'debug_line';
			this.scene.add(curveObject);
		}

		return curve;
	},
	moveCamera({ path, target, onComplete }) {
		const self = this;
		const curveLength = path.getLength();
		const proxy = { value: 0 };
		const q1 = new THREE.Quaternion().copy(self.camera.quaternion);
		const endPos = path.getPointAt(1);

		const lookMatrix = new THREE.Matrix4();
		lookMatrix.lookAt(endPos, target, new THREE.Vector3(0, 1, 0));
		const q2_precalc = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

		this.tween && this.tween.kill();
		this.tween = gsap.to(proxy, {
			duration: curveLength / 4,
			value: 1,
			ease: Power1.easeInOut,
			onUpdate: function (camera) {
				const pos = path.getPointAt(proxy.value);
				camera.position.copy(pos);
				camera.lookAt(target);
				const q2_onupdate = new THREE.Quaternion().copy(camera.quaternion);
				const q2 = new THREE.Quaternion().copy(q2_precalc);
				q2.slerp(q2_onupdate, proxy.value * proxy.value * proxy.value);

				camera.quaternion.slerpQuaternions(q1, q2, proxy.value);
			},
			onUpdateParams: [self.camera],
			onComplete,
		});
	},
	moveCameraToDefault() {
		const { target, initialPosition } = this.data;
		const curve = this.buildCurve(this.camera.position, initialPosition);

		this.moveCamera({
			path: curve,
			target: new THREE.Vector3(target.x, target.y, target.z),
			onComplete: () => {
				this.el.play();
			},
		});
	},
	shortestAngle(start, end) {
		return Math.atan2(Math.sin(end - start), Math.cos(end - start));
	},
	getControlPoint(start, end, factor) {
		const startSpherical = new THREE.Spherical().setFromVector3(start);
		const endSpherical = new THREE.Spherical().setFromVector3(end);
		const midRadius = (startSpherical.radius + endSpherical.radius) / 2;
		const midPhi =
			startSpherical.phi +
			this.shortestAngle(endSpherical.phi, startSpherical.phi) / 2;
		const midTheta = (startSpherical.theta + endSpherical.theta) / 2;
		const midSpherical = new THREE.Spherical(midRadius, midPhi, midTheta);
		midSpherical.radius *= factor;
		return new THREE.Vector3().setFromSpherical(midSpherical);
	},
});
