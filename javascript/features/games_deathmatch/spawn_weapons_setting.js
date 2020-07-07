// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { GameCustomSetting } from 'features/games/game_custom_setting.js';
import { Menu } from 'components/menu/menu.js';

// Map of all the spawn weapons with their default ammunition numbers that are available.
const kSpawnWeapons = new Map([
    [  1, { name: 'Brass Knuckles', category: 'Melee weapons', ammo: 1 } ],
    [  2, { name: 'Golf Club', category: 'Melee weapons', ammo: 1 } ],
    [  3, { name: 'Nightstick', category: 'Melee weapons', ammo: 1 } ],
    [  4, { name: 'Knife', category: 'Melee weapons', ammo: 1 } ],
    [  5, { name: 'Baseball Bat', category: 'Melee weapons', ammo: 1 } ],
    [  6, { name: 'Shovel', category: 'Melee weapons', ammo: 1 } ],
    [  7, { name: 'Pool Cue', category: 'Melee weapons', ammo: 1 } ],
    [  8, { name: 'Katana', category: 'Melee weapons', ammo: 1 } ],
    [  9, { name: 'Chainsaw', category: 'Melee weapons', ammo: 1 } ],
    [ 10, { name: 'Purple Dildo', category: 'Melee weapons', ammo: 1 } ],
    [ 11, { name: 'Dildo', category: 'Melee weapons', ammo: 1 } ],
    [ 12, { name: 'Vibrator', category: 'Melee weapons', ammo: 1 } ],
    [ 13, { name: 'Silver Vibrator', category: 'Melee weapons', ammo: 1 } ],
    [ 14, { name: 'Flowers', category: 'Melee weapons', ammo: 1 } ],
    [ 15, { name: 'Cane', category: 'Melee weapons', ammo: 1 } ],
    [ 16, { name: 'Grenade', category: 'Throwable weapons', ammo: 50 } ],
    [ 17, { name: 'Tear Gas', category: 'Throwable weapons', ammo: 50 } ],
    [ 18, { name: 'Molotov Cocktail', category: 'Throwable weapons', ammo: 50 } ],
    [ 22, { name: 'Colt 45 (9mm)', category: 'Pistols', ammo: 150 } ],
    [ 23, { name: 'Silenced 9mm', category: 'Pistols', ammo: 150 } ],
    [ 24, { name: 'Desert Eagle', category: 'Pistols', ammo: 150 } ],
    [ 25, { name: 'Shotgun', category: 'Shotguns', ammo: 250 } ],
    [ 26, { name: 'Sawnoff Shotgun', category: 'Shotguns', ammo: 250 } ],
    [ 27, { name: 'Combat Shotgun', category: 'Shotguns', ammo: 250 } ],
    [ 28, { name: 'Micro SMG', category: 'Sub-machine guns', ammo: 500 } ],
    [ 29, { name: 'MP5', category: 'Sub-machine guns', ammo: 500 } ],
    [ 30, { name: 'AK-47', category: 'Assault rifles', ammo: 400 } ],
    [ 31, { name: 'M4', category: 'Assault rifles', ammo: 400 } ],
    [ 32, { name: 'Tec-9', category: 'Sub-machine guns', ammo: 500 } ],
    [ 33, { name: 'Country Rifle', category: 'Rifles', ammo: 100 } ],
    [ 34, { name: 'Sniper Rifle', category: 'Rifles', ammo: 100 } ],
    [ 35, { name: 'RPG', category: 'Heavy weapons', ammo: 50 } ],
    [ 36, { name: 'Heat Seaking RPG', category: 'Heavy weapons', ammo: 50 } ],
    [ 37, { name: 'Flamethrower', category: 'Heavy weapons', ammo: 500 } ],
    [ 38, { name: 'Minigun', category: 'Heavy weapons', ammo: 2500 } ],
    [ 41, { name: 'Spraycan', category: 'Miscellaneous', ammo: 250 } ],
    [ 42, { name: 'Fire Extinguisher', category: 'Miscellaneous', ammo: 250 } ],
    [ 46, { name: 'Parachute', category: 'Miscellaneous', ammo: 1 } ],
]);

// Weapon sets that can be purchased wholesale, to help players from having to manually select the
// same weapons over and over again. Should not have more than four or five sets in here.
const kSpawnWeaponSets = new Map([
    [ 'Fun Weapons', [ 10, 41 ] ],
    [ 'Run Weapons', [ 26, 28 ] ],
    [ 'Walk Weapons', [ 24, 31, 34 ] ],
]);

// Represents the ability for players to determine the spawn weapons for this game. Right now all
// players get the same spawn weapons, but this could be further amended in the future. 
export class SpawnWeaponsSetting extends GameCustomSetting {
    // Set of all the valid spawn weapon IDs available in minigames.
    static kSpawnWeaponIds = new Set([ ...kSpawnWeapons.keys() ]);

    // Returns the value that is to be displayed in the generic customization dialog for games.
    getCustomizationDialogValue(currentValue) {
        switch (currentValue.length) {
            case 0:
                return 'None';

            case 1:
            case 2:
                return currentValue.map(spawnWeapon =>
                    kSpawnWeapons.get(spawnWeapon.weapon).name).join(', ');

            default:
                return `${currentValue.length} weapons`;
        }
    }

    // Handles the customization flow for the given |player|. The spawn weapon configuration will
    // be written directly to the given |settings| Map.
    async handleCustomization(player, settings, currentValue) {
        const dialog = new Menu('Spawn weapon selection', [
            'Weapon',
            'Ammo',
        ]);

        // (1) Option to select an individual weapon that should be added.
        dialog.addItem(
            'Select weapon', '-', async () =>
                await this.handleSelectWeapon(player, settings, currentValue));
        
        // (2) Option to replace the full selection with a pre-made weapon set.
        dialog.addItem(
            'Select weapon set', '-', async () =>
                await this.handleSelectWeaponSet(player, settings, currentValue));

        // (3) If weapons have already been selected, list them all here.
        if (currentValue.length) {
            dialog.addItem('----------', '----------');
            for (const { weapon, ammo } of currentValue) {
                dialog.addItem(kSpawnWeapons.get(weapon).name, ammo, async () =>
                    await this.handleWeapon(player, settings, currentValue, weapon, ammo));
            }
        }

        // (4) Display the dialog to the |player|.
        return await dialog.displayForPlayer(player);
    }

    // Handles the ability for the player to manually add an extra weapon to the selection. Weapons
    // that already are included in the |currentValue| will be greyed out instead.
    async handleSelectWeapon(player, settings, currentValue) {

    }

    // Handles the ability for players to replace the full weapon selection with a predefined set
    // of weapons, to avoid the hassle of selecting several weapons manually.
    async handleSelectWeaponSet(player, settings) {
        const dialog = new Menu('Spawn weapon selection', [
            'Package',
            'Weapons',
        ]);

        for (const [ name, weapons ] of kSpawnWeaponSets) {
            const weaponsLabel = weapons.map(weapon => kSpawnWeapons.get(weapon).name).join(', ');
            const listener = () => {
                settings.set('deathmatch/spawn_weapons', weapons.map(weapon => {
                    return { weapon, ammo: kSpawnWeapons.get(weapon).ammo };
                }));
            };

            dialog.addItem(name, weaponsLabel, listener);
        }

        return await dialog.displayForPlayer(player);
    }

    // Handles the ability for players to modify an already selected weapon, either to remove it or
    // to adjust the amount of ammunition that will be granted for it.
    async handleWeapon(player, setting, currentValue, weapon, ammo) {

    }
}
