const FEELERS = [
    { angle: 0,             length: 130 },
    { angle:  Math.PI / 6,  length: 110 },
    { angle: -Math.PI / 6,  length: 110 },
    { angle:  Math.PI / 3,  length:  80 },
    { angle: -Math.PI / 3,  length:  80 },
];

const WALL_STEER_WEIGHT     = 1.8;
const WAYPOINT_STEER_WEIGHT = 1.0;
const REACH_RADIUS          = 90;

const ACCELERATION  = 0.0001;
const MAX_SPEED     = 18;
const ANGULAR_SPEED = 0.003;
const AIR_FRICTION  = 0.05;
const NET_INTERVAL  = 50;

export default class NPCCar {
    constructor(scene, npcId, x, y, textureKey, isHost) {
        this.scene   = scene;
        this.npcId   = npcId;
        this.isHost  = isHost;
        this.roomId  = scene.roomId;

        this.waypointIndex     = 0;
        this.currentLap        = 0;
        this.maxLaps           = scene.maxLaps;
        this.passedCheckpoints = new Set();
        this.totalCheckpoints  = scene.totalCheckpoints;
        this.hasFinished       = false;

        this._lastNetUpdate = 0;

        this.sprite = scene.matter.add.sprite(x, y, textureKey);
        this.sprite.setDisplaySize(60, this.sprite.height * (60 / this.sprite.width));
        this.sprite.setMass(1);
        this.sprite.setFrictionAir(AIR_FRICTION);
        this.sprite.setBounce(0);
        this.sprite.setFixedRotation();
        this.sprite.setDepth(10);

        if (!isHost) {
            this.sprite.setStatic(true);
            this.targetX        = x;
            this.targetY        = y;
            this.targetRotation = 0;
        }

        this.debugDraw = false;
        if (this.debugDraw && isHost) {
            this.debugGfx = scene.add.graphics().setDepth(50);
        }
    }

    update(time, delta) {
        if (this.isHost) {
            this._hostUpdate(time, delta);
        } else {
            this._interpolate();
        }
    }

    // Called from RaceScene collisionstart — HOST ONLY
    onCheckpointCrossed(checkpointId) {
        if (!this.isHost || this.hasFinished) return;
        if (this.passedCheckpoints.has(checkpointId)) return;

        this.passedCheckpoints.add(checkpointId);

        this._emit("npcCheckpointPassed", {
            roomId:       this.roomId,
            npcId:        this.npcId,
            checkpointId: checkpointId,
        });
    }

    onFinishLineCrossed() {
        if (!this.isHost || this.hasFinished) return;

        // Refresh totalCheckpoints in case it was 0 at construction time
        if (this.totalCheckpoints === 0) {
            this.totalCheckpoints = this.scene.totalCheckpoints;
        }

        if (this.passedCheckpoints.size < this.totalCheckpoints) {
            console.log(`NPC ${this.npcId}: only ${this.passedCheckpoints.size}/${this.totalCheckpoints} checkpoints — lap not counted`);
            return;
        }

        this.currentLap++;
        this.passedCheckpoints.clear();
        this.waypointIndex = 0;

        console.log(`NPC ${this.npcId} completed lap ${this.currentLap}/${this.maxLaps}`);

        this._emit("npcLapCompleted", {
            roomId:           this.roomId,
            npcId:            this.npcId,
            totalCheckpoints: this.totalCheckpoints,
        });

        if (this.currentLap >= this.maxLaps) {
            this.hasFinished = true;
            this.sprite.setVelocity(0, 0);
			this.scene.matter.world.remove(this.sprite.body);
            this.sprite.setAngularVelocity(0);
        }
    }

    // Called on non-host clients when playerMoved arrives for this NPC id
    setTarget(x, y, rotation) {
        this.targetX        = x;
        this.targetY        = y;
        this.targetRotation = rotation;
    }

    destroy() {
        if (this.sprite)   this.sprite.destroy();
        if (this.debugGfx) this.debugGfx.destroy();
    }

    // ── Private ────────────────────────────────────────────────────────────

    // Safe emit — guards against missing socket so a failure here never
    // silently falls through to trigger the player's own lap logic
    _emit(event, data) {
        if (!this.scene.socket) {
            console.warn(`NPCCar._emit: no socket, could not emit "${event}"`);
            return;
        }
        this.scene.socket.emit(event, data);
    }

