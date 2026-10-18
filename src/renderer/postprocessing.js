import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
/** Optional fullscreen film-grain and vignette pass. */
export function createFilmPostFX(renderer, scene, camera) {
    const filmShader = {
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: .047 }, uVignette: { value: .28 }, uResolution: { value: [1, 1] } },
        vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform sampler2D tDiffuse;
      uniform float uTime,uGrain,uVignette;
      uniform vec2 uResolution;
      varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      void main(){
        vec4 color=texture2D(tDiffuse,vUv);
        float grain=hash(floor(vUv*uResolution*.66)+floor(uTime*8.0)*17.0)-.5;
        float radial=length((vUv-.5)*vec2(uResolution.x/uResolution.y,1.0));
        float vignette=1.0-uVignette*smoothstep(.25,1.08,radial);
        color.rgb=max(vec3(0.0),color.rgb*vignette+grain*uGrain);
        gl_FragColor=vec4(color.rgb,color.a);
      }`,
    };
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const filmPass = new ShaderPass(filmShader);
    composer.addPass(filmPass);
    composer.addPass(new OutputPass());
    return {
        render: (elapsed) => { filmPass.uniforms.uTime.value = elapsed; composer.render(); },
        resize: (width, height, pixelRatio) => { composer.setPixelRatio(pixelRatio); composer.setSize(width, height); filmPass.uniforms.uResolution.value = [width * pixelRatio, height * pixelRatio]; },
        dispose: () => composer.dispose(),
    };
}
