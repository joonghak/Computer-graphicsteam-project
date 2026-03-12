// Cylinder.js
import { blinnPhongVS, blinnPhongFS } from "./shaders.js";
import "./Common/MV.js";

export class Cylinder {
    static _nextId = 0;

    constructor(gl, scale = [1.0, 2.0, 1.0], color = [0.0, 1.0, 0.0], texturePath = 'textures/leather.JPG', normalMapPath = 'textures/leather_norm.JPG', segments = 32) {
        this.gl = gl;
        this.id = Cylinder._nextId++;
        this.radius = scale[0];
        this.height = scale[1];
        this.segments = segments;
        this.color = color;
        this.position = vec3(0, 0, 0);
        this.velocity = vec3(0, 0, 0);
        this.acceleration = vec3(0, -9.8, 0);
        this.friction = 5.0;
        this.rotationMatrix = mat4();
        this.scale = vec3(scale[0], scale[1], scale[2]);
        this.texturePath = texturePath;
        this.normalMapPath = normalMapPath;

        this.material = {
            ambient: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3],
            diffuse: [color[0] * 0.8, color[1] * 0.8, color[2] * 0.8],
            specular: [0.5, 0.5, 0.5],
            shininess: 32.0
        };

        // 셰이더 프로그램 생성
        this.program = this._createProgram(gl, blinnPhongVS, blinnPhongFS);

        // 속성과 유니폼 위치 가져오기
        this.aPosition = gl.getAttribLocation(this.program, "aPosition");
        this.aNormal = gl.getAttribLocation(this.program, "aNormal");
        this.aTexCoord = gl.getAttribLocation(this.program, "aTexCoord");
        this.uMVP = gl.getUniformLocation(this.program, "uMVP");
        this.uModel = gl.getUniformLocation(this.program, "uModel");
        this.uNormalMatrix = gl.getUniformLocation(this.program, "uNormalMatrix");
        this.uAmbientColor = gl.getUniformLocation(this.program, "uAmbientColor");
        this.uDiffuseColor = gl.getUniformLocation(this.program, "uDiffuseColor");
        this.uSpecularColor = gl.getUniformLocation(this.program, "uSpecularColor");
        this.uShininess = gl.getUniformLocation(this.program, "uShininess");
        this.uCameraPosition = gl.getUniformLocation(this.program, "uCameraPosition");

        // 광원 관련 유니폼 변수들
        this.uLightPositions = [
            gl.getUniformLocation(this.program, "uLightPosition0"),
            gl.getUniformLocation(this.program, "uLightPosition1"),
            gl.getUniformLocation(this.program, "uLightPosition2"),
            gl.getUniformLocation(this.program, "uLightPosition3")
        ];
        
        this.uLightDirections = [
            gl.getUniformLocation(this.program, "uLightDirection0"),
            gl.getUniformLocation(this.program, "uLightDirection1"),
            gl.getUniformLocation(this.program, "uLightDirection2"),
            gl.getUniformLocation(this.program, "uLightDirection3")
        ];
        
        this.uLightSpotAngles = [
            gl.getUniformLocation(this.program, "uLightSpotAngle0"),
            gl.getUniformLocation(this.program, "uLightSpotAngle1"),
            gl.getUniformLocation(this.program, "uLightSpotAngle2"),
            gl.getUniformLocation(this.program, "uLightSpotAngle3")
        ];
        
        this.uLightAmbients = [
            gl.getUniformLocation(this.program, "uLightAmbient0"),
            gl.getUniformLocation(this.program, "uLightAmbient1"),
            gl.getUniformLocation(this.program, "uLightAmbient2"),
            gl.getUniformLocation(this.program, "uLightAmbient3")
        ];
        
        this.uLightDiffuses = [
            gl.getUniformLocation(this.program, "uLightDiffuse0"),
            gl.getUniformLocation(this.program, "uLightDiffuse1"),
            gl.getUniformLocation(this.program, "uLightDiffuse2"),
            gl.getUniformLocation(this.program, "uLightDiffuse3")
        ];
        
