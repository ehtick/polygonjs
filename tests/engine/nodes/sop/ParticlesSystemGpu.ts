import type {QUnit} from '../../../helpers/QUnit';
import {RendererUtils} from '../../../helpers/RendererUtils';
import {ShaderName} from '../../../../src/engine/nodes/utils/shaders/ShaderName';
import {AttribClass} from '../../../../src/core/geometry/Constant';
import {disposeParticlesFromNode} from '../../../../src/core/particles/CoreParticles';
import {GlConnectionPointType} from '../../../../src/engine/nodes/utils/io/connections/Gl';
import {SceneJsonExporter} from '../../../../src/engine/io/json/export/Scene';
import {AssemblersUtils} from '../../../helpers/AssemblersUtils';
import {SceneJsonImporter} from '../../../../src/engine/io/json/import/Scene';
import {ParticlesSystemGpuSopNode} from '../../../../src/engine/nodes/sop/ParticlesSystemGpu';
import {Vector3Param} from '../../../../src/engine/params/Vector3';
import {AssertUtils} from '../../../helpers/AssertUtils';
import {ParticlesSceneSetup1} from './particlesSystemGPU/scenes/ParticlesSceneSetup1';
import {ParticlesSceneSetup2} from './particlesSystemGPU/scenes/ParticlesSceneSetup2';
import {MaterialUserDataUniforms} from '../../../../src/engine/nodes/gl/code/assemblers/materials/OnBeforeCompile';
import ADD from './particlesSystemGPU/templates/add.glsl';
import RESTP from './particlesSystemGPU/templates/restP.glsl';
const TEMPLATES = {
	ADD,
	RESTP,
};
import {
	resetParticles,
	stepParticlesSimulation,
	setParticlesActive,
	renderController,
	gpuController,
	createRequiredNodesForParticles,
	waitForParticlesComputedAndMounted,
	roundPixelBuffer,
	joinArray,
} from './particlesSystemGPU/ParticlesHelper';
import {CoreSleep} from '../../../../src/core/Sleep';
export function testenginenodessopParticlesSystemGpu(qUnit: QUnit) {

qUnit.test('ParticlesSystemGPU simple', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;

	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer, 'renderer created');

	const plane1 = geo1.createNode('plane');
	const delete1 = geo1.createNode('delete');
	const particles1 = geo1.createNode('particlesSystemGpu');
	assert.equal(particles1.children().length, 0, 'no children on start');
	const {output1, globals1, pointsBuilder1, actor1} = createRequiredNodesForParticles(particles1);
	assert.equal(particles1.children().length, 2, 'has 2 children');

	const add1 = particles1.createNode('add');
	add1.setInput(0, globals1, 'position');
	output1.setInput('position', add1);
	add1.params.get('add1')!.set([0, 1, 0]);

	plane1.p.size.set([2, 2]);
	plane1.p.useSegmentsCount.set(1);
	delete1.setAttribClass(AttribClass.OBJECT);
	delete1.p.byExpression.set(1);
	delete1.p.keepPoints.set(1);
	delete1.setInput(0, plane1);
	actor1.setInput(0, delete1);

	particles1.p.preRollFramesCount.set(2);
	await waitForParticlesComputedAndMounted(particles1);
	const configRef = (await resetParticles(particles1))!;
	assert.ok(configRef, 'configRef created');

	await RendererUtils.compile(pointsBuilder1, renderer);
	const render_material = renderController(particles1).material()!;
	const uniform = MaterialUserDataUniforms.getUniforms(render_material)!.texture_position;

	assert.ok(render_material, 'material ok');
	assert.ok(uniform, 'uniform ok');

	const buffer_width = 1;
	const buffer_height = 1;
	let render_target1 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	let pixelBuffer = new Float32Array(buffer_width * buffer_height * 4);
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(roundPixelBuffer(pixelBuffer), joinArray([-1, 2, -1, 0]), 'point moved up');

	stepParticlesSimulation(particles1, configRef);
	let render_target2 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.notEqual(render_target2.texture.uuid, render_target1.texture.uuid);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-1, 3, -1, 0].join(':'), 'point moved up');

	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-1, 4, -1, 0].join(':'), 'point moved up');

	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-1, 5, -1, 0].join(':'), 'point moved up');

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

