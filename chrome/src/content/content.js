import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { ToastContainer } from 'react-toastify'
import { Icon } from '@iconify/react'

import { ErrorType, configureErrors, handleError } from '../lib/ErrorManager.js'
import MainStorage from '../db/MainStorage.js'

import 'react-toastify/dist/ReactToastify.css'
import './content.scss'

////////////////////////////////////////////////////////////////////////

/**
 * Terminology:
 * - There are three kinds of contributions: posts, answers and comments
 * - A thread contains a post and zero or more replies
 * - A reply is either an answer or a comment
 */

const ContribType = Object.freeze({
  POST: 'post',
  ANSWER: 'answer',
  COMMENT: 'comment',
});

////////////////////////////////////////////////////////////////////////
// Caches

/**
 * Structure of cache:
 *
 *  {
 *    courses: [
 *      1234,
 *      ...
 *    ],
 *  }
 */
class UserCache {
  constructor() {
    this.courses = [];
  }

  replace(courses) {
    this.courses = courses;
  }

  contains(courseId) {
    return this.courses.includes(courseId);
  }
}

/**
 * Structure of cache:
 *
 *  {
 *    courseId: ...,
 *    post: {
 *      id: ...,
 *      userId: ...,
 *      userName: ...,
 *      karma: ...,
 *    },
 *    replies: {
 *      23456: {
 *        id: ...,
 *        userId: ...,
 *        userName: ...,
 *        type: ..., // answer or comment
 *        karma: ...,
 *      },
 *      ...
 *    },
 *  }
 */
class ThreadCache {
  constructor() {
    this.courseId = 0;
    this.post = {};
    this.replies = {};
  }

  replace(data, scores) {
    this.courseId = data.courseId;

    this.post = {
      ...data.post,
      karma: scores.posts[data.post.id]?.karma || 0,
    };

    this.replies = {};
    for (const [id, answer] of Object.entries(data.answers)) {
      this.replies[id] = {
        ...answer,
        type: ContribType.ANSWER,
        karma: scores.replies[id]?.karma || 0,
      };
    }
    for (const [id, comment] of Object.entries(data.comments)) {
      this.replies[id] = {
        ...comment,
        type: ContribType.COMMENT,
        karma: scores.replies[id]?.karma || 0,
      };
    }
  }

  getPost() {
    return this.post;
  }

  getReply(replyId) {
    return this.replies[replyId];
  }

  convert(replyId, type) {
    this.replies[replyId].type = type;
  }

  getPostKarma() {
    return this.post.karma;
  }

  setPostKarma(karma) {
    this.post.karma = karma;
  }

  getReplyKarma(replyId) {
    return this.replies[replyId].karma;
  }

  setReplyKarma(replyId, karma) {
    this.replies[replyId].karma = karma;
  }

  insertReply(reply) {
    this.replies[reply.id] = reply;
  }
};

////////////////////////////////////////////////////////////////////////

configureErrors({
  [ErrorType.SERVER.UNAUTHORISED]: { cooldown: 600 },
  [ErrorType.SERVER.UNAVAILABLE]: { cooldown: 600 },
  [ErrorType.SERVER.UNAUTHORISED_SAVED]: { cooldown: 600 },
  [ErrorType.SERVER.UNAVAILABLE_SAVED]: { cooldown: 600 },
});

const storage = new MainStorage();

const U = new UserCache();

const T = new ThreadCache();

////////////////////////////////////////////////////////////////////////
// Event handlers

document.addEventListener('fetchData', ({detail: message}) => {
  if (message.type === 'user-data') {
    console.debug("[EdKarma] Received user data:", message.data);
    handleUserData(message.data);
  } else if (message.type === 'thread-data') {
    console.debug("[EdKarma] Received thread data:", message.data);
    handleThreadData(message.data);
  }
});

document.addEventListener('edKarmaSocketMessage', (e) => {
  if (!U.contains(T.courseId)) return;

  const message = e.detail;
  console.debug("[EdKarma] Received message on socket:", message);
  if (message.type === 'comment.new') {
    handleNewReply(message.data);
  } else if (message.type === 'comment.update') {
    handleUpdatedReply(message.data);
  }
});

////////////////////////////////////////////////////////////////////////

async function handleUserData(userData) {
  let courses = [];
  for (const {course, role: {role}} of userData.courses) {
    if (parseInt(course.year) < 2022) continue;

    const status = course.status;

    if (role === 'tutor' || role === 'staff' || role === 'admin') {
      if (status === 'active') {
        courses.push(course.id);
      }
      storage.setCourseInfo(
        course.id, course.code, course.name, course.status
      );
    }
  }
  U.replace(courses);
}

/**
 * Structure of thread object:
 *  {
 *      id: ...,
 *      number: ...,
 *      courseId: ...,
 *      post: {
 *          id: ...,
 *          userId: ...,
 *          userName: ...,
 *      },
 *      answers: {
 *          123456: {
 *              id: ...,
 *              userId: ...,
 *              userName: ...,
 *          },
 *          ...
 *      },
 *      comments: {
 *          234567: {
 *              id: ...,
 *              userId: ...,
 *              userName: ...,
 *          },
 *          ...
 *      },
 *  }
 */

