export default class RaceScene extends Phaser.Scene {
	constructor() {
		super("RaceScene");

		// Input states
		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;

		this.acceleration = 0.01;
		this.maxSpeed = 50;
	}

	preload() {
		this.load.image("tiles", "assets/race_track_tiles.png");
		this.load.image("car", "assets/car.png");
		this.load.tilemapTiledJSON("trackTMJ", "assets/Track.tmj");
	}

	create() {
		// --- Tilemap ---
		const map = this.make.tilemap({ key: "trackTMJ" });
		const tileset = map.addTilesetImage("race_track_tiles", "tiles", 128, 128, 1, 2);
		map.layers.forEach(layer => map.createLayer(layer.name, tileset, 0, 0));
		this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		// --- Collisions ---
		const collisionLayer = map.getObjectLayer("Collisions");
		collisionLayer.objects.forEach(obj => {
			if (obj.rectangle) {
				this.matter.add.rectangle(
					obj.x + obj.width / 2,
					obj.y + obj.height / 2,
					obj.width,
					obj.height,
					{ isStatic: true, angle: Phaser.Math.DegToRad(obj.rotation || 0) }
				);
			} else if (obj.polygon) {
				const verts = obj.polygon.map(p => ({ x: p.x, y: p.y }));
				const centroid = verts.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
				centroid.x /= verts.length;
				centroid.y /= verts.length;
				const localVerts = verts.map(p => ({ x: p.x - centroid.x, y: p.y - centroid.y }));
				this.matter.add.fromVertices(obj.x + centroid.x, obj.y + centroid.y, localVerts, { isStatic: true }, true);
			}
		});

		// --- Car ---
		this.car = this.matter.add.sprite(940, 500, "car");
		this.car.setDisplaySize(100, this.car.height * (100 / this.car.width));
		this.car.setFrictionAir(0.05);
		this.car.setBounce(0);
		this.car.setFixedRotation();

		// --- Camera ---
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
		this.cameras.main.startFollow(this.car, false);
		this.cameras.main.setRoundPixels(true);
		this.cameras.main.setZoom(1);

		// --- Keyboard ---
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
	}

	update() {
		// --- Acceleration / braking ---
		const accelerating = this.cursors.up.isDown || this.touchAccel;
		const braking = this.cursors.down.isDown || this.touchBrake;

		if (accelerating) {
			const force = this.matter.vector.rotate({ x: this.acceleration, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		} else if (braking) {
			const force = this.matter.vector.rotate({ x: -this.acceleration, y: 0 }, this.car.rotation);
			this.car.applyForce(force);
		}

		// --- Steering ---
		let steer = 0;
		if (this.cursors.left.isDown || this.steerLeft) steer = -1;
		else if (this.cursors.right.isDown || this.steerRight) steer = 1;
		this.car.setAngularVelocity(steer * 0.05);

		// --- Speed clamp ---
		const vel = this.car.body.velocity;
		const speed = Math.hypot(vel.x, vel.y);
		if (speed > this.maxSpeed) {
			const factor = this.maxSpeed / speed;
			this.car.setVelocity(vel.x * factor, vel.y * factor);
		}

		// Camera follows with integer scroll to avoid sub-pixel bleed
		this.cameras.main.scrollX = Math.round(this.car.x - this.cameras.main.width * 0.5);
		this.cameras.main.scrollY = Math.round(this.car.y - this.cameras.main.height * 0.5);
	}
}
