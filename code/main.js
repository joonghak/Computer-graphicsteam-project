// main.js - Human 모델 적용
import { Human } from "./Human.js";
import { Floor } from "./floor.js";
import { Ring } from "./ring.js";
import { Camera } from "./Camera.js";
import { createDefaultLights } from "./Light.js";
import { Skybox } from "./Skybox.js";
import "./Common/MV.js";

// 게임 매니저 변수
let gameManager = null;

// 게임 매니저 설정 함수
export function setGameManager(manager) {
    gameManager = manager;
}

// 캔버스 & GL 초기화
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl", { 
  antialias: true,
  alpha: false // 배경 투명도 없애기
});

// 오류 발생하면 알림
if (!gl) {
  alert("WebGL을 초기화할 수 없습니다. 브라우저가 지원하지 않을 수 있습니다.");
}

// 캔버스 크기 설정
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);

gl.clearDepth(1.0); 
gl.depthFunc(gl.LEQUAL); 


let floor;
let rings = []; 
let lights;
let skybox;

const player1 = new Human(gl, [0.8, 0.2, 0.2], [0.6, 0.1, 0.1], 0); 
player1.position = vec3(-10, 10.5, 0);
player1.velocity = vec3(0, 0, 0);
player1.acceleration = vec3(0, 0, 0);
player1.yRotation = 0;

const player2 = new Human(gl, [0.2, 0.2, 0.8], [0.1, 0.1, 0.6], 1); 
player2.position = vec3(10, 10.5, 0);
player2.velocity = vec3(0, 0, 0);
player2.acceleration = vec3(0, 0, 0);
player2.yRotation = Math.PI;

async function initMap() {
    try {
        console.log("맵 초기화 시작");
        floor = new Floor(gl);
        skybox = new Skybox(gl);
        
        lights = createDefaultLights();
        
        const ringPositions = [
            [0, 2, 0],   
            [0, 4, 0],   
            [0, 6, 0],    
            [0, 8, 0],    
            [0, 10, 0],    
        ];
        
        const ringConfig = {
            outerRadius: 50.0,
            innerRadius: 48.0,
            height: 0.5,
            color: [0.9, 0.8, 0.2]  
        };
        
        for (let i = 0; i < ringPositions.length; i++) {
            const pos = ringPositions[i];
            const ring = new Ring(gl, ringConfig.innerRadius, ringConfig.outerRadius, 32, ringConfig.color);
            ring.position = vec3(pos[0], pos[1], pos[2]);
            rings.push(ring);
        }
        
        console.log("맵 초기화 완료");
    } catch (e) {
        console.error("맵 초기화 에러:", e);
        throw e;
    }
}

let splitMarginCoefficient = 0.01;

const mainCamera = new Camera();
const player1SideCamera = new Camera(); 
const player2SideCamera = new Camera(); 
let currentCamera = mainCamera; 
let isSplitScreen = false; 

let sideCameraDistance = 25.0;
let sideCameraAzimuth = 0;
let sideCameraElevation = 0;

function setPlayerSideView(player, camera, distance, azimuthDeg, elevationDeg) {
    const azimuth = azimuthDeg * Math.PI / 180;
    const elevation = elevationDeg * Math.PI / 180;

    const x = distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = distance * Math.sin(elevation) + 2.0; 
    const z = distance * Math.cos(elevation) * Math.cos(azimuth);

    camera.position = vec3(
        player.position[0] + x,
        player.position[1] + y,
        player.position[2] + z
    );
    camera.target = vec3(
        player.position[0],
        player.position[1] + 2.0,
        player.position[2]
    );
}

document.getElementById('player1View').addEventListener('click', () => {
    currentCamera = player1.camera;
});

document.getElementById('player2View').addEventListener('click', () => {
    currentCamera = player2.camera;
});

document.getElementById('mainView').addEventListener('click', () => {
    currentCamera = mainCamera;
});

