"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCitizen = exports.authorizeOfficial = void 0;
const authorizeOfficial = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "OFFICIAL") {
        return res.status(403).json({ message: "Access denied. Officials only." });
    }
    next();
};
exports.authorizeOfficial = authorizeOfficial;
const authorizeCitizen = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "CITIZEN") {
        return res.status(403).json({ message: "Access denied. Citizens only." });
    }
    next();
};
exports.authorizeCitizen = authorizeCitizen;
