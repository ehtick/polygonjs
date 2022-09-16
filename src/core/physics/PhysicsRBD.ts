import {TypeAssert} from './../../engine/poly/Assert';
import {CorePhysicsUserData} from './PhysicsUserData';
import {PhysicsRBDColliderType, PhysicsRBDType, CorePhysicsAttribute} from './PhysicsAttribute';
import {Object3D, Vector3} from 'three';
import type {World, RigidBodyType} from '@dimforge/rapier3d';
import {CorePhysicsLoaded, PhysicsLib} from './CorePhysics';
export function physicsCreateRBD(PhysicsLib: PhysicsLib, world: World, object: Object3D) {
	const type = CorePhysicsAttribute.getRBDType(object);
	const colliderType = CorePhysicsAttribute.getColliderType(object);
	if (!(type != null && colliderType != null)) {
		return;
	}
	const rbdType: RigidBodyType | undefined = PhysicsRBDTypeToRigidBodyType(type);
	if (rbdType == null) {
		return;
	}

	// restoreRBDInitMatrix(object);

	const id = CorePhysicsAttribute.getRBDId(object);
	const rigidBodyDesc = new PhysicsLib.RigidBodyDesc(rbdType);

	rigidBodyDesc.setTranslation(object.position.x, object.position.y, object.position.z);
	rigidBodyDesc.setRotation(object.quaternion);
	const rigidBody = world.createRigidBody(rigidBodyDesc);
	CorePhysicsUserData.setRigidBody(object, rigidBody);

	const linearDamping = CorePhysicsAttribute.getLinearDamping(object);
	const angularDamping = CorePhysicsAttribute.getAngularDamping(object);

	if (linearDamping != null) {
		rigidBodyDesc.setLinearDamping(linearDamping);
	}
	if (angularDamping != null) {
		rigidBodyDesc.setAngularDamping(angularDamping);
	}
	const colliderDesc = PhysicsRBDCollider(PhysicsLib, colliderType, object);
	if (!colliderDesc) {
		console.error('no collider', object);
		return;
	}
	const restitution = CorePhysicsAttribute.getRestitution(object);
	if (restitution != null) {
		colliderDesc.setRestitution(restitution);
	}

	world.createCollider(colliderDesc, rigidBody);

	return {colliderDesc, rigidBody, id};
}

// const PHYSICS_INIT_MATRIX_ATTRIB_NAME = '__physicsInitMatrix__';
// interface Object3DWithInitMatrix extends Object3D {
// 	__physicsInitMatrix__?: Matrix4;
// }
// function physicsRBDSetInitMatrix(object: Object3D) {
// 	if (PHYSICS_INIT_MATRIX_ATTRIB_NAME in object) {
// 		return;
// 	}
// 	object.updateWorldMatrix(true, false);
// 	object.updateMatrix();
// 	(object as Object3DWithInitMatrix)[PHYSICS_INIT_MATRIX_ATTRIB_NAME] = object.matrix.clone();
// 	console.warn('set', object.matrix.elements);
// }
// function restoreRBDInitMatrix(object: Object3D) {
// 	if (!(PHYSICS_INIT_MATRIX_ATTRIB_NAME in object)) {
// 		return;
// 	}
// 	const initMatrix = (object as Object3DWithInitMatrix)[PHYSICS_INIT_MATRIX_ATTRIB_NAME];
// 	if (!(initMatrix instanceof Matrix4)) {
// 		return;
// 	}
// 	object.matrix.copy(initMatrix);
// 	console.warn('restored', initMatrix.elements);
// 	delete (object as Object3DWithInitMatrix)[PHYSICS_INIT_MATRIX_ATTRIB_NAME];
// }

// private _updateRBDBound = this._updateRBD.bind(this);
export async function physicsUpdateRBD(object: Object3D) {
	const body = await CorePhysicsUserData.rigidBody(object);
	if (!body) {
		console.warn('no rbd found');
		return;
	}
	// physicsRBDSetInitMatrix(object);
	const position = body.translation();
	const rotation = body.rotation();
	object.position.set(position.x, position.y, position.z);
	object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
	object.updateMatrix();
}
const currentPos = new Vector3();
const newPos = new Vector3();

export function physicsRBDApplyImpulse(object: Object3D, impulse: Vector3) {
	const body = CorePhysicsUserData.rigidBody(object);
	if (!body) {
		console.warn('no rbd found');
		return;
	}
	body.applyImpulse(impulse, true);
}

export function setPhysicsRBDKinematicPosition(object: Object3D, targetPosition: Vector3, lerp: number) {
	const body = CorePhysicsUserData.rigidBody(object);
	if (!body) {
		console.warn('no rbd found');
		return;
	}
	if (!body.isKinematic()) {
		console.warn('rbd is not kinematic');
		return;
	}
	if (lerp < 1) {
		const rbdPosition = body.translation();
		currentPos.set(rbdPosition.x, rbdPosition.y, rbdPosition.z);
		newPos.copy(targetPosition);
		currentPos.lerp(newPos, lerp);
		body.setNextKinematicTranslation(currentPos);
	} else {
		body.setNextKinematicTranslation(targetPosition);
	}
}

function PhysicsRBDTypeToRigidBodyType(type: PhysicsRBDType) {
	const RigidBodyType = CorePhysicsLoaded()?.RigidBodyType;
	if (!RigidBodyType) {
		return;
	}
	switch (type) {
		case PhysicsRBDType.FIXED: {
			return RigidBodyType.Fixed;
		}
		case PhysicsRBDType.DYNAMIC: {
			return RigidBodyType.Dynamic;
		}
		case PhysicsRBDType.KINEMATIC_POS: {
			return RigidBodyType.KinematicPositionBased;
		}
	}
	TypeAssert.unreachable(type);
}
const tmp = new Vector3();
function PhysicsRBDCollider(PhysicsLib: PhysicsLib, colliderType: PhysicsRBDColliderType, object: Object3D) {
	switch (colliderType) {
		case PhysicsRBDColliderType.CUBOID: {
			CorePhysicsAttribute.getCuboidSize(object, tmp);
			return PhysicsLib.ColliderDesc.cuboid(tmp.x, tmp.y, tmp.z);
		}
		case PhysicsRBDColliderType.SPHERE: {
			const radius = CorePhysicsAttribute.getRadius(object);
			return PhysicsLib.ColliderDesc.ball(radius);
		}
		case PhysicsRBDColliderType.CAPSULE: {
			const halfHeight = CorePhysicsAttribute.getHeight(object) * 0.5;
			const radius = CorePhysicsAttribute.getRadius(object);
			return PhysicsLib.ColliderDesc.capsule(halfHeight, radius);
		}
	}
	TypeAssert.unreachable(colliderType);
}