        this.uLightSpeculars = [
            gl.getUniformLocation(this.program, "uLightSpecular0"),
            gl.getUniformLocation(this.program, "uLightSpecular1"),
            gl.getUniformLocation(this.program, "uLightSpecular2"),
            gl.getUniformLocation(this.program, "uLightSpecular3")
        ];
        
        this.uLightIntensities = [
            gl.getUniformLocation(this.program, "uLightIntensity0"),
            gl.getUniformLocation(this.program, "uLightIntensity1"),
            gl.getUniformLocation(this.program, "uLightIntensity2"),
            gl.getUniformLocation(this.program, "uLightIntensity3")
        ];

        this.uTexture = gl.getUniformLocation(this.program, "uTexture");
        this.uNormalMap = gl.getUniformLocation(this.program, "uNormalMap");
        this.uUseNormalMap = gl.getUniformLocation(this.program, "uUseNormalMap");

        this._initBuffers();

        this.loadTextures();
    }

    _createProgram(gl, vsSrc, fsSrc) {
        const compile = (type, src) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(sh));
                throw new Error("Shader compile failed");
            }
            return sh;
        };
        const vS = compile(gl.VERTEX_SHADER, vsSrc);
        const fS = compile(gl.FRAGMENT_SHADER, fsSrc);
        const prog = gl.createProgram();
        gl.attachShader(prog, vS);
        gl.attachShader(prog, fS);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(prog));
            throw new Error("Program link failed");
        }
        return prog;
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
        
        // 텍스처 로드
        const cylinderTexture = new Image();
        cylinderTexture.crossOrigin = "anonymous";  // CORS 이슈 방지
        cylinderTexture.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cylinderTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        cylinderTexture.onerror = (e) => {
            console.error("Failed to load cylinder texture:", e);
        };
        cylinderTexture.src = this.texturePath;
        
        const cylinderNormalMap = new Image();
        cylinderNormalMap.crossOrigin = "anonymous"; 
        cylinderNormalMap.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cylinderNormalMap);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        cylinderNormalMap.onerror = (e) => {
            console.error("Failed to load cylinder normal map:", e);
        };
        cylinderNormalMap.src = this.normalMapPath;
    }

    _initBuffers() {
        const gl = this.gl;
        
        // 버퍼 생성
        this.positionBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.textureCoordBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        
        // 실린더의 정점, 법선, 텍스처 좌표 생성
        const positions = [];
        const normals = [];
        const textureCoords = [];
        const indices = [];
        
        // 실린더 생성
        for (let lat = 0; lat <= this.segments; lat++) {
            const theta = lat * 2 * Math.PI / this.segments;
            const x = Math.cos(theta);
            const z = Math.sin(theta);
            
            // 상단 원
            positions.push(x, 0.5, z);
            normals.push(0, 1, 0);
            textureCoords.push(lat / this.segments, 1);
            
            // 하단 원
            positions.push(x, -0.5, z);
            normals.push(0, -1, 0);
            textureCoords.push(lat / this.segments, 0);
            
            positions.push(x, 0.5, z);
            normals.push(x, 0, z);
            textureCoords.push(lat / this.segments, 1);
            
            positions.push(x, -0.5, z);
            normals.push(x, 0, z);
            textureCoords.push(lat / this.segments, 0);
        }
        
        for (let i = 0; i < this.segments; i++) {
            const base = i * 4;
            
            indices.push(base, base + 4, base + 2);
            
            indices.push(base + 1, base + 3, base + 5);
            
            indices.push(base + 2, base + 3, base + 6);
            indices.push(base + 3, base + 7, base + 6);
        }

        const centerIndex = positions.length / 3;
        positions.push(0, 0.5, 0); 
        normals.push(0, 1, 0);  
        textureCoords.push(0.5, 0.5);

        for (let i = 0; i <= this.segments; i++) {
            const theta = (i / this.segments) * 2 * Math.PI;
            const x = Math.cos(theta);
            const z = Math.sin(theta);
            positions.push(x, 0.5, z);
            normals.push(0, 1, 0);
            textureCoords.push((x + 1) / 2, (z + 1) / 2);
        }

        for (let i = 0; i < this.segments; i++) {
            indices.push(centerIndex, centerIndex + i + 1, centerIndex + i + 2);
        }
        

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        this.numIndices = indices.length;
    }

    draw(viewProj, cameraPos, lights) {
        const gl = this.gl;
        gl.useProgram(this.program);


        const model = mult(
            translate(this.position[0], this.position[1], this.position[2]),
            mult(this.rotationMatrix, scalem(this.scale[0], this.scale[1], this.scale[2]))
        );
        const mvp = mult(viewProj, model);


        const normalMatrix = mat3(transpose(inverse(model)));


        gl.uniformMatrix4fv(this.uMVP, false, flatten(mvp));
        gl.uniformMatrix4fv(this.uModel, false, flatten(model));
        gl.uniformMatrix3fv(this.uNormalMatrix, false, flatten(normalMatrix));


        gl.uniform3fv(this.uAmbientColor, flatten(this.material.ambient));
        gl.uniform3fv(this.uDiffuseColor, flatten(this.material.diffuse));
        gl.uniform3fv(this.uSpecularColor, flatten(this.material.specular));
        gl.uniform1f(this.uShininess, this.material.shininess);


        if (cameraPos) {
            gl.uniform3fv(this.uCameraPosition, flatten(cameraPos));
        }


        const globalAmbientLocation = gl.getUniformLocation(this.program, 'uGlobalAmbient');
        if (globalAmbientLocation) {
            gl.uniform3fv(globalAmbientLocation, flatten(lights.globalAmbient));
        }


        const lightData = lights ? lights.getLightData() : {
            positions: [
                vec3(0, 10, 0),    
                vec3(10, 5, 10),   
                vec3(-10, 5, 10),  
                vec3(0, 5, -10)    
            ],
            directions: [
                vec3(0, -1, 0),    
                vec3(-1, -0.5, -1),
                vec3(1, -0.5, -1), 
                vec3(0, -0.5, 1)   
            ],
            spotAngles: [30, 45, 45, 45],
            ambient: [
                vec3(0.3, 0.3, 0.3),  
                vec3(0.2, 0.2, 0.2),
                vec3(0.2, 0.2, 0.2),
                vec3(0.2, 0.2, 0.2)
            ],
            diffuse: [
                vec3(1.0, 1.0, 1.0), 
                vec3(0.8, 0.8, 0.8),
                vec3(0.8, 0.8, 0.8),
                vec3(0.8, 0.8, 0.8)
            ],
            specular: [
                vec3(1.0, 1.0, 1.0), 
                vec3(1.0, 1.0, 1.0),
                vec3(1.0, 1.0, 1.0),
                vec3(1.0, 1.0, 1.0)
            ],
            intensities: [1.0, 0.8, 0.8, 0.8]
        };

        for (let i = 0; i < 4; i++) {
            const positionLoc = this.uLightPositions[i];
            const directionLoc = this.uLightDirections[i];
            const spotAngleLoc = this.uLightSpotAngles[i];
            const ambientLoc = this.uLightAmbients[i];
            const diffuseLoc = this.uLightDiffuses[i];
            const specularLoc = this.uLightSpeculars[i];
            const intensityLoc = this.uLightIntensities[i];

            if (positionLoc) gl.uniform3fv(positionLoc, flatten(lightData.positions[i]));
            if (directionLoc) gl.uniform3fv(directionLoc, flatten(lightData.directions[i]));
            if (spotAngleLoc) gl.uniform1f(spotAngleLoc, lightData.spotAngles[i]);
            if (ambientLoc) gl.uniform3fv(ambientLoc, flatten(lightData.ambient[i]));
            if (diffuseLoc) gl.uniform3fv(diffuseLoc, flatten(lightData.diffuse[i]));
            if (specularLoc) gl.uniform3fv(specularLoc, flatten(lightData.specular[i]));
            if (intensityLoc) gl.uniform1f(intensityLoc, lightData.intensities[i]);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
        gl.uniform1i(this.uNormalMap, 1);

        gl.uniform1i(this.uUseNormalMap, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aTexCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(this.aPosition);
        gl.disableVertexAttribArray(this.aNormal);
        gl.disableVertexAttribArray(this.aTexCoord);
    }
} 