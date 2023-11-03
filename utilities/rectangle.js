"use strict";

//  ===================================================[ IMPORTS ]

import { Vector } from "./index.js"

// |===================================================|
// |                    RECTANGLE                      |
// |===================================================|

// position is the upper-left corner
// * dimensions are 2D
function Rectangle(position = null, dimensions = null) {
	position ??= new Vector();
	dimensions ??= new Vector();

	this.position = position;
	this.dimensions = dimensions;
};

// instance methods
Rectangle.prototype = {
	// sets this rectangles position and dimensions
	set: function (position, dimensions) {
		this.position = position;
		this.dimensions = dimensions;
		return this;
	},
	// returns new rectangle copy constructed from this rectangle
	copy: function () {
		return new Rectangle(this.position.copy(), this.dimensions.copy());
    },
	// sets this rectangles position
	position: function (position) {
		this.position = position;
		return this;
    },
	// sets this rectangles dimensions
	dimensions: function (dimensions) {
		this.dimensions = dimensions;
		return this;
    },
	// returns new rectangle copy constructed from this rectangle
	clone: function () {
		return new Rectangle(this.position, this.dimensions);
	},
	// check position and dimension equality of this rectangle and another rectangle
	// when f0 is true only dimensions are checked
	equals: function (r, f = false) {
		if (f) {
			return this.dimensions.equals(r.dimensions);
		}
		else {
			return this.position.equals(r.position) && this.dimensions.equals(r.dimensions);
		}
	},
	// translates this rectangle
	translate: function (t) {
		this.position.add(t);
		return this;
	},
	// non-uniform/scales this rectangle
	// * t can be either scalar or vector
	scale: function (t) {
		this.dimensions.multiply(t);
		return this;
	},
	// returns the midpoint of this rectangle
	midpoint: function () {
		return new Vector(this.position.x + this.dimensions.x / 2, this.position.y - this.dimensions.y / 2);
	},
	// returns the four points of this rectangle, starting from the upper-left corner counter-clockwise
	points: function () {
		let points = {
			a: new Vector(this.position.x, this.position.y),
			b: new Vector(this.position.x, this.position.y - this.dimensions.y),
			c: new Vector(this.position.x + this.dimensions.x, this.position.y - this.dimensions.y),
			d: new Vector(this.position.x + this.dimensions.x, this.position.y),
		}
		return points;
    },
	// checks if a collision occurs between this rectangle and another rectangle
	// * does not resolve collisions, only detects them
	collides: function (r) {
		return !(
			this.position.x > r.position.x + r.dimensions.x ||
			this.position.x + this.dimensions.x < r.position.x ||
			this.position.y < r.position.y - r.dimensions.y ||
			this.position.y - this.dimensions.y > r.position.y
		);
	},
	// returns the position of this rectangle relative to another rectangle
	// * w.r.t. the center point of both rectangles
	relative: function (r) {
		let c0 = this.midpoint();
		let c1 = r.midpoint();
		return Vector.subtract(c0, c1);
	},
	// returns the depth of collision between this rectangle and another rectangle
	// * does not resolve collisions, only calculates depth of collision
	depth: function (r, rel = undefined) {
		rel ??= this.relative(r);
		let d = new Vector((this.dimensions.x + r.dimensions.x) / 2, (this.dimensions.y + r.dimensions.y) / 2);
		return d.subtract(Vector.abs(rel));
	},
	// checks if this rectangle contains another rectangle 
	// * if a vector is passed, checks if this rectangle contains that point
	contains: function (r) {
		if (r instanceof Rectangle) {
			return (
				this.position.x <= r.position.x &&
				this.position.x + this.dimensions.x >= r.position.x + r.dimensions.x &&
				this.position.y >= r.position.y &&
				this.position.y - this.dimensions.y <= r.position.y - r.dimensions.y
			);
		}
		else if (r instanceof Vector) {
			let points = this.points();

			if (r.relative(points.a, points.b) < 0) {
				return false;
			}
			if (r.relative(points.b, points.c) < 0) {
				return false;
			}
			if (r.relative(points.c, points.d) < 0) {
				return false;
			}
			if (r.relative(points.d, points.a) < 0) {
				return false;
			}
			else {
				return true;
			}
		}
		else {
			return false;
        }
	},
	// checks if this rectangle is contained another rectangle 
	contained: function (r) {
		return (
			this.position.x >= r.position.x &&
			this.position.x + this.dimensions.x <= r.position.x + r.dimensions.x &&
			this.position.y <= r.position.y &&
			this.position.y - this.dimensions.y >= r.position.y - r.dimensions.y
		);
	},
	// calculates the difference between this rectangle and another rectangle across x and y axiis 
	// * returns a 0 vector if this rectangle is fully contained by the other rectangle
	difference: function (r) {
		if (this.contained(r)) {
			return new Vector();
		}

		/* difference diagram
		   abcd is this rectangle, ABCD is the other rectangle
		   if ABCD does not contain abcd, find the largest delta along each axis relative to corner points

		   A # # # # # # # C
			 #			 #
			 #	         #
			 #	   a # # # # # # # d
			 #	     #   #       #
		   B # # # # # # # D     #
		             #           #
				     #           #
				   b # # # # # # # c

		*/

		let points = this.points();
		let points_other = r.points();

		let flag_a = !r.contains(points.a);
		let flag_b = !r.contains(points.b);
		let flag_c = !r.contains(points.c);
		let flag_d = !r.contains(points.d);

		switch (true) {
			case flag_a && flag_b && !flag_c && !flag_d:
				return new Vector(points_other.a.x - points.a.x, 0);
				break;
			case !flag_a && flag_b && flag_c && !flag_d:
				return new Vector(0, points_other.b.y - points.b.y);
				break;
			case !flag_a && !flag_b && flag_c && flag_d:
				return new Vector(points_other.c.x - points.c.x, 0);
				break;
			case flag_a && !flag_b && !flag_c && flag_d:
				return new Vector(0, points_other.d.y - points.d.y);
				break;
			case flag_a && flag_b && flag_c && !flag_d:
				return Vector.subtract(points_other.b, points.b);
				break;
			case !flag_a && flag_b && flag_c && flag_d:
				return Vector.subtract(points_other.c, points.c);
				break;
			case flag_a && !flag_b && flag_c && flag_d:
				return Vector.subtract(points_other.d, points.d);
				break;
			case flag_a && flag_b && !flag_c && flag_d:
				return Vector.subtract(points_other.a, points.a);
				break;
			case flag_a && flag_b && flag_c && flag_d:
				let difference = new Vector();
				if (points.b.x < points_other.b.x) {
					difference.x = points_other.b.x - points.b.x;
				}
				else if (points.d.x > points_other.d.x) {
					difference.x = points_other.d.x - points.d.x;
				}
				if (points.a.y > points_other.a.y) {
					difference.y = points_other.a.y - points.a.y;
				}
				else if (points.c.y < points_other.c.y) {
					difference.y = points_other.c.y - points.c.y;
				}
				return difference;
				break;
		}
	}
};

