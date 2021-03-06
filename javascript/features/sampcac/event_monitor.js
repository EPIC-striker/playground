// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { SAMPCACEventObserver } from 'components/events/sampcac_event_observer.js';

import { format } from 'base/format.js';

// Monitors incoming events from SAMPCAC and deals with them appropriately. Is fed events from the
// DeferredEventManager, as none of them are either time-critical or cancelable.
export class EventMonitor extends SAMPCACEventObserver {
    constructor() {
        super();

        server.deferredEventManager.addObserver(this);
    }

    // ---------------------------------------------------------------------------------------------
    // SAMPCACEventObserver implementation:
    // ---------------------------------------------------------------------------------------------

    // Called when the |player| has been detected to use the given |cheatId|. Additional information
    // and specifics could be found in |option1| and |option2|.
    onPlayerCheatDetected(player, cheatId, option1, option2) {
        console.log(`[sampcac] Detected ${player.name}: ${cheatId} (${option1}, ${option2})`);
    }

    // Called when the |modelId| for the |player| has been modified. The |checksum| identifies what
    // the actual value is, in case we might want to whitelist it.
    onPlayerGameResourceMismatch(player, modelId, componentType, checksum) {
        console.log(
            `[sampcac] Mismatch for ${player.name} for model ${modelId} (${componentType}, ` +
            `${checksum})`)
    }

    // Called when the |player| has been kicked for the given |reason|.
    onPlayerKicked(player, reason) {
        console.log(`[sampcac] Kicked ${player.name} for: ${reason}`);
    }

    // Called when the memory at the given |address| has been read in their GTA_SA.exe memory space,
    // with the actual memory contents being written to |buffer| as an Uint8Buffer.
    onPlayerMemoryRead(player, address, buffer) {
        console.log(format('[sampcac] Memory for %s at 0x%06X: [ %s ]', player.name, address,
            [ ...buffer ].map(byte => format('0x%02X', byte)).join(', ')));
    }

    // Called when the |player| has taken a screenshot.
    onPlayerScreenshotTaken(player) {
        console.log(`[sampcac] Player ${player.name} took a screenshot.`);
    }

    // ---------------------------------------------------------------------------------------------

    dispose() {
        server.deferredEventManager.removeObserver(this);
    }
}
