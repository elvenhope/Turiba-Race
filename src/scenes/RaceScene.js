export default class RaceScene extends Phaser.Scene {
	constructor() {
		super("RaceScene");

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.acceleration = 0.01;
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
	}

	init(data) {
		this.socket = data.socket;
		this.roomData = data.roomData;
		this.roomId = data.roomData.id;
		this.maxLaps = data.roomData.maxLaps || 3;
	}

	preload() {
		this.load.image("track_background.png", "assets/track_background.png");
		this.load.image("trees.png", "assets/trees.png");
		this.load.image("car", "assets/car.png");
		this.load.tilemapTiledJSON("trackTMJ", "assets/Track.tmj");
	}

	create() {
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

		// --- Collisions ---
		const collisionLayer = map.getObjectLayer("Collisions");
		if (collisionLayer) {
			collisionLayer.objects.forEach((obj, index) => {
				console.log(`\n=== Processing object ${index} ===`);
				console.log(`Type: ${obj.rectangle ? 'Rectangle' : obj.polygon ? 'Polygon' : 'Unknown'}`);
				console.log(`Tiled position: (${obj.x}, ${obj.y})`);

				// if (index > 0) return;

				if (obj.rectangle) {
					const centerX = obj.x + obj.width / 2;
					const centerY = obj.y + obj.height / 2;

					console.log(`Rectangle center: (${centerX}, ${centerY})`);

					this.matter.add.rectangle(
						centerX,
						centerY,
						obj.width,
						obj.height,
						{ isStatic: true, angle: Phaser.Math.DegToRad(obj.rotation || 0) }
					);
				} else if (obj.polygon) {
					console.log(`Raw polygon vertices from Tiled:`, obj.polygon);

					// Convert to world coordinates
					const worldVerts = obj.polygon.map(v => ({
						x: obj.x + v.x,
						y: obj.y + v.y
					}));

					console.log(`World vertices:`, worldVerts);

					// Simple centroid calculation
					let centerX = 0;
					let centerY = 0;
					worldVerts.forEach(v => {
						centerX += v.x;
						centerY += v.y;
					});
					centerX /= worldVerts.length;
					centerY /= worldVerts.length;

					console.log(`Calculated centroid: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);

					// Make vertices relative to centroid
					const relativeVerts = worldVerts.map(v => ({
						x: v.x - centerX,
						y: v.y - centerY
					}));

					console.log(`Relative vertices:`, relativeVerts);

					const Matter = Phaser.Physics.Matter.Matter;

					try {
						const body = Matter.Bodies.fromVertices(
							centerX - 322,
							centerY - 10,
							relativeVerts,
							{ isStatic: true },
							true  // flagInternal - enables poly-decomp
						);

						if (body) {
							const partCount = body.parts ? body.parts.length - 1 : 1;
							console.log(`✓ Body created successfully`);
							console.log(`  Decomposed into ${partCount} part(s)`);
							console.log(`  Expected position: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
							console.log(`  Actual position: (${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)})`);
							console.log(`  Offset: (${(body.position.x - centerX).toFixed(2)}, ${(body.position.y - centerY).toFixed(2)})`);

							this.matter.world.add(body);
						} else {
							console.log(`✗ Body creation returned null`);
						}
					} catch (error) {
						console.error(`✗ Error creating polygon:`, error);
					}
				}
			});
		}


		// --- Checkpoints ---
		const checkpointLayer = map.getObjectLayer("Checkpoints");
		if (checkpointLayer) {
			checkpointLayer.objects.forEach((obj, index) => {
				// const checkpoint = this.matter.add.rectangle(
				// 	obj.x + obj.width / 2,
				// 	obj.y + obj.height / 2,
				// 	obj.width,
				// 	obj.height,
				// 	{
				// 		isStatic: true,
				// 		isSensor: true,
				// 		label: `checkpoint_${index}`,
				// 		checkpointId: index
				// 	}
				// );
				// this.checkpoints.push(checkpoint);
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
		this.car = this.matter.add.sprite(me.spawnX, me.spawnY, "car");
		this.car.setDisplaySize(100, this.car.height * (100 / this.car.width));
		this.car.setFrictionAir(0.05);
		this.car.setBounce(0);
		this.car.setFixedRotation();
		this.car.setDepth(10);

		// Spawn remote players
		if (this.roomData && this.roomData.players) {
			this.roomData.players.forEach(player => {
				if (player.id !== this.socket.id) {
					this.spawnRemotePlayer(player.id, player.spawnX, player.spawnY);
				}
			});
		}

		// Camera
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
		this.cameras.main.startFollow(this.car, false);
		this.cameras.main.setRoundPixels(true);
		this.cameras.main.setZoom(1);

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

		// Lap display
		this.lapText = this.add.text(16, 16, `Lap: ${this.currentLap}/${this.maxLaps}`, {
			fontSize: "32px",
			fontFamily: "Arial",
			color: "#ffffff",
			backgroundColor: "#000000",
			padding: { x: 10, y: 5 }
		}).setScrollFactor(0).setDepth(1000);

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

	spawnRemotePlayer(id, x, y) {
		const sprite = this.matter.add.sprite(x, y, "car");
		sprite.setDisplaySize(100, sprite.height * (100 / sprite.width));
		sprite.setRectangle(sprite.displayWidth, sprite.displayHeight);
		sprite.setStatic(true);
		sprite.setDepth(10);

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

		this.lapText.setText(`Lap: ${this.currentLap}/${this.maxLaps}`);

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
}