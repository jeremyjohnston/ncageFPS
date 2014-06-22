// Code from http://www.playfuljs.com/a-first-person-engine-in-265-lines/
// With modification by Jeremy Johnston
//another good resource http://www.arguingwithmyself.com/demos/raycaster/raycaster5.html

var CIRCLE = Math.PI * 2;
var MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

// Weapon textures
var ripper = new Bitmap('../Assets/ripper.png', 320, 242);
var heart = new Bitmap('../Assets/heart.jpg', 229, 220);
var laser = new Bitmap('../Assets/explosion.png', 256, 256);

// Wall textures
var confused = new Bitmap('../Assets/expendablesConfused.jpg', 600, 397);

// Sky textures
var cagebox = new Bitmap('../Assets/cagebox.jpg', 1920, 1080);
var clouds = new Bitmap('../Assets/seamlessClouds.jpg', 800, 553);

// Ground textures
var bw = new Bitmap('../Assets/bw.jpg', 250, 202);
var sand = new Bitmap('../Assets/seamlessSand.jpg', 900, 900);

// Game Texture settings
var skyBM = cagebox;
var wallBM = bw;
var groundBM = sand;
var weaponBM = ripper;
var missileBM = laser;


/** Control Object **/
function Controls() {
	this.codes  = { 37: 'left', 39: 'right', 38: 'forward', 40: 'backward', 96: 'fire' };//arrow keys to move, numpad 0 to fire
	this.states = { 'left': false, 'right': false, 'forward': false, 'backward': false, 'fire': false };
	document.addEventListener('keydown', this.onKey.bind(this, true), false);
	document.addEventListener('keyup', this.onKey.bind(this, false), false);
	document.addEventListener('touchstart', this.onTouch.bind(this), false);
	document.addEventListener('touchmove', this.onTouch.bind(this), false);
	document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
}

Controls.prototype.onTouch = function(e) {
	var t = e.touches[0];
	this.onTouchEnd(e);
	if (t.pageY < window.innerHeight * 0.5) this.onKey(true, { keyCode: 38 }); //forward
	else if (t.pageX < window.innerWidth * 0.5) this.onKey(true, { keyCode: 37 }); //left
	else if (t.pageY > window.innerWidth * 0.5) this.onKey(true, { keyCode: 39 }); //right
	else if (t.pageY > window.innerHeight * 0.5) this.onKey(true, { keyCode: 96}); //touch bottom half of screen, fire
};

Controls.prototype.onTouchEnd = function(e) {
	this.states = { 'left': false, 'right': false, 'forward': false, 'backward': false, 'fire': false };
	e.preventDefault();
	e.stopPropagation();
};

Controls.prototype.onKey = function(val, e) {
	var state = this.codes[e.keyCode];
	if (typeof state === 'undefined') return;
	this.states[state] = val;
	e.preventDefault && e.preventDefault();
	e.stopPropagation && e.stopPropagation();
};

/** Bitmap **/
function Bitmap(src, width, height) {
	this.image = new Image();
	this.image.src = src;
	this.width = width;
	this.height = height;
}

//TODO: Weapon and Projectile classes once projectile test works
//Prototype should be an image fired from the position and a direction of the player, scaling down over time and distance
//2nd ver should remember position it was originally fired in, and hide from player when player turns away from it
//3rd ver should raytrace between player and itself, and disappear if hidden by geometry

/** Player **/
function Player(x, y, direction, weapon){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.weapon = weapon;
	this.paces = 0;
	this.framesSinceFire = 1000;
}

Player.prototype.rotate = function(angle){
	this.direction = (this.direction + angle + CIRCLE)%(CIRCLE);
};

Player.prototype.walk = function(distance, map){
	var dx = Math.cos(this.direction) * distance;
	var dy = Math.sin(this.direction) * distance;
	
	if (map.get(this.x + dx, this.y) <=0) 
		this.x += dx;
	if (map.get(this.x, this.y + dy) <=0)
		this.y += dy;
		
	this.paces += distance;
};