// static methods

// sets a rectangles position and dimensions
Rectangle.set = function (r, position, dimensions) {
	r.position = position;
	r.dimensions = dimensions;
}

// returns new rectangle copy constructed from a rectangle
Rectangle.copy = function (r) {
	return new Rectangle(r.position.clone(), r.dimensions.clone());
}

// sets a rectangles position
Rectangle.position = function (r, position) {
	r.position = position;
}

// sets a rectangles dimensions
Rectangle.dimensions = function (r, dimensions) {
	r.dimensions = dimensions;
}

// returns new rectangle copy constructed from a rectangle
Rectangle.clone = function (r) {
	return new Rectangle(r.position, r.dimensions);
}

// check position and dimension equality of between two rectangles
// when f0 is true only dimensions are checked
Rectangle.equals = function (r0, r1, f = false) {
	if (f) {
		return r0.dimensions.equals(r1.dimensions);
	}
	else {
		return r0.position.equals(r1.position) && r0.dimensions.equals(r1.dimensions);
	}
}

// returns new rectangle as a result of translating a rectangle
Rectangle.translate = function (r, t) {
	return new Rectangle(r.position.add(t), r.dimensions);
}

// returns new rectangle as a result of non-uniform/scaling a rectangle
// * t can be either scalar or vector
Rectangle.scale = function (r, t) {
	return new Rectangle(r.position, r.dimensions.multiply(t));
}

// returns the midpoint of a rectangle
Rectangle.midpoint = function (r) {
	return new Vector(r.position.x + r.dimensions.x / 2, r.position.y - r.dimensions.y / 2);
}

// returns the four points of a rectangle, starting from the upper-left corner counter-clockwise
Rectangle.points = function (r) {
	let points = {
		a: new Vector(r.position.x, r.position.y),
		b: new Vector(r.position.x, r.position.y - r.dimensions.y),
		c: new Vector(r.position.x + r.dimensions.x, r.position.y - r.dimensions.y),
		d: new Vector(r.position.x + r.dimensions.x, r.position.y),
	}
	return points;
},

// checks if a collision occurs between two rectangles
// * does not resolve collisions, only detects them
Rectangle.collides = function (r0, r1) {
	return !(
		r0.position.x > r1.position.x + r1.dimensions.x ||
		r0.position.x + r0.dimensions.x < r1.position.x ||
		r0.position.y < r1.position.y - r1.dimensions.y ||
		r0.position.y - r0.dimensions.y > r1.position.y
	);
}