    _hostUpdate(time, delta) {
        if (this.hasFinished) return;

        if (this.totalCheckpoints === 0) {
            this.totalCheckpoints = this.scene.totalCheckpoints;
        }

        if (this.debugDraw) this.debugGfx?.clear();

        const steer = this._computeSteering();
        this._applyDrive(delta, steer);
        this._checkWaypointReached();

        if (time > this._lastNetUpdate + NET_INTERVAL) {
            this._lastNetUpdate = time;
            const vel = this.sprite.body.velocity;
            this._emit("npcMove", {
                roomId:    this.roomId,
                npcId:     this.npcId,
                x:         this.sprite.x,
                y:         this.sprite.y,
                rotation:  this.sprite.rotation,
                velocityX: vel.x,
                velocityY: vel.y,
            });
        }
    }

    _computeSteering() {
        const waypointSteer = this._checkpointSteering();
        const wallSteer     = this._wallFeelerSteering();
        const wallMagnitude = Math.abs(wallSteer);
        const blend         = Math.min(wallMagnitude, 1.0);

        const raw = (wallSteer     * WALL_STEER_WEIGHT     * blend)
                  + (waypointSteer * WAYPOINT_STEER_WEIGHT * (1 - blend * 0.5));

        return Phaser.Math.Clamp(raw, -1, 1);
    }

    _checkpointSteering() {
        const checkpoints = this.scene.checkpoints;
        if (!checkpoints?.length) return 0;

        const target  = checkpoints[this.waypointIndex];
        const dx      = target.position.x - this.sprite.x;
        const dy      = target.position.y - this.sprite.y;
        const desired = Math.atan2(dy, dx);
        const diff    = Phaser.Math.Angle.Wrap(desired - this.sprite.rotation);

        return Phaser.Math.Clamp(diff / Math.PI, -1, 1);
    }

    _wallFeelerSteering() {
        const bodies  = this.scene.matter.world.getAllBodies()
                            .filter(b => b.isStatic && !b.isSensor);
        const ox      = this.sprite.x;
        const oy      = this.sprite.y;
        const heading = this.sprite.rotation;

        let steerCorrection = 0;

        FEELERS.forEach(feeler => {
            const worldAngle = heading + feeler.angle;
            const ex = ox + Math.cos(worldAngle) * feeler.length;
            const ey = oy + Math.sin(worldAngle) * feeler.length;

            const hits = Phaser.Physics.Matter.Matter.Query.ray(
                bodies,
                { x: ox, y: oy },
                { x: ex, y: ey }
            );

            if (this.debugDraw) {
                this.debugGfx?.lineStyle(1, hits.length ? 0xff2222 : 0x22ff22, 0.8);
                this.debugGfx?.lineBetween(ox, oy, ex, ey);
            }

            if (hits.length > 0) {
                const normalised = feeler.angle / (Math.PI / 3);
                const urgency    = feeler.length / 130;
                steerCorrection -= normalised * urgency;
            }
        });

        return Phaser.Math.Clamp(steerCorrection, -1, 1);
    }

    _applyDrive(delta, steer) {
        const force = this.scene.matter.vector.rotate(
            { x: ACCELERATION * delta, y: 0 },
            this.sprite.rotation
        );
        this.sprite.applyForce(force);

        const vel   = this.sprite.body.velocity;
        const speed = Math.hypot(vel.x, vel.y);
        if (speed > MAX_SPEED) {
            const f = MAX_SPEED / speed;
            this.sprite.setVelocity(vel.x * f, vel.y * f);
        }

        this.sprite.setAngularVelocity(steer * ANGULAR_SPEED * delta);
    }

    _checkWaypointReached() {
        const checkpoints = this.scene.checkpoints;
        if (!checkpoints?.length) return;

        const target = checkpoints[this.waypointIndex];
        const dx     = target.position.x - this.sprite.x;
        const dy     = target.position.y - this.sprite.y;

        if (Math.hypot(dx, dy) < REACH_RADIUS) {
            this.waypointIndex = (this.waypointIndex + 1) % checkpoints.length;
        }
    }

    _interpolate() {
        this.sprite.setPosition(
            Phaser.Math.Linear(this.sprite.x, this.targetX, 0.2),
            Phaser.Math.Linear(this.sprite.y, this.targetY, 0.2)
        );
        this.sprite.setRotation(
            Phaser.Math.Angle.RotateTo(this.sprite.rotation, this.targetRotation, 0.1)
        );
    }
}