const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const twilio = require('twilio');
const config = require('./config/twilioConfig');
const db = require('./config/database');
const router = express('router');

const accountSid = config.twilioAccountSid;
const accounttoken = config.twilioAuthToken;
const phoneNumber = config.phoneNumber;

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const twilioClient = new twilio(accountSid, accounttoken);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('<h1>This is the backend</h1>');
  });

// Parcel routes
const parcelRoutes = require('./routes/parcelRoutes');
app.use('/parcels', parcelRoutes);

//Admin routes (for approval/rejection)
const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.post('/customer/register', (req,res) => {
    const {name, email, phone, country, state, city, zip_code} = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000);

    console.log("otp", otp)

    twilioClient.messages.create({
        body: `Your otp for registration is: ${otp}`,
        to: phone,
        from: phoneNumber,
    })
    .then(() => {
        // Save the OTP in the database for later verification
      // Insert customer data and OTP into the 'customers' table

      db.query(
        'INSERT INTO customers (name, email, phone_number, country, state, city, zip_code, otp) VALUES (?,?,?,?,?,?,?,?)',
        [name, email, phone, country, state, city, zip_code, otp],
        (err, result) => {
            if(err){
                console.log("error", err);
                return res.status(500).json({error: 'Registration failed'});
            }
            res.status(200).json({message: 'Registration successful', otp});
        }
      );
    })
    .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Failed to send OTP' });
    })
})

app.post('/customer/verify-otp', (req,res) => {
    const {phone, otp} = req.body;
    db.query('SELECT otp FROM customers WHERE phone_number=?', 
    [phone],
    (err, result) => {
        if(err){
            return res.status(500).json({error: "DB Error"});
        }
        if(result.length===0){
            return res.status(404).json({error: "User not found"});
        }

        const savedOtp = result[0].otp;
        console.log("result", result);
        console.log(typeof otp, typeof savedOtp);

        if(otp==savedOtp){
            db.query('UPDATE customers SET verified = true WHERE phone_number=?',
            [phone],
            (updateErr, updateRes) => {
                    if(updateErr){
                        console.log("updateErr", updateErr);
                    return res.status(500).json({ error: 'Failed to update user verification' });
                }
                res.status(200).json({message: "OTP Verification successful"});
            })
        }
        else{
            res.status(400).json({error: "Invalid OTP"});
        }
    }
    );
});

app.post('/customer/login', (req, res) => {
    const {phone} = req.body;

    db.query(
        'SELECT verified FROM customers WHERE phone_number=?', [phone],
        (err, result) => {
            if(err){
                return res.status(500).json({error: "DB Error"});
            }
            if(result.length==0){
                return res.status(404).json({error: "User not found"});
            }
            
        }
    )

    const otp = Math.floor(100000 + Math.random() * 900000);

    twilioClient.messages.create({
        body: `Your OTP for login is: ${otp}`,
      to: phone,
      from: config.phoneNumber,
    })
    .then(() => {
        db.query(
            'UPDATE customers SET otp=? WHERE phone_number=?', [otp, phone],
            (updatedErr) => {
                if(updatedErr){
                    return res.status(500).json({error: 'DB Error'});
                }
                res.status(200).json({message: 'OTP sent for login'});
            }
        )
    })
})
module.exports = router;