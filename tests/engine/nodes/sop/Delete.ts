import type {QUnit} from '../../../helpers/QUnit';
import type {Mesh} from 'three';
import {
	ObjectType,
	objectTypeFromObject,
	AttribClass,
	AttribType,
	ATTRIBUTE_TYPES,
} from '../../../../src/core/geometry/Constant';
import {BaseCorePoint, CorePoint} from '../../../../src/core/geometry/entities/point/CorePoint';
import {TransformTargetType} from '../../../../src/core/Transform';
import {QuadObject} from '../../../../src/core/geometry/modules/quad/QuadObject';
import {CoreObjectType} from '../../../../src/core/geometry/ObjectContent';
import {QuadPrimitive} from '../../../../src/core/geometry/modules/quad/QuadPrimitive';
import {TetPrimitive} from '../../../../src/core/geometry/modules/tet/TetPrimitive';
import {primitivesFromObject} from '../../../../src/core/geometry/entities/primitive/CorePrimitiveUtils';

const _points: CorePoint<CoreObjectType>[] = [];

export function testenginenodessopDelete(qUnit: QUnit) {
	qUnit.test('sop/delete: (class=points) simple plane', async (assert) => {
		const geo1 = window.geo1;

		const plane1 = geo1.createNode('plane');
		const delete1 = geo1.createNode('delete');
		delete1.setInput(0, plane1);
		delete1.p.byExpression.set(1);

		let container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 3);

		// the points of one face remain if deleting a single point
		delete1.p.expression.set('@ptnum==0');
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 3);

		// all 4 points removed if deleting one 2 of them, since that deletes both faces
		delete1.p.expression.set('@ptnum==1 || @ptnum==0');
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 0);
	});

	qUnit.test('sop/delete: (class=points) simple box', async (assert) => {
		const geo1 = window.geo1;

		const box1 = geo1.createNode('box');
		const delete1 = geo1.createNode('delete');
		delete1.setInput(0, box1);
		delete1.p.byExpression.set(1);

		let container = await box1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 24, 'box');

		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 33, 'after first delete'); // mm, I'd expect 21 instead. I could probably optimize the geometry creation from the kept points

		// only the top points remain
		delete1.p.expression.set('@P.y<0');
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 6, 'after expression delete');
	});

	qUnit.test('sop/delete: (class=points) simple box byExpression with and without expression', async (assert) => {
		const geo1 = window.geo1;

		const add1 = geo1.createNode('add');
		const copy1 = geo1.createNode('copy');
		const merge1 = geo1.createNode('merge');
		copy1.setInput(0, add1);
		merge1.setInput(0, copy1);
		copy1.p.count.set(10);
		merge1.setCompactMode(true);
		const delete1 = geo1.createNode('delete');
		delete1.setInput(0, merge1);
		delete1.p.byExpression.set(1);

		let container = await merge1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 10, '10');

		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 9, 'after first delete'); // mm, I'd expect 21 instead. I could probably optimize the geometry creation from the kept points

		// only the top points remain
		delete1.p.expression.set(1);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 0, 'after expression delete');

		// non entity dependent
		const sphere1 = geo1.createNode('sphere');
		sphere1.p.radius.set(1);
		delete1.p.expression.set(`ch('../${sphere1.name()}/radius')>0.5`);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 0, 'radius 1');
		sphere1.p.radius.set(0.4);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 10, 'radius 0.4');

		// entity dependent
		delete1.p.expression.set(`ch('../${sphere1.name()}/radius')>(0.1*@ptnum)`);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 6, 'radius and @ptnum dependent');
		sphere1.p.radius.set(0.8);
		delete1.p.expression.set(`ch('../${sphere1.name()}/radius')<(0.1*@ptnum)`);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 9, 'radius and @ptnum dependent');
	});

	qUnit.test('sop/delete: (class=object) simple box', async (assert) => {
		const geo1 = window.geo1;
		const box1 = geo1.createNode('box');
		const box2 = geo1.createNode('box');
		const merge1 = geo1.createNode('merge');
		const delete1 = geo1.createNode('delete');

		merge1.setInput(0, box1);
		merge1.setInput(1, box2);
		merge1.p.compact.set(0);
		delete1.setInput(0, merge1);

		delete1.setAttribClass(AttribClass.OBJECT);
		delete1.p.byExpression.set(1);
		delete1.p.expression.set('@ptnum==1');

		let container = await merge1.compute();
		let core_object = container.coreContent()!;
		assert.equal(core_object.threejsCoreObjects().length, 2);
		assert.equal(objectTypeFromObject(core_object.threejsCoreObjects()[0].object()), ObjectType.MESH);
		assert.equal(objectTypeFromObject(core_object.threejsCoreObjects()[1].object()), ObjectType.MESH);

		// now with keep_points on
		delete1.p.keepPoints.set(1);
		container = await delete1.compute();
		assert.notOk(delete1.states.error.message());
		core_object = container.coreContent()!;
		assert.equal(core_object.threejsCoreObjects().length, 2);
		assert.equal(objectTypeFromObject(core_object.threejsCoreObjects()[0].object()), ObjectType.MESH);
		assert.equal(objectTypeFromObject(core_object.threejsCoreObjects()[1].object()), ObjectType.POINTS);

		// now with keep_points off
		delete1.p.keepPoints.set(0);
		container = await delete1.compute();
		assert.notOk(delete1.states.error.message());
		core_object = container.coreContent()!;
		assert.equal(core_object.threejsCoreObjects().length, 1);
		assert.equal(objectTypeFromObject(core_object.threejsCoreObjects()[0].object()), ObjectType.MESH);
	});

	qUnit.test('sop/delete: (class=point) string attrib', async (assert) => {
		const geo1 = window.geo1;
		const add1 = geo1.createNode('add');
		const add2 = geo1.createNode('add');
		const attribCreate1 = geo1.createNode('attribCreate');
		const attribCreate2 = geo1.createNode('attribCreate');
		const merge1 = geo1.createNode('merge');
		const delete1 = geo1.createNode('delete');

		attribCreate1.setInput(0, add1);
		attribCreate2.setInput(0, add2);
		merge1.setInput(0, attribCreate1);
		merge1.setInput(1, attribCreate2);
		delete1.setInput(0, merge1);
		[attribCreate1, attribCreate2].forEach((n) => {
			n.setAttribType(AttribType.STRING);
			n.p.name.set('name');
		});
		attribCreate1.p.string.set('beaver');
		attribCreate2.p.string.set('eagle');

		delete1.p.byAttrib.set(true);
		delete1.p.attribType.set(ATTRIBUTE_TYPES.indexOf(AttribType.STRING));
		delete1.p.attribName.set('name');
		delete1.p.attribString.set('beaver');

		async function getPoints() {
			let container = await delete1.compute();
			let core_object = container.coreContent()!;
			return core_object.points(_points);
		}

		let container = await delete1.compute();
		let core_object = container.coreContent()!;
		assert.equal(core_object.points(_points).length, 1);
		assert.equal((await getPoints())[0].stringAttribValue('name'), 'eagle');

		delete1.p.invert.set(true);
		container = await delete1.compute();
		core_object = container.coreContent()!;
		assert.equal(core_object.points(_points).length, 1);
		assert.equal(core_object.points(_points)[0].stringAttribValue('name'), 'beaver');

		delete1.p.attribString.set('mountain');
		assert.deepEqual(
			(await getPoints()).map((p: BaseCorePoint) => p.stringAttribValue('name')),
			[]
		);

		delete1.p.invert.set(false);
		assert.deepEqual(
			(await getPoints()).map((p: BaseCorePoint) => p.stringAttribValue('name')),
			['beaver', 'eagle']
		);
	});

	qUnit.test('sop/delete byBoundingObject 1', async (assert) => {
		const geo1 = window.geo1;

		const sphere1 = geo1.createNode('sphere');
		const bboxScatter = geo1.createNode('bboxScatter');
		bboxScatter.p.stepSize.set(0.2);
		const delete1 = geo1.createNode('delete');
		bboxScatter.setInput(0, sphere1);
		delete1.setInput(0, bboxScatter);
		delete1.setInput(1, sphere1);

		let container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 1210);

		delete1.p.byBoundingObject.set(1);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 719);
	});

	qUnit.test('sop/delete byBoundingObject 2', async (assert) => {
		const geo1 = window.geo1;

		const icosahedron1 = geo1.createNode('icosahedron');
		const box1 = geo1.createNode('box');
		const transform1 = geo1.createNode('transform');
		const delete1 = geo1.createNode('delete');

		delete1.setInput(0, icosahedron1);

		icosahedron1.p.detail.set(9);
		icosahedron1.p.pointsOnly.set(1);
		transform1.setInput(0, box1);
		delete1.setInput(0, icosahedron1);
		delete1.setInput(1, transform1);

		let container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 1110);

		delete1.p.byBoundingObject.set(1);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 1110);

		transform1.setApplyOn(TransformTargetType.OBJECT);
		transform1.p.t.z.set(1);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 1005);

		transform1.setApplyOn(TransformTargetType.GEOMETRY);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 1005);

		transform1.p.s.set([2, 2, 1]);
		container = await delete1.compute();
		assert.equal(container.coreContent()!.pointsCount(), 823);
	});
	qUnit.test('sop/delete byBoundingObject 3 (multiple objects)', async (assert) => {
		const geo1 = window.geo1;

		const icosahedron1 = geo1.createNode('icosahedron');
		const delete0 = geo1.createNode('delete');
		const box1 = geo1.createNode('box');
		const transform1 = geo1.createNode('transform');
		const transform2 = geo1.createNode('transform');
		const merge1 = geo1.createNode('merge');
		const delete1 = geo1.createNode('delete');

		delete1.setInput(0, icosahedron1);

		icosahedron1.p.detail.set(9);
		icosahedron1.p.pointsOnly.set(1);
		delete0.setInput(0, icosahedron1);
		transform1.setInput(0, box1);
		transform2.setInput(0, box1);
		merge1.setInput(0, transform1);
		merge1.setInput(1, transform2);
		delete1.setInput(0, delete0);
		delete1.setInput(1, merge1);

		delete0.setAttribClass(AttribClass.OBJECT);
		delete0.p.invert.set(1);
		delete0.p.keepPoints.set(1);
		transform1.setApplyOn(TransformTargetType.GEOMETRY);
		transform2.setApplyOn(TransformTargetType.GEOMETRY);

		delete1.setAttribClass(AttribClass.POINT);
		delete1.p.byBoundingObject.set(1);

		async function pointsCount(): Promise<number> {
			const container = await delete1.compute();
			return container.coreContent()!.pointsCount();
		}

		transform1.p.t.y.set(1000);
		transform2.p.t.y.set(-1000);
		assert.equal(await pointsCount(), 1110, '1110 points');
		transform1.p.t.y.set(1);
		transform2.p.t.y.set(-1);
		assert.equal(await pointsCount(), 920, '920 points');
		transform1.p.t.y.set(1);
		transform2.p.t.y.set(-1000);
		assert.equal(await pointsCount(), 1015, '1015 points');
	});

	qUnit.test('sop/delete primitives', async (assert) => {
		const geo1 = window.geo1;

		const plane1 = geo1.createNode('plane');
		const delete1 = geo1.createNode('delete');
		delete1.setInput(0, plane1);

		delete1.setAttribClass(AttribClass.PRIMITIVE);
		delete1.p.byExpression.set(1);

		async function compute() {
			const container = await delete1.compute();
			const object = container.coreContent()!.threejsObjects()[0] as Mesh;
			const geometry = object.geometry;
			const indexArray = geometry.index!.array;
			return [...indexArray];
		}

		delete1.p.expression.set('@primnum==0');
		assert.deepEqual(await compute(), [2, 3, 1]);

		delete1.p.expression.set('@primnum==1');
		assert.deepEqual(await compute(), [0, 2, 1]);
	});

	qUnit.test('sop/delete primitives with quadObject', async (assert) => {
		const geo1 = window.geo1;

		const quadPlane1 = geo1.createNode('quadPlane');
		const delete1 = geo1.createNode('delete');
		delete1.setInput(0, quadPlane1);

		quadPlane1.p.useSegmentsCount.set(1);
		quadPlane1.p.segments.set([3, 3]);

		delete1.setAttribClass(AttribClass.PRIMITIVE);
		delete1.p.byExpression.set(1);

		async function compute() {
			const container = await delete1.compute();
			const object = container.coreContent()!.quadObjects()![0] as QuadObject;
			const geometry = object.geometry;
			const indexArray = geometry.index;
			return [...indexArray];
		}

		delete1.p.expression.set('@primnum==0');
		assert.deepEqual(
			await compute(),
			[4, 5, 9, 8, 8, 9, 13, 12, 1, 2, 6, 5, 5, 6, 10, 9, 9, 10, 14, 13, 2, 3, 7, 6, 6, 7, 11, 10, 10, 11, 15, 14]
		);

		delete1.p.expression.set('@primnum==1');
		assert.deepEqual(
			await compute(),
			[0, 1, 5, 4, 8, 9, 13, 12, 1, 2, 6, 5, 5, 6, 10, 9, 9, 10, 14, 13, 2, 3, 7, 6, 6, 7, 11, 10, 10, 11, 15, 14]
		);

		delete1.p.invert.set(1);
		assert.deepEqual(await compute(), [4, 5, 9, 8]);
	});

	qUnit.test(
		'sop/delete primitives with quadObject can recook after requesting a non existing attribute',
		async (assert) => {
			const geo1 = window.geo1;

			const quadPlane1 = geo1.createNode('quadPlane');
			const attribCreate1 = geo1.createNode('attribCreate');
			const delete1 = geo1.createNode('delete');
			attribCreate1.setInput(0, quadPlane1);
			delete1.setInput(0, attribCreate1);

			attribCreate1.setAttribClass(AttribClass.PRIMITIVE);
			attribCreate1.p.name.set('test');
			attribCreate1.p.value1.set(1);

			delete1.setAttribClass(AttribClass.PRIMITIVE);
			delete1.p.byExpression.set(1);
			delete1.p.expression.set('@donotexist==0');

			async function compute() {
				const container = await delete1.compute();
				const coreGroup = container.coreContent();
				const quadObjects = coreGroup?.quadObjects();
				const objectExists = quadObjects ? quadObjects[0] != null : false;
				const errorMessage = delete1.states.error.message();
				return {objectExists, errorMessage};
			}

			assert.equal((await compute()).objectExists, false);
			assert.equal(
				(await compute()).errorMessage,
				'expression evaluation error: attrib donotexist not found. availables are: test'
			);

			delete1.p.expression.set('@test==0');
			assert.equal((await compute()).objectExists, true);
			assert.notOk((await compute()).errorMessage);
		}
	);

	qUnit.test('sop/delete primitives with quadObject preserves primitive attributes integrity', async (assert) => {
		const geo1 = window.geo1;
		const quadPlane1 = geo1.createNode('quadPlane');
		const attribCreate1 = geo1.createNode('attribCreate');
		const delete1 = geo1.createNode('delete');

		attribCreate1.setInput(0, quadPlane1);
		delete1.setInput(0, attribCreate1);

		quadPlane1.p.size.set([2, 2]);
		attribCreate1.setAttribClass(AttribClass.PRIMITIVE);
		attribCreate1.p.name.set('t');
		attribCreate1.p.value1.set('@primnum');
		delete1.setAttribClass(AttribClass.PRIMITIVE);
		delete1.p.byExpression.set(1);

		async function compute() {
			const container = await delete1.compute();
			const objects = container.coreContent()?.quadObjects()!;
			const object = objects[0];
			const primitiveAttribute = QuadPrimitive.attributes(object)!['t'];
			return {values: primitiveAttribute.array};
		}

		delete1.p.expression.set('@primnum==-1');
		assert.equal((await compute()).values.length, 4);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3], 'delete @primnum==-1');

		delete1.p.expression.set('@primnum==0');
		assert.equal((await compute()).values.length, 3);
		assert.deepEqual((await compute()).values, [1, 2, 3], 'delete @primnum==0');

		delete1.p.expression.set('@primnum==1');
		assert.equal((await compute()).values.length, 3);
		assert.deepEqual((await compute()).values, [0, 2, 3], 'delete @primnum==1');

		delete1.p.expression.set('@primnum==2');
		assert.equal((await compute()).values.length, 3);
		assert.deepEqual((await compute()).values, [0, 1, 3], 'delete @primnum==2');

		delete1.p.expression.set('@primnum==3');
		assert.equal((await compute()).values.length, 3);
		assert.deepEqual((await compute()).values, [0, 1, 2], 'delete @primnum==3');

		delete1.p.expression.set('@primnum==4');
		assert.equal((await compute()).values.length, 4);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3], 'delete @primnum==4');
	});
	qUnit.test('sop/delete primitives with tetObject preserves primitive attributes integrity', async (assert) => {
		const geo1 = window.geo1;
		const box1 = geo1.createNode('box');
		const tetrahedralize1 = geo1.createNode('tetrahedralize');
		const attribCreate1 = geo1.createNode('attribCreate');
		const delete1 = geo1.createNode('delete');

		tetrahedralize1.setInput(0, box1);
		attribCreate1.setInput(0, tetrahedralize1);
		delete1.setInput(0, attribCreate1);

		tetrahedralize1.p.innerPointsResolution.set(0);
		attribCreate1.setAttribClass(AttribClass.PRIMITIVE);
		attribCreate1.p.name.set('t');
		attribCreate1.p.value1.set('@primnum');
		delete1.setAttribClass(AttribClass.PRIMITIVE);
		delete1.p.byExpression.set(1);

		async function compute() {
			const container = await delete1.compute();
			const objects = container.coreContent()?.tetObjects()!;
			const object = objects[0];
			const primitiveAttribute = TetPrimitive.attributes(object)!['t'];
			return {values: primitiveAttribute.array};
		}

		delete1.p.expression.set('@primnum==-1');
		assert.equal((await compute()).values.length, 6);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3, 4, 5], 'delete @primnum==-1');

		delete1.p.expression.set('@primnum==0');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [1, 2, 3, 4, 5], 'delete @primnum==0');

		delete1.p.expression.set('@primnum==1');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [0, 2, 3, 4, 5], 'delete @primnum==1');

		delete1.p.expression.set('@primnum==2');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [0, 1, 3, 4, 5], 'delete @primnum==2');

		delete1.p.expression.set('@primnum==3');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [0, 1, 2, 4, 5], 'delete @primnum==3');

		delete1.p.expression.set('@primnum==4');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3, 5], 'delete @primnum==4');

		delete1.p.expression.set('@primnum==5');
		assert.equal((await compute()).values.length, 5);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3, 4], 'delete @primnum==5');

		delete1.p.expression.set('@primnum==6');
		assert.equal((await compute()).values.length, 6);
		assert.deepEqual((await compute()).values, [0, 1, 2, 3, 4, 5], 'delete @primnum==6');
	});
	qUnit.test('sop/delete primitives with quadObject by position', async (assert) => {
		const geo1 = window.geo1;
		const quadPlane1 = geo1.createNode('quadPlane');
		const attribCreate1 = geo1.createNode('attribCreate');
		const delete1 = geo1.createNode('delete');

		attribCreate1.setInput(0, quadPlane1);
		delete1.setInput(0, attribCreate1);

		quadPlane1.p.size.set([2, 2]);
		attribCreate1.setAttribClass(AttribClass.PRIMITIVE);
		attribCreate1.p.name.set('x');
		attribCreate1.p.value1.set('@P.x');
		delete1.setAttribClass(AttribClass.PRIMITIVE);
		delete1.p.byExpression.set(1);

		async function compute() {
			const container = await delete1.compute();
			const objects = container.coreContent()?.quadObjects()!;
			const object = objects[0];
			const primitives: QuadPrimitive[] = [];
			primitivesFromObject(object, primitives);
			const attribValues = primitives.map((p) => p.attribValue('x') as number);
			return {attribValues, primitivesCount: primitives.length};
		}

		delete1.p.expression.set('@primnum==6');
		assert.equal((await compute()).primitivesCount, 4);
		assert.deepEqual((await compute()).attribValues, [-0.5, 0.5, -0.5, 0.5]);

		delete1.p.expression.set('@primnum==1');
		assert.equal((await compute()).primitivesCount, 3);
		assert.deepEqual((await compute()).attribValues, [-0.5, -0.5, 0.5]);

		delete1.p.expression.set('@P.x>0');
		assert.equal((await compute()).primitivesCount, 2);
		assert.deepEqual((await compute()).attribValues, [-0.5, -0.5]);

		delete1.p.expression.set('@P.x<0');
		assert.equal((await compute()).primitivesCount, 2);
		assert.deepEqual((await compute()).attribValues, [0.5, 0.5]);
	});
	qUnit.test('sop/delete does not crash when processing 0 objects', async (assert) => {
		const geo1 = window.geo1;
		const box1 = geo1.createNode('box');
		const copy1 = geo1.createNode('copy');
		const delete1 = geo1.createNode('delete');
		const delete2 = geo1.createNode('delete');

		copy1.setInput(0, box1);
		delete1.setInput(0, copy1);
		delete2.setInput(0, delete1);

		copy1.p.count.set(4);
		copy1.p.t.x.set(1);

		delete1.setAttribClass(AttribClass.OBJECT);
		delete1.p.byExpression.set(1);
		delete1.p.expression.set('@ptnum>=0');

		delete2.setAttribClass(AttribClass.OBJECT);
		delete2.p.byExpression.set(1);
		delete2.p.expression.set('@P.x<2');

		await delete2.compute();
		assert.notOk(delete2.states.error.active());
		assert.equal(delete2.states.error.message(), undefined, 'no error message');
	});
}
