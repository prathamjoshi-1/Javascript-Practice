/* Metro Ticket System - Console Version
   Features:
   - Station & Line registry
   - Shortest path journey planning (BFS on unweighted graph)
   - Fare calculation with slabs, peak/off-peak, concessions, and passes
   - Ticket & Pass issuance with IDs and validation
   - Simple in-memory "wallet" payments
   - Minimal CLI-like helpers (call functions at bottom to test)
*/

// 001: Utilities --------------------------------------------------------------
const nowISO = () => new Date().toISOString();
const uid = (prefix="ID") => prefix + "-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);

// 002: Data Models ------------------------------------------------------------
class Station {
  constructor(name) {
    this.name = name;
    this.links = new Set(); // Adjacent stations (undirected graph)
  }
  connect(station) {
    if (station && station !== this) {
      this.links.add(station.name);
      station.links.add(this.name);
    }
  }
}

class Network {
  constructor() {
    this.stations = new Map();
  }
  addStation(name) {
    if (!this.stations.has(name)) this.stations.set(name, new Station(name));
    return this.stations.get(name);
  }
  connect(a, b) {
    const A = this.addStation(a);
    const B = this.addStation(b);
    A.connect(B);
  }
  hasStation(name) {
    return this.stations.has(name);
  }
  neighbors(name) {
    const s = this.stations.get(name);
    return s ? Array.from(s.links) : [];
  }
  allStations() {
    return Array.from(this.stations.keys()).sort();
  }
}

// 003: Journey Planner (BFS) --------------------------------------------------
class JourneyPlanner {
  constructor(network) {
    this.network = network;
  }
  shortestPath(src, dst) {
    if (!this.network.hasStation(src) || !this.network.hasStation(dst)) {
      return { path: [], hops: 0 };
    }
    if (src === dst) return { path: [src], hops: 0 };
    const q = [src];
    const visited = new Set([src]);
    const prev = new Map();

    while (q.length) {
      const cur = q.shift();
      if (cur === dst) break;
      for (const nb of this.network.neighbors(cur)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          prev.set(nb, cur);
          q.push(nb);
        }
      }
    }
    if (!visited.has(dst)) return { path: [], hops: 0 };
    const path = [];
    for (let at = dst; at != null; at = prev.get(at)) path.push(at);
    path.reverse();
    return { path, hops: path.length ? path.length - 1 : 0 };
  }
}

// 004: Fare Rules -------------------------------------------------------------
const FareRules = {
  base: 10,                // Base fare
  perHop: 5,               // Per hop fare
  peakMultiplier: 1.25,    // Peak hour multiplier
  offPeakMultiplier: 1.0,  // Off-peak multiplier
  studentDiscount: 0.5,    // 50% off for students
  seniorDiscount: 0.6,     // 40% off for seniors (i.e., pay 60%)
  dailyCap: 120,           // Max a rider pays per day
  pass: {
    // Unlimited rides between any stations for a period
    weekly: { price: 499, durationDays: 7 },
    monthly: { price: 1599, durationDays: 30 }
  },
  peakHours: [
    { start: "07:30", end: "10:30" },
    { start: "17:30", end: "20:00" }
  ]
};

function isPeak(date = new Date()) {
  const time = date.toTimeString().slice(0,5);
  const toMin = t => {
    const [h,m] = t.split(":").map(Number);
    return h*60 + m;
  };
  const cur = toMin(time);
  return FareRules.peakHours.some(({start,end}) => cur >= toMin(start) && cur <= toMin(end));
}

class FareCalculator {
  constructor(rules = FareRules) {
    this.rules = rules;
  }
  computeFare(hops, opts = {}) {
    const { when = new Date(), riderType = "adult" } = opts;
    const mult = isPeak(when) ? this.rules.peakMultiplier : this.rules.offPeakMultiplier;
    let fare = (this.rules.base + this.rules.perHop * Math.max(0, hops - 1)) * mult;
    if (riderType === "student") fare *= this.rules.studentDiscount;
    if (riderType === "senior")  fare *= this.rules.seniorDiscount;
    return Math.ceil(fare);
  }
}

