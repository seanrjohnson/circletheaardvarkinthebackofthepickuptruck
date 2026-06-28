import Phaser from "phaser";
import { closeLasso, distance, polygonCentroid } from "./geometry";
import { loadLeaderboard, normalizeName, saveScore } from "./leaderboard";
import { RoundModel } from "./model";
import { ROUND_TIME_MS, STARTING_LIVES, scoreTargets } from "./rules";
import type { Point, Slot, TargetType } from "./types";

type Screen = "title" | "start" | "play" | "end" | "gameover" | "highscores";
type Trail = { points: Point[]; color: number; remainingMs: number };

const FONT_WIDTH = 9;
const FONT_HEIGHT = 12;

class BitmapLine extends Phaser.GameObjects.Container {
  private value = "";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly font = "font-outline",
    scale = 1,
    centered = false,
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setScale(scale).setDepth(5);
    this.setText(text);
    if (centered) this.x -= (text.length * FONT_WIDTH * scale) / 2;
  }

  setText(text: string): this {
    if (text === this.value) return this;
    this.value = text;
    this.removeAll(true);
    [...text].forEach((character, index) => {
      const code = character.charCodeAt(0);
      const frame = code >= 32 && code <= 126 ? code - 32 : 0;
      this.add(this.scene.add.image(index * FONT_WIDTH, 0, this.font, frame).setOrigin(0));
    });
    return this;
  }
}

const ACTIVE_TEXTURES: Partial<Record<TargetType, string>> = {
  aardvark: "aardvark-active",
  bismarck: "bismarck-active",
  bisvark: "bisvark-active",
  aardmarck: "aardmarck-active",
  life: "heart",
  bonus_points: "bonus",
};

const SPAWN_TEXTURES: Partial<Record<TargetType, string>> = {
  aardvark: "aardvark-hiding",
  bismarck: "bismarck-hiding",
  bisvark: "bismarck-hiding",
  aardmarck: "aardmarck-hiding",
};

const TIMEOUT_TEXTURES: Partial<Record<TargetType, string>> = {
  aardvark: "aardvark-timeout",
  bismarck: "bismarck-timeout",
  bisvark: "bisvark-timeout",
  aardmarck: "aardmarck-timeout",
};

export class GameScene extends Phaser.Scene {
  private screen: Screen = "title";
  private background?: Phaser.GameObjects.Image;
  private cursor?: Phaser.GameObjects.Image;
  private pauseImage?: Phaser.GameObjects.Image;
  private readonly ui: Phaser.GameObjects.GameObject[] = [];
  private readonly targetViews = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly targetStates = new Map<number, string>();
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private lassoGraphics?: Phaser.GameObjects.Graphics;
  private currentLasso: Point[] = [];
  private trails: Trail[] = [];
  private keyboardDrawing = false;
  private paused = false;
  private model?: RoundModel;
  private roundRemainingMs = ROUND_TIME_MS;
  private score = 0;
  private lives = STARTING_LIVES;
  private level = 1;
  private lastScore = 0;
  private scoreMessageRemainingMs = 0;
  private scoreMessageCenter: Point = { x: 320, y: 240 };
  private lastRenderedHud = "";
  private nameInput?: HTMLInputElement;
  private renderedName = "";
  private musicKey?: string;

  constructor() {
    super("game");
  }

