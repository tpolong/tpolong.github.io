// src/TrafficScene.ts
import * as maptalks from "maptalks";
import * as turf from "@turf/turf";
import { GLTFLayer, MultiGLTFMarker } from "@maptalks/gltf-layer";

// src/Util.ts
var idCounter = 0;
function sample(obj, num, guard) {
  if (num == null || guard) {
    if (obj.length !== +obj.length) obj = Object.values(obj);
    return obj[rand(obj.length - 1)];
  }
  return shuffle(obj).slice(0, Math.max(0, num));
}
function shuffle(obj) {
  let randNum;
  let index = 0;
  const shuffled = [];
  for (const key of Object.keys(obj)) {
    randNum = rand(index++);
    shuffled[index - 1] = shuffled[randNum];
    shuffled[randNum] = obj[key];
  }
  return shuffled;
}
function uniqueId(prefix) {
  const id = ++idCounter + "";
  return prefix ? prefix + id : id;
}
function rand(min, max) {
  if (!max) {
    max = min;
    min = 0;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

// src/Segment.ts
var Segment = class _Segment {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }
  get vector() {
    return this.target.subtract(this.source);
  }
  get length() {
    return this.vector.length;
  }
  get direction() {
    return this.vector.direction;
  }
  get center() {
    return this.getPoint(0.5);
  }
  split(n, reverse) {
    let k, m, len, ref, results, results1;
    const order = reverse ? function() {
      results = [];
      for (let i = ref = n - 1; ref <= 0 ? i <= 0 : i >= 0; ref <= 0 ? i++ : i--) {
        results.push(i);
      }
      return results;
    }.apply(this) : function() {
      results1 = [];
      for (let j = 0, ref1 = n - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; 0 <= ref1 ? j++ : j--) {
        results1.push(j);
      }
      return results1;
    }.apply(this);
    const results2 = [];
    for (m = 0, len = order.length; m < len; m++) {
      k = order[m];
      results2.push(this.subsegment(k / n, (k + 1) / n));
    }
    return results2;
  }
  getPoint(atPoint) {
    return this.source.add(this.vector.mult(atPoint));
  }
  subsegment(a, b) {
    const offset = this.vector;
    const start = this.source.add(offset.mult(a));
    const end = this.source.add(offset.mult(b));
    return new _Segment(start, end);
  }
};

// src/Curve.ts
var Curve = class {
  constructor(atA, atB, atO, atQ) {
    this.A = atA;
    this.B = atB;
    this.O = atO;
    this.Q = atQ;
    this.AO = new Segment(this.A, this.O);
    this.OQ = new Segment(this.O, this.Q);
    this.QB = new Segment(this.Q, this.B);
    this.len = null;
  }
  get length() {
    let i, point, pointsNumber, prevoiusPoint, index;
    if (this.len == null) {
      pointsNumber = 10;
      prevoiusPoint = null;
      this.len = 0;
      for (i = index = 0; 0 <= pointsNumber ? index <= pointsNumber : index >= pointsNumber; i = 0 <= pointsNumber ? ++index : --index) {
        point = this.getPoint(i / pointsNumber);
        if (prevoiusPoint) {
          this.len += point.subtract(prevoiusPoint).length;
        }
        prevoiusPoint = point;
      }
    }
    return this.len;
  }
  getPoint(atPoint) {
    const p0 = this.AO.getPoint(atPoint);
    const p1 = this.OQ.getPoint(atPoint);
    const p2 = this.QB.getPoint(atPoint);
    const r0 = new Segment(p0, p1).getPoint(atPoint);
    const r1 = new Segment(p1, p2).getPoint(atPoint);
    return new Segment(r0, r1).getPoint(atPoint);
  }
  getDirection(atPoint) {
    const p0 = this.AO.getPoint(atPoint);
    const p1 = this.OQ.getPoint(atPoint);
    const p2 = this.QB.getPoint(atPoint);
    const r0 = new Segment(p0, p1).getPoint(atPoint);
    const r1 = new Segment(p1, p2).getPoint(atPoint);
    return new Segment(r0, r1).direction;
  }
};

// src/LanePosition.ts
var LanePosition = class {
  constructor(car, lane, position) {
    this.id = uniqueId("laneposition");
    this.free = true;
    this.car = car;
    this.position = position;
    this.tmpLane = lane;
  }
  get lane() {
    return this.tmpLane;
  }
  set lane(lane) {
    this.release();
    this.tmpLane = lane;
  }
  get relativePosition() {
    return this.position / this.lane.length;
  }
  get nextCarDistance() {
    let frontPosition, rearPosition;
    const next = this.getNext();
    if (next) {
      rearPosition = next.position - next.car.length / 2;
      frontPosition = this.position + this.car.length / 2;
      return { car: next.car, distance: rearPosition - frontPosition };
    }
    return { car: null, distance: Infinity };
  }
  acquire() {
    let ref;
    if (((ref = this.lane) != null ? ref.addCarPosition : void 0) != null) {
      this.free = false;
      return this.lane.addCarPosition(this);
    }
    return null;
  }
  release() {
    let ref;
    if (!this.free && ((ref = this.lane) != null ? ref.removeCar : void 0)) {
      this.free = true;
      return this.lane.removeCar(this);
    }
    return null;
  }
  getNext() {
    if (this.lane && !this.free) {
      return this.lane.getNext(this);
    }
    return null;
  }
};

// src/Trajectory.ts
var Trajectory = class {
  constructor(car, lane, position) {
    this.isChangingLanes = false;
    this.car = car;
    this.current = new LanePosition(car, lane, position || 0);
    this.current.acquire();
    this.next = new LanePosition(car);
    this.temp = new LanePosition(car);
  }
  get lane() {
    return this.temp.lane || this.current.lane;
  }
  get absolutePosition() {
    if (this.temp.lane !== null && this.temp.lane !== void 0) {
      return this.temp.position;
    }
    return this.current.position;
  }
  get relativePosition() {
    return this.absolutePosition / this.lane.length;
  }
  get direction() {
    return this.lane.getDirection();
  }
  get coords() {
    return this.lane.getPoint(this.relativePosition);
  }
  get nextCarDistance() {
    const a = this.current.nextCarDistance;
    const b = this.next.nextCarDistance;
    if (a.distance < b.distance) {
      return a;
    } else {
      return b;
    }
  }
  get distanceToStopLine() {
    if (!this.canEnterIntersection()) {
      return this.getDistanceToIntersection();
    }
    return Infinity;
  }
  get nextIntersection() {
    return this.current.lane.road.target;
  }
  get previousIntersection() {
    return this.current.lane.road.source;
  }
  isValidTurn() {
    const nextLane = this.car.nextLane;
    const sourceLane = this.current.lane;
    const turnNumber = sourceLane.getTurnDirection(nextLane);
    if (turnNumber === 3) throw Error("no U-turns are allowed");
    if (turnNumber === 0 && !sourceLane.isLeftmost) {
      throw Error("no left turns from this lane");
    }
    if (turnNumber === 2 && !sourceLane.isRightmost) {
      throw Error("no right turns from this lane");
    }
    return true;
  }
  canEnterIntersection() {
    const nextLane = this.car.nextLane;
    const sourceLane = this.current.lane;
    if (!nextLane) {
      return true;
    }
    const intersection = this.nextIntersection;
    const turnNumber = sourceLane.getTurnDirection(nextLane);
    const sideId = sourceLane.road.targetSideId;
    return intersection.controlSignals.state[sideId][turnNumber];
  }
  getDistanceToIntersection() {
    const distance = this.current.lane.length - this.car.length / 2 - this.current.position;
    if (!this.isChangingLanes) {
      return Math.max(distance, 0);
    }
    return Infinity;
  }
  timeToMakeTurn(plannedStep) {
    if (plannedStep === void 0) {
      plannedStep = 0;
    }
    return this.getDistanceToIntersection() <= plannedStep;
  }
  moveForward(distance) {
    let ref, ref1;
    distance = Math.max(distance, 0);
    this.current.position += distance;
    this.next.position += distance;
    this.temp.position += distance;
    if (this.timeToMakeTurn() && this.canEnterIntersection() && this.isValidTurn())
      this._startChangingLanes(this.car.popNextLane(), 0);
    const tempRelativePosition = this.temp.position / ((ref = this.temp.lane) != null ? ref.length : void 0);
    const gap = 2 * this.car.length;
    if (this.isChangingLanes && this.temp.position > gap && !this.current.free)
      this.current.release();
    if (this.isChangingLanes && this.next.free && this.temp.position + gap > ((ref1 = this.temp.lane) != null ? ref1.length : void 0))
      this.next.acquire();
    if (this.isChangingLanes && tempRelativePosition >= 1)
      this._finishChangingLanes();
    if (this.current.lane && !this.isChangingLanes && !this.car.nextLane)
      return this.car.pickNextLane();
    return null;
  }
  changeLane(nextLane) {
    if (this.isChangingLanes) throw Error("already changing lane");
    if (nextLane == null) throw Error("no next lane");
    if (nextLane === this.lane) throw Error("next lane == current lane");
    if (this.lane.road !== nextLane.road) throw Error("not neighbouring lanes");
    const nextPosition = this.current.position + 3 * this.car.length;
    return this._startChangingLanes(nextLane, nextPosition);
  }
  //@internal
  _getAdjacentLaneChangeCurve() {
    const p1 = this.current.lane.getPoint(this.current.relativePosition);
    const p2 = this.next.lane.getPoint(this.next.relativePosition);
    const distance = p2.subtract(p1).length;
    const direction1 = this.current.lane.middleLine.vector.normalized.mult(
      distance * 0.3
    );
    const control1 = p1.add(direction1);
    const direction2 = this.next.lane.middleLine.vector.normalized.mult(
      distance * 0.3
    );
    const control2 = p2.subtract(direction2);
    return new Curve(p1, p2, control1, control2);
  }
  //@internal
  _getCurve() {
    return this._getAdjacentLaneChangeCurve();
  }
  //@internal
  _startChangingLanes(nextLane, nextPosition) {
    if (this.isChangingLanes) {
      throw Error("already changing lane");
    }
    if (nextLane == null) {
      return 0;
    }
    this.isChangingLanes = true;
    this.next.lane = nextLane;
    this.next.position = nextPosition;
    const curve = this._getCurve();
    this.temp.lane = curve;
    this.temp.position = 0;
    return this.next.position -= this.temp.lane.length;
  }
  //@internal
  _finishChangingLanes() {
    if (!this.isChangingLanes) {
      throw Error("no lane changing is going on");
    }
    this.isChangingLanes = false;
    this.current.lane = this.next.lane;
    this.current.position = this.next.position || 0;
    this.current.acquire();
    this.next.lane = null;
    this.next.position = NaN;
    this.temp.lane = null;
    this.temp.position = NaN;
    return this.current.lane;
  }
  release() {
    let ref, ref1, ref2;
    if ((ref = this.current) != null) ref.release();
    if ((ref1 = this.next) != null) ref1.release();
    return (ref2 = this.temp) != null ? ref2.release() : void 0;
  }
};

// src/Car.ts
var TYPE_OF_CARS = [];
var Car = class {
  constructor(lane, position) {
    this.type = rand(TYPE_OF_CARS.length - 1);
    this.id = uniqueId("car");
    this.color = (300 + 240 * Math.random() | 0) % 360;
    this.preferedLane = null;
    this.width = 2;
    this.length = 2;
    this.tmpSpeed = 0;
    this.maxSpeed = 30;
    this.s0 = 2;
    this.timeHeadway = 1.5;
    this.maxAcceleration = 1;
    this.maxDeceleration = 3;
    this.alive = true;
    this.trajectory = new Trajectory(this, lane, position);
  }
  get coords() {
    return this.trajectory.coords;
  }
  get speed() {
    return this.tmpSpeed;
  }
  set speed(speed) {
    if (speed < 0) {
      speed = 0;
    }
    if (speed > this.maxSpeed) {
      speed = this.maxSpeed;
    }
    this.tmpSpeed = speed;
  }
  get direction() {
    return this.trajectory.direction;
  }
  release() {
    return this.trajectory.release();
  }
  getAcceleration() {
    let ref;
    const nextCarDistance = this.trajectory.nextCarDistance;
    const distanceToNextCar = Math.max(nextCarDistance.distance, 0);
    const a = this.maxAcceleration;
    const b = this.maxDeceleration;
    const deltaSpeed = this.speed - ((ref = nextCarDistance.car) != null ? ref.speed : void 0) || 0;
    const freeRoadCoeff = Math.pow(this.speed / this.maxSpeed, 4);
    const distanceGap = this.s0;
    const timeGap = this.speed * this.timeHeadway;
    const breakGap = this.speed * deltaSpeed / (2 * Math.sqrt(a * b));
    const safeDistance = distanceGap + timeGap + breakGap;
    const busyRoadCoeff = Math.pow(safeDistance / distanceToNextCar, 2);
    const safeIntersectionDistance = 1 + timeGap + Math.pow(this.speed, 2) / (2 * b);
    const intersectionCoeff = Math.pow(
      safeIntersectionDistance / this.trajectory.distanceToStopLine,
      2
    );
    const coeff = 1 - freeRoadCoeff - busyRoadCoeff - intersectionCoeff;
    return this.maxAcceleration * coeff;
  }
  move(delta) {
    const acceleration = this.getAcceleration();
    this.speed += acceleration * delta;
    if (!this.trajectory.isChangingLanes && this.nextLane) {
      const currentLane = this.trajectory.current.lane;
      const turnNumber = currentLane.getTurnDirection(this.nextLane);
      const preferedLane = function() {
        switch (turnNumber) {
          case 0:
            return currentLane.leftmostAdjacent;
          case 2:
            return currentLane.rightmostAdjacent;
          default:
            return currentLane;
        }
      }();
      if (preferedLane !== currentLane) {
        this.trajectory.changeLane(preferedLane);
      }
    }
    const step = this.speed * delta + 0.5 * acceleration * Math.pow(delta, 2);
    if (this.trajectory.nextCarDistance.distance < step) console.log("bad IDM");
    if (this.trajectory.timeToMakeTurn(step)) {
      if (this.nextLane == null) {
        this.alive = false;
        return this.alive;
      }
    }
    return this.trajectory.moveForward(step);
  }
  pickNextRoad() {
    const intersection = this.trajectory.nextIntersection;
    const currentLane = this.trajectory.current.lane;
    const possibleRoads = intersection.roads.filter(function(x) {
      return x.target !== currentLane.road.source;
    });
    if (possibleRoads.length === 0) return null;
    const nextRoad = sample(possibleRoads);
    return nextRoad;
  }
  pickNextLane() {
    if (this.nextLane) throw Error("next lane is already chosen");
    this.nextLane = null;
    const nextRoad = this.pickNextRoad();
    if (!nextRoad) return null;
    const turnNumber = this.trajectory.current.lane.road.getTurnDirection(nextRoad);
    const laneNumber = function() {
      switch (turnNumber) {
        case 0:
          return nextRoad.lanesNumber - 1;
        case 1:
          return rand(0, nextRoad.lanesNumber - 1);
        case 2:
          return 0;
      }
      return null;
    }();
    this.nextLane = nextRoad.lanes[laneNumber];
    return this.nextLane;
  }
  popNextLane() {
    const nextLane = this.nextLane;
    this.nextLane = null;
    this.preferedLane = null;
    return nextLane;
  }
};

// src/ControlSignals.ts
var ControlSignals = class {
  constructor(intersection) {
    this.flipMultiplier = 1 + (Math.random() * 0.4 - 0.2);
    this.time = 0;
    this.stateNum = 0;
    this.lightsFlipInterval = 20;
    this.states = [
      ["L", "", "L", ""],
      ["FR", "", "FR", ""],
      ["", "L", "", "L"],
      ["", "FR", "", "FR"]
    ];
    this.intersection = intersection;
  }
  get flipInterval() {
    return this.flipMultiplier * this.lightsFlipInterval;
  }
  get state() {
    let stringState = this.states[this.stateNum % this.states.length];
    if (this.intersection.roads.length <= 2) {
      stringState = ["LFR", "LFR", "LFR", "LFR"];
    }
    const results = [];
    for (let i = 0, len = stringState.length; i < len; i++) {
      const x = stringState[i];
      results.push(this.decode(x));
    }
    return results;
  }
  decode(str) {
    const state = [0, 0, 0];
    const indexOf = [].indexOf || function(item) {
      for (let i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item) return i;
      }
      return -1;
    };
    if (indexOf.call(str, "L") >= 0) state[0] = 1;
    if (indexOf.call(str, "F") >= 0) state[1] = 1;
    if (indexOf.call(str, "R") >= 0) state[2] = 1;
    return state;
  }
  flip() {
    return this.stateNum += 1;
  }
  onTick(delta) {
    this.time += delta;
    if (this.time > this.flipInterval) {
      this.flip();
      return this.time -= this.flipInterval;
    }
    return null;
  }
};

