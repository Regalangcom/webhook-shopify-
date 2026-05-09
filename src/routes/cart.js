const express = require('express');
const { handleTrackCart } = require('../controllers/cartController');

const router = express.Router();

router.post('/', handleTrackCart);

module.exports = router;
