import { Cube } from './cube.js';
import './Common/MV.js';
import { Sphere } from './Sphere.js';
import { Cylinder } from './Cylinder.js';
import { Camera } from './Camera.js';

export class HumanPart {
    constructor(gl, offset, children = [], scale = [1,1,1], color = [1.0, 0.0, 0.0], MeshClass = Cube, texturePath = 'textures/leather.JPG', normalMapPath = 'textures/leather_norm.JPG') {
        this.mesh = new MeshClass(gl, scale, color, texturePath, normalMapPath);
        this.offset = offset;
        this.children = children;
        this.rotation = [0, 0, 0];
        this.targetRotation = [0, 0, 0];
        this.localRotationMatrix = mat4();
        this.name = "part_" + Math.floor(Math.random() * 1000);
        this.isJoint = false;
        this.lightPositions = [[0, 10, 0]];
        this.lightDirections = [[0, -1, 0]];
        this.lightSpotAngles = [45];
        this.lightAmbient = [0.2, 0.2, 0.2];
        this.lightDiffuse = [0.8, 0.8, 0.8];
        this.lightSpecular = [1.0, 1.0, 1.0];
        this.lightIntensities = [1.0];
    }

    setRotation(angle, axis) {
        if (axis >= 0 && axis <= 2) {
            this.rotation[axis] = angle;
            this.updateLocalRotationMatrix();
        }
    }
    
    setTargetRotation(angle, axis) {
        if (axis >= 0 && axis <= 2) {
            this.targetRotation[axis] = angle;
        }
    }

    setScaleAxis(value, axis) {
        if (this.mesh && axis >= 0 && axis <= 2) {
            this.mesh.scale[axis] = value;
        }
    }
    
    setScale(scale) {
        if (this.mesh) {
            this.mesh.scale = scale;
        }
    }
    
    updateLocalRotationMatrix() {
        const rotX = rotate(this.rotation[0], [1, 0, 0]);
        const rotY = rotate(this.rotation[1], [0, 1, 0]);
        const rotZ = rotate(this.rotation[2], [0, 0, 1]);
        this.localRotationMatrix = mult(mult(rotX, rotY), rotZ);
    }

    updateLocalRotationMatrixLerp() {
        for (let i = 0; i < 3; ++i) {
            this.rotation[i] += (this.targetRotation[i] - this.rotation[i]) * 0.5;
        }
        this.updateLocalRotationMatrix();
    }

    update(dt, parentMatrix, applyPhysics = false) {
        try {
            if (!parentMatrix || !Array.isArray(parentMatrix)) {
                parentMatrix = mat4();
            }
            const translationMatrix = translate(...this.offset);
            this.updateLocalRotationMatrixLerp();
            let offsetMatrix = mult(translationMatrix, this.localRotationMatrix);
            let localMatrix = mult(parentMatrix, offsetMatrix);
            

            const pos = [localMatrix[0][3], localMatrix[1][3], localMatrix[2][3]];
            if (!isNaN(pos[0]) && !isNaN(pos[1]) && !isNaN(pos[2])) {
                if (this.mesh) {
                    this.mesh.position = vec3(pos[0], pos[1], pos[2]);
                    const rotOnly = mat4(
                        [localMatrix[0][0], localMatrix[0][1], localMatrix[0][2], 0],
                        [localMatrix[1][0], localMatrix[1][1], localMatrix[1][2], 0],
                        [localMatrix[2][0], localMatrix[2][1], localMatrix[2][2], 0],
                        [0, 0, 0, 1]
                    );
                    this.mesh.rotationMatrix = rotOnly;
                }
            }
        
            for (const child of this.children) {
                if (child) {
                    child.update(dt, localMatrix, false);
                }
            }
        } catch (e) {
            console.error("Update error in part:", this.name, e);
        }
    }

    draw(viewProj, cameraPos, lights) {
        try {
            if (this.mesh) {
                this.mesh.draw(viewProj, cameraPos, lights);
            }
            if (this.children) {
                for (const child of this.children) {
                    child.draw(viewProj, cameraPos, lights);
                }
            }
        } catch (error) {
            console.error(`Draw error in part: ${this.name}`, error);
        }
    }

    getWorldPosition(parentMatrix = mat4()) {
        const translationMatrix = translate(...this.offset);
        this.updateLocalRotationMatrix();
        let offsetMatrix = mult(translationMatrix, this.localRotationMatrix);
        let localMatrix = mult(parentMatrix, offsetMatrix);
        return [
            localMatrix[0][3],
            localMatrix[1][3],
            localMatrix[2][3]
        ];
    }

    getWorldMatrix(parentMatrix = mat4()) {
        const translationMatrix = translate(...this.offset);
        this.updateLocalRotationMatrix();
        let offsetMatrix = mult(translationMatrix, this.localRotationMatrix);
        return mult(parentMatrix, offsetMatrix);
    }
}

const MOVE_SPEED = 14.0;
const JUMP_FORCE = 15.0;
const GRAVITY = 30.0;
const MAX_JUMP_HEIGHT = 6.0;
const GROUND_Y = 0;
const ROT_SPEED = 120.0;

