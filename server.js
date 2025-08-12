
const express = require('express');
require('dotenv').config();  // Make sure environment variables are loaded
require('./config/database');
const cors = require('cors');
const morgan = require('morgan')
const session = require('express-session');
const PORT = process.env.PORT || 2030;
const secret = process.env.Secretexpress
const userRouter = require('./routes/userRouter');
const gameRoutes = require('./routes/gameRoutes');
const bluetoothRoutes = require('./routes/bluetoothRoutes');
const matchRoutes = require('./routes/matchRoom.routes');
const swaggerJSDOC = require('swagger-jsdoc');
const swaggerUIEXPRESS = require('swagger-ui-express');
 const hostRoutes = require('./routes/hostRoutes')


const app = express();
app.use(cors({origin: "*"}));
app.use(morgan('dev'));
app.use(express.json());


app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
}));



const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Mooves Documentation',
    version: '1.0.0',
    description: 'This is a swagger documentation for our web application MOOVES.',
    license: {
      name: 
      'Base_URL: https://heavenlist2-zaz3.onrender.com ',
    },
    contact: {
      names: 'urigwe somto  ',
      url: 'https://github.com/urigwesomto201/HEAVENLIST2',
    },
  },
  "components": {
 "securitySchemes": {
    "BearerAuth": {
      "type": 'http',
      "scheme": 'bearer',
      "bearerFormat": 'JWT',
    },
  },
},

security: [
  {
    bearerAuth: [],
  },
],
  servers: [
    {
      url: 'https://heavenlist2-zaz3.onrender.com',
      description: 'Production server',
    },
    {
      url: 'http://localhost:1777',
      description: 'Development server',
    },
  ],


};


// Swagger Options
const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Adjust this path based on your actual route files
};

const swaggerSpec = swaggerJSDOC(options);

// Swagger UI setup
app.use('/Mooves', swaggerUIEXPRESS.serve, swaggerUIEXPRESS.setup(swaggerSpec));



app.use('/api/v1/',userRouter);
app.use('/api/v1/',hostRoutes);
app.use('/api/v1/',gameRoutes);
app.use('/api/v1/',bluetoothRoutes);
app.use('/api/v1/',matchRoutes);
app.use((error, req, res, next) => {
  if(error){
     return res.status(400).json({message:  error.message})
  }
  next()
})

app.listen(PORT, () => {
    console.log(`Server is listening on PORT: ${PORT}`);
  });
  