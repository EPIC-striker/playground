// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import MockPlayerSyncedData from 'entities/test/mock_player_synced_data.js';
import MockVehicle from 'entities/test/mock_vehicle.js';

// Mocked player. Has the same interface and abilities as a real Player object, except that it does
// not rely on the SA-MP server to be available, nor communicates with Pawn.
class MockPlayer {
    constructor(playerId, event) {
        this.id_ = playerId;

        this.name_ = event.name || 'Player' + playerId;
        this.level_ = event.level || Player.LEVEL_PLAYER;
        this.levelIsTemporary_ = false;
        this.rconAdmin_ = false;
        this.vip_ = false;
        this.undercover_ = false;
        this.gangId_ = null;

        this.syncedData_ = new MockPlayerSyncedData(this.id_);

        this.nonPlayerCharacter_ = event.npc || false;

        this.health_ = 100;
        this.armour_ = 100;

        this.interiorId_ = 0;
        this.virtualWorld_ = 0;
        this.userId_ = null;
        this.ipAddress_ = event.ip || '127.0.0.1';
        this.position_ = new Vector(0, 0, 0);
        this.specialAction_ = Player.SPECIAL_ACTION_NONE;

        this.dialogPromiseResolve_ = null;
        this.dialogPromise_ = new Promise(resolve => {
            this.dialogPromiseResolve_ = resolve;
        });

        this.lastDialogId_ = null;
        this.lastDialogTitle_ = null;
        this.lastDialogStyle_ = null;
        this.lastDialogLabel_ = null;
        this.lastDialogMessage_ = null;

        this.lastPlayedSound_ = null;

        this.messages_ = [];

        this.gangColor_ = null;
        this.vehicleCollisionsEnabled_ = true;
        this.removedObjectCount_ = 0;
        this.messageLevel_ = 0;

        this.streamerObjectsUpdated_ = false;

        this.connected_ = true;
        this.minimized_ = false;
        this.disconnecting_ = false;

        this.streamUrl_ = null;

        this.vehicle_ = null;
        this.vehicleSeat_ = null;

        this.currentVehicleId_ = null;
        this.currentVehicleSeat_ = 0;

        this.cashMoney_ = 0;
    }

    get id() { return this.id_; }

    isConnected() { return this.connected_; }

    // Returns whether the player is a non-player character.
    isNonPlayerCharacter() { return this.nonPlayerCharacter_; }
    setNonPlayerCharacter(value) { this.nonPlayerCharacter_ = value; }

    isMinimized() { return this.minimized_; }
    setMinimized(minimized) { this.minimized_ = minimized; }

    isDisconnecting() { return this.disconnecting_; }

    notifyDisconnecting() {
        this.disconnecting_ = true;
    }

    notifyDisconnected() {
        this.connected_ = false;
        this.disconnecting_ = false;
    }

    get name() { return this.name_; }
    set name(value) { this.name_ = value; }

    get ip() { return this.ipAddress_; }

    get level() { return this.level_; }
    set level(value) { this.level_ = value; }

    get levelIsTemporary() { return this.levelIsTemporary_; }
    set levelIsTemporary(value) { this.levelIsTemporary_ = value; }

    get syncedData() { return this.syncedData_; }

    isAdministrator() {
        return this.level_ == Player.LEVEL_ADMINISTRATOR ||
               this.level_ == Player.LEVEL_MANAGEMENT;
    }

    isTemporaryAdministrator() {
        return this.isAdministrator() && this.levelIsTemporary_;
      }

    isManagement() { return this.level_ == Player.LEVEL_MANAGEMENT; }

    isUndercover() { return this.undercover_; }

    isRconAdmin() { return this.rconAdmin_; }
    setRconAdmin(value) { this.rconAdmin_ = value; }

    isRegistered() { return this.userId_ != null; }

    get userId() { return this.userId_; }

    // Returns whether this player is a VIP member of Las Venturas Playground.
    isVip() { return this.vip_; }

    // Sets whether the player is a VIP member. Only exposed for testing purposes.
    setVip(value) { this.vip_ = value; }

    // Gets or sets the Id of the gang this player is part of.
    get gangId() { return this.gangId_; }
    set gangId(value) { this.gangId_ = value; }