export class Human {
    constructor(gl, bodyColor = [0.2, 0.4, 0.8], hatColor = [0.5, 0.2, 0.7], playerIndex = 0) {
        this.rootRotation = mat4();
        this.playerIndex = playerIndex;
        this.ROT_SPEED = 90.0;
        this.isPunching = false;
        this.punchTime = 0;
        this.punchingHand = null;
        const headColor = [0.9, 0.75, 0.6];
        const legColor = [0.3, 0.3, 0.3];
        const handColor = [0.9, 0.75, 0.6];
        const footColor = [0.2, 0.2, 0.2];
        const jointColor = [0.9, 0.75, 0.6];
        const neckColor = [0.9, 0.75, 0.6];
        const eyeColor = [0.0, 0.0, 0.0];
        const bodyTexture = 'textures/fabric.png';
        const bodyNormalMap = 'textures/fabric_norm.png';
        const headTexture = 'textures/skin.jpg';
        const headNormalMap = 'textures/skin_norm.png';
        const handTexture = 'textures/skin.jpg';
        const handNormalMap = 'textures/skin_norm.png';
        const legTexture = 'textures/fabric.png';
        const legNormalMap = 'textures/fabric_norm.png';
        const footTexture = 'textures/fabric.png';
        const footNormalMap = 'textures/fabric_norm.png';
        const hatTexture = 'textures/fabric.png';
        const hatNormalMap = 'textures/fabric_norm.png';

        this.root = new HumanPart(gl, vec3(0, 0, 0), [], [1.6, 2.3, 1], bodyColor, Cube, bodyTexture, bodyNormalMap);
        this.root.name = "chest";

        const neckBase = new HumanPart(gl, vec3(0, 2, 0), [], [0.4, 1, 0.4], neckColor, Cylinder, headTexture, headNormalMap);
        neckBase.name = "neckBase";
        neckBase.isJoint = true;

        const neckMiddle = new HumanPart(gl, vec3(0, 0.8, 0), [], [0.35, 0.7, 0.35], neckColor, Cylinder, headTexture, headNormalMap);
        neckMiddle.name = "neckMiddle";
        neckMiddle.isJoint = true;

        const neckTop = new HumanPart(gl, vec3(0, 0.7, 0), [], [0.3, 0.5, 0.3], neckColor, Cylinder, headTexture, headNormalMap);
        neckTop.name = "neckTop";
        neckTop.isJoint = true;

        const head = new HumanPart(gl, vec3(0, 0.6, 0), [], [1.2, 1.5, 1.2], headColor, Sphere, headTexture, headNormalMap);
        head.name = "head";

        const hatBrim = new HumanPart(gl, vec3(0, 1.2, 0), [], [2, 0.2, 2], hatColor, Sphere, hatTexture, hatNormalMap);
        hatBrim.name = "hatBrim";

        const hatCrown = new HumanPart(gl, vec3(0, 2.0, 0), [], [1.25, 2, 1.25], hatColor, Cylinder, hatTexture, hatNormalMap);
        hatCrown.name = "hatCrown";

        head.children.push(hatBrim);
        head.children.push(hatCrown);

        neckTop.children.push(head);
        neckMiddle.children.push(neckTop);
        neckBase.children.push(neckMiddle);

        this.root.children.push(neckBase);

        const leftEye = new HumanPart(gl, vec3(-0.6, 0.4, -1.0), [], [0.2, 0.1, 0.1], eyeColor, Cube);
        leftEye.name = "leftEye";
        const rightEye = new HumanPart(gl, vec3(0.6, 0.4, -1.0), [], [0.2, 0.1, 0.1], eyeColor, Cube);
        rightEye.name = "rightEye";
        head.children.push(leftEye);
        head.children.push(rightEye);

        const leftShoulder = new HumanPart(gl, vec3(1.3, 1.6, 0), [], [0.3, 0.3, 0.3], jointColor, Sphere, headTexture, headNormalMap);
        leftShoulder.name = "leftShoulder";
        leftShoulder.isJoint = true;

        const leftUpperArm = new HumanPart(gl, vec3(0.8, -0.8, 0), [], [0.5, 1.3, 0.5], headColor, Cube, handTexture, handNormalMap);
        leftUpperArm.name = "leftUpperArm";

        const leftElbow = new HumanPart(gl, vec3(0, -1.1, 0), [], [0.3, 0.3, 0.3], jointColor, Sphere, headTexture, headNormalMap);
        leftElbow.name = "leftElbow";
        leftElbow.isJoint = true;

        const leftLowerArm = new HumanPart(gl, vec3(0, -1.2, 0), [], [0.45, 1.2, 0.45], headColor, Cube, handTexture, handNormalMap);
        leftLowerArm.name = "leftLowerArm";

        const leftHand = new HumanPart(gl, vec3(0, -1.6, 0), [], [0.5, 0.5, 0.5], handColor, Sphere, handTexture, handNormalMap);
        leftHand.name = "leftHand";

        leftLowerArm.children.push(leftHand);
        leftElbow.children.push(leftLowerArm);
        leftUpperArm.children.push(leftElbow);
        leftShoulder.children.push(leftUpperArm);

        const rightShoulder = new HumanPart(gl, vec3(-1.3, 1.6, 0), [], [0.3, 0.3, 0.3], jointColor, Sphere, headTexture, headNormalMap);
        rightShoulder.name = "rightShoulder";
        rightShoulder.isJoint = true;

        const rightUpperArm = new HumanPart(gl, vec3(-0.8, -0.8, 0), [], [0.5, 1.3, 0.5], headColor, Cube, handTexture, handNormalMap);
        rightUpperArm.name = "rightUpperArm";

        const rightElbow = new HumanPart(gl, vec3(0, -1.6, 0), [], [0.25, 0.25, 0.25], jointColor, Sphere, headTexture, headNormalMap);
        rightElbow.name = "rightElbow";
        rightElbow.isJoint = true;

        const rightLowerArm = new HumanPart(gl, vec3(0, -0.9, 0), [], [0.45, 1.2, 0.45], headColor, Cube, handTexture, handNormalMap);
        rightLowerArm.name = "rightLowerArm";

        const rightHand = new HumanPart(gl, vec3(0, -1.5, 0), [], [0.5, 0.5, 0.5], handColor, Sphere, handTexture, handNormalMap);
        rightHand.name = "rightHand";

        rightLowerArm.children.push(rightHand);
        rightElbow.children.push(rightLowerArm);
        rightUpperArm.children.push(rightElbow);
        rightShoulder.children.push(rightUpperArm);

        const hips = new HumanPart(gl, vec3(0, -2.2, 0), [], [1.4, 0.5, 0.8], legColor, Cube, legTexture, legNormalMap);
        hips.name = "hips";

        const leftHip = new HumanPart(gl, vec3(1.0, -0.3, 0), [], [0, 0, 0], jointColor, Sphere, headTexture, headNormalMap);
        leftHip.name = "leftHip";
        leftHip.isJoint = true;

        const leftUpperLeg = new HumanPart(gl, vec3(0, -2.0, 0), [], [0.9, 1.8, 0.9], legColor, Cube, legTexture, legNormalMap);
        leftUpperLeg.name = "leftUpperLeg";

        const leftKnee = new HumanPart(gl, vec3(0, -1.6, 0), [], [0, 0, 0], jointColor, Sphere, headTexture, headNormalMap);
        leftKnee.name = "leftKnee";
        leftKnee.isJoint = true;

        const leftLowerLeg = new HumanPart(gl, vec3(0, -2.0, 0), [], [0.8, 1.8, 0.8], legColor, Cube, legTexture, legNormalMap);
        leftLowerLeg.name = "leftLowerLeg";

        const leftFoot = new HumanPart(gl, vec3(0, -2.0, -0.4), [], [0.6, 0.3, 1.0], footColor, Cube, footTexture, footNormalMap);
        leftFoot.name = "leftFoot";

        leftLowerLeg.children.push(leftFoot);
        leftKnee.children.push(leftLowerLeg);
        leftUpperLeg.children.push(leftKnee);
        leftHip.children.push(leftUpperLeg);

        const rightHip = new HumanPart(gl, vec3(-1.0, -0.3, 0), [], [0, 0, 0], jointColor, Sphere, headTexture, headNormalMap);
        rightHip.name = "rightHip";
        rightHip.isJoint = true;

        const rightUpperLeg = new HumanPart(gl, vec3(0, -2.0, 0), [], [0.9, 1.8, 0.9], legColor, Cube, legTexture, legNormalMap);
        rightUpperLeg.name = "rightUpperLeg";

        const rightKnee = new HumanPart(gl, vec3(0, -1.6, 0), [], [0, 0, 0], jointColor, Sphere, headTexture, headNormalMap);
        rightKnee.name = "rightKnee";
        rightKnee.isJoint = true;

        const rightLowerLeg = new HumanPart(gl, vec3(0, -2.0, 0), [], [0.8, 1.8, 0.8], legColor, Cube, legTexture, legNormalMap);
        rightLowerLeg.name = "rightLowerLeg";

        const rightFoot = new HumanPart(gl, vec3(0, -2.1, -0.4), [], [0.6, 0.3, 1.0], footColor, Cube, footTexture, footNormalMap);
        rightFoot.name = "rightFoot";

        rightLowerLeg.children.push(rightFoot);
        rightKnee.children.push(rightLowerLeg);
        rightUpperLeg.children.push(rightKnee);
        rightHip.children.push(rightUpperLeg);

        hips.children.push(leftHip);
        hips.children.push(rightHip);

        this.root.children.push(leftShoulder);
        this.root.children.push(rightShoulder);
        this.root.children.push(hips);

        this.neckBase = neckBase;
        this.neckMiddle = neckMiddle;
        this.neckTop = neckTop;
        this.leftShoulder = leftShoulder;
        this.rightShoulder = rightShoulder;
        this.leftUpperArm = leftUpperArm;
        this.rightUpperArm = rightUpperArm;
        this.leftElbow = leftElbow;
        this.rightElbow = rightElbow;
        this.leftLowerArm = leftLowerArm;
        this.rightLowerArm = rightLowerArm;
        this.leftHip = leftHip;
        this.rightHip = rightHip;
        this.leftKnee = leftKnee;
        this.rightKnee = rightKnee;

        this.position = vec3(0, 5, 0);
        this.velocity = vec3(0, 0, 0);
        this.yRotation = 0;
        this.isJumping = false;
        this.isOnGround = false;
        this.jumpStartHeight = 0;
        this.walkingAnimation = false;
        this.animationTime = 0;
        this.wasJumping = false;
        this.wasWalking = false;
        this.lastPoseType = "standing";
        this.runningAnimation = false;
        this.root.mesh.position = vec3(this.position[0], this.position[1], this.position[2]);
        this.rootRotation = rotate(this.yRotation, [0, 1, 0]);
        this.mode = "normal";
        this.camera = new Camera();
        this.isBeingKnockedBack = false;
        this.knockbackVelocity = vec3(0, 0, 0);
        this.knockbackDuration = 0;
        this.knockbackTime = 0;
        this.knockbackDirection = vec3(0, 0, 0);
    }
    
