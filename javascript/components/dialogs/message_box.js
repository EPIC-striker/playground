// Copyright 2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { Dialog } from 'components/dialogs/dialog.js';

// All messages share the same title. Only the message's content is configurable.
const CAPTION = 'Las Venturas Playground';

// Text to display on the lone button on a message, allowing the player to dismiss it.
const BUTTON_CAPTION = 'Alright!';

// A message is a very simple alert dialog centered on the player's screen that contains a bit of
// text informing the user of something critical (it will obstruct their experience!), after which
// they can dismiss it either by clicking on ESC, or by clicking on the included button.
export class MessageBox {
  static display(player, { message, title, leftButton = 'Close', rightButton = '' } = {}) {
    const instance = new MessageBox(message, title, leftButton, rightButton);
    return instance.displayForPlayer(player);
  }

  constructor(message, title, leftButton, rightButton) {
    this.message_ = message;
    this.title_ = title || CAPTION;
    this.leftButton_ = leftButton || BUTTON_CAPTION;
    this.rightButton_ = rightButton || '';
  }

  // Displays the message to |player|. A promise will be returned that will resolve when the player
  // has closed the message's dialog. The promise will reject only when the player is not connected,
  // or disconnects while the message is shown on their screen.
  displayForPlayer(player) {
    return Dialog.displayMessage(player, this.title_, this.message_, this.leftButton_, this.rightButton_).then(result => {
      return result.response;
    });
  }
};
