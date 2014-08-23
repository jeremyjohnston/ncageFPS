// Code from http://www.playfuljs.com/a-first-person-engine-in-265-lines/
// With modification by Jeremy Johnston
//another good resource http://www.arguingwithmyself.com/demos/raycaster/raycaster5.html
/*
http://www.soundboard.com/sb/Nicolas_Cage_audio
http://www.soundboard.com/sb/AdamWest65
 *note: can't figure how to dl from soundboard.com
http://www.moviesoundclips.net/people-details.php?id=22
http://www.wavlist.com/movies/054/index.html
Make ak pickup that uses ak47 lord of war clip on pickup :DDDDDD
downside: this kills the bunnies :(

OMG there is a conair bunny line. Maybe make the game goal to chase the
bunnies "back in the box"?!
Could be as simple as "kill" or "hit with bait" to teleport bunnies back into their "CAGE"!

Boss spawn could use badman line from gone in 60 sec

another good res http://www.spriters-resource.com
http://www.8bitpeoples.com/discography/by/bit_shifter <-- activation.mp3
http://chipmusic.org/

http://freepd.com/70s%20Sci%20Fi/Hidden%20Danger%20B
http://freepd.com/70s%20Sci%20Fi/Overt%20Danger%20A and other Kevin Macleod creations

some ideas
-first lvl find ak
-next capture/kill all bunnies in box
-find bee cannon for boss, or fight bees?
kill boss cage and win!

TODO: Consider a single image/spritesheet for game, and have
all entities define an x, y, w, h, and dx to draw from the sheet.

TODO: maybe make the game about chasing bunnies that get faster as you damage them,
while avoiding bees.

tinyurl: http://tinyurl.com/nbtwkcb
*/

var CIRCLE = Math.PI * 2;
var MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

// Weapon textures
var ripper = new Bitmap('../Assets/ripper.png', 320, 242);
//var heart = new Bitmap('../Assets/heart2.png', 229, 220);
var box = new Bitmap('../Assets/box2.png', 347, 346);
//var laser = new Bitmap('../Assets/explosion.png', 256, 256);
//var laser2 = new Bitmap('../Assets/explosion2.png', 256, 256);

var explosions = new Bitmap('../Assets/explosions.png', 532, 272);

var reticle = new Bitmap('../Assets/reticle.png', 32, 32);

// Wall textures
//var confused = new Bitmap('../Assets/expendablesConfused.jpg', 600, 397);

// Sky textures
var cagebox = new Bitmap('../Assets/cagebox.jpg', 1920, 1080);
//var clouds = new Bitmap('../Assets/seamlessClouds.jpg', 800, 553);

// Ground textures
var bw = new Bitmap('../Assets/bw.jpg', 250, 202);
var bwSeamless = new Bitmap('../Assets/seamlessBW_big.jpg', 2048, 1655);
var sand = new Bitmap('../Assets/seamlessSand.jpg', 900, 900);

// Enemy textures
var bunny = new Bitmap('../Assets/bunnyCage.png', 627, 480);


// Game Texture settings
var skyBM = bwSeamless;
var wallBM = bw;
var groundBM = sand;
var weaponBM = ripper;
var missileBM = box;
var reticleBM = reticle;
var enemyBM = bunny;
var boomBM = explosions;

var enemyTextureData = new TextureData(enemyBM, false,0,0,0,0,0,0);
var missileTextureData = new TextureData(missileBM, false,0,0,0,0,0,0);
var boomTextureData = new TextureData(boomBM, true, 0, 105, 56, 56, 58.9, 0);

var audio_theme1 = document.getElementById("HiddenDanger_theme213");	//by Kevin Macleod
//var audio_theme2 = document.getElementById("OvertDanger_theme105");		//by Kevin Macleod
//var audioAK_line = document.getElementById("AK_line");								//by Nicolas Cage
var audioBunny_line = document.getElementById("BunnyInBox_line");			//by Nicolas Cage
var audioShoot_effect = document.getElementById("shoot1_effect"); 		//using bfxr.net
var audioExplode1_effect = document.getElementById("explode1_effect"); 		//using bfxr.net
var audioExplode2_effect = document.getElementById("explode2_effect"); 		//using bfxr.net



