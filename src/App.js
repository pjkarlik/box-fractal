import fragmentSource from "./shaders/frg-shader";
import vertexSource from "./shaders/vrt-shader";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const queryRez = urlParams.get("rez");
const res = parseInt(queryRez, 10) || 3;
console.log(res);
export const getWidth = () => {
  return ~~(document.documentElement.clientWidth, window.innerWidth || 0) / res;
};

export const getHeight = () => {
  return (
    ~~(document.documentElement.clientHeight, window.innerHeight || 0) / res
  );
};

// Render Class Object //
export default class Render {
  constructor() {
    this.start = Date.now();
    // Setup WebGL canvas and surface object //
    // Make Canvas and get WebGl2 Context //
    const width = (this.width = getWidth());
    const height = (this.height = getHeight());
    const canvas = (this.canvas = document.createElement("canvas"));
    canvas.id = "GLShaders";

    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    const gl = (this.gl = canvas.getContext("webgl2"));

    if (!gl) {
      console.warn("WebGL 2 is not available.");
      return;
    }
    // WebGl and WebGl2 Extension //
    this.gl.getExtension("OES_standard_derivatives");
    this.gl.getExtension("EXT_shader_texture_lod");
    this.gl.getExtension("OES_texture_float");
    this.gl.getExtension("WEBGL_color_buffer_float");
    this.gl.getExtension("OES_texture_float_linear");

    this.gl.viewport(0, 0, canvas.width, canvas.height);
    // always nice to let people resize
    window.addEventListener(
      "resize",
      () => {
        this.canvas.width = getWidth();
        this.canvas.height = getHeight();
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.resolution = new Float32Array([
          this.canvas.width,
          this.canvas.height,
        ]);
        this.gl.uniform2fv(
          this.gl.getUniformLocation(this.program, "resolution"),
          this.resolution
        );
        this.clearCanvas();
      },
      false
    );

    this.init();
  }

  // Canvas Helper Function //
  createCanvas = (name) => {
    this.canvas =
      document.getElementById(name) || document.createElement("canvas");
    this.canvas.id = name;
    if (!document.getElementById(name)) {
      document.body.appendChild(this.canvas);
    }
    const context = this.canvas.getContext("webgl2");
    if (!context) {
      console.error("no webgl avaiable");
    }
    this.setViewport();
  };

  // Viewport Helper Function //
  setViewport = () => {
    this.width = getWidth();
    this.height = getHeight();
    this.gl = this.canvas.getContext("webgl");
    this.canvas.width = getWidth();
    this.canvas.height = getHeight();
    this.gl.viewport(0, 0, this.width, this.height);
    this.clearCanvas();
  };

  // Shader Bootstrap code //
  createShader = (type, source) => {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
    if (!success) {
      console.log(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return false;
    }
    return shader;
  };

  createWebGL = (vertexSource, fragmentSource) => {
    // Setup Vertext/Fragment Shader functions
    this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    this.fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource
    );

    // Setup Program and Attach Shader functions
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, this.vertexShader);
    this.gl.attachShader(this.program, this.fragmentShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.warn(
        "Unable to initialize the shader program: " +
          this.gl.getProgramInfoLog(this.program)
      );
      return null;
    }

    // Create and Bind buffer //
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    const vPosition = this.gl.getAttribLocation(this.program, "vPosition");

    this.gl.enableVertexAttribArray(vPosition);
    this.gl.vertexAttribPointer(
      vPosition,
      2, // size: 2 components per iteration
      this.gl.FLOAT, // type: the data is 32bit floats
      false, // normalize: don't normalize the data
      0, // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
      0 // start at the beginning of the buffer
    );

    this.clearCanvas();
    this.importUniforms();
  };

  clearCanvas = () => {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  };
  // add other uniforms here
  importUniforms = () => {
    this.width = getWidth();
    this.height = getHeight();
    this.resolution = new Float32Array([this.width, this.height]);
    this.gl.uniform2fv(
      this.gl.getUniformLocation(this.program, "resolution"),
      this.resolution
    );
    // get the uniform ins from the shader fragments
    this.ut = this.gl.getUniformLocation(this.program, "time");
  };
  // things that need to be updated per frame
  updateUniforms = () => {
    this.gl.uniform1f(this.ut, (Date.now() - this.start) / 1000);
    this.gl.drawArrays(
      this.gl.TRIANGLE_FAN, // primitiveType
      0, // Offset
      4 // Count
    );
  };

  // setup shaders and send to render loop
  init = () => {
    this.createWebGL(vertexSource, fragmentSource);
    this.renderLoop();
  };

  renderLoop = () => {
    this.updateUniforms();
    this.animation = window.requestAnimationFrame(this.renderLoop);
  };
}