    setMode(mode) {
        const oldMode = this.mode;
        this.mode = mode;
        if (mode === "normal" || mode === "boxing") {
            this.setDefaultPose();
            this.lastPoseType = "standing";
        }
    }

    setDefaultPose() {
        if (this.mode === "boxing") {
            this.neckBase.rotation = [5, 0, 0];
            this.neckBase.targetRotation = [5, 0, 0];
            this.neckMiddle.rotation = [5, 0, 0];
            this.neckMiddle.targetRotation = [5, 0, 0];
            this.neckTop.rotation = [5, 0, 0];
            this.neckTop.targetRotation = [5, 0, 0];

            this.leftShoulder.setTargetRotation(70, 0);
            this.leftShoulder.setTargetRotation(-20, 2);
            this.rightShoulder.setTargetRotation(70, 0);
            this.rightShoulder.setTargetRotation(20, 2);
            this.leftElbow.setTargetRotation(110, 0);
            this.rightElbow.setTargetRotation(110, 0);
            this.leftHip.setTargetRotation(40, 0);
            this.rightHip.setTargetRotation(40, 0);
            this.leftKnee.setTargetRotation(-20, 0);
            this.rightKnee.setTargetRotation(-20, 0);
            return;
        }
        this.root.mesh.scale = [1.6, 2.3, 1];
        this.root.rotation = [0, 0, 0];
        this.root.targetRotation = [0, 0, 0];
        
        this.neckBase.offset = [0, 2, 0];
        this.neckBase.mesh.scale = [0.4, 1, 0.4];
        this.neckBase.rotation = [0, 0, 0];
        this.neckBase.targetRotation = [0, 0, 0];

        this.neckMiddle.offset = [0, 0.8, 0];
        this.neckMiddle.mesh.scale = [0.35, 0.7, 0.35];
        this.neckMiddle.rotation = [0, 0, 0];
        this.neckMiddle.targetRotation = [0, 0, 0];

        this.neckTop.offset = [0, 0.7, 0];
        this.neckTop.mesh.scale = [0.3, 0.5, 0.3];
        this.neckTop.rotation = [0, 0, 0];
        this.neckTop.targetRotation = [0, 0, 0];

        this.leftShoulder.offset = [1.3, 1.6, 0];
        this.leftShoulder.rotation = [0, 0, 0];
        this.leftShoulder.targetRotation = [0, 0, 0];
        this.rightShoulder.offset = [-1.3, 1.6, 0];
        this.rightShoulder.rotation = [0, 0, 0];
        this.rightShoulder.targetRotation = [0, 0, 0];

        this.leftUpperArm.offset = [0.8, -0.8, 0];
        this.leftUpperArm.rotation = [0, 0, 0];
        this.leftUpperArm.targetRotation = [0, 0, 0];
        this.leftUpperArm.setScaleAxis(1.3, 1);
        this.rightUpperArm.offset = [-0.8, -0.8, 0];
        this.rightUpperArm.rotation = [0, 0, 0];
        this.rightUpperArm.targetRotation = [0, 0, 0];
        this.rightUpperArm.setScaleAxis(1.3, 1);

        this.leftElbow.offset = [0, -1.2, 0];
        this.leftElbow.rotation = [0, 0, 0];
        this.leftElbow.targetRotation = [0, 0, 0];
        this.rightElbow.offset = [0, -1.6, 0];
        this.rightElbow.rotation = [0, 0, 0];
        this.rightElbow.targetRotation = [0, 0, 0];

        this.leftLowerArm.offset = [0, -1.2, 0];
        this.leftLowerArm.rotation = [0, 0, 0];
        this.leftLowerArm.targetRotation = [0, 0, 0];
        this.rightLowerArm.offset = [0, -0.9, 0];
        this.rightLowerArm.rotation = [0, 0, 0];
        this.rightLowerArm.targetRotation = [0, 0, 0];

        this.leftHip.offset = [1.0, -0.3, 0];
        this.leftHip.rotation = [0, 0, 0];
        this.leftHip.targetRotation = [0, 0, 0];
        this.rightHip.offset = [-1.0, -0.3, 0];
        this.rightHip.rotation = [0, 0, 0];
        this.rightHip.targetRotation = [0, 0, 0];

        this.leftKnee.offset = [0, -1.6, 0];
        this.leftKnee.rotation = [0, 0, 0];
        this.leftKnee.targetRotation = [0, 0, 0];
        this.rightKnee.offset = [0, -1.6, 0];
        this.rightKnee.rotation = [0, 0, 0];
        this.rightKnee.targetRotation = [0, 0, 0];
    }
    
