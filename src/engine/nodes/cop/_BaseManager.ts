import {NodeContext} from '../../poly/NodeContext';
import {NodeParamsConfig} from '../utils/params/ParamsConfig';
import {TypedNode} from '../_Base';

class ParamLessNetworkCopParamsConfig extends NodeParamsConfig {}
export class BaseNetworkCopNode<K extends NodeParamsConfig> extends TypedNode<NodeContext.COP, K> {
	static nodeContext(): NodeContext {
		return NodeContext.COP;
	}
	cook() {
		this.cookController.end_cook();
	}
}
export class ParamLessBaseNetworkCopNode extends BaseNetworkCopNode<ParamLessNetworkCopParamsConfig> {}