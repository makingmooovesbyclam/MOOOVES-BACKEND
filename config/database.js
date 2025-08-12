// Import Mongoose
const mongoose = require('mongoose');
require('dotenv').config();
const DB = process.env.DATABASE_URL

mongoose.connect(DB)
.then(()=>{
console.log('Databse connected Succeffully')
})
.catch((error)=>{
    console.log('Error connecting toDatabase: ' + error.message)
})