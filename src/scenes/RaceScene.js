export default class RaceScene extends Phaser.Scene {
	constructor() {
		super("RaceScene");

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.acceleration = 0.003;
		this.maxSpeed = 50;

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
	}

	init(data) {
		this.socket = data.socket;
		this.roomData = data.roomData;
		this.roomId = data.roomData.id;
		this.maxLaps = data.roomData.maxLaps || 3;
		this.selectedChar = data.selectedChar;

		// Reset all internal state for clean start
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
	}

	preload() {
		this.load.image("track_background.png", "assets/track_background.png");
		this.load.image("trees.png", "assets/trees.png");
		this.load.tilemapTiledJSON("trackTMJ", "assets/Track.tmj");
		
		// Load all character cars (including for local player)
		const allCharacters = [
			{ name: "Tourism Faculty", car_path: "assets/Cars/Tourism.png" },
			{ name: "IT Faculty", car_path: "assets/Cars/ITF.png" },
			{ name: "Law Faculty", car_path: "assets/Cars/Law.png" },
			{ name: "Business Faculty", car_path: "assets/Cars/Business.png" },
			{ name: "Communications Faculty", car_path: "assets/Cars/Communications.png" },
			{ name: "Healthcare Department", car_path: "assets/Cars/Healthcare.png" },
			{ name: "Organization Department", car_path: "assets/Cars/Organization.png" },
		];
		
		allCharacters.forEach(char => {
			this.load.image(char.name + "_car", char.car_path);
		});
	}

	create() {
		// Reset all state variables to initial values
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

		// Get the raw Tiled data to access image layers
		const tiledData = this.cache.tilemap.get("trackTMJ").data;

		// Create image layers
		tiledData.layers.forEach(layer => {
			if (layer.type === 'imagelayer') {
				const img = this.add.image(layer.x || 0, layer.y || 0, layer.image);
				img.setOrigin(0, 0);

				// Set depth based on layer name
				if (layer.name === 'Background') {
					img.setDepth(0);
				} else if (layer.name === 'Trees') {
					img.setDepth(20);
				}
			}
		});

		// Set world bounds
		this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		// Get the Collisions layer
		const collisionLayer = map.getObjectLayer('Collisions');

		// Loop through each polyline
		// Assuming you're using rectangle objects in Tiled
		collisionLayer.objects.forEach(obj => {
			if (obj.rectangle) {
				// Create a simple Matter.js rectangle
				const body = this.matter.add.rectangle(
					obj.x + obj.width / 2,   // Center X
					obj.y + obj.height / 2,  // Center Y
					obj.width,               // Width
					obj.height,              // Height
					{
						isStatic: true,
						angle: obj.rotation * (Math.PI / 180)  // If you rotate in Tiled
					}
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
		// Use the character-specific car key
		const myCarKey = this.selectedChar.name + "_car";
		this.car = this.matter.add.sprite(me.spawnX, me.spawnY, myCarKey);
		this.car.setDisplaySize(60, this.car.height * (60 / this.car.width));
		this.car.setFrictionAir(0.05);
		this.car.setBounce(0);
		this.car.setFixedRotation();
		this.car.setDepth(10);
		this.car.setMass(2);

		// Spawn remote players
		if (this.roomData && this.roomData.players) {
			this.roomData.players.forEach(player => {
				if (player.id !== this.socket.id) {
					this.spawnRemotePlayer(player.id, player.spawnX, player.spawnY, player.name);
				}
			});
		}

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

		// Send initial lap info to UIScene
		uiScene.events.emit("lapUpdate", this.currentLap, this.maxLaps);

		// --- Collision detection ---
		this.matter.world.on("collisionstart", (event) => {
			event.pairs.forEach(pair => {
				const { bodyA, bodyB } = pair;

				if (bodyA === this.car.body || bodyB === this.car.body) {
					const otherBody = bodyA === this.car.body ? bodyB : bodyA;

					if (otherBody.label && otherBody.label.startsWith("checkpoint_")) {
						this.onCheckpointCrossed(otherBody.checkpointId);
					} else if (otherBody.label === "finishLine") {
						this.onFinishLineCrossed();
					}
				}
			});
		});

		// Click coordinate logger
		this.input.on('pointerdown', (pointer) => {
			// Get world coordinates (accounting for camera position)
			const worldX = pointer.worldX;
			const worldY = pointer.worldY;

			console.log(`Click at screen: (${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)})`);
			console.log(`Click at world: (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);
			console.log(`Camera at: (${this.cameras.main.scrollX.toFixed(2)}, ${this.cameras.main.scrollY.toFixed(2)})`);
		});

		this.setupSocketEvents();
	}

	setupSocketEvents() {
		if (!this.socket) return;

		// Remove any existing listeners to prevent duplicates
		this.socket.off("playerMoved");
		this.socket.off("playerLapUpdate");
		this.socket.off("playerFinishedRace");
		this.socket.off("disconnect");

		this.socket.on("playerMoved", (data) => {
			const remote = this.remotePlayers[data.id];
			if (!remote) return;
			remote.targetX = data.x;
			remote.targetY = data.y;
			remote.targetRotation = data.rotation;
		});

		this.socket.on("playerLapUpdate", (data) => {
			console.log(`${data.playerName} completed lap ${data.currentLap}/${data.maxLaps}`);

			const remote = this.remotePlayers[data.playerId];
			if (remote) {
				remote.currentLap = data.currentLap;
			}
		});

		this.socket.on("playerFinishedRace", (data) => {
			console.log(`${data.playerName} finished in position ${data.position}`);

			if (data.playerId === this.socket.id) {
				this.myFinishPosition = data.position;

				this.scene.launch("FinishOverlay", {
					position: data.position,
					playerName: data.playerName,
					finishOrder: data.finishOrder,
					raceFinished: data.raceFinished
				});
			}
			else if (this.hasFinished && this.myFinishPosition !== null) {
				this.scene.stop("FinishOverlay");
				this.scene.launch("FinishOverlay", {
					position: this.myFinishPosition,
					playerName: this.myPlayerName,
					finishOrder: data.finishOrder,
					raceFinished: data.raceFinished
				});
			}
		});

		this.socket.on("disconnect", () => {
			Object.values(this.remotePlayers).forEach(p => p.sprite.destroy());
			this.remotePlayers = {};
		});
	}

	spawnRemotePlayer(id, x, y, playerName) {
		// Use the character's car based on their name
		const carKey = playerName + "_car";
		const sprite = this.matter.add.sprite(x, y, carKey);
		sprite.setDisplaySize(60, sprite.height * (60 / sprite.width));
		sprite.setRectangle(sprite.displayWidth, sprite.displayHeight);
		sprite.setStatic(true);
		sprite.setDepth(10);
		sprite.setRotation(Math.PI / 2); // Rotate 90 degrees so right-facing sprite points up

		this.remotePlayers[id] = {
			sprite,
			targetX: x,
			targetY: y,
			targetRotation: Math.PI / 2,
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

		// Notify UIScene to update lap display
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
			this.car.setVelocity(0, 0);
			this.car.setAngularVelocity(0);
			this.myFinishPosition = null;
		}
	}

	update(time, delta) {
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
			return;
		}

		// --- LOCAL INPUT ---
		const accelerating = this.cursors.up.isDown || this.touchAccel;
		const braking = this.cursors.down.isDown || this.touchBrake;

		if (accelerating) {
			const force = this.matter.vector.rotate({ x: this.acceleration, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		} else if (braking) {
			const force = this.matter.vector.rotate({ x: -this.acceleration, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		}

		let steer = 0;
		if (this.cursors.left.isDown || this.steerLeft) steer = -1;
		else if (this.cursors.right.isDown || this.steerRight) steer = 1;
		this.car.setAngularVelocity(steer * 0.05);

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
		// Clean up remote players
		Object.values(this.remotePlayers).forEach(p => {
			if (p.sprite) {
				p.sprite.destroy();
			}
		});
		this.remotePlayers = {};

		// Clean up car reference
		if (this.car) {
			this.car = null;
		}
		
		// Clean up socket listeners
		if (this.socket) {
			this.socket.off("playerMoved");
			this.socket.off("playerLapUpdate");
			this.socket.off("playerFinishedRace");
			this.socket.off("disconnect");
		}

		// Clean up Matter.js collision listener
		if (this.matter && this.matter.world) {
			this.matter.world.off("collisionstart");
		}

		// Clean up input listener
		if (this.input) {
			this.input.off("pointerdown");
		}
	}
}