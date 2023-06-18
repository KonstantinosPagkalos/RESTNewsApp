const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const NewsModel = require('../models/newsModel');
const CommentModel = require('../models/comment');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const visitorMiddleware = require('../middleware/visitorMiddleware');
const { AdminOrReporter } = require('../middleware/AdminOrReporter');

router.post('/',visitorMiddleware, async (req, res) => {
  const { content, creatorName } = req.body;

  try {
    const newComment = new CommentModel({
      content,
      creatorName
    });

    await newComment.save();

    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.patch('/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  try {
    const comment = await CommentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Content must be modified' });
    }

    // Create a copy of the comment with the modified content
    const updatedComment = {
      ...comment.toObject(),
      content
    };

    // Update the comment in the database
    await CommentModel.findByIdAndUpdate(commentId, updatedComment);

    res.status(200).json({ message: 'Comment modified successfully', comment: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/approve',authenticateAdmin, async (req, res) => {
  const { commentId, newsItemId } = req.body;

  try {
    const newsItem = await NewsModel.findById(newsItemId);

    if (!newsItem) {
      return res.status(404).json({ message: 'News item not found' });
    }

    if (newsItem.status !== 'published') {
      return res.status(403).json({ message: 'Cannot approve a comment for an unpublished news item' });
    }

    const comment = await CommentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Update the comment state to "approved"
    comment.state = 'approved';
    await comment.save();

    // Add the comment to the news item's comments array
    newsItem.comments.push(commentId);
    await newsItem.save();

    res.status(200).json({ message: 'Comment approved', comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.delete('/:commentId',authenticateAdmin, async (req, res) => {
  const { commentId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const comment = await CommentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.state === 'approved') {
      const newsItem = await NewsModel.findById(comment.newsItemId);
      if (newsItem) {
        const updatedComments = newsItem.comments.filter(c => c.toString() !== commentId);
        await db.news.updateOne(
          { _id: ObjectId(newsItem._id) },
          { $set: { comments: updatedComments } }
        );
        await db.news.clear();
      }

      await CommentModel.findByIdAndDelete(commentId);

      return res.status(200).json({ message: 'Approved comment deleted and removed from the news item successfully' });
    }

    await CommentModel.findByIdAndDelete(commentId);

    res.status(200).json({ message: 'Comment rejected and deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





router.get('/news/:id',AdminOrReporter, async (req, res) => {
  const { id } = req.params;

  try {
    const newsItem = await NewsModel.findOne({ _id: id, status: 'published' });

    if (!newsItem) {
      return res.status(404).json({ message: 'Published news item not found' });
    }

    const commentIds = newsItem.comments;
    const comments = await CommentModel.find({ _id: { $in: commentIds } }).sort({ createdAt: 'asc' });
    const commentCount = comments.length;

    res.status(200).json({ message: 'Comments retrieved successfully', commentCount, comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/approve/approved',visitorMiddleware, async (req, res) => {
  try {
    const approvedComments = await CommentModel.find({ state: 'approved' }).select('_id content creatorName');

    res.status(200).json({ message: 'Approved comments retrieved successfully', comments: approvedComments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});







module.exports = router;
