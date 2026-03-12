import { blinnPhongVS, blinnPhongFS } from "./shaders.js";

export class Cube {
  static _nextId = 0;

  constructor(gl, scale = [1, 1, 1], color = [1, 1, 1], texturePath = 'textures/leather.JPG', normalMapPath = 'textures/leather_norm.JPG') {
    this.gl = gl;
    this.id = Cube._nextId++;

    this.position = vec3(0, 0, 0);
    this.velocity = vec3(0, 0, 0);
    this.acceleration = vec3(0, -9.8, 0);
    this.friction = 5.0;
    this.scale = scale;
    this.color = color;
    this.rotationMatrix = mat4();
    this.texturePath = texturePath;
    this.normalMapPath = normalMapPath;

    this.material = {
      ambient: color.map(c => c * 0.5),
      diffuse: color.map(c => c * 0.7),
      specular: [0.3, 0.3, 0.3],
      shininess: 16.0
    };

    this.program = this._createProgram(gl, blinnPhongVS, blinnPhongFS);

    const glGet = name => gl.getUniformLocation(this.program, name);
    const glGetAttrib = name => gl.getAttribLocation(this.program, name);

    this.aPosition = glGetAttrib("aPosition");
    this.aNormal = glGetAttrib("aNormal");
    this.aTexCoord = glGetAttrib("aTexCoord");

    this.uMVP = glGet("uMVP");
    this.uModel = glGet("uModel");
    this.uNormalMatrix = glGet("uNormalMatrix");
    this.uAmbientColor = glGet("uAmbientColor");
    this.uDiffuseColor = glGet("uDiffuseColor");
    this.uSpecularColor = glGet("uSpecularColor");
    this.uShininess = glGet("uShininess");
    this.uCameraPosition = glGet("uCameraPosition");

    this.uLightPositions = [0,1,2,3].map(i => glGet(`uLightPosition${i}`));
    this.uLightDirections = [0,1,2,3].map(i => glGet(`uLightDirection${i}`));
    this.uLightSpotAngles = [0,1,2,3].map(i => glGet(`uLightSpotAngle${i}`));
    this.uLightAmbients = [0,1,2,3].map(i => glGet(`uLightAmbient${i}`));
    this.uLightDiffuses = [0,1,2,3].map(i => glGet(`uLightDiffuse${i}`));
    this.uLightSpeculars = [0,1,2,3].map(i => glGet(`uLightSpecular${i}`));
    this.uLightIntensities = [0,1,2,3].map(i => glGet(`uLightIntensity${i}`));

    this.uTexture = glGet("uTexture");
    this.uNormalMap = glGet("uNormalMap");
    this.uUseNormalMap = glGet("uUseNormalMap");

    this.loadTextures();
    this._initBuffers();
  }

