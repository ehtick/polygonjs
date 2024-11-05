import type {QUnit} from '../../../helpers/QUnit';
import {PointLightObjNode} from './../../../../src/engine/nodes/obj/PointLight';
import {PointLightRayMarchingUniformElement} from './../../../../src/engine/scene/utils/raymarching/PointLight';
import {UniformName} from './../../../../src/engine/scene/utils/UniformsController';
import {Vector3} from 'three';
import {CoreSleep} from './../../../../src/core/Sleep';
import {GlConnectionPointType} from '../../../../src/engine/nodes/utils/io/connections/Gl';

import BasicDefaultVertex from './templates/raymarching/default.vert.glsl';
import BasicDefaultFragment from './templates/raymarching/default.frag.glsl';
import GlobalsNotNeededVertex from './templates/raymarching/globalsNotNeeded.vert.glsl';
import GlobalsNotNeededFragment from './templates/raymarching/globalsNotNeeded.frag.glsl';
import BasicMinimalVertex from './templates/raymarching/minimal.vert.glsl';
import BasicMinimalFragment from './templates/raymarching/minimal.frag.glsl';
import BasicPositionVertex from './templates/raymarching/position.vert.glsl';
import BasicPositionFragment from './templates/raymarching/position.frag.glsl';
import SimpleVertexVertex from './templates/raymarching/simple_vertex.vert.glsl';
import SimpleVertexFragment from './templates/raymarching/simple_vertex.frag.glsl';
import CameraPositionVertex from './templates/raymarching/cameraPosition.vert.glsl';
import CameraPositionFragment from './templates/raymarching/cameraPosition.frag.glsl';
import ReflectionVertex from './templates/raymarching/reflection.vert.glsl';
import ReflectionFragment from './templates/raymarching/reflection.frag.glsl';
import RefractionVertex from './templates/raymarching/refraction.vert.glsl';
import RefractionFragment from './templates/raymarching/refraction.frag.glsl';
import RefractionSplitRGBFragment from './templates/raymarching/refraction_splitRGB.frag.glsl';
import {RAYMARCHING_UNIFORMS} from '../../../../src/engine/nodes/gl/gl/raymarching/uniforms';
import {SceneJsonImporter} from '../../../../src/engine/io/json/import/Scene';
import {SceneJsonExporter} from '../../../../src/engine/io/json/export/Scene';
import {RayMarchingBuilderMatNode} from '../../../../src/engine/nodes/mat/RayMarchingBuilder';
import {FloatParam} from '../../../../src/engine/params/Float';
import {Vector3Param} from '../../../../src/engine/params/Vector3';
import {AssemblersUtils} from '../../../helpers/AssemblersUtils';
import {ShaderMaterialWithCustomMaterials} from '../../../../src/core/geometry/Material';
import {RendererUtils} from '../../../helpers/RendererUtils';
import {MaterialUserDataUniforms} from '../../../../src/engine/nodes/gl/code/assemblers/materials/OnBeforeCompile';
import {GLSLHelper} from '../../../helpers/GLSLHelper';

export function onCreateHook(node: RayMarchingBuilderMatNode) {
	const globals = node.createNode('globals');
	const output = node.createNode('output');

	const sdfContext = node.createNode('SDFContext');
	const sdfMaterial = node.createNode('SDFMaterial');
	const sdfSphere = node.createNode('SDFSphere');
	const constant = node.createNode('constant');

	output.setInput(0, sdfContext);
	sdfContext.setInput(0, sdfSphere);
	sdfContext.setInput(1, sdfMaterial);
	sdfSphere.setInput('position', globals, 'position');
	sdfMaterial.setInput('color', constant);

	constant.setGlType(GlConnectionPointType.VEC3);
	constant.p.asColor.set(1);
	constant.p.color.set([1, 1, 1]);
	sdfMaterial.p.useEnvMap.set(1);

	globals.uiData.setPosition(-300, -0);
	output.uiData.setPosition(300, 0);

	sdfContext.uiData.setPosition(100, 0);
	sdfSphere.uiData.setPosition(-100, 0);
	sdfMaterial.uiData.setPosition(-100, 200);
	constant.uiData.setPosition(-300, 200);

	return {globals, output, sdfSphere, sdfMaterial, constant};
}

