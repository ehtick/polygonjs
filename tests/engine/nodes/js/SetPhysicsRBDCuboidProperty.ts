import type {QUnit} from '../../../helpers/QUnit';
import {CoreSleep} from '../../../../src/core/Sleep';
import {PhysicsWorldSopNode} from '../../../../src/engine/nodes/sop/PhysicsWorld';
import {RendererUtils} from '../../../helpers/RendererUtils';
import {PhysicsRBDColliderType, PhysicsRBDType} from '../../../../src/core/physics/PhysicsAttribute';
import {PhysicsRBDCuboidAttribute} from '../../../../src/core/physics/PhysicsAttribute';
import {MultAddInput} from '../../../../src/engine/nodes/js/MultAdd';
import {JsConnectionPointType} from '../../../../src/engine/nodes/utils/io/connections/Js';
import {RBDCuboidProperty, _getPhysicsRBDCuboidSizes} from '../../../../src/core/physics/shapes/RBDCuboid';
import {Vector3} from 'three';
export function testenginenodesjsSetPhysicsRBDCuboidProperty(qUnit: QUnit) {

function createPhysicsWorldNodes(node: PhysicsWorldSopNode) {
	// const physicsWorldReset = node.createNode('physicsWorldReset');
	// const onScenePlayState = node.createNode('onScenePlayState');
	const physicsWorldStepSimulation = node.createNode('physicsWorldStepSimulation');
	const onTick = node.createNode('onTick');

	// physicsWorldReset.setInput(0, onScenePlayState, OnScenePlayStateActorNode.INPUT_NAME_PAUSE);
	physicsWorldStepSimulation.setInput(0, onTick);
}

qUnit.test('js/setPhysicsRBDCuboidProperty simple', async (assert) => {
	const scene = window.scene;
	const geo1 = window.geo1;
	const cameraNode = window.perspective_camera1;
	cameraNode.p.t.z.set(5);

	const box1 = geo1.createNode('box');
	const physicsRBDAttributes1 = geo1.createNode('physicsRBDAttributes');
	const physicsWorld1 = geo1.createNode('physicsWorld');
	const actor1 = geo1.createNode('actor');

	physicsRBDAttributes1.setInput(0, box1);
	physicsRBDAttributes1.setRBDType(PhysicsRBDType.DYNAMIC);
	physicsRBDAttributes1.setColliderType(PhysicsRBDColliderType.CUBOID);
	actor1.setInput(0, physicsRBDAttributes1);
	physicsWorld1.setInput(0, actor1);
	physicsWorld1.flags.display.set(true);

	createPhysicsWorldNodes(physicsWorld1);
	const getPhysicsRBDCuboidProperty1 = actor1.createNode('getPhysicsRBDCuboidProperty');
	const setPhysicsRBDCuboidProperty1 = actor1.createNode('setPhysicsRBDCuboidProperty');
	const onManualTrigger1 = actor1.createNode('onManualTrigger');
	const getObjectAttribute1 = actor1.createNode('getObjectAttribute');
	const multAdd1 = actor1.createNode('multAdd');
	setPhysicsRBDCuboidProperty1.setInput(0, onManualTrigger1);
	getObjectAttribute1.setAttribName(PhysicsRBDCuboidAttribute.SIZES);
	getObjectAttribute1.setAttribType(JsConnectionPointType.VECTOR3);
	// setPhysicsRBDSphereProperty1.setInput(setPhysicsRBDSphereProperty1.p.radius.name(), getPhysicsRBDSphereProperty1);

	const container = await physicsWorld1.compute();
	const object = container.coreContent()!.threejsObjects()[0].children[0];
	assert.in_delta(object.position.y, 0, 0.01);
	await RendererUtils.withViewer({cameraNode}, async ({viewer, element}) => {
		scene.play();
		await CoreSleep.sleep(100);
		assert.less_than(object.position.y, -0.01, 'object has gone down');

		//
		setPhysicsRBDCuboidProperty1.p.sizes.set([2, 2, 2]);
		await CoreSleep.sleep(50);
		onManualTrigger1.p.trigger.pressButton();
		await CoreSleep.sleep(50);
		const target = new Vector3();
		_getPhysicsRBDCuboidSizes(object, target);
		assert.equal(target.x, 2);

		//
		await scene.batchUpdates(() => {
			setPhysicsRBDCuboidProperty1.p.sizes.set([4, 4, 4]);
			setPhysicsRBDCuboidProperty1.p.lerp.set(0.5);
		});
		await CoreSleep.sleep(50);
		onManualTrigger1.p.trigger.pressButton();
		await CoreSleep.sleep(50);
		_getPhysicsRBDCuboidSizes(object, target);
		assert.equal(target.x, 3, 'with lerp=0.5');

		//
		await scene.batchUpdates(() => {
			setPhysicsRBDCuboidProperty1.setInput(setPhysicsRBDCuboidProperty1.p.sizes.name(), multAdd1);
			setPhysicsRBDCuboidProperty1.p.lerp.set(1);
			multAdd1.setInput(MultAddInput.VALUE, getPhysicsRBDCuboidProperty1, RBDCuboidProperty.SIZES);
			// const constant1 = actor1.createNode('constant')
			// constant1.setJsType(JsConnectionPointType.VECTOR3)
			multAdd1.params.get('mult')!.set([2, 2, 2]);
		});
		await CoreSleep.sleep(50);
		onManualTrigger1.p.trigger.pressButton();
		await CoreSleep.sleep(50);
		_getPhysicsRBDCuboidSizes(object, target);
		assert.equal(target.x, 6, 'radius x2');

		//
		setPhysicsRBDCuboidProperty1.setInput(setPhysicsRBDCuboidProperty1.p.sizes.name(), getObjectAttribute1);
		await CoreSleep.sleep(50);
		onManualTrigger1.p.trigger.pressButton();
		await CoreSleep.sleep(50);
		_getPhysicsRBDCuboidSizes(object, target);
		assert.equal(target.x, 1, 'back to original attrib value');
	});
});

}