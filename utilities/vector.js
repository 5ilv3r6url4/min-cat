"use strict";

// |===================================================|
// |                     VECTOR                        |
// |===================================================|

// 2D vector
function Vector(x = null, y = null) {
	x ??= 0;
	y ??= 0;

	this.x = x;
	this.y = y;
};

// instance methods
Vector.prototype = {
	// sets this vectors x and y values
	set: function (x = null, y = null) {
		x ??= this.x;
		y ??= this.y;

		this.x = x;
		this.y = y;
		return this;
	},
	// returns new vector copy constructed from this vector
	copy: function () {
		return new Vector(this.x, this.y);
	},
	// check component-wise equality of this vector and another vector
	equals: function (v) {
		return this.x == v.x && this.y == v.y;
	},
	// returns true if this is a zero vector
	is_zero: function () {
		return this.x == 0 && this.y == 0;
    },
	// adds another vector or scalar to this vector
	add: function (v) {
		if (v instanceof Vector) {
			this.x += v.x;
			this.y += v.y;
		}
		else {
			this.x += v;
			this.y += v;
		}
		return this;
	},
	// subtracts another vector or scalar from this vector
	subtract: function (v) {
		if (v instanceof Vector) {
			this.x -= v.x;
			this.y -= v.y;
		}
		else {
			this.x -= v;
			this.y -= v;
		}
		return this;
	},
	// multiplies this vector by another vector or scalar
	multiply: function (v) {
		if (v instanceof Vector) {
			this.x *= v.x;
			this.y *= v.y;
		}
		else {
			this.x *= v;
			this.y *= v;
		}
		return this;
	},
	// divides this vector by another vector or scalar
	divide: function (v) {
		if (v instanceof Vector) {
			this.x /= v.x;
			this.y /= v.y;
		}
		else {
			this.x /= v;
			this.y /= v;
		}
		return this;
	},
	// horizontal flip this vectors x component
	reflect_x: function () {
		this.x *= -1;
		return this;
	},
	// vertical flip this vectors y component
	reflect_y: function () {
		this.y *= -1;
		return this;
	},
	// flip this vector across xy;
	negative: function () {
		this.x = -this.x;
		this.y = -this.y;
		return this;
	},
	// returns the dot product of this vector and another vector
	dot: function (v) {
		return this.x * v.x + this.y * v.y;
	},
	// returns the length of this vector
	length: function () {
		return Math.sqrt(this.dot(this));
	},
	// sets this vector to unit length
	unit: function () {
		this.divide(this.length());
		return this;
	},
	// returns smallest component of this vector
	min: function () {
		return Math.min(this.x, this.y);
	},
	// returns largest component of this vector
	max: function () {
		return Math.max(this.x, this.y);
	},
	// returns this vectors position relative to the line created by two point vectors
	// * order of points is important (cw positive)
	relative: function (v0, v1) {
		return (v1.x - v0.x) * (this.y - v0.y) - (v1.y - v0.y) * (this.x - v0.x);
    },
	// sets the components of this vector to their absolute values
	abs: function () {
		this.set(Math.abs(this.x), Math.abs(this.y));
		return this;
	},
	// limits the components of this vector to the range between the given values
	limit: function (min_x, max_x, min_y, max_y) {
		this.set(Math.min(Math.max(this.x, min_x), max_x),
			     Math.min(Math.max(this.y, min_y), max_y));
		return this;
    },
	// rounds components to nearest int
	round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},
	// rounds components to lowest int
	floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},
	// returns new vector comprised of the signs of the components of this vector
	signs: function () {
		return new Vector(Math.sign(this.x), Math.sign(this.y));
	},
	// returns the canonical direction of this vector CCW from the x-axis
	direction: function () {
		return Math.atan(this.y, this.x);
	},
	// returns the angle between this vector and another
	// when f0 is true the angle is relative
	angle: function (v, f = false) {
		if (f) {
			return Math.atan2(v.y, v.x) - Math.atan2(this.y, this.x);
		}
		else {
			return Math.acos(this.dot(v));
		}
	},
	// linear interpolation between this vector and another vector
	lerp: function (v, t) {
		this.subtract(v).multiply(t).add(v);
		return this;
	},
	// returns new array built from this vector
	array: function () {
		return [this.x, this.y];
	}
};

// static methods

// create a new vector from a config file vector
Vector.from = function (cfg) {
	return new Vector(cfg.x, cfg.y);
}

// sets a vectors x and y values
Vector.set = function (v, x = null, y = null) {
	x ??= v.x;
	y ??= v.y;

	v.x = x;
	v.y = y;
},
// returns new vector copy constructed from a vector
Vector.copy = function (v) {
	return new Vector(v.x, v.y);
}

