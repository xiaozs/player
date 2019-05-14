import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { VideoFrame } from "../frame";

export class WebGLPlayer extends PlayerParts {
    private gl = this.canvas.getContext("webgl")! || this.canvas.getContext("experimental-webgl")!;
    private y!: Texture;
    private u!: Texture;
    private v!: Texture;

    constructor(private canvas: HTMLCanvasElement, eventBus: EventEmitter) {
        super(eventBus);
        this.initGL();
    }

    private initGL() {
        let gl = this.gl;
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        let program = gl.createProgram()!;
        let vertexShaderSource = [
            "attribute highp vec4 aVertexPosition;",
            "attribute vec2 aTextureCoord;",
            "varying highp vec2 vTextureCoord;",
            "void main(void) {",
            " gl_Position = aVertexPosition;",
            " vTextureCoord = aTextureCoord;",
            "}"
        ].join("\n");
        let vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        let fragmentShaderSource = [
            "precision highp float;",
            "varying lowp vec2 vTextureCoord;",
            "uniform sampler2D YTexture;",
            "uniform sampler2D UTexture;",
            "uniform sampler2D VTexture;",
            "const mat4 YUV2RGB = mat4",
            "(",
            " 1.1643828125, 0, 1.59602734375, -.87078515625,",
            " 1.1643828125, -.39176171875, -.81296875, .52959375,",
            " 1.1643828125, 2.017234375, 0, -1.081390625,",
            " 0, 0, 0, 1",
            ");",
            "void main(void) {",
            " gl_FragColor = vec4( texture2D(YTexture, vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;",
            "}"
        ].join("\n");

        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        gl.getProgramParameter(program, gl.LINK_STATUS);

        let vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
        gl.enableVertexAttribArray(vertexPositionAttribute);
        let textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
        gl.enableVertexAttribArray(textureCoordAttribute);

        let verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        let texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        this.y = new Texture(gl);
        this.u = new Texture(gl);
        this.v = new Texture(gl);
        this.y.bind(0, program, "YTexture");
        this.u.bind(1, program, "UTexture");
        this.v.bind(2, program, "VTexture");
    }

    private renderFrame(videoFrame: Uint8Array, width: number, height: number) {
        let uOffset = width * height;
        let vOffset = uOffset / 4;

        let gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.y.fill(width, height, videoFrame.subarray(0, uOffset));
        this.u.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset, uOffset + vOffset));
        this.v.fill(width >> 1, height >> 1, videoFrame.subarray(uOffset + vOffset, videoFrame.length));

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    @listen("store-videoFrame")
    private onFrame(frame: VideoFrame) {
        let { data, meta: { width, height } } = frame;
        this.renderFrame(data, width, height);
    }
}

class Texture {
    private gl: WebGLRenderingContext;
    private texture: WebGLTexture;
    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    bind(n: number, program: WebGLProgram, name: string) {
        let gl = this.gl;
        gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2][n]);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(program, name), n);
    }
    fill(width: number, height: number, data: ArrayBufferView) {
        let gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    };
}