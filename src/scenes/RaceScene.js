import NPCCar from '../objects/NPCCar.js';

export default class RaceScene extends Phaser.Scene {
	constructor() {
		super("RaceScene");

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.acceleration = 0.0001;
		this.maxSpeed = 20;

		this.socket = null;
		this.roomId = null;
		this.roomData = null;

		this.remotePlayers = {};
		this.lastNetUpdate = 0;
		this.netInterval = 50;

		// Lap tracking
		this.currentLap = 0;
		this.maxLaps = 3;
		this.hasFinished = false;
		this.checkpoints = [];
		this.passedCheckpoints = new Set();
		this.totalCheckpoints = 0;

		this.myFinishPosition = null;
		this.myPlayerName = null;
		this.selectedChar = null;

		this.npcCars = [];
		this.isHost = false;
	}

	init(data) {
		this.socket = data.socket;
		this.roomData = data.roomData;
		this.roomId = data.roomData.id;
		this.maxLaps = data.roomData.maxLaps || 3;
		this.selectedChar = data.selectedChar;

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.remotePlayers = {};
		this.lastNetUpdate = 0;

		this.currentLap = 0;
		this.hasFinished = false;
		this.checkpoints = [];
		this.passedCheckpoints = new Set();
		this.totalCheckpoints = 0;

		this.myFinishPosition = null;
		this.myPlayerName = null;

		this.npcCars = [];
		this.isHost = false;
	}

	preload() {
		this.load.image("track_background.png", "assets/track_background.png");
		this.load.image("trees.png", "assets/trees.png");
		this.load.tilemapTiledJSON("trackTMJ", "assets/Track.tmj");

		const allCharacters = [
			{ name: "TOURISM AND HOSPITALITY", car_path: "assets/Cars/Tourism.png" },
			{ name: "INFORMATION TECHNOLOGIES", car_path: "assets/Cars/ITF.png" },
			{ name: "LAW SCIENCE", car_path: "assets/Cars/Law.png" },
			{ name: "BUSINESS ADMINISTRATION", car_path: "assets/Cars/Business.png" },
			{ name: "COMMUNICATION SCIENCE", car_path: "assets/Cars/Communications.png" },
			{ name: "HEALTHCARE", car_path: "assets/Cars/Healthcare.png" },
			{ name: "ORGANIZATION MANAGEMENT", car_path: "assets/Cars/Organization.png" },
		];

		allCharacters.forEach(char => {
			this.load.image(char.name + "_car", char.car_path);
		});
	}