// check component-wise equality of two vectors
Vector.equals = function (v0, v1) {
	return v0.x == v1.x && v0.y == v1.y;
}

// returns true if v is a zero vector
Vector.is_zero = function (v) {
	return v.x == 0 && v.y == 0;
}

// returns new vector as result of adding two vectors,
// or a vector and a scalar
Vector.add = function (v0, v1) {
	if (v1 instanceof Vector) {
		return new Vector(v0.x + v1.x, v0.y + v1.y);
	}
	else {
		return new Vector(v0.x + v1, v0.y + v1);
	}
}

// returns new vector as result of subtracting two vectors,
// or a vector and a scalar
Vector.subtract = function (v0, v1) {
	if (v1 instanceof Vector) {
		return new Vector(v0.x - v1.x, v0.y - v1.y);
	}
	else {
		return new Vector(v0.x - v1, v0.y - v1);
	}
}

// returns new vector as a result of multiplying two vectors,
// or a vector and a scalar
Vector.multiply = function (v0, v1) {
	if (v1 instanceof Vector) {
		return new Vector(v0.x * v1.x, v0.y * v1.y);
	}
	else {
		return new Vector(v0.x * v1, v0.y * v1);
	}
}

// returns new vector as a result of dividing two vectors,
// or a vector and a scalar
Vector.divide = function (v0, v1) {
	if (v1 instanceof Vector) {
		return new Vector(v0.x / v1.x, v0.y / v1.y);
	}
	else {
		return new Vector(v0.x / v1, v0.y / v1);
	}
}

// return new vector as a result of horizontally flipping a vectors x component
Vector.reflect_x = function (v) {
	return new Vector(-v.x, v.y);
};

// return new vector as a result of vertically flipping a vectors y component
Vector.reflect_y = function (v) {
	return new Vector(v.x, -v.y);
};

// returns new vector flipped across xy
Vector.negative = function (v) {
	return new Vector(-v.x, -v.y);
}

// returns the dot product of two vectors
Vector.dot = function (v0, v1) {
	return v0.x * v1.x + v0.y * v1.y;
}

// return a new unit length vector from a vector
Vector.unit = function (v) {
	return new Vector.divide(v, v.length());
}

// returns new vector composed of the smallest components between two vectors
Vector.min = function (v0, v1) {
	return new Vector(Math.min(v0.x, v1.x), Math.min(v0.y, v1.y));
}

// returns new vector composed of the biggest components between two vectors
Vector.max = function (v0, v1) {
	return new Vector(Math.max(v0.x, v1.x), Math.max(v0.y, v1.y));
}

// returns vector v0's position relative to the line created by two point vectors
// * order of points is important (cw positive)
Vector.relative = function (v0, v1, v2) {
	return (v2.x - v1.x) * (v0.y - v1.y) - (v2.y - v1.y) * (v0.x - v1.x);
},

// returns new absolute valued vector from a given vector
Vector.abs = function (v) {
	return new Vector(Math.abs(v.x), Math.abs(v.y));
}

// returns a new vector as a result of limiting the components 
// of a vector to the range between the given values
Vector.limit = function (v, min_x, max_x, min_y, max_y) {
	return new Vector(Math.min(Math.max(v.x, min_x), max_x),
					  Math.min(Math.max(v.y, min_y), max_y));
}

// returns new vector as a result of rounding components of a vector to nearest int
Vector.round = function (v) {
	return new Vector(Math.round(v.x), Math.round(v.y));
}

// returns new vector as a result of rounding components of a vector to lowest int
Vector.floor = function (v) {
	return new Vector(Math.floor(v.x), Math.floor(v.y));
}

// returns new vector comprised of the signs of the components of a vector
Vector.signs = function (v) {
	return new Vector(Math.sign(v.x), Math.sign(v.y));
}

// returns the canonical direction of a vector CCW from the x-axis
Vector.direction = function (v) {
	return Math.atan(v.y, v.x);
}

// returns the angle between two vectors
// when f0 is true the angle is relative
Vector.angle = function (v0, v1, f = false) {
	if (f) {
		return Math.atan2(v1.y, v1.x) - Math.atan2(v0.y, v0.x);
	}
	else {
		return Math.acos(Vector.dot(v0, v0));
	}
}

// linear interpolation between two vectors
Vector.lerp = function (v0, v1, t) {
	let v = v0.copy();
	v.subtract(v1).multiply(t).add(v1);
	return v;
};

// returns new array built from a vector
Vector.array = function (v) {
	return [v.x, v.y];
}

export { Vector }