const request = require('supertest');
const app = require('../app');
const User = require('../models/user');

describe('Authentication API', () => {
  test('should create an admin user', async () => {
    const response = await request(app)
      .post('/users/signup')
      .send({
        username: 'GoGuy123',
        password: 'adminpassword123',
        firstName: 'John123',
        lastName: 'Doe123',
        role: 'admin',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created');
    expect(response.body.token).toBeDefined();
  });

  test('should login as an admin user', async () => {
    const response = await request(app)
      .post('/users/login')
      .send({
        username: 'GoGuy123',
        password: 'adminpassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Authentication successful');
    expect(response.body.token).toBeDefined();
  });
});


describe('News API', () => {
  let token;

  beforeAll(async () => {
    // Login as the admin user to obtain the token
    const loginResponse = await request(app)
      .post('/users/login')
      .send({
        username: 'GoGuy123',
        password: 'adminpassword123',
      });

    token = loginResponse.body.token;
  });

  test('should create a new news', async () => {
    const response = await request(app)
      .post('/news')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Article',
        content: 'Lorem ipsum dolor sit amet',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('News created successfully');
    expect(response.body.news).toBeDefined();
    expect(response.body.news.title).toBe('New Article');
    expect(response.body.news.content).toBe('Lorem ipsum dolor sit amet');
  });
});

describe('Subject API', () => {
  let token;

  beforeAll(async () => {
    // Login as the admin user to obtain the token
    const loginResponse = await request(app)
      .post('/users/login')
      .send({
        username: 'GoGuy123',
        password: 'adminpassword123',
      });

    token = loginResponse.body.token;
  });

  test('should create a new subject', async () => {
    const response = await request(app)
      .post('/subjects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Science',
        maidenName: 'Scientific Studies',
        children: ['Physics', 'Chemistry', 'Biology'],
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Subject created successfully');
    expect(response.body.subject).toBeDefined();
    expect(response.body.subject.name).toBe('Science');
    expect(response.body.subject.maidenName).toBe('Scientific Studies');
    expect(response.body.subject.children).toEqual(['Physics', 'Chemistry', 'Biology']);
  });
});

test('should not publish a news', async () => {
  const newsId = "648f611ecf06bfd9e806eea2";
  const token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im9yZmVhcyIsIl9pZCI6IjY0OGVlZjY0NDJkZDg2NWNlNWE2NTZhMCIsInJvbGUiOiJyZXBvcnRlciIsImlhdCI6MTY4NzExODAwMywiZXhwIjoxNjg3MTIxNjAzfQ.vCIEsDEtcoClGLy9u_karaE0ASrjCpdRcC719cRcKmE";
  const response = await request(app)
    .patch(`/news/${newsId}/publish`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(404);
  expect(response.body.message).toBe('News published successfully');
  expect(response.body.news).toBeDefined();
  expect(response.body.news.status).toBe('published');
  expect(response.body.news.publishedAt).toBeDefined();
});