    // Gets or sets the interior the player is part of. Moving them to the wrong interior will mess up
  // their visual state significantly, as all world objects may disappear.
    get interiorId() { return this.interiorId_; }
    set interiorId(value) { this.interiorId_ = value; }

    // Gets or sets the virtual world the player is part of.
    get virtualWorld() { return this.virtualWorld_; }
    set virtualWorld(value) {
        if (this.syncedData_.isIsolated())
          return;

        this.virtualWorld_ = value;
    }

    // Gets or sets the position of this player.
    get position() { return this.position_; }
    set position(value) {
        this.position_ = value;

        // Fake a state change if the player is currently in a vehicle.
        if (this.vehicle_ != null) {
            server.playerManager.onPlayerStateChange({
                playerid: this.id_,
                oldstate: this.vehicleSeat_ === Vehicle.SEAT_DRIVER ? Player.STATE_DRIVER
                                                                    : Player.STATE_PASSENGER,
                newstate: Player.STATE_ON_FOOT
            });
        }

        // Fake pickup events if the player happened to have stepped in a pickup.
        server.pickupManager.onPlayerPositionChanged(this);
    }

    // Gets or sets the health of the player.
    get health() { return this.health_ }
    set health(value) { this.health_ = value; }

    // Gets or sets the armour level of the player.
    get armour() { return this.armour_; }
    set armour(value) { this.armour_ = value; }

    // Gets the vehicle the player is currently driving in. May be NULL.
    get vehicle() { return this.vehicle_; }

    // Gets the seat in the |vehicle| the player is currently sitting in. May be NULL when the player
    // is not driving a vehicle. May be one of the Vehicle.SEAT_* constants.
    get vehicleSeat() { return this.vehicleSeat_; }

    // Returns the Id of the vehicle the player is currently driving in, or the ID of the seat in
    // which the player is sitting whilst driving the vehicle. Should only be used by the manager.
    findVehicleId() { return this.currentVehicleId_; }
    findVehicleSeat() { return this.currentVehicleSeat_; }

    // Makes the player enter the given |vehicle|, optionally in the given |seat|.
    enterVehicle(vehicle, seat = 0 /* driver */) {
        this.currentVehicleId_ = vehicle.id;
        this.currentVehicleSeat_ = seat;

        global.dispatchEvent('playerstatechange', {
            playerid: this.id_,
            oldstate: Player.STATE_ON_FOOT,
            newstate: seat === 0 ? Player.STATE_DRIVER
                                 : Player.STATE_PASSENGER
        });

        return true;
    }

    // Kicks the player from the server. The user of this function is responsible for making sure
    // that the reason for the kick is properly recorded.
    kick() { this.disconnect(2 /* reason */); }

    // Gets or sets the special action the player is currently engaged in. The values must be one of
    // the Player.SPECIAL_ACTION_* constants static to this class.
    get specialAction() { return this.specialAction_; }
    set specialAction(value) { this.specialAction_ = value; }

    // Clears the animations applied to the player.
    clearAnimations() {}

    // Gets or sets whether vehicle collisions should be enabled for this player.
    get vehicleCollisionsEnabled() { return this.vehicleCollisionsEnabled_; }
    set vehicleCollisionsEnabled(value) { this.vehicleCollisionsEnabled_ = value; }

    // Fake implementation of the ShowPlayerDialog() native. Used to be able to mock responses to
    // dialogs and make that entire sub-system testable as well.
    showDialog(dialogId, style, caption, message, leftButton, rightButton) {
        this.lastDialogId_ = dialogId;
        this.lastDialogTitle_ = caption;
        this.lastDialogStyle_ = style;
        this.lastDialogLabel_ = rightButton;
        this.lastDialogMessage_ = message;

        this.dialogPromiseResolve_();
    }

    // Gets the most recent message that has been displayed in a dialog to the player.
    get lastDialog() { return this.lastDialogMessage_; }
    get lastDialogTitle() { return this.lastDialogTitle_; }
    get lastDialogStyle() { return this.lastDialogStyle_; }
    get lastDialogLabel() { return this.lastDialogLabel_; }

