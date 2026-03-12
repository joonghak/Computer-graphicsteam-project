export class Skybox {
    constructor(gl) {
        this.gl = gl;
        this.timeOfDay = 0; // 0: 자정, 0.5: 정오
        this.dayDuration = 300; // 하루 주기 (초 단위)
        this.lastUpdate = performance.now();
        this.isDayMode = true;
        
        // 텍스처 로드
        this.dayTexture = this.loadTexture(gl, './textures/sky_day.png');
        this.nightTexture = this.loadTexture(gl, './textures/sky_night.png');
        
        // 큐브의 정점 데이터 (큐브의 내부를 바라보는 방향으로 정의)
        const vertices = [
            // 앞면
            -1000.0,  1000.0, -1000.0,
            -1000.0, -1000.0, -1000.0,
             1000.0, -1000.0, -1000.0,
             1000.0,  1000.0, -1000.0,
            // 뒷면
            -1000.0,  1000.0,  1000.0,
            -1000.0, -1000.0,  1000.0,
             1000.0, -1000.0,  1000.0,
             1000.0,  1000.0,  1000.0,
        ];

        // 텍스처 좌표 (각 면에 맞게 수정)
        const texCoords = [
            // 앞면
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0,
            // 뒷면
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            // 윗면
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0,
            // 아랫면
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            // 왼쪽면
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            // 오른쪽면
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0
        ];

        // 인덱스 데이터 (삼각형 구성)
        const indices = [
            0, 1, 2,    0, 2, 3,  // 앞면
            4, 5, 6,    4, 6, 7,  // 뒷면
            0, 4, 7,    0, 7, 3,  // 윗면
            1, 5, 6,    1, 6, 2,  // 아랫면
            0, 1, 5,    0, 5, 4,  // 왼쪽면
            3, 2, 6,    3, 6, 7   // 오른쪽면
        ];

        // 버퍼 생성 및 데이터 전송
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // 셰이더 프로그램 생성
        const vertexShader = this.createShader(gl.VERTEX_SHADER, `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            varying vec3 vPosition;
            uniform mat4 uViewProj;
            
            void main() {
                vTexCoord = aTexCoord;
                vPosition = aPosition;
                vec4 pos = uViewProj * vec4(aPosition, 1.0);
                gl_Position = pos.xyww;
            }
        `);

        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec3 vPosition;
            uniform sampler2D uDayTexture;
            uniform sampler2D uNightTexture;
            uniform float uIsDayMode;
            uniform vec3 uGlobalAmbient;
            
            void main() {
                vec4 dayColor = texture2D(uDayTexture, vTexCoord);
                vec4 nightColor = texture2D(uNightTexture, vTexCoord);
                
                // 기본 색상 블렌딩
                vec4 baseColor = mix(nightColor, dayColor, uIsDayMode);
                
                // 높이에 따른 그라데이션 효과
                float height = (vPosition.y + 1000.0) / 2000.0; // 0~1 범위로 정규화
                vec3 gradientColor;
                
                if (uIsDayMode > 0.5) {
                    // 낮 모드: 하늘색 그라데이션
                    gradientColor = mix(
                        vec3(0.8, 0.9, 1.0),  // 하단 색상
                        vec3(0.5, 0.7, 1.0),  // 상단 색상
                        height
                    );
                } else {
                    // 밤 모드: 어두운 파란색 그라데이션
                    gradientColor = mix(
                        vec3(0.1, 0.1, 0.3),  // 하단 색상
                        vec3(0.05, 0.05, 0.2), // 상단 색상
                        height
                    );
                }
                
                // 텍스처와 그라데이션 블렌딩
                vec3 finalColor = mix(baseColor.rgb, gradientColor, 0.3);
                
                // 전역 환경광 적용
                finalColor *= uGlobalAmbient;
                
                // 감마 보정
                finalColor = pow(finalColor, vec3(1.0/2.2));
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `);

        // 셰이더 프로그램 생성 및 링크
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        // 위치 속성 가져오기
        this.positionLocation = gl.getAttribLocation(this.program, 'aPosition');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'aTexCoord');
        this.viewProjLocation = gl.getUniformLocation(this.program, 'uViewProj');
        this.dayTextureLocation = gl.getUniformLocation(this.program, 'uDayTexture');
        this.nightTextureLocation = gl.getUniformLocation(this.program, 'uNightTexture');
        this.isDayModeLocation = gl.getUniformLocation(this.program, 'uIsDayMode');
        this.globalAmbientLocation = gl.getUniformLocation(this.program, 'uGlobalAmbient');
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        return shader;
    }

    loadTexture(gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // 텍스처 파라미터 설정
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // 임시 이미지로 텍스처 초기화
        const tempImage = new Image();
        tempImage.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempImage);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        tempImage.src = url;

        return texture;
    }

    setDayMode(isDay) {
        this.isDayMode = isDay;
    }

    update() {
        const now = performance.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;
        
        // 시간 업데이트
        this.timeOfDay = (this.timeOfDay + deltaTime / this.dayDuration) % 1.0;
    }

    draw(viewProj, lights) {
        const gl = this.gl;
        
        gl.useProgram(this.program);
        
        // 깊이 테스트 비활성화 (항상 배경으로 그려지도록)
        gl.depthFunc(gl.LEQUAL);
        
        // 버퍼 바인딩
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        // 텍스처 바인딩
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.dayTexture);
        gl.uniform1i(this.dayTextureLocation, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.nightTexture);
        gl.uniform1i(this.nightTextureLocation, 1);
        
        // 뷰-투영 행렬 설정
        gl.uniformMatrix4fv(this.viewProjLocation, false, flatten(viewProj));
        
        // 낮/밤 모드 설정
        gl.uniform1f(this.isDayModeLocation, this.isDayMode ? 1.0 : 0.0);
        
        // 전역 환경광 설정
        if (lights && lights.globalAmbient) {
            gl.uniform3fv(this.globalAmbientLocation, flatten(lights.globalAmbient));
        }
        
        // 큐브 그리기
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        
        // 깊이 테스트 복원
        gl.depthFunc(gl.LESS);
    }
} 