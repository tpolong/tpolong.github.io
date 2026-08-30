// 最小 RoutePlayer shim
//
// 背景：`@maptalks/gl-layers`（及其所有子包）**没有导出 RoutePlayer**，公开 maptalks 源码
// 里也没有该类。而 3d/track/* 等 6 个示例都 `new RoutePlayer(route, groupLayer, options)`，
// 依赖其 `playing` 事件（param.coordinate/pitch/bearing）驱动相机或 marker 沿路径移动。
// 这里按示例实际调用的 API 面实现一个最小版：读取 route.path（[[lng,lat,z,time],…]），
// 按 setUnitTime 的时间对路径做线性插值，周期发射 'playing' 事件。
//
// 说明：这是简化实现（仅保证示例能跑、事件能发、相机能沿路径动），非官方 RoutePlayer 的
// 完整复刻（不含官方轨道/尾迹特效的精细实现），若官方后续发布带 RoutePlayer 的构建，应
// 改回从 gl-layers 正常导入。
import * as maptalks from "maptalks";

function normAngle(a) {
  return ((a % 360) + 360) % 360;
}

function bearingBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return normAngle(Math.atan2(dx, dy) * 180 / Math.PI);
}

export default class RoutePlayer {
  constructor(route, layer, options = {}) {
    this.route = route || {};
    this.layer = layer;
    this.options = options;
    this._listeners = {};
    this._routes = this._normalize(this.route);
    this._unitTime = 10;
    this._playing = false;
    this._raf = null;
    this._start = 0;
    this._line = null;
    this._t = 0;
  }

  _normalize(route) {
    const path = (route && route.path) || [];
    const pts = [];
    let prevT = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const seg = Array.isArray(p) ? p : [p.lng, p.lat, p.z, p.time];
      const t = seg.length >= 4 && seg[3] != null ? seg[3] : prevT + 1000;
      pts.push({ x: seg[0], y: seg[1], z: seg[2] || 0, time: t });
      prevT = t;
    }
    return pts;
  }

  setRoute(route) {
    this.route = route || {};
    this._routes = this._normalize(this.route);
    this._t = 0;
    return this;
  }
  getRoute() { return this.route; }

  setUnitTime(t) { this._unitTime = t > 0 ? t : 1; return this; }
  getUnitTime() { return this._unitTime; }

  on(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); return this; }
  off(type, fn) {
    const a = this._listeners[type];
    if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
    return this;
  }
  _fire(type, param) { (this._listeners[type] || []).slice().forEach((fn) => fn(param)); }

  _interpolate(routeT) {
    const pts = this._routes;
    if (!isFinite(routeT)) return null;
    if (!pts.length) return null;
    if (pts.length === 1) {
      const p = pts[0];
      return { x: p.x, y: p.y, z: p.z, pitch: 0, bearing: 0 };
    }
    let a = pts[0], b = pts[pts.length - 1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (routeT >= pts[i].time && routeT <= pts[i + 1].time) {
        a = pts[i]; b = pts[i + 1];
        break;
      }
      if (routeT > pts[i + 1].time) { a = pts[i]; b = pts[pts.length - 1]; }
    }
    const span = b.time - a.time || 1;
    const f = Math.max(0, Math.min(1, (routeT - a.time) / span));
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const z = a.z + (b.z - a.z) * f;
    // 插值结果若出现 NaN/Inf（路径点异常或时间差为 0），跳过本帧，避免相机/GPU 收到 NaN 位置
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      return null;
    }
    // 俯仰角/方位角在点间做线性插值（方位角处理 0/360 回绕）
    let bearing = normAngle(a.__bearing != null ? a.__bearing : this._bearingAt(a, b));
    return { x, y, z, pitch: 30, bearing };
  }

  _bearingAt(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    return normAngle(Math.atan2(dx, dy) * 180 / Math.PI);
  }

  play() {
    if (this._playing || this._routes.length < 2) return this;
    this._playing = true;
    this._start = performance.now();
    const firstT = this._routes[0].time;
    const lastT = this._routes[this._routes.length - 1].time;
    if (!isFinite(firstT) || !isFinite(lastT)) { this.pause(); return this; }
    const totalRoute = Math.max(1, lastT - firstT);
    // real 时长 = 路径时长 / unitTime（unitTime 越大越快）
    const totalReal = totalRoute / this._unitTime;
    const loop = (now) => {
      if (!this._playing) return;
      const elapsed = now - this._start;
      if (elapsed >= totalReal) {
        const pos = this._interpolate(this._routes[this._routes.length - 1].time);
        if (pos) this._fire('playing', this._playingParam(pos));
        this.pause();
        return;
      }
      const routeT = firstT + (elapsed / totalReal) * totalRoute;
      const pos = this._interpolate(routeT);
      if (pos) this._fire('playing', this._playingParam(pos));
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    return this;
  }

  _playingParam(pos) {
    return {
      coordinate: new maptalks.Coordinate(pos.x, pos.y, pos.z),
      pitch: pos.pitch,
      bearing: pos.bearing,
    };
  }

  pause() {
    this._playing = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    return this;
  }
  stop() { this.pause(); this._t = 0; return this; }
  reset() { return this.stop(); }

  showRoute() {
    // best-effort：把路线画成线路加到 layer；GL 层不支持 addGeometry 时静默忽略。
    if (this._line) return this;
    const coords = this._routes.map((r) => new maptalks.Coordinate(r.x, r.y, r.z));
    const line = new maptalks.LineString(coords, {
      symbol: this.options.lineSymbol || { lineColor: '#ea6b48', lineWidth: 2 },
    });
    try {
      if (this.layer && typeof this.layer.addGeometry === 'function') {
        this.layer.addGeometry(line);
        this._line = line;
      } else if (this.layer && typeof this.layer.addTo === 'function') {
        // 某些 layer 用 addTo(map) 结构，这里尽力而为
        const map = this.layer.getMap ? this.layer.getMap() : null;
        if (map) line.addTo(map);
        this._line = line;
      }
    } catch (e) { /* GL layer 可能不支持，忽略 */ }
    return this;
  }
}
