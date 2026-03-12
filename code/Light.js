import "./Common/MV.js";

export function createDefaultLights() {
    const lights = {
        positions: [
            vec3(0, 40, 0),     
            vec3(25, 20, 25),   
            vec3(-25, 20, 25), 
            vec3(0, 20, -25),   
        ],

        directions: [
            vec3(0, -1, 0),   
            vec3(-0.7, -0.5, -0.7), 
            vec3(0.7, -0.5, -0.7), 
            vec3(0, -0.5, 0.7)     
        ],

        spotAngles: [90, 75, 75, 75], 

        ambient: [
            vec3(0.4, 0.4, 0.4), 
            vec3(0.4, 0.2, 0.2), 
            vec3(0.2, 0.2, 0.4),
            vec3(0.3, 0.3, 0.3)
        ],

        diffuse: [
            vec3(1.0, 1.0, 1.0),  
            vec3(0.9, 0.3, 0.3),  
            vec3(0.3, 0.3, 0.9),
            vec3(0.8, 0.8, 0.8)   
        ],

        specular: [
            vec3(0.9, 0.9, 0.9), 
            vec3(0.8, 0.2, 0.2), 
            vec3(0.2, 0.2, 0.8), 
            vec3(0.7, 0.7, 0.7)  
        ],

        intensities: [1.5, 1.2, 1.2, 1.0],

        globalAmbient: vec3(0.6, 0.6, 0.6),

        getLightData() {
            return {
                positions: this.positions,
                directions: this.directions,
                spotAngles: this.spotAngles,
                ambient: this.ambient,
                diffuse: this.diffuse,
                specular: this.specular,
                intensities: this.intensities,
                globalAmbient: this.globalAmbient
            };
        }
    };
    
    return lights;
}