qUnit.test('ParticlesSystemGPU attributes are used without needing to be set as exporting', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const renderData1 = await RendererUtils.waitForRenderer(scene);
	const renderer1 = renderData1.renderer;
	assert.ok(renderer1, 'renderer created');

	const plane1 = geo1.createNode('plane');
	const delete1 = geo1.createNode('delete');
	const particles1 = geo1.createNode('particlesSystemGpu');
	assert.equal(particles1.children().length, 0, 'no children');
	const {output1, globals1, pointsBuilder1, actor1} = createRequiredNodesForParticles(particles1);
	assert.equal(particles1.children().length, 2, '2 children');

	plane1.p.size.set([2, 2]);
	plane1.p.useSegmentsCount.set(1);
	delete1.setAttribClass(AttribClass.OBJECT);
	delete1.p.byExpression.set(1);
	delete1.p.keepPoints.set(1);
	delete1.setInput(0, plane1);
	actor1.setInput(0, delete1);

	// first we test when nothing is plugged into the output node
	particles1.p.preRollFramesCount.set(0);
	await waitForParticlesComputedAndMounted(particles1);
	const configRef = (await resetParticles(particles1))!;
	assert.notOk(particles1.states.error.message(), 'no error');
	assert.ok(configRef, 'configRef created');

	let gpuMaterial = gpuController(particles1).materials()[0];
	assert.notOk(gpuMaterial, 'no material created yet');
	let all_variables = gpuController(particles1).allVariables();
	assert.equal(all_variables.length, 0, 'no variables');

	// then we use an add node
	const add1 = particles1.createNode('add');
	const param1 = particles1.createNode('param');
	param1.setGlType(GlConnectionPointType.VEC3);
	param1.p.name.set('test_param');
	add1.setInput(0, globals1, 'position');
	add1.setInput(1, param1);
	output1.setInput('position', add1);

	await waitForParticlesComputedAndMounted(particles1);
	let test_param = particles1.params.get('test_param')!;
	assert.ok(test_param, 'test_param is created');
	test_param.set([0, 1, 0]);

	gpuMaterial = gpuController(particles1).materials()[0];
	assert.ok(gpuMaterial);
	assert.deepEqual(
		Object.keys(gpuMaterial.uniforms).sort(),
		['delta_time', 'texture_position', 'time', 'v_POLY_param_test_param'],
		'uniforms ok'
	);
	assert.ok(gpuMaterial, 'material ok');
	assert.equal(gpuMaterial.fragmentShader, TEMPLATES.ADD, 'add frag ok');
	all_variables = gpuController(particles1).allVariables();
	assert.equal(all_variables.length, 1, '1 variable');
	let gpuTexturesByName = gpuController(particles1).createdTexturesByName();
	assert.ok(gpuTexturesByName.get('position' as ShaderName), 'texture position has been created');
	assert.equal(gpuTexturesByName.size, 1, '1 texture');

	// now add a restP attribute
	const restAttributes = geo1.createNode('restAttributes');
	restAttributes.p.tposition.set(true);
	restAttributes.p.tnormal.set(false);
	restAttributes.setInput(0, delete1);
	actor1.setInput(0, restAttributes);

	const restPAttribute = particles1.createNode('attribute');
	restPAttribute.p.name.set('restP');
	restPAttribute.setAttribSize(3);
	add1.setInput(2, restPAttribute);

	await waitForParticlesComputedAndMounted(particles1);
	assert.notOk(particles1.states.error.message(), 'no error');
	test_param = particles1.params.get('test_param')!;
	assert.ok(test_param, 'test_param is created');
	test_param.set([0, 1, 0]);

	gpuMaterial = gpuController(particles1).materials()[0];
	assert.ok(gpuMaterial);
	assert.deepEqual(
		Object.keys(gpuMaterial.uniforms).sort(),
		['delta_time', 'texture_position', 'texture_restP', 'time', 'v_POLY_param_test_param'],
		'uniforms ok'
	);
	assert.ok(gpuMaterial, 'material ok');
	assert.equal(gpuMaterial.fragmentShader, TEMPLATES.RESTP, 'add frag ok');
	all_variables = gpuController(particles1).allVariables();
	assert.equal(all_variables.length, 1, '1 variable');
	gpuTexturesByName = gpuController(particles1).createdTexturesByName();
	assert.ok(gpuTexturesByName.get('position' as ShaderName), 'texture position has been created');
	assert.ok(gpuTexturesByName.get('restP' as ShaderName), 'texture restP has been created');
	assert.equal(gpuTexturesByName.size, 2, '2 textures');

	const renderMaterial = renderController(particles1).material()!;
	await RendererUtils.compile(pointsBuilder1, renderer1);
	assert.ok(renderMaterial, 'material ok');
	const uniform = MaterialUserDataUniforms.getUniforms(renderMaterial)!.texture_position;
	assert.ok(uniform, 'uniform ok');
	all_variables = gpuController(particles1).allVariables();
	assert.equal(all_variables.length, 1);
	const variable = all_variables[0];
	const param_uniform = variable.material.uniforms.v_POLY_param_test_param;
	assert.deepEqual(param_uniform.value.toArray(), [0, 1, 0], 'param uniform set to the expected value');

	stepParticlesSimulation(particles1, configRef);
	const buffer_width = 1;
	const buffer_height = 1;
	let render_target1 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	let pixelBuffer = new Float32Array(buffer_width * buffer_height * 4);
	renderer1.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-2, 1, -2, 0].join(':'), 'point moved');

	stepParticlesSimulation(particles1, configRef);
	let render_target2 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.notEqual(render_target2.texture.uuid, render_target1.texture.uuid);

	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer1.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-3, 2, -3, 0].join(':'), 'point moved');

	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	renderer1.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-4, 3, -4, 0].join(':'), 'point moved up');

	test_param.set([0, 0.5, 0]);
	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer1.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-5, 3.5, -5, 0].join(':'), 'point moved up');

	test_param.set([0, 2, 0]);
	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	renderer1.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-6, 5.5, -6, 0].join(':'), 'point moved up');

	test_param.set([1, 0, 0]);
	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer1.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [-6, 5.5, -7, 0].join(':'), 'point moved up');

	scene.setFrame(0);
	const data = await new SceneJsonExporter(scene).data();
	disposeParticlesFromNode(particles1);
	await AssemblersUtils.withUnregisteredAssembler(particles1.usedAssembler(), async () => {
		// console.log('************ LOAD **************');

		const scene2 = await SceneJsonImporter.loadData(data);
		const rendererData2 = await RendererUtils.waitForRenderer(scene2);
		await scene2.waitForCooksCompleted();
		const renderer2 = rendererData2.renderer;

		const new_particles1 = scene2.node('/geo1/particlesSystemGpu1') as ParticlesSystemGpuSopNode;
		assert.notOk(new_particles1.assemblerController());
		assert.ok(new_particles1.persisted_config);
		const test_param2 = new_particles1.params.get('test_param') as Vector3Param;
		assert.ok(test_param2);

		assert.deepEqual(test_param2.value.toArray(), [1, 0, 0], 'test param is read back with expected value');

		assert.equal(scene2.frame(), 0);
		await waitForParticlesComputedAndMounted(new_particles1);
		const configRef2 = (await resetParticles(new_particles1))!;
		assert.ok(configRef2, 'configRef2 ok');

		stepParticlesSimulation(new_particles1, configRef2);
		render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(
			AssertUtils.arrayWithPrecision(pixelBuffer),
			[-1, 0, -2, 0].join(':'),
			'point with persisted config moved x (1)'
		);

		stepParticlesSimulation(new_particles1, configRef2);
		stepParticlesSimulation(new_particles1, configRef2);
		render_target2 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(
			AssertUtils.arrayWithPrecision(pixelBuffer),
			[-1, 0, -4, 0].join(':'),
			'point with persisted config moved x (2)'
		);

		test_param2.set([0, 2, 0]);
		stepParticlesSimulation(new_particles1, configRef2);
		render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(
			AssertUtils.arrayWithPrecision(pixelBuffer),
			[-2, 2, -5, 0].join(':'),
			'point with persisted config moved y'
		);

		// and if we set the active param to 0, nothing moves
		stepParticlesSimulation(new_particles1, configRef2);
		render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(AssertUtils.arrayWithPrecision(pixelBuffer), [-3, 4, -6, 0].join(':'), 'active still on');
		setParticlesActive(new_particles1, false);
		// stepParticlesSimulation(new_particles1);
		// render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		// renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		// assert.deepEqual(AssertUtils.arrayWithPrecision(pixelBuffer), [-3, 4, -6, 0].join(':'), 'active now off');
		// stepParticlesSimulation(new_particles1);
		// render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		// renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		// assert.deepEqual(AssertUtils.arrayWithPrecision(pixelBuffer), [-3, 4, -6, 0].join(':'), 'active still off');
		// and if we set the active param back to 1, particles move again
		setParticlesActive(new_particles1, true);
		stepParticlesSimulation(new_particles1, configRef2);
		render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(
			AssertUtils.arrayWithPrecision(pixelBuffer),
			[-4, 6, -7, 0].join(':'),
			'point with persisted config moved y'
		);
		stepParticlesSimulation(new_particles1, configRef2);
		render_target1 = gpuController(new_particles1).getCurrentRenderTarget('position' as ShaderName)!;
		renderer2.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
		assert.deepEqual(
			AssertUtils.arrayWithPrecision(pixelBuffer),
			[-5, 8, -8, 0].join(':'),
			'point with persisted config moved y'
		);
		disposeParticlesFromNode(new_particles1);
	});

	RendererUtils.dispose();
});