// src/Point.ts
var Point = class _Point {
  constructor(x, y) {
    this.x = 0;
    this.y = 0;
    if (x) this.x = x;
    if (y) this.y = y;
  }
  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  get direction() {
    return Math.atan2(this.y, this.x);
  }
  get normalized() {
    return new _Point(this.x / this.length, this.y / this.length);
  }
  add(point) {
    return new _Point(this.x + point.x, this.y + point.y);
  }
  subtract(point) {
    return new _Point(this.x - point.x, this.y - point.y);
  }
  mult(ratio) {
    return new _Point(this.x * ratio, this.y * ratio);
  }
  divide(ratio) {
    return new _Point(this.x / ratio, this.y / ratio);
  }
};

// src/Rect.ts
var Rect = class _Rect {
  constructor(x, y, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
  }
  static copy(rect) {
    return new _Rect(rect.x, rect.y, rect.width, rect.height);
  }
  toJSON() {
    return Object.assign({}, this);
  }
  area() {
    return this.width * this.height;
  }
  left(left) {
    if (left !== void 0) {
      this.x = left;
    }
    return this.x;
  }
  right(right) {
    if (right !== void 0) {
      this.x = right - this.width;
    }
    return this.x + this.width;
  }
  top(top) {
    if (top !== void 0) {
      this.y = top;
    }
    return this.y;
  }
  bottom(bottom) {
    if (bottom !== void 0) {
      this.y = bottom - this.height;
    }
    return this.y + this.height;
  }
  center(center) {
    if (center !== void 0) {
      this.x = center.x - this.width / 2;
      this.y = center.y - this.height / 2;
    }
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }
  containsPoint(point) {
    let ref, ref1;
    return this.left() <= (ref = point.x) && ref <= this.right() && this.top() <= (ref1 = point.y) && ref1 <= this.bottom();
  }
  containsRect(rect) {
    return this.left() <= rect.left() && rect.right() <= this.right() && this.top() <= rect.top() && rect.bottom() <= this.bottom();
  }
  getVertices() {
    return [
      new Point(this.left(), this.top()),
      new Point(this.right(), this.top()),
      new Point(this.right(), this.bottom()),
      new Point(this.left(), this.bottom())
    ];
  }
  getSide(i) {
    const vertices = this.getVertices();
    return new Segment(vertices[i], vertices[(i + 1) % 4]);
  }
  getSectorId(point) {
    const offset = point.subtract(this.center());
    if (offset.y <= 0 && Math.abs(offset.x) <= Math.abs(offset.y)) return 0;
    if (offset.x >= 0 && Math.abs(offset.x) >= Math.abs(offset.y)) return 1;
    if (offset.y >= 0 && Math.abs(offset.x) <= Math.abs(offset.y)) return 2;
    if (offset.x <= 0 && Math.abs(offset.x) >= Math.abs(offset.y)) return 3;
    throw new Error("algorithm error");
  }
  getSector(point) {
    return this.getSide(this.getSectorId(point));
  }
};

