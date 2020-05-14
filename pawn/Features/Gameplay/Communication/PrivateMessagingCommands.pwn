// Copyright 2006-2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the GPLv2 license, a copy of which can
// be found in the LICENSE file.

/**
 * GTA San Andreas offers players a mainchat to collectivly chat with each other. The downside of
 * such a chat is that it isn't private. LVP offers players a way to avoid this by offering several
 * private messaging commands: /pm and /r(eply). For VIPs we have an additional /ircpm command.
 *
 * @author Max "Cake" Blokker <cake@sa-mp.nl>
 */
class PrivateMessagingCommands {
    /**
     * Players can use the /pm command to send private messages to other players. Ofcourse players
     * can only use this if they aren't muted, and if the other player is online and listening!
     * 
     * @param playerId Id of the player who typed the command.
     * @param player Id or name of the player the message is send to.
     * @param message Message that needs to be send.
     * @command /pm [player] [message]
     */
    @command("pm")
    public onPrivateMessageCommand(playerId, params[]) {
        if (Command->parameterCount(params) < 2) {
            SendClientMessage(playerId, Color::Information, "Usage: /pm [player] [message]");
            return 1;
        }

        new receiverId = Command->playerParameter(params, 0, playerId);
        if (receiverId == Player::InvalidId)
            return 1;
        else if (playerId == receiverId) {
            SendClientMessage(playerId, Color::Error, "You can't PM yourself.");
            return 1;
        }

        if (Player(receiverId)->isNonPlayerCharacter() == true) {
            SendClientMessage(playerId, Color::Error, "You can't PM a NPC.");
            return 1;
        }

        if (IsCommunicationMuted() && !Player(playerId)->isAdministrator()) {
            SendClientMessage(playerId, Color::Error, "Sorry, an administrator is making an announcement.");
            return 1;
        }

        // Store sender and correct message offset to send along to our PM manager.
        new sender[25], receiver[25], parameterOffset = 0;
        format(sender, sizeof(sender), "%s", Player(playerId)->nicknameString());
        Command->stringParameter(params, 0, receiver, sizeof(receiver));
        parameterOffset = min(strlen(params), Command->startingIndexForParameter(params, 0)
            + strlen(receiver) + 1);

        // Store the receiver to send along to our PM manager.
        format(receiver, sizeof(receiver), "%s", Player(receiverId)->nicknameString());
        PrivateMessagingManager->sendPrivateMessage(playerId, sender[0], receiverId,
            receiver[0], params[parameterOffset]);

        return 1;
    }

    /**
     * /r(eply) is the fastest way to answer to a private message. It sends the message to the player
     * or IRC user the last message was received from. If it was from an ingame player, we check if
     * he is still online or not. It's impossible to use this command when no one has pm'd
     * our player yet!
     * 
     * @param playerId Id of the player who typed the command.
     * @param message Message that needs to be send.
     * @command /r(eply) [message]
     */
    @command("r", "reply")
    public onReplyCommand(playerId, params[]) {
        if (Command->parameterCount(params) < 1) {
            SendClientMessage(playerId, Color::Information, "Usage: /r [message]");
            return 1;
        }

        // Check if the player is chatting with an ingame/IRC user. If so, let the player use /r
        // to continue the conversation without a respond.
        new lastMessageSenderName[25];
        format(lastMessageSenderName, sizeof(lastMessageSenderName), "%s",
            PrivateMessagingManager->lastPrivateMessageSenderName(playerId));
        if (!strlen(lastMessageSenderName)) {
            SendClientMessage(playerId, Color::Error, "You aren't private chatting with anyone yet!");
            return 1;
        }

        if (IsCommunicationMuted() && !Player(playerId)->isAdministrator()) {
            SendClientMessage(playerId, Color::Error, "Sorry, an administrator is making an announcement.");
            return 1;
        }

        // If the player is already chatting, the /r will function. Time to split up our communcation
        // here for the ingame and IRC part.
        if (PrivateMessagingManager->lastPrivateMessageSenderId(playerId) != Player::InvalidId) {
            // We've saved the Id of the player who contacted us, so we can use that for further
            // nickname checking. You don't want to PM someone with the same Id but a different name.
            new lastMessageSenderId = PrivateMessagingManager->lastPrivateMessageSenderId(playerId),
                currentMessageSenderName[25];

            // Retrieve the current username attached to the Id of the last sender.
            format(currentMessageSenderName, sizeof(currentMessageSenderName), "%s",
                Player(lastMessageSenderId)->nicknameString());

            // Comparison: if the usernames match, we can assume it's safe to use /r(eply).
            if (strcmp(lastMessageSenderName, currentMessageSenderName, false) != 0 ||
                Player(lastMessageSenderId)->isConnected() == false) {
                SendClientMessage(playerId, Color::Error, "This player has logged off.");
                return 1;
            }

            new sender[25];
            format(sender, sizeof(sender), "%s", Player(playerId)->nicknameString());

            PrivateMessagingManager->sendPrivateMessage(playerId, sender[0], lastMessageSenderId,
                currentMessageSenderName[0], params[1]);
        } else {
            if (Player(playerId)->isVip() == false) {
                SendClientMessage(playerId, Color::Error, "The last user who PM'd you, is an IRC user, IRC PM'ing is a VIP feature!");
                SendClientMessage(playerId, Color::Error, "Since you're not a VIP, you can't use /r to send a message back.");
                SendClientMessage(playerId, Color::Error, "For more information, check out /donate!");
                return 1;
            }

            new sender[25];
            format(sender, sizeof(sender), "%s", Player(playerId)->nicknameString());

            PrivateMessagingManager->sendPrivateIrcMessage(playerId, sender[0], lastMessageSenderName[0], params[1]);
        }

        return 1;
    }
};
