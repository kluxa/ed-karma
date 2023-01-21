import { ErrorType } from "../lib/ErrorManager"

export class ServerError extends Error {}

export default class ServerStorage {
  constructor(courseId, baseUrl, apiKey) {
    this.courseId = courseId;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  //////////////////////////////////////////////////////////////////////
  // Retrieving scores

  // GET /scores
  async getScores(postIds, replyIds) {
    const endpoint = (
      `/scores` +
      `?posts=${postIds.join(',')}` +
      `&replies=${replyIds.join(',')}`
    );
    const response = await (await this.#get(endpoint)).json();

    const res = {
      posts: {},
      replies: {},
    };
    if (response.posts) {
      for (const post of response.posts) {
        res.posts[post.id] = post;
      }
    }
    if (response.replies) {
      for (const reply of response.replies) {
        res.replies[reply.id] = reply;
      }
    }
    return res;
  }

  //////////////////////////////////////////////////////////////////////
  // Updating scores

  // PUT /scores
  async updateScores(posts, replies) {
    return await this.#put(`/scores`, {
      posts: posts,
      replies: replies,
    });
  }

  //////////////////////////////////////////////////////////////////////
  // Summary

  async getSummary() {
    const endpoint = `/summary`;
    const response = await this.#get(endpoint);
    const users = await response.json();
    const res = {};
    for (const user of users) {
      res[user.userId] = {
        id: user.userId,
        name: user.userName,
        posts: user.posts,
        replies: user.replies,
        karma: user.karma,
      };
    }
    return res;
  }

  //////////////////////////////////////////////////////////////////////

  async #get(endpoint) {
    let res;

    try {
      res = await fetch(this.baseUrl + endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });
    } catch (e) {
      this.#throwServerError(404);
    }

    if (res.status !== 200) {
      this.#throwServerError(res.status);
    }

    return res;
  }

  async #put(endpoint, body = {}) {
    let res;

    try {
      res = await fetch(this.baseUrl + endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      this.#throwServerError(404);
    }

    if (res.status !== 204) {
      this.#throwServerError(res.status);
    }

    return res;
  }

  #throwServerError(code) {
    if (code === 403) {
      throw new ServerError(ErrorType.SERVER.UNAUTHORISED);
    } else if (code === 404) {
      throw new ServerError(ErrorType.SERVER.UNAVAILABLE);
    } else {
      throw new ServerError(ErrorType.UNKNOWN);
    }
  }
}