/** Control Object **/
function Controls() {
	this.codes  = { 
	37: 'left',  	//arrow keys to move
	39: 'right', 
	38: 'forward', 
	40: 'backward', 
	96: 'fire', 	//numpad 0 to fire
	32: 'fire',		//spacebar to fire
	65: 'left',		//WASD to move
	68: 'right',
	87: 'forward',
	83: 'backward'
	};
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

/** Texture Data 

		Data includes bitmap to use, whether to treat as a sprite sheet, 
		and sprite sheet cell information, such as cell size, and cell offsets.
**/
function TextureData(bitmap, bSpriteSheet, cellX, cellY, cellWidth, cellHeight, cellDX, cellDY){
	this.bitmap = bitmap;
	this.bSpriteSheet = bSpriteSheet;
	this.cellX = cellX;
	this.cellY = cellY;
	this.cellWidth = cellWidth;
	this.cellHeight = cellHeight;
	this.cellDX = cellDX;
	this.cellDY = cellDY;
}

/** Player **/
function Player(x, y, direction, weapon){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.weapon = weapon;
	this.paces = 0; //distance travelled overall
}

Player.prototype.rotate = function(angle){
	this.direction = (this.direction + angle + CIRCLE)%(CIRCLE);
};

Player.prototype.walk = function(distance, map){
	var dx = Math.cos(this.direction) * distance;
	var dy = Math.sin(this.direction) * distance;
	
	if(map.get(this.x + dx, this.y) <=0 && this.x + dx >= 0 - map.offset && this.x + dx <= map.offset) 
		this.x += dx;
	if(map.get(this.x, this.y + dy) <=0 && this.y + dy >= 0 - map.offset && this.y + dy <= map.offset)
		this.y += dy;
		
	this.paces += distance;
};

Player.prototype.fire = function(seconds, map){
	
	//Increment fire index, and if we can fire another missile do so
	this.weapon.missileIndex = (this.weapon.missileIndex + 1) % this.weapon.missileMax;
	
	//If we cannot fire, player must wait till a previous missile expires
	if(!this.weapon.missiles[this.weapon.missileIndex].alive)
		this.weapon.missiles[this.weapon.missileIndex].fire(player.x, player.y, player.direction, 50);
		
	//TODO: Let player know they are firing too fast
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
	for(var i = 0; i < this.weapon.missileMax; i++){
		if(this.weapon.missiles[i].alive){
			this.weapon.missiles[i].update(map, seconds);
		}
	}
	

	
	
};

/** Weapon **/
function Weapon(weaponBM, missile, missileMax){
	//weapon bitmap
	this.weaponBM = weaponBM;
	
	//type of missile that the weapon fires
	this.missile = missile;
	
	//number of allow missiles at a time
	this.missileMax = missileMax;
	
	this.activeMissiles = 0;
	this.missileIndex = 0;
	
	this.missiles = [];
	
	
	for(var i = 0; i < missileMax; i++){
		this.missiles.push( new Missile(missile.x, missile.y, missile.direction, missile.velocity, missile.missileTD, missile.boomTD) );
	}
}

/** Missile **/
function Missile(x, y, direction, velocity, missileTD, boomTD){
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.velocity = velocity;
	
	this.missileTD = missileTD;
	this.boomTD = boomTD;
	this.textureData = missileTD;//active texture
	
	this.distance = 0;
	this.lifetime = 0;
	this.alive = false;
	this.explode = false;
}

Missile.prototype.fire = function(x, y, direction, lifetime){
	console.log("Missile fired: (" + x + ", " + y + "), " + direction + ", " + lifetime);
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.alive = true;
	this.lifetime = lifetime; //max time to render (until missile hits a wall)
	
	audioShoot_effect.play();
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
		if(!this.explode){
			this.x += dx;
			this.y += dy;
		}
		this.lifetime -= 1;
		this.distance = map.distance(player, this); //update distance from player
		if(this.lifetime < 30){
			this.textureData = this.boomTD;
			this.explode = true;
		}
	}
	else if(this.lifetime > 30){//we hit a wall or time expired
		this.lifetime = 30; //Lifetime reduced to standard explosion time
		
		this.distance = map.distance(player, this); //update distance from player

		//Fake spawn explosion by swapping texture for last second of lifetime
		this.textureData = this.boomTD;
		this.explode = true;
		this.boomTD.cellX = (this.boomTD.cellX + this.boomTD.cellDX) % this.boomTD.bitmap.width;
		
		//debugger;
		if(!audioExplode1_effect.ended)
			audioExplode1_effect.currentTime = 0;
		
		audioExplode1_effect.play();
	}
	else{
		//Tick explosion lifetime
		this.lifetime -= 1;
		
		// //'animate' explosion
		// if(this.lifetime % 2 === 0)
			// this.missileBM = laser;
		// else
		  // this.missileBM = laser2;
			
		this.distance = map.distance(player, this); //update distance from player
		this.boomTD.cellX = (this.boomTD.cellX + this.boomTD.cellDX) % this.boomTD.bitmap.width;

	}
	
	if(this.lifetime < 0){
	  this.reset();
	}
		
};

