
export const blinnPhongVS = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;
    
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform mat3 uNormalMatrix;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;
    
    void main() {
        vec4 worldPos = uModel * vec4(aPosition, 1.0);
        vPosition = worldPos.xyz;
        vNormal = normalize(uNormalMatrix * aNormal);
        vTexCoord = aTexCoord;
        gl_Position = uMVP * vec4(aPosition, 1.0);
    }
`;

export const blinnPhongFS = `
    precision mediump float;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;
    
    uniform vec3 uAmbientColor;
    uniform vec3 uDiffuseColor;
    uniform vec3 uSpecularColor;
    uniform float uShininess;
    
    uniform sampler2D uTexture;
    uniform sampler2D uNormalMap;
    uniform bool uUseNormalMap;
    
    uniform vec3 uLightPosition0;
    uniform vec3 uLightPosition1;
    uniform vec3 uLightPosition2;
    uniform vec3 uLightPosition3;
    
    uniform vec3 uLightDirection0;
    uniform vec3 uLightDirection1;
    uniform vec3 uLightDirection2;
    uniform vec3 uLightDirection3;
    
    uniform float uLightSpotAngle0;
    uniform float uLightSpotAngle1;
    uniform float uLightSpotAngle2;
    uniform float uLightSpotAngle3;
    
    uniform vec3 uLightAmbient0;
    uniform vec3 uLightAmbient1;
    uniform vec3 uLightAmbient2;
    uniform vec3 uLightAmbient3;
    
    uniform vec3 uLightDiffuse0;
    uniform vec3 uLightDiffuse1;
    uniform vec3 uLightDiffuse2;
    uniform vec3 uLightDiffuse3;
    
    uniform vec3 uLightSpecular0;
    uniform vec3 uLightSpecular1;
    uniform vec3 uLightSpecular2;
    uniform vec3 uLightSpecular3;
    
    uniform float uLightIntensity0;
    uniform float uLightIntensity1;
    uniform float uLightIntensity2;
    uniform float uLightIntensity3;
    
    uniform vec3 uGlobalAmbient;
    uniform vec3 uCameraPosition;
    
    vec3 calculateLight(vec3 lightPos, vec3 lightDirection, float spotAngle, 
                       vec3 lightAmbient, vec3 lightDiffuse, vec3 lightSpecular, 
                       float intensity) {
        vec3 normal = normalize(vNormal);
        if (uUseNormalMap) {
            vec3 normalMap = texture2D(uNormalMap, vTexCoord).rgb;
            normal = normalize(normalMap * 2.0 - 1.0);
        }

        vec3 lightDir = normalize(lightPos - vPosition);
        vec3 viewDir = normalize(uCameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);

        vec3 ambient = lightAmbient * uAmbientColor;
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * lightDiffuse * uDiffuseColor;
        float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
        vec3 specular = spec * lightSpecular * uSpecularColor;

        float spotEffect = 1.0;
        if (spotAngle > 0.0) {
            float cosAngle = dot(-lightDir, normalize(lightDirection));
            float spotCutoff = cos(radians(spotAngle));
            spotEffect = cosAngle < spotCutoff ? 0.0 : pow(cosAngle, 32.0);
        }

        return (ambient + diffuse + specular) * intensity * spotEffect;
    }

    void main() {
        vec3 color = vec3(0.0);

        color += uGlobalAmbient * uAmbientColor;

        color += calculateLight(uLightPosition0, uLightDirection0, uLightSpotAngle0,
                              uLightAmbient0, uLightDiffuse0, uLightSpecular0, uLightIntensity0);
        color += calculateLight(uLightPosition1, uLightDirection1, uLightSpotAngle1,
                              uLightAmbient1, uLightDiffuse1, uLightSpecular1, uLightIntensity1);
        color += calculateLight(uLightPosition2, uLightDirection2, uLightSpotAngle2,
                              uLightAmbient2, uLightDiffuse2, uLightSpecular2, uLightIntensity2);
        color += calculateLight(uLightPosition3, uLightDirection3, uLightSpotAngle3,
                              uLightAmbient3, uLightDiffuse3, uLightSpecular3, uLightIntensity3);

        vec4 texColor = texture2D(uTexture, vTexCoord);
        if (texColor.a < 0.1) {
            texColor = vec4(uDiffuseColor, 1.0);
        }

        vec3 finalColor = color * texColor.rgb;
        finalColor = pow(finalColor, vec3(1.0/2.2));
        gl_FragColor = vec4(finalColor, texColor.a);
    }
`; 