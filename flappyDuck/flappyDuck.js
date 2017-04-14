var debug = false;

// Define a class to represent decorations
function Decoration(image) {
	this.image = image;
	this.x = 0;
	this.y = 0;
	this.vx = 0;
	this.vy = 0;
}
Decoration.prototype = {
	// Draw the image with its center at (this.x,this.y)
	draw: function(context) {
		imWidth = this.image.width;
		imHeight = this.image.height;
		context.drawImage(this.image,this.x - imWidth / 2,this.y - imHeight / 2);
	},
	step: function(dt) {
		this.x = this.x + this.vx*dt;
		this.y = this.y + this.vy*dt;
	},
}

// Define a class to represent a fifo list of decorations
function DecorationFIFO() {
	this.fifo = [];
}
DecorationFIFO.prototype = {
	draw: function(context) {
		for (var i=0; i<this.fifo.length; i += 1) {
			this.fifo[i].draw(context);
		}
	},
	step: function(dt) {
		for (var i=0; i<this.fifo.length; i += 1) {
			this.fifo[i].step(dt);
		}
	},
	// Add an item to the fifo. 
	push: function(item) {
		this.fifo.push(item);
	},
	pop: function() {
		return this.fifo.shift();
	},
	first: function() {
		return this.fifo[0];
	},
	clear: function() {
		this.fifo.length = 0;
	}
}

// Define a class to represent rectangular collision boxes
function CollisionBox(x,y,xw,yw) {
	this.x = x;
	this.y = y;
	this.xw = xw;
	this.yw = yw;
}
CollisionBox.prototype = {
	draw: function(context) {
		context.save();
		context.globalAlpha = 0.2;
		context.fillStyle = "#ff0000";
		context.fillRect(this.x,this.y,this.xw,this.yw);
		context.restore();
	},
	setX: function(x) {
		this.x = x;
	},
	setY: function(y) {
		this.y = y;
	},
	setXW: function(xw) {
		this.xw = xw;
	},
	setYW: function(yw) {
		this.yw = yw;
	},
	collidesWith: function(otherBox) {
		function isInside(point,box) {
			if (((point[0] > box.x) && (point[0] < (box.x + box.xw)))
				&& ((point[1] > box.y) && (point[1] < (box.y + box.yw)))) {
				return true;
			}
			else {
				return false;
			}
		}
		var A = [	[this.x,this.y],
					[this.x + this.xw, this.y],
					[this.x + this.xw, this.y + this.yw],
					[this.x, this.y + this.yw]	];
		var B = [	[otherBox.x, otherBox.y],
					[otherBox.x + otherBox.xw, otherBox.y],
					[otherBox.x + otherBox.xw, otherBox.y + otherBox.yw],
					[otherBox.x, otherBox.y + otherBox.yw]	];
		for (var i=0; i<A.length; i++) {
			if (isInside(A[i],otherBox)) {
				return true;
			}
		}
		for (var i=0; i<B.length; i++) {
			if (isInside(B[i],this)) {
				return true;
			}
		}
		return false;
	},
}

// Define a class to represent the player's FlappyDuck character
function FlappyDuck(x,y,image,flapSound) {
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.flapStrength = 5;
	this.wingsUp = true;
	this.image = image;
	this.collider = new CollisionBox(0,0,32,32);
	this.flapSound = flapSound;
}
FlappyDuck.prototype = {
	// Apply acceleration to the duck
	accelerate: function(ax,ay) {
		this.vx = this.vx + ax;
		this.vy = this.vy + ay;
	},
	// Step the duck forward in time
	step: function(dt) {
		this.x = this.x + this.vx*dt;
		this.y = this.y + this.vy*dt;
		if (this.y>512-64) {
			this.y = 512 - 64;
			this.vy = 0;
		}
		else if (this.y < 0) {
			this.y = 0;
			this.vy = 0;
		}
		this.collider.setX(this.x + 8);
		this.collider.setY(this.y + 16);
	},
	// Draw the duck at it's current position
	draw: function(context) {
		context.save();
		var x = this.x;
		var y = this.y;
		var vx = this.vx;
		var vy = this.vy;
		if (this.wingsUp) {
			context.drawImage(this.image,
				0,0,64,64,
				this.x,this.y,64,64);
		}
		else {
			context.drawImage(this.image,
				64,0,64,64,
				this.x,this.y,64,64);
		}
		if (debug) {
			this.collider.draw(context);
		}
		context.restore();
	},
	// Flap the wings of the duck
	flapDown: function() {
		//console.log("flapDown");
		if (this.wingsUp) {
			this.vy -= this.flapStrength;
			this.wingsUp = false;
			this.flapSound.pause();
			this.flapSound.currentTime = 0;
			this.flapSound.play();
		}
	},
	// Flap the wings of the duck
	flapUp: function() {
		//console.log("flapUp");
		this.wingsUp = true;
	},
}

