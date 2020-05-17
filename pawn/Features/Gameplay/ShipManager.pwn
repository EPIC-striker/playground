// Copyright 2006-2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the GPLv2 license, a copy of which can
// be found in the LICENSE file.

#define MAX_RAIL_OBJECTS 16

/**
 * To be able to detect what the state of the player is, we need to know what he is doing. This so we
 * can take action based on it.
 */
 enum PlayerShipActivity {
    // The player has no activity on the ship.
    Nothing,

    // The player is on the ship, walking.
    Walking,

    // The player has just left the ship.
    JustLeft
};

/**
 * The shipmanager takes care of a lot of things. Now you wonder, which "a lot of things": Well,
 * think about the main thing: make sure the player can safely idling. This includes temporarily
 * removing the players weapons, setting infinite health (and armor), can't shiplame and much more.
 *
 * @author Xander "Xanland" Hoogland <home@xanland.nl>
 */
class ShipManager {
    // The layer created here is to identify whether the player is on the ship.
    public const ShipLayerId = @counter(ZoneLayer);

    // How much money does the player standing on the ship needs to get per second.
    const ShipIdlingMoneyAmount = 50;

    // Since the ShipManager doesn't have an instance per player, we still need to be able to iden-
    // tify who just walked into a ship-related area.
    new PlayerShipActivity: m_activityOfPlayerOnShip[MAX_PLAYERS];

    // When players idle on the ship we collect their weapons. At leaving the ship we give
    // it all to them back. So we need to keep track of that.
    new m_playerSpawnWeapons_weaponId[MAX_PLAYERS][WeaponSlots+1];

    // Same for their ammo in their weapons.
    new m_playerSpawnWeapons_ammo[MAX_PLAYERS][WeaponSlots+1];

    // Keeps track whether the weaponinventory is saved.
    new bool: m_playerHealthSpawnWeaponsSaved[MAX_PLAYERS];

    // All of the back- and frontshiprailobjects so they can be en- and disabled.
    new DynamicObject: m_shipRailObjects[MAX_RAIL_OBJECTS];

    // We set their health and armour when they join the ship to infinite for protection. Ofcourse
    // at leaving they need to be set back so we have to remember that.
    new Float: m_playerHealthAndArmour[MAX_PLAYERS][2];

    // Is the shiprail already enabled or disabled. Since they move instead of dissappear, we have
    // to keep track of this.
    new bool: m_isTheShiprailEnabled;

    // The area surrounding the pirate ship, the ramp and the area before, provided by the Streamer.
    new STREAMER_TAG_AREA: m_beforeRampArea;
    new STREAMER_TAG_AREA: m_rampArea;
    new STREAMER_TAG_AREA: m_shipArea;