Player.prototype.fire = function(seconds, map){
	this.framesSinceFire = 1;
	this.weapon.missile.fire(player.x, player.y, player.direction, 120);
};

Player.prototype.update = function(controls, map, seconds) {
	if (controls.left) this.rotate(-Math.PI * seconds);
	if (controls.right) this.rotate(Math.PI * seconds);
	if (controls.forward) this.walk(3 * seconds, map);
	if (controls.backward) this.walk(-3 * seconds, map);
	if (controls.fire) this.fire(seconds, map);
};

/** Weapon **/
function Weapon(weaponBM, missile){
	//weapon bitmap
	this.weaponBM = weaponBM;
	
	//type of missile that the weapon fires
	this.missile = missile;
	
	//TODO: add damage values, velocity
}

Weapon.prototype.switchMissile = function(missile){
	this.missile = missile;
};

/** Missile **/
function Missile(x, y, direction, missileBM){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.missileBM = missileBM;
}

Missile.prototype.fire = function(x, y, direction, lifetime){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.lifetime = lifetime; //max time to render (until missile hits a wall)
};

/** Map **/
function Map(size, wallBM, skyBM, groundBM){
	this.size = size;
	this.wallGrid = new Uint8Array(size*size);
	this.skybox = skyBM; //new Bitmap('cagebox.jpg', 1920, 1080);
	this.wallTexture = wallBM; //new Bitmap('nicolas-cage-expendables-3.jpg', 600, 397);
	this.groundTexture = groundBM; // new Bitmap('nicolas-cage-expendables-3.jpg', 600, 397);
	this.light = 0;
}

Map.prototype.get = function(x, y){
	x = Math.floor(x);
	y = Math.floor(y);
	if ( x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1 ) 
		return -1;
		
	return this.wallGrid[ y * this.size + x ];
};
Map.prototype.randomize = function() {
	for (var i = 0; i < this.size * this.size; i++) {
	  this.wallGrid[i] = Math.random() < 0.3 ? 1 : 0;
	}
};

Map.prototype.cast = function(point, angle, range) {
	var self = this;
	var sin = Math.sin(angle);
	var cos = Math.cos(angle);
	var noWall = { length2: Infinity };

	return ray({ x: point.x, y: point.y, height: 0, distance: 0 });

	function ray(origin) {
	  var stepX = step(sin, cos, origin.x, origin.y);
	  var stepY = step(cos, sin, origin.y, origin.x, true);
	  var nextStep = stepX.length2 < stepY.length2
		? inspect(stepX, 1, 0, origin.distance, stepX.y)
		: inspect(stepY, 0, 1, origin.distance, stepY.x);

	  if (nextStep.distance > range) return [origin];
	  return [origin].concat(ray(nextStep));
	}

	function step(rise, run, x, y, inverted) {
	  if (run === 0) return noWall;
	  var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
	  var dy = dx * (rise / run);
	  return {
		x: inverted ? y + dy : x + dx,
		y: inverted ? x + dx : y + dy,
		length2: dx * dx + dy * dy
	  };
	}

	function inspect(step, shiftX, shiftY, distance, offset) {
	  var dx = cos < 0 ? shiftX : 0;
	  var dy = sin < 0 ? shiftY : 0;
	  step.height = self.get(step.x - dx, step.y - dy);
	  step.distance = distance + Math.sqrt(step.length2);
	  if (shiftX) step.shading = cos < 0 ? 2 : 0;
	  else step.shading = sin < 0 ? 2 : 1;
	  step.offset = offset - Math.floor(offset);
	  return step;
	}
};