    // Sends |message| to the player. It will be stored in the local messages array and can be
    // retrieved through the |messages| getter.
    sendMessage(message, ...args) {
        if (message instanceof Message)
            message = Message.format(message, ...args);

        if (message.length <= 144) // SA-MP-implementation does not send longer messages
            this.messages_.push(message.toString());
    }

    // Clears the messages that have been sent to this player.
    clearMessages() { this.messages_ = []; }

    // Gets the messages that have been sent to this player.
    get messages() { return this.messages_; }

    // Sets whether the player should be in spectator mode. Disabling spectator mode will force them
    // to respawn immediately after, which may be an unintended side-effect.
    setSpectating(spectating) {}

    // Sets the player's camera to |position| and |target|, both of which must be vectors.
    setCamera(position, target) {}

    // Interpolates the player's camera from |positionFrom|, |targetFrom| to |positionTo|, |targetTo|,
    // which must be vectors, in |duration| milliseconds.
    interpolateCamera(positionFrom, positionTo, targetFrom, targetTo, duration) {}

    // Resets the player camera to its default behaviour.
    resetCamera() {}

    // Serializes the player's current state into a buffer.
    serializeState() {}

    // Restores the player's previous state from a buffer.
    restoreState() {}

    // Plays the audio stream at |streamUrl| for the player.
    playAudioStream(streamUrl) { this.streamUrl_ = streamUrl; }

    // Stops the playback of any audio stream for the player.
    stopAudioStream() { this.streamUrl_ = null; }

    // For testing: gets the URL of the audio stream the player is currently listening to.
    get streamUrl() { return this.streamUrl_; }

    // Fake playing a sound for this player. Stores the soundId in |lastPlayedSound_|.
    playSound(soundId) {
        this.lastPlayedSound_ = soundId;
    }

    // Removes default game objects from the map of model |modelId| that are within |radius| units
    // of the |position|. Should be called while the player is connecting to the server.
    removeGameObject(modelId, position, radius) {
        this.removedObjectCount_++;
    }

    // Gets the number of objects that have been removed from the map for this player.
    get removedObjectCount() { return this.removedObjectCount_; }

    // Gets the most recently played sound for this player.
    get lastPlayedSound() { return this.lastPlayedSound_; }

    // Gets or sets the message level at which this player would like to receive messages.
    get messageLevel() { return this.messageLevel_; }
    set messageLevel(value) { this.messageLevel_ = value; }

    // Returns the vehicle the player is currently driving in, when the player is in a vehicle and
    // the vehicle is owned by the JavaScript code.
    currentVehicle() { return null; }

    // Gets or sets the gang color of this player. May be NULL when no color has been defined.
    get gangColor() { return this.gangColor_; }
    set gangColor(value) { this.gangColor_ = value; }

    // Gets the color applied to this player.
    get color() { return Color.WHITE; }

    // Respawns the player.
    respawn() {
        let defaultPrevented = false;

        global.dispatchEvent('playerspawn', {
            preventDefault: () => defaultPrevented = true,
            playerid: this.id_
        });

        return defaultPrevented;
    }

    // Identifies the player to a fake account. The options can be specified optionally.
    identify({ userId = 42, vip = 0, gangId = 0, undercover = 0 } = {}) {
        server.playerManager.onPlayerLogin({
            playerid: this.id_,
            userid: userId,
            vip: vip,
            gangid: gangId,
            undercover: undercover
        });
    }

    // Issues |message| as if it has been said by this user. Returns whether the event with which
    // the chat message had been issues was prevented.
    issueMessage(message) {
        let defaultPrevented = false;

        // TODO(Russell): Should this talk directly to the CommunicationManager?
        global.dispatchEvent('playertext', {
            preventDefault: () => defaultPrevented = true,

            playerid: this.id_,
            text: message
        });

        return defaultPrevented;
    }

    // Issues |commandText| as if it had been send by this player. Returns whether the event with
    // which the command had been issued was prevented.
    async issueCommand(commandText) {
        let defaultPrevented = false;

        await server.commandManager.onPlayerCommandText({
            preventDefault: () => defaultPrevented = true,

            playerid: this.id_,
            cmdtext: commandText
        });

        return defaultPrevented;
    }

