import WaterBlock from '@blocks/water-block'
import BlocksConfig from '@config/blocks'
import { default as GridConfig } from '@config/grid'
import LandscapeConfig from '@config/landscape'
import OceanConfig from '@config/ocean'
import Auth from '@fire/auth'
import State from '@fire/state'
import Grid from '@grid/grid'
import Menu from '@ui/menu'
import Modal from '@ui/modal'
import UI from '@ui/ui'
import { AxesHelper, GridHelper, Scene } from 'three'
import Camera from './camera'
import Environment from './environment'
import Pointer from './pointer'
import Renderer from './renderer'
import Resources from './resources'
import Settings from './settings'
import Sizes from './sizes'
import SoundControls from './sound-controls'
import SoundPlayer from './sound-player'
import Time from './time'

export default class Experience {
  /** @type {Experience} */
  static instance

  static async init(canvasSelector, loading, debug) {
    return new Experience(document.querySelector(canvasSelector), loading, await debug)
  }

  constructor(canvas, loading, debug) {
    if (Experience.instance) return Experience.instance
    Experience.instance = this

    // Options
    this.canvas = canvas
    this.canvas.addEventListener('mousedown', () => this.canvas.classList.add('grabbing'))
    this.canvas.addEventListener('mouseup', () => this.canvas.classList.remove('grabbing'))

    this.loading = loading
    this.debug = debug
    this.settings = new Settings()

    BlocksConfig.init()
    GridConfig.init()
    LandscapeConfig.init()
    OceanConfig.init()

    // Setup
    this.time = new Time()
    this.sizes = new Sizes()
    this.resources = new Resources(loading)
    this.scene = new Scene()
    this.camera = new Camera()
    this.renderer = new Renderer()

    this.pointer = new Pointer()

    // Events
    this.settings.addEventListener('change', this.applySettings)
    this.sizes.addEventListener('resize', this.resize)
    this.time.addEventListener('tick', this.update)
    this.resources.addEventListener('ready', this.ready)

    document.addEventListener('keypress', e => {
      if (!this.grid || e.code !== 'Space') return
      this.grid.riverBlocks.find(b => b.material.uniforms.uHovered.value)?.onClick()
    })

    document.addEventListener('keydown', e => {
      if (!this.grid || e.code !== 'Escape' || UI.menuButton.disabled) return
      this.openMenu()
    })

    this.setDebug()
  }

  applySettings = () => {
    this.camera.applySettings()
    this.renderer.applySettings()
    this.environment.applySettings()
    delete WaterBlock.material
  }

  resize = () => {
    this.camera.resize()
    this.renderer.resize()
  }

  ready = () => {
    this.level = 0
    this.loading.stop()

    this.soundPlayer = new SoundPlayer()
    this.environment = new Environment()
    this.menu = new Menu()
    this.soundControls = new SoundControls()

    if (UI.startButton) {
      UI.startButton.onClick(this.start.bind(this)).disable(true)
      Auth.instance.subscribe(() => UI.startButton.enable())
    }
    if (UI.creditsButton) {
      UI.creditsButton.onClick(() => Modal.instance.open('#credits.modal'))
    }
    if (UI.menuButton) {
      UI.menuButton.onClick(this.openMenu.bind(this))
    }
    if (UI.nextButton) {
      UI.nextButton.onClick(this.nextLevel.bind(this))
    }
    if (UI.backButton) {
      UI.backButton.onClick(this.setExplorationMode.bind(this))
    }
  }

  async start() {
    this.setGridDebug()

    this.menu.close()
    await this.nextLevel()

    this.soundControls.show()
    UI.fullscreenToggle?.show()
    UI.menuButton?.show()
    UI.levelText?.show()
  }

  async nextLevel() {
    const state = await this.load()
    const level = state ? state.level : this.level + 1
    const blocks = state?.blocks

    this.level = level
    UI.levelText?.set(`Level ${this.level}`)

    this.levelParams = GridConfig.instance.generateLevel(this.level - 1)
    debug.log(`level ${this.level}: `, this.levelParams)
    this.grid?.dispose()
    this.grid = new Grid({ level, blocks, ...this.levelParams })
  }

  levelStart() {
    UI.nextButton.hide()
    this.setExplorationMode()
  }

  levelComplete() {
    this.soundPlayer.play('success')
    if (this.level) UI.nextButton?.show({ wiggle: true })

    // Salvar pontuação no BrinquedoTech (se disponível)
    console.log('🎯 Drysland levelComplete - level:', this.level)
    console.log('🔍 window.saveGameScore available:', !!window.saveGameScore)
    console.log('🔍 window.gameScoreAPI available:', !!window.gameScoreAPI)
    console.log('🔍 window.supabase available:', !!window.supabase)
    
    try {
      const score = Math.max(1, this.level) * 100 // exemplo: 100 pontos por nível
      console.log('💾 Tentando salvar score:', score, 'para jogo: drysland')
      
      // Tentar inicializar GameScoreAPI se não estiver inicializada
      const initAndSave = async () => {
        if (window.gameScoreAPI && !window.gameScoreAPI.isInitialized && window.supabase) {
          console.log('🔄 Tentando inicializar GameScoreAPI no levelComplete...')
          try {
            const { data: { session } } = await window.supabase.auth.getSession()
            if (session && session.user) {
              console.log('✅ Inicializando GameScoreAPI com usuário:', session.user.id)
              window.gameScoreAPI.init(session.user.id)
            }
          } catch (error) {
            console.error('❌ Erro ao inicializar GameScoreAPI:', error)
          }
        }
        
        // Salvar pontuação
        if (window.saveGameScore) {
          try {
            const result = await window.saveGameScore('drysland', score, {
              level: this.level,
              params: this.levelParams,
              timestamp: Date.now()
            })
            console.log('✅ Score salvo com sucesso:', result)
            window.refreshRanking && window.refreshRanking()
          } catch (error) {
            console.error('❌ Erro ao salvar score:', error)
          }
        } else {
          console.warn('⚠️ window.saveGameScore não disponível')
        }
      }
      
      initAndSave()
    } catch (e) {
      console.error('❌ Erro no levelComplete:', e)
    }

    this.setExplorationMode()
  }