  _createProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };
    const vShader = compile(gl.VERTEX_SHADER, vsSrc);
    const fShader = compile(gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  _initBuffers() {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1,-1, 1,  1,-1, 1,  1, 1, 1, -1, 1, 1,
      -1,-1,-1, -1, 1,-1,  1, 1,-1,  1,-1,-1,
      -1, 1,-1, -1, 1, 1,  1, 1, 1,  1, 1,-1,
      -1,-1,-1,  1,-1,-1,  1,-1, 1, -1,-1, 1,
       1,-1,-1,  1, 1,-1,  1, 1, 1,  1,-1, 1,
      -1,-1,-1, -1,-1, 1, -1, 1, 1, -1, 1,-1
    ]);
    const normals = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0, -1,0,0, -1,0,0, -1,0,0
    ]);
    const texCoords = new Float32Array([
      0,0, 1,0, 1,1, 0,1,
      0,0, 0,1, 1,1, 1,0,
      0,0, 0,1, 1,1, 1,0,
      0,0, 1,0, 1,1, 0,1,
      0,0, 0,1, 1,1, 1,0,
      0,0, 1,0, 1,1, 0,1
    ]);
    const indices = new Uint16Array([
       0,1,2, 0,2,3, 4,5,6, 4,6,7,
       8,9,10,8,10,11, 12,13,14,12,14,15,
       16,17,18,16,18,19, 20,21,22,20,22,23
    ]);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    this.tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  _isColliding(other) {
    if (this.scale.some(s => s < 0.1) || other.scale.some(s => s < 0.1)) return false;
    const dx = Math.abs(this.position[0] - other.position[0]);
    const dy = Math.abs(this.position[1] - other.position[1]);
    const dz = Math.abs(this.position[2] - other.position[2]);
    return dx < (this.scale[0] + other.scale[0]) && dy < (this.scale[1] + other.scale[1]) && dz < (this.scale[2] + other.scale[2]);
  }

  _resolveCollision(other) {
    const tmpV = this.velocity;
    this.velocity = other.velocity;
    other.velocity = tmpV;

    const dx = this.position[0] - other.position[0];
    const dy = this.position[1] - other.position[1];
    const dz = this.position[2] - other.position[2];

    const penX = 2 - Math.abs(dx);
    const penY = 2 - Math.abs(dy);
    const penZ = 2 - Math.abs(dz);
    const minPen = Math.min(penX, penY, penZ);

    if (minPen === penX) {
      const dir = dx > 0 ? 1 : -1;
      this.position[0] += dir * penX / 2;
      other.position[0] -= dir * penX / 2;
    } else if (minPen === penY) {
      const dir = dy > 0 ? 1 : -1;
      this.position[1] += dir * penY / 2;
      other.position[1] -= dir * penY / 2;
    } else {
      const dir = dz > 0 ? 1 : -1;
      this.position[2] += dir * penZ / 2;
      other.position[2] -= dir * penZ / 2;
    }
  }

  update(dt, others = []) {
    if (isNaN(dt) || dt <= 0 || dt > 1) dt = 0.016;

    const isValidVector = v => v && v.length >= 3 && v.every(x => !isNaN(x) && isFinite(x));

    if (!isValidVector(this.position)) this.position = vec3(0, 10, 0);
    if (!isValidVector(this.velocity)) this.velocity = vec3(0, 0, 0);
    if (!isValidVector(this.acceleration)) this.acceleration = vec3(0, -9.8, 0);

    this.velocity = this.velocity.map((v, i) => v + this.acceleration[i] * dt);

    const f = this.friction * dt;
    this.velocity[0] -= this.velocity[0] * f;
    this.velocity[2] -= this.velocity[2] * f;

    this.position = this.position.map((p, i) => p + this.velocity[i] * dt);

    if (this.position[1] < 0) {
      this.position[1] = 0;
      this.velocity[1] = 0;
    }

    const MAX_VEL = 100, MAX_ACC = 100;
    this.velocity = this.velocity.map(v => Math.min(MAX_VEL, Math.max(-MAX_VEL, v)));
    this.acceleration = this.acceleration.map(a => Math.min(MAX_ACC, Math.max(-MAX_ACC, a)));

    if (others.length && this.scale.every(s => s > 0.1)) {
      for (const o of others) {
        if (o === this || !o?.scale || o.scale.some(s => s <= 0.1)) continue;
        if (this._isColliding(o)) this._resolveCollision(o);
      }
    }
  }

  draw(viewProj, cameraPos, lights) {
    const gl = this.gl;
    gl.useProgram(this.program);

    const defaultLightData = {
      positions: [vec3(0, 10, 0), vec3(10, 5, 10), vec3(-10, 5, 10), vec3(0, 5, -10)],
      directions: [vec3(0, -1, 0), vec3(-1, -0.5, -1), vec3(1, -0.5, -1), vec3(0, -0.5, 1)],
      spotAngles: [30, 45, 45, 45],
      ambient: Array(4).fill(vec3(0.2, 0.2, 0.2)),
      diffuse: Array(4).fill(vec3(0.8, 0.8, 0.8)),
      specular: Array(4).fill(vec3(1, 1, 1)),
      intensities: [1, 0.8, 0.8, 0.8],
      globalAmbient: vec3(0.2, 0.2, 0.2)
    };

    const lightData = lights ? lights.getLightData() : defaultLightData;

    const setVecArray = (arr, data) => {
      for (let i = 0; i < 4; i++) {
        if (data[i]?.length >= 3) {
          arr.set(data[i], i * 3);
        }
      }
    };

    const positions = new Float32Array(12);
    const directions = new Float32Array(12);
    const spotAngles = new Float32Array(4);
    const ambient = new Float32Array(12);
    const diffuse = new Float32Array(12);
    const specular = new Float32Array(12);
    const intensities = new Float32Array(4);

    setVecArray(positions, lightData.positions);
    setVecArray(directions, lightData.directions);
    spotAngles.set(lightData.spotAngles);
    setVecArray(ambient, lightData.ambient);
    setVecArray(diffuse, lightData.diffuse);
    setVecArray(specular, lightData.specular);
    intensities.set(lightData.intensities);

    if (this.uLightPositions && this.uLightDirections && this.uLightSpotAngles &&
      this.uLightAmbients && this.uLightDiffuses && this.uLightSpeculars && this.uLightIntensities) {
      for (let i = 0; i < 4; i++) {
        gl.uniform3fv(this.uLightPositions[i], positions.subarray(i*3, i*3+3));
        gl.uniform3fv(this.uLightDirections[i], directions.subarray(i*3, i*3+3));
        gl.uniform1f(this.uLightSpotAngles[i], spotAngles[i]);
        gl.uniform3fv(this.uLightAmbients[i], ambient.subarray(i*3, i*3+3));
        gl.uniform3fv(this.uLightDiffuses[i], diffuse.subarray(i*3, i*3+3));
        gl.uniform3fv(this.uLightSpeculars[i], specular.subarray(i*3, i*3+3));
        gl.uniform1f(this.uLightIntensities[i], intensities[i]);
      }
    }

    const globalAmbientLocation = gl.getUniformLocation(this.program, 'uGlobalAmbient');
    if (globalAmbientLocation) {
      gl.uniform3fv(globalAmbientLocation, flatten(lightData.globalAmbient));
    }

    let model = translate(...this.position);
    if (this.rotationMatrix) model = mult(model, this.rotationMatrix);
    model = mult(model, scalem(...this.scale));
    const mvp = mult(viewProj, model);

    gl.uniformMatrix4fv(this.uMVP, false, flatten(mvp));
    gl.uniformMatrix4fv(this.uModel, false, flatten(model));

    const normalMatrix = mat3(transpose(inverse(model)));
    gl.uniformMatrix3fv(this.uNormalMatrix, false, flatten(normalMatrix));

    gl.uniform3fv(this.uAmbientColor, flatten(this.material.ambient));
    gl.uniform3fv(this.uDiffuseColor, flatten(this.material.diffuse));
    gl.uniform3fv(this.uSpecularColor, flatten(this.material.specular));
    gl.uniform1f(this.uShininess, this.material.shininess);

    if (cameraPos) gl.uniform3fv(this.uCameraPosition, flatten(cameraPos));

    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.uTexture, 0);
    }

    if (this.normalMap) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
      gl.uniform1i(this.uNormalMap, 1);
      gl.uniform1i(this.uUseNormalMap, true);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }

  loadTextures() {
    const gl = this.gl;

    this.texture = gl.createTexture();
    this.normalMap = gl.createTexture();

    const defaultTexture = new Uint8Array([255, 255, 255, 255]);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, defaultTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const defaultNormal = new Uint8Array([128, 128, 255, 255]);
    gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, defaultNormal);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const imgTexture = new Image();
    imgTexture.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgTexture);
      gl.generateMipmap(gl.TEXTURE_2D);
    };
    imgTexture.src = this.texturePath;

    const imgNormalMap = new Image();
    imgNormalMap.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgNormalMap);
      gl.generateMipmap(gl.TEXTURE_2D);
    };
    imgNormalMap.src = this.normalMapPath;
  }
}