async function handleThreadData(threadData) {
  const thread = unpackThreadData(threadData);

  if (!U.contains(thread.courseId)) return;

  let scores;
  try {
    scores = await storage.getScores(
      thread.courseId,
      [thread.post.id],
      Object.keys(thread.answers).concat(Object.keys(thread.comments)),
    );
  } catch (e) {
    handleError(e.message);
    scores = {posts: {}, replies: {}};
  }

  if (!(await waitForRender(thread.number))) {
    console.warn("[EdKarma] Giving up (thread failed to render)");
    return;
  }

  T.replace(thread, scores);

  addKarmaMenus();
}

function unpackThreadData(response) {
  const users = {};
  for (const user of response.users) {
    users[user.id] = user;
  }

  const res = {
    id: response.thread.id,
    number: response.thread.number,
    courseId: response.thread.course_id,
    post: {},
    answers: {},
    comments: {},
  };

  res.post = {
    id: response.thread.id,
    userId: response.thread.user_id,
    userName: users[response.thread.user_id]?.name,
  };

  flattenComments(response.thread.comments);

  for (const answer of response.thread.answers) {
    res.answers[answer.id] = {
      id: answer.id,
      userId: answer.user_id,
      userName: users[answer.user_id]?.name,
    };
    flattenComments(answer.comments);
  }

  return res;

  // Flatten the recursive structure of comments
  function flattenComments(comments) {
    for (const comment of comments) {
      res.comments[comment.id] = {
        id: comment.id,
        userId: comment.user_id,
        userName: users[comment.user_id]?.name,
      }
      flattenComments(comment.comments);
    }
  }
}

/**
* Wait for the thread to render
* @param {number} threadNumber
* @returns {Promise<boolean>}
*/
function waitForRender(threadNumber) {
  return new Promise(resolve => {
    function checkForRender(retries = 0) {
      if (retries > 100) {
        resolve(false);
        return;
      }
      const elem = document.querySelector('.disthrb-number');
      if (elem && elem.textContent.match(`#${threadNumber}`)) {
        resolve(true);
      } else {
        setTimeout(() => checkForRender(retries + 1), 0);
      }
    }
    checkForRender();
  });
}

////////////////////////////////////////////////////////////////////////

async function handleNewReply(data) {
  if (!window.location.href.includes(
    `courses/${data.comment.course_id}/` +
    `discussion/${data.comment.thread_id}`
  )) {
    return;
  }

  const reply = {
    id: data.comment.id,
    userId: data.comment.user_id,
    userName: data.comment.user?.name,
    type: data.comment.type,
    karma: 0,
  };
  T.insertReply(reply);

  if (!(await waitForReplyRender(reply.id))) {
    console.warn(`[EdKarma] Giving up (${reply.type} failed to render)`);
  }
  addKarmaMenus();
}

function waitForReplyRender(replyId) {
  return new Promise(resolve => {
    function checkForReplyRender(retries = 0) {
      if (retries > 100) {
        resolve(false);
        return;
      }
      const elem = document.querySelector(
        `[data-comment-id="${replyId}"]`
      );
      if (elem) {
        resolve(true);
      } else {
        // console.log("[EdKarma] Retrying checkForReplyRender...");
        setTimeout(() => checkForReplyRender(retries + 1), 0);
      }
    }
    checkForReplyRender();
  });
}

////////////////////////////////////////////////////////////////////////

async function handleUpdatedReply(data) {
  const id = data.comment.id;

  // answer/comment was liked/un-liked
  if (data.comment.type === undefined) return;

  // if we're not actually on the page that has the reply
  if (!window.location.href.includes(
    `courses/${data.comment.course_id}/` +
    `discussion/${data.comment.thread_id}`
  )) {
    return;
  }

  // if the answer/comment has already been deleted
  if (data.comment.deleted_at !== null) return;

  // answer/comment was not converted to comment/answer
  if (data.comment.type === T.getReply(id).type) {
    return;
  }

  T.convert(id, data.comment.type);

  if (!(await waitForUnrender(id))) {
    console.warn(
      "[EdKarma] Giving up " +
      `(${data.comment.type} failed to unrender)...`
    );
    return;
  }

  addKarmaMenus();
}

/**
* Wait for a answer/comment to unrender
* @param {number} postId
* @returns {Promise<boolean>}
*/
function waitForUnrender(postId) {
  return new Promise(resolve => {
    function checkForUnrender(retries = 0) {
      if (retries > 100) {
        resolve(false);
        return;
      }
      const elem = document.querySelector(
        `[data-karma-id="${postId}"]`
      );
      if (!elem) {
        resolve(true);
      } else {
        // console.log("[EdKarma] Retrying checkForUnrender...");
        setTimeout(() => checkForUnrender(retries + 1), 0);
      }
    }
    checkForUnrender();
  });
}

