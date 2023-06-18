const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const NewsModel = require('../models/newsModel');
const SubjectModel = require('../models/subject');
const { AdminOrReporter } = require('../middleware/AdminOrReporter');
const visitorMiddleware = require('../middleware/visitorMiddleware');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');



router.post('/', AdminOrReporter, async (req, res) => {
  const { title, content, subjects } = req.body;

  if (!Array.isArray(subjects)) {
    return res.json({ message: "Subjects must be an array" });
  }

  const subjectIds = [];
  const newsSubjects = [];

  for (let i = 0; i < subjects.length; i++) {
    const subjectName = subjects[i];
    try {
      let existingSubject = await SubjectModel.findOne({ name: subjectName });
      if (!existingSubject) {
        // Subject not found, create a new subject item
        existingSubject = new SubjectModel({ name: subjectName });
        const savedSubject = await existingSubject.save();
        subjectIds.push(savedSubject._id); // Use the newly created subject's ID
        newsSubjects.push(savedSubject); // Add the subject object to the newsSubjects array
      } else {
        subjectIds.push(existingSubject._id); // Use the existing subject's ID
        newsSubjects.push(existingSubject); // Add the existing subject object to the newsSubjects array
      }
    } catch (error) {
      return res.json({ message: error.message });
    }
  }

  const news = new NewsModel({
    title,
    content,
    subjects: subjectIds,
    comments: [],
  });

  try {
    const savedNews = await news.save();
    savedNews.subjects = newsSubjects; // Assign the newsSubjects array to the subjects field of savedNews
    res.json(savedNews);
  } catch (error) {
    res.json({ message: error.message });
  }
});



router.patch('/:id', AdminOrReporter, async (req, res) => {
  const { title, content, subjects } = req.body;
  const { id } = req.params;

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.json({ message: "News not found" });
    }

    if (news.status === 'published') {
      return res.json({ message: "Cannot modify published news" });
    }

    if (title) {
      news.title = title;
    }

    if (content) {
      news.content = content;
    }

    if (subjects) {
      if (!Array.isArray(subjects)) {
        return res.json({ message: "Subjects must be an array" });
      }

      const subjectIds = [];
      const newsSubjects = [];

      for (let i = 0; i < subjects.length; i++) {
        const subjectName = subjects[i];
        try {
          let existingSubject = await SubjectModel.findOne({ name: subjectName });
          if (!existingSubject) {
            // Subject not found, create a new subject item
            existingSubject = new SubjectModel({ name: subjectName });
            const savedSubject = await existingSubject.save();
            subjectIds.push(savedSubject._id); // Use the newly created subject's ID
            newsSubjects.push(savedSubject); // Add the subject object to the newsSubjects array
          } else {
            subjectIds.push(existingSubject._id); // Use the existing subject's ID
            newsSubjects.push(existingSubject); // Add the existing subject object to the newsSubjects array
          }
        } catch (error) {
          return res.json({ message: error.message });
        }
      }

      news.subjects = subjectIds; // Update the subjects array of the news item
      news.subject = newsSubjects; // Update the subjects field with the newsSubjects array
    }

    const updatedNews = await news.save();
    res.json(updatedNews);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.patch('/submit/:id', AdminOrReporter, async (req, res) => {
  const { id } = req.params;

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.json({ message: "News not found" });
    }

    if (news.status === 'published') {
      return res.json({ message: "News has already been published" });
    }

    news.status = 'submitted';

    const updatedNews = await news.save();
    res.json(updatedNews);
  } catch (error) {
    res.json({ message: error.message });
  }
});





