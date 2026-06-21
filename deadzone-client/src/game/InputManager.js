const MOVEMENT_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'KeyA',
  'KeyD',
  'Space'
]);

export class InputManager {
  constructor(pointerTarget, keyboardTarget = window) {
    this.pointerTarget = pointerTarget;
    this.keyboardTarget = keyboardTarget;
    this.pressedKeys = new Set();
    this.mousePosition = null;
    this.shootRequested = false;
    this.onChange = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
  }

  start(onChange) {
    this.onChange = onChange;
    this.keyboardTarget.addEventListener('keydown', this.handleKeyDown);
    this.keyboardTarget.addEventListener('keyup', this.handleKeyUp);
    this.pointerTarget.addEventListener('mousemove', this.handleMouseMove);
    this.pointerTarget.addEventListener('mousedown', this.handleMouseDown);
  }

  stop() {
    this.keyboardTarget.removeEventListener('keydown', this.handleKeyDown);
    this.keyboardTarget.removeEventListener('keyup', this.handleKeyUp);
    this.pointerTarget.removeEventListener('mousemove', this.handleMouseMove);
    this.pointerTarget.removeEventListener('mousedown', this.handleMouseDown);
    this.pressedKeys.clear();
    this.mousePosition = null;
    this.shootRequested = false;
    this.onChange = null;
  }

  getInputState() {
    return {
      moveLeft: this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('KeyA'),
      moveRight: this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('KeyD'),
      jump: this.pressedKeys.has('Space')
    };
  }

  getMousePosition() {
    return this.mousePosition;
  }

  consumeShootRequest() {
    const wasRequested = this.shootRequested;
    this.shootRequested = false;
    return wasRequested;
  }

  handleKeyDown(event) {
    if (!MOVEMENT_KEYS.has(event.code) || this.pressedKeys.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.add(event.code);
    this.emitChange();
  }

  handleKeyUp(event) {
    if (!MOVEMENT_KEYS.has(event.code) || !this.pressedKeys.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.delete(event.code);
    this.emitChange();
  }

  handleMouseMove(event) {
    this.mousePosition = this.getWorldMousePosition(event);
  }

  handleMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.mousePosition = this.getWorldMousePosition(event);
    this.shootRequested = true;
  }

  getWorldMousePosition(event) {
    const rect = this.pointerTarget.getBoundingClientRect();
    const scaleX = this.pointerTarget.width / rect.width;
    const scaleY = this.pointerTarget.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  emitChange() {
    if (this.onChange) {
      this.onChange(this.getInputState());
    }
  }
}