//'false' cast to get walls where there are none, to render spaces between walls in a lazy inefficient manner
Map.prototype.cast2 = function(point, angle, range) {
	var self = this;
	var sin = Math.sin(angle);
	var cos = Math.cos(angle);
	var noWall = { length2: Infinity };

	return ray({ x: point.x, y: point.y, height: 0, distance: 0 });

	function ray(origin) {
	  var stepX = step(sin, cos, origin.x, origin.y);
	  var stepY = step(cos, sin, origin.y, origin.x, true);
	  var nextStep = stepX.length2 < stepY.length2
		? inspect(stepX, 1, 0, origin.distance, stepX.y)
		: inspect(stepY, 0, 1, origin.distance, stepY.x);

	  if (nextStep.distance > range) return [origin];
	  return [origin].concat(ray(nextStep));
	}

	function step(rise, run, x, y, inverted) {
	  if (run === 0) return noWall;
	  var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
	  var dy = dx * (rise / run);
	  return {
		x: inverted ? y + dy : x + dx,
		y: inverted ? x + dx : y + dy,
		length2: dx * dx + dy * dy
	  };
	}

	function inspect(step, shiftX, shiftY, distance, offset) {
	  var dx = cos < 0 ? shiftX : 0;
	  var dy = sin < 0 ? shiftY : 0;
		
		// (0 + 1) mod 2 = 1, (1+1) mod 2 = 0, inverting map.get() results
	  step.height = (self.get(step.x - dx, step.y - dy) + 1) % 2; 
		
	  step.distance = distance + Math.sqrt(step.length2);
	  if (shiftX) step.shading = cos < 0 ? 2 : 0;
	  else step.shading = sin < 0 ? 2 : 1;
	  step.offset = offset - Math.floor(offset);
	  return step;
	}
};

Map.prototype.update = function(seconds) {
	if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
	else if (Math.random() * 5 < seconds) this.light = 2;
	
	//TODO: Update projectile position
};

/** Camera **/
function Camera(canvas, resolution, fov) {
	this.ctx = canvas.getContext('2d');
	this.width = canvas.width = window.innerWidth * 0.5;
	this.height = canvas.height = window.innerHeight * 0.5;
	this.resolution = resolution;
	this.spacing = this.width / resolution;
	this.fov = fov;
	this.range = MOBILE ? 8 : 14;
	this.lightRange = 5;
	this.scale = (this.width + this.height) / 1200;
}

Camera.prototype.render = function(player, map, seconds) {
	this.drawSky(player.direction, map.skybox, map.light);
	//this.drawTerrain(player.direction, map.groundTexture, map.light);
	this.drawColumns(player, map);
	this.drawMissile(player);
	this.drawWeapon(player.weapon, player.paces);
	
};

Camera.prototype.drawSky = function(direction, sky, ambient) {
	var width = this.width * (CIRCLE / this.fov);
	var left = -width * direction / CIRCLE;

	this.ctx.save();
	this.ctx.drawImage(sky.image, left, 0, width, this.height);
	if (left < width - this.width) {
	  this.ctx.drawImage(sky.image, left + width, 0, width, this.height);
	}
	if (ambient > 0) {
	  this.ctx.fillStyle = '#ffffff';
	  this.ctx.globalAlpha = ambient * 0.1;
	  this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
	}
	this.ctx.restore();
};

Camera.prototype.drawColumns = function(player, map) {
	this.ctx.save();
	
	for (var column = 0; column < this.resolution; column++) {
	  var angle = this.fov * (column / this.resolution - 0.5);
	  var ray = map.cast(player, player.direction + angle, this.range);
	  this.drawColumn(column, ray, angle, map);
		
		// var ray = map.cast2(player, player.direction + angle, this.range);
	  // this.drawColumn2(column, ray, angle, map);
		
	}
	
	this.ctx.restore();
};

Camera.prototype.drawWeapon = function(weapon, paces) {
	var weapon = weapon.weaponBM;
	var bobX = Math.cos(paces * 2) * this.scale * 6;
	var bobY = Math.sin(paces * 4) * this.scale * 6;
	var left = this.width * 0.40 + bobX;
	var top = this.height * 0.6 + bobY;
	this.ctx.drawImage(weapon.image, left, top, weapon.width * this.scale, weapon.height * this.scale);
};

