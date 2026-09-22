const express = require('express');
const controller = require('../controllers/postController');

const router = express.Router();

router.get('/posts', controller.listPosts);
router.get('/posts/:id', controller.getPost);
router.post('/posts', controller.createPost);
router.post('/posts/:id/likes', controller.likePost);

module.exports = router;
