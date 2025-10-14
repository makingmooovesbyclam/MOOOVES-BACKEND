// Import Mongoose
const mongoose = require('mongoose');
require('dotenv').config();
const DB = process.env.DATABASE_URL

mongoose.connect(DB, {useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // wait 10s before timeout 
      })
.then(()=>{
console.log('Databse connected Succeffully')
})
.catch((error)=>{
    console.log('Error connecting toDatabase: ' + error.message)
})