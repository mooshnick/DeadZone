export class InputController {
  constructor({ canvas, keys, mouse, onLook, onFire, onScopeChange }) {
    this.canvas = canvas;
    this.keys = keys;
    this.mouse = mouse;
    this.onLook = onLook;
    this.onFire = onFire;
    this.onScopeChange = onScopeChange;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  bind() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  dispose() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    document.exitPointerLock?.();
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (document.pointerLockElement !== this.canvas) return;
    this.onLook(event.movementX, event.movementY);
  }

  handleMouseDown(event) {
    event.preventDefault();
    const pointerLockRequest = this.canvas.requestPointerLock?.();
    pointerLockRequest?.catch?.(() => {});

    if (event.button === 2) {
      this.onScopeChange(true);
      return;
    }
    if (event.button === 0) {
      this.mouse.current.down = true;
      this.onFire();
    }
  }

  handleMouseUp(event) {
    if (event.button === 2) {
      this.onScopeChange(false);
    }
    if (event.button === 0) {
      this.mouse.current.down = false;
    }
  }
}
