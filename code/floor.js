import { blinnPhongVS, blinnPhongFS } from "./shaders.js";

export class Floor {
    constructor(gl, size = 1000.0, color = [0.2, 0.2, 0.2]) {
        this.gl = gl;
        this.size = size;
        this.color = color;
        this.position = vec3(0, 0, 0);
        this.rotationMatrix = mat4();


        this.material = {
            ambient: [color[0] * 0.8, color[1] * 0.8, color[2] * 0.8],
            diffuse: [color[0] * 0.9, color[1] * 0.9, color[2] * 0.9],
            specular: [0.5, 0.5, 0.5],
            shininess: 32.0
        };

        this.program = this._createProgram(gl, blinnPhongVS, blinnPhongFS);

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

        this.loadTextures();

        this.initBuffers();
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
        
        const floorTexture = new Image();
        floorTexture.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, floorTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        floorTexture.src = 'textures/floor.png';
        
        const floorNormalMap = new Image();
        floorNormalMap.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, floorNormalMap);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        floorNormalMap.src = 'textures/floor_norm.png';
    }

    initBuffers() {
        const gl = this.gl;
        const halfSize = this.size / 2;

        const vertices = [
            -halfSize, 0, -halfSize,  
            halfSize, 0, -halfSize,   
            halfSize, 0, halfSize,    
            -halfSize, 0, halfSize    
        ];

        const normals = [
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        ];

        const texCoords = [
            0, 0,  
            1, 0,  
            1, 1,  
            0, 1  
        ];

        const indices = [
            0, 1, 2,  
            0, 2, 3  
        ];

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.numIndices = indices.length;
    }

    draw(viewProj, cameraPos, lights) {
        const gl = this.gl;
        gl.useProgram(this.program);

        const model = mult(
            translate(this.position[0], this.position[1], this.position[2]),
            this.rotationMatrix
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


        gl.uniform3fv(this.uCameraPosition, flatten(cameraPos));


        const globalAmbientLocation = gl.getUniformLocation(this.program, 'uGlobalAmbient');
        if (globalAmbientLocation) {
            gl.uniform3fv(globalAmbientLocation, flatten(lights.globalAmbient));
        }


        const lightData = lights.getLightData();
        for (let i = 0; i < 4; i++) {
            if (this.uLightPositions[i]) gl.uniform3fv(this.uLightPositions[i], flatten(lightData.positions[i]));
            if (this.uLightDirections[i]) gl.uniform3fv(this.uLightDirections[i], flatten(lightData.directions[i]));
            if (this.uLightSpotAngles[i]) gl.uniform1f(this.uLightSpotAngles[i], lightData.spotAngles[i]);
            if (this.uLightAmbients[i]) gl.uniform3fv(this.uLightAmbients[i], flatten(lightData.ambient[i]));
            if (this.uLightDiffuses[i]) gl.uniform3fv(this.uLightDiffuses[i], flatten(lightData.diffuse[i]));
            if (this.uLightSpeculars[i]) gl.uniform3fv(this.uLightSpeculars[i], flatten(lightData.specular[i]));
            if (this.uLightIntensities[i]) gl.uniform1f(this.uLightIntensities[i], lightData.intensities[i]);
        }


        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.normalMap);
        gl.uniform1i(this.uNormalMap, 1);

        gl.uniform1i(this.uUseNormalMap, true);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aTexCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);


        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
    }
}
