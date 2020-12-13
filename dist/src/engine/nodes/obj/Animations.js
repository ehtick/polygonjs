import {ParamLessBaseManagerObjNode} from "./_BaseManager";
import {NodeContext as NodeContext2, NetworkNodeType} from "../../poly/NodeContext";
import {ObjNodeRenderOrder} from "./_Base";
export class AnimationsObjNode extends ParamLessBaseManagerObjNode {
  constructor() {
    super(...arguments);
    this.render_order = ObjNodeRenderOrder.MANAGER;
    this._children_controller_context = NodeContext2.ANIM;
  }
  static type() {
    return NetworkNodeType.ANIM;
  }
  createNode(node_class, params_init_value_overrides) {
    return super.createNode(node_class, params_init_value_overrides);
  }
  children() {
    return super.children();
  }
  nodes_by_type(type) {
    return super.nodes_by_type(type);
  }
}