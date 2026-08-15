const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { importProduct } = require("../services/productImporter");

const router = express.Router();

router.post("/preview", auth, admin, async (req, res) => {
  try {
    const result = await importProduct(req.body?.url);
    res.status(result.success ? 200 : 422).json(result);
  } catch (error) {
    const reason = error.reason || (error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR");
    const message = reason === "INVALID_URL" ? error.message : reason === "BLOCKED" ? error.message : "Automatic extraction was not available for this page. Please enter the missing information manually.";
    console.error("[product-import]", { reason, detail: error.message });
    res.status(reason === "INVALID_URL" ? 400 : 422).json({ success: false, reason, platform: "generic", message });
  }
});

module.exports = router;