    // Responds to an upcoming dialog with the given values. The dialog Id that has been shown
    // for the player will be inserted automatically. Responses are forcefully asynchronous.
    respondToDialog({ response = 1 /* left button */, listitem = 0, inputtext = '' } = {}) {
        return this.dialogPromise_.then(() => {
            global.dispatchEvent('dialogresponse', {
                playerid: this.id_,
                dialogid: this.lastDialogId_,
                response: response,
                listitem: listitem,
                inputtext: inputtext
            });

            return this.dialogPromise_ = new Promise(resolve => {
                this.dialogPromiseResolve_ = resolve;
            });
        });
    }

    // Makes the player leave the vehicle they're currently in.
    leaveVehicle() {
        if (!this.vehicle_)
            return false;

        global.dispatchEvent('playerstatechange', {
            playerid: this.id_,
            oldstate: this.vehicleSeat_ === 0 ? Player.STATE_DRIVER
                                              : Player.STATE_PASSENGER,
            newstate: Player.STATE_ON_FOOT
        });

        return true;
    }

    // Changes the player's state from |oldState| to |newState|.
    changeState({ oldState, newState } = {}) {
        global.dispatchEvent('playerstatechange', {
            playerid: this.id_,
            oldstate: oldState,
            newstate: newState
        });
    }

    // Triggers an event indicating that the player died.
    die(killerPlayer = null, reason = 0) {
        global.dispatchEvent('playerdeath', {
            playerid: this.id_,
            killerid: killerPlayer ? killerPlayer.id
                                   : Player.INVALID_ID,
            reason: reason
        });
    }

    // Makes this player fire a shot. All related events will be fired. The |target| may either be
    // a Player or a Vehicle instance, or NULL when the shot didn't hit anything.
    shoot({ target = null, weaponid = 28 /* Uzi */, hitOffset = null, damageAmount = null,
            bodypart = 3 /* BODY_PART_CHEST */ } = {}) {
        let hitType = 0 /* BULLET_HIT_TYPE_NONE */;

        if (target instanceof MockPlayer)
            hitType = 1 /* BULLET_HIT_TYPE_PLAYER */;
        else if (target instanceof MockVehicle)
            hitType = 2 /* BULLET_HIT_TYPE_VEHICLE */;

        hitOffset = hitOffset || new Vector(5, 5, 2);

        global.dispatchEvent('playerweaponshot', {
            playerid: this.id_,
            weaponid: weaponid,
            hittype: hitType,
            hitid: target ? target.id : -1,
            fX: hitOffset.x,
            fY: hitOffset.y,
            fZ: hitOffset.z
        });

        if (!(target instanceof MockPlayer))
            return;

        let damage = damageAmount || Math.floor(Math.random() * 100) + 10;

        global.dispatchEvent('playergivedamage', {
            playerid: this.id_,
            damagedid: target.id,
            amount: damage,
            weaponid: weaponid,
            bodypart: bodypart
        });

        global.dispatchEvent('playertakedamage', {
            playerid: target.id,
            issuerid: this.id_,
            amount: damage,
            weaponid: weaponid,
            bodypart: bodypart
        });
    }

    // Makes this player press a particular key. The value of both |newkeys| and |oldkeys| can be
    // found on the SA-MP wiki: https://wiki.sa-mp.com/wiki/Keys
    keyPress(newkeys, oldkeys = 0) {
        global.dispatchEvent('playerkeystatechange', {
            playerid: this.id_,
            newkeys: newkeys,
            oldkeys: oldkeys
        });
    }

    // Disconnects the player from the server. They will be removed from the PlayerManager too.
    disconnect(reason = 0) {
        server.playerManager.onPlayerDisconnect({
            playerid: this.id_,
            reason: reason
        });
    }

    // Tells the test whether the player is in a vehicle
    isInVehicle() {
        return this.currentVehicle() != null;
    }

    updateStreamerObjects() { this.streamerObjectsUpdated_ = true; }

    streamerObjectsUpdated() { return this.streamerObjectsUpdated_; }

    get cashMoney() { return this.cashMoney_; }
    giveCashMoney(amount) { this.cashMoney_ += amount;}
}

export default MockPlayer;