	create() {
		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.remotePlayers = {};
		this.lastNetUpdate = 0;

		this.currentLap = 0;
		this.hasFinished = false;
		this.checkpoints = [];
		this.passedCheckpoints = new Set();
		this.totalCheckpoints = 0;

		this.myFinishPosition = null;

		const map = this.make.tilemap({ key: "trackTMJ" });

		const tiledData = this.cache.tilemap.get("trackTMJ").data;
		tiledData.layers.forEach(layer => {
			if (layer.type === 'imagelayer') {
				const img = this.add.image(layer.x || 0, layer.y || 0, layer.image);
				img.setOrigin(0, 0);
				if (layer.name === 'Background') img.setDepth(0);
				else if (layer.name === 'Trees') img.setDepth(20);
			}
		});

		this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		const collisionLayer = map.getObjectLayer('Collisions');
		collisionLayer.objects.forEach(obj => {
			if (obj.rectangle) {
				this.matter.add.rectangle(
					obj.x + obj.width / 2,
					obj.y + obj.height / 2,
					obj.width,
					obj.height,
					{ isStatic: true, angle: obj.rotation * (Math.PI / 180) }
				);
			}
		});

		// --- Checkpoints ---
		const checkpointLayer = map.getObjectLayer("Checkpoints");
		if (checkpointLayer) {
			checkpointLayer.objects.forEach((obj, index) => {
				const checkpoint = this.matter.add.rectangle(
					obj.x + obj.width / 2,
					obj.y + obj.height / 2,
					obj.width,
					obj.height,
					{
						isStatic: true,
						isSensor: true,
						label: `checkpoint_${index}`,
						checkpointId: index
					}
				);
				this.checkpoints.push(checkpoint);
			});
			this.totalCheckpoints = this.checkpoints.length;
		}

		// --- Finish Line ---
		const finishLayer = map.getObjectLayer("FinishLine");
		if (finishLayer) {
			finishLayer.objects.forEach(obj => {
				this.matter.add.rectangle(
					obj.x + obj.width / 2,
					obj.y + obj.height / 2,
					obj.width,
					obj.height,
					{ isStatic: true, isSensor: true, label: "finishLine" }
				);
			});
		}

		const me = this.roomData.players.find(p => p.id === this.socket.id);
		this.myPlayerName = me.name;

		// --- Local Player ---
		const myCarKey = this.selectedChar.name + "_car";
		this.car = this.matter.add.sprite(me.spawnX, me.spawnY, myCarKey);
		this.car.setDisplaySize(60, this.car.height * (60 / this.car.width));
		this.car.setMass(1);
		this.car.setFrictionAir(0.05);
		this.car.setBounce(0);
		this.car.setFixedRotation();
		this.car.setDepth(10);

		this.isHost = this.roomData.players[0].id === this.socket.id;

		// --- Spawn players ---
		// Keep a Set of IDs handled as NPCs so the remote player loop skips them
		const npcIds = new Set();

		this.roomData.players.forEach(player => {
			if (!player.isNPC) return;
			npcIds.add(player.id);

			const npc = new NPCCar(
				this,
				player.id,
				player.spawnX,
				player.spawnY,
				player.name + "_car",
				this.isHost
			);
			this.npcCars.push(npc);
		});

		// Spawn remote HUMAN players only (skip local player and all NPCs)
		this.roomData.players.forEach(player => {
			if (player.id === this.socket.id) return;  // skip self
			if (npcIds.has(player.id)) return;          // skip NPCs — already spawned above
			this.spawnRemotePlayer(player.id, player.spawnX, player.spawnY, player.name);
		});

		// Camera
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
		this.cameras.main.startFollow(this.car, false);
		this.cameras.main.setRoundPixels(true);
		this.cameras.main.setZoom(2);

		this.cursors = this.input.keyboard.createCursorKeys();

		// --- UI events ---
		const uiScene = this.scene.get("UIScene");
		uiScene.events.on("left-down", () => (this.steerLeft = true));
		uiScene.events.on("left-up", () => (this.steerLeft = false));
		uiScene.events.on("right-down", () => (this.steerRight = true));
		uiScene.events.on("right-up", () => (this.steerRight = false));
		uiScene.events.on("up-down", () => (this.touchAccel = true));
		uiScene.events.on("up-up", () => (this.touchAccel = false));
		uiScene.events.on("down-down", () => (this.touchBrake = true));
		uiScene.events.on("down-up", () => (this.touchBrake = false));

		uiScene.events.emit("lapUpdate", this.currentLap, this.maxLaps);

		// --- Collision detection ---
		// =============================================================================
		// Replace ONLY the collisionstart block in RaceScene.create()
		// The critical fix: use strict `===` body identity and explicitly verify
		// the matched body belongs to THIS car before calling any lap method.
		// An NPC body can never satisfy `=== this.car.body` and vice versa.
		// =============================================================================

		this.matter.world.on("collisionstart", (event) => {
			event.pairs.forEach(pair => {
				const { bodyA, bodyB } = pair;

				// ── Local player ───────────────────────────────────────────────────
				// Only proceed if one of the two bodies is exactly this.car.body.
				// Store the result so we don't call it twice if both bodies somehow matched.
				const playerBody = this.car.body;
				if (bodyA === playerBody || bodyB === playerBody) {
					const other = bodyA === playerBody ? bodyB : bodyA;

					// Extra guard: make sure `other` is not also the player body
					// (shouldn't happen, but eliminates any edge case)
					if (other !== playerBody) {
						if (other.label?.startsWith("checkpoint_")) {
							this.onCheckpointCrossed(other.checkpointId);
						} else if (other.label === "finishLine") {
							this.onFinishLineCrossed();
						}
					}

					// Early return — if this pair involved the player, it cannot
					// also involve an NPC (a body can only be in one sprite).
					return;
				}

				// ── NPC cars (host only) ───────────────────────────────────────────
				// Only runs if the player body was NOT in this pair.
				if (this.isHost) {
					for (const npc of this.npcCars) {
						const npcBody = npc.sprite.body;
						if (bodyA === npcBody || bodyB === npcBody) {
							const other = bodyA === npcBody ? bodyB : bodyA;
							if (other !== npcBody) {
								if (other.label?.startsWith("checkpoint_")) {
									npc.onCheckpointCrossed(other.checkpointId);
								} else if (other.label === "finishLine") {
									npc.onFinishLineCrossed();
								}
							}
							break; // a body belongs to exactly one NPC — stop searching
						}
					}
				}
			});
		});

		// Click coordinate logger
		this.input.on('pointerdown', (pointer) => {
			console.log(`Click at world: (${pointer.worldX.toFixed(2)}, ${pointer.worldY.toFixed(2)})`);
		});

		this.setupSocketEvents();
	}