  preload(): void {
    this.load.setPath("assets");
    this.load.image("title", "TitleScreen.png");
    this.load.image("lot", "ParkingLot.png");
    this.load.image("gameover", "game_over.png");
    this.load.image("highscores", "high_scores.png");
    this.load.image("pause", "Pause.png");
    this.load.image("cursor", "cursor.png");
    this.load.image("heart", "heart.png");
    this.load.image("aardvark-hiding", "hiding_aardvark_sprite.png");
    this.load.image("bismarck-hiding", "hiding_bismarck_sprite.png");
    this.load.image("aardmarck-hiding", "hiding_aardmarck_sprite.png");
    this.load.image("bonus", "bonus_pts.png");
    this.load.spritesheet("font-outline", "smallerfont_outlined.png", {
      frameWidth: 9,
      frameHeight: FONT_HEIGHT,
    });
    this.load.spritesheet("font-blue", "smallerfont_outlined_blue.png", {
      frameWidth: 9,
      frameHeight: FONT_HEIGHT,
    });
    this.load.spritesheet("font-red", "smallerfont_outlined_red.png", {
      frameWidth: 9,
      frameHeight: FONT_HEIGHT,
    });
    this.load.spritesheet("aardvark-active", "aardvark_stand.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("bismarck-active", "bismarck_stand.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("bisvark-active", "bisvark_stand.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("aardmarck-active", "aardmarck_stand.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("aardvark-timeout", "aardvark_squat.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("bismarck-timeout", "bismarck_squat.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("bisvark-timeout", "bisvark_squat.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("aardmarck-timeout", "aardmarck_squat.png", {
      frameWidth: 82,
      frameHeight: 134,
    });
    this.load.spritesheet("confetti", "confetti.png", { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("heart-fade", "heart_fade.png", { frameWidth: 40, frameHeight: 41 });
    this.load.spritesheet("bonus-fade", "bonus_pts_fade.png", {
      frameWidth: 50,
      frameHeight: 50,
    });
    this.load.audio("intro", ["introMusic.ogg", "introMusic.mp3"]);
    this.load.audio("main", ["mainMusic.ogg", "mainMusic.mp3"]);
    this.load.audio("cascade", "Cascade0.ogg");
    this.load.audio("pop", ["pop.ogg", "pop.mp3"]);
    this.load.audio("buzz", ["buzz.ogg", "buzz.mp3"]);
    this.load.audio("life-sound", ["get_a_life.ogg", "get_a_life.mp3"]);
  }

  create(): void {
    this.createAnimations();
    this.input.setDefaultCursor("none");
    this.lassoGraphics = this.add.graphics().setDepth(8);
    this.cursor = this.add.image(0, 0, "cursor").setDepth(20).setVisible(false);
    this.pauseImage = this.add.image(320, 240, "pause").setDepth(30).setVisible(false);
    this.nameInput = document.querySelector<HTMLInputElement>("#player-name")!;
    this.nameInput.addEventListener("input", () => {
      const clean = this.nameInput!.value.replace(/[^a-z0-9]/gi, "").slice(0, 12);
      if (clean !== this.nameInput!.value) this.nameInput!.value = clean;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) =>
      this.handlePointerMove(pointer),
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) =>
      this.handlePointerDown(pointer),
    );
    this.input.on("pointerup", () => this.handlePointerUp());
    this.input.on("gameout", () => {
      if (!this.keyboardDrawing) this.currentLasso = [];
    });
    this.game.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (this.screen === "play") this.togglePause();
    });

    const keyboard = this.input.keyboard!;
    keyboard.on("keydown-P", () => this.screen === "play" && this.togglePause());
    keyboard.on("keydown-ESC", () => this.screen === "play" && this.togglePause());
    keyboard.on("keydown-SPACE", (event: KeyboardEvent) => {
      if (event.repeat || this.screen !== "play" || this.paused) return;
      event.preventDefault();
      this.keyboardDrawing = !this.keyboardDrawing;
      this.currentLasso = this.keyboardDrawing ? [this.pointerPoint(this.input.activePointer)] : [];
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.screen === "play" && !this.paused) this.togglePause();
    });
    this.scale.on("resize", () => this.positionNameInput());
    this.showTitle();
  }

  update(_time: number, rawDelta: number): void {
    const pointer = this.input.activePointer;
    this.cursor?.setPosition(pointer.x, pointer.y).setVisible(!pointer.wasTouch);
    if (this.keyboardDrawing && this.screen === "play" && !this.paused) {
      this.addLassoPoint(this.pointerPoint(pointer));
    }
    if (this.screen === "gameover" && this.nameInput?.value !== this.renderedName) {
      this.renderedName = this.nameInput?.value ?? "";
      this.renderGameOverText();
    }
    if (this.screen !== "play" || this.paused || !this.model) {
      this.drawLassos();
      return;
    }

    const delta = Math.min(rawDelta, 100);
    this.roundRemainingMs -= delta;
    this.scoreMessageRemainingMs = Math.max(0, this.scoreMessageRemainingMs - delta);
    for (const trail of this.trails) trail.remainingMs -= delta;
    this.trails = this.trails.filter((trail) => trail.remainingMs > 0);

    for (const event of this.model.update(delta)) {
      if (event.type === "timedout" && this.level >= 5 && event.target.targetClass === "points") {
        this.lives = Math.max(0, this.lives - 1);
        this.playEffect("buzz");
      }
    }
    this.syncTargets();
    this.renderHud();
    this.drawLassos();

    if (this.lives <= 0) this.showGameOver();
    else if (this.roundRemainingMs <= 0) this.showLevelComplete();
  }