    setWalkingPose(time) {
        if (this.mode === "boxing") {
            this.setBoxingWalkingPose(time);
            return;
        }

        const speed = 4;
        const armSwing = Math.sin(time * speed + 0.2) * 50;
        this.leftShoulder.setTargetRotation(armSwing, 0);
        this.rightShoulder.setTargetRotation(-armSwing, 0);
        this.leftElbow.setTargetRotation(10 + Math.abs(armSwing) * 0.3, 0);
        this.rightElbow.setTargetRotation(10 + Math.abs(armSwing) * 0.3, 0);
        
        const legSwing = Math.sin(time * speed) * 40;
        this.leftHip.setTargetRotation(-legSwing, 0);
        this.rightHip.setTargetRotation(legSwing, 0);
        this.leftKnee.setTargetRotation(-Math.max(0, -legSwing * 0.3), 0);
        this.rightKnee.setTargetRotation(-Math.max(0, legSwing * 0.3), 0);
    }

    setBoxingWalkingPose(time) {
        const speed = 5;
        const legSwing = Math.sin(time * speed) * 18;
        this.leftShoulder.setTargetRotation(90, 0);
        this.rightShoulder.setTargetRotation(90, 0);
        this.leftElbow.setTargetRotation(85, 0);
        this.rightElbow.setTargetRotation(85, 0);
        this.leftHip.setTargetRotation(40 - legSwing, 0);
        this.rightHip.setTargetRotation(40 + legSwing, 0);
        this.leftKnee.setTargetRotation(-20 + Math.abs(legSwing * 0.5), 0);
        this.rightKnee.setTargetRotation(-20 + Math.abs(legSwing * 0.5), 0);
    }