// Define a class to represent pipe obstacles
function FlappyDuckPipe(pipeImage,clearPosition) {
	this.passed = false;
	this.image = pipeImage;
	this.clearPos = clearPosition;
	this.gapSize = 64;
	this.x = 512;
	this.v = -2;
	this.colliderTop = new CollisionBox(512,0,80,clearPosition-64);
	this.colliderBottom = new CollisionBox(512, clearPosition + this.gapSize, 80, 512 - (clearPosition + this.gapSize));
}
FlappyDuckPipe.prototype = {
	draw: function(context) {
		// First figure out the number of 64px segments to draw above and below the clear position
		var topClear = this.clearPos; // Position of top area of gap
		var bottomClear = Math.min(topClear + this.gapSize,512); // Position of bottom area of gap
		context.save();
		// Draw the bottom pipe
		context.drawImage(this.image,
				0,64,128,128,
				 this.x,bottomClear,128,128);
		for (var pos = bottomClear + 128; pos < 512; pos += 64) {
			context.drawImage(this.image,
					0,128,128,256,
					this.x,pos,128,256);
		}
		// Draw the top pipe
		context.drawImage(this.image,
				0,0,128,64,
				this.x,topClear - 128,128,64);
		for (var pos = topClear - 192; pos+64 > 0; pos -= 64) {
			context.drawImage(this.image,
					0,128,128,256,
					this.x,pos,128,256);
		}
		if (debug) {
			this.colliderTop.draw(context);
			this.colliderBottom.draw(context);
		}
		context.restore();
	},
	step: function(dt,parent) {
		this.x = this.x + this.v*dt;
		this.colliderTop.setX(this.x + 24);
		this.colliderBottom.setX(this.x + 24);
		if (this.x < 10) {
			if (!this.passed) {
				this.passed = true;
				parent.score++;
				parent.coinSound.play();
			}
		}
	}
}

// Define a class to represent a FIFO list of pipes
function PipeFIFO(pipeImage,nPipes) {
	this.fifo = [];
	this.n = Math.floor(nPipes);
	this.image = pipeImage;
}
PipeFIFO.prototype = {
	// Draw all of the pipes
	draw: function(context) {
		for (var i=0; i<this.fifo.length; i++) {
			this.fifo[i].draw(context);
		}
	},
	// Step all pipes forward in time
	step: function(dt,parent) {
		for (var i=0; i<this.fifo.length; i++) {
			this.fifo[i].step(dt,parent);
		}
		// Test to see if first pipe should be removed
		if (this.fifo.length != 0 && (this.fifo[0].x < -128 || this.fifo.length > 3)) {
			this.pop();
		}
		// Test to see if a pipe should be added
		if (this.fifo.length == 0) {
			this.push(new FlappyDuckPipe(this.image,(512 - 128) * Math.random()))
		}
		else {
			var lastPipe = this.fifo[this.fifo.length - 1];
			var lastX = lastPipe.x;
			var newPipeThreshold = 512 / this.n;
			if (lastX < 512 - newPipeThreshold) {
				this.push(new FlappyDuckPipe(this.image,(512 - 128) * Math.random()));
			}
		}
	},
	// Add an additional pipe
	push: function(pipe) {
		this.fifo.push(pipe);
	},
	// Remove a pipe
	pop: function() {
		return this.fifo.shift();
	},
	clear: function() {
		this.fifo.length = 0;
	},
	first: function() {
		return this.fifo[0];
	},
	getLength: function() {
		return this.fifo.length;
	},
}

