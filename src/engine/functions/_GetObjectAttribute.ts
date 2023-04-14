import {Object3D} from 'three';
import {ObjectNamedFunction2} from './_Base';
import {_getOrCreateObjectAttributeRef} from '../../core/reactivity/ObjectAttributeReactivityCreateRef';
import {AttribValue} from '../../types/GlobalTypes';
import {ParamConvertibleJsType} from '../nodes/utils/io/connections/Js';

export class getObjectAttribute extends ObjectNamedFunction2<[string, ParamConvertibleJsType]> {
	static override type() {
		return 'getObjectAttribute';
	}
	func(object3D: Object3D, attribName: string, type: ParamConvertibleJsType): AttribValue {
		const _ref = _getOrCreateObjectAttributeRef(object3D, attribName, type);
		return _ref.current.value;
	}
}