qUnit.test('ParticlesSystemGPU node can be deleted without error', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer, 'renderer created');

	const plane1 = geo1.createNode('plane');
	const scatter1 = geo1.createNode('scatter');
	const particles1 = geo1.createNode('particlesSystemGpu');

	scatter1.setInput(0, plane1);
	particles1.setInput(0, scatter1);

	await particles1.compute();
	geo1.removeNode(particles1);

	assert.equal(1, 1);

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

qUnit.test('texture allocation works as expected wih pos, vel, normal and bby float', async (assert) => {
	const geo1 = window.geo1;

	const scene = window.scene;
	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer);
	const box = geo1.createNode('box');
	box.flags.display.set(true);

	const {particlesSystemGpu1} = ParticlesSceneSetup2();

	// await attribCreate1.compute();
	await particlesSystemGpu1.compute();
	const allocationJSON = (await particlesSystemGpu1.persisted_config.toData())?.texture_allocations;
	assert.ok(allocationJSON);
	assert.deepEqual(allocationJSON, {
		writable: [
			{
				velocity: [
					{
						name: 'velocity',
						size: 3,
						nodes: ['/geo1/particlesSystemGpu1/output1'],
					},
				],
			},
			{
				position: [
					{
						name: 'position',
						size: 3,
						nodes: ['/geo1/particlesSystemGpu1/output1', '/geo1/particlesSystemGpu1/globals1'],
					},
				],
			},
		],
		readonly: [
			{
				normal_x_bby: [
					{
						name: 'normal',
						size: 3,
						nodes: ['/geo1/particlesSystemGpu1/attribute1'],
					},
					{
						name: 'bby',
						size: 1,
						nodes: ['/geo1/particlesSystemGpu1/attribute2'],
					},
				],
			},
		],
	});
	disposeParticlesFromNode(particlesSystemGpu1);
});