    setRunningPose(time) {
        const speed = 8;
        const verticalBounce = Math.abs(Math.sin(time * speed)) * 0.3;
        this.root.offset[1] = 0.3 + verticalBounce;
        const torsoSwing = Math.sin(time * speed) * 5;
        this.root.rotation = [0, 0, torsoSwing];
        this.root.targetRotation = [0, 0, torsoSwing];
        const armSwing = Math.sin(time * speed + Math.PI) * 80;
        this.leftShoulder.setTargetRotation(-armSwing, 0);
        this.rightShoulder.setTargetRotation(armSwing, 0);
        this.leftElbow.setTargetRotation(20 + Math.abs(armSwing) * 0.3, 0);
        this.rightElbow.setTargetRotation(20 + Math.abs(armSwing) * 0.3, 0);
        const legSwing = Math.sin(time * speed) * 60;
        this.leftHip.setTargetRotation(-legSwing * 1.5, 0);
        this.rightHip.setTargetRotation(legSwing * 1.5, 0);
        this.leftKnee.setTargetRotation(Math.min(0, legSwing * 0.7), 0);
        this.rightKnee.setTargetRotation(Math.min(0, -legSwing * 0.7), 0);
    }

    setJumpPose() {
        if(this.mode === "running") {
            this.setRunningJumpPose();
            return;
        }
        this.setNormalJumpPose();
    }

    setRunningJumpPose() {
        this.leftShoulder.setTargetRotation(85, 0);
        this.rightShoulder.setTargetRotation(85, 0);
        this.leftElbow.setTargetRotation(10, 0);
        this.rightElbow.setTargetRotation(10, 0);
        this.leftHip.setTargetRotation(75, 0);
        this.rightHip.setTargetRotation(75, 0);
        this.leftKnee.setTargetRotation(-5, 0);
        this.rightKnee.setTargetRotation(-5, 0);
    }

    setNormalJumpPose() {
        this.leftShoulder.setTargetRotation(80, 0);
        this.rightShoulder.setTargetRotation(80, 0);
        this.leftElbow.setTargetRotation(90, 0);
        this.rightElbow.setTargetRotation(90, 0);
        this.leftHip.setTargetRotation(55, 0);
        this.rightHip.setTargetRotation(55, 0);
        this.leftKnee.setTargetRotation(-80, 0);
        this.rightKnee.setTargetRotation(-80, 0);
    }

    setStandingPose(time) {
        if (this.mode === "boxing") {
            this.setBoxingStandingPose(time);
            return;
        }
        this.setNormalStandingPose(time);
    }

    setBoxingStandingPose(time) {
        const speed = 5;
        const step = Math.sin(time * speed) * 0.15;
        this.leftShoulder.setTargetRotation(90, 0);
        this.rightShoulder.setTargetRotation(90, 0);
        this.leftElbow.setTargetRotation(90, 0);
        this.rightElbow.setTargetRotation(90, 0);
        this.leftHip.setTargetRotation(40, 0);
        this.rightHip.setTargetRotation(40, 0);
        this.leftKnee.setTargetRotation(-20, 0);
        this.rightKnee.setTargetRotation(-20, 0);
        this.neckBase.rotation = [10, 0, 0];
        this.neckBase.targetRotation = [10, 0, 0];
        this.neckMiddle.rotation = [5, 0, 0];
        this.neckMiddle.targetRotation = [5, 0, 0];
        this.neckTop.rotation = [0, 0, 0];
        this.neckTop.targetRotation = [0, 0, 0];
    }

    setNormalStandingPose(time) {
        const breath = Math.sin(time) * 0.15;
        const scale = 1 + Math.abs(breath) * 0.4;
        this.root.mesh.scale = [1.6 * scale, 2.3 * scale, 1 * scale];
        this.neckBase.offset[1] = 2 + Math.abs(breath) * 0.3;
        const neckAngle = Math.sin(time) * 10;
        const neckAngle2 = Math.sin(time*2) * 7;
        const neckAngle3 = Math.sin(time*3) * 1;
        this.neckBase.setTargetRotation(neckAngle * 0.3, 2);
        this.neckMiddle.setTargetRotation(neckAngle * 0.2, 2);
        this.neckTop.setTargetRotation(neckAngle * 0.1, 2);
        this.neckBase.setTargetRotation(neckAngle2 * 0.3, 0);
        this.neckMiddle.setTargetRotation(neckAngle2 * 0.2, 0);
        this.neckTop.setTargetRotation(neckAngle2 * 0.1, 0);
        this.neckBase.setTargetRotation(neckAngle3 * 0.3, 1);
        this.neckMiddle.setTargetRotation(neckAngle3 * 0.2, 1);
        this.neckTop.setTargetRotation(neckAngle3 * 0.1, 1);
        const shoulderAngle = Math.sin(time) * 8;
        this.leftShoulder.setTargetRotation(Math.abs(shoulderAngle), 2);
        this.rightShoulder.setTargetRotation(-Math.abs(shoulderAngle), 2);
    }