/** 
 Let's add a draw terrain function
 This ver does one big image, reusing the skybox code.
 TODO: try drawing tiles like the walls but for the floor. 
 This would give it a sense of scale and movement that the current ver does not have. 
**/
Camera.prototype.drawTerrain = function(direction, texture, ambient) {
	var width = this.width * (CIRCLE / this.fov);
	var left = -width * direction / CIRCLE;
	var top = this.height / 2; //draw our ground halfway abouts down the screen

	this.ctx.save();
	this.ctx.drawImage(texture.image, left, top, width, this.height);
	if (left < width - this.width) {
	  this.ctx.drawImage(texture.image, left + width, top, width, this.height);
	}
	if (ambient > 0) {
	  this.ctx.fillStyle = '#ffffff';
	  this.ctx.globalAlpha = ambient * 0.1;
	  this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
	}
	this.ctx.restore();
};

Camera.prototype.drawMissile = function(player){
	var ctx = this.ctx;
	var missile = player.weapon.missile.missileBM;
	
	var rate = 0.75;
	var width = missile.width / (player.framesSinceFire * rate);
	var height = missile.height / (player.framesSinceFire * rate);
	var left = this.width * 0.5;
	var top = this.height * 0.5;
	
	if (player.framesSinceFire < 120){ //draw missile for 2 or so seconds, modified by frame rate and rate var above
		// ctx.fillStyle = '#bbbbbb';
		// ctx.globalAlpha = 1;
		// ctx.fillRect(left, top, width, height);
		ctx.drawImage(missile.image, left, top, width, height);
		player.framesSinceFire++;
	}
	else
	{
		player.framesSinceFire = 1000;
	}
};

//TODO: reuse ray cast code to cast a ray at time of weapon fire
/* Cast a ray that returns distance to wall
   Missile time to impact wall is a function of frame count and distance to wall at time of fire
   On collision, swap texture for remaining missile lifetime
   
   To render better:
   Reuse or modify draw column here.
   When a missile is fired, save map grid location
   As when a player is facing a wall, the columns of the wall is drawn, with the height of wall clipped to match distance.
   Each frame update, change missile location, and draw missile as columns as well over walls behind it
   Missiles will cease upon collision with a wall, upon which an explosion will occur.
*/

Camera.prototype.drawColumn = function(column, ray, angle, map) {
	var ctx = this.ctx;
	var texture = map.wallTexture;
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var hit = -1;
	
	//Increment hit till first ray element that is a wall
	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
	  var step = ray[s];
	  var rainDrops = Math.pow(Math.random(), 3) * s;
	  var rain = (rainDrops > 0) && this.project(0.1, angle, step.distance);

	  var textureX = Math.floor(texture.width * step.offset);
		var wall = this.project(step.height, angle, step.distance);
		
		var ground = wall;
		var groundX = textureX;
		if(s > 1){
			ground = this.project(1, angle, ray[s-1].distance);
			groundX = Math.floor(groundBM.width * ray[s-1].offset);
		}
		
		
		// Draw wall if ray hit a wall in this increment. All increments before are spaces
	  if (s === hit) {
		
      ctx.globalAlpha = 1;
      
      //Draw wall
			
      ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left, wall.top, width, wall.height);
      
			// //Draw ground under wall
			// ctx.drawImage(groundBM.image, textureX, 0, 1, groundBM.height, left, wall.top+wall.height, width, wall.height);
			ctx.save();
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
      ctx.fillRect(left, wall.top, width, wall.height);
			ctx.restore();//so when we draw ground below it doesn't have a weird artifact generation
	  }
		
		if(s > 1){//do not draw around player's head
		
		
				
			//Draw ground (EDIT: successfully renders ceiling...LOL)
			ctx.drawImage(groundBM.image, groundX, 0, 1, groundBM.height, left, ground.top-ground.height, width, ground.height);
			
			ctx.drawImage(groundBM.image, groundX, 0, 1, groundBM.height, left, ground.top+(ground.height * 1), width, ground.height);
			
			// if(s > 1){
				// ctx.fillStyle = '#000000';
				// ctx.globalAlpha = Math.max((ray[s-1].distance + ray[s-1].shading) / this.lightRange - map.light, 0);
				// ctx.fillRect(left, ground.top+(ground.height*1.7), width, ground.height);
			// }
		}
		// else{
			// //Draw ground (EDIT: successfully renders ceiling...LOL)
			// ctx.drawImage(groundBM.image, groundX, 0, 1, groundBM.height, left, ground.top-ground.height, width, ground.height);
		// }
	  
		//image, sx, sy, swidth, sheight, x, y, widthClip, heightClip
		
		//Try drawing "ground" test
		//ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left+width, wall.top+wall.height, width, wall.height);

	  // ctx.fillStyle = '#ffffff';
	  // ctx.globalAlpha = 0.15;
	  // while (--rainDrops > 0) ctx.fillRect(left, Math.random() * rain.top, 1, rain.height);
	}
};


