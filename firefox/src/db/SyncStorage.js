import { ErrorType } from "../lib/ErrorManager"

export class SyncError extends Error {}

export default class SyncStorage {
  constructor(courseId) {
    this.courseId = courseId;
  }

  //////////////////////////////////////////////////////////////////////
  // Courses

  static async getAllCourses() {
    const db = await SyncStorage.#get();
    return db;
  }

  //////////////////////////////////////////////////////////////////////
  // Course details

  static async getCourseDetails(courseId) {
    const db = await SyncStorage.#get(courseId);
    return db[courseId];
  }

  static async setCourseInfo(courseId, courseCode, courseName, status) {
    const db = await SyncStorage.#get(courseId, true);
    db[courseId].code = courseCode;
    db[courseId].name = courseName;
    db[courseId].status = status;
    return await SyncStorage.#set(db);
  }

  static async setCourseSettings(courseId, storageType, baseUrl, apiKey) {
    const db = await SyncStorage.#get(courseId);
    db[courseId].settings.storage.type = storageType;
    if (storageType === 'server') {
      db[courseId].settings.storage.baseUrl = baseUrl;
      db[courseId].settings.storage.apiKey = apiKey;
    }
    return await SyncStorage.#set(db);
  }

  //////////////////////////////////////////////////////////////////////
  // Scores - static methods

  static async getAllScores(courseId) {
    const db = await SyncStorage.#get(courseId);
    return db[courseId].scores;
  }

  static async clearScores(courseId) {
    const db = await SyncStorage.#get(courseId);
    db[courseId].scores.posts = {};
    db[courseId].scores.replies = {};
    return await SyncStorage.#set(db);
  }

  //////////////////////////////////////////////////////////////////////
  // Retrieving scores - instance methods

  async getScores(postIds, replyIds) {
    const db = await SyncStorage.#get(this.courseId);
    const res = {
      posts: {},
      replies: {},
    };

    for (const id of postIds) {
      if (db[this.courseId].scores.posts[id]) {
        res.posts[id] = db[this.courseId].scores.posts[id];
      }
    }
    for (const id of replyIds) {
      if (db[this.courseId].scores.replies[id]) {
        res.replies[id] = db[this.courseId].scores.replies[id];
      }
    }

    return res;
  }

  async getPosts(postIds) {
    const res = await this.getScores(postIds, []);
    return res.posts;
  }

  async getReplies(replyIds) {
    const res = await this.getScores([], replyIds);
    return res.replies;
  }

  //////////////////////////////////////////////////////////////////////
  // Updating scores

  async updateScores(posts, replies) {
    const db = await SyncStorage.#get(this.courseId);
    for (const [id, post] of Object.entries(posts)) {
      db[this.courseId].scores.posts[id] = post;
    }
    for (const [id, reply] of Object.entries(replies)) {
      db[this.courseId].scores.replies[id] = reply;
    }
    return await SyncStorage.#set(db);
  }

  async updatePosts(posts) {
    return await this.updateScores(posts, {});
  }

  async updateReplies(replies) {
    return await this.updateScores({}, replies);
  }

  async updatePost(postId, userId, userName, karma) {
    return await this.updatePosts({
      [postId]: {
        id: postId,
        userId: userId,
        userName: userName,
        karma: karma,
      },
    });
  }

  async updateReply(replyId, userId, userName, karma) {
    return await this.updateReplies({
      [replyId]: {
        id: replyId,
        userId: userId,
        userName: userName,
        karma: karma,
      },
    });
  }

  //////////////////////////////////////////////////////////////////////
  // Summary

  async getSummary() {
    const db = await SyncStorage.#get(this.courseId);
    const course = db[this.courseId];
    const users = {};

    for (const post of Object.values(course.scores.posts)) {
      if (post.karma > 0) {
        users[post.userId] ??= {};
        users[post.userId]['id'] = post.userId;
        users[post.userId]['name'] ??= post.userName;
        users[post.userId]['posts'] ??= 0;
        users[post.userId]['replies'] ??= 0;
        users[post.userId]['posts']++;
        users[post.userId]['karma'] ??= 0;
        users[post.userId]['karma'] += post.karma;
      }
    }

    for (const reply of Object.values(course.scores.replies)) {
      if (reply.karma > 0) {
        users[reply.userId] ??= {};
        users[reply.userId]['id'] = reply.userId;
        users[reply.userId]['name'] ??= reply.userName;
        users[reply.userId]['posts'] ??= 0;
        users[reply.userId]['replies'] ??= 0;
        users[reply.userId]['replies']++;
        users[reply.userId]['karma'] ??= 0;
        users[reply.userId]['karma'] += reply.karma;
      }
    }

    return users;
  }

  //////////////////////////////////////////////////////////////////////
  // Utility methods

  static async #get(courseId = null, create = false) {
    if (courseId === null) {
      try {
        return await browser.storage.sync.get();
      } catch (e) {
        this.#throwSyncError();
      }
    }

    let db;
    try {
      db = await browser.storage.sync.get(`${courseId}`);
    } catch (e) {
      this.#throwSyncError();
    }

    if (!db[courseId] && create) {
      db[courseId] = {
        id: courseId,
        code: '',
        name: '',
        status: 'archived',
        settings: {
          storage: {
            type: 'local',
            baseUrl: '',
            apiKey: '',
          },
        },
        scores: {
          posts: {},
          replies: {},
        },
      };
    }
    return db;
  }

  static async #set(db) {
    try {
      return await browser.storage.sync.set(db);
    } catch (e) {
      this.#throwSyncError();
    }
  }

  static #throwSyncError() {
    throw new SyncError(ErrorType.SYNC);
  }
}
