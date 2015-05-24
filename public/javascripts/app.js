(function() {
  var Blob, BlobSystem, Camera, Map, Rectangle, Vector, World;

  window.addEventListener("load", (function(e) {
    return new World;
  }), false);

  BlobSystem = (function() {
    function BlobSystem(config) {
      this.world = config.world;
      this.speed = config.speed;
      this.camera = config.camera;
      this.blobs = [];
      return this;
    }

    BlobSystem.prototype.update = function() {
      var blob, j, len, ref;
      ref = this.blobs;
      for (j = 0, len = ref.length; j < len; j++) {
        blob = ref[j];
        if (blob) {
          blob.update();
        }
      }
      return false;
    };

    BlobSystem.prototype.draw = function() {
      var blob, j, len, ref;
      ref = this.blobs;
      for (j = 0, len = ref.length; j < len; j++) {
        blob = ref[j];
        if (blob) {
          blob.draw();
        }
      }
      return false;
    };

    BlobSystem.prototype.getBlobById = function(id) {
      var i;
      i = 0;
      while (i < this.blobs.length) {
        if (this.blobs[i].id === id) {
          return this.blobs[i];
        }
        i++;
      }
      return false;
    };

    BlobSystem.prototype.addBlob = function(config) {
      config.system = this;
      config.world = this.world;
      config.speed = this.speed;
      config.camera = this.camera;
      return this.blobs.push(new Blob(config));
    };

    BlobSystem.prototype.removeBlob = function(index) {
      return this.blobs.splice(index, 1);
    };

    return BlobSystem;

  })();

  Blob = (function() {
    function Blob(config) {
      this.loc = config.loc || new Vector;
      this.world = config.world;
      this.name = config.name;
      this.id = config.id;
      this.color = config.color;
      this.speed = config.speed;
      this.mass = config.mass;
      this.scene = this.world.scene;
      this.ctx = this.world.ctx;
      this.mouse = config.mouse;
      this.camera = config.camera;
      if (this.mouse) {
        this.camera.setPlayer(this);
      }
    }

    Blob.prototype.move = function() {
      var magnitude, radius, target;
      target = this.mouse.clone();
      target.subtract(this.camera.loc.clone().invert());
      target.divide(this.world.scale);
      target.subtract(this.loc);
      magnitude = target.magnitude();
      target.divide(new Vector(magnitude, magnitude));
      target.multiply(this.speed);
      this.loc.add(target);
      radius = this.radius / 2;
      if (this.loc.x - radius < 0) {
        this.loc.x = radius;
      }
      if (this.loc.y - radius < 0) {
        this.loc.y = radius;
      }
      if (this.loc.x + radius > this.scene.width) {
        this.loc.x = scene.width - this.radius;
      }
      if (this.loc.y + radius > this.scene.height) {
        return this.loc.y = this.scene.height - radius;
      }
    };

    Blob.prototype.update = function() {
      this.radius = this.mass / this.world.scale.x;
      if (this.mouse) {
        return this.move();
      }
    };

    Blob.prototype.draw = function() {
      var loc;
      this.ctx.save();
      loc = this.loc.clone().subtract(this.camera.loc);
      this.ctx.beginPath();
      this.ctx.lineWidth = 10 / this.world.scale.x;
      this.ctx.fillStyle = "rgb(" + this.color.r + ", " + this.color.g + ", " + this.color.b + ")";
      this.ctx.strokeStyle = "rgb(" + (this.color.r - 30) + ", " + (this.color.g - 30) + ", " + (this.color.b - 30) + ")";
      this.ctx.arc(loc.x, loc.y, this.radius, 0, Math.PI * 2, true);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.font = "normal " + ((this.radius / 4) + 8) + "px Arial";
      this.ctx.lineWidth = 1 * this.world.scale.x;
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.strokeStyle = "#000000";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = 'middle';
      this.ctx.strokeText(this.name, loc.x, loc.y);
      this.ctx.fillText(this.name, loc.x, loc.y);
      return this.ctx.restore();
    };

    return Blob;

  })();

  Camera = (function() {
    function Camera(config) {
      this.world = config.world;
      this.loc = config.loc || new Vector;
      this.deadzone = new Vector(this.world.window.width / 2, this.world.window.height / 2);
      return this;
    }

    Camera.prototype.setPlayer = function(player) {
      this.player = player;
      return this;
    };

    Camera.prototype.update = function() {
      return this.loc.copy(this.player.loc.clone().subtract(this.deadzone));
    };

    return Camera;

  })();

  Map = (function() {
    function Map(config) {
      this.world = config.world;
      this.camera = config.camera;
      this.scene = this.world.scene;
      this.scale = this.world.scale || new Vector(1.0, 1.0);
      this.ctx = this.world.ctx;
      this.size = 50;
    }

    Map.prototype.draw = function() {
      var height2, i, width2;
      this.ctx.save();
      this.ctx.globalAlpha = .2;
      this.ctx.lineWidth = .5;
      this.ctx.scale(this.scale.x, this.scale.y);
      width2 = this.world.window.width / this.scale.x;
      height2 = this.world.window.height / this.scale.y;
      i = 0.5 + (width2 / 2 - this.camera.loc.x) % this.size;
      while (i < width2) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, 0);
        this.ctx.lineTo(i, height2);
        this.ctx.stroke();
        i += this.size;
      }
      i = 0.5 + (-this.camera.loc.y + height2 / 2) % this.size;
      while (i < height2) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, i);
        this.ctx.lineTo(width2, i);
        this.ctx.stroke();
        i += this.size;
      }
      this.ctx.restore();
      this.ctx.save();
      this.ctx.translate(this.world.window.width / 2, this.world.window.height / 2);
      this.ctx.scale(this.scale.x, this.scale.y);
      this.ctx.translate(-this.camera.loc.x, -this.camera.loc.y);
      return this.ctx.restore();
    };

    return Map;

  })();

  Rectangle = (function() {
    function Rectangle(left, top, width, height) {
      this.left = left || 0;
      this.top = top || 0;
      this.width = width || 0;
      this.height = height || 0;
      this.right = this.left + this.width;
      this.bottom = this.top + this.height;
      return;
    }

    Rectangle.prototype.set = function(left, top, width, height) {
      this.left = left;
      this.top = top;
      this.width = width || this.width;
      this.height = height || this.height;
      this.right = this.left + this.width;
      this.bottom = this.top + this.height;
    };

    Rectangle.prototype.within = function(r) {
      return r.left <= this.left && r.right >= this.right && r.top <= this.top && r.bottom >= this.bottom;
    };

    Rectangle.prototype.overlaps = function(r) {
      return this.left < r.right && r.left < this.right && this.top < r.bottom && r.top < this.bottom;
    };

    return Rectangle;

  })();

  Vector = (function() {
    function Vector(x, y) {
      this.x = x || 0;
      this.y = y || 0;
      return this;
    }

    Vector.prototype.addX = function(vector) {
      this.x += vector.x;
      return this;
    };

    Vector.prototype.addY = function(vector) {
      this.y += vector.y;
      return this;
    };

    Vector.prototype.add = function(vector) {
      this.x += vector.x;
      this.y += vector.y;
      return this;
    };

    Vector.prototype.subtractX = function(vector) {
      this.x -= vector.x;
      return this;
    };

    Vector.prototype.subtractY = function(vector) {
      this.y -= vector.y;
      return this;
    };

    Vector.prototype.subtract = function(vector) {
      this.x -= vector.x;
      this.y -= vector.y;
      return this;
    };

    Vector.prototype.divideX = function(vector) {
      this.x /= vector.x;
      return this;
    };

    Vector.prototype.divideY = function(vector) {
      this.y /= vector.y;
      return this;
    };

    Vector.prototype.divide = function(vector) {
      this.x /= vector.x;
      this.y /= vector.y;
      return this;
    };

    Vector.prototype.multiplyX = function(vector) {
      this.x *= vector.x;
      return this;
    };

    Vector.prototype.multiplyY = function(vector) {
      this.y *= vector.y;
      return this;
    };

    Vector.prototype.multiply = function(vector) {
      this.x *= vector.x;
      this.y *= vector.y;
      return this;
    };

    Vector.prototype.invertX = function(vector) {
      this.x *= -1;
      return this;
    };

    Vector.prototype.invertY = function(vector) {
      this.y *= -1;
      return this;
    };

    Vector.prototype.invert = function(vector) {
      this.x *= -1;
      this.y *= -1;
      return this;
    };

    Vector.prototype.copyX = function(vector) {
      this.x = vector.x;
      return this;
    };

    Vector.prototype.copyY = function(vector) {
      this.y = vector.y;
      return this;
    };

    Vector.prototype.copy = function(vector) {
      this.x = vector.x;
      this.y = vector.y;
      return this;
    };

    Vector.prototype.distanceX = function(vector) {
      return this.x - vector.x;
    };

    Vector.prototype.absDistanceX = function(vector) {
      return Math.abs(this.distanceX(vector));
    };

    Vector.prototype.distanceY = function(vector) {
      return this.y - vector.y;
    };

    Vector.prototype.absDistanceY = function(vector) {
      return Math.abs(this.distanceY(vector));
    };

    Vector.prototype.distanceSq = function(vector) {
      var dx, dy;
      dx = this.distanceX(vector);
      dy = this.distanceY(vector);
      return dx * dx + dy * dy;
    };

    Vector.prototype.distance = function(vector) {
      return Math.sqrt(this.distanceSq(vector));
    };

    Vector.prototype.magnitude = function() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    Vector.prototype.horizontalAngle = function() {
      return Math.atan2(this.y, this.x);
    };

    Vector.prototype.verticalAngle = function() {
      return Math.atan2(this.x, this.y);
    };

    Vector.prototype.angle = function() {
      return this.horizontalAngle();
    };

    Vector.prototype.clone = function() {
      return new Vector(this.x, this.y);
    };

    return Vector;

  })();

  World = (function() {
    function World(config) {
      this.canvas = document.getElementById("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.fps = 60;
      this.interval = 1000 / this.fps;
      this.scale = new Vector(1.0, 1.0);
      this.window = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      this.scene = {
        width: 10000,
        height: 10000
      };
      this.mouse = new Vector;
      this.camera = new Camera({
        world: this
      });
      this.players = new BlobSystem({
        world: this,
        speed: new Vector(3, 3),
        camera: this.camera
      });
      this.players.addBlob({
        id: "slain",
        name: "Slain",
        color: {
          r: 224,
          g: 0,
          b: 0
        },
        mass: 50,
        mouse: this.mouse,
        loc: new Vector(0, 0)
      });
      this.players.addBlob({
        id: "bot1",
        name: "Bot 1",
        color: {
          r: 0,
          g: 88,
          b: 224
        },
        mass: 50,
        loc: new Vector(900, 1500)
      });
      this.players.addBlob({
        id: "bot2",
        name: "Bot 2",
        color: {
          r: 125,
          g: 224,
          b: 0
        },
        mass: 250,
        loc: new Vector(400, 600)
      });
      this.map = new Map({
        world: this,
        camera: this.camera
      });
      this.canvas.addEventListener("mousemove", this.event.onMousemove.bind(this), false);
      window.addEventListener("resize", this.event.onResize.bind(this), true);
      this.event.onResize.bind(this)();
      this.start();
    }

    World.prototype.event = {
      onMousemove: function(e) {
        var ref;
        return ref = [e.clientX, e.clientY], this.mouse.x = ref[0], this.mouse.y = ref[1], ref;
      },
      onResize: function(e) {
        this.window = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        this.canvas.width = this.window.width;
        return this.canvas.height = this.window.height;
      }
    };

    World.prototype.start = function() {
      return this.tick();
    };

    World.prototype.tick = function() {
      this.update();
      this.ctx.fillStyle = '#F2FBFF';
      this.ctx.fillRect(0, 0, this.window.width, this.window.height);
      this.draw();
      return window.setTimeout((function(_this) {
        return function() {
          return requestAnimationFrame(_this.tick.bind(_this));
        };
      })(this), this.interval);
    };

    World.prototype.update = function() {
      this.camera.update();
      return this.players.update();
    };

    World.prototype.draw = function() {
      this.map.draw();
      return this.players.draw();
    };

    return World;

  })();

}).call(this);
