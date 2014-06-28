// Code from http://www.playfuljs.com/a-first-person-engine-in-265-lines/
// With modification by Jeremy Johnston
//another good resource http://www.arguingwithmyself.com/demos/raycaster/raycaster5.html

var CIRCLE = Math.PI * 2;
var MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

// Weapon textures
var ripper = new Bitmap('../Assets/ripper.png', 320, 242);
var heart = new Bitmap('../Assets/heart2.png', 229, 220);
var laser = new Bitmap('../Assets/explosion.png', 256, 256);
var laser2 = new Bitmap('../Assets/explosion2.png', 256, 256);

var reticle = new Bitmap('../Assets/reticle.png', 32, 32);

// Wall textures
var confused = new Bitmap('../Assets/expendablesConfused.jpg', 600, 397);

// Sky textures
var cagebox = new Bitmap('../Assets/cagebox.jpg', 1920, 1080);
var clouds = new Bitmap('../Assets/seamlessClouds.jpg', 800, 553);

// Ground textures
var bw = new Bitmap('../Assets/bw.jpg', 250, 202);
var bwSeamless = new Bitmap('../Assets/seamlessBW_big.jpg', 2048, 1655);
var sand = new Bitmap('../Assets/seamlessSand.jpg', 900, 900);

// Game Texture settings
var skyBM = bwSeamless;
var wallBM = bw;
var groundBM = sand;
var weaponBM = ripper;
var missileBM = heart;
var reticleBM = reticle;


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
	if (t.pageY < window.innerHeight * 0.4) this.onKey(true, { keyCode: 38 }); //forward
	else if (t.pageX < window.innerWidth * 0.4) this.onKey(true, { keyCode: 37 }); //left
	else if (t.pageX > window.innerWidth * 0.6) this.onKey(true, { keyCode: 39 }); //right
	else if (t.pageY > window.innerHeight * 0.6) this.onKey(true, { keyCode: 40}); //backward
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
	this.framesSinceFire = 1000;//remove after new missile code works
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
	this.weapon.missile.reset();
	this.weapon.missile.fire(player.x, player.y, player.direction, 600);
};

