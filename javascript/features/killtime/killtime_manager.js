// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import ScopedCallbacks from 'base/scoped_callbacks.js';

// Managing killtime, that magic happens here. We need to keep track of who is on top, how many minutes do we still
// have and when we have to stop. At the end we of course want to give out the correct prize to the correct person.
class KilltimeManager {
    // Sets up all the properties needed for the faature including adding an eventlistenter to keep track of the kills.
    constructor(announce, economy, finance) {
        this.announce_ = announce;
        this.economy_ = economy;
        this.finance_ = finance;
        this.isRunning_ = false;
        this.scoreMap_ = new Map();
        this.callbacks_ = new ScopedCallbacks();

        // Translates OnPawnEventName to respectively `onPawnEventName` or `pawneventname`.
        const toMethodName = name => name.charAt(0).toLowerCase() + name.slice(1);
        const toEventName = name => name.slice(2).toLowerCase();

        [
            'OnPlayerDeath',  // { playerid, killerid, reason }
        ].forEach(name =>
            this.callbacks_.addEventListener(toEventName(name), this.__proto__[toMethodName(name)].bind(this)));
    }

    // Sets the killtime running for |minutes|, initializes the map for the scores and announces the killtime-start.
    start(minutes) {
        this.isRunning_ = true;
        this.scoreMap_ = new Map();

        this.announce_().announceToPlayers(Message.KILLTIME_STARTED, minutes);
        this.run(minutes);
    }

    // Keep the killtime running for |totalMinutes|, announces the halftimes and stops it when it's over.
    async run(totalMinutes) {
        let minutesPassedBy = 0;
        while (this.isRunning_) {
            await minutes(1);
            if (!this.isRunning_)
                return;

            minutesPassedBy++;

            if (minutesPassedBy == totalMinutes) {
                this.stop(null);
                return;
            }

            this.announceTopKiller_();
        }
    }

    // Called every minute to announce the killer if someone has a specific amount of kills or nobody.
    announceTopKiller_() {
        const playerName = this.getPlayerWithHighestKillsAmount();
        const mostKillsAmount = this.scoreMap_.get(playerName);

        let playerWithKillsText = playerName + ' with ' + mostKillsAmount + ' kills';
        let prizeMoney = this.economy_().calculateKilltimeAwardPrize(this.scoreMap_.size, this.getTotalKillsAmount_());
        if (playerName == null) {
            playerWithKillsText = 'nobody yet';
        }

        this.announce_().announceToPlayers(Message.KILLTIME_TOPKILLER, playerWithKillsText, prizeMoney);
    }

    // Ends the killtime and announces this to the player. In case this is done by an admin it announces that or because
    // time is up. Clears the properties and announcer the winner.
    stop(player) {
        if (!this.isRunning_)
            return;

        this.isRunning_ = false;
        let stopMessage = Message.KILLTIME_AUTO_STOPPED;

        if (player != null)
            stopMessage = Message.KILLTIME_ADMIN_STOPPED;

        this.announce_().announceToPlayers(stopMessage);
        this.announceWinner_();

        this.scoreMap_.clear();

    }

    // Announces the winner in case someone has a specific amount of kills or nobody.
    announceWinner_() {
        const playerName = this.getPlayerWithHighestKillsAmount();
        const mostKillsAmount = this.scoreMap_.get(playerName);

        let playerWithKillsText = playerName + ' with ' + mostKillsAmount + ' kills';
        let prizeMoney = this.economy_().calculateKilltimeAwardPrize(this.scoreMap_.size, this.getTotalKillsAmount_());
        if (playerName == null)
            playerWithKillsText = 'nobody';

        const prizeMessage = playerName != null ? Message.format(Message.KILLTIME_ENJOY_PRIZE, prizeMoney) : '';
        this.announce_().announceToPlayers(Message.KILLTIME_WINNER, playerWithKillsText, prizeMessage);

        if (playerName == null)
            return;

        const winner = server.playerManager.getByName(playerName);
        this.finance_().givePlayerCash(winner, prizeMoney);
    }

    // Return the plater with the most kills, unless it is found twice. Then there is no winner.
    getPlayerWithHighestKillsAmount() {
        const knownKillsAmountSet = new Set();
        let playerName = null;
        let highestKillsAmount = 0;

        this.scoreMap_.forEach(function (kills, name) {
            if (knownKillsAmountSet.has(kills))
                return null;

            knownKillsAmountSet.add(kills);

            if (kills > highestKillsAmount) {
                highestKillsAmount = kills;
                playerName = name;
            }
        });

        return playerName;
    }

    // Returns the amount of kills made in the killtimesession.
    getTotalKillsAmount_(){
        let totalKillsAmount = 0;

        this.scoreMap_.forEach(function (kills) {
            totalKillsAmount += kills;
        });

        return totalKillsAmount;
    }

    // Keeps track of the amount of kills made during killtime per player.
    onPlayerDeath(event) {
        if (!this.isRunning_)
            return;

        const killer = server.playerManager.getById(event.killerid);
        if (!killer || killer.virtualWorld != 0)
            return;

        let previousKillsAmount = 0;
        if (this.scoreMap_.has(killer.name))
            previousKillsAmount = this.scoreMap_.get(killer.name);

        this.scoreMap_.set(killer.name, previousKillsAmount + 1);
    }

    // Cleans up the state created by this class
    dispose() {
        this.isRunning_ = false;  // disposal means we're out of time to do things

        this.announce_ = null;

        this.economy_ = null;

        this.callbacks_.dispose();
        this.callbacks_ = null;
    }
}

export default KilltimeManager;