qUnit.test('material can use a float attribute also used in simulation in readonly', async (assert) => {
	const scene = window.scene;
	const cameraNode = window.perspective_camera1;
	// lights & camera
	cameraNode.p.t.z.set(15);
	cameraNode.p.t.y.set(1);

	//
	const {particlesSystemGpu1, pointsBuilder1, attribute_randomId_read, attribute_randomId_export} =
		ParticlesSceneSetup1();

	particlesSystemGpu1.p.material.setNode(pointsBuilder1, {relative: true});
	particlesSystemGpu1.p.preRollFramesCount.set(4);
	particlesSystemGpu1.flags.display.set(true);
	assert.notOk(particlesSystemGpu1.states.error.message(), 'no error (1)');

	await RendererUtils.withViewer({cameraNode}, async ({viewer, element}) => {
		scene.play();
		await CoreSleep.sleep(200);

		await scene.waitForCooksCompleted();
		const {renderer} = await RendererUtils.waitForRenderer(scene);
		assert.ok(renderer);

		await particlesSystemGpu1.compute();
		await waitForParticlesComputedAndMounted(particlesSystemGpu1);
		const material = await pointsBuilder1.material();
		await RendererUtils.compile(pointsBuilder1, renderer);
		await waitForParticlesComputedAndMounted(particlesSystemGpu1);
		assert.notOk(particlesSystemGpu1.states.error.message(), 'no error (2)');

		// with attrib exported from particles
		assert.includes(
			material.vertexShader,
			'vec3 transformed = texture2D( texture_position_x_randomId, particlesSimUvVarying ).xyz;'
		);
		assert.includes(
			material.fragmentShader,
			'float v_POLY_attribute1_val = texture2D( texture_position_x_randomId, particlesSimUvVarying ).w;'
		);
		assert.deepEqual(
			(await particlesSystemGpu1.persisted_config.toData())?.texture_allocations,
			{
				writable: [
					{
						position_x_randomId: [
							{
								name: 'position',
								size: 3,
								nodes: ['/geo1/particlesSystemGpu1/output1', '/geo1/particlesSystemGpu1/globals1'],
							},
							{
								name: 'randomId',
								size: 1,
								nodes: ['/geo1/particlesSystemGpu1/attribute3', '/geo1/particlesSystemGpu1/attribute1'],
							},
						],
					},
				],
				readonly: [{normal: [{name: 'normal', size: 3, nodes: ['/geo1/particlesSystemGpu1/attribute2']}]}],
			},
			'texture allocation ok'
		);

		// with attrib exported from particles
		attribute_randomId_export.setInput(0, null);
		await particlesSystemGpu1.compute();
		await waitForParticlesComputedAndMounted(particlesSystemGpu1);
		await RendererUtils.compile(pointsBuilder1, renderer);
		assert.includes(
			material.vertexShader,
			'vec3 transformed = texture2D( texture_position, particlesSimUvVarying ).xyz;'
		);
		assert.not_includes(
			material.fragmentShader,
			'float v_POLY_attribute1_val = texture2D( texture_position_x_randomId, particlesSimUvVarying ).w;'
		);
		assert.includes(material.fragmentShader, `float v_POLY_attribute1_val = v_POLY_attribute_randomId;`);
		assert.deepEqual((await particlesSystemGpu1.persisted_config.toData())?.texture_allocations, {
			writable: [
				{
					position: [
						{
							name: 'position',
							size: 3,
							nodes: ['/geo1/particlesSystemGpu1/output1', '/geo1/particlesSystemGpu1/globals1'],
						},
					],
				},
			],
			readonly: [
				{
					normal_x_randomId: [
						{name: 'normal', size: 3, nodes: ['/geo1/particlesSystemGpu1/attribute2']},
						{name: 'randomId', size: 1, nodes: ['/geo1/particlesSystemGpu1/attribute1']},
					],
				},
			],
		});

		// re setInput
		attribute_randomId_export.setInput(0, attribute_randomId_read);
		await particlesSystemGpu1.compute();
		await RendererUtils.compile(pointsBuilder1, renderer);
		assert.deepEqual(
			(await particlesSystemGpu1.persisted_config.toData())?.texture_allocations,
			{
				writable: [
					{
						position_x_randomId: [
							{
								name: 'position',
								size: 3,
								nodes: ['/geo1/particlesSystemGpu1/output1', '/geo1/particlesSystemGpu1/globals1'],
							},
							{
								name: 'randomId',
								size: 1,
								nodes: ['/geo1/particlesSystemGpu1/attribute3', '/geo1/particlesSystemGpu1/attribute1'],
							},
						],
					},
				],
				readonly: [{normal: [{name: 'normal', size: 3, nodes: ['/geo1/particlesSystemGpu1/attribute2']}]}],
			},
			'texture allocation ok after setInput again'
		);
		assert.includes(
			material.vertexShader,
			`vec3 transformed = texture2D( texture_position, particlesSimUvVarying ).xyz;`
		);
		assert.includes(material.fragmentShader, `float v_POLY_attribute1_val = v_POLY_attribute_randomId;`);

		// change name
		attribute_randomId_export.p.name.set('otherAttrib');
		await particlesSystemGpu1.compute();
		await RendererUtils.compile(pointsBuilder1, renderer);
		assert.deepEqual(
			(await particlesSystemGpu1.persisted_config.toData())?.texture_allocations,
			{
				writable: [
					{
						position_x_otherAttrib: [
							{
								name: 'position',
								size: 3,
								nodes: ['/geo1/particlesSystemGpu1/output1', '/geo1/particlesSystemGpu1/globals1'],
							},
							{name: 'otherAttrib', size: 1, nodes: ['/geo1/particlesSystemGpu1/attribute3']},
						],
					},
				],
				readonly: [
					{
						normal_x_randomId: [
							{name: 'normal', size: 3, nodes: ['/geo1/particlesSystemGpu1/attribute2']},
							{name: 'randomId', size: 1, nodes: ['/geo1/particlesSystemGpu1/attribute1']},
						],
					},
				],
			},
			'texture allocation ok after attrib name change'
		);
		assert.includes(
			material.vertexShader,
			`vec3 transformed = texture2D( texture_position_x_randomId, particlesSimUvVarying ).xyz;`
		);
		assert.includes(
			material.fragmentShader,
			`float v_POLY_attribute1_val = texture2D( texture_position_x_randomId, particlesSimUvVarying ).w;`
		);
	});

	RendererUtils.dispose();
	disposeParticlesFromNode(particlesSystemGpu1);
});

