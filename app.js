const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const newsRoutes = require('/REST/routes/news');
const userRoutes = require('/REST/routes/users');
const bodyParser = require('body-parser');
const subjectRoutes = require('/REST/routes/subjects');
const commentRoutes = require('/REST/routes/comments');

mongoose.set('strictQuery', false);
mongoose
  .connect('mongodb://127.0.0.1:27017/news')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('Mongo err', err));

mongoose.Promise = global.Promise;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept,Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.header(
      'Access-Control-Allow-Methods',
      'PUT,POST,PATCH,DELETE,GET'
    );
    return res.status(200).json({});
  }

  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/news', newsRoutes);
app.use('/comments', commentRoutes);
app.use('/users', userRoutes);
app.use('/subjects', subjectRoutes);




app.use((req, res, next) => {
  const error = new Error('Not found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

module.exports = app;
