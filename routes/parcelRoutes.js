const express = require('express');
const router = express.Router();
const {v4:uuidv4} = require('uuid');
const db = require('../config/database');

function generateUniqueTrackingID() {
    return uuidv4(); // Generates a Version 4 UUID as a unique tracking ID
  }

router.post('/submit', async (req, res) => {
    try {
        const {type, weight, length, breadth, pickupAddress, dropAddress, alternatePhone, pickupLat, pickupLng} = req.body;

        const trackingId = generateUniqueTrackingID();

        const sql = 'INSERT INTO parcels (type, weight, length, breadth, pickupAddress, dropAddress, alternatePhoneNumber, trackingID, status, pickupLat, pickupLNG) VALUES (?,?,?,?,?,?,?,?,?,?,?)';

        const values = [type, weight, length, breadth, pickupAddress, dropAddress, alternatePhone, trackingId, 'PENDING', pickupLat, pickupLng];

        db.query(sql, values, (err, result) => {
            if(err){
            console.error("errorrr", err);
            return res.status(500).json({error: "DB Error"});
            }
            res.status(201).json({message: "Parcel submitted successfully", trackingId});

        })
        
    }
    catch(error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

module.exports = router;