	setupSocketEvents() {
		if (!this.socket) return;

		this.socket.off("playerMoved");
		this.socket.off("playerLapUpdate");
		this.socket.off("playerFinishedRace");
		this.socket.off("disconnect");

		this.socket.on("playerMoved", (data) => {
			// Route to NPC interpolation if it matches an NPC id
			const npc = this.npcCars.find(n => n.npcId === data.id);
			if (npc) {
				npc.setTarget(data.x, data.y, data.rotation);
				return;
			}

			// Otherwise update remote human player
			const remote = this.remotePlayers[data.id];
			if (!remote) return;
			remote.targetX = data.x;
			remote.targetY = data.y;
			remote.targetRotation = data.rotation;
		});

		this.socket.on("playerLapUpdate", (data) => {
			console.log(`${data.playerName} completed lap ${data.currentLap}/${data.maxLaps}`);

			// Update lap counter for remote human players (NPCs don't have a remotePlayers entry)
			const remote = this.remotePlayers[data.playerId];
			if (remote) {
				remote.currentLap = data.currentLap;
			}
		});

		this.socket.on("playerFinishedRace", (data) => {
			console.log(`${data.playerName} finished in position ${data.position}`);

			// NPC finishes are handled separately — never trigger the player overlay
			if (data.isNPC) {
				// Hide the specific NPC that just finished
				const npc = this.npcCars.find(n => n.npcId === data.playerId);
				if (npc && npc.sprite) {
					npc.sprite.setVisible(false);
				}

				// If the player has already finished, refresh the overlay so the
				// updated standings (including this bot's result) are shown
				if (this.hasFinished && this.myFinishPosition !== null) {
					this.scene.stop("FinishOverlay");
					this.scene.launch("FinishOverlay", {
						position: this.myFinishPosition,
						playerName: this.myPlayerName,
						finishOrder: data.finishOrder,
						raceFinished: data.raceFinished,
					});
				}
				return;
			}

			// Remove the finished remote human player's sprite from physics
			const finishedRemote = this.remotePlayers[data.playerId];
			if (finishedRemote && finishedRemote.sprite) {
				this.matter.world.remove(finishedRemote.sprite.body);
				finishedRemote.sprite.setVisible(false);
			}

			if (data.playerId === this.socket.id) {
				// Local player finished
				this.myFinishPosition = data.position;
				this.scene.launch("FinishOverlay", {
					position: data.position,
					playerName: data.playerName,
					finishOrder: data.finishOrder,
					raceFinished: data.raceFinished,
				});
			} else if (this.hasFinished && this.myFinishPosition !== null) {
				// Another human finished after us — refresh overlay with updated standings
				this.scene.stop("FinishOverlay");
				this.scene.launch("FinishOverlay", {
					position: this.myFinishPosition,
					playerName: this.myPlayerName,
					finishOrder: data.finishOrder,
					raceFinished: data.raceFinished,
				});
			}
		});

		this.socket.on("disconnect", () => {
			Object.values(this.remotePlayers).forEach(p => p.sprite.destroy());
			this.remotePlayers = {};
		});
	}

	spawnRemotePlayer(id, x, y, playerName) {
		const carKey = playerName + "_car";
		const sprite = this.matter.add.sprite(x, y, carKey);
		sprite.setDisplaySize(60, sprite.height * (60 / sprite.width));
		sprite.setRectangle(sprite.displayWidth, sprite.displayHeight);
		sprite.setStatic(true);
		sprite.setDepth(10);
		sprite.setRotation(0);

		this.remotePlayers[id] = {
			sprite,
			targetX: x,
			targetY: y,
			targetRotation: 0,
			currentLap: 0
		};
	}

	onCheckpointCrossed(checkpointId) {
		if (this.hasFinished) return;

		if (!this.passedCheckpoints.has(checkpointId)) {
			this.passedCheckpoints.add(checkpointId);

			this.socket.emit("checkpointPassed", {
				roomId: this.roomId,
				checkpointId: checkpointId
			});

			console.log(`Checkpoint ${checkpointId + 1}/${this.totalCheckpoints} passed`);
		}
	}

