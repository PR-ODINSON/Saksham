import mongoose from 'mongoose';
import { WorkOrder, School, RepairLog } from '../models/index.js';
import { completeTask } from '../controllers/workorder.controller.js';

// Mock request and response
const mockRes = {
  status: function(code) { this.statusCode = code; return this; },
  json: function(data) { this.data = data; return this; }
};

async function testGpsValidation() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saksham');
  
  // 1. Setup a school with known location (Kutch: 23.8, 69.5)
  await School.deleteMany({ schoolId: 9999 });
  await School.create({
    schoolId: 9999,
    name: "Test School",
    district: "Kutch",
    location: { lat: 23.8, lng: 69.5 }
  });

  // 2. Setup a work order
  await WorkOrder.deleteMany({ schoolId: 9999 });
  const wo = await WorkOrder.create({
    schoolId: 9999,
    district: "Kutch",
    category: "plumbing",
    priorityScore: 50,
    status: "assigned",
    deadline: new Date(Date.now() + 86400000)
  });

  // 3. Test completion WITH MISMATCH (More than 5km away: let's try 24.0, 70.0)
  console.log("Testing mismatching coordinates...");
  const reqMismatch = {
    body: {
      workOrderId: wo._id,
      lat: 24.0,
      lng: 70.0,
      afterConditionScore: 1
    },
    user: { id: wo.assignment?.assignedTo, role: 'admin' } // bypass auth for test
  };
  
  await completeTask(reqMismatch, mockRes);
  console.log("Result locationMismatch:", mockRes.data.workOrder.locationMismatch);
  
  // 4. Check RepairLog
  const log = await RepairLog.findOne({ workOrderId: wo._id });
  console.log("RepairLog locationMismatch:", log?.locationMismatch);

  // 5. Test completion WITH MATCH (Close to school: 23.801, 69.501)
  console.log("\nTesting matching coordinates...");
  wo.status = "assigned"; // reset
  await wo.save();
  
  const reqMatch = {
    body: {
      workOrderId: wo._id,
      lat: 23.801,
      lng: 69.501,
      afterConditionScore: 1
    },
    user: { role: 'admin' }
  };
  
  await completeTask(reqMatch, mockRes);
  console.log("Result locationMismatch:", mockRes.data.workOrder.locationMismatch);

  await mongoose.disconnect();
}

// testGpsValidation();
