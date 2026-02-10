require("dotenv").config();
const express = require("express");
const cors = require("cors");

const inventoryRoutes = require("./routes/inventory.routes");
const reorderRoutes = require("./routes/reorder.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/inventory", inventoryRoutes);
app.use("/api/reorders", reorderRoutes);

app.listen(5000, () =>
  console.log("🚀 Backend running on port 5000")
);