    /**
     * In here we create the zones with the actual coördinates where the ship, the ramp of the ship
     * and the forbidden to fly-zones is/are. Also, the shiprail objects are initialized.
     */
    public __construct () {
        new Float: shipAreaMinZ = 0;
        new Float: shipAreaMaxZ = 30;

        new Float: shipAreaPolygon[] = {
            1995.5940, 1516.6383,  // south-eastern corner of ship
            2005.6711, 1516.6383,  // south-western corner of ship
            2006.3826, 1524.8446,
            2005.6117, 1539.7818,  // south-eastern side of ramp
            2005.8014, 1553.7922,  // north-eastern side of ramp
            2004.0792, 1566.2363,
            2000.5907, 1569.7604,  // northern tip of ship
            1997.2067, 1566.3329,
            1995.5060, 1553.8690,
            1995.9132, 1549.7366,
            1995.0341, 1524.8315
        };

        new Float: rampAreaPolygon[] = {
            2005.6705, 1539.7363,  // south-eastern corner of ramp
            2015.7131, 1540.4553,
            2023.7876, 1540.4663,  // south-western corner of ramp
            2025.2487, 1550.5581,  // north-western corner of ramp
            2015.6420, 1549.9860,
            2005.3781, 1549.8186   // north-eastern corner of ramp
        };

        new Float: beforeRampAreaPolygon[] = {
            2023.9891, 1540.4663,  // south-eastern corner of area
            2027.7648, 1540.4663,  // south-western corner of area
            2029.4863, 1550.6461,  // north-western corner of area
            2025.6086, 1550.6305   // north-eastern corner of area
        };

        m_beforeRampArea = CreateDynamicPolygon(beforeRampAreaPolygon, shipAreaMinZ, shipAreaMaxZ,
                                                sizeof(beforeRampAreaPolygon), /* worldId= */ 0,
                                                /* interiorId= */ 0, /* playerId= */ 0);

        m_rampArea = CreateDynamicPolygon(rampAreaPolygon, shipAreaMinZ, shipAreaMaxZ,
                                          sizeof(rampAreaPolygon), /* worldId= */ 0,
                                          /* interiorId= */ 0, /* playerId= */ 0);

        m_shipArea = CreateDynamicPolygon(shipAreaPolygon, shipAreaMinZ, shipAreaMaxZ,
                                          sizeof(shipAreaPolygon), /* worldId= */ 0,
                                          /* interiorId= */ 0, /* playerId= */ 0);

        // Create the shiprail objects.
        this->initializeObjects();
    }