	onFinishLineCrossed() {
		if (this.hasFinished) return;

		if (this.passedCheckpoints.size < this.totalCheckpoints) {
			console.log(`Cannot complete lap: only ${this.passedCheckpoints.size}/${this.totalCheckpoints} checkpoints passed`);
			return;
		}

		this.currentLap++;
		this.passedCheckpoints.clear();

		const uiScene = this.scene.get("UIScene");
		if (uiScene) {
			uiScene.events.emit("lapUpdate", this.currentLap, this.maxLaps);
		}

		this.socket.emit("lapCompleted", {
			roomId: this.roomId,
			totalCheckpoints: this.totalCheckpoints
		});

		if (this.currentLap >= this.maxLaps) {
			this.hasFinished = true;
			this.matter.world.remove(this.car.body);
			this.car.setVelocity(0, 0);
			this.car.setAngularVelocity(0);
			this.myFinishPosition = null;
		}
	}

	update(time, delta) {
		// --- NPC UPDATE ---
		this.npcCars.forEach(npc => npc.update(time, delta));
		if (this.hasFinished) {
			Object.values(this.remotePlayers).forEach(remote => {
				remote.sprite.setPosition(
					Phaser.Math.Linear(remote.sprite.x, remote.targetX, 0.2),
					Phaser.Math.Linear(remote.sprite.y, remote.targetY, 0.2)
				);
				remote.sprite.setRotation(
					Phaser.Math.Angle.RotateTo(remote.sprite.rotation, remote.targetRotation, 0.1)
				);
			});
			// // Keep interpolating NPCs even after player finishes
			// this.npcCars.forEach(npc => npc.update(time, delta));
			return;
		}

		// --- LOCAL INPUT ---
		const accelerating = this.cursors.up.isDown || this.touchAccel;
		const braking = this.cursors.down.isDown || this.touchBrake;

		if (accelerating) {
			const force = this.matter.vector.rotate({ x: this.acceleration * delta, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		} else if (braking) {
			const force = this.matter.vector.rotate({ x: -this.acceleration * delta, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		}

		let steer = 0;
		if (this.cursors.left.isDown || this.steerLeft) steer = -1;
		else if (this.cursors.right.isDown || this.steerRight) steer = 1;

		this.car.setAngularVelocity(steer * 0.003 * delta);

		const vel = this.car.body.velocity;
		const speed = Math.hypot(vel.x, vel.y);
		if (speed > this.maxSpeed) {
			const factor = this.maxSpeed / speed;
			this.car.setVelocity(vel.x * factor, vel.y * factor);
		}

		// --- NETWORK UPDATE ---
		if (this.socket && time > this.lastNetUpdate + this.netInterval) {
			this.lastNetUpdate = time;
			this.socket.emit("playerMove", {
				roomId: this.roomId,
				x: this.car.x,
				y: this.car.y,
				rotation: this.car.rotation,
				velocityX: this.car.body.velocity.x,
				velocityY: this.car.body.velocity.y
			});
		}

		// --- REMOTE INTERPOLATION ---
		Object.values(this.remotePlayers).forEach(remote => {
			remote.sprite.setPosition(
				Phaser.Math.Linear(remote.sprite.x, remote.targetX, 0.2),
				Phaser.Math.Linear(remote.sprite.y, remote.targetY, 0.2)
			);
			remote.sprite.setRotation(
				Phaser.Math.Angle.RotateTo(remote.sprite.rotation, remote.targetRotation, 0.1)
			);
		});

		// Camera integer scroll
		this.cameras.main.scrollX = Math.round(this.car.x - this.cameras.main.width * 0.5);
		this.cameras.main.scrollY = Math.round(this.car.y - this.cameras.main.height * 0.5);
	}

	shutdown() {
		this.npcCars.forEach(npc => npc.destroy());
		this.npcCars = [];

		Object.values(this.remotePlayers).forEach(p => {
			if (p.sprite) p.sprite.destroy();
		});
		this.remotePlayers = {};

		if (this.car) this.car = null;

		if (this.socket) {
			this.socket.off("playerMoved");
			this.socket.off("playerLapUpdate");
			this.socket.off("playerFinishedRace");
			this.socket.off("disconnect");
		}

		if (this.matter && this.matter.world) {
			this.matter.world.off("collisionstart");
		}

		if (this.input) {
			this.input.off("pointerdown");
		}
	}
}