    setPunchReadyPose() {
        this.leftHip.setTargetRotation(15, 0);
        this.rightHip.setTargetRotation(-15, 0);
        this.leftKnee.setTargetRotation(20, 0);
        this.rightKnee.setTargetRotation(20, 0);
        this.leftShoulder.setTargetRotation(100, 0);
        this.rightShoulder.setTargetRotation(100, 0);
        this.leftElbow.setTargetRotation(110, 0);
        this.rightElbow.setTargetRotation(110, 0);
    }

    startPunch(hand = "right") {
        if (this.mode === "boxing" && !this.isPunching) {
            this.isPunching = true;
            this.punchTime = 0;
            this.punchingHand = hand;
        }
    }

    setPunchPose(time) {
        let t = Math.min(time / 0.3, 1.0);
        if (this.punchingHand === "right") {
            this.rightShoulder.setTargetRotation(110 + 20 * t, 0);
            this.rightShoulder.setTargetRotation(20 * t, 2);
            this.rightElbow.setTargetRotation(60 - 60 * t, 0);
            this.rightUpperArm.setTargetRotation(-90 * t, 1);
            this.rightUpperArm.setScaleAxis(1.2 + t, 1);
            this.rightUpperArm.offset[1] = -0.8 - 0.2 * t;
            this.rightElbow.setTargetRotation(-90 * t, 1);
            this.rightElbow.offset[1] = -2 - 0.2 * t;
            this.leftShoulder.setTargetRotation(70, 0);
            this.leftShoulder.setTargetRotation(-20, 2);
            this.leftElbow.setTargetRotation(110, 0);
        } else {
            this.leftShoulder.setTargetRotation(105 + 20 * t, 0);
            this.leftShoulder.setTargetRotation(-20 * t, 2);
            this.leftElbow.setTargetRotation(60 - 60 * t, 0);
            this.leftUpperArm.setTargetRotation(90 * t, 1);
            this.leftUpperArm.setScaleAxis(1.2 + t, 1);
            this.leftUpperArm.offset[1] = -0.8 - 0.2 * t;
            this.leftElbow.setTargetRotation(90 * t, 1);
            this.leftElbow.offset[1] = -2 - 0.2 * t;
            this.rightShoulder.setTargetRotation(70, 0);
            this.rightShoulder.setTargetRotation(20, 2);
            this.rightElbow.setTargetRotation(110, 0);
        }
        this.leftHip.setTargetRotation(40, 0);
        this.rightHip.setTargetRotation(40, 0);
        this.leftKnee.setTargetRotation(-20, 0);
        this.rightKnee.setTargetRotation(-20, 0);
        this.neckBase.rotation = [5, 0, 0];
        this.neckBase.targetRotation = [5, 0, 0];
        this.neckMiddle.rotation = [5, 0, 0];
        this.neckMiddle.targetRotation = [5, 0, 0];
        this.neckTop.rotation = [5, 0, 0];
        this.neckTop.targetRotation = [5, 0, 0];
    }

    moveCharacter(dt, forward, sideways) {
        if (this.isBeingKnockedBack) {
            this.knockbackTime += dt;
            if (this.knockbackTime < this.knockbackDuration) {
                const knockbackFactor = 2.0 - (this.knockbackTime / this.knockbackDuration);
                const currentKnockbackVelocity = vec3(
                    this.knockbackVelocity[0] * knockbackFactor,
                    0,
                    this.knockbackVelocity[2] * knockbackFactor
                );
                this.position[0] += currentKnockbackVelocity[0] * dt;
                this.position[2] += currentKnockbackVelocity[2] * dt;
                if (this.isJumping) {
                    const currentJumpHeight = this.position[1] - this.jumpStartHeight;
                    if (currentJumpHeight >= MAX_JUMP_HEIGHT) {
                        this.velocity[1] = 0;
                    }
                    this.velocity[1] -= GRAVITY * dt;
                } else if (!this.isOnGround) {
                    this.velocity[1] -= GRAVITY * dt;
                }
                this.position[1] += this.velocity[1] * dt;
                const bodyHeight = 10.5;
                if (this.position[1] < GROUND_Y + bodyHeight) {
                    this.position[1] = GROUND_Y + bodyHeight;
                    this.velocity[1] = 0;
                    this.isOnGround = true;
                    this.isJumping = false;
                }
                return; 
            } else {
                this.isBeingKnockedBack = false;
                this.knockbackVelocity = vec3(0, 0, 0);
            }
        }
        const rotRad = this.yRotation * Math.PI / 180;
        const forwardDir = vec3(-Math.sin(rotRad), 0, -Math.cos(rotRad));
        const rightDir = vec3(Math.cos(rotRad), 0, -Math.sin(rotRad));
        let moveX = 0, moveZ = 0;
        if (forward !== 0) {
            moveX += forward * forwardDir[0];
            moveZ += forward * forwardDir[2];
        }
        if (sideways !== 0) {
            moveX += sideways * rightDir[0];
            moveZ += sideways * rightDir[2];
        }
        const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
        let speed = MOVE_SPEED;
        if (this.mode === "running") speed = MOVE_SPEED * 2.0;
        if (moveLen > 0.01) {
            moveX = moveX / moveLen * speed;
            moveZ = moveZ / moveLen * speed;
        }
        const targetVelX = moveX;
        const targetVelZ = moveZ;
        const accel = 10.0;
        const smoothFactor = Math.min(1.0, accel * dt);
        this.velocity[0] += (targetVelX - this.velocity[0]) * smoothFactor;
        this.velocity[2] += (targetVelZ - this.velocity[2]) * smoothFactor;
        if (this.isJumping) {
            const currentJumpHeight = this.position[1] - this.jumpStartHeight;
            if (currentJumpHeight >= MAX_JUMP_HEIGHT) {
                this.velocity[1] = 0;
            }
            this.velocity[1] -= GRAVITY * dt;
        } else if (!this.isOnGround) {
            this.velocity[1] -= GRAVITY * dt;
        }
        this.position[0] += this.velocity[0] * dt;
        this.position[2] += this.velocity[2] * dt;
        this.position[1] += this.velocity[1] * dt;
        const bodyHeight = 10.5;
        if (this.position[1] < GROUND_Y + bodyHeight) {
            this.position[1] = GROUND_Y + bodyHeight;
            this.velocity[1] = 0;
            this.isOnGround = true;
            this.isJumping = false;
        }
        this.root.mesh.position = vec3(this.position[0], this.position[1], this.position[2]);
        this.isMoving = moveLen > 0.01;
        this.moveDirection = moveLen > 0.01 ? vec3(moveX, 0, moveZ) : vec3(0, 0, 0);
    }

