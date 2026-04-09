if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
}

import express, { json, static as expressStatic } from "express";
import { connect } from "mongoose";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import cors from "cors";
require("dotenv").config();

const app = express();

app.use(json());
app.use(cors());
app.use(expressStatic("public"));

// MongoDB connection
connect("mongodb://127.0.0.1:27017/triptracker");

// User Schema
import User, { findOne } from "./models/User";

// REGISTER
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await findOne({ email });
    if (existingUser) return res.status(400).send("User already exists");

    const hashedPassword = await hash(password, 10);

    const user = new User({
        email,
        password: hashedPassword
    });

    await user.save();
    res.send("User registered successfully");
});

// LOGIN
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const isMatch = await compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");

    const token = sign({ id: user._id }, "secretkey", {
        expiresIn: "1h"
    });

    res.json({ token });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

function auth(req, res, next) {
    const token = req.headers.authorization;

    if (!token) return res.status(401).send("Access denied");

    try {
        const verified = jwt.verify(token, "secretkey");
        req.user = verified;
        next();
    } catch {
        res.status(400).send("Invalid token");
    }
}

const Trip = require("./models/Trip");

// Save trip
app.post("/addTrip", auth, async (req, res) => {
    const trip = new Trip({
        userId: req.user.id,
        ...req.body
    });

    await trip.save();
    res.send("Trip saved");
});