document.getElementById('player1SideView').addEventListener('click', () => {
    currentCamera = player1SideCamera;
    setPlayerSideView(player1, player1SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
});

document.getElementById('player2SideView').addEventListener('click', () => {
    currentCamera = player2SideCamera;
    setPlayerSideView(player2, player2SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
});

document.getElementById('splitView').addEventListener('click', () => {
    isSplitScreen = !isSplitScreen;
    document.getElementById('splitView').textContent = isSplitScreen ? 'Single view' : 'Split view';
});

window.addEventListener('cameraPositionChanged', (e) => {
    const { x, y, z } = e.detail;
    currentCamera.setPosition(x, y, z);
});

window.addEventListener('mainLightPositionChanged', (e) => {
    const { x, y, z } = e.detail;
    if (lights && lights.positions) {
        lights.positions[0] = vec3(x, y, z);
    }
});

window.addEventListener('lightIntensitiesChanged', (e) => {
    const { main, red, blue, back } = e.detail;
    if (lights && lights.intensities) {
        lights.intensities[0] = main;
        lights.intensities[1] = red;
        lights.intensities[2] = blue;
        lights.intensities[3] = back;
    }
});

window.addEventListener('ambientLightChanged', (e) => {
    const { intensity } = e.detail;
    if (lights && lights.globalAmbient) {
        lights.globalAmbient = vec3(intensity, intensity, intensity);
    }
    // 스카이박스 모드 업데이트
    if (skybox) {
        skybox.setDayMode(intensity > 0.1); // 밝기가 0.1보다 크면 낮 모드
    }
});

const keys = {};
let player1BoxingToggle = false;
let player2BoxingToggle = false;
let player1RunMode = false;
let player2RunMode = false;

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if ((e.key === 'Tab') && !player1BoxingToggle) {
        player1BoxingToggle = true;
        player1.setMode(player1.mode === 'boxing' ? 'normal' : 'boxing');
    }
    
    if (e.key === 'p' && !player2BoxingToggle) {
        player2BoxingToggle = true;
        player2.setMode(player2.mode === 'boxing' ? 'normal' : 'boxing');
    }
    
    if (e.key.toLowerCase() === 'v') {
        player1RunMode = !player1RunMode;
        player1.setMode(player1RunMode ? 'running' : 'normal');
    }
    
    if (e.key.toLowerCase() === 'b') {
        player2RunMode = !player2RunMode;
        player2.setMode(player2RunMode ? 'running' : 'normal');
    }
    
    if (e.key.toLowerCase() === 'c' && !player1.isPunching) {
        player1.startPunch('right');
    }
    if (e.key.toLowerCase() === 'x' && !player1.isPunching) {
        player1.startPunch('left');
    }
    
    if (e.key.toLowerCase() === 'n' && !player2.isPunching) {
        player2.startPunch('right');
    }
    if (e.key.toLowerCase() === 'm' && !player2.isPunching) {
        player2.startPunch('left');
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === 'Tab') {
        player1BoxingToggle = false;
    }
    if (e.key === 'p') {
        player2BoxingToggle = false;
    }
});

let lastTime = performance.now();

let isGameActive = false;

initMap().then(() => {
    isGameActive = true;
    render();
}).catch(error => {
    console.error("초기화 실패:", error);
});
    
function render() {
    if (!isGameActive) return;

    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (gameManager && !gameManager.gameState.isCountdown && !gameManager.gameState.isGameOver) {
        let forward1 = 0, sideways1 = 0;
        let forward2 = 0, sideways2 = 0;
        if (keys['w']) forward1 += 1;
        if (keys['s']) forward1 -= 1;
        if (keys['a']) sideways1 -= 1;
        if (keys['d']) sideways1 += 1;
        if (keys['i']) forward2 += 1;
        if (keys['k']) forward2 -= 1;
        if (keys['j']) sideways2 -= 1;
        if (keys['l']) sideways2 += 1;

        if (keys['q']) player1.yRotation += player1.ROT_SPEED * dt * 2;
        if (keys['e']) player1.yRotation -= player1.ROT_SPEED * dt * 2;
        if (keys['u']) player2.yRotation += player2.ROT_SPEED * dt * 2;
        if (keys['o']) player2.yRotation -= player2.ROT_SPEED * dt * 2;
        if (keys['alt'] && !player1.wasJumping) {
            player1.jump();
            player1.wasJumping = true;
        } else if (!keys['alt']) {
            player1.wasJumping = false;
        }
        if (keys[' '] && !player2.wasJumping) {
            player2.jump();
            player2.wasJumping = true;
        } else if (!keys[' ']) {
            player2.wasJumping = false;
        }

        if (keys['1']) currentCamera.setPreset(1);
        if (keys['2']) currentCamera.setPreset(2);
        if (keys['3']) currentCamera.setPreset(3);
        if (keys['4']) currentCamera.setPreset(4);

        updatePlayerMovements(dt, forward1, sideways1, forward2, sideways2);
    }
    player1.update(dt);
    player2.update(dt);
    if (now - lastCollisionCheck >= 10) {
        player1.checkPunchCollision(player2, gameManager);
        player2.checkPunchCollision(player1, gameManager);
        lastCollisionCheck = now;
    }
   renderScene();


    requestAnimationFrame(render);
}

window.resetPlayerPositions = function() {
    player1.forceMoveTo(vec3(-10, 10.5, 0), vec3(0, -90, 0));
    player2.forceMoveTo(vec3(10, 10.5, 0), vec3(0, 90, 0));
}

