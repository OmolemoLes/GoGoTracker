const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
    userId: String,
    tripstart: String,
    tripend: String,
    distance: Number,
    co2: Number,
    vehicleType: String,
    date: String
});

module.exports = mongoose.model("Trip", TripSchema);