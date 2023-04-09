/**
 * processes input events
 *
 *
 */
import {NodeParamsConfig, ParamConfig} from '../utils/params/ParamsConfig';
import {JsConnectionPoint, JsConnectionPointType, JS_CONNECTION_POINT_IN_NODE_DEF} from '../utils/io/connections/Js';
import {BaseNodeType} from '../_Base';
// import {ParamType} from '../../poly/ParamType';
// import {JsNodeParamConstructorMap} from './utils/JsNodeInputParam';
// import {ParamValuesTypeMap} from '../../params/types/ParamValuesTypeMap';
import {TRIGGER_CONNECTION_NAME, TypedJsNode} from './_Base';
import {StringParamLanguage} from '../../params/utils/OptionsController';
import {TranspiledFilter} from '../utils/code/controllers/TranspiledFilter';
import {Poly} from '../../Poly';
import {BaseCodeProcessor, buildCodeNodeFunction} from '../../../core/code/FunctionBuilderUtils';
import {ShadersCollectionController} from './code/utils/ShadersCollectionController';
import {inputObject3D} from './_BaseObject3D';

const CONNECTION_OPTIONS = JS_CONNECTION_POINT_IN_NODE_DEF;

const DEFAULT_TS = `
export class CodeJsProcessor extends BaseCodeJsProcessor {
	override initializeProcessor(){
		this.io.inputs.setNamedInputConnectionPoints([
			new JsConnectionPoint('myBool', JsConnectionPointType.BOOLEAN),
		]);
	}
	override setLines(shadersCollectionController) {
		const object3D = inputObject3D(this, shadersCollectionController);
		const myBool = this.variableForInput(shadersCollectionController, 'myBool');

		const bodyLines = [
			object3D + '.position.x += ' + myBool + ' ? 0.1 : -0.1;',
			object3D + '.updateMatrix()'
		];
		this.addBodyLines(shadersCollectionController, bodyLines);
	}
}
`;
const DEFAULT_JS = DEFAULT_TS.replace(/\:\sJsNodeTriggerContext/g, '').replace(/override\s/g, '');

export class BaseCodeJsProcessor extends BaseCodeProcessor {
	constructor(protected override node: CodeJsNode) {
		super(node);
		this.initializeProcessor();
	}
	get pv() {
		return this.node.pv;
	}
	get p() {
		return this.node.p;
	}
	get io() {
		return this.node.io;
	}

	initializeProcessor() {}
	setLines(shadersCollectionController: ShadersCollectionController) {}

	protected variableForInput(shadersCollectionController: ShadersCollectionController, inputName: string) {
		return this.node.variableForInput(shadersCollectionController, inputName);
	}
	protected addBodyLines(shadersCollectionController: ShadersCollectionController, bodyLines: string[]) {
		return shadersCollectionController._addBodyLines(this.node, bodyLines);
	}
}

class CodeJsParamsConfig extends NodeParamsConfig {
	compile = ParamConfig.BUTTON(null, {
		callback: (node: BaseNodeType) => {
			CodeJsNode.PARAM_CALLBACK_compile(node as CodeJsNode);
		},
	});
	codeTypescript = ParamConfig.STRING(DEFAULT_TS, {
		hideLabel: true,
		language: StringParamLanguage.TYPESCRIPT,
	});
	codeJavascript = ParamConfig.STRING(DEFAULT_JS, {
		hidden: true,
		callback: (node: BaseNodeType) => {
			CodeJsNode.PARAM_CALLBACK_compile(node as CodeJsNode);
		},
	});
}
const ParamsConfig = new CodeJsParamsConfig();
export class CodeJsNode extends TypedJsNode<CodeJsParamsConfig> {
	override paramsConfig = ParamsConfig;
	// adding BaseCodeJsProcessor seems necessary to have the bundled types include it
	static BaseCodeJsProcessor = BaseCodeJsProcessor;
	static override type() {
		return 'code';
	}

	protected _processor: BaseCodeJsProcessor | undefined;

	override initializeNode() {
		this.io.connection_points.spare_params.setInputlessParamNames(['codeTypescript', 'codeJavascript']);
		this.io.inputs.setNamedInputConnectionPoints([
			new JsConnectionPoint(TRIGGER_CONNECTION_NAME, JsConnectionPointType.TRIGGER, CONNECTION_OPTIONS),
			new JsConnectionPoint(JsConnectionPointType.OBJECT_3D, JsConnectionPointType.OBJECT_3D, CONNECTION_OPTIONS),
		]);
		this.io.outputs.setNamedOutputConnectionPoints([
			new JsConnectionPoint(TRIGGER_CONNECTION_NAME, JsConnectionPointType.TRIGGER),
		]);
		this.params.onParamsCreated('compile', () => {
			this._compile();
		});
	}

	override setLines(shadersCollectionController: ShadersCollectionController) {
		this._processor?.setLines(shadersCollectionController);
	}

	private _compile() {
		this._processor = undefined;
		try {
			const functionBody = `try {
	${TranspiledFilter.filter(this.pv.codeJavascript)}
} catch(e) {
		this.states.error.set(e)
}`;

			const ProcessorClass = buildCodeNodeFunction<BaseCodeJsProcessor>(
				BaseCodeJsProcessor,
				'BaseCodeJsProcessor',
				functionBody,
				{
					['JsConnectionPoint']: JsConnectionPoint,
					['JsConnectionPointType']: JsConnectionPointType,
					['inputObject3D']: inputObject3D,
				}
			);
			if (ProcessorClass) {
				this._processor = new ProcessorClass(this);
				// this._lastCompiledCode = this.pv.codeJavascript;
			} else {
				this.states.error.set(`cannot generate function`);
				Poly.warn(functionBody);
			}
		} catch (e) {
			Poly.warn(e);
			this.states.error.set(`cannot generate function (${e})`);
		}
	}
	static PARAM_CALLBACK_compile(node: CodeJsNode) {
		node._compile();
	}

	/*
	 *
	 * hooks for the processor
	 *
	 */
	// public _processorHookInputValueFromParam<T extends ParamType>(
	// 	param: JsNodeParamConstructorMap[T],
	// 	context: JsNodeTriggerContext
	// ): ParamValuesTypeMap[T] {
	// 	return this._inputValueFromParam(param, context);
	// }
	// public _processorHookInputValue<T extends JsConnectionPointType>(
	// 	inputNameOrIndex: string | number,
	// 	context: JsNodeTriggerContext
	// ): ReturnValueTypeByJsConnectionPointType[T] | undefined {
	// 	return this._inputValue(inputNameOrIndex, context);
	// }
}