    /**
     * Initializes the objects required for the ship manager. This will automatically mark the objects
     * as having been enabled, as they'll be visible to all players.
     */
    private initializeObjects() {
        m_shipRailObjects[0]  = CreateDynamicObject(3524, 2024.34375, 1540.39063, 10.28570,   0.00000,   0.00000,  84.02000);
        m_shipRailObjects[1]  = CreateDynamicObject(3524, 2025.82813, 1550.33594, 10.28570,   0.00000,   0.00000,  84.02000);
        m_shipRailObjects[2]  = CreateDynamicObject(3524, 2024.31055, 1541.67578, 10.70153,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[3]  = CreateDynamicObject(3524, 2024.47632, 1543.16333, 11.15969,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[4]  = CreateDynamicObject(3524, 2024.69275, 1544.52002, 11.69453,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[5]  = CreateDynamicObject(3524, 2024.92810, 1545.94910, 11.69450,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[6]  = CreateDynamicObject(3524, 2025.26184, 1547.43530, 11.15970,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[7]  = CreateDynamicObject(3524, 2025.51404, 1549.03674, 10.70150,   0.00000,   0.00000,  91.00000);
        m_shipRailObjects[8]  = CreateDynamicObject(3498, 2024.31055, 1541.67578,  8.01884,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[9]  = CreateDynamicObject(3498, 2024.47632, 1543.16333,  8.49240,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[10] = CreateDynamicObject(3498, 2024.69275, 1544.52002,  9.03468,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[11] = CreateDynamicObject(3498, 2024.92810, 1545.94910,  9.03470,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[12] = CreateDynamicObject(3498, 2025.26184, 1547.43530,  8.49240,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[13] = CreateDynamicObject(3498, 2025.51404, 1549.03674,  8.01880,   0.00000,   0.00000,   0.00000);
        m_shipRailObjects[14] = CreateDynamicObject(3524, 1996.29749, 1546.97449, 13.53652, 902.67804,  95.58006, 635.14844);
        m_shipRailObjects[15] = CreateDynamicObject(3524, 1996.22925, 1542.35950, 13.60226, 180.00000, -95.58010, -99.00000);

        m_isTheShiprailEnabled = true;
    }

    /**
     * When a player joins a server we need to be sure it is not identified as being on the ship. In
     * this method we keep track per player that he/she isn't.
     *
     * Also, unfortunately, due to the new ship blocker, we need to remove some objects, we do this
     * here.
     *
     * @param playerId Id of the player who just connected to the server.
     */
    @list(OnPlayerConnect)
    public onPlayerConnect(playerId) {
        m_activityOfPlayerOnShip[playerId] = Nothing;
        m_playerHealthSpawnWeaponsSaved[playerId] = false;

        // Remove two objects which are in the way.
        RemoveBuildingForPlayer(playerId, 3524, 2024.3438, 1540.3906, 11.3125, 0.25);
        RemoveBuildingForPlayer(playerId, 3524, 2025.8281, 1550.3359, 11.3594, 0.25);
    }

    /**
     * With the zone-manager we can identify whether someone is on the ship. If that is the case we
     * can apply the ShipManager-related features on the player.
     *
     * @param playerId Id of the player who just entered the ship.
     * @param areaId Id of the zone in the layer which they just entered.
     */
    public onPlayerEnterShip(playerId, STREAMER_TAG_AREA: areaId) {
        if (areaId == m_beforeRampArea) {
            this->respawnPlayerVehicle(playerId);
            m_activityOfPlayerOnShip[playerId] = JustLeft;

        } else if (areaId == m_rampArea || areaId == m_shipArea) {
            this->respawnPlayerVehicle(playerId);

            if (DamageManager(playerId)->isPlayerFighting() == true) {
                this->throwPlayerOffTheShip(playerId);
    
                ShowBoxForPlayer(playerId, "You have recently been in a gunfight, therefore cannot enter the ship at this moment");
                return;
            }

            if (m_playerHealthSpawnWeaponsSaved[playerId] == false) {
                this->storeSpawnWeapons(playerId);

                new Float: health, Float: armour;
                GetPlayerHealth(playerId, health);
                m_playerHealthAndArmour[playerId][0] = health;
                SetPlayerHealth(playerId, 99999);

                GetPlayerArmour(playerId, armour);
                m_playerHealthAndArmour[playerId][1] = armour;

                m_playerHealthSpawnWeaponsSaved[playerId] = true;
            }

            m_activityOfPlayerOnShip[playerId] = Walking;
        }
    }

    /**
     * To prevent people shooting other people from the ship, since it is an safe area, we tempora-
     * rily remove their weapons. Ofcourse they will get them back when they leave.
     *
     * @param playerId Id of the player to temporarily save and remove the weapons from.
     */
    private storeSpawnWeapons(playerId) {
        if (Player(playerId)->isAdministrator() == true) {
            return 0;
        }

        for (new weaponSlot = 0; weaponSlot < WeaponSlots; ++weaponSlot) {
            GetPlayerWeaponData(
                playerId, weaponSlot, m_playerSpawnWeapons_weaponId[playerId][weaponSlot],
                m_playerSpawnWeapons_ammo[playerId][weaponSlot]);
        }

        m_playerSpawnWeapons_weaponId[playerId][WeaponSlots] = GetPlayerWeapon(playerId);
        ResetPlayerWeapons(playerId);

        return 1;
    }

    /**
     * Since walking on the ship temporarily removes the player's weapons, we give them back when
     * they left.
     *
     * @param playerId Id of the player to give the weapons back to.
     */
    private restoreSpawnWeapons(playerId) {
        if (Player(playerId)->isAdministrator() == true) {
            return 0;
        }

        ResetPlayerWeapons(playerId);
        for (new weaponSlot = 0; weaponSlot < WeaponSlots; ++weaponSlot) {
            if (m_playerSpawnWeapons_weaponId[playerId][weaponSlot] == 0
                || m_playerSpawnWeapons_ammo[playerId][weaponSlot] == 0) {
                continue;
            }

            GiveWeapon(
                playerId, m_playerSpawnWeapons_weaponId[playerId][weaponSlot],
                m_playerSpawnWeapons_ammo[playerId][weaponSlot]);
        }

        SetPlayerArmedWeapon(playerId, m_playerSpawnWeapons_weaponId[playerId][WeaponSlots]);

        return 1;
    }

    /**
     * To keep the ship clear of vehicles we need to check if a vehicle is in a specific zone and
     * thus should be respawned.
     *
     * @param playerId Id of the player to possibly respawn a vehicle for.
     */
    private respawnPlayerVehicle(playerId) {
        new vehicleId = GetPlayerVehicleID(playerId),
            modelId = GetVehicleModel(vehicleId);

        if (GetPlayerState(playerId) == PLAYER_STATE_DRIVER && Player(playerId)->isAdministrator() == false) {
            if (VehicleModel->isAirplane(modelId) == true || VehicleModel->isHelicopter(modelId) == true) {
                SendClientMessage(playerId, Color::Error, "Flyable vehicles are not allowed around the ship!");
            } else {
                SendClientMessage(playerId, Color::Error, "Vehicles are not allowed on the ship!");
            }

            CBomb__ResetVehicleData(vehicleId);

            SetVehicleToRespawn(vehicleId);

            return 1;
        }

        return 0;
    }

    /**
     * A player leaving the ship should get his state restored.
     *
     * @param playerId Id of the player who just left the ship.
     * @param zoneId Id of the zone in the layer which they just left.
     */
    public onPlayerLeaveShip(playerId, STREAMER_TAG_AREA: areaId) {
        if (areaId == m_rampArea || areaId == m_shipArea)
            m_activityOfPlayerOnShip[playerId] = JustLeft;
    }

    /**
     * To keep this class very clean we call per timer different methods. Doing it this way we keep
     * it very clear in which method we handle which activity.
     *
     * @param playerId Id of the player to handle shipactivity for.
     */
    @list(SecondTimerPerPlayer)
    public handleShipActivity(playerId) {
        if (m_activityOfPlayerOnShip[playerId] == Nothing)
            return 0;

        if (m_activityOfPlayerOnShip[playerId] == JustLeft && m_playerHealthSpawnWeaponsSaved[playerId] == true) {
            if (!IsPlayerInMinigame(playerId)) {
                this->restoreSpawnWeapons(playerId);

                SetPlayerHealth(playerId, m_playerHealthAndArmour[playerId][0]);
                SetPlayerArmour(playerId, m_playerHealthAndArmour[playerId][1]);
                m_playerHealthSpawnWeaponsSaved[playerId] = false;
            }

            m_activityOfPlayerOnShip[playerId] = Nothing;

        } else if (m_activityOfPlayerOnShip[playerId] == Walking) {
            if (GetPlayerVirtualWorld(playerId) != 0) {
                m_activityOfPlayerOnShip[playerId] = JustLeft;
                return 1;
            }

            this->issueMoneyToPlayer(playerId);

            if (Player(playerId)->isAdministrator() == false) {
                ResetPlayerWeapons(playerId);
                if (m_playerHealthSpawnWeaponsSaved[playerId] == false) {
                    this->storeSpawnWeapons(playerId);

                    new Float: health, Float: armour;
                    GetPlayerHealth(playerId, health);
                    m_playerHealthAndArmour[playerId][0] = health;
                    SetPlayerHealth(playerId, 99999);

                    GetPlayerArmour(playerId, armour);
                    m_playerHealthAndArmour[playerId][1] = armour;

                    m_playerHealthSpawnWeaponsSaved[playerId] = true;
                }

                this->respawnPlayerVehicle(playerId);
            }
        }

        return 1;
    }

    /**
     * When standing on the ship every player gets some money. In here we expand the timer so the
     * player gets his money every second.
     *
     * @param playerId Id of the player who we issue money to
     */
    private issueMoneyToPlayer(playerId) {
        new const multiplier = Player(playerId)->isVip() ? 2 /* VIP members */
                                                         : 1 /* Regular players */;

        GiveRegulatedMoney(playerId, ShipIdleMoney, multiplier);
    }

    /**
     * To have a bit more fun, administrators and management have the possibility to enable and dis-
     * able the shiprail.
     *
     * @param params If it should be enabled or disabled.
     */
    @switch(SetCommand, "shiprail")
    public onSetShiprailCommand(playerId, params[]) {
        new adminMessage[128];
        if (Command->parameterCount(params) == 1) {
            new bool: shiprailState = Command->booleanParameter(params, 0);

            if (!IsDynamicObjectMoving(m_shipRailObjects[0])) {
                if (shiprailState && !m_isTheShiprailEnabled) {
                    this->enableShiprail(true);

                    SendClientMessage(playerId, Color::Success, "Shiprail enabled.");

                    format(
                        adminMessage, sizeof(adminMessage), "%s (Id:%d) has enabled the ship-rail object.",
                        Player(playerId)->nicknameString(), playerId);
                    Admin(playerId, adminMessage);

                    return 1;
                } else if (!shiprailState && m_isTheShiprailEnabled) {
                    this->enableShiprail(false);

                    SendClientMessage(playerId, Color::Success, "Shiprail {DC143C}disabled{33AA33}.");

                    format(
                        adminMessage, sizeof(adminMessage), "%s (Id:%d) has disabled the ship-rail object.",
                        Player(playerId)->nicknameString(), playerId);
                    Admin(playerId, adminMessage);

                    return 1;
                }
            }

            if (!m_isTheShiprailEnabled) {
                SendClientMessage(playerId, Color::Success, "The shiprail is already (being) {DC143C}disabled{33AA33}.");
            } else if (m_isTheShiprailEnabled) {
                SendClientMessage(playerId, Color::Success, "The shiprail is already (being) enabled.");
            }
        } else {
            SendClientMessage(playerId, Color::Information, "Usage: /set shiprail [on/off]");
        }

        return 1;
    }

    /**
     * The actual visual change of the state of the shiprail happens here.
     *
     * @param enable Whether the shiprail should be enabled.
     */
    public enableShiprail(bool: enable = true) {
        new Float: sroX, Float: sroY, Float: sroZ;

        if (IsDynamicObjectMoving(m_shipRailObjects[0])) {
            return 0;
        }

        if (enable && !m_isTheShiprailEnabled) {
            for (new shipRailObject = 0; shipRailObject < MAX_RAIL_OBJECTS; ++shipRailObject) {
                GetDynamicObjectPos(m_shipRailObjects[shipRailObject], sroX, sroY, sroZ);
                MoveDynamicObject(m_shipRailObjects[shipRailObject], sroX - 1.0, sroY, sroZ + 5.4, 3);
            }

            m_isTheShiprailEnabled = true;
        } else if (!enable && m_isTheShiprailEnabled) {
            for (new shipRailObject = 0; shipRailObject < MAX_RAIL_OBJECTS; ++shipRailObject) {
                GetDynamicObjectPos(m_shipRailObjects[shipRailObject], sroX, sroY, sroZ);
                MoveDynamicObject(m_shipRailObjects[shipRailObject], sroX + 1.0, sroY, sroZ - 5.4, 3);
            }

            m_isTheShiprailEnabled = false;
        }

        return 1;
    }

    /** 
     * Checks if the given playerId is walking on the ship.
     *
     * @param playerId Id of the player who could be on the ship
     */
    public bool: isPlayerWalkingOnShip(playerId) {
        if (Player(playerId)->isConnected() == false) {
            return false;
        }

        if (m_activityOfPlayerOnShip[playerId] == Walking) {
            return true;
        }

        return false;
    }

    /**
     * Repositions the player in front of the ramp of the ship where he is just fully vulnerable.
     *
     * @param playerId Id of the player to throw off the ship
     */
    private throwPlayerOffTheShip(playerId) {
        new randomPositionAdjustment = 3 - random(6);

        SetPlayerPos(playerId, 2034.85 + randomPositionAdjustment, 1545.15 + randomPositionAdjustment, 10.82);
        SetPlayerFacingAngle(playerId, 275.44);
    }
};