// 005: Wallet & Payments ------------------------------------------------------
class Wallet {
  constructor(owner) {
    this.owner = owner;
    this.balance = 0;
    this.history = [];
  }
  deposit(amount, note="Deposit") {
    if (amount <= 0) throw new Error("Deposit must be positive");
    this.balance += amount;
    this.history.push({ id: uid("TXN"), type: "credit", amount, note, at: nowISO() });
    return this.balance;
  }
  charge(amount, note="Charge") {
    if (amount < 0) throw new Error("Amount must be non-negative");
    if (this.balance < amount) throw new Error("Insufficient balance");
    this.balance -= amount;
    this.history.push({ id: uid("TXN"), type: "debit", amount, note, at: nowISO() });
    return this.balance;
  }
  statement(limit=10) {
    return this.history.slice(-limit);
  }
}

// 006: Tickets & Passes -------------------------------------------------------
class Ticket {
  constructor({ src, dst, hops, fare, riderType }) {
    this.id = uid("TKT");
    this.src = src;
    this.dst = dst;
    this.hops = hops;
    this.fare = fare;
    this.riderType = riderType || "adult";
    this.issuedAt = new Date();
    this.valid = true;
    this.usedAt = null;
  }
  use() {
    if (!this.valid) throw new Error("Ticket already used or invalid");
    this.valid = false;
    this.usedAt = new Date();
  }
  toString() {
    return `[Ticket ${this.id}] ${this.src} -> ${this.dst} | hops: ${this.hops} | fare: ₹${this.fare} | ${this.riderType}`;
  }
}

class Pass {
  constructor({ type, price, durationDays, riderType }) {
    this.id = uid("PASS");
    this.type = type;
    this.price = price;
    this.riderType = riderType || "adult";
    this.issuedAt = new Date();
    this.expiresAt = new Date(Date.now() + durationDays*24*3600*1000);
    this.active = true;
  }
  isActive(at = new Date()) {
    return this.active && at <= this.expiresAt;
  }
  revoke() {
    this.active = false;
  }
  toString() {
    return `[Pass ${this.id}] ${this.type} | ₹${this.price} | rider: ${this.riderType} | expires: ${this.expiresAt.toDateString()}`;
  }
}

// 007: Rider ------------------------------------------------------------------
class Rider {
  constructor({ name, riderType = "adult" }) {
    this.id = uid("RIDER");
    this.name = name;
    this.riderType = riderType;
    this.wallet = new Wallet(this.name);
    this.tickets = [];
    this.passes = [];
    this.dailySpent = new Map(); // key: YYYY-MM-DD -> amount
  }
  _dateKey(d = new Date()) {
    return d.toISOString().slice(0,10);
  }
  getActivePass() {
    return this.passes.find(p => p.isActive());
  }
  addSpent(amount, at = new Date()) {
    const key = this._dateKey(at);
    const prev = this.dailySpent.get(key) || 0;
    this.dailySpent.set(key, prev + amount);
  }
  todaySpent() {
    return this.dailySpent.get(this._dateKey()) || 0;
  }
}

// 008: Issuer / System --------------------------------------------------------
class MetroSystem {
  constructor(network, fareCalc) {
    this.network = network;
    this.fares = fareCalc;
    this.issuedTickets = new Map(); // id -> Ticket
    this.issuedPasses  = new Map(); // id -> Pass
  }

  plan(src, dst) {
    const planner = new JourneyPlanner(this.network);
    const { path, hops } = planner.shortestPath(src, dst);
    if (!path.length) throw new Error("No route found");
    return { path, hops };
  }