Missile.prototype.collide = function(){
	this.explode = true;
	this.lifetime = 30;
};

Missile.prototype.reset = function(){
  this.distance = 0;
	this.alive = false;
	this.lifetime = 0;
	this.textureData = this.missileTD;
	this.explode = false;
	this.boomTD.cellX = 0;
	this.boomTD.cellY = 105;
};

/** Enemy **/
function Enemy(velocity, health, damage, textureData){
	
	this.velocity = velocity;
	this.health = health;
	this.damage = damage;
	this.textureData = textureData;
	this.alive = false;
	this.paces = 0; //track overall movement to get an idea of time alive
	this.distance = 1000; //from player

}

Enemy.prototype.spawn = function(x, y, direction){
	console.log("Enemy spawned: (" + x + ", " + y + "), " + direction);
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.alive = true;
	
};

//TODO: give some enemies the ability to slowly rotate to face player before moving to avoid suddenly spinning about
Enemy.prototype.rotate = function(angle){
	this.direction = (this.direction + angle + CIRCLE)%(CIRCLE);
};


//TODO: remember previous distance to player, and if no progress is made do random walk. Even better, think of a full A.I. pathing system.
Enemy.prototype.walk = function(player, distance, map){

	//Ask if player is nearby, and if so walk towards player
	if(map.distance(player, this) < 5){
		this.attack(player, distance, map);
	}
	else{	//Else walk in random direction
		var c = Math.floor(Math.random() * 4) / 4;
		this.direction = CIRCLE * c;
		
		
		//this.rotate(Math.PI/32);//debug: test walking in a circle
		
		var dx = Math.cos(this.direction) * distance;
		var dy = Math.sin(this.direction) * distance;
		
		//Skirt walls
		if (map.get(this.x + dx, this.y) <=0) 
			this.x += dx;
		if (map.get(this.x, this.y + dy) <=0)
			this.y += dy;
		
		//If up against a wall, bounce away
		var margin = 2;
		if (map.get(this.x + margin + dx, this.y) > 0 || map.get(this.x - margin + dx, this.y) > 0) 
			this.x -= dx;
		if (map.get(this.x, this.y + margin + dy) > 0 || map.get(this.x, this.y - margin + dy) > 0)
			this.y -= dy;
			
		this.paces += distance;//Increase paces by distance travelled
	}
};

Enemy.prototype.attack = function(player, distance, map){

	var diffX = this.x - player.x;
	var diffY = this.y - player.y;
	
	//Note: atan2() udf at diffX = 0, diffY <= 0, i.e. player is directly south of this enemy
	if(diffX === 0, diffY <= 0)
		this.direction = 1.5 * Math.PI;
	else
		this.direction = Math.atan2(diffY, diffX);
	
	//We'll travel towards player
	var dx = Math.cos(this.direction) * distance;
	var dy = Math.sin(this.direction) * distance;
	
	//Skirt walls
	if (map.get(this.x + dx, this.y) <=0) 
		this.x += dx;
	if (map.get(this.x, this.y + dy) <=0)
		this.y += dy;
		
	this.paces += distance;
};

