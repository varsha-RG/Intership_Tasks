const Employee = require("../models/Employee");

// Add employee
exports.addEmployee = async (req, res) => {
  try {
    const { name, role, email, phone, department } = req.body;

    // Defensive Check 👀
    if (!name || !role || !email || !phone || !department) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const newEmp = new Employee({ name, role, email, phone, department });
    await newEmp.save();

    res.json({ msg: "Employee added", newEmp });
  } catch (err) {
    console.error("❌ Error adding employee:", err);
    res.status(500).json({ msg: "Server error while adding employee" });
  }
};


// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    res.status(500).json({ msg: "Server error while fetching employees" });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Employee.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ msg: "Employee updated", updated });
  } catch (err) {
    console.error("❌ Error updating employee:", err);
    res.status(500).json({ msg: "Server error while updating employee" });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await Employee.findByIdAndDelete(id);
    res.json({ msg: "Employee deleted" });
  } catch (err) {
    console.error("❌ Error deleting employee:", err);
    res.status(500).json({ msg: "Server error while deleting employee" });
  }
};
