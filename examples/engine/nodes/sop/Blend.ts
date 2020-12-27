import {PolyScene} from '../../../../src/engine/scene/PolyScene';

export function SopBlend() {
	// create a scene
	const scene = new PolyScene();

	// create a box and a sphere
	const geo = scene.root.createNode('geo');
	const box = geo.createNode('box');
	const sphere = geo.createNode('sphere');
	sphere.p.resolution.set([50, 50]);

	// use a transform ray SOP to snap the points of the sphere to the box
	const transform = geo.createNode('transform');
	const ray = geo.createNode('ray');
	transform.setInput(0, sphere);
	transform.p.scale.set(0.2);
	ray.setInput(0, transform);
	ray.setInput(1, box);

	// create a blend,
	// to blend between the sphere and its projected version
	const blend = geo.createNode('blend');
	blend.setInput(0, sphere);
	blend.setInput(1, ray);
	blend.flags.display.set(true);

	// add a light
	scene.root.createNode('hemisphereLight');

	// create a camera
	const perspective_camera1 = scene.root.createNode('perspectiveCamera');
	perspective_camera1.p.t.set([5, 5, 5]);
	// add orbit_controls
	const events1 = perspective_camera1.createNode('events');
	const orbits_controls = events1.createNode('cameraOrbitControls');
	perspective_camera1.p.controls.set(orbits_controls.fullPath());

	// EXPORT
	const nodes = [blend];
	const html_nodes = {blend};
	const camera = perspective_camera1;
	return {scene, camera, nodes, html_nodes};
}