qUnit.test('ParticlesSystemGPU attributes can be used from inside a subnet', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer, 'renderer created');

	const sopadd1 = geo1.createNode('add');
	const restAttributes1 = geo1.createNode('restAttributes');
	const particles1 = geo1.createNode('particlesSystemGpu');
	assert.equal(particles1.children().length, 0, 'no children');
	const {output1, globals1, pointsBuilder1, actor1, actorChildren} = createRequiredNodesForParticles(particles1);
	assert.equal(particles1.children().length, 2, '2 children');

	sopadd1.p.createPoint.set(1);
	sopadd1.p.position.set([1, 0.5, 0.25]);
	restAttributes1.setInput(0, sopadd1);
	actor1.setInput(0, restAttributes1);
	particles1.setInput(0, actor1);
	particles1.p.preRollFramesCount.set(1);

	actorChildren.particlesSystemStepSimulation.p.texturesCount.set(1);
	actorChildren.particlesSystemStepSimulation.p.textureName0.set('restP');

	// we set up an attribute inside a subnet
	const subnet1 = particles1.createNode('subnet');
	subnet1.p.inputsCount.set(1);
	subnet1.setInputType(0, GlConnectionPointType.VEC3);
	const subnet1_subnetInput1 = subnet1.createNode('subnetInput');
	const subnet1_subnetOutput1 = subnet1.createNode('subnetOutput');
	const attribute1 = subnet1.createNode('attribute');
	const add1 = subnet1.createNode('add');
	attribute1.setGlType(GlConnectionPointType.VEC3);
	attribute1.p.name.set('restP');
	add1.setInput(0, attribute1);
	add1.setInput(1, subnet1_subnetInput1);
	subnet1_subnetOutput1.setInput(0, add1);
	subnet1.setInput(0, globals1, 'position');
	output1.setInput('position', subnet1);

	// scene.setFrame(1);
	await particles1.compute();
	await waitForParticlesComputedAndMounted(particles1);
	assert.notOk(particles1.states.error.message(), 'no error message (1)');
	const configRef = (await resetParticles(particles1))!;
	assert.notOk(particles1.states.error.message(), 'no error message (2)');
	assert.ok(configRef, 'configRef 1 ok');
	await RendererUtils.compile(pointsBuilder1, renderer);
	const render_material = renderController(particles1).material()!;
	const uniform = MaterialUserDataUniforms.getUniforms(render_material)!.texture_position;

	assert.ok(render_material, 'material ok');
	assert.ok(uniform, 'uniform ok');

	const buffer_width = 1;
	const buffer_height = 1;
	stepParticlesSimulation(particles1, configRef);
	let render_target1 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture on frame 1');
	let pixelBuffer = new Float32Array(buffer_width * buffer_height * 4);
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [3, 1.5, 0.75, 0].join(':'), 'point moved sideways frame 1');

	stepParticlesSimulation(particles1, configRef);
	let render_target2 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.notEqual(render_target2.texture.uuid, render_target1.texture.uuid);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture on frame 2');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [4, 2, 1, 0].join(':'), 'point moved sideways frame 2');

	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture on frame 3');
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [5, 2.5, 1.25, 0].join(':'), 'point moved sideways frame 3');

	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture on frame 4');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [6, 3, 1.5, 0].join(':'), 'point moved sideways frame 4');

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