    jump() {
        if (!this.isJumping && this.isOnGround) {
            this.velocity[1] = JUMP_FORCE;
            this.isJumping = true;
            this.isOnGround = false;
            this.jumpStartHeight = this.position[1];
        }
    }

    update(dt) {
        let xAngle = this.mode === "boxing" ? -20 : 0;
        const xRot = rotate(xAngle, [1, 0, 0]);
        const yRot = rotate(this.yRotation, [0, 1, 0]);
        this.rootRotation = mult(yRot, xRot);
        const translation = translate(this.position[0], this.position[1], this.position[2]);
        const transform = mult(translation, this.rootRotation);
        this.root.update(dt, transform, false);
        this.updateEyePositions();
        this.animationTime += dt;
        let poseType = "standing";
        if (this.isJumping) {
            poseType = "jumping";
        } else if (this.isMoving) {
            if (this.mode === "running") {
                poseType = "running";
            } else {
                poseType = "walking";
            }
        }
        if (this.lastPoseType !== poseType) {
            this.setDefaultPose();
            this.lastPoseType = poseType;
        }
        if (this.isPunching) {
            this.punchTime += dt;
            this.setPunchPose(this.punchTime);
            if (this.punchTime > 0.3) {
                this.isPunching = false;
                if (this.punchingHand === "right") {
                    this.rightUpperArm.setTargetRotation(0, 1);
                    this.rightElbow.setTargetRotation(0, 1);
                    this.rightElbow.offset[1] = -1.6;
                    this.rightUpperArm.setScaleAxis(1.2, 1);
                    this.rightUpperArm.offset[1] = -0.8;
                } else {
                    this.leftUpperArm.setTargetRotation(0, 1);
                    this.leftElbow.setTargetRotation(0, 1);
                    this.leftElbow.offset[1] = -1.2;
                    this.leftUpperArm.setScaleAxis(1.2, 1);
                    this.leftUpperArm.offset[1] = -0.8;
                }
                this.setDefaultPose();
            }
            return;
        }
        switch (poseType) {
            case "jumping":
                this.setJumpPose();
                break;
            case "running":
                this.setRunningPose(this.animationTime);
                break;
            case "walking":
                this.setWalkingPose(this.animationTime);
                break;
            default:
                this.setStandingPose(this.animationTime);
        }
    }
    
    draw(viewProj, cameraPos, lights) {
        try {
            if (this.root) {
                this.root.draw(viewProj, cameraPos, lights);
            }
        } catch (e) {
            console.error("Draw error in Human:", e);
        }
    }

    findPartWorldInfo(part, targetName, parentMatrix = mat4()) {
        if (!part) return null;
        const translationMatrix = translate(...part.offset);
        part.updateLocalRotationMatrix();
        let offsetMatrix = mult(translationMatrix, part.localRotationMatrix);
        let localMatrix = mult(parentMatrix, offsetMatrix);
        if (part.name === targetName) {
            return {
                position: [
                    localMatrix[0][3],
                    localMatrix[1][3],
                    localMatrix[2][3]
                ],
                scale: part.mesh.scale,
                matrix: localMatrix
            };
        }
        for (const child of part.children) {
            const result = this.findPartWorldInfo(child, targetName, localMatrix);
            if (result) return result;
        }
        return null;
    }

