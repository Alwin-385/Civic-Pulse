"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaintController_1 = require("../controllers/complaintController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const feedbackController_1 = require("../controllers/feedbackController");
const router = (0, express_1.Router)();
router.post("/", authMiddleware_1.authenticate, roleMiddleware_1.authorizeCitizen, complaintController_1.createComplaint);
// Citizen-scoped routes
router.get("/mine", authMiddleware_1.authenticate, roleMiddleware_1.authorizeCitizen, complaintController_1.getMyComplaints);
router.get("/mine/:id", authMiddleware_1.authenticate, roleMiddleware_1.authorizeCitizen, complaintController_1.getMyComplaintById);
// Official-scoped routes
router.get("/", authMiddleware_1.authenticate, roleMiddleware_1.authorizeOfficial, complaintController_1.getAllComplaints);
router.get("/:id", authMiddleware_1.authenticate, roleMiddleware_1.authorizeOfficial, complaintController_1.getComplaintById);
router.patch("/:id/status", authMiddleware_1.authenticate, roleMiddleware_1.authorizeOfficial, complaintController_1.updateComplaintStatus);
// Citizen feedback after resolution
router.post("/:id/feedback", authMiddleware_1.authenticate, roleMiddleware_1.authorizeCitizen, feedbackController_1.createOrUpdateFeedback);
exports.default = router;
