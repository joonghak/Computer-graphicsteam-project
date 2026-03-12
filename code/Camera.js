import "./Common/MV.js";

export class Camera {
    constructor() {
        this.position = vec3(0, 30, 90);  
        this.target = vec3(0, 5, 0);     
        this.up = vec3(0, 1, 0);        
    }

    setPosition(x, y, z) {
        this.position = vec3(x, y, z);
    }

    setTarget(x, y, z) {
        this.target = vec3(x, y, z);
    }

    setUp(x, y, z) {
        this.up = vec3(x, y, z);
    }

    getViewMatrix() {
        return lookAt(this.position, this.target, this.up);
    }

    reset() {
        this.position = vec3(0, 30, 90);
        this.target = vec3(0, 5, 0);
        this.up = vec3(0, 1, 0);
    }

    setPreset(presetNumber) {
        switch(presetNumber) {
            case 1:
                this.position = vec3(0, 30, 90);
                break;
            case 2:
                this.position = vec3(30, 7, -60);
                break;
            case 3:
                this.position = vec3(-30, 7, 35);
                break;
            case 4:
                this.position = vec3(0, 170, 1);
                break;
            default:
                this.reset();
        }
    }
} 