  private createAnimations(): void {
    const add = (key: string, texture: string, end: number, repeat = 0): void => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end }),
        frameRate: 30,
        repeat,
      });
    };
    add("aardvark-active-animation", "aardvark-active", 5);
    add("bismarck-active-animation", "bismarck-active", 6);
    add("bisvark-active-animation", "bisvark-active", 6);
    add("aardmarck-active-animation", "aardmarck-active", 5);
    add("aardvark-timeout-animation", "aardvark-timeout", 9);
    add("bismarck-timeout-animation", "bismarck-timeout", 9);
    add("bisvark-timeout-animation", "bisvark-timeout", 9);
    add("aardmarck-timeout-animation", "aardmarck-timeout", 9);
    add("confetti-animation", "confetti", 27);
    add("heart-fade-animation", "heart-fade", 4);
    add("bonus-fade-animation", "bonus-fade", 9);
  }

  private pointerPoint(pointer: Phaser.Input.Pointer): Point {
    return { x: pointer.x, y: pointer.y };
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer !== this.input.pointer1 && this.screen === "play") {
      this.togglePause();
      return;
    }
    const point = this.pointerPoint(pointer);
    if (this.screen === "title") {
      if (point.x > 12 && point.x < 105 && point.y > 423 && point.y < 475) {
        this.resetGame();
        this.showLevelStart();
      } else if (point.x > 245 && point.x < 360 && point.y > 423 && point.y < 475) {
        this.showHighScores();
      }
      return;
    }
    if (this.screen === "start") {
      this.startRound();
      return;
    }
    if (this.screen === "end") {
      this.level += 1;
      this.showLevelStart();
      return;
    }
    if (this.screen === "gameover") {
      if (point.x > 365 && point.x < 625 && point.y > 285 && point.y < 340) {
        this.nameInput?.focus();
      } else if (point.x > 465 && point.x < 625 && point.y > 345 && point.y < 382) {
        this.submitScore();
      } else if (point.x > 315 && point.x < 435 && point.y > 397 && point.y < 470) {
        this.resetGame();
        this.showLevelStart();
      } else if (point.x > 460 && point.x < 635 && point.y > 392 && point.y < 470) {
        this.resetGame();
        this.showTitle();
      }
      return;
    }
    if (this.screen === "highscores") {
      if (point.x > 440 && point.x < 530 && point.y > 400 && point.y < 478) {
        this.resetGame();
        this.showLevelStart();
      } else if (point.x > 530 && point.x < 638 && point.y > 400 && point.y < 478) {
        this.showTitle();
      }
      return;
    }
    if (this.screen === "play" && !this.paused) this.currentLasso = [point];
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.screen !== "play" || this.paused) return;
    if (pointer.isDown || this.keyboardDrawing) this.addLassoPoint(this.pointerPoint(pointer));
  }

  private handlePointerUp(): void {
    if (!this.keyboardDrawing) this.currentLasso = [];
  }

  private addLassoPoint(point: Point): void {
    const previous = this.currentLasso.at(-1);
    if (previous && distance(previous, point) <= 5) return;
    this.currentLasso.push(point);
    const polygon = closeLasso(this.currentLasso);
    if (!polygon) return;
    this.completeLasso(polygon);
    this.currentLasso = [point];
  }

  private completeLasso(polygon: Point[]): void {
    if (!this.model) return;
    const targets = this.model.circle(polygon);
    const result = scoreTargets(this.score, this.lives, this.level, targets);
    this.score = result.score;
    this.lives = result.lives;
    this.lastScore = result.deltaScore;
    this.scoreMessageCenter = polygonCentroid(polygon);
    this.scoreMessageRemainingMs = result.deltaScore === 0 ? 0 : 2000;
    for (const target of targets) {
      this.playEffect(
        target.targetClass === "bad" ? "buzz" : target.type === "life" ? "life-sound" : "pop",
      );
    }
    this.trails.push({
      points: polygon,
      color: Phaser.Display.Color.RandomRGB().color,
      remainingMs: 2500,
    });
    this.syncTargets();
    this.renderHud();
  }

  private syncTargets(): void {
    if (!this.model) return;
    for (const slot of this.model.slots) {
      if (!slot.target || !slot.state) {
        this.targetViews.get(slot.id)?.destroy();
        this.targetViews.delete(slot.id);
        this.targetStates.delete(slot.id);
        continue;
      }
      const signature = `${slot.target.type}:${slot.state}`;
      if (this.targetStates.get(slot.id) === signature) continue;
      this.targetViews.get(slot.id)?.destroy();
      const sprite = this.createTargetView(slot);
      if (sprite) this.targetViews.set(slot.id, sprite);
      else this.targetViews.delete(slot.id);
      this.targetStates.set(slot.id, signature);
    }
  }

  private createTargetView(slot: Slot): Phaser.GameObjects.Sprite | undefined {
    const target = slot.target!;
    const state = slot.state!;
    let texture: string | undefined;
    let animation: string | undefined;
    if (state === "spawn") texture = SPAWN_TEXTURES[target.type];
    else if (state === "active") {
      texture = ACTIVE_TEXTURES[target.type];
      if (!["life", "bonus_points"].includes(target.type)) {
        animation = `${target.type}-active-animation`;
      }
    } else if (state === "timedout") {
      texture = TIMEOUT_TEXTURES[target.type];
      if (texture) animation = `${target.type}-timeout-animation`;
    } else {
      texture =
        target.type === "life"
          ? "heart-fade"
          : target.type === "bonus_points"
            ? "bonus-fade"
            : "confetti";
      animation =
        target.type === "life"
          ? "heart-fade-animation"
          : target.type === "bonus_points"
            ? "bonus-fade-animation"
            : "confetti-animation";
    }
    if (!texture) return undefined;
    const yOffset =
      target.type === "aardmarck" ? -11 : ["life", "bonus_points"].includes(target.type) ? -5 : 0;
    const sprite = this.add.sprite(slot.x, slot.y + yOffset, texture).setDepth(2);
    if (animation) sprite.play(animation);
    return sprite;
  }

  private drawLassos(): void {
    const graphics = this.lassoGraphics;
    if (!graphics) return;
    graphics.clear();
    const draw = (points: Point[], color: number): void => {
      if (points.length < 2) return;
      graphics.lineStyle(2, color, 1).beginPath().moveTo(points[0]!.x, points[0]!.y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.strokePath();
    };
    for (const trail of this.trails) draw(trail.points, trail.color);
    draw(this.currentLasso, 0xffffff);
  }

  private showTitle(): void {
    this.clearScreen();
    this.screen = "title";
    this.setBackground("title");
    this.playMusic("intro", 1);
  }

  private showLevelStart(): void {
    this.clearScreen();
    this.screen = "start";
    this.setBackground("lot");
    this.addLine(`Level: ${this.level}`, 320, 84, 3, "font-outline", true);
    this.addLine(`Score: ${this.score}`, 320, 180, 3, "font-outline", true);
    this.addLine("Click To Start", 320, 372, 4, "font-red", true);
  }

  private startRound(): void {
    this.clearScreen();
    this.screen = "play";
    this.setBackground("lot");
    this.model = new RoundModel(this.level);
    this.roundRemainingMs = ROUND_TIME_MS;
    this.lastScore = 0;
    this.lastRenderedHud = "";
    this.playMusic("main", 0.2);
    this.renderHud();
  }

  private showLevelComplete(): void {
    this.clearScreen();
    this.screen = "end";
    this.setBackground("lot");
    this.stopMusic();
    this.addLine("Level Complete!", 320, 78, 4, "font-blue", true);
    this.addLine(`Score: ${this.score}`, 320, 180, 3, "font-outline", true);
    this.addLine("Click To Continue", 320, 372, 4, "font-red", true);
  }

  private showGameOver(): void {
    this.clearScreen();
    this.screen = "gameover";
    this.setBackground("gameover");
    this.playMusic("cascade", 1);
    this.nameInput!.value = "";
    this.renderedName = "";
    this.showNameInput(true);
    this.renderGameOverText();
  }

  private renderGameOverText(): void {
    this.ui.splice(0).forEach((object) => object.destroy());
    this.addLine(String(this.level), 398, 231, 2);
    this.addLine(String(this.score), 397, 267, 2);
    this.addLine(this.nameInput?.value ?? "", 380, 314, 2);
  }

  private showHighScores(): void {
    this.clearScreen();
    this.screen = "highscores";
    this.setBackground("highscores");
    this.playMusic("cascade", 1);
    const entries = loadLeaderboard();
    if (entries.length === 0) {
      this.addLine("No local scores yet", 320, 92, 2, "font-outline", true);
      return;
    }
    entries.forEach((entry, index) => {
      const y = 80 + index * 31;
      this.addLine(entry.name, 70, y, 2);
      this.addLine(String(entry.score), 360, y, 2);
    });
  }

  private submitScore(): void {
    saveScore({
      name: normalizeName(this.nameInput?.value ?? ""),
      level: this.level,
      score: this.score,
      timestamp: Date.now(),
    });
    this.showHighScores();
  }

  private resetGame(): void {
    this.score = 0;
    this.level = 1;
    this.lives = STARTING_LIVES;
    this.paused = false;
    this.pauseImage?.setVisible(false);
  }

  private renderHud(): void {
    const seconds = Math.max(0, Math.ceil(this.roundRemainingMs / 1000));
    const signature = `${seconds}:${this.score}:${this.lives}:${this.scoreMessageRemainingMs > 0}`;
    if (signature === this.lastRenderedHud) return;
    this.lastRenderedHud = signature;
    this.ui.splice(0).forEach((object) => object.destroy());
    this.hearts.splice(0).forEach((heart) => heart.destroy());
    this.addLine(String(seconds).padStart(2, "0"), 5, 5, 2);
    this.addLine(String(this.score), 630, 5, 2, "font-outline", true);
    this.addLine(`Level:${this.level}`, 475, 455, 2);
    for (let index = 0; index < this.lives; index += 1) {
      this.hearts.push(
        this.add
          .image(10 + index * 50, 429, "heart")
          .setOrigin(0)
          .setDepth(4),
      );
    }
    if (this.scoreMessageRemainingMs > 0 && this.lastScore !== 0) {
      this.addLine(
        String(this.lastScore),
        this.scoreMessageCenter.x,
        this.scoreMessageCenter.y,
        2.5,
        this.lastScore < 0 ? "font-red" : "font-blue",
        true,
      );
    }
  }

  private addLine(
    text: string,
    x: number,
    y: number,
    scale = 1,
    font = "font-outline",
    centered = false,
  ): BitmapLine {
    const line = new BitmapLine(this, x, y, text, font, scale, centered);
    this.ui.push(line);
    return line;
  }

  private setBackground(key: string): void {
    this.background?.destroy();
    this.background = this.add.image(0, 0, key).setOrigin(0).setDepth(0);
  }

  private clearScreen(): void {
    this.ui.splice(0).forEach((object) => object.destroy());
    this.hearts.splice(0).forEach((heart) => heart.destroy());
    this.targetViews.forEach((view) => view.destroy());
    this.targetViews.clear();
    this.targetStates.clear();
    this.model = undefined;
    this.currentLasso = [];
    this.trails = [];
    this.keyboardDrawing = false;
    this.showNameInput(false);
  }

  private togglePause(): void {
    if (this.screen !== "play") return;
    this.paused = !this.paused;
    this.pauseImage?.setVisible(this.paused);
    if (this.paused) this.sound.pauseAll();
    else this.sound.resumeAll();
  }

  private playMusic(key: string, volume: number): void {
    if (this.musicKey === key && this.sound.get(key)?.isPlaying) return;
    this.stopMusic();
    this.musicKey = key;
    this.sound.play(key, { loop: true, volume });
  }

  private stopMusic(): void {
    if (this.musicKey) this.sound.stopByKey(this.musicKey);
    this.musicKey = undefined;
  }

  private playEffect(key: string): void {
    this.sound.play(key, { volume: 0.3 });
  }

  private showNameInput(visible: boolean): void {
    this.nameInput?.classList.toggle("visible", visible);
    if (visible) this.positionNameInput();
    else this.nameInput?.blur();
  }

  private positionNameInput(): void {
    if (!this.nameInput?.classList.contains("visible")) return;
    const rect = this.game.canvas.getBoundingClientRect();
    Object.assign(this.nameInput.style, {
      left: `${rect.left + (365 / 640) * rect.width}px`,
      top: `${rect.top + (287 / 480) * rect.height}px`,
      width: `${(260 / 640) * rect.width}px`,
      height: `${(55 / 480) * rect.height}px`,
      fontSize: `${(24 / 480) * rect.height}px`,
    });
  }
}