// src/Intersection.ts
var Intersection = class _Intersection {
  constructor(rect) {
    this.id = uniqueId("intersection");
    this.rect = rect;
    this.roads = [];
    this.inRoads = [];
    this.controlSignals = new ControlSignals(this);
  }
  static copy(intersection) {
    intersection.rect = Rect.copy(intersection.rect);
    const result = Object.create(_Intersection.prototype);
    Object.assign(result, intersection);
    result.roads = [];
    result.inRoads = [];
    result.controlSignals = new ControlSignals(result);
    return result;
  }
  toJSON() {
    return { id: this.id, rect: this.rect };
  }
  update() {
    let road, i, j, len, len1;
    const ref = this.roads;
    for (i = 0, len = ref.length; i < len; i++) {
      road = ref[i];
      road.update();
    }
    const ref1 = this.inRoads;
    const results = [];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      road = ref1[j];
      results.push(road.update());
    }
    return results;
  }
};

// src/Pool.ts
var Pool = class {
  constructor(factory, pool) {
    this.objects = {};
    let k, v, ref;
    this.factory = factory;
    if (!!pool && !!pool.objects) {
      ref = pool.objects;
      for (k in ref) {
        v = ref[k];
        if (!(this.factory instanceof Car)) {
          this.objects[k] = this.factory.copy(v);
        }
      }
    }
  }
  get length() {
    return Object.keys(this.objects).length;
  }
  toJSON() {
    return this.objects;
  }
  get(id) {
    return this.objects[id];
  }
  put(obj) {
    return this.objects[obj.id] = obj;
  }
  pop(obj) {
    let ref;
    const id = (ref = obj.id) !== null ? ref : obj;
    const result = this.objects[id];
    if (result instanceof Car) {
      result.release();
    }
    delete this.objects[id];
    return result;
  }
  all() {
    return this.objects;
  }
  clear() {
    return this.objects = {};
  }
};

