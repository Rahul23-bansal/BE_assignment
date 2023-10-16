const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Admin route to list pending parcels
router.get('/pending-parcels', async (req, res) => {
    try {
    const sql = 'SELECT * FROM parcels WHERE status = ?';
    const values = ['Pending'];

    db.query(sql, values, (err, results) => {
        if(err) {
            return res.status(500).json({error: "DB Error"});
        }
        console.log("result", results);
        res.status(200).json(results);
    })
}
catch(error){
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
}
})

router.post('/approve-reject-parcel/:parcelId', async (req, res) => {
    try{
    const {action} = req.body;
    const {parcelId} = req.params;
    console.log("parcelid: ", parcelId);

    const sql = 'UPDATE parcels SET status=? WHERE id=?';
    const values = [action=='approve'? 'Approved': 'Rejected', parcelId ];

    db.query(sql, values, (err, results) => {
        if(err){
            console.error(err);
            return res.status(500).json({error: 'DB Error'});
        }
        res.status(200).json({message: `Parcel ${action}ed successfully`});
    });
    }
    catch(error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
        }
})

// Function to calculate proximity using the Haversine formula
// function calculateProximity(driverLat, pickupLat, driverLng, pickupLng) {
//     const earthRadius = 6371; // Radius of the Earth in kilometers

  // Convert latitude and longitude from degrees to radians
//   const lat1 = (Math.PI / 180) * driverLat;
//   const lon1 = (Math.PI / 180) * driverLng;
//   const lat2 = (Math.PI / 180) * pickupLat;
//   const lon2 = (Math.PI / 180) * pickupLng;

  // Haversine formula
//   const dlat = lat2 - lat1;
//   const dlon = lon2 - lon1;
//   const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const distance = earthRadius * c; // The distance in kilometers

//   return distance;
//}

router.post('/assign-driver/:parcelId', async (req, res) => {
    try{
        const {parcelId} = req.params;

        const sql = 'SELECT * FROM parcels WHERE id=?';
        const value = [parcelId];

        //find parcel by id
        const [parcel] = await db.promise().query(sql, value);
        
        console.log("parcell", parcel);
        if(parcel.length==0){
            return res.status(404).json({error:'Parcel not found'});
        }

        if(parcel[0].status!== 'Approved'){
            return res.status(400).json({error:'Parcel should be approved by the admin'});
        }
        
        const [drivers] = await db.promise().query(` SELECT
        driver.id AS driver_id,
        ST_Distance(
          POINT(driver.longitude, driver.latitude), -- Driver's coordinates
          POINT(?, ?) -- Parcel's pickup coordinates
        ) AS distance_in_meters
      FROM
        drivers AS driver
      WHERE
        driver.available = 1
      ORDER BY
        distance_in_meters`, [parcel[0].pickupLNG, parcel[0].pickupLat])

        console.log("driverss", drivers);

        if(drivers.length==0){
            return res.status(400).json({error:'No available drivers'});
        }

        const nearestDriver = drivers[0];
            // Update the parcel in the database to assign the nearest driver
            await db.promise().query('UPDATE parcels SET driver_id=? WHERE id=?', [nearestDriver.driver_id, parcelId]);
            res.status(200).json({message: "Parcel assigned to the nearest driver"});
    }

    catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
});

module.exports = router;