const Return = require("../models/Return");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { notifyAllAdmins } = require("../utils/adminNotifier");

// @desc    Create return request
// @route   POST /api/returns
// @access  Private
exports.createReturn = async (req, res) => {
  try {
    const {
      orderId,
      items,
      returnReason,
      additionalComments,
      refundMethod,
      bankDetails,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.orderStatus !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Can only return delivered orders" });
    }

    const existingReturn = await Return.findOne({ order: orderId });
    if (existingReturn) {
      return res
        .status(400)
        .json({ message: "Return request already exists for this order" });
    }

    const refundAmount = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    const returnRequest = await Return.create({
      order: orderId,
      user: req.user.id,
      items,
      returnReason,
      additionalComments,
      refundAmount,
      refundMethod,
      bankDetails: refundMethod === "Bank Transfer" ? bankDetails : undefined,
      pickupAddress: order.shippingAddress,
      timeline: [
        {
          status: "Pending",
          description: "Return request submitted",
        },
      ],
    });

    order.orderStatus = "Returned";
    await order.save();

    await Notification.create({
      user: req.user.id,
      type: "return",
      title: "Return Request Submitted",
      message: `Your return request #${returnRequest.returnId} for order #${order.orderId} has been submitted. Refund amount: Rs.${refundAmount}. We will review it within 24-48 hours.`,
      orderId: order._id,
    });

    const userDoc = await User.findById(req.user.id).select("name email");

    await notifyAllAdmins({
      type: "return",
      title: "New Return Request",
      message: `Return #${returnRequest.returnId} for order #${order.orderId} from ${userDoc?.name || "Customer"}. Reason: ${returnReason}. Refund: Rs.${refundAmount}`,
      orderId: order._id,
      link: "/admin/returns",
    });

    res.status(201).json({
      success: true,
      message: "Return request created successfully",
      data: returnRequest,
    });
  } catch (error) {
    console.error("Create return error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate return request detected",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get user's returns
// @route   GET /api/returns/my-returns
// @access  Private
exports.getMyReturns = async (req, res) => {
  try {
    const returns = await Return.find({ user: req.user.id })
      .populate("order")
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    console.error("Get my returns error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get return by ID
// @route   GET /api/returns/:id
// @access  Private
exports.getReturnById = async (req, res) => {
  try {
    const returnRequest = await Return.findById(req.params.id)
      .populate("order")
      .populate("user", "name email");

    if (!returnRequest) {
      return res.status(404).json({ message: "Return not found" });
    }

    if (
      returnRequest.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(returnRequest);
  } catch (error) {
    console.error("Get return error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all returns (Admin)
// @route   GET /api/returns/admin/all
// @access  Private/Admin
exports.getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("order")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    console.error("Get all returns error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update return status (Admin)
// @route   PUT /api/returns/:id/status
// @access  Private/Admin
exports.updateReturnStatus = async (req, res) => {
  try {
    const { returnStatus, adminNotes, rejectionReason } = req.body;

    const returnRequest = await Return.findById(req.params.id).populate(
      "order",
      "orderId",
    );
    if (!returnRequest) {
      return res.status(404).json({ message: "Return not found" });
    }

    const previousStatus = returnRequest.returnStatus;
    returnRequest.returnStatus = returnStatus;
    if (adminNotes) returnRequest.adminNotes = adminNotes;
    if (rejectionReason) returnRequest.rejectionReason = rejectionReason;

    if (returnStatus === "Refund Completed") {
      const order = await Order.findById(returnRequest.order);
      if (order) {
        order.paymentStatus = "Refunded";
        await order.save();
      }
    }

    await returnRequest.save();

    if (previousStatus !== returnStatus) {
      const statusMessages = {
        Approved: `Your return request has been approved. Amount Rs.${returnRequest.refundAmount} will be refunded soon.`,
        Rejected: `Your return request has been rejected. ${rejectionReason ? "Reason: " + rejectionReason : ""}`,
        "Pickup Scheduled":
          "Your return pickup has been scheduled. Please keep the item ready.",
        "Item Received":
          "We have received your returned item. Refund will be processed shortly.",
        "Refund Processing": "Your refund is being processed.",
        "Refund Completed": `Your refund of Rs.${returnRequest.refundAmount} has been completed successfully.`,
      };

      const message =
        statusMessages[returnStatus] ||
        `Return status updated to ${returnStatus}`;

      try {
        await Notification.create({
          user: returnRequest.user,
          type: "return",
          title: `Return ${returnStatus}`,
          message: `Return #${returnRequest.returnId}: ${message}`,
          orderId: returnRequest.order?._id || returnRequest.order,
        });
      } catch (notifErr) {
        console.error("Return notification error:", notifErr.message);
      }
    }

    res.json({
      success: true,
      message: "Return status updated successfully",
      data: returnRequest,
    });
  } catch (error) {
    console.error("Update return status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Cancel return request
// @route   DELETE /api/returns/:id
// @access  Private
exports.cancelReturn = async (req, res) => {
  try {
    const returnRequest = await Return.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({ message: "Return not found" });
    }

    if (returnRequest.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (returnRequest.returnStatus !== "Pending") {
      return res
        .status(400)
        .json({ message: "Can only cancel pending returns" });
    }

    const orderRef = returnRequest.order;
    const returnIdRef = returnRequest.returnId;

    await returnRequest.deleteOne();

    const order = await Order.findById(orderRef);
    if (order) {
      order.orderStatus = "Delivered";
      await order.save();

      await notifyAllAdmins({
        type: "return",
        title: "Return Request Cancelled",
        message: `Return #${returnIdRef} for order #${order.orderId} has been cancelled by the customer.`,
        orderId: order._id,
        link: "/admin/returns",
      });
    }

    res.json({
      success: true,
      message: "Return request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel return error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