qUnit.test('ParticlesSystemGPU params can be used from inside a subnet', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer, 'renderer created');

	const sopadd1 = geo1.createNode('add');
	const particles1 = geo1.createNode('particlesSystemGpu');
	assert.equal(particles1.children().length, 0, 'no children');
	const {output1, globals1, actor1, pointsBuilder1} = createRequiredNodesForParticles(particles1);
	assert.equal(particles1.children().length, 2, '2 children');
	particles1.p.preRollFramesCount.set(2);

	sopadd1.p.createPoint.set(1);
	sopadd1.p.position.set([1, 0.5, 0.25]);
	actor1.setInput(0, sopadd1);

	// we set up an attribute inside a subnet
	const subnet1 = particles1.createNode('subnet');
	subnet1.p.inputsCount.set(1);
	subnet1.setInputType(0, GlConnectionPointType.VEC3);
	const subnet1_subnetInput1 = subnet1.createNode('subnetInput');
	const subnet1_subnetOutput1 = subnet1.createNode('subnetOutput');
	const param1 = subnet1.createNode('param');
	const add1 = subnet1.createNode('add');
	param1.setGlType(GlConnectionPointType.VEC3);
	param1.p.name.set('myCustomParam');
	add1.setInput(0, param1);
	add1.setInput(1, subnet1_subnetInput1);
	subnet1_subnetOutput1.setInput(0, add1);
	subnet1.setInput(0, globals1, 'position');
	output1.setInput('position', subnet1);

	// scene.setFrame(1);
	await particles1.compute();
	await waitForParticlesComputedAndMounted(particles1);
	assert.notOk(particles1.states.error.message(), 'no error message (1)');
	const configRef = (await resetParticles(particles1))!;
	assert.ok(configRef, 'configRef ok');

	const spareParam = particles1.params.get('myCustomParam')! as Vector3Param;
	assert.ok(spareParam);
	spareParam.set([-1, 2, -4]);

	const render_material = renderController(particles1).material()!;
	await RendererUtils.compile(pointsBuilder1, renderer);
	const uniform = MaterialUserDataUniforms.getUniforms(render_material)!.texture_position;

	assert.ok(render_material, 'material ok');
	assert.ok(uniform, 'uniform ok');

	const buffer_width = 1;
	const buffer_height = 1;
	let render_target1 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	let pixelBuffer = new Float32Array(buffer_width * buffer_height * 4);
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [1, 0.5, 0.25, 0].join(':'), 'point moved sideways frame 1');

	spareParam.set([3, 5, 6]);
	stepParticlesSimulation(particles1, configRef);
	let render_target2 = gpuController(particles1).getCurrentRenderTarget('position' as ShaderName)!;
	assert.notEqual(render_target2.texture.uuid, render_target1.texture.uuid);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [4, 5.5, 6.25, 0].join(':'), 'point moved sideways frame 2');

	spareParam.set([7, 0.5, 33]);
	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target1.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target1, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [11, 6, 39.25, 0].join(':'), 'point moved sideways frame 3');

	spareParam.set([27, 123, 4033]);
	stepParticlesSimulation(particles1, configRef);
	assert.equal(uniform.value.uuid, render_target2.texture.uuid, 'uniform has expected texture');
	renderer.readRenderTargetPixels(render_target2, 0, 0, buffer_width, buffer_height, pixelBuffer);
	assert.deepEqual(pixelBuffer.join(':'), [38, 129, 4072.25, 0].join(':'), 'point moved sideways frame 4');

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

