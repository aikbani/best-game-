// Keyboard and mouse input for LAMPION. The lantern follows the mouse with a
// soft chase, arrow keys / WASD steer it directly, Space or a click fires a
// gust burst, P pauses, R restarts, M mutes, and 1/2/3 (or a click) pick an
// upgrade card between nights. This module only records what the player did;
// the world decides what it means.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    /** Mouse position in logical field coordinates, or null when never moved. */
    mouseX: null,
    mouseY: null,
    mouseSeen: false,
    /** A gust was requested since the last read (Space or click). */
    gustQueued: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    startPressed: false,
    /** The last click point, for upgrade-card picks (consumed by takePresses). */
    clickQueued: false,
    clickX: null,
    clickY: null,
    /** 1, 2 or 3 pressed since the last read (upgrade choice), else 0. */
    choicePressed: 0,
  };

  function fieldPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space') {
      input.gustQueued = true;
      event.preventDefault();
    }
    if (event.code === 'KeyP') input.pausePressed = true;
    if (event.code === 'KeyR') input.restartPressed = true;
    if (event.code === 'KeyM') input.mutePressed = true;
    if (event.code === 'Enter') input.startPressed = true;
    if (event.code === 'Digit1') input.choicePressed = 1;
    if (event.code === 'Digit2') input.choicePressed = 2;
    if (event.code === 'Digit3') input.choicePressed = 3;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerMove(event) {
    const point = fieldPoint(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseSeen = true;
  }

  function onPointerDown(event) {
    const point = fieldPoint(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseSeen = true;
    input.gustQueued = true;
    input.startPressed = true;
    input.clickQueued = true;
    input.clickX = point.x;
    input.clickY = point.y;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  /** Keyboard steering vector, each axis -1, 0 or 1. */
  input.keyboardVector = function keyboardVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    return { x, y };
  };

  /** Take and clear the one-shot presses the main loop has not consumed yet. */
  input.takePresses = function takePresses() {
    const presses = {
      gust: input.gustQueued,
      pause: input.pausePressed,
      restart: input.restartPressed,
      mute: input.mutePressed,
      start: input.startPressed,
      click: input.clickQueued,
      clickX: input.clickX,
      clickY: input.clickY,
      choice: input.choicePressed,
    };
    input.gustQueued = false;
    input.pausePressed = false;
    input.restartPressed = false;
    input.mutePressed = false;
    input.startPressed = false;
    input.clickQueued = false;
    input.clickX = null;
    input.clickY = null;
    input.choicePressed = 0;
    return presses;
  };

  return input;
}