function updatePlayerMovements(dt, forward1, sideways1, forward2, sideways2) {
    if (rings && rings.length > 0) {
        const originalPos1 = vec3(player1.position[0], player1.position[1], player1.position[2]);
        player1.moveCharacter(dt, forward1, sideways1);
        if (!isValidPosition(player1.position)) {
            player1.position = originalPos1;
            player1.velocity = vec3(0, player1.velocity[1], 0);
        }
        const originalPos2 = vec3(player2.position[0], player2.position[1], player2.position[2]);
        player2.moveCharacter(dt, forward2, sideways2);
        if (!isValidPosition(player2.position)) {
            player2.position = originalPos2;
            player2.velocity = vec3(0, player2.velocity[1], 0);
        }
    } else {
        player1.moveCharacter(dt, forward1, sideways1);
        player2.moveCharacter(dt, forward2, sideways2);
    }
    if (currentCamera === player1SideCamera) {
        setPlayerSideView(player1, player1SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
    } else if (currentCamera === player2SideCamera) {
        setPlayerSideView(player2, player2SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
    }
}

let lastCollisionCheck = 0;

function renderScene() {
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const proj = perspective(35, canvas.width / canvas.height, 0.1, 2000.0);  // far plane을 2000으로 증가

    if (isSplitScreen) {
        const splitMargin = canvas.width * splitMarginCoefficient;

        gl.viewport(0, 0, canvas.width / 2 - splitMargin, canvas.height);
        gl.scissor(0, 0, canvas.width / 2 - splitMargin, canvas.height);
        gl.enable(gl.SCISSOR_TEST);
        const view1 = player1.camera.getViewMatrix();
        const viewProj1 = mult(proj, view1);
        renderSceneWithView(viewProj1, player1.camera.position);

        gl.viewport(canvas.width / 2 + splitMargin, 0, canvas.width / 2 - splitMargin, canvas.height);
        gl.scissor(canvas.width / 2 + splitMargin, 0, canvas.width / 2 - splitMargin, canvas.height);
        const view2 = player2.camera.getViewMatrix();
        const viewProj2 = mult(proj, view2);
        renderSceneWithView(viewProj2, player2.camera.position);

        gl.viewport(canvas.width / 2 - splitMargin, 0, splitMargin * 2, canvas.height);
        gl.scissor(canvas.width / 2 - splitMargin, 0, splitMargin * 2, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.disable(gl.SCISSOR_TEST);
    } else {
        gl.viewport(0, 0, canvas.width, canvas.height);
        const view = currentCamera.getViewMatrix();
        const viewProj = mult(proj, view);
        renderSceneWithView(viewProj, currentCamera.position);
    }
}

function renderSceneWithView(viewProj, cameraPosition) {
    // 스카이박스를 먼저 그립니다
    skybox.draw(viewProj, lights);
    
    // 그 다음 다른 오브젝트들을 그립니다
    floor.draw(viewProj, cameraPosition, lights);
    
    for (const ring of rings) {
        ring.draw(viewProj, cameraPosition, lights);
    }
    
    player1.draw(viewProj, cameraPosition, lights);
    player2.draw(viewProj, cameraPosition, lights);
}

function isValidPosition(position) {
    if (!rings || rings.length === 0) return true;

    let closestRing = null;
    let minDistance = Infinity;
    
    for (const ring of rings) {
        const ringPos = ring.position;
        const dx = position[0] - ringPos[0];
        const dz = position[2] - ringPos[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestRing = ring;
        }
    }
    
    if (closestRing) {
        const ringPos = closestRing.position;
        const innerRadius = closestRing.innerRadius;
        
        const dx = position[0] - ringPos[0];
        const dz = position[2] - ringPos[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        return distance <= innerRadius;
    }
    
    return true;
}

window.addEventListener('DOMContentLoaded', () => {
    const dist = document.getElementById('side-camera-distance');
    const azim = document.getElementById('side-camera-azimuth');
    const elev = document.getElementById('side-camera-elevation');
    if (dist && azim && elev) {
        dist.addEventListener('input', (e) => {
            sideCameraDistance = parseFloat(e.target.value);
            dist.nextElementSibling.textContent = e.target.value;
            if (currentCamera === player1SideCamera) setPlayerSideView(player1, player1SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
            else if (currentCamera === player2SideCamera) setPlayerSideView(player2, player2SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
        });
        azim.addEventListener('input', (e) => {
            sideCameraAzimuth = parseFloat(e.target.value);
            azim.nextElementSibling.textContent = e.target.value + '°';
            if (currentCamera === player1SideCamera) setPlayerSideView(player1, player1SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
            else if (currentCamera === player2SideCamera) setPlayerSideView(player2, player2SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
        });
        elev.addEventListener('input', (e) => {
            sideCameraElevation = parseFloat(e.target.value);
            elev.nextElementSibling.textContent = e.target.value + '°';
            if (currentCamera === player1SideCamera) setPlayerSideView(player1, player1SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
            else if (currentCamera === player2SideCamera) setPlayerSideView(player2, player2SideCamera, sideCameraDistance, sideCameraAzimuth, sideCameraElevation);
        });
    }
});
