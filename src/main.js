import './style.css'

import './js/shaders/gradient-shader.js';
import './js/components/move-pin-component.js';
import './js/components/move-to-target-component.js';
import MapController from "./js/map-controller.js";

const mapController = new MapController();

const resetCameraButton = document.getElementById('reset-camera-button');
resetCameraButton.addEventListener('click', () => {
	mapController.moveCameraToDefault();
});