  priceJourney(rider, src, dst, when = new Date()) {
    const { hops } = this.plan(src, dst);
    const activePass = rider.getActivePass();
    if (activePass) return { hops, fare: 0, pass: activePass };
    const fare = this.fares.computeFare(hops, { when, riderType: rider.riderType });
    // Daily cap logic
    const remainingCap = Math.max(0, FareRules.dailyCap - rider.todaySpent());
    const finalFare = Math.min(fare, remainingCap);
    return { hops, fare: finalFare };
  }

  buyTicket(rider, src, dst, when = new Date()) {
    const { hops, fare, pass } = this.priceJourney(rider, src, dst, when);
    if (pass) {
      const t = new Ticket({ src, dst, hops, fare: 0, riderType: rider.riderType });
      t.valid = true; // still needs validation at gate
      this.issuedTickets.set(t.id, t);
      rider.tickets.push(t);
      return t;
    }
    rider.wallet.charge(fare, `Ticket ${src}→${dst}`);
    rider.addSpent(fare, when);
    const ticket = new Ticket({ src, dst, hops, fare, riderType: rider.riderType });
    this.issuedTickets.set(ticket.id, ticket);
    rider.tickets.push(ticket);
    return ticket;
  }

  buyPass(rider, type = "weekly") {
    const cfg = FareRules.pass[type];
    if (!cfg) throw new Error("Unknown pass type");
    rider.wallet.charge(cfg.price, `${type} pass`);
    const p = new Pass({ type, price: cfg.price, durationDays: cfg.durationDays, riderType: rider.riderType });
    this.issuedPasses.set(p.id, p);
    rider.passes.push(p);
    return p;
  }

  validateTicket(ticketId) {
    const t = this.issuedTickets.get(ticketId);
    if (!t) throw new Error("Ticket not found");
    if (!t.valid) throw new Error("Ticket already used/invalid");
    t.use();
    return true;
  }

  validatePass(passId, at = new Date()) {
    const p = this.issuedPasses.get(passId);
    if (!p) throw new Error("Pass not found");
    if (!p.isActive(at)) throw new Error("Pass expired or inactive");
    return true;
  }
}

// 009: Demo Data --------------------------------------------------------------
function buildDemoNetwork() {
  const net = new Network();
  // Line Red
  net.connect("AeroCity", "Terminal-1");
  net.connect("Terminal-1", "CityCenter");
  net.connect("CityCenter", "Museum");
  net.connect("Museum", "OldTown");
  // Line Blue
  net.connect("CityCenter", "TechPark");
  net.connect("TechPark", "LakeView");
  net.connect("LakeView", "University");
  // Interchange
  net.connect("OldTown", "Riverside");
  net.connect("Riverside", "University");
  return net;
}

// 010: Pretty Printing --------------------------------------------------------
function printRoute(route) {
  return route.join("  →  ");
}

function printTicket(t) {
  return [
    "================= METRO TICKET =================",
    `Ticket ID : ${t.id}`,
    `Issued At : ${t.issuedAt.toLocaleString()}`,
    `Rider Type: ${t.riderType}`,
    `From      : ${t.src}`,
    `To        : ${t.dst}`,
    `Hops      : ${t.hops}`,
    `Fare      : ₹${t.fare}`,
    `Status    : ${t.valid ? "VALID" : "USED"}`,
    "================================================"
  ].join("\n");
}

function printPass(p) {
  return [
    "================== METRO PASS ===================",
    `Pass ID   : ${p.id}`,
    `Type      : ${p.type}`,
    `Price     : ₹${p.price}`,
    `Rider Type: ${p.riderType}`,
    `Issued At : ${p.issuedAt.toLocaleString()}`,
    `Expires   : ${p.expiresAt.toLocaleString()}`,
    `Active    : ${p.isActive() ? "YES" : "NO"}`,
    "================================================"
  ].join("\n");
}

// 011: Minimal CLI-ish Helpers -----------------------------------------------
const sleep = ms => new Promise(res => setTimeout(res, ms));
