// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { CollectableBase } from 'features/collectables/collectable_base.js';
import { CollectableDatabase } from 'features/collectables/collectable_database.js';

// Title of the notification that will be shown to the player upon tagging a spray tag.
const kNotificationTitle = 'tagged!';

// File (JSON) in which all the spray tags have been stored. Each has a position and a rotation.
const kSprayTagsDataFile = 'data/collectables/spray_tags.json';

// Distances, in in-game units, between the player and the position they're spraying, and the
// maximum distance between that position and the spray tag itself.
const kSprayTargetDistance = 2;
const kSprayTargetMaximumDistance = 3;

// Model Ids for the spray tags, depending on whether they're tagged or untagged.
export const kSprayTagTaggedModelId = 18659;
export const kSprayTagUntaggedModelId = 18664;

// Implements the SprayTag functionality, where players have to find the spray tags (usually on the
// walls) and spray them in order to collect them. Detection of the spray action is done in Pawn.
export class SprayTags extends CollectableBase {
    collectables_ = null;
    manager_ = null;

    // Map from |player| to set of GameObject instances for all their personal tags.
    playerTags_ = null;

    constructor(collectables, manager) {
        super({ mapIconType: 63 /* Pay 'n' Spray */ });

        this.collectables_ = collectables;
        this.manager_ = manager;

        this.playerTags_ = new Map();

        // native ProcessSprayTagForPlayer(playerid);
        provideNative(
            'ProcessSprayTagForPlayer', 'i',
            SprayTags.prototype.processSprayTagForPlayer.bind(this));
    }

    // ---------------------------------------------------------------------------------------------
    // CollectableBase implementation:
    // ---------------------------------------------------------------------------------------------

    // Called when the collectables have to be initialized. The data file lists them all, with two
    // vectors per spray tag, one for position, one for rotation.
    initialize() {
        const data = JSON.parse(readFile(kSprayTagsDataFile));

        for (const sprayTag of data) {
            this.addCollectable(sprayTag.id, {
                position: new Vector(...sprayTag.position),
                rotation: new Vector(...sprayTag.rotation),
            });
        }
    }

    // Clears all the collectables for the given |player|, generally because they've left the server
    // or, for some other reason, should not participate in the game anymore.
    clearCollectablesForPlayer(player) {
        if (!this.playerTags_.has(player))
            return;  // the |player| hasn't had their state initialized
        
        const tags = this.playerTags_.get(player);
        for (const tag of tags.keys())
            tag.dispose();
        
        this.playerTags_.delete(player);

        // Prune the scoped entities to get rid of references to deleted objects.
        this.entities.prune();
    }

    // Called when the collectables for the |player| have to be refreshed because (a) they've joined
    // the server as a guest, (b) they've identified to their account, or (c) they've started a new
    // round of collectables and want to collect everything again.
    refreshCollectablesForPlayer(player, collected) {
        if (this.playerTags_.has(player))
            this.clearCollectablesForPlayer(player);
        
        const tags = new Map();
        for (const [ sprayTagId, { position, rotation } ] of this.getCollectables()) {
            const modelId = collected.has(sprayTagId) ? kSprayTagTaggedModelId
                                                      : kSprayTagUntaggedModelId;

            const tag = this.entities.createObject({
                modelId, position, rotation,

                interiorId: 0,  // main world
                virtualWorld: 0,  // main world
                playerId: player.id,
            });

            tags.set(tag, sprayTagId);
        }

        this.playerTags_.set(player, tags);
    }

    // ---------------------------------------------------------------------------------------------

    // Called when a spray tag has to be processed for the given |playerid|. When they're close
    // enough to an uncollected tag, and are facing it, it will be marked as collection.
    processSprayTagForPlayer(playerid) {
        const player = server.playerManager.getById(playerid);
        if (!player)
            return;  // the |player| is not connected to the server, an invalid event
        
        if (!this.playerTags_.has(player))
            return;  // the |player| hasn't had their state initialized
        
        const kTotalSprayTags = this.getCollectableCount();

        const playerPosition = player.position;
        const playerRotation = player.rotation;

        const target = playerPosition.translateTo2D(kSprayTargetDistance, playerRotation);
        const tags = this.playerTags_.get(player);

        for (const [ tag, sprayTagId ] of tags) {
            if (tag.modelId === kSprayTagTaggedModelId)
                continue;  // this |tag| has already been collected
            
            const { position, rotation } = this.getCollectable(sprayTagId);
            if (position.distanceTo(target) > kSprayTargetMaximumDistance)
                continue;  // this |tag| is too far away
            
            let remaining = this.countRemainingTagsForPlayer(player);
            let message = null;

            // Compose an appropriate message to show to the player now that they've tagged a
            // particular Spray Tag. This depends on how many tags they've got remaining.
            switch (remaining) {
                case 0:
                    message = `all Spray Tags have been tagged!`;
                    break;
                case 1:
                    message = 'only one more tag to go...';
                    break;
                default:
                    message = `${kTotalSprayTags - remaining} / ${kTotalSprayTags}`;
                    break;
            }

            // Show a notification to the player about the Spray Tags they've collected.
            this.manager_.showNotification(player, kNotificationTitle, message);
    
            // Mark the collectable as having been collected, updating the |player|'s stats.
            this.manager_.markCollectableAsCollected(
                player, CollectableDatabase.kSprayTag, sprayTagId);

            // Delete the |tag|, since the player will no longer be needing it. Instead, we create
            // a new tag in the same position with the |kSprayTagTaggedModelId|.
            tag.dispose();

            const completedTag = this.entities.createObject({
                modelId: kSprayTagTaggedModelId,
                position, rotation,

                interiorId: 0,  // main world
                virtualWorld: 0,  // main world
                playerId: player.id,
            });

            tags.set(completedTag, sprayTagId);
            tags.delete(tag);
            break;
        }
    }

    // Counts the number of tags |player| still has to find before finishing the Spray Tag game.
    countRemainingTagsForPlayer(player) {
        if (!this.playerTags_.has(player))
            return;  // the |player| hasn't had their state initialized
        
        let count = 0;

        for (const tag of this.playerTags_.get(player).keys()) {
            if (tag.modelId !== kSprayTagTaggedModelId)
                ++count;
        }

        return count;
    }

    // ---------------------------------------------------------------------------------------------

    dispose() {
        super.dispose();

        provideNative('ProcessSprayTagForPlayer', 'i', (playerid) => 0);
    }
}