const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const swaggerUI = require('swagger-ui-express');

require('dotenv').config();

const {MONGO_CONNECT_URL, PORT, ALLOWED_ORIGIN, NODE_ENV} = require('./configs/config');
const startCron = require('./cron');
const {authRouter, userRouter} = require('./routers');
const {GENERIC_ERROR}=require('./errors/status-enum');
const swaggerJson = require('./docs/swagger.json');
const {checkDefaultData} = require("./util");

const app = express();

mongoose.connect(MONGO_CONNECT_URL);

app.use(helmet());
app.use(cors({ origin: _configureCors }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

if (NODE_ENV === 'dev') {
    const morgan = require('morgan');

    app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded());

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJson));
app.use('/users', userRouter);
app.use('/auth', authRouter);

// eslint-disable-next-line no-unused-vars
app.use('*', (err, req, res, next) => {
    res
        .status(err.status || GENERIC_ERROR)
        .json({message: err.message});
});

app.listen(PORT, () => {
    console.log(`App listen ${PORT}`);
    checkDefaultData();
    startCron();
});


function _configureCors(origin, callback) {
    if (NODE_ENV === 'dev') {
        return callback(0, true);
    }

    const whiteList = ALLOWED_ORIGIN.split(';');

    if (!whiteList.includes(origin)) {
        return callback(new ErrorHandler('CORS is not allowed'), false);
    }

    return callback(null, true);
};