Player.prototype.update = function(controls, map, seconds) {

  //Update player state based on controls
	if (controls.left) this.rotate(-Math.PI * seconds);
	if (controls.right) this.rotate(Math.PI * seconds);
	if (controls.forward) this.walk(3 * seconds, map);
	if (controls.backward) this.walk(-3 * seconds, map);
	if (controls.fire) this.fire(seconds, map);
	
	//TODO: If {weapon switch} then change weapons
	
	//Update player's active missiles
	if(player.weapon.missile.alive){
		player.weapon.missile.update(map, seconds);
	  player.framesSinceFire++;
	}
	
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
function Missile(x, y, direction, velocity, missileBM){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.velocity = velocity;
	this.missileBM = missileBM;
	this.distance = 0;
	
	this.alive = false;
	this.lifetime = 0;
	
}

Missile.prototype.fire = function(x, y, direction, lifetime){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.alive = true;
	this.lifetime = lifetime; //max time to render (until missile hits a wall)
};

Missile.prototype.update = function(map, seconds){
  //Move missile in direction at a rate some fraction quicker than the player
	if(this.alive){
		this.travel(seconds * this.velocity, map);
	}
};

Missile.prototype.travel = function(distance, map){
  var cos = Math.cos(this.direction);
	var sin = Math.sin(this.direction);
	var dx = cos * distance;
	var dy = sin * distance;
	
	//If no wall in path, travel forward. This can be modified to have bouncing projectiles!
	if( this.alive && map.get(this.x + dx, this.y) <= 0 && map.get(this.x, this.y + dy) <= 0){
		this.x += dx;
		this.y += dy;
		this.lifetime -= 1;
		this.distance = map.distance(player, missile); //update distance from player
	}
	else if(this.lifetime > 30){//we hit a wall!
		this.lifetime = 30; //Lifetime reduced to standard explosion time
		
		this.distance = map.distance(player, missile); //update distance from player

		//Fake spawn explosion by swapping texture for last second of lifetime
		missileBM = laser;
	}
	else{
		//Tick explosion lifetime
		this.lifetime -= 1;
		
		//'animate' explosion
		if(this.lifetime % 2 === 0)
			missileBM = laser;
		else
		  missileBM = laser2;
			
		this.distance = map.distance(player, missile); //update distance from player

	}
	
	if(this.lifetime < 0){
	  this.reset();
	}
	
};

Missile.prototype.reset = function(){
  this.distance = 0;
	this.alive = false;
	this.lifetime = 0;
	missileBM = heart;
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

// True if (x,y) and (s,t) reside in same grid
Map.prototype.check = function(x, y, s, t){
  x = Math.floor(x);
	y = Math.floor(y);
	s = Math.floor(s);
	t = Math.floor(t);
	
	if(x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1 || s < 0 || s > this.size - 1 || t < 0 || t > this.size - 1 )
	  return false;
		
	if(x === s && y === t)
		return true;
		
	return false;
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

Map.prototype.distance = function(a, b){
	var dx = (a.x - b.x);
	var dy = (a.y - b.y);
	var d2 = dx * dx + dy * dy;
	var d =  Math.sqrt(d2);
	
	return d;
};

Map.prototype.update = function(seconds) {
  //Do lightning effect randomly about every 10s
	if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
	else if (Math.random() * 5 < seconds) this.light = 2;
	
	//TODO: Update enemy positions when enemies are done
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
	this.drawTerrain(player.direction, groundBM, map.light);
	this.drawColumns(player, map);
	this.drawMissile(player, map);
	this.drawWeapon(player.weapon, player.paces);
	this.drawReticle(reticleBM);
	
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
	  this.drawColumn(column, ray, angle, map, player);
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
 Deprecated
 Draws terrain as one big image. Does not give a sense of movement.
 Just use draw column now, which will draw floor tiles.
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

/**
Draw any projectiles the player has fired. Currently only 1 missile is alive at a time.

TODO: Fix how left and top are selected. Want render to make a more linear projectile; currently seems to arc.

TODO: Draw using film strip. Film strip animates and
can have images for different angles.

TODO: Draws whole picture now, but need to move this to drawColumn(). Draw column should ask if a grid contains a missile, and if so, find which quadrant in that grid the missile is.
**/
Camera.prototype.drawMissile = function(player, map){

 
	var ctx = this.ctx;
	var missile = player.weapon.missile;
	
	//If missile direction and player direction differ too much, don't draw
	var angle = player.direction - missile.direction;
	if( !missile.alive || Math.abs(angle) > (this.fov / 2) )
		return;
	
	var ray = map.cast(player, angle, missile.distance);
	var hit = -1;
	while (++hit < ray.length && ray[hit].height <= 0);
	
	//If missile behind wall, don't draw
	if(hit < ray.length)
		return;
	
	console.log("drawing missile");
	
	var step = ray[ ray.length - 1 ];
		
	var missileP = this.project(1, angle, missile.distance);
	var missileX = Math.floor(missileBM.width * step.offset);
	var width = Math.floor(missileBM.width / (1 + 2 * missile.distance));
	var height = Math.floor(missileBM.height / (1 + 2 * missile.distance));
	
	var column = this.resolution * (angle / this.fov + 0.5);
	var left = this.width - Math.floor(column * this.spacing) - missileBM.width / (4 + missile.distance);
	var top = Math.floor(this.height * 0.6) - missileBM.height / (2 + missile.distance);//center on gun muzzle
	
	//debugger;
	ctx.drawImage(missileBM.image, left, top, width, height);
};

Camera.prototype.drawReticle = function(texture){
  var x = this.width/2 - texture.width/2;
	var y = this.height/2 - texture.height/2;
	this.ctx.drawImage(texture.image, x, y, texture.width, texture.height);
};


/** 
	Draws a single column of render. Right now only calculates for walls and rain.
	
	TODO: If I find FPS solution, re-add floor tiles.
	TODO: Render weapons, enemies as column strips too.
**/
Camera.prototype.drawColumn = function(column, ray, angle, map, player) {
	var ctx = this.ctx;
	var texture = map.wallTexture;
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var hit = -1;
	
	// Increment hit till first ray element that is a wall
	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
	  var step = ray[s];
	  var rainDrops = Math.pow(Math.random(), 3) * s;
	  var rain = (rainDrops > 0) && this.project(0.1, angle, step.distance);

	  var textureX = Math.floor(texture.width * step.offset);
		var wall = this.project(step.height, angle, step.distance);
		
		// Draw wall if ray hit a wall in this increment. All increments before are spaces
	  if (s === hit) {
		
      ctx.globalAlpha = 1;
      
      //Draw wall
      ctx.drawImage(texture.image, textureX, 0, 1, texture.height, left, wall.top, width, wall.height);
      
			//Apply alpha distance effect to walls
			// ctx.save();
      // ctx.fillStyle = '#000000';
      // ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
      // ctx.fillRect(left, wall.top, width, wall.height);
			// ctx.restore();
	  }
		
		// Draw ground tiles in spaces between walls
		var ground = wall;
		var groundX = textureX;
		if(s > 1){//do not draw around player's head, blocks view
			ground = this.project(1, angle, ray[s-1].distance);
			groundX = Math.floor(groundBM.width * ray[s-1].offset);
			
			//Draw ceiling
			//ctx.drawImage(groundBM.image, groundX, 0, 1, groundBM.height, left, ground.top-ground.height, width, ground.height);
			
			//Draws ground
			//ctx.drawImage(groundBM.image, groundX, 0, 1, groundBM.height, left, ground.top+ground.height, width, ground.height);
			
			//Apply alpha distance effect to ground. 
			// BUG: Ground & ceiling alpha shading causes fps drop.
			// TODO: Find work around fps drop or remove/reduce effect. Might clear up when ground is made up of horizontal tiles rather than vertical for 1/4 of the current draw calls.
			// ctx.save();
      // ctx.fillStyle = '#000000';
      // ctx.globalAlpha = Math.max((ray[s-1].distance + ray[s-1].shading) / this.lightRange - map.light, 0);
      // ctx.fillRect(left, ground.top+ground.height, width, ground.height);//ground alpha
			// ctx.fillRect(left, ground.top-ground.height, width, ground.height);//ceiling alpha
			// ctx.restore();
			
		}
		
		// //Draw missile
		// var missile = player.weapon.missile;
		// var missileBM = missile.missileBM;
		// var missileP = this.project2(1, 1, angle, missile.distance);
		// var missileX = Math.floor(missileBM.width * step.offset);
		
		// if ( s > 1 && s != hit && player.weapon.missile.alive && map.check(missile.x, missile.y, step.x, step.y)  ){
			
			// ctx.drawImage(missileBM.image, missileX, 0, 1, missileBM.height, left, missileP.top, missileP.width, missileP.height);
		// }
		
		// // Draw some rain
	  // ctx.fillStyle = '#ffffff';
	  // ctx.globalAlpha = 0.15;
	  // while (--rainDrops > 0) ctx.fillRect(left, Math.random() * rain.top, 1, rain.height);
	}
};

/** For projecting wall texture to find varying draw height for distance from player **/
Camera.prototype.project = function(height, angle, distance) {
	var z = distance * Math.cos(angle);
	var wallHeight = this.height * height / z;
	var bottom = this.height / 2 * (1 + 1 / z);
	return {
	  top: bottom - wallHeight,
	  height: wallHeight
	}; 
};

/** For projecting any texture to find varying height and width (in fractions of wall spacing) for distance from player, e.g., missiles fired **/
Camera.prototype.project2 = function(height, width, angle, distance){
  var z = distance * Math.cos(angle); // distance adjusted to look correct
	var h = this.height * height / z;
	var w = this.width * width / z;
	
	var bottom = this.height / 2 * (1 + 1 / z);
	return{
	  top: bottom - h,
		width: w,
		height: h
	};
};

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
var missile = new Missile(0, 0, Math.PI * 0.3, 6, missileBM);
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