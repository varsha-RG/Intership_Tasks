const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  addEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

router.post("/", auth, addEmployee);
router.get("/", auth, getAllEmployees);
router.put("/:id", auth, updateEmployee);
router.delete("/:id", auth, deleteEmployee);

module.exports = router;
