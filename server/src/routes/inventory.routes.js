const express = require("express");
const prisma = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const inventory = await prisma.inventory.findMany({
    include: {
      store: true,
      product: true,
    },
  });
  res.json(inventory);
});

router.get("/:id", async (req, res) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      store: true,
      product: true,
    },
  });
  res.json(inventory);
});

module.exports = router;
