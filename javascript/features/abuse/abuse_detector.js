// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Base class for an abuse detector. Multiple detectors are available for specific types of abuse,
// each of which is specifically crafted towards detecting just that. Any method can be overridden.
export class AbuseDetector {
    // Certainty levels associated with a detection. |kFunnyFeeling| means that it's something that
    // in-game administrators should monitor. |kSuspected| means that we're reasonably certain, but
    // that verification is still in place. |kDetected| is a no-doubt detection.
    static kFunnyFeeling = 0;
    static kSuspected = 1;
    static kDetected = 2;

    monitor_ = null;
    name_ = null;

    constructor(monitor, name) {
        this.monitor_ = monitor;
        this.name_ = name;
    }

    // To be called when abuse has been detected. All information regarding the report will be given
    // to the AbuseMonitor, who will take care of the rest.
    report(player, certainty = AbuseDetector.kFunnyFeeling) {
        this.monitor_.reportAbuse(player, this.name_, certainty);
    }

    // ---------------------------------------------------------------------------------------------

    // Called after the |player| has entered the given |vehicle|.
    onPlayerEnterVehicle(player, vehicle) {}

    // Called when the |player| has reported taking damage. The |issuer| may be NULL.
    onPlayerTakeDamage(player, issuer, weaponId, amount, bodyPart) {}

    // Called when the |player| has fired their weapon having |weaponId|, where the hit registered
    // at the given |hitPosition|. The |hitPlayer| or |hitVehicle| will be set when available.
    onPlayerWeaponShot(player, weaponId, hitPosition, { hitPlayer, hitVehicle } = {}) {}

    // ---------------------------------------------------------------------------------------------

    dispose() {}
}