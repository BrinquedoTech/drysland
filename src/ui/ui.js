import Button from './button'
import Text from './text'
import Toggle from './toggle'

// Função para criar elementos UI apenas se existirem no DOM
function createUIElement(Class, selector) {
  const element = document.querySelector(selector)
  return element ? new Class(selector) : null
}

export default class UI {
  static startButton = createUIElement(Button, '#start')
  static authToggle = createUIElement(Toggle, '#auth')
  static creditsButton = createUIElement(Button, '#credits')
  static settingsButton = createUIElement(Button, '#settings')

  static backButton = createUIElement(Button, '#back')
  static nextButton = createUIElement(Button, '#next')

  static menuButton = createUIElement(Button, '#menu')
  static soundsToggle = createUIElement(Toggle, '#sounds')
  static loopToggle = createUIElement(Toggle, '#loop')
  static ambienceToggle = createUIElement(Toggle, '#ambience')
  static fullscreenToggle = createUIElement(Toggle, '#fullscreen')

  static levelText = createUIElement(Text, '#level')
  static tutorialText = createUIElement(Text, '#tutorial')
}
