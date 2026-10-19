import * as THREE from "./vendor/three.module.js";

const Smooth = v => { const t = THREE.MathUtils.clamp(v, 0, 1); return t * t * (3 - 2 * t); };
export const DreamOpacity = p => Smooth(p / 0.06) * Smooth((1 - p) / 0.08);

export function PlaceDream(root, camera, head, anchor, cameraAnchor) {
  head.getWorldPosition(anchor);
  root.position.copy(anchor);
  root.quaternion.copy(camera.quaternion);
  camera.updateMatrixWorld();
  cameraAnchor.copy(anchor).applyMatrix4(camera.matrixWorldInverse);
  const halfHeight = camera.isOrthographicCamera
    ? (camera.top - camera.bottom) / (2 * camera.zoom)
    : -cameraAnchor.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const halfWidth = camera.isOrthographicCamera
    ? (camera.right - camera.left) / (2 * camera.zoom) : halfHeight * camera.aspect;
  root.scale.setScalar(Math.max(0.05, Math.min(1,
    (halfHeight * 0.94 - cameraAnchor.y) / 2.54, (halfWidth * 0.94 + cameraAnchor.x) / 2.76)));
}

// Padded local envelope shared by both stages, including all three thought dots.
const MIN = [-2.85, 0.12, -0.45], MAX = [0.45, 2.65, 0.85];

export class DreamCompositor {
  constructor(scene) {
    // Memory geometry lives exclusively here, never in the live scene.
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorldAutoUpdate = false;
    this.target = null;
    this.size = new THREE.Vector2();
    this.bufferSize = new THREE.Vector2();
    this.point = new THREE.Vector3();
    this.crop = new THREE.Matrix4();
    this.clearColor = new THREE.Color();
    this.viewport = new THREE.Vector4();
    this.scissor = new THREE.Vector4();
    this.material = new THREE.ShaderMaterial({
      uniforms: { image: { value: null }, opacity: { value: 0 },
        rectangle: { value: new THREE.Vector4() }, depth: { value: 0 } },
      vertexShader: `uniform vec4 rectangle; uniform float depth;
        varying vec2 imageUV;
        void main() {
          imageUV = uv;
          gl_Position = vec4(mix(rectangle.xy, rectangle.zw, uv), depth, 1.0);
        }`,
      fragmentShader: `uniform sampler2D image; uniform float opacity;
        varying vec2 imageUV;
        void main() {
          vec4 c = texture2D(image, imageUV);
          // Unpremultiply linear RGB before output conversion, then premultiply
          // once for blending. This avoids dark fringes and double alpha.
          gl_FragColor = vec4(c.rgb / max(c.a, 0.00001), c.a * opacity);
          #include <colorspace_fragment>
          #include <premultiplied_alpha_fragment>
        }`,
      transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.name = "dream-composite";
    this.quad.frustumCulled = false;
    this.quad.visible = false;
    scene.add(this.quad);
  }

  releaseTarget() {
    this.target?.dispose();
    this.target = null;
    this.material.uniforms.image.value = null;
    this.quad.visible = false;
  }

  prepare(renderer, camera, visuals) {
    const visual = visuals.find(entry => entry.root.visible && entry.opacity > 0);
    if (!visual) { this.releaseTarget(); return; }
    const root = visual.root;
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    renderer.getDrawingBufferSize(this.size);
    let left = Infinity, bottom = Infinity, right = -Infinity, top = -Infinity;
    for (let i = 0; i < 8; i++) {
      this.point.set(i & 1 ? MAX[0] : MIN[0], i & 2 ? MAX[1] : MIN[1], i & 4 ? MAX[2] : MIN[2]);
      this.point.applyMatrix4(root.matrixWorld).project(camera);
      left = Math.min(left, this.point.x); right = Math.max(right, this.point.x);
      bottom = Math.min(bottom, this.point.y); top = Math.max(top, this.point.y);
    }
    left = Math.max(-1, left); bottom = Math.max(-1, bottom);
    right = Math.min(1, right); top = Math.min(1, top);
    if (!(right > left && top > bottom)) { this.releaseTarget(); return; }
    // Quantize and grow within a viewport to avoid camera-drift resize churn.
    // Bound each edge at 1024 pixels even with 4K output and elevated DPR.
    const width = Math.min(1024, Math.ceil((right - left) * this.size.x / 64) * 32);
    const height = Math.min(1024, Math.ceil((top - bottom) * this.size.y / 64) * 32);
    const resized = !this.bufferSize.equals(this.size);
    this.bufferSize.copy(this.size);
    if (!this.target) {
      this.target = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: true, stencilBuffer: false,
        samples: Math.min(4, renderer.capabilities?.maxSamples || 0),
      });
      this.target.texture.name = "pip-dream-composite";
      this.target.texture.colorSpace = THREE.LinearSRGBColorSpace;
      this.material.uniforms.image.value = this.target.texture;
    } else if (resized || width > this.target.width || height > this.target.height) {
      this.target.setSize(resized ? width : Math.max(width, this.target.width),
        resized ? height : Math.max(height, this.target.height));
    }
    this.material.uniforms.rectangle.value.set(left, bottom, right, top);
    this.material.uniforms.opacity.value = visual.opacity;
    this.point.copy(root.position).project(camera);
    this.material.uniforms.depth.value = this.point.z;
    this.quad.position.copy(root.position); // transparent sorting at Pip's head depth
    this.quad.visible = true;
    this.camera.matrixWorld.copy(camera.matrixWorld);
    this.camera.matrixWorldInverse.copy(camera.matrixWorldInverse);
    this.crop.set(2 / (right - left), 0, 0, -(right + left) / (right - left),
      0, 2 / (top - bottom), 0, -(top + bottom) / (top - bottom),
      0, 0, 1, 0, 0, 0, 0, 1);
    this.camera.projectionMatrix.multiplyMatrices(this.crop, camera.projectionMatrix);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    const previousTarget = renderer.getRenderTarget();
    const autoClear = renderer.autoClear, clearAlpha = renderer.getClearAlpha();
    const scissorTest = renderer.getScissorTest();
    renderer.getClearColor(this.clearColor);
    renderer.getViewport(this.viewport);
    renderer.getScissor(this.scissor);
    try {
      renderer.setRenderTarget(this.target);
      renderer.setScissorTest(false);
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = true;
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setViewport(this.viewport);
      renderer.setScissor(this.scissor);
      renderer.setScissorTest(scissorTest);
      renderer.setClearColor(this.clearColor, clearAlpha);
      renderer.autoClear = autoClear;
    }
  }

  dispose() {
    this.releaseTarget();
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    this.scene.clear();
    this.quad.removeFromParent();
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