Camera.prototype.drawColumn2 = function(column, ray, angle, map) {
	var ctx = this.ctx;
	var texture = groundBM;
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var hit = -1;
	
	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
	  var step = ray[s];
	  

	  var textureX = Math.floor(texture.width * step.offset);
		var wall = this.project(step.height, angle, step.distance);
	  
	  if (s === hit) {
		
      ctx.globalAlpha = 1;
      
      //Draw wall
			
      ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left, wall.top+wall.height, width, wall.height);
      
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
      ctx.fillRect(left, wall.top, width, wall.height);
	  }
	  

	 
	}
};

//try 2 types of walls, 1 just rendered shorter and everywhere
//requires 'false' raycasting to collide with wall at every grid point
Camera.prototype.drawRow = function(column, ray, angle, map) {
	var ctx = this.ctx;
	var texture = map.wallTexture;
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var hit = -1;
	
	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
	  var step = ray[s];

	  var textureY = Math.floor(texture.height * step.offset);
		var wall = this.project(step.height, angle, step.distance);
	  
	  if (s === hit) {
		
      ctx.globalAlpha = 1;
      //Draw wall
      ctx.drawImage(texture.image, 0, textureY, texture.height, 1, left, wall.top, width, wall.height);
      
     
	  }
	  

	  
	}
};

Camera.prototype.project = function(height, angle, distance) {
	var z = distance * Math.cos(angle);
	var wallHeight = this.height * height / z;
	var bottom = this.height / 2 * (1 + 1 / z);
	return {
	  top: bottom - wallHeight,
	  height: wallHeight
	}; 
};

//TODO: I need a diff project function to calc a floor tile sizing


/** GameLoop **/
function GameLoop() {
	this.frame = this.frame.bind(this);
	this.lastTime = 0;
	this.callback = function() {};
}

GameLoop.prototype.start = function(callback) {
	this.callback = callback;
	requestAnimationFrame(this.frame);
};

GameLoop.prototype.frame = function(time) {
	var seconds = (time - this.lastTime) / 1000;
	this.lastTime = time;
	if (seconds < 0.2) this.callback(seconds);
	requestAnimationFrame(this.frame);
};

// Create each object
var display = document.getElementById('display');
var missile = new Missile(0, 0, Math.PI * 0.3, missileBM);
var weapon = new Weapon(weaponBM, missile);
var player = new Player(15.3, -1.2, Math.PI * 0.3, weapon);
var map = new Map(16, wallBM, skyBM, groundBM);
var controls = new Controls();
var camera = new Camera(display, MOBILE ? 160 : 320, Math.PI * 0.4);
var loop = new GameLoop();

map.randomize();

// Start Game
loop.start(function frame(seconds) {
	map.update(seconds);
	player.update(controls.states, map, seconds);
	camera.render(player, map, seconds);
});