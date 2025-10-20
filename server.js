
const express = require('express');
require('dotenv').config();  // Make sure environment variables are loaded
require('./config/database');
const cors = require('cors');
const morgan = require('morgan')
const session = require('express-session');
const PORT = process.env.PORT || 2030;
const secret = process.env.Secretexpress
const userRouter = require('./routes/userRouter');
const userPassport = require('./routes/userPassport');
const hostPassport = require('./routes/hostPassport');
const gameRoutes = require('./routes/gameRoutes');
const bluetoothRoutes = require('./routes/bluetoothRoutes');
const matchRoutes = require('./routes/matchRoom.routes');
const transactionRoutes = require('./routes/tournanment');
const tournanmentRoutes = require('./routes/transaction.routes');
const swaggerJSDOC = require('swagger-jsdoc');

const passport = require('passport');

require('./middlewares/passportHost');
require('./helper/passport')
console.log("Passport strategies:", Object.keys(passport._strategies));
const swaggerUIEXPRESS = require('swagger-ui-express');
 const hostRoutes = require('./routes/hostRoutes')


 
const app = express();

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// configure socket.io
const io = new Server(server, {
  cors: {
    origin:  '*',
    methods: ['GET','POST']
  }
});

// optional: store io on app so controllers can access via req.app.get('io')
app.set('io', io);

// basic connection handling
io.on('connection', socket => {
  console.log('socket connected', socket.id);

  // join tournament rooms if client asks
  socket.on('joinTournamentRoom', ({ tournamentId }) => {
    if (tournamentId) socket.join(String(tournamentId));
  });

  socket.on('leaveTournamentRoom', ({ tournamentId }) => {
    if (tournamentId) socket.leave(String(tournamentId));
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});



app.use(cors({origin: "*"}));
app.use(morgan('dev'));
app.use(express.json());


app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Mooves Documentation',
    version: '1.0.0',
    description: 'This is a swagger documentation for our web application MOOVES.',
    license: {
      name: 
      'Base_URL: https://mooves.onrender.com ',
    },
    contact: {
      names: 'urigwe somto  ',
      url: 'https://github.com/urigwesomto201/mooves',
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
      url: 'https://mooves.onrender.com',
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
app.use('/api/v1/',tournanmentRoutes);
app.use('/api/v1/',transactionRoutes);
app.use('',userPassport);
app.use('',hostPassport);


// server.js (or app.js)
const autoStartTournaments = require('./utils/autoStartTournaments');
const checkMatchAttendance = require('./utils/checkAttendance');

setInterval(() => {
  autoStartTournaments().catch(console.error);
}, 60 * 1000); // every minute

setInterval(() => {
  checkMatchAttendance().catch(console.error);
}, 60 * 1000); // every minute

// PRODUCTION NOTE: use a cron worker or job queue (Bull + Redis) to guarantee single runner when you have multiple instances.

app.use((error, req, res, next) => {
  if(error){
     return res.status(400).json({message:  error.message})
  }
  next()
})

app.listen(PORT, () => {
    console.log(`Server is listening on PORT: ${PORT}`);
  });
  