// Copyright 2006-2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the GPLv2 license, a copy of which can
// be found in the LICENSE file.

/**
 * The MuteCommands class gives admins/(mods the ability to (un)mute players when necessary. It also
 * carries a command to show a list of current muted players.
 *
 * @author Max "Cake" Blokker <cake@sa-mp.nl>
 */
class MuteCommands {
    /**
     * Administrators can use /mute to mute players. They can specify a certain
     * amount of minutes, or just go for the permanent mute. Both the player and
     * staff is informed about this action.
     * 
     * @param playerId Id of the player who typed the command.
     * @param player Id or name of the player who needs to be muted.
     * @param duration The amount of minutes to mute the player. Optional, default = permanent.
     * @command /mute [player] [duration=3 (-1 = permanent)]
     */
    @command("mute")
    public onMuteCommand(playerId, params[]) {
        if (Player(playerId)->isAdministrator() == false)
            return 0;

        if (Command->parameterCount(params) == 0) {
            SendClientMessage(playerId, Color::Information, "Usage: /mute [player] [duration=2 (-1 = permanent)]");
            SendClientMessage(playerId, Color::Information, "  When no duration is given, the player will be muted permanently.");
            return 1;
        }

        new offenderId = Command->playerParameter(params, 0, playerId);
        if (offenderId == Player::InvalidId)
            return 1;

        if (MuteManager->isMuted(offenderId) == true) {
            SendClientMessage(playerId, Color::Error, "This player is already muted.");
            return 1;
        }

        new duration = 2 /* default value */;
        if (Command->parameterCount(params) >= 2) {
            duration = Command->integerParameter(params, 1);
            if (duration < -1 || duration > 300)
                duration = 2;
        }

        MuteManager->mutePlayer(offenderId, duration);

        new message[128];
        if (duration == -1) {
            format(message, sizeof(message), "The player %s (Id:%d) will be muted permanently.",
                Player(offenderId)->nicknameString(), offenderId);
            SendClientMessage(playerId, Color::Success, message);

            format(message, sizeof(message), "%s (Id:%d) muted %s (Id:%d) permanently.",
                Player(playerId)->nicknameString(), playerId, Player(offenderId)->nicknameString(), offenderId);
            Admin(playerId, message);
        } else {
            format(message, sizeof(message), "The player %s (Id:%d) will be muted for %d minute(s).",
                Player(offenderId)->nicknameString(), offenderId, duration);
            SendClientMessage(playerId, Color::Success, message);

            format(message, sizeof(message), "%s (Id:%d) muted %s (Id:%d) for %d minute(s).",
                Player(playerId)->nicknameString(), playerId, Player(offenderId)->nicknameString(), offenderId, duration);
            Admin(playerId, message);
        }

        return 1;
    }

    /**
     * If a player has been accidentially muted or staff decides to unmute this player, we offer the
     * /unmute command.
     * 
     * @param playerId Id of the player who typed the command.
     * @param player Id or name of the player who needs to be unmuted.
     * @command /unmute [player]
     */
    @command("unmute")
    public onUnmuteCommand(playerId, params[]) {
        if (Player(playerId)->isAdministrator() == false)
            return 0;

        if (Command->parameterCount(params) != 1) {
            SendClientMessage(playerId, Color::Information, "Usage: /unmute [player]");
            return 1;
        }

        new offenderId = Command->playerParameter(params, 0, playerId);
        if (offenderId == Player::InvalidId) {
            return 1;
        }

        if (MuteManager->isMuted(offenderId) == false) {
            SendClientMessage(playerId, Color::Information, "This player is not muted at the moment.");
            return 1;
        }

        MuteManager->unmutePlayer(offenderId);

        new message[128];
        format(message, sizeof(message), "The player %s (Id:%d) will be unmuted.",
            Player(offenderId)->nicknameString(), offenderId);
        SendClientMessage(playerId, Color::Success, message);

        format(message, sizeof(message), "%s (Id:%d) unmuted %s (Id:%d).",
            Player(playerId)->nicknameString(), playerId, Player(offenderId)->nicknameString(), offenderId);
        Admin(playerId, message);

        return 1;
    }

    /**
     * To list all muted players, administrators can use /muted.
     * 
     * @param playerId Id of the player who typed the command.
     * @param params Any further text that the player passed to the command. Unused.
     * @command /muted
     */
    @command("muted")
    public onMutedCommand(playerId, params[]) {
        if (Player(playerId)->isAdministrator() == false)
            return 0;

        SendClientMessage(playerId, Color::Information, "Current muted players:");

        new message[128], displayed = 0, durationText[10];
        for (new player = 0; player <= PlayerManager->highestPlayerId(); player++) {
            if (Player(player)->isConnected() && !Player(player)->isNonPlayerCharacter()) {
                if (MuteManager->isMuted(player) == true) {
                    if (MuteManager->muteDuration(player) == -1)
                        format(message, sizeof(message), " %s (Id:%d) - {33CCFF}pemanent{FFFFFF}.",
                            Player(player)->nicknameString(), player);
                    else {
                        Time->formatRemainingTime(MuteManager->muteDuration(player), durationText,
                            sizeof(durationText), /** force minutes **/ true);
                        format(message, sizeof(message), " %s (Id:%d) - {33CCFF}%s minutes remaining{FFFFFF}.",
                            Player(player)->nicknameString(), player, durationText);
                    }

                    SendClientMessage(playerId, Color::Information, message);
                    ++displayed;
                }
            }
        }

        if (displayed == 0)
            SendClientMessage(playerId, Color::Information, " There aren't any muted players at the moment..");

        return 1;
        #pragma unused params
    }
};