// src/Lane.ts
var Lane = class {
  constructor(sourceSegment, targetSegment, road) {
    this.leftmostAdjacent = null;
    this.rightmostAdjacent = null;
    this.carsPositions = {};
    this.sourceSegment = sourceSegment;
    this.targetSegment = targetSegment;
    this.road = road;
    this.update();
  }
  get sourceSideId() {
    return this.road.sourceSideId;
  }
  get targetSideId() {
    return this.road.targetSideId;
  }
  get isRightmost() {
    return this === this.rightmostAdjacent;
  }
  get isLeftmost() {
    return this === this.leftmostAdjacent;
  }
  get leftBorder() {
    return new Segment(this.sourceSegment.source, this.targetSegment.target);
  }
  get rightBorder() {
    return new Segment(this.sourceSegment.target, this.targetSegment.source);
  }
  toJSON() {
    const obj = Object.assign({}, this);
    delete obj.carsPositions;
    return obj;
  }
  update() {
    this.middleLine = new Segment(
      this.sourceSegment.center,
      this.targetSegment.center
    );
    this.length = this.middleLine.length;
    return this.direction = this.middleLine.direction;
  }
  getTurnDirection(other) {
    if (!other) {
      return 1;
    } else {
      return this.road.getTurnDirection(other.road);
    }
  }
  getDirection() {
    return this.direction;
  }
  getPoint(a) {
    return this.middleLine.getPoint(a);
  }
  addCarPosition(carPosition) {
    if (carPosition.id in this.carsPositions) {
      throw Error("car is already here");
    }
    return this.carsPositions[carPosition.id] = carPosition;
  }
  removeCar(carPosition) {
    if (!(carPosition.id in this.carsPositions)) {
      throw Error("removing unknown car");
    }
    return delete this.carsPositions[carPosition.id];
  }
  getNext(carPosition) {
    if (carPosition.lane !== this) {
      throw Error("car is on other lane");
    }
    let next = null;
    let bestDistance = Infinity;
    const ref = this.carsPositions;
    for (const id in ref) {
      const o = ref[id];
      const distance = o.position - carPosition.position;
      if (!o.free && 0 < distance && distance < bestDistance) {
        bestDistance = distance;
        next = o;
      }
    }
    return next;
  }
};

