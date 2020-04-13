// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import AnnounceManager from 'features/announce/announce_manager.js';

let configurationCache = null;

describe('AnnounceManager', (it, beforeEach, afterEach) => {
    let announceManager = null;

    beforeEach(() => announceManager = new AnnounceManager());

    function assertSendEchoMessage(assert, message) {
        if (!configurationCache)
            configurationCache = JSON.parse(readFile('announce.json'));
        
        assert.pawnCall('SendEchoMessage', {
            args: [
                configurationCache.ip,
                configurationCache.port,
                message
            ]
        });
    }

    it('should announce new minigames to players', assert => {
        const gunther = server.playerManager.getById(0 /* Gunther */);

        const name = 'Hello Kitty Playground';
        const command = '/hko';
        const price = 25000;

        announceManager.announceMinigame(gunther, name, command, price);

        assert.equal(gunther.messages.length, 1);
        assert.equal(gunther.messages[0],
                     Message.format(Message.ANNOUNCE_MINIGAME, name, command));
    });

    it('should announce minigame participation to players', async assert => {
        const gunther = server.playerManager.getById(0 /* Gunther */);

        const name = 'Hello Kitty Playground';
        const command = '/hko';

        announceManager.announceMinigameParticipation(gunther, name, command);

        // Verify that a call to Pawn will be issued as a microtask to avoid reentrancy issues.
        {
            assert.noPawnCall('OnDisplayNewsMessage');
            await Promise.resolve();
            assert.pawnCall('OnDisplayNewsMessage');
        }

        assert.equal(gunther.messages.length, 0);

        // TODO(Russell): Test the message through the news controller when possible.

        assertSendEchoMessage(
            assert,
            '[announce] ' + Message.format(Message.ANNOUNCE_MINIGAME_JOINED_IRC,
                                           gunther.name, gunther.id, name));
    });

    it('should distribute messages to players', assert => {
        const gunther = server.playerManager.getById(0 /* Gunther */);
        const russell = server.playerManager.getById(1 /* Russell */);

        announceManager.announceToPlayers('Hello, world!');

        assert.equal(gunther.messages.length, 1);
        assert.equal(gunther.messages[0], Message.format(Message.ANNOUNCE_ALL, 'Hello, world!'));

        assert.equal(russell.messages.length, 1);
        assert.equal(russell.messages[0], Message.format(Message.ANNOUNCE_ALL, 'Hello, world!'));

        assertSendEchoMessage(assert, '[announce] Hello, world!');
    });

    it('should distribute messages to administrators', assert => {
        const gunther = server.playerManager.getById(0 /* Gunther */);
        const russell = server.playerManager.getById(1 /* Russell */);

        russell.level = Player.LEVEL_ADMINISTRATOR;

        announceManager.announceToAdministrators('Hello, admins!');

        assert.equal(gunther.messages.length, 0);

        assert.equal(russell.messages.length, 1);
        assert.equal(russell.messages[0],
                     Message.format(Message.ANNOUNCE_ADMINISTRATORS, 'Hello, admins!'));

        assertSendEchoMessage(assert, '[admin] Hello, admins!');
    });

    it('should distribute reports to administrators', assert => {
        const gunther = server.playerManager.getById(0 /* Gunther */);
        const russell = server.playerManager.getById(1 /* Russell */);
        const lucy    = server.playerManager.getById(2 /* Lucy */);

        russell.level = Player.LEVEL_ADMINISTRATOR;

        announceManager.announceReportToAdministrators(lucy, gunther, 'much moneyz');

        assert.equal(gunther.messages.length, 0);

        assert.equal(russell.messages.length, 1);
        assert.equal(russell.messages[0],
            Message.format(Message.ANNOUNCE_REPORT, lucy.name, lucy.id, gunther.name, gunther.id,
                           'much moneyz'));

        assert.equal(lucy.messages.length, 0);
        assertSendEchoMessage(assert, '[report] Lucy 2 Gunther 0 much moneyz');
    });

    it('should distribute messages to IRC', assert => {
        announceManager.announceToIRC('tag');
        announceManager.announceToIRC('hello', 'world', 25, [1, 2, 3], {});

        assertSendEchoMessage(assert, '[tag] ');
        assertSendEchoMessage(assert, '[hello] world 25 1,2,3 [object Object]');
    });
});