export function testenginenodesmatRayMarchingBuilder(qUnit: QUnit) {
	const TEST_SHADER_LIB = {
		default: {vert: BasicDefaultVertex, frag: BasicDefaultFragment},
		globalsNotNeeded: {vert: GlobalsNotNeededVertex, frag: GlobalsNotNeededFragment},
		minimal: {vert: BasicMinimalVertex, frag: BasicMinimalFragment},
		position: {vert: BasicPositionVertex, frag: BasicPositionFragment},
		simpleVertex: {vert: SimpleVertexVertex, frag: SimpleVertexFragment},
		cameraPosition: {vert: CameraPositionVertex, frag: CameraPositionFragment},
		reflection: {vert: ReflectionVertex, frag: ReflectionFragment},
		refraction: {vert: RefractionVertex, frag: RefractionFragment, fragSplitRGB: RefractionSplitRGBFragment},
	};

	const ALL_UNIFORMS_WITHOUT_ENV = [
		...Object.keys(RAYMARCHING_UNIFORMS).concat([
			'spotLightsRayMarching',
			'directionalLightsRayMarching',
			'pointLightsRayMarching',
		]),
		'alphaMap',
		'alphaMapTransform',
		'alphaTest',
		'ambientLightColor',
		'aoMap',
		'aoMapIntensity',
		'aoMapTransform',
		'bumpMap',
		'bumpMapTransform',
		'bumpScale',
		'diffuse',
		'directionalLightShadows',
		'directionalLights',
		'directionalShadowMap',
		'directionalShadowMatrix',
		'displacementBias',
		'displacementMap',
		'displacementMapTransform',
		'displacementScale',
		'emissive',
		'emissiveMap',
		'emissiveMapTransform',
		'envMap',
		'envMapIntensity',
		'envMapRotation',
		'flipEnvMap',
		'fogColor',
		'fogDensity',
		'fogFar',
		'fogNear',
		'hemisphereLights',
		'ior',
		'lightMap',
		'lightMapIntensity',
		'lightMapTransform',
		'lightProbe',
		'ltc_1',
		'ltc_2',
		'map',
		'mapTransform',
		'metalness',
		'metalnessMap',
		'metalnessMapTransform',
		'normalMap',
		'normalMapTransform',
		'normalScale',
		'opacity',
		'pointLightShadows',
		'pointLights',
		'pointShadowMap',
		'pointShadowMatrix',
		'rectAreaLights',
		'reflectivity',
		'refractionRatio',
		'roughness',
		'roughnessMap',
		'roughnessMapTransform',
		'spotLightMap',
		'spotLightMatrix',
		'spotLightShadows',
		'spotLights',
		'spotShadowMap',
	];

	const ALL_UNIFORMS = [...ALL_UNIFORMS_WITHOUT_ENV];

	qUnit.test('mat/rayMarchingBuilder simple', async (assert) => {
		const {renderer} = await RendererUtils.waitForRenderer(window.scene);
		const MAT = window.MAT;
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
		const {globals, sdfSphere} = onCreateHook(rayMarchingBuilder1);
		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(
			GLSLHelper.compress(material.vertexShader),
			GLSLHelper.compress(TEST_SHADER_LIB.default.vert),
			'TEST_SHADER_LIB.default.vert'
		);
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.default.frag),
			'TEST_SHADER_LIB.default.frag'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());

		sdfSphere.setInput('radius', globals, 'time');
		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(GLSLHelper.compress(material.vertexShader), GLSLHelper.compress(TEST_SHADER_LIB.minimal.vert));
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.minimal.frag),
			'TEST_SHADER_LIB.minimal.frag'
		);

		const floatToVec31 = rayMarchingBuilder1.createNode('floatToVec3');
		floatToVec31.setInput(0, globals, 'time');
		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(GLSLHelper.compress(material.vertexShader), GLSLHelper.compress(TEST_SHADER_LIB.position.vert));
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.position.frag),
			'TEST_SHADER_LIB.position.frag'
		);

		RendererUtils.dispose();
	});

	qUnit.test('mat/rayMarchingBuilder vertex shader remains simple', async (assert) => {
		const {renderer} = await RendererUtils.waitForRenderer(window.scene);
		const MAT = window.MAT;
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
		const {sdfSphere, sdfMaterial, constant} = onCreateHook(rayMarchingBuilder1);
		const multScalar1 = rayMarchingBuilder1.createNode('multScalar');
		sdfMaterial.setInput('color', multScalar1);
		multScalar1.setInput(0, constant);
		multScalar1.setInput(1, sdfSphere);
		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(
			GLSLHelper.compress(material.vertexShader),
			GLSLHelper.compress(TEST_SHADER_LIB.simpleVertex.vert)
		);
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.simpleVertex.frag),
			'TEST_SHADER_LIB.simpleVertex.frag'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());
	});
	qUnit.test(
		'mat/rayMarchingBuilder SDF functions are still valid without being connected to globals',
		async (assert) => {
			const {renderer} = await RendererUtils.waitForRenderer(window.scene);
			const MAT = window.MAT;
			// const debug = MAT.createNode('test')
			const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
			const {sdfSphere} = onCreateHook(rayMarchingBuilder1);
			sdfSphere.setInput(0, null);
			const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

			await RendererUtils.compile(rayMarchingBuilder1, renderer);
			assert.equal(
				GLSLHelper.compress(material.vertexShader),
				GLSLHelper.compress(TEST_SHADER_LIB.globalsNotNeeded.vert)
			);
			assert.equal(
				GLSLHelper.compress(material.fragmentShader),
				GLSLHelper.compress(TEST_SHADER_LIB.globalsNotNeeded.frag),
				'TEST_SHADER_LIB.globalsNotNeeded.frag'
			);
			assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());
		}
	);

	qUnit.test('mat/rayMarchingBuilder uses cameraPosition for fresnel on envMap', async (assert) => {
		const {renderer} = await RendererUtils.waitForRenderer(window.scene);
		const MAT = window.MAT;
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');

		const globals = rayMarchingBuilder1.createNode('globals');
		const output = rayMarchingBuilder1.createNode('output');
		const sdfGradient1 = rayMarchingBuilder1.createNode('SDFGradient');
		const sdfGradientSubnetInput = sdfGradient1.createNode('subnetInput');
		const sdfGradientSubnetOutput = sdfGradient1.createNode('subnetOutput');
		const sdfSphere = sdfGradient1.createNode('SDFSphere');
		sdfSphere.setInput(0, sdfGradientSubnetInput);
		sdfGradientSubnetOutput.setInput(0, sdfSphere);

		const sdfContext = rayMarchingBuilder1.createNode('SDFContext');
		const sdfMaterial = rayMarchingBuilder1.createNode('SDFMaterial');

		const constant = rayMarchingBuilder1.createNode('constant');

		output.setInput(0, sdfContext);
		sdfContext.setInput(0, sdfGradient1);
		sdfContext.setInput(1, sdfMaterial);
		sdfGradient1.setInput('position', globals, 'position');
		sdfMaterial.setInput('color', constant);

		constant.setGlType(GlConnectionPointType.VEC3);
		constant.p.asColor.set(1);
		constant.p.color.set([1, 1, 1]);

		//
		const normalize1 = rayMarchingBuilder1.createNode('normalize');
		const dot1 = rayMarchingBuilder1.createNode('dot');
		const complement1 = rayMarchingBuilder1.createNode('complement');
		const pow1 = rayMarchingBuilder1.createNode('pow');
		const abs1 = rayMarchingBuilder1.createNode('abs');

		sdfMaterial.p.useEnvMap.set(1);
		sdfMaterial.setInput('envMapIntensity', abs1);
		abs1.setInput(0, pow1);
		pow1.setInput(0, complement1);
		complement1.setInput(0, dot1);
		dot1.setInput(0, sdfGradient1, 'gradient');
		dot1.setInput(1, normalize1);
		normalize1.setInput(0, globals, 'cameraPosition');

		// add inputs to the SDFMaterial, to make sure those are properly parsed
		const envMapTint = rayMarchingBuilder1.createNode('constant');
		envMapTint.setName('envMapTint');
		envMapTint.setGlType(GlConnectionPointType.VEC3);
		sdfMaterial.setInput('envMapTint', envMapTint);
		const envMapFresnel = rayMarchingBuilder1.createNode('constant');
		envMapFresnel.setName('envMapFresnel');
		sdfMaterial.setInput('envMapFresnel', envMapFresnel);
		const envMapFresnelPower = rayMarchingBuilder1.createNode('constant');
		envMapFresnelPower.setName('envMapFresnelPower');
		sdfMaterial.setInput('envMapFresnelPower', envMapFresnelPower);

		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(
			GLSLHelper.compress(material.vertexShader),
			GLSLHelper.compress(TEST_SHADER_LIB.cameraPosition.vert)
		);
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.cameraPosition.frag),
			'TEST_SHADER_LIB.cameraPosition.frag'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());
	});

	qUnit.test('mat/rayMarchingBuilder with raymarched reflections', async (assert) => {
		const {renderer} = await RendererUtils.waitForRenderer(window.scene);
		const MAT = window.MAT;
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');

		const globals = rayMarchingBuilder1.createNode('globals');
		const output = rayMarchingBuilder1.createNode('output');
		const sdfGradient1 = rayMarchingBuilder1.createNode('SDFGradient');
		const sdfGradientSubnetInput = sdfGradient1.createNode('subnetInput');
		const sdfGradientSubnetOutput = sdfGradient1.createNode('subnetOutput');
		const sdfSphere = sdfGradient1.createNode('SDFSphere');
		sdfSphere.setInput(0, sdfGradientSubnetInput);
		sdfGradientSubnetOutput.setInput(0, sdfSphere);

		const sdfContext = rayMarchingBuilder1.createNode('SDFContext');
		const sdfMaterial = rayMarchingBuilder1.createNode('SDFMaterial');

		const constant = rayMarchingBuilder1.createNode('constant');

		output.setInput(0, sdfContext);
		sdfContext.setInput(0, sdfGradient1);
		sdfContext.setInput(1, sdfMaterial);
		sdfGradient1.setInput('position', globals, 'position');
		sdfMaterial.setInput('color', constant);
		sdfMaterial.p.useReflection.set(1);

		constant.setGlType(GlConnectionPointType.VEC3);
		constant.p.asColor.set(1);
		constant.p.color.set([1, 1, 1]);

		// add inputs to the SDFMaterial, to make sure those are properly parsed
		const reflectivity = rayMarchingBuilder1.createNode('constant');
		reflectivity.setName('reflectivity');
		reflectivity.setGlType(GlConnectionPointType.FLOAT);
		reflectivity.p.float.set(0.74);
		sdfMaterial.setInput('reflectivity', reflectivity);
		const reflectionTint = rayMarchingBuilder1.createNode('constant');
		reflectionTint.p.int.set(11);
		reflectionTint.setGlType(GlConnectionPointType.VEC3);
		reflectionTint.setName('reflectionTint');
		sdfMaterial.setInput('reflectionTint', reflectionTint);
		const reflectionBiasMult = rayMarchingBuilder1.createNode('constant');
		reflectionBiasMult.p.int.set(4);
		reflectionBiasMult.setGlType(GlConnectionPointType.FLOAT);
		reflectionBiasMult.setName('reflectionBiasMult');
		sdfMaterial.setInput('reflectionBiasMult', reflectionBiasMult);

		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(GLSLHelper.compress(material.vertexShader), GLSLHelper.compress(TEST_SHADER_LIB.reflection.vert));
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.reflection.frag),
			'TEST_SHADER_LIB.reflection.frag'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());
	});

	qUnit.test('mat/rayMarchingBuilder with raymarched refractions', async (assert) => {
		const {renderer} = await RendererUtils.waitForRenderer(window.scene);
		const MAT = window.MAT;
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');

		const globals = rayMarchingBuilder1.createNode('globals');
		const output = rayMarchingBuilder1.createNode('output');
		const sdfGradient1 = rayMarchingBuilder1.createNode('SDFGradient');
		const sdfGradientSubnetInput = sdfGradient1.createNode('subnetInput');
		const sdfGradientSubnetOutput = sdfGradient1.createNode('subnetOutput');
		const sdfSphere = sdfGradient1.createNode('SDFSphere');
		sdfSphere.setInput(0, sdfGradientSubnetInput);
		sdfGradientSubnetOutput.setInput(0, sdfSphere);

		const sdfContext = rayMarchingBuilder1.createNode('SDFContext');
		const sdfMaterial = rayMarchingBuilder1.createNode('SDFMaterial');

		const constant = rayMarchingBuilder1.createNode('constant');

		output.setInput(0, sdfContext);
		sdfContext.setInput(0, sdfGradient1);
		sdfContext.setInput(1, sdfMaterial);
		sdfGradient1.setInput('position', globals, 'position');
		sdfMaterial.setInput('color', constant);
		sdfMaterial.p.useRefraction.set(1);

		constant.setGlType(GlConnectionPointType.VEC3);
		constant.p.asColor.set(1);
		constant.p.color.set([1, 1, 1]);

		// add inputs to the SDFMaterial, to make sure those are properly parsed

		const refractionTint = rayMarchingBuilder1.createNode('constant');
		refractionTint.p.int.set(11);
		refractionTint.setGlType(GlConnectionPointType.VEC3);
		refractionTint.setName('refractionTint');
		sdfMaterial.setInput('refractionTint', refractionTint);
		const ior = rayMarchingBuilder1.createNode('constant');
		ior.setName('ior');
		ior.setGlType(GlConnectionPointType.FLOAT);
		ior.p.float.set(1.45);
		sdfMaterial.setInput('ior', ior);
		const iorOffset = rayMarchingBuilder1.createNode('constant');
		iorOffset.setName('iorOffset');
		iorOffset.setGlType(GlConnectionPointType.VEC3);
		iorOffset.p.vec3.set([-0.01, 0, 0.01]);
		sdfMaterial.setInput('iorOffset', iorOffset);
		const transmission = rayMarchingBuilder1.createNode('constant');
		transmission.setName('transmission');
		transmission.setGlType(GlConnectionPointType.FLOAT);
		transmission.p.float.set(0.7);
		sdfMaterial.setInput('transmission', transmission);
		const absorption = rayMarchingBuilder1.createNode('constant');
		absorption.setName('absorption');
		absorption.setGlType(GlConnectionPointType.FLOAT);
		absorption.p.float.set(0.7);
		sdfMaterial.setInput('absorption', absorption);
		const refractionBiasMult = rayMarchingBuilder1.createNode('constant');
		refractionBiasMult.p.int.set(4);
		refractionBiasMult.setGlType(GlConnectionPointType.FLOAT);
		refractionBiasMult.setName('refractionBiasMult');
		sdfMaterial.setInput('refractionBiasMult', refractionBiasMult);

		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		// without splitRGB
		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(GLSLHelper.compress(material.vertexShader), GLSLHelper.compress(TEST_SHADER_LIB.refraction.vert));
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.refraction.frag),
			'TEST_SHADER_LIB.refraction.frag'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());

		// with splitRGB
		sdfMaterial.p.splitRGB.set(1);
		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		assert.equal(GLSLHelper.compress(material.vertexShader), GLSLHelper.compress(TEST_SHADER_LIB.refraction.vert));
		assert.equal(
			GLSLHelper.compress(material.fragmentShader),
			GLSLHelper.compress(TEST_SHADER_LIB.refraction.fragSplitRGB),
			'TEST_SHADER_LIB.refraction.fragSplitRGB'
		);
		assert.deepEqual(Object.keys(MaterialUserDataUniforms.getUniforms(material)!).sort(), ALL_UNIFORMS.sort());
	});

	qUnit.test(
		'mat/rayMarchingBuilder can be time dependent if only the materials have time dependency',
		async (assert) => {
			const {renderer} = await RendererUtils.waitForRenderer(window.scene);
			const scene = window.scene;
			const MAT = window.MAT;
			// const debug = MAT.createNode('test')
			const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');

			const globals = rayMarchingBuilder1.createNode('globals');
			const output = rayMarchingBuilder1.createNode('output');
			const sdfGradient1 = rayMarchingBuilder1.createNode('SDFGradient');
			const sdfGradientSubnetInput = sdfGradient1.createNode('subnetInput');
			const sdfGradientSubnetOutput = sdfGradient1.createNode('subnetOutput');
			const sdfSphere = sdfGradient1.createNode('SDFSphere');
			sdfSphere.setInput(0, sdfGradientSubnetInput);
			sdfGradientSubnetOutput.setInput(0, sdfSphere);

			const sdfContext = rayMarchingBuilder1.createNode('SDFContext');
			const sdfMaterial = rayMarchingBuilder1.createNode('SDFMaterial');

			output.setInput(0, sdfContext);
			sdfContext.setInput(0, sdfGradient1);
			sdfContext.setInput(1, sdfMaterial);

			const color = rayMarchingBuilder1.createNode('constant');
			color.setGlType(GlConnectionPointType.VEC3);
			sdfMaterial.setInput('color', color);

			await RendererUtils.compile(rayMarchingBuilder1, renderer);
			const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

			scene.timeController.setTime(17);
			assert.notOk(material.uniforms['time'], 'no time uniform');

			sdfMaterial.setInput('envMapIntensity', globals, 'time');
			await RendererUtils.compile(rayMarchingBuilder1, renderer);
			scene.timeController.setTime(18);
			assert.equal(material.uniforms['time'].value, 18);
		}
	);
	qUnit.test(
		'mat/rayMarchingBuilder multiple objects share the same spotLightRayMarching uniforms',
		async (assert) => {
			const scene = window.scene;
			// const geo1 = window.geo1;

			const perspective_camera1 = window.perspective_camera1;
			perspective_camera1.p.t.set([1, 1, 5]);
			// const {renderer} = await RendererUtils.waitForRenderer(window.scene);
			const MAT = window.MAT;
			// const debug = MAT.createNode('test')
			const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
			const rayMarchingBuilder1Nodes = onCreateHook(rayMarchingBuilder1);
			rayMarchingBuilder1Nodes.sdfSphere.p.radius.set(0.1);
			const rayMarchingBuilder2 = MAT.createNode('rayMarchingBuilder');
			onCreateHook(rayMarchingBuilder2);
			const material1 = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;
			const material2 = (await rayMarchingBuilder2.material()) as ShaderMaterialWithCustomMaterials;

			function createBox(materialNode: RayMarchingBuilderMatNode, pos: Vector3) {
				const geo = scene.root().createNode('geo');
				const box1 = geo.createNode('box');
				const material1 = geo.createNode('material');
				material1.setInput(0, box1);
				material1.p.material.setNode(materialNode);
				material1.flags.display.set(true);
			}
			function getMaterialPointLightRayMarchingUniform(material: ShaderMaterialWithCustomMaterials) {
				const uniform = material.uniforms[UniformName.POINTLIGHTS_RAYMARCHING];
				const penumbras: number[] = uniform.value.map((u: PointLightRayMarchingUniformElement) => u.penumbra);
				return penumbras;
			}
			createBox(rayMarchingBuilder1, new Vector3(0, 0, 0));
			createBox(rayMarchingBuilder2, new Vector3(2, 0, 0));

			await RendererUtils.withViewer({cameraNode: perspective_camera1}, async (args) => {
				scene.play();
				await CoreSleep.sleep(50);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material1), []);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material2), []);

				const pointLight1 = scene.root().createNode('pointLight');
				pointLight1.p.raymarchingPenumbra.set(0.5);
				await CoreSleep.sleep(50);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material1), [0.5]);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material2), [0.5]);

				const pointLight2 = scene.root().createNode('pointLight');
				pointLight2.p.raymarchingPenumbra.set(0.25);
				await CoreSleep.sleep(50);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material1), [0.5, 0.25]);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material2), [0.5, 0.25]);

				scene.root().removeNode(pointLight1);
				await CoreSleep.sleep(50);
				// it's probably ok that the uniforms do not get resized down,
				// since threejs still sets the number of spotlights to iterate
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material1), [0.25, 0.25]);
				assert.deepEqual(getMaterialPointLightRayMarchingUniform(material2), [0.25, 0.25]);
			});
		}
	);

	qUnit.test('mat/rayMarchingBuilder with env map', async (assert) => {
		const MAT = window.MAT;
		const COP = window.COP;
		// const geo1 = window.geo1;

		// cam
		const perspective_camera1 = window.perspective_camera1;
		perspective_camera1.p.t.set([1, 1, 5]);

		await RendererUtils.waitForRenderer(window.scene);

		// env map
		const fileEXR = COP.createNode('imageEXR');
		// fileEXR.p.url.set()
		const envMap1 = COP.createNode('envMap');
		envMap1.setInput(0, fileEXR);

		// mat
		// const debug = MAT.createNode('test')
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
		onCreateHook(rayMarchingBuilder1);
		rayMarchingBuilder1.p.useEnvMap.set(true);
		rayMarchingBuilder1.p.envMap.setNode(envMap1);
		await rayMarchingBuilder1.compute();
		const material = await rayMarchingBuilder1.material();
		assert.null((material.uniforms as any).envMap.value);
		assert.equal(material.defines['ENVMAP_TYPE_CUBE_UV'], 0);
		assert.equal(material.defines['CUBEUV_TEXEL_WIDTH'], '0.1');
		assert.equal(material.defines['CUBEUV_TEXEL_HEIGHT'], '0.1');
		assert.equal(material.defines['CUBEUV_MAX_MIP'], '1.0');

		const container = await envMap1.compute();
		await rayMarchingBuilder1.compute();
		const texture = container.texture();
		assert.ok(texture);
		assert.equal((material.uniforms as any).envMap.value.uuid, texture.uuid);
		assert.equal(material.defines['ENVMAP_TYPE_CUBE_UV'], 1);
		assert.equal(material.defines['CUBEUV_TEXEL_WIDTH'], 0.0013020833333333333);
		assert.equal(material.defines['CUBEUV_TEXEL_HEIGHT'], 0.0009765625);
		assert.equal(material.defines['CUBEUV_MAX_MIP'], 8);
	});
	qUnit.test('mat/rayMarchingBuilder with 2 SDFMaterials', async (assert) => {
		const MAT = window.MAT;
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
		const output = rayMarchingBuilder1.createNode('output');

		const {renderer} = await RendererUtils.waitForRenderer(window.scene);

		function _createContext() {
			const sdfContext = rayMarchingBuilder1.createNode('SDFContext');
			const sdfMaterial = rayMarchingBuilder1.createNode('SDFMaterial');
			const constant = rayMarchingBuilder1.createNode('constant');
			const sdfSphere = rayMarchingBuilder1.createNode('SDFSphere');

			constant.setGlType(GlConnectionPointType.VEC3);
			constant.p.asColor.set(1);
			constant.p.color.set([1, 1, 1]);

			sdfMaterial.setInput('color', constant);
			sdfContext.setInput('sdf', sdfSphere);
			sdfContext.setInput('material', sdfMaterial);

			return sdfContext;
		}

		const SDFUnion1 = rayMarchingBuilder1.createNode('SDFUnion');
		const sdfContext1 = _createContext();
		const sdfContext2 = _createContext();
		output.setInput(0, SDFUnion1);
		SDFUnion1.setInput(0, sdfContext1);
		SDFUnion1.setInput(1, sdfContext2);

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		const material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;
		assert.includes(material.fragmentShader, 'const int _MAT_RAYMARCHINGBUILDER1_SDFMATERIAL1 = 1;');
		assert.includes(material.fragmentShader, 'const int _MAT_RAYMARCHINGBUILDER1_SDFMATERIAL2 = 2;');
		assert.includes(material.fragmentShader, 'if(mat == _MAT_RAYMARCHINGBUILDER1_SDFMATERIAL1){');
		assert.includes(material.fragmentShader, 'if(mat == _MAT_RAYMARCHINGBUILDER1_SDFMATERIAL2){');
	});

	qUnit.test('mat/rayMarchingBuilder persisted_config', async (assert) => {
		const scene = window.scene;
		const {renderer} = await RendererUtils.waitForRenderer(scene);
		const MAT = window.MAT;
		const rayMarchingBuilder1 = MAT.createNode('rayMarchingBuilder');
		const {sdfSphere, sdfMaterial} = onCreateHook(rayMarchingBuilder1);
		const param1 = rayMarchingBuilder1.createNode('param');
		param1.setGlType(GlConnectionPointType.FLOAT);
		param1.p.name.set('float_param');
		const param2 = rayMarchingBuilder1.createNode('param');
		param2.setGlType(GlConnectionPointType.VEC3);
		param2.p.name.set('vec3_param');

		sdfSphere.setInput('radius', param1);
		sdfMaterial.setInput('color', param2);

		const pointLight = scene.createNode('pointLight');
		const null1 = scene.createNode('null');
		null1.p.t.set([7, 10, 21]);
		pointLight.p.t.set([1, 2, 3]);
		pointLight.setInput(0, null1);

		await RendererUtils.compile(rayMarchingBuilder1, renderer);
		const rayMarching1Material = (await rayMarchingBuilder1.material()) as ShaderMaterialWithCustomMaterials;

		const data = await new SceneJsonExporter(scene).data();
		await AssemblersUtils.withUnregisteredAssembler(rayMarchingBuilder1.usedAssembler(), async () => {
			// console.log('************ LOAD **************');
			const scene2 = await SceneJsonImporter.loadData(data);
			await scene2.waitForCooksCompleted();

			const pointLight2 = scene2.node(pointLight.path()) as PointLightObjNode;

			const rayMarchingBuilder2 = scene2.node(rayMarchingBuilder1.path()) as RayMarchingBuilderMatNode;
			assert.notOk(rayMarchingBuilder2.assemblerController());
			assert.ok(rayMarchingBuilder2.persisted_config);
			const float_param = rayMarchingBuilder2.params.get('float_param') as FloatParam;
			const vec3_param = rayMarchingBuilder2.params.get('vec3_param') as Vector3Param;
			assert.ok(float_param);
			assert.ok(vec3_param);
			const material = (await rayMarchingBuilder2.material()) as ShaderMaterialWithCustomMaterials;
			await RendererUtils.compile(rayMarchingBuilder2, renderer);
			assert.equal(
				GLSLHelper.compress(material.fragmentShader),
				GLSLHelper.compress(rayMarching1Material.fragmentShader)
			);
			assert.equal(
				GLSLHelper.compress(material.vertexShader),
				GLSLHelper.compress(rayMarching1Material.vertexShader)
			);

			// float param callback
			assert.equal(MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_float_param.value, 0);
			float_param.set(2);
			assert.equal(MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_float_param.value, 2);
			float_param.set(4);
			assert.equal(MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_float_param.value, 4);

			// vector3 param callback
			assert.deepEqual(
				MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_vec3_param.value.toArray(),
				[0, 0, 0]
			);
			vec3_param.set([1, 2, 3]);
			assert.deepEqual(
				MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_vec3_param.value.toArray(),
				[1, 2, 3]
			);
			vec3_param.set([5, 6, 7]);
			assert.deepEqual(
				MaterialUserDataUniforms.getUniforms(material)!.v_POLY_param_vec3_param.value.toArray(),
				[5, 6, 7]
			);

			scene2.update(0.1);
			// test that the raymarching lights uniforms are shared with the scene
			const pointLightUniforms = (scene2.sceneTraverser as any)._pointLightsRayMarching;
			assert.equal(pointLightUniforms.value.length, 1);
			assert.deepEqual(pointLightUniforms.value[0]['penumbra'], 0);

			assert.equal(
				MaterialUserDataUniforms.getUniforms(material)![UniformName.POINTLIGHTS_RAYMARCHING].value.length,
				1
			);
			assert.deepEqual(
				MaterialUserDataUniforms.getUniforms(material)![UniformName.POINTLIGHTS_RAYMARCHING].value[0][
					'penumbra'
				],
				0
			);

			// we change the penumbra and both uniforms are updated (since they are the same)
			pointLight2.p.raymarchingPenumbra.set(1);
			await pointLight2.compute();
			scene2.update(0.1);
			assert.deepEqual(pointLightUniforms.value[0]['penumbra'], 1);
			assert.deepEqual(
				MaterialUserDataUniforms.getUniforms(material)![UniformName.POINTLIGHTS_RAYMARCHING].value[0][
					'penumbra'
				],
				1
			);
		});

		RendererUtils.dispose();
	});
}