    checkHitToParts(hitPosition, hitScale, targetPart, parentMatrix = mat4()) {
        const translationMatrix = translate(...targetPart.offset);
        targetPart.updateLocalRotationMatrix();
        let offsetMatrix = mult(translationMatrix, targetPart.localRotationMatrix);
        let localMatrix = mult(parentMatrix, offsetMatrix);
        const targetPos = [
            localMatrix[0][3],
            localMatrix[1][3],
            localMatrix[2][3]
        ];
        const targetScale = targetPart.mesh.scale;
        const dx = Math.abs(hitPosition[0] - targetPos[0]);
        const dy = Math.abs(hitPosition[1] - targetPos[1]);
        const dz = Math.abs(hitPosition[2] - targetPos[2]);
        const minDistX = (hitScale[0] + targetScale[0]) / 2;
        const minDistY = (hitScale[1] + targetScale[1]) / 2;
        const minDistZ = (hitScale[2] + targetScale[2]) / 2;
        if (dx < minDistX && dy < minDistY && dz < minDistZ) {
            return true;
        }
        for (const child of targetPart.children) {
            if (this.checkHitToParts(hitPosition, hitScale, child, localMatrix)) {
                return true;
            }
        }
        return false;
    }

    checkPunchCollision(otherPlayer, gameManager) {
        if (!this.isPunching) return false;
        const handName = (this.punchingHand === 'right') ? 'rightHand' : 'leftHand';
        const myRootMatrix = mult(
            translate(this.position[0], this.position[1], this.position[2]),
            this.rootRotation
        );
        const myHandInfo = this.findPartWorldInfo(this.root, handName, myRootMatrix);
        if (!myHandInfo) {
            console.error('손을 찾을 수 없음:', handName);
            return false;
        }
        const otherRootMatrix = mult(
            translate(otherPlayer.position[0], otherPlayer.position[1], otherPlayer.position[2]),
            otherPlayer.rootRotation
        );
        const hit = this.checkHitToParts(
            myHandInfo.position,
            myHandInfo.scale,
            otherPlayer.root,
            otherRootMatrix
        );
        if (hit) {
            if (gameManager) {
                gameManager.updateHealth(otherPlayer.playerIndex, 10);
            }
            const damage = 10.0;
            otherPlayer.applyKnockback(damage, this.position);
        }
        return hit;
    }

    calculateWorldPosition(hand) {
        if (!hand) {
            console.error('Hand position is undefined');
            return vec3(0, 0, 0);
        }
        const basePos = vec3(
            this.position[0],
            this.position[1],
            this.position[2]
        );

        const rotatedOffset = vec3(
            hand[0] * Math.cos(this.yRotation) - hand[2] * Math.sin(this.yRotation),
            hand[1],
            hand[0] * Math.sin(this.yRotation) + hand[2] * Math.cos(this.yRotation)
        );
        return vec3(
            basePos[0] + rotatedOffset[0],
            basePos[1] + rotatedOffset[1],
            basePos[2] + rotatedOffset[2]
        );
    }

    updatePunchAnimation(dt) {
        if (!this.isPunching) return;
        this.punchTime += dt;
        const punchProgress = this.punchTime / 0.3;
        if (punchProgress >= 1.0) {
            this.isPunching = false;
            this.punchTime = 0;
            this.setDefaultPose();
            return;
        }
    }

    forceMoveTo(position, rotation) {
        this.position = position;
        this.velocity = vec3(0, 0, 0);
        this.acceleration = vec3(0, 0, 0);
        this.isJumping = false;
        this.isOnGround = false;
        this.walkingAnimation = false;
        this.mode = "standing";
        this.setDefaultPose();
        if (this.root && this.root.mesh) {
            this.yRotation = rotation[1];
        }
    }

    updateEyePositions() {
        const myRootMatrix = mult(
            translate(this.position[0], this.position[1], this.position[2]),
            this.rootRotation
        );
        const leftEyeInfo = this.findPartWorldInfo(this.root, "leftEye", myRootMatrix);
        const rightEyeInfo = this.findPartWorldInfo(this.root, "rightEye", myRootMatrix);
        if (leftEyeInfo && rightEyeInfo) {
            const eyeCenter = vec3(
                (leftEyeInfo.position[0] + rightEyeInfo.position[0])/2,
                (leftEyeInfo.position[1] + rightEyeInfo.position[1])/2,
                (leftEyeInfo.position[2] + rightEyeInfo.position[2])/2
            );
            const forward = vec3(
                leftEyeInfo.matrix[0][2],
                leftEyeInfo.matrix[1][2],
                leftEyeInfo.matrix[2][2]
            );
            this.camera.position = vec3(eyeCenter[0] - forward[0] * 0.3, eyeCenter[1] + 0.1, eyeCenter[2] - forward[2] * 0.3);
            const lookLength = 1;
            this.camera.target = [
                eyeCenter[0] - forward[0] * lookLength,
                eyeCenter[1] - forward[1] * lookLength,
                eyeCenter[2] - forward[2] * lookLength,
            ];
        }
    }

    applyKnockback(damage, attackerPosition) {
        const randomMultiplier = Math.floor(Math.random() * 10) + 1;
        const knockbackForce = damage * randomMultiplier;
        const direction = vec3(
            this.position[0] - attackerPosition[0],
            1,
            this.position[2] - attackerPosition[2]
        );
        const length = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);
        if (length > 0) {
            direction[0] /= length;
            direction[2] /= length;
        }
        this.knockbackVelocity = vec3(
            direction[0] * knockbackForce,
            1,
            direction[2] * knockbackForce
        );
        this.isBeingKnockedBack = true;
        this.knockbackDuration = 1;
        this.knockbackTime = 0;
        this.knockbackDirection = direction;
    }
}
