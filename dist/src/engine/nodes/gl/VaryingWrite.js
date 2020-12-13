import {TypedGlNode} from "./_Base";
import {NodeParamsConfig, ParamConfig} from "../utils/params/ParamsConfig";
import {GlConnectionPointType} from "../utils/io/connections/Gl";
import lodash_trim from "lodash/trim";
import {ShaderName as ShaderName2} from "../utils/shaders/ShaderName";
import {VaryingGLDefinition} from "./utils/GLDefinition";
import {ThreeToGl as ThreeToGl2} from "../../../core/ThreeToGl";
const VARYING_NODE_AVAILABLE_GL_TYPES = [
  GlConnectionPointType.FLOAT,
  GlConnectionPointType.VEC2,
  GlConnectionPointType.VEC3,
  GlConnectionPointType.VEC4
];
class VaryingWriteGlParamsConfig extends NodeParamsConfig {
  constructor() {
    super(...arguments);
    this.name = ParamConfig.STRING("");
    this.type = ParamConfig.INTEGER(0, {
      menu: {
        entries: VARYING_NODE_AVAILABLE_GL_TYPES.map((name, i) => {
          return {name, value: i};
        })
      }
    });
  }
}
const ParamsConfig2 = new VaryingWriteGlParamsConfig();
const VaryingWriteGlNode2 = class extends TypedGlNode {
  constructor() {
    super(...arguments);
    this.params_config = ParamsConfig2;
    this._on_create_set_name_if_none_bound = this._on_create_set_name_if_none.bind(this);
  }
  static type() {
    return "varying_write";
  }
  initialize_node() {
    this.add_post_dirty_hook("_set_mat_to_recompile", this._set_mat_to_recompile.bind(this));
    this.lifecycle.add_on_create_hook(this._on_create_set_name_if_none_bound);
    this.io.connection_points.initialize_node();
    this.io.connection_points.set_input_name_function(() => {
      return this.input_name;
    });
    this.io.connection_points.set_expected_input_types_function(() => [
      VARYING_NODE_AVAILABLE_GL_TYPES[this.pv.type]
    ]);
    this.io.connection_points.set_expected_output_types_function(() => []);
    this.scene.dispatch_controller.on_add_listener(() => {
      this.params.on_params_created("params_label", () => {
        this.params.label.init([this.p.name]);
      });
    });
  }
  get input_name() {
    return VaryingWriteGlNode2.INPUT_NAME;
  }
  set_lines(shaders_collection_controller) {
    if (shaders_collection_controller.current_shader_name == ShaderName2.VERTEX) {
      const gl_type = this.gl_type();
      if (!gl_type) {
        return;
      }
      const varying_name = this.pv.name;
      const definition = new VaryingGLDefinition(this, gl_type, varying_name);
      const input = ThreeToGl2.any(this.variable_for_input(VaryingWriteGlNode2.INPUT_NAME));
      const vertex_body_line = `${varying_name} = ${input}`;
      shaders_collection_controller.add_definitions(this, [definition], ShaderName2.VERTEX);
      shaders_collection_controller.add_body_lines(this, [vertex_body_line], ShaderName2.VERTEX);
    }
  }
  get attribute_name() {
    return lodash_trim(this.pv.name);
  }
  gl_type() {
    const connection_point = this.io.inputs.named_input_connection_points[0];
    if (connection_point) {
      return connection_point.type;
    }
  }
  set_gl_type(type) {
    this.p.type.set(VARYING_NODE_AVAILABLE_GL_TYPES.indexOf(type));
  }
  _on_create_set_name_if_none() {
    if (this.pv.name == "") {
      this.p.name.set(this.name);
    }
  }
};
export let VaryingWriteGlNode = VaryingWriteGlNode2;
VaryingWriteGlNode.INPUT_NAME = "vertex";