////////////////////////////////////////////////////////////////////////

function addKarmaMenus() {
  addKarmaMenuToPost();
  addKarmaMenusToAnswers();
  addKarmaMenusToComments();
  addListenersToCommentBars();
}

function addKarmaMenuToPost() {
  const post = document.querySelector('.dissho-thread');
  if (post) {
    const actions = post.querySelector('.disthrb-actions');

    addKarmaMenu(actions, ContribType.POST, T.getPost());
  } else {
    console.warn(`[EdKarma] Post could not be found`);
  }
}

function addKarmaMenusToAnswers() {
  const answers = document.querySelectorAll('.dissho-answer');
  for (const answer of answers) {
    const actions = answer.querySelector('.disthrb-actions');
    const answerId = answer.getAttribute('data-comment-id');

    if (T.getReply(answerId)) {
      addKarmaMenu(actions, ContribType.ANSWER, T.getReply(answerId));
    } else {
      console.warn(`[EdKarma] Answer ${answerId} could not be found`);
    }
  }
}

function addKarmaMenusToComments() {
  const comments = document.querySelectorAll('.discuss-comment');
  for (const comment of comments) {
    const actions = comment.querySelector('.discom-actions');
    const commentId = comment.getAttribute('data-comment-id');

    if (T.getReply(commentId)) {
      addKarmaMenu(actions, ContribType.COMMENT, T.getReply(commentId));
    } else {
      console.warn(`[EdKarma] Comment ${commentId} could not be found`);
    }
  }
}

function addListenersToCommentBars() {
  const bars = document.querySelectorAll(
    '.comment-children-bar, .comment-bar, .comment-stem, .discoms-showmore'
  );

  for (const bar of bars) {
    if (bar.getAttribute('ed-karma-listener') !== 'true') {
      bar.setAttribute('ed-karma-listener', 'true');
      bar.addEventListener('click', async () => {
        // testing shows that a delay is not necessary
        addKarmaMenus();
      });
    }
  }
}

////////////////////////////////////////////////////////////////////////

function addKarmaMenu(actionsMenu, contribType, contrib) {
  // can't award karma to completely anonymous posts
  if (contrib.userId === 0) return;

  // menu already exists
  if (actionsMenu.querySelector('.ed-karma')) {
    return;
  }

  const addon = document.createElement("button");
  addon.classList.add("ed-karma");
  addon.dataset.karmaId = contrib.id;

  if (contribType !== ContribType.COMMENT) {
    addon.classList.add("discuss-thread-action", "ed-focus-outline");
    actionsMenu.insertBefore(addon, actionsMenu.firstChild);
  } else {
    addon.classList.add("discom-action", "ed-focus-outline");
    actionsMenu.insertBefore(addon, actionsMenu.firstChild.nextSibling);
  }

  const root = ReactDOM.createRoot(addon);
  root.render(<KarmaAddon type={contribType} contrib={contrib} />);
}

function KarmaAddon(props) {
  const [show, setShow] = useState(false);
  const [karma, setKarma] = useState(props.contrib.karma);

  return (
    <span
      className="karma-action-btn"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span>
        { karma === 0
            ? <Icon icon="ph:triangle" inline />
            : <Icon icon="ph:triangle-fill" inline color="#8a2be2" />
        }
      </span>

      <span> {karma}</span>

      { show &&
          <KarmaPopup
            contrib={props.contrib} type={props.type}
            setShow={setShow} setKarma={setKarma}
          />
      }
    </span>
  );
}

function KarmaPopup(props) {
  return (
    <div className="karma-menu-popup">
      <div style={{ height: "24px" }}></div>
      <div className="karma-menu-btn-group">
        { [0, 1, 2, 3, 4, 5].map((karma) =>
          <button
            className="karma-menu-btn"
            onClick={() => {
              props.setKarma(karma);
              props.setShow(false);
              updateKarma(props.contrib, props.type, karma);
            }}
          >
            {karma}
          </button>
        )}
      </div>
    </div>
  );
}

async function updateKarma(contrib, contribType, karma) {
  let update;
  if (contribType === ContribType.POST) {
    T.setPostKarma(karma);
    update = storage.updatePost.bind(storage);
  } else {
    T.setReplyKarma(contrib.id, karma);
    update = storage.updateReply.bind(storage);
  }

  try {
    await update(
      T.courseId, contrib.id, contrib.userId, contrib.userName, karma
    );
  } catch (e) {
    handleError(e.message);
  }
}

////////////////////////////////////////////////////////////////////////
// Toasts

function addToastContainer() {
  const div = document.createElement("div");
  const root = ReactDOM.createRoot(div);
  root.render(<ToastContainer />);
  document.body.appendChild(div);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addToastContainer);
} else {
  addToastContainer();
}

////////////////////////////////////////////////////////////////////////