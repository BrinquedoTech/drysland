import gridConfig from '@config/grid'
import Debug from '@utils/debug'
import { AmbientLight, CameraHelper, DirectionalLight } from 'three'
import Experience from './experience'

export default class Environment {
  constructor() {
    // Setup
    this.experience = Experience.instance

    this.scene = this.experience.scene
    this.resources = this.experience.resources

    this.setLight()
  }

  setLight() {
    this.ambientLight = new AmbientLight('white', 1)

    this.directionalLight = new DirectionalLight('white', 3)
    this.directionalLight.position.set(3, 10, 10)

    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.setScalar(2048)

    this.directionalLight.shadow.camera.near = 0
    this.directionalLight.shadow.camera.far = gridConfig.maxRadius * 3

    const offset = gridConfig.maxRadius * 2
    this.directionalLight.shadow.camera.right = offset
    this.directionalLight.shadow.camera.left = -offset
    this.directionalLight.shadow.camera.top = offset / 1.5
    this.directionalLight.shadow.camera.bottom = -offset / 1.5

    this.directionalLight.shadow.bias = -0.003
    this.directionalLight.shadow.normalBias = 0.01

    this.scene.add(this.ambientLight, this.directionalLight)
  }

  setDebug() {
    this.shadowHelper = new CameraHelper(this.directionalLight.shadow.camera)
    this.shadowHelper.visible = false
    this.scene.add(this.shadowHelper)

    const folder = Debug.gui.root.addFolder({ title: '💡 environment' })
    folder.addBinding(this.directionalLight, 'position', {
      label: 'light position',
    })

    folder.addBinding(this.directionalLight.shadow.camera, 'near', {
      label: 'shadow near',
      min: -100,
      max: 100,
      step: 1,
    })

    folder.addBinding(this.directionalLight.shadow.camera, 'far', {
      label: 'shadow far',
      min: -100,
      max: 100,
      step: 1,
    })

    folder
      .addBinding(this.directionalLight.shadow.camera, 'right', {
        label: 'shadow left/right',
        min: -50,
        max: 50,
        step: 1,
      })
      .on('change', event => (this.directionalLight.shadow.camera.left = -event.value))

    folder
      .addBinding(this.directionalLight.shadow.camera, 'top', {
        label: 'shadow top/bottom',
        min: -50,
        max: 50,
        step: 1,
      })
      .on('change', event => (this.directionalLight.shadow.camera.bottom = -event.value))

    folder.addBinding(this.directionalLight.shadow, 'bias', {
      label: 'shadow bias',
      min: -1,
      max: 1,
      step: 0.001,
    })

    folder.addBinding(this.directionalLight.shadow, 'normalBias', {
      label: 'shadow normal bias',
      min: -1,
      max: 1,
      step: 0.001,
    })

    folder.on('change', () => {
      this.directionalLight.shadow.camera.updateProjectionMatrix()
      this.shadowHelper.update()
    })
  }
}
