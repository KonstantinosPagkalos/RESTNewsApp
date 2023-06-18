const express = require('express');
const router = express.Router();
const Subject = require('../models/subject');
const mongoose = require('mongoose');
const NewsModel = require('../models/newsModel');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { AdminOrReporter } = require('../middleware/AdminOrReporter');
const visitorMiddleware = require('../middleware/visitorMiddleware');
router.post('/',AdminOrReporter, async (req, res) => {
  try {
    const { name, maidenName, children } = req.body; // Get the subject name, maiden name, and children from the request body

    const subjectData = {
      _id: new mongoose.Types.ObjectId(),
      name,
      status: 'created' // Set the subject status as 'created'
    };

    if (maidenName) {
      subjectData.maidenName = maidenName;
    }

    if (children && Array.isArray(children)) {
      subjectData.children = children;
    }

    const subject = new Subject(subjectData);

    await subject.save(); // Save the new subject to the database

    res.status(201).json({ subject }); // Respond with the created subject
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.patch('/:id',AdminOrReporter, async (req, res) => {
  try {
    const { id } = req.params; // Get the subject ID from the request parameters
    const { name, maidenName, children } = req.body; // Get the updated subject fields from the request body

    if (!name) {
      return res.status(400).json({ message: 'Cannot update subject, name is not provided' });
    }

    const subject = await Subject.findById(id); // Find the subject by ID

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.status !== 'created') {
      return res.status(400).json({ message: 'Subject cannot be modified' });
    }

    // Update the subject fields if provided
    if (name) {
      subject.name = name;
    }
    if (maidenName) {
      subject.maidenName = maidenName;
    }
    if (children) {
      subject.children = children;
    }
    
    subject.createdAt = Date.now(); // Update the createdAt field with the current timestamp

    await subject.save(); // Save the updated subject to the database

    const updatedSubject = await Subject.findById(id); // Fetch the updated subject

    // Prepare the response object with the desired fields
    const response = {
      _id: updatedSubject._id,
      name: updatedSubject.name,
      status: updatedSubject.status,
      createdAt: updatedSubject.createdAt,
      approvedAt: updatedSubject.approvedAt
    };

    // Add maidenName and children to the response if provided
    if (maidenName) {
      response.maidenName = updatedSubject.maidenName;
    }
    if (children) {
      response.children = updatedSubject.children;
    }

    res.status(200).json(response); // Respond with the updated subject fields
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/approve',authenticateAdmin, async (req, res) => {
  const { subjectId, newsItemId } = req.body;

  try {
    const newsItem = await NewsModel.findById(newsItemId);

    if (!newsItem) {
      return res.status(404).json({ message: 'News item not found' });
    }

    if (newsItem.status !== 'published') {
      return res.status(403).json({ message: 'Cannot approve a subject for an unpublished news item' });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Update the subject status to 'approved'
    subject.status = 'approved';

    // Associate the subject with the news item
    newsItem.subjects = newsItem.subjects || [];
    const subjectData = {
      _id: subject._id,
      name: subject.name,
      maidenName: subject.maidenName,
      children: subject.children,
      status: subject.status,
      createdAt: subject.createdAt,
      approvedAt: subject.approvedAt
    };
    newsItem.subjects.push(subjectData);

    await Promise.all([subject.save(), newsItem.save()]);

    res.status(200).json({ message: 'Subject approved and associated with news item', subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.delete('/:subjectId',authenticateAdmin, async (req, res) => {
  const { subjectId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const { status } = subject;

    // Delete the subject from the database
    await Subject.findByIdAndDelete(subjectId);

    let message;
    if (status === 'approved') {
      message = 'Approved subject deleted successfully';
    } else {
      message = 'Subject deleted successfully';
    }

    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





router.get('/',AdminOrReporter, async (req, res) => {
  try {
    const approvedSubjects = await Subject.find({ status: 'approved' })
      .sort({ name: -1 })
      .exec();

    const createdSubjects = await Subject.find({ status: 'created' })
      .sort({ name: -1, createdAt: -1 })
      .exec();

    const subjects = [...approvedSubjects, ...createdSubjects];

    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




router.get('/approve/approved', visitorMiddleware, async (req, res) => {
  try {
    const approvedSubjects = await Subject.find({ status: 'approved' })
      .sort({ name: 1 }) // Use 1 for ascending order, -1 for descending order
      .exec();

    res.status(200).json(approvedSubjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/search',AdminOrReporter, async (req, res) => {
  const { name } = req.query;

  try {
    let query = {};

    if (name) {
      query = { name: { $regex: name, $options: 'i' } };
    } else {
      return res.status(400).json({ message: 'Please provide search keywords' });
    }

    const subjects = await Subject.find(query);

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/approved-search',visitorMiddleware, async (req, res) => {
  const { name } = req.query;

  try {
    let query = {};

    if (name) {
      query = { name: { $regex: name, $options: 'i' }, status: 'approved' };
    } else {
      return res.status(400).json({ message: 'Please provide search keywords' });
    }

    const subjects = await Subject.find(query);

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:subjectId',AdminOrReporter, async (req, res) => {
  const { subjectId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const subject = await Subject.findById(subjectId).exec();

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const { _id, name, maidenName, children, status, createdAt, approvedAt } = subject;

    res.status(200).json({
      id: _id,
      name,
      maidenName,
      children,
      status,
      createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/:subjectId/news',AdminOrReporter, async (req, res) => {
  const { subjectId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const relatedNews = await NewsModel.find({ subjects: subjectId });

    res.status(200).json(relatedNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;