  openMenu() {
    this.disposeGridDebug()

    this.grid?.dispose()
    delete this.grid

    this.level--
    this.loaded = false

    this.soundControls.hide()
    UI.menuButton?.hide()
    UI.fullscreenToggle?.hide()
    UI.levelText?.hide()
    UI.tutorialText?.hide()
    UI.backButton?.hide()
    UI.nextButton?.hide()

    this.camera.autoRotate = false
    UI.startButton?.setLabel('Resume')
    this.menu.open()
  }

  setGameMode(block) {
    UI.backButton?.show({ wiggle: true })

    this.camera.setGameControls(block)
    this.grid?.setShadows(false)
  }

  setExplorationMode() {
    UI.backButton.hide()
    this.camera.setExplorationControls(this.levelParams.radius)
    this.grid?.setShadows(true)
  }

  update = () => {
    this.camera.update()
    this.pointer.update()
    this.renderer.update()

    this.grid?.update()
  }

  dispose() {
    this.pointer.dispose()
    this.grid?.dispose()
  }

  save() {
    if (!this.level) return

    const timestamp = Date.now()
    const blocks = this.grid?.serialize()
    const level = this.level

    State.instance.save({ timestamp, level, blocks })
  }

  async load() {
    if (this.loaded) return
    this.loaded = true

    return await State.instance.load()
  }

  setDebug() {
    if (!this.debug) return

    window.experience = Experience.instance

    const helpersSize = GridConfig.instance.maxRadius * 2 + 4
    const axesHelper = new AxesHelper(helpersSize)
    axesHelper.visible = false
    axesHelper.position.x = -helpersSize * 0.5
    axesHelper.position.y = 1.01
    axesHelper.position.z = -helpersSize * 0.5

    const gridHelper = new GridHelper(helpersSize, helpersSize * 2, 'gray', 'gray')
    gridHelper.visible = false
    gridHelper.position.y = 1

    this.scene.add(axesHelper, gridHelper)

    this.debug.root.addBinding(this.settings.settings, 'graphics', {
      label: 'graphics settings',
      readonly: true,
      index: 3,
    })

    this.debug.root
      .addBinding(axesHelper, 'visible', { label: 'helpers', index: 4 })
      .on('change', event => {
        axesHelper.visible = event.value
        gridHelper.visible = event.value

        this.scene.backgroundIntensity = event.value ? 0 : 1
        this.environment.lightHelper.visible = event.value
        this.environment.shadowHelper.visible = event.value
        this.camera.controls.maxDistance = event.value ? 50 : 25
      })

    LandscapeConfig.instance.setDebug()
    OceanConfig.instance.setDebug()
  }

  setGridDebug() {
    if (!this.debug) return

    const folder = this.debug.root.addFolder({
      title: '⬢ grid',
      index: 5,
      expanded: false,
    })

    const generateParams = {
      radius: 1,
      coverage: 0.5,
      extraLinks: 0,
      minDeadEnds: 2,
      linksOnly: false,
    }

    folder
      .addBlade({
        view: 'list',
        label: 'strategy',
        options: [
          { text: 'DFS', value: 1 },
          { text: 'BFS', value: 2 },
          { text: "Prim's", value: 3 },
        ],
        value: 1,
      })
      .on('change', e => (GridConfig.instance.selectionStrategy = e.value))
    folder.addBinding(generateParams, 'radius', { min: 1, max: 10, step: 1 })
    folder.addBinding(generateParams, 'coverage', { min: 0.1, max: 1, step: 0.1 })
    folder.addBinding(generateParams, 'extraLinks', { min: 0, max: 1, step: 0.05 })
    folder.addBinding(generateParams, 'minDeadEnds', { min: 2, max: 10, step: 1 })
    folder.addBinding(generateParams, 'linksOnly')

    const onGenerateClick = () => {
      disableGridPanes()

      delete this.level
      this.levelParams = generateParams
      UI.levelText.set(`DEBUG`).show()

      this.grid?.dispose()
      this.grid = new Grid(generateParams)
    }

    const onSelectLevelChange = e => {
      if (isNaN(e.value)) return

      disableGridPanes()

      this.level = e.value - 1
      this.nextLevel()
    }

    const updateSelectLevelPane = level => {
      selectLevelPane.off('change', onSelectLevelChange)
      selectLevelPane.controller.value.setRawValue(level || 'debug')
      selectLevelPane.on('change', onSelectLevelChange)
    }

    const disableGridPanes = () => {
      selectLevelPane.disabled = true
      generatePane.disabled = true
      setTimeout(() => {
        selectLevelPane.disabled = false
        generatePane.disabled = false
      }, 2000)
    }

    const generatePane = folder.addButton({ title: 'generate' }).on('click', onGenerateClick)
    const selectLevelPane = folder
      .addBlade({
        view: 'text',
        label: 'select level',
        parse: v => +v,
        value: 0,
      })
      .on('change', onSelectLevelChange)

    this.generateParams = generateParams
    this.updateSelectLevelPane = updateSelectLevelPane
  }

  disposeGridDebug() {
    if (!this.debug) return
    this.debug.root.children.at(5).dispose()
  }
}