// Define a class for the FlappyDuck game
function FlappyDuckGame(canvas,playerImage,pipeImage,cloudImage,coinSound,crashSound,flapSound,quackSound,ducksSound) {
	// Create the player
	this.player = new FlappyDuck(64,256,playerImage,flapSound);
	// Initialize gravity
	this.gravity = 0.5;
	// Save the canvas
	this.canvas = canvas;
	this.context = canvas.getContext("2d");
	this.dt = 1;
	this.state = "start"; // Valid states are "start", "playing", and "end"
	// The allowed state transitions are start -> playing, playing -> end, and end -> playing.
	// The score in the game
	this.score = 0;
	// The FIFO of pipes (3 pipes max on screen)
	this.pipes = new PipeFIFO(pipeImage,2);
	// Clouds in the background
	this.cloudImage = cloudImage;
	this.clouds = new DecorationFIFO(7);
	// Save the sound effects
	this.coinSound = coinSound;
	this.crashSound = crashSound;
	this.flapSound = flapSound;
	this.quackSound = quackSound;
	this.ducksSound = ducksSound;
}
// Draw the game screen in the provided canvas
FlappyDuckGame.prototype = {
	setDt: function(dt) {
		this.dt = dt;
	},
	draw: function() {
		switch (this.state) {
			case "start":
				this.context.save();
				this.context.fillStyle = "lightgray";
				this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
				this.context.fillStyle = "black";
				this.context.textAlign = "center";
				this.context.textBaseline = "alphabetic";
				this.context.font = "bold 32px Courier New";
				this.context.fillText("Welcome to FlappyDuck!",256,512/3);
				this.context.font = "18px Courier New";
				this.context.fillText("Press <space> to start",256,2*512/3);
				this.context.fillText("Press <m> to toggle sound effects",256,2*512/3+18);
				this.context.drawImage(this.player.image,(512 - 128)/2,(512 - 64)/2)
				this.context.restore();
				break;
			case "playing":
				this.context.save();
				// Set Screen to blue
				this.context.fillStyle = "#ccebff";
				this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
				// Draw clouds
				this.clouds.draw(this.context);
				// Draw player
				this.player.draw(this.context);
				// Draw pipes
				this.pipes.draw(this.context);
				// Draw Score
				this.context.textAlign = "start";
				this.context.textBaseline = "top";
				this.context.font = "18px Courier New";
				this.context.fillStyle = "#ffff00";
				this.context.shadowColor = "#ff9900";
				this.context.shadowOffsetX = this.context.shadowOffsetY = 1;
				this.context.fillText("Score: " + this.score,0,0);
				this.context.restore();
				break;
			case "end":
				this.context.save();
				this.context.fillStyle = "lightgray";
				this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
				this.context.fillStyle = "black";
				this.context.textAlign = "center";
				this.context.textBaseline = "alphabetic";
				this.context.font = "bold 32px Courier New";
				this.context.fillText("Game Over",256,512/3);
				this.context.font = "18px Courier New";
				this.context.fillText("Your score was: " + this.score,256,256);
				this.context.fillText("Press <r> to restart",256,2*512/3);
				// Display attribution info for sound effects
				this.context.font = "14px Courier New";
				this.context.fillText("All sound effects found on freesound.com",256,2*512/3 + 14)
				this.context.fillText("Duck quack on restart created by crazyduckman",256,2*512/3 + 2*14); // quack.wav
				this.context.fillText("Ambient duck sounds created by jaredi",256,2*512/3 + 3*14); // ducks.wav
				this.context.fillText("Wing flap sound created by ani_music",256,2*512/3 + 4*14); // wing_flap.wav
				this.context.fillText("Coin sound created by ProjectsU012",256,2*512/3 + 5*14); // coin.wav
				this.context.fillText("Crash sound created by ProjectsU012",256,2*512/3 + 6*14); // crash.wav
				this.context.restore();
				break;
			default:
				break;
		}
		
	},
	// Step the game forward in time
	step: function() {
		switch (this.state) {
			case "start":
				break;
			case "playing":
				this.player.accelerate(0*this.dt,this.gravity*this.dt);
				this.player.step(this.dt);
				this.pipes.step(this.dt,this);
				this.clouds.step(this.dt);
				// Add one cloud per second on average at a random y value.
				if (Math.random() < (this.dt/30)/2) {
					newCloud = new Decoration(this.cloudImage);
					newCloud.x = 512 + 64;
					newCloud.y = Math.random()*512;
					newCloud.vy = 0;
					newCloud.vx = -1.5;
					this.clouds.push(newCloud);
				}
				// Remove clouds
				if ((this.clouds.fifo.length > 0) && (this.clouds.first().x < -64)) {
					this.clouds.pop();
				}
				break;
			case "end":
				break;
			default:
				break;
		}
	},
	// Check lose condition
	checkLoss: function() {
		if (this.pipes.getLength() > 0) {
			if (this.player.collider.collidesWith(this.pipes.first().colliderTop) ||
				this.player.collider.collidesWith(this.pipes.first().colliderBottom)) {
				if (this.state != "end") {
					this.state = "end";
					this.crashSound.play();
				}
			}
		}
	},
	// Play a frame of the game
	play: function() {
		this.step();
		this.checkLoss();
		this.draw();
	},
	reset: function() {
		this.player.y = 256;
		this.player.vy = 0;
		this.pipes.clear();
		this.clouds.clear();
		this.score = 0;
		this.quackSound.play();
		this.quackSound.play();
	},
}

function setupGame(game,fps) {
	// Define the keypress handler function
	function keyDownHandler(e) {
		switch (e.keyCode) {
			case 32:
				if (game.state === "start") {
					game.state = "playing";
				}
				else if (game.state === "playing") {
					game.player.flapDown();
				}
				break;
			case 77:
				game.flapSound.muted = !game.flapSound.muted;
				game.coinSound.muted = !game.coinSound.muted;
				game.ducksSound.muted = !game.ducksSound.muted;
				game.crashSound.muted = !game.crashSound.muted;
				game.quackSound.muted = !game.quackSound.muted;
				break;
			case 82:
				if (game.state === "end") {
					game.reset();
					game.state = "start";
				}
				break;
		}
	}
	// Define the key release handler function
	function keyUpHandler(e) {
		switch (e.keyCode) {
			case 32:
				game.player.flapUp();
				break;
		}
	}
    game.setDt(30/fps);
    var msec = 1000/fps;
    setInterval(function(){game.play();},msec);
	// Add an event listener to catch spacebar presses
	game.canvas.addEventListener("keydown",keyDownHandler,true);
	// Add an event listener to catch spacebar releases
	game.canvas.addEventListener("keyup",keyUpHandler,true);
	game.quackSound.play();
	game.quackSound.play();
}