qUnit.test('ParticlesSystemGPU: 2 gl/attribute with same attrib name do not trigger a redefinition', async (assert) => {
	const geo1 = window.geo1;
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const {renderer} = await RendererUtils.waitForRenderer(scene);
	assert.ok(renderer, 'renderer created');

	const sopadd1 = geo1.createNode('add');
	const particles1 = geo1.createNode('particlesSystemGpu');
	assert.equal(particles1.children().length, 0, 'no children');
	const {output1, actor1} = createRequiredNodesForParticles(particles1);
	assert.equal(particles1.children().length, 2, '2 children');

	sopadd1.p.createPoint.set(1);
	sopadd1.p.position.set([1, 0.5, 0.25]);
	actor1.setInput(0, sopadd1);
	particles1.p.preRollFramesCount.set(1);

	// we set up an attribute inside a subnet
	const attribute1 = particles1.createNode('attribute');
	const attribute2 = particles1.createNode('attribute');
	attribute1.p.name.set('test');
	attribute2.p.name.set('test');
	attribute1.setGlType(GlConnectionPointType.VEC3);
	attribute2.setGlType(GlConnectionPointType.VEC3);
	const add1 = particles1.createNode('add');
	add1.setInput(0, attribute1);
	add1.setInput(1, attribute2);
	output1.setInput('position', add1);

	scene.setFrame(1);
	await particles1.compute();
	await waitForParticlesComputedAndMounted(particles1);
	assert.notOk(particles1.states.error.message(), 'no error message (1)');

	const materials = gpuController(particles1).materials();
	assert.equal(materials.length, 1);
	const material = materials[0];
	assert.includes(
		material.fragmentShader,
		`
	// /geo1/particlesSystemGpu1/attribute1
	vec3 v_POLY_attribute1_val = texture2D( texture_test, particleUv ).xyz;
	
	// /geo1/particlesSystemGpu1/attribute2
	vec3 v_POLY_attribute2_val = texture2D( texture_test, particleUv ).xyz;
`
	);

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

qUnit.test('ParticlesSystemGPU persisted config still loads with an uncooked particles node', async (assert) => {
	const scene = window.scene;
	scene.setFrame(0);

	await scene.waitForCooksCompleted();
	const renderData1 = await RendererUtils.waitForRenderer(scene);
	const renderer1 = renderData1.renderer;
	assert.ok(renderer1, 'renderer created');

	function _createParticlesSystem1() {
		const geo = scene.createNode('geo');
		const plane1 = geo.createNode('plane');
		const scatter1 = geo.createNode('scatter');
		const particles1 = geo.createNode('particlesSystemGpu');
		assert.equal(particles1.children().length, 0, 'no children');
		const {output1, globals1} = createRequiredNodesForParticles(particles1);
		assert.equal(particles1.children().length, 2, '2 children');

		// inside particles system
		const add1 = particles1.createNode('add');
		add1.setInput(0, globals1, 'position');
		add1.params.get('add1')!.set([0, 0.1, 0]);
		output1.setInput('position', add1);

		// outside particles system
		particles1.setInput(0, scatter1);
		scatter1.setInput(0, plane1);
		particles1.flags.display.set(true);
		return {particles1};
	}
	function _createParticlesSystem2() {
		const geo = scene.createNode('geo');
		const plane1 = geo.createNode('plane');
		const scatter1 = geo.createNode('scatter');
		const particles2 = geo.createNode('particlesSystemGpu');
		assert.equal(particles2.children().length, 0, 'no children');
		const {output1, globals1} = createRequiredNodesForParticles(particles2);
		assert.equal(particles2.children().length, 2, '2 children');

		// inside particles system
		const add1 = particles2.createNode('add');
		add1.setInput(0, globals1, 'position');
		add1.params.get('add1')!.set([0, 0.1, 0]);
		output1.setInput('position', add1);

		// outside particles system
		particles2.setInput(0, scatter1);
		scatter1.setInput(0, plane1);
		plane1.flags.display.set(true);
		return {particles2};
	}

	const {particles1} = _createParticlesSystem1();
	const {particles2} = _createParticlesSystem2();

	await particles1.compute();

	scene.setFrame(0);
	const data = await new SceneJsonExporter(scene).data();
	await AssemblersUtils.withUnregisteredAssembler(particles1.usedAssembler(), async () => {
		// console.log('************ LOAD **************');
		const scene2 = await SceneJsonImporter.loadData(data);
		// await scene2.waitForCooksCompleted();
		assert.ok(scene2, 'scene2 loaded ok');

		// let's remove one entry to check it still loads
		assert.ok(data.shaders);
		if (data.shaders) {
			assert.ok(data.shaders[particles2.path()]);
			delete data.shaders[particles2.path()];
			assert.notOk(data.shaders[particles2.path()]);
		}
		const scene3 = await SceneJsonImporter.loadData(data);
		assert.ok(scene3, 'scene3 loaded ok');
	});

	RendererUtils.dispose();
	disposeParticlesFromNode(particles1);
});

}