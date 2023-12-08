const db = {
  posts: [
    {
      id: 1,
      title: 'json-server',
      author: 'typicode'
    },
    {
      id: 2,
      title: 'nodejs',
      author: 'alex'
    },
    {
      id: 3,
      title: 'typescript',
      author: 'zack'
    },
    {
      id: 4,
      title: 'python',
      author: 'steve'
    }
  ],
  comments: [
    {
      id: 1,
      body: 'some comment',
      postId: 1
    }
  ],
  profile: {
    name: 'typicode'
  }
};

module.exports = db;