// returns the position of a rectangle relative to another rectangle
// * w.r.t. the center point of both rectangles
Rectangle.relative = function (r0, r1) {
	let c0 = new Vector(r0.position.x + r0.dimensions.x / 2, r0.position.y - r0.dimensions.y / 2);
	let c1 = new Vector(r1.position.x + r1.dimensions.x / 2, r1.position.y - r1.dimensions.y / 2);
	return Vector.subtract(c0, c1);
}

// returns the depth of collision between a rectangle and another rectangle
// * does not resolve collisions, only calculates depth of collision
Rectangle.depth = function (r0, r1, rel = undefined) {
	rel ??= Vector.relative(r0, r1);
	let d = new Vector((r0.dimensions.x + r1.dimensions.x) / 2, (r0.dimensions.y + r1.dimensions.y) / 2);
	return d.subtract(Vector.abs(rel));
}

// checks if rectangle r0 contains rectangle r1
// * if r1 is a vector, checks if r0 contains that point
Rectangle.contains = function(r0, r1) {
	if (r1 instanceof Rectangle) {
		return (
			r0.position.x <= r1.position.x &&
			r0.position.x + r0.dimensions.x >= r1.position.x + r1.dimensions.x &&
			r0.position.y >= r1.position.y &&
			r0.position.y - r0.dimensions.y <= r1.position.y - r1.dimensions.y
		);
	}
	else if (r1 instanceof Vector) {
		let points = r0.points();

		if (r1.relative(points.a, points.b) < 0) {
			return false;
		}
		if (r1.relative(points.b, points.c) < 0) {
			return false;
		}
		if (r1.relative(points.c, points.d) < 0) {
			return false;
		}
		if (r1.relative(points.d, points.a) < 0) {
			return false;
		}
		else {
			return true;
		}
	}
	else {
		return false;
	}
}

// checks if the first rectangle is contained by the second rectangle 
Rectangle.contained = function (r0, r1) {
	return (
		r0.position.x > r1.position.x &&
		r0.position.x + r0.dimensions.x < r1.position.x + r1.dimensions.x &&
		r0.position.y < r1.position.y &&
		r0.position.y - r0.dimensions.y > r1.position.y - r1.dimensions.y
	);
}

// calculates the difference between rectangle r0 and rectangle r1 across x and y axiis 
// * returns a 0 vector if rectangle r0 is fully contained by rectangle r1
Rectangle.difference = function (r0, r1) {
	if (r0.contained(r1)) {
		return new Vector();
	}

	/* difference diagram
	   abcd is this rectangle, ABCD is the other rectangle
	   if ABCD does not contain abcd, find the largest delta along each axis relative to corner points

	   A # # # # # # # C
		 #			 #
		 #	         #
		 #	   a # # # # # # # d
		 #	     #   #       #
	   B # # # # # # # D     #
				 #           #
				 #           #
			   b # # # # # # # c

	*/

	let points = r0.points();
	let points_other = r1.points();

	let flag_a = !r1.contains(points.a);
	let flag_b = !r1.contains(points.b);
	let flag_c = !r1.contains(points.c);
	let flag_d = !r1.contains(points.d);

	switch (true) {
		case flag_a && flag_b && !flag_c && !flag_d:
			return new Vector(points_other.a.x - points.a.x, 0);
			break;
		case !flag_a && flag_b && flag_c && !flag_d:
			return new Vector(0, points_other.b.y - points.b.y);
			break;
		case !flag_a && !flag_b && flag_c && flag_d:
			return new Vector(points_other.c.x - points.c.x, 0);
			break;
		case flag_a && !flag_b && !flag_c && flag_d:
			return new Vector(0, points_other.d.y - points.d.y);
			break;
		case flag_a && flag_b && flag_c && !flag_d:
			return Vector.subtract(points_other.b, points.b);
			break;
		case !flag_a && flag_b && flag_c && flag_d:
			return Vector.subtract(points_other.c, points.c);
			break;
		case flag_a && !flag_b && flag_c && flag_d:
			return Vector.subtract(points_other.d, points.d);
			break;
		case flag_a && flag_b && !flag_c && flag_d:
			return Vector.subtract(points_other.a, points.a);
			break;
		case flag_a && flag_b && flag_c && flag_d:
			let difference = new Vector();
			if (points.b.x < points_other.b.x) {
				difference.x = points_other.b.x - points.b.x;
			}
			else if (points.d.x > points_other.d.x) {
				difference.x = points_other.d.x - points.d.x;
			}
			if (points.a.y > points_other.a.y) {
				difference.y = points_other.a.y - points.a.y;
			}
			else if (points.c.y < points_other.c.y) {
				difference.y = points_other.c.y - points.c.y;
			}
			return difference;
			break;
	}
}

export { Rectangle }