Enemy.prototype.update = function(map, seconds, player){
	//Calculate distance to move
	var distance = seconds * this.velocity;
	this.walk(player, distance, map);
	
	//Update distance from player
	this.distance = map.distance(player, this, map);
};

Enemy.prototype.collide = function(){
	this.alive = false;
	this.health = 0;
	
	//So the sound will always refire even if it is being played by another enemy
	if(!audioExplode2_effect.ended)
			audioExplode2_effect.currentTime = 0;
	audioExplode2_effect.play();
};

/** Map **/
function Map(size, margin, wallBM, skyBM, groundBM){
  this.margin = margin;
	this.size = size + this.margin;
	this.wallGrid = new Uint8Array(this.size*this.size);
	this.skybox = skyBM; //new Bitmap('cagebox.jpg', 1920, 1080);
	this.wallTexture = wallBM; //new Bitmap('nicolas-cage-expendables-3.jpg', 600, 397);
	this.groundTexture = groundBM; // new Bitmap('nicolas-cage-expendables-3.jpg', 600, 397);
	this.light = 0;
	this.offset = 5 + this.size;//boundary offset from grid
	this.score = 0;
}

Map.prototype.get = function(x, y){
	x = Math.floor(x);
	y = Math.floor(y);
	if ( x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1 ) 
		return -1;
		
	return this.wallGrid[ y * this.size + x ];
};

/**
	Returns (x, y) coordinate of gridpoint map.wallGrid[i]
**/
Map.prototype.getPoint = function(i){
	// i = y * size + x, so y is multiple of sizes, and x remainder
	
	var u = i % this.size;
	var v = (i - u) / this.size;
	
	return {x: u, y: v};
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

Map.prototype.posCheck = function(a, b, radius){
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	var dist = dx * dx + dy * dy;
	var result;
	radius = radius * radius;
	
	//debugger;
	if(radius > dist){
		result = true;
		//console.warn("  Collision! | radius2: " + radius + ", dist2: " + dist);
	}
	else{
		result = false;
		//console.warn("No collision | radius2: " + radius + ", dist2: " + dist);
	}
		
	return result;
	
};


/** Compare two sets of different entities for occupying the same grid.
		
		Assumes each array type has a collide() function.
 **/
Map.prototype.collisionCheck = function(entities, projectiles){
	
	for(var i = 0; i < projectiles.length; i++){
		if(!projectiles[i].alive)
			continue;
			
		//debugger;
		
		for(var j = 0; j < entities.length; j++){
			if(!entities[j].alive)
				continue;
			
			if(this.posCheck(projectiles[i], entities[j], 0.5)){
				entities[j].collide();
				projectiles[i].collide();
				this.score++;
			}
			
			
		}
		
			
		
	}
};

Map.prototype.randomize = function() {
	for (var i = 0; i < this.size * this.size; i++) {
	
	  //Draw map boundary walls 
		if (i > this.size * (this.size - 1) || i % this.size == 0 || i % this.size == this.size - 1 || i / this.size < 1)
			this.wallGrid[i] = 1;
		//Leave margin so map is more traversable
		else if(i < this.size * this.margin || i % this.size < this.margin || i > this.size * (this.size - this.margin) || i % this.size > this.size - this.margin - 1)
			this.wallGrid[i] = 0;
	  //Randomize the rest
		else 
			this.wallGrid[i] = this.wallGrid[i] = Math.random() < 0.3 ? 1 : 0;
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

//TODO: Fix weird javascript lack of casting objects from arrays and finding element function. For now 'array' is really single enemy
Map.prototype.spawn = function(enemyArray){
	console.log("In Map.spawn()");
	var area = this.size * this.size;
	var spawnSpace = 0.7 * area;
	var PR = enemyArray.length / spawnSpace;
	var j = 0;
	
	for(var i = 0; i < area; i++){
		if(this.wallGrid[i] === 0 && Math.random() < PR){
			// i = y * size + x, so y is multiple of sizes, and x remainder
			var point = this.getPoint(i);
			var e = new Enemy(0, 0, 0, enemyBM); 
			e = enemyArray[j];
			Enemy.prototype.spawn.call(e, point.x, point.y, 1);//e.spawn(x, y, 1);//direction will change immediately so 0 at start is fine
			j++;
			
			if(j >= enemyArray.length)
				break;
		}
		
	}
	
};

Map.prototype.update = function(seconds) {
  //Do lightning effect randomly about every 10s
	if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
	else if (Math.random() * 5 < seconds) this.light = 2;
	
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

Camera.prototype.render = function(player, enemies, map, seconds) {
	
	//hold a set of distances to closest object in each rendered column
	var columns = [];

	this.drawSky(player.direction, map.skybox, map.light);
	this.drawTerrain(player.direction, groundBM, map.light);
	this.drawColumns(player, map, columns);
	this.drawEntities(player, enemies, map, columns);
		
	// for(var i = 0; i < player.weapon.missileMax; i++){
		// this.drawMissile(player, map, i);
	// }
	this.drawEntities(player, player.weapon.missiles, map, columns);//TODO: Need alg to account for drawing explosions, so separate func for sprite sheets and texture swaps. AS it is will only draw missile texture and not explosion
	
	this.drawWeapon(player.weapon, player.paces);
	this.drawReticle(reticleBM);
	
	this.drawMinimap(player, enemies, map);
	this.drawScore(map.score);
	
	if(winCondition(enemies))
		this.drawWin();
	
};

Camera.prototype.drawEntities = function(player, entities, map, columns){
	var sprites = [];
	var s;
	
	for(var i = 0; i < entities.length; i++){
		s = this.drawEntity(player, entities[i], map);
		if(s.bDraw && entities[i].alive)
			sprites.push(s.sprite);
	}
	
	console.log("Rendered Entities: " + sprites.length);
	
	sprites.sort(function(a,b){return b.distance - a.distance});
	
	var newDist;
	for(var column = 0; column < this.resolution; column++){
		newDist = this.drawEntityColumn(player, column, sprites, map, columns[column]);
		
		columns[column] = newDist;
	}
}

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

Camera.prototype.drawColumns = function(player, map, columns) {
	this.ctx.save();
	
	for (var column = 0; column < this.resolution; column++) {
	  var angle = this.fov * (column / this.resolution - 0.5);
	  var ray = map.cast(player, player.direction + angle, this.range);
	  columns.push(this.drawColumn(column, ray, angle, map, player));
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

Camera.prototype.drawEntityColumn = function(player, column, sprites, map, prevDistance){
	
	var ctx = this.ctx; 
	var left = Math.floor(column * this.spacing);
	var width = Math.ceil(this.spacing);
	var angle = this.fov * (column / this.resolution - 0.5);
	var colW = this.width / this.resolution;
	var textureX;
	var sprite;
	var height;
	var top;
	var bDrawSprite;
	var imageBM;
	var cellX;
	var cellY;
	var cellWidth;
	
	for(var i = 0; i < sprites.length; i++){
	  sprite = sprites[i];
		
		
		bDrawSprite = 
			left > sprite.xoffset - (sprite.width / 2) &&
			left < sprite.xoffset + (sprite.width / 2) &&
			sprite.distance < prevDistance;
		
		if(bDrawSprite){
			height = sprite.height;
			top = sprite.top;
			imageBM = sprite.textureData.bitmap;
			cellX = sprite.textureData.cellX;
			cellY = sprite.textureData.cellY;
			cellWidth = sprite.textureData.cellWidth;
			cellHeight = sprite.textureData.cellHeight;
			
			if(!sprite.textureData.bSpriteSheet){
				//Draw column of image
				textureX = Math.floor( imageBM.width / sprite.numColumns * (column - sprite.c1) );
				ctx.drawImage(imageBM.image, textureX, 0, 1, imageBM.height, left, top, width, height);
			}
			else{
				//Draw column of sprite cell
				textureX = Math.floor( cellWidth / sprite.numColumns * (column - sprite.c1) );
				ctx.drawImage(imageBM.image, textureX+cellX, cellY, 1, cellHeight, left, top, width, height);
				
			}
			
			prevDistance = sprite.distance;
			
			
		}
		
		
		
		// if(sprite.distance < 2)
				// debugger;
	}
	
	//debugger;
	return prevDistance;
		
}


/**
  Draw entity by dividing texture into columns.
	
	Divides image into columns, and casts rays for each to determine culling by
	environment.
**/
Camera.prototype.drawEntity = function(player, entity, map){
	
	var render = { bDraw: false, sprite: 0};
	
	if(!entity.alive){
		//console.debug("FAILED ALIVE CHECK");
		return render;
	}
	
	var distance = Math.abs(map.distance(player, entity));
	var limit = this.range * 2;	
	var ctx = this.ctx;
	
	if(distance > limit){
		console.debug("FAILED DISTANCE < " + limit + " CHECK, distance: " + distance);
		return render;
	}
	
	// If entity direction and player direction differ too much, don't draw
	var diffX = player.x - entity.x;
	var diffY = player.y - entity.y;
	var angle = 0;
	
	//Note: atan2() udf at diffX = 0, diffY = 0.
	if(diffX != 0, diffY != 0)
		angle = Math.atan2(diffY, diffX) - Math.PI;
	
	//Get angle difference
	var dAngle = player.direction - angle;
	
	//Convert angles greater than PI to angles of range -PI <= angle <= 0
	if(dAngle >= CIRCLE / 2){
		dAngle -= CIRCLE;
	}
	
	//Prevent xoffset error from when entity is east of player, and in leftside view
	//Shouldn't be possible now but we'll see
	if(dAngle > 1.5*Math.PI){
		dAngle = dAngle - CIRCLE;
	}
	
	var fovLimit = this.fov / 2 + Math.PI / 6;
	var fov = dAngle;
	if(Math.abs(fov) >= Math.PI)
		fov = 2*Math.PI - Math.abs(fov);	
	if(Math.abs(fov) > fovLimit){
		//console.debug("Failed FOV check, FOV delta: " + Math.abs(fov) + ", FOV limit: " +  fovLimit);
		return render;
	}
	//console.debug("Passed FOV check, FOV delta: " + fov + ", FOV limit: " +  fovLimit);
	
	var scaleFactor = 0.01 + Math.abs(distance);
	var width = .5 * this.width / scaleFactor; //Multiples of a fraction of wall spacing
	var height = .7 * this.height / scaleFactor; //Scaled multiples of wall spacing fraction
	var top = (this.height / 2) * ( 1 + 1 / scaleFactor) - height;
	var ratio = this.width / this.fov;
	var xoffset = (this.width / 2) - (ratio * dAngle);//debug: error when enemy east of player
	var numColumns = (width / this.width) * this.resolution;
	var c1 = Math.floor( (xoffset - width / 2) / this.width * this.resolution);
	
	var sprite = {
			width: width,
			height: height,
			top: top,
			angle: dAngle,
			xoffset: xoffset,
			distance: distance,
			numColumns: numColumns,
			c1: c1,
			distance: distance,
			textureData: entity.textureData
	}
	
	
	render.bDraw = true;
	render.sprite = sprite;
	
	//For debugging general position, culling
	// ctx.fillStyle = 'red';
	// ctx.fillRect(xoffset, this.height / 2, 3, 3);
	
	//For debugging xoffset by pointing from screen center towards xoffset.
	//If line jumps offscreen, or jitters direction, suspect xoffset error
	//this.drawLine(this.width / 2, this.height / 2, xoffset, this.height/2, "#0000FF");
	
	//debugger;
	return render;
	
};

Camera.prototype.drawReticle = function(texture){
  var x = this.width/2 - texture.width/2;
	var y = this.height/2 - texture.height/2;
	this.ctx.drawImage(texture.image, x, y, texture.width, texture.height);
};

Camera.prototype.drawScore = function(score){
	var text = "Bunnies Boxed: " + score;
	this.ctx.fillStyle = "#FF0000";
	this.ctx.font="20px Georgia";
	this.ctx.fillText(text, 0.4 * this.width, 20);

};

Camera.prototype.drawWin = function(){
	var text = "WIN";
	this.ctx.fillStyle = "#FF0000";
	this.ctx.font="200px Georgia";
	this.ctx.fillText(text, 0.2 * this.width, 0.7 * this.height);
}

Camera.prototype.drawLine = function(x, y, x2, y2, color){
	ctx = this.ctx;
	ctx.save();
	ctx.beginPath();
	ctx.lineWidth="1";
	ctx.strokeStyle=color;
	ctx.moveTo(x, y);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.restore();
};

Camera.prototype.drawMinimap = function(player, enemies, map){
	this.ctx.save();
	var size = 4;
	var offset = map.offset + 5;
	
	//Find general direction player is facing
	var vx = Math.cos(player.direction);
	var vy = Math.sin(player.direction);

	//Floor space of entire map grid
	this.ctx.fillStyle = '#DDDDDD';
	//this.ctx.fillRect(0, 0, map.size * size + 2 * offset, map.size * size + 2 * offset);
	
	//Walls
	for(var i = 0; i < map.size * map.size; i++){
		var point = map.getPoint(i);
		if(map.wallGrid[i] == 1){
			this.ctx.fillStyle = '#000000';
			this.ctx.fillRect(point.x * size + offset, point.y * size + offset, size, size);
		}
		if(map.wallGrid[i] == 2){//debug map generation
			this.ctx.fillStyle = '#333333';
			this.ctx.fillRect(point.x * size + offset, point.y * size + offset, size, size);
		}
		
	}
	
	//Enemy
	this.ctx.fillStyle = '#FF0000';
	for(var i = 0; i < enemies.length; i++){
		if(enemies[i].alive)
			this.ctx.fillRect(enemies[i].x * size + offset, enemies[i].y * size + offset, size/2, size/2);
	}
	
	//Player, and player view direction
	this.ctx.fillStyle = '#00FF00';
	this.ctx.fillRect(player.x * size + offset, player.y * size + offset, size/2, size/2);
	vx = player.x + vx;
	vy = player.y + vy;
	this.ctx.fillStyle = '#FFFF00';
	this.ctx.fillRect(vx * size + offset, vy * size + offset, size/2, size/2);
	//debugger;
	
	this.ctx.restore();
	
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
	var step;
	var distance = 1000;
	
	// Increment hit till first ray element that is a wall
	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
	  step = ray[s];
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
			
			distance = step.distance;
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
	
	return distance;
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

function deg(radians){
	return radians * (180 / Math.PI);
}

function winCondition(enemies){
	for(var i = 0; i < enemies.length; i++){
		if(enemies[i].alive)
			return false;
	}
	
	return true;
}

function getHit(ray){
	var hit = -1;
	while (++hit < ray.length && ray[hit].height <= 0);
	return hit;
}

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

var _missile = new Missile(0, 0, Math.PI * 0.3, 8, missileTextureData, boomTextureData);
var weapon = new Weapon(weaponBM, _missile, 20);


var map = new Map(16, 3, wallBM, skyBM, groundBM);
map.randomize();
var p = map.getPoint(19+2);
var player = new Player(p.x, p.y, 0, weapon);

var controls = new Controls();
var camera = new Camera(display, MOBILE ? 160 : 320, Math.PI * 0.4);
var loop = new GameLoop();

var enemies = [];
var enemyCount = 10;

for(var i = 0; i < enemyCount; i++){
	enemies.push(new Enemy(2, 100, 100, enemyTextureData));
}

map.spawn(enemies);

//Start level intro music, 'put bunny back in the box' line
audioBunny_line.play();

var duration = 5;
console.debug(duration);
var elapsed = 0;
var played = false;

// Start Game
loop.start(function frame(seconds) {
	map.update(seconds);
	player.update(controls.states, map, seconds);//player update() updates missiles
	
	for(var i = 0; i < enemyCount; i++){
		enemies[i].update(map, seconds, player);
	}
	
	map.collisionCheck(enemies, player.weapon.missiles);
	
	camera.render(player, enemies, map, seconds);
	
	elapsed += seconds;
	//console.debug(elapsed);
	if(elapsed > duration && !played){
		audio_theme1.loop = true;
		audio_theme1.play();//start level theme music
		played = true;
	}
	
	 
});