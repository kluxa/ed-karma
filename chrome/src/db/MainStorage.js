import { ErrorType } from '../lib/ErrorManager'
import ServerStorage, { ServerError } from './ServerStorage'
import SyncStorage from './SyncStorage'

/**
* Forwards operations to SyncStorage or ServerStorage depending on a
* course's settings
*/
export default class MainStorage {
  //////////////////////////////////////////////////////////////////////
  // Courses

  async getAllCourses() {
    return await SyncStorage.getAllCourses();
  }

  //////////////////////////////////////////////////////////////////////
  // Course details

  async getCourseDetails(courseId) {
    return await SyncStorage.getCourseDetails(courseId);
  }

  async setCourseInfo(courseId, courseCode, courseName, status) {
    return await SyncStorage.setCourseInfo(
      courseId, courseCode, courseName, status
    );
  }

  async setCourseSettings(courseId, storageType, baseUrl, apiKey) {
    return await SyncStorage.setCourseSettings(
      courseId, storageType, baseUrl, apiKey
    );
  }

  //////////////////////////////////////////////////////////////////////
  // Scores

  async getScores(courseId, postIds, replyIds) {
    const storage = await this.#getStorage(courseId);

    return await storage.getScores(postIds, replyIds);
  }

  async updateScores(courseId, posts, replies) {
    const storage = await this.#getStorage(courseId);

    try {
      return await storage.updateScores(posts, replies);
    } catch (e) {
      if (e instanceof ServerError) {
        const local = new SyncStorage(courseId);

        await local.updateScores(posts, replies);
        if (e.message === ErrorType.SERVER.UNAVAILABLE) {
          throw new Error(ErrorType.SERVER.UNAVAILABLE_SAVED);
        } else if (e.message === ErrorType.SERVER.UNAUTHORISED) {
          throw new Error(ErrorType.SERVER.UNAUTHORISED_SAVED);
        } else {
          throw new Error(ErrorType.UNKNOWN);
        }
      } else {
        throw e;
      }
    }
  }

  async updatePost(courseId, postId, userId, userName, karma) {
    return await this.updateScores(courseId, {
      [postId]: {
        id: postId,
        userId: userId,
        userName: userName,
        karma: karma,
      },
    }, {});
  }

  async updateReply(courseId, replyId, userId, userName, karma) {
    return await this.updateScores(courseId, {}, {
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

  async getSummary(courseId) {
    const storage = await this.#getStorage(courseId);

    return await storage.getSummary();
  }

  //////////////////////////////////////////////////////////////////////
  // Sync to server

  async syncToServer(courseId) {
    const details = await SyncStorage.getCourseDetails(courseId);
    const settings = details.settings.storage;

    if (settings.type !== 'server') {
      throw new Error(ErrorType.CANT_SYNC_TO_SERVER);
    }

    const scores = await SyncStorage.getAllScores(courseId);

    const storage = new ServerStorage(
      courseId, settings.baseUrl, settings.apiKey
    );

    await storage.updateScores(scores.posts, scores.replies);

    await SyncStorage.clearScores(courseId);
  }

  //////////////////////////////////////////////////////////////////////
  // Utility method

  async #getStorage(courseId) {
    const details = await SyncStorage.getCourseDetails(courseId);
    const settings = details.settings.storage;
    if (settings.type === 'local') {
      return new SyncStorage(courseId);
    } else {
      return new ServerStorage(
        courseId, settings.baseUrl, settings.apiKey
      );
    }
  }
}