// src/Road.ts
var Road = class _Road {
  constructor(source, target, gridSize) {
    this.id = uniqueId("road");
    this.lanes = [];
    this.lanesNumber = null;
    this.source = source;
    this.target = target;
    this.gridSize = gridSize || 32;
    this.update();
  }
  get length() {
    return this.targetSide.target.subtract(this.sourceSide.source).length;
  }
  get leftmostLane() {
    return this.lanes[this.lanesNumber - 1];
  }
  get rightmostLane() {
    return this.lanes[0];
  }
  copy(road) {
    const result = Object.create(_Road.prototype);
    Object.assign(result, road);
    if (result.lanes == null) {
      result.lanes = [];
    }
    return result;
  }
  toJSON() {
    return { id: this.id, source: this.source.id, target: this.target.id };
  }
  getTurnDirection(other) {
    if (this.target !== other.source) {
      throw Error("invalid roads");
    }
    const side1 = this.targetSideId;
    const side2 = other.sourceSideId;
    return (side2 - side1 - 1 + 8) % 4;
  }
  update() {
    let i, base, i1, j, ref, ref1;
    if (!(this.source && this.target)) {
      throw Error("incomplete road");
    }
    this.sourceSideId = this.source.rect.getSectorId(this.target.rect.center());
    this.sourceSide = this.source.rect.getSide(this.sourceSideId).subsegment(0.5, 1);
    this.targetSideId = this.target.rect.getSectorId(this.source.rect.center());
    this.targetSide = this.target.rect.getSide(this.targetSideId).subsegment(0, 0.5);
    this.lanesNumber = Math.min(this.sourceSide.length, this.targetSide.length) | 0;
    this.lanesNumber = Math.max(2, this.lanesNumber / this.gridSize | 0);
    const sourceSplits = this.sourceSide.split(this.lanesNumber, true);
    const targetSplits = this.targetSide.split(this.lanesNumber);
    if (this.lanes == null || this.lanes.length < this.lanesNumber) {
      if (this.lanes == null) this.lanes = [];
      for (i = i1 = 0, ref = this.lanesNumber - 1; 0 <= ref ? i1 <= ref : i1 >= ref; i = 0 <= ref ? ++i1 : --i1) {
        if ((base = this.lanes)[i] == null)
          base[i] = new Lane(sourceSplits[i], targetSplits[i], this);
      }
    }
    const results = [];
    for (i = j = 0, ref1 = this.lanesNumber - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; i = 0 <= ref1 ? ++j : --j) {
      this.lanes[i].sourceSegment = sourceSplits[i];
      this.lanes[i].targetSegment = targetSplits[i];
      this.lanes[i].leftAdjacent = this.lanes[i + 1];
      this.lanes[i].rightAdjacent = this.lanes[i - 1];
      this.lanes[i].leftmostAdjacent = this.lanes[this.lanesNumber - 1];
      this.lanes[i].rightmostAdjacent = this.lanes[0];
      results.push(this.lanes[i].update());
    }
    return results;
  }
};