router.patch('/accept/:id',authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.json({ message: "News not found" });
    }

    if (news.status === 'published') {
      return res.json({ message: "News has already been published" });
    }

    news.status = 'approved';

    const updatedNews = await news.save();
    res.json(updatedNews);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.patch('/reject/:id',authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason, ...updates } = req.body;

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    if (news.status === 'published') {
      return res.status(400).json({ message: "News has already been published" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Rejection reason is required for rejected news" });
    }

    // Dynamically modify the schema to include the value "rejected" in the enum
    const newsSchema = news.schema;
    const statusPath = newsSchema.path('status');
    statusPath.enumValues.push('rejected');

    // Set the rejectionReason directly on the news object
    news.rejectionReason = reason;
    news.status = 'rejected';

    // Apply updates if provided
    if (Object.keys(updates).length > 0) {
      return res.status(400).json({ message: "Only the rejection reason can be provided for rejected news" });
    }

    const updatedNews = await news.save();

    // Restore the original enum values in the schema
    statusPath.enumValues.pop();

    // Add the rejectionReason field to the response object
    const response = {
      title: updatedNews.title,
      content: updatedNews.content,
      createdAt: updatedNews.createdAt,
      status: 'rejected',
      subject: updatedNews.subject,
      comments: updatedNews.comments,
      _id: updatedNews._id,
      __v: updatedNews.__v,
      rejectionReason: updatedNews.rejectionReason
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.patch('/modify/:id',authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, subject } = req.body;

  // Validate the id format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid news ID" });
  }

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    if (news.status !== 'rejected') {
      return res.status(400).json({ message: "The news is not rejected, so no need for extra modification" });
    }

    if (title) {
      news.title = title;
    }
    if (content) {
      news.content = content;
    }
    if (subject) {
      news.subject = subject;
    }

    news.status = 'submitted';

    const updatedNews = await news.save();

    const response = {
      _id: updatedNews._id,
      title: updatedNews.title,
      content: updatedNews.content,
      createdAt: updatedNews.createdAt,
      status: 'submitted',
      subject: updatedNews.subject,
      comments: updatedNews.comments,
      __v: updatedNews.__v
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.patch('/publish/:id',authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  // Validate the id format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid news ID" });
  }

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    if (news.status === 'published') {
      return res.status(400).json({ message: "News has already been published" });
    }

    if (news.status !== 'approved') {
      return res.status(400).json({ message: "News must have the approved status to be published" });
    }

    news.status = 'published';
    news.publishedAt = new Date();

    const updatedNews = await news.save();

    res.json({
      _id: updatedNews._id,
      title: updatedNews.title,
      content: updatedNews.content,
      createdAt: updatedNews.createdAt,
      publishedAt: updatedNews.publishedAt,
      status: 'published',
      subjects: updatedNews.subjects,
      comments: updatedNews.comments,
      __v: updatedNews.__v
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






router.get('/search',AdminOrReporter, async (req, res) => {
  const { title, content } = req.query;

  try {
    let query = {};

    if (title && content) {
      // Search by both title and content
      query = { $and: [{ title: { $regex: title, $options: 'i' } }, { content: { $regex: content, $options: 'i' } }] };
    } else if (title) {
      // Search by title only
      query = { title: { $regex: title, $options: 'i' } };
    } else if (content) {
      // Search by content only
      query = { content: { $regex: content, $options: 'i' } };
    } else {
      // No search parameters provided
      return res.status(400).json({ message: "Please provide search keywords" });
    }

    const newsItems = await NewsModel.find(query);

    res.json(newsItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/search-published',visitorMiddleware, async (req, res) => {
  const { title, content } = req.query;

  try {
    let query = { status: 'published' }; // Add condition for published news

    if (title && content) {
      // Search by both title and content
      query.$and = [{ title: { $regex: title, $options: 'i' } }, { content: { $regex: content, $options: 'i' } }];
    } else if (title) {
      // Search by title only
      query.title = { $regex: title, $options: 'i' };
    } else if (content) {
      // Search by content only
      query.content = { $regex: content, $options: 'i' };
    } else {
      // No search parameters provided
      return res.status(400).json({ message: "Please provide search keywords" });
    }

    const newsItems = await NewsModel.find(query);

    res.json(newsItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





router.get('/:id',authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const news = await NewsModel.findById(id);

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/',AdminOrReporter, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = { status: { $in: ['created', 'submitted', 'approved', 'published'] } };

    if (startDate && endDate) {
      // Filter by date range
      query.$or = [
        { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { publishedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
    }

    const newsItems = await NewsModel.find(query)
      .sort({ createdAt: -1, publishedAt: -1 }) // Sort by createdAt and publishedAt in descending order
      .exec();

    const sortedResults = [];
    ['created', 'submitted', 'approved', 'published'].forEach(status => {
      if (newsItems && newsItems.length > 0) {
        const newsItemsByStatus = newsItems.filter(item => item.status === status);
        sortedResults.push(...newsItemsByStatus);
      }
    });

    res.json(sortedResults);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/publish/publishedByDate',visitorMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = { status: 'published' };

    if (startDate && endDate) {
      // Filter by date range for publishedAt field only
      query.publishedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const publishedNewsItems = await NewsModel.find(query)
      .sort({ publishedAt: -1 }) // Sort by publishedAt in descending order
      .exec();

    res.json(publishedNewsItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/publish/published',visitorMiddleware, async (req, res) => {
  try {
    const publishedNews = await NewsModel.find({ status: 'published' });
    const count = publishedNews.length;
    const message = `Found ${count} published news items.`;

    res.json({
      message,
      count,
      publishedNews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;

































