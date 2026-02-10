const express = require("express");
const prisma = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const reorders = await prisma.reorder.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(reorders);
});

module.exports = router;