// src/TrafficScene.ts
var TrafficScene = class {
  constructor(options) {
    this.toRemove = [];
    this.carsList = {};
    //@internal
    this._lastUpdate = 0;
    //@internal
    this._previousTime = 0;
    //@internal
    this._carlayer = new GLTFLayer("traffic");
    //@internal
    this._timeFactor = 5;
    //@internal
    this._state = "stop";
    //@internal
    this._symbols = [];
    //@internal
    this._instanceMap = {};
    this.options = options || {};
    this.carsNumber = this.options.carsNumber || 10;
    this.gridSize = this.options.gridSize || 32;
    this.set();
  }
  /**
   * 开始运行交通轨迹。
   *
   * @english
   * Start running traffic trajectory.
   * @return void
   */
  run() {
    this._state = "running";
    this._update();
  }
  /**
   * 停止运行交通轨迹。
   *
   * @english
   * Stop running traffic trajectory.
   * @return void
   */
  stop() {
    this._state = "stop";
  }
  /**
   * 移除当前轨迹图层。
   *
   * @english
   * Remove the traffic trajectory layer.
   * @return void
   */
  remove() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }
    this._carlayer.remove();
    delete this.map;
  }
  /**
   * 设置模型的样式。
   *
   * @english
   * Set symbols of gltf models.
   * @param symbols - symbols of gltf markers
   * @return void
   */
  setSymbols(symbols) {
    this._symbols = symbols;
    for (let i = 0; i < this._symbols.length; i++) {
      const symbol = this._symbols[i];
      this._instanceMap[symbol.url] = new MultiGLTFMarker([], { symbol }).addTo(
        this._carlayer
      );
    }
  }
  //@internal
  _update() {
    if (this._state !== "running") {
      return;
    }
    const now = Date.now();
    this._lastUpdate = now;
    const time = Date.now();
    let delta = time - this._previousTime || 0;
    if (delta > 100) {
      delta = 100;
    }
    this._previousTime = time;
    this.onTick(this._timeFactor * delta / 1e3);
    let id;
    let i = this.toRemove.length;
    while (i--) {
      this._removeCar(this.toRemove[i]);
    }
    this.clearTmpRemove();
    const carsMap = this.cars.all();
    for (id in carsMap) {
      this._addCar(carsMap[id]);
    }
    this._rafId = window.requestAnimationFrame(this._update.bind(this));
  }
  //@internal
  _updateInstanceData() {
    for (const t in this._instanceMap) {
      this._instanceMap[t].removeData();
    }
    for (const id in this.carsList) {
      const car = this.carsList[id];
      const url = car.url;
      this._instanceMap[url].addData(car);
    }
  }
  //@internal
  _addCar(car) {
    const id = car.id.substring(3);
    if (!this.carsList[id]) {
      const symbol = this._symbols[Math.floor(Math.random() * this._symbols.length)];
      this.carsList[id] = {
        coordinates: null,
        direction: null,
        url: symbol.url
      };
      this.showHideCar(this.carsList[id], "show");
    } else {
      if (!car) {
        return;
      }
      const p = car.coords;
      const r = car.direction;
      const map = this.map;
      const coord = map.pointAtResToCoordinate(
        new maptalks.Point(p.x / this.gridSize, p.y / this.gridSize),
        map.getGLRes()
      );
      const direction = r / Math.PI * 180 + 90;
      this.carsList[id].coordinates = coord;
      this.carsList[id].rotation = [0, 0, direction];
      const index = this._getInstanceIndex(id);
      const url = this.carsList[id].url;
      if (index > -1) {
        this._instanceMap[url].updateData(index, this.carsList[id]);
      } else {
        this._instanceMap[url].addData(this.carsList[id]);
      }
    }
  }
  /**
   * 显示隐藏车辆模型。
   *
   * @english
   * Show or hide car model.
   * @param car - car model
   * @param type - action type show or hide
   * @param id - car model id
   * @return void
   */
  showHideCar(car, type, id) {
    const targetStyles = {
      symbol: {
        transparent: 1
      }
    };
    const that = this;
    const player = maptalks.animation.Animation.animate(
      targetStyles,
      {
        duration: 1e3,
        easing: "out"
      },
      function step(frame) {
        if (frame.state.playState === "running") {
          let opacity = 0;
          if (type === "show") {
            opacity = frame.styles.symbol.transparent;
            car.color = [1, 1, 1, opacity];
          } else if (type === "hide") {
            opacity = 1 - frame.styles.symbol.transparent;
            car.color = [1, 1, 1, opacity];
            if (opacity < 0.01) {
              setTimeout(function() {
                const index = that._getInstanceIndex(id);
                if (!that.carsList[id]) {
                  return;
                }
                const url = that.carsList[id].url;
                if (index > -1) {
                  that._instanceMap[url].removeData(index);
                }
                delete that.carsList[id];
              }, 100);
            }
          }
        }
      }
    );
    player.play();
  }
  //@internal
  _getInstanceIndex(id) {
    const car = this.carsList[id];
    if (!car) {
      return -1;
    }
    const url = car.url;
    const datas = this._instanceMap[url].getAllData();
    const index = datas.indexOf(this.carsList[id]);
    return index;
  }
  //@internal
  _removeCar(id) {
    const ids = id.substring(3);
    if (this.carsList[ids] != null) {
      this.showHideCar(this.carsList[ids], "hide", ids);
    }
  }
  /**
   * 获取瞬时速度。
   *
   * @english
   * Get instant speed.
   * @return instant speed
   */
  get instantSpeed() {
    const speeds = Object.values(this.cars.all()).map((car) => {
      return car.speed;
    });
    if (speeds.length === 0) {
      return 0;
    }
    return speeds.reduce(function(a, b) {
      return a + b;
    }) / speeds.length;
  }
  get map() {
    const groupgllayer = this._groupgllayer;
    if (groupgllayer) {
      return groupgllayer.getMap();
    }
    return null;
  }
  /**
   * 图层添加到 GroupGlLayer。
   *
   * @english
   * Add the layer to groupGlLayer.
   * @param symbols - symbols of gltf markers
   * @return void
   */
  addTo(groupgllayer) {
    this._groupgllayer = groupgllayer;
    this._carlayer.addTo(groupgllayer);
  }
  /**
   * 整体设置图层上的数据信息。
   *
   * @english
   * Overall setting of data information on layers.
   * @return cars number
   */
  set(obj) {
    if (obj == null) {
      obj = {};
    }
    this.intersections = new Pool(Intersection, obj.intersections);
    this.roads = new Pool(Road, obj.roads);
    this.cars = new Pool(Car, obj.cars);
    return this.carsNumber = 0;
  }
  /**
   * 保存当前图层数据信息到localStorage。
   *
   * @english
   * Save this layer data info to localStorage.
   * @return data string
   */
  save() {
    const data = Object.assign({}, this);
    delete data.cars;
    return window.localStorage.world = JSON.stringify(data);
  }
  /**
   * 设置车辆模型数量。
   *
   * @english
   * Set the number of car models.
   * @param num - number of cars
   * @return void
   */
  setCarNumber(num) {
    this.carsNumber = num;
  }
  /**
   * 获取车辆模型数量。
   *
   * @english
   * Get the number of car models.
   * @return cars number
   */
  getCarNumber() {
    return this.carsNumber;
  }
  load() {
    let data, id, intersection, road;
    data = window.localStorage.world;
    data = data && JSON.parse(data);
    if (data == null) {
      return null;
    }
    this.clear();
    this.carsNumber = data.carsNumber || 0;
    const ref = data.intersections;
    for (id in ref) {
      intersection = ref[id];
      this.addIntersection(Intersection.copy(intersection));
    }
    const ref1 = data.roads;
    const results = [];
    for (id in ref1) {
      road = ref1[id];
      road = new Road().copy(road);
      road.source = this.getIntersection(road.source);
      road.target = this.getIntersection(road.target);
      results.push(this.addRoad(road));
    }
    return results;
  }
  /**
   * 设置交叉路段。
   *
   * @english
   * Set a intersect segment.
   * @param segment - segment data
   * @param line - line data
   * @return intersect data info
   */
  intersectSegment(segment, line) {
    for (let i = 0; i < line.length - 1; i++) {
      const lineSegment = [line[i], line[i + 1]];
      const turfSegment = turf.lineString(lineSegment);
      const result = turf.lineIntersect(segment, turfSegment);
      if (!result.features.length) {
        continue;
      }
      return {
        intersectIndex: i,
        coord: result.features[0].geometry.coordinates
      };
    }
    return null;
  }
  intersection(segment, compareLineIndex, segmentIndex, lines, intersectPoints, lineLengthMap) {
    const turfSegment = turf.lineString(segment);
    for (let i = compareLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const result = this.intersectSegment(turfSegment, line);
      if (!result) {
        continue;
      }
      const inLines = {};
      inLines[compareLineIndex] = { pre: segmentIndex };
      inLines[i] = { pre: result.intersectIndex + lineLengthMap[i] };
      const point = {
        inLines,
        coordinate: this.map.coordinateToPointAtRes(
          { x: result.coord[0], y: result.coord[1] },
          this.map.getGLRes()
        )
      };
      intersectPoints.push(point);
    }
  }
  /**
   * 生成交通数据。
   *
   * @english
   * Generate traffic data.
   * @param lines - line data to generate traffic
   * @return void
   */
  generateTraffic(lines) {
    if (!this.map) {
      return;
    }
    const lineLengthMap = {};
    let lengthFlag = 0;
    for (let i = 0; i < lines.length; i++) {
      lineLengthMap[i] = lengthFlag;
      lengthFlag = lengthFlag + lines[i].length;
    }
    const intersectPoints = [];
    let intersectCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const compareLine = lines[i];
      for (let j = 0; j < compareLine.length - 1; j++) {
        const segment = [compareLine[j], compareLine[j + 1]];
        this.intersection(
          segment,
          i,
          intersectCount + j,
          lines,
          intersectPoints,
          lineLengthMap
        );
      }
      intersectCount = intersectCount + compareLine.length;
    }
    const Points = [];
    let count = 0;
    const map = this.map;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        const coordinate = map.coordinateToPointAtRes(
          { x: line[j][0], y: line[j][1] },
          map.getGLRes()
        );
        const inLines = {};
        if (j === 0) {
          inLines[i] = { pre: null };
        } else if (j === line.length - 1) {
          inLines[i] = { pre: j - 1 + count };
        } else {
          inLines[i] = { pre: j - 1 + count };
        }
        const point = {
          inLines,
          coordinate
        };
        Points.push(point);
      }
      count = count + line.length;
    }
    for (let i = 0; i < Points.length; i++) {
      const point = Points[i];
      this.comparePrePoint(point, i, intersectPoints);
    }
    const gridSize = this.gridSize;
    const step = gridSize;
    const intersections_Points = [];
    for (let i = 0; i < Points.length; i++) {
      const point = Points[i];
      const x = point.coordinate.x, y = point.coordinate.y;
      const rect = new Rect(x * step - 0.5, y * step - 0.5, 1, 1);
      const intersection = new Intersection(rect);
      intersection.connectRoads = point.roads;
      intersections_Points.push(intersection);
      this.addIntersection(intersection);
    }
    const intersections_intersectPoints = [];
    for (let i = 0; i < intersectPoints.length; i++) {
      const point = intersectPoints[i];
      const x = point.coordinate.x, y = point.coordinate.y;
      const rect = new Rect(x * step - 0.5, y * step - 0.5, 1, 1);
      const intersection = new Intersection(rect);
      intersection.connectRoads = point.roads;
      intersections_intersectPoints.push(intersection);
      this.addIntersection(intersection);
    }
    for (let i = 0; i < intersections_Points.length; i++) {
      const intersection = intersections_Points[i];
      const roads = intersection.connectRoads;
      if (!roads) {
        continue;
      }
      for (let r = 0; r < roads.length; r++) {
        const road = roads[r];
        if (road.pre != null) {
          let preRoad = null;
          const type = road.type;
          if (type === "line") {
            preRoad = intersections_Points[road.pre];
          } else if (type === "line-interact") {
            preRoad = intersections_intersectPoints[road.pre];
          }
          this.addRoad(new Road(intersection, preRoad));
          this.addRoad(new Road(preRoad, intersection));
        }
      }
    }
    for (let i = 0; i < intersections_intersectPoints.length; i++) {
      const intersection = intersections_intersectPoints[i];
      const roads = intersection.connectRoads;
      if (!roads) {
        continue;
      }
      for (let r = 0; r < roads.length; r++) {
        const road = roads[r];
        if (road.pre != null) {
          let preRoad = null;
          const type = road.type;
          if (type === "line") {
            preRoad = intersections_Points[road.pre];
          } else if (type === "line-interact") {
            preRoad = intersections_intersectPoints[road.pre];
          }
          this.addRoad(new Road(intersection, preRoad));
          this.addRoad(new Road(preRoad, intersection));
        }
      }
    }
  }
  /**
   * 比较当前点数据和前一个点数据。
   *
   * @english
   * Compare current point and pre point.
   * @param point - point data
   * @param index - data index
   * @param intersectPoints - intersect points data
   * @return void
   */
  comparePrePoint(point, index, intersectPoints) {
    const preInfo = this.getPre(point);
    if (preInfo) {
      const { pre, lineIndex } = preInfo;
      for (let i = 0; i < intersectPoints.length; i++) {
        const intersectPoint = intersectPoints[i];
        if (intersectPoint.inLines[lineIndex] && intersectPoint.inLines[lineIndex].pre === pre) {
          point.roads = [{ pre: i, type: "line-interact" }];
          if (!intersectPoint.roads) {
            intersectPoint.roads = [{ pre: index - 1, type: "line" }];
          } else {
            intersectPoint.roads.push({ pre: index - 1, type: "line" });
          }
        }
      }
      if (!point.roads) {
        point.roads = [{ pre: index - 1, type: "line" }];
      }
    }
  }
  /**
   * 获取前一个数据。
   *
   * @english
   * Get pre data.
   * @param point - point data
   * @return pre data
   */
  getPre(point) {
    for (const lineIndex in point.inLines) {
      if (point.inLines[lineIndex].pre !== null) {
        return { pre: point.inLines[lineIndex].pre, lineIndex };
      }
    }
    return null;
  }
  /**
   * 刷新车辆。
   *
   * @english
   * Refresh cars added in layer.
   * @return car
   */
  clear() {
    return this.set({});
  }
  onTick(delta) {
    let car, id, intersection;
    if (delta > 1) throw Error("delta > 1");
    this.refreshCars();
    const ref = this.intersections.all();
    for (id in ref) {
      intersection = ref[id];
      intersection.controlSignals.onTick(delta);
    }
    const ref1 = this.cars.all();
    const results = [];
    for (id in ref1) {
      car = ref1[id];
      car.move(delta);
      if (!car.alive) results.push(this.removeCar(car));
      else results.push(void 0);
    }
    return results;
  }
  /**
   * 刷新车辆。
   *
   * @english
   * Refresh cars added in layer.
   * @return car
   */
  refreshCars() {
    if (this.cars.length < this.carsNumber) {
      this.addRandomCar();
    }
    if (this.cars.length > this.carsNumber) {
      return this.removeRandomCar();
    }
    return null;
  }
  /**
   * 添加道路。
   *
   * @english
   * Add a road.
   * @param road - road data
   * @return road
   */
  addRoad(road) {
    this.roads.put(road);
    road.source.roads.push(road);
    road.target.inRoads.push(road);
    return road.update();
  }
  /**
   * 根据id获取道路数据。
   *
   * @english
   * Get a road info by id.
   * @param id - road id
   * @return road
   */
  getRoad(id) {
    return this.roads.get(id);
  }
  /**
   * 添加车辆模型。
   *
   * @english
   * Add a car model.
   * @param car - car model
   * @return car
   */
  addCar(car) {
    return this.cars.put(car);
  }
  /**
   * 根据id获取车辆信息。
   *
   * @english
   * Get a car info by id.
   * @param id - model id
   * @return car
   */
  getCar(id) {
    return this.cars.get(id);
  }
  /**
   * 移除车辆模型。
   *
   * @english
   * Remove a car.
   * @param car - car model
   * @return car
   */
  removeCar(car) {
    this.toRemove.push(car.id);
    return this.cars.pop(car);
  }
  /**
   * 清空临时移除项目。
   *
   * @english
   * Empty temporary removal items.
   * @return void
   */
  clearTmpRemove() {
    this.toRemove = [];
  }
  /**
   * 添加交叉路口。
   *
   * @english
   * Add a intersection.
   * @param intersection - intersection data
   * @return intersection
   */
  addIntersection(intersection) {
    return this.intersections.put(intersection);
  }
  /**
   * 根据id获取交叉路口信息。
   *
   * @english
   * Get a intersection info by id.
   * @param id - intersection id
   * @return intersection
   */
  getIntersection(id) {
    return this.intersections.get(id);
  }
  /**
   * 添加一个随机车辆模型。
   *
   * @english
   * Add a random car model.
   * @return car
   */
  addRandomCar() {
    let lane;
    const road = sample(this.roads.all());
    if (road != null) {
      lane = sample(road.lanes);
      if (lane != null) {
        return this.addCar(new Car(lane));
      }
    }
    return null;
  }
  /**
   * 移除一个随机车辆模型。
   *
   * @english
   * Remove a random car model.
   * @return car
   */
  removeRandomCar() {
    const car = sample(this.cars.all());
    if (car != null) {
      return this.removeCar(car);
    }
    return null;
  }
};

// src/index.ts
// 显式注册到 window.maptalks（ESM 导入不会自动设置 window.maptalks，msd Map.fromJSON
// 重建含 TrafficScene 的层时需要从 window.maptalks 解析该类）
if (typeof window !== "undefined") {
  window.maptalks = window.maptalks || {};
  window.maptalks.TrafficScene = TrafficScene;
}
export {
  TrafficScene
};
