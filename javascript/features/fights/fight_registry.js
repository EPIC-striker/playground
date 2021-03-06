// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { CommandBuilder } from 'components/command_manager/command_builder.js';
import { FightGame } from 'features/fights/fight_game.js';
import { FightLocationDescription } from 'features/fights/fight_location_description.js';
import { FightLocation } from 'features/fights/fight_location.js';
import { GameCommandParams } from 'features/games/game_command_params.js';

import { clone } from 'base/clone.js';

// Directory in which the fight commands aer located.
const kCommandDirectory = 'data/fights/';

// Directory in which the fight locations are located.
const kLocationDirectory = 'data/fights/locations/';

// Keeps track of the fight locations, commands and configuration available on the server. Is
// responsible for loading it, and doing the initial initialization.
export class FightRegistry {
    #commands_ = null;
    #games_ = null;
    #locations_ = null;

    constructor(games) {
        this.#commands_ = new Set();
        this.#games_ = games;
        this.#locations_ = new Map();
    }

    // Gets the locations that are available for fights.
    get locations() { return this.#locations_; }

    // Gets a particular location by the given |name|. Returns NULL when it's invalid.
    getLocation(name) { return this.#locations_.get(name) ?? null; }

    // ---------------------------------------------------------------------------------------------

    // Initializes the full fight system from the files the data is defined in. Will be called by
    // the Fights class for production usage, but has to be called manually when running tests.
    initialize() {
        this.initializeLocations();
        this.initializeCommands();
    }

    // Initializes the locations in which fights can take place. Each is based on a structured game
    // description, which will be given to a `FightLocation` intermediary.
    initializeLocations() {
        for (const filename of glob(kLocationDirectory, '.*\.json$')) {
            const description = new FightLocationDescription(kLocationDirectory + filename);
            const location = new FightLocation(description);

            this.#locations_.set(description.name, location);
        }
    }

    // Initializes the commands which act as shortcuts to the available fighting game configuration,
    // to make it easier for players to start a game.
    initializeCommands() {
        for (const filename of glob(kCommandDirectory, '.*fights[\\\\/][^\\\\/]*\.json$')) {
            const configuration = JSON.parse(readFile(kCommandDirectory + filename));
            const settings = new Map();

            for (const [ identifier, value ] of Object.entries(configuration.settings))
                settings.set(identifier, value);

            settings.set('internal/goal', configuration.goal);
            settings.set('internal/name', configuration.name);

            this.registerCommand(configuration.command, settings);
        }
    }

    // ---------------------------------------------------------------------------------------------

    // Registers a command with the server, following the given configuration. Activating it will
    // immediately start the sign-up flow of the configured game. This mimics the command syntax
    // that the games features exposes by default.
    registerCommand(command, settings) {
        server.commandManager.buildCommand(command)
            .sub('custom')
                .build(FightRegistry.prototype.onCommand.bind(this, settings, /* custom= */ true))
            .sub(CommandBuilder.NUMBER_PARAMETER)
                .build(FightRegistry.prototype.onCommand.bind(this, settings, /* custom= */ false))
            .build(FightRegistry.prototype.onCommand.bind(this, settings, /* custom= */ false));
        
        this.#commands_.add(command);
    }

    // Called when the |player| has issued a command. We'll construct the game command parameters
    // and use their API in order to formally request starting the game.
    onCommand(settings, customise, player, registrationId) {
        const params = new GameCommandParams();

        params.customise = !!customise;
        params.registrationId = registrationId;
        params.settings = clone(settings);

        return this.#games_().startGame(FightGame, player, params);
    }

    // ---------------------------------------------------------------------------------------------

    dispose() {
        for (const command of this.#commands_)
            server.commandManager.removeCommand(command);

        this.#commands_ = null;
    }
}
