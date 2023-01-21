import { toast } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

export const ErrorType = Object.freeze({
  SYNC: '1',
  SERVER: {
    UNAUTHORISED: '2',
    UNAVAILABLE: '3',
    UNAUTHORISED_SAVED: '4',
    UNAVAILABLE_SAVED: '5',
  },
  CANT_SYNC_TO_SERVER: '6',
  MUST_GRANT_PERMISSION: '7',
  UNKNOWN: '8',
});

const errorConfig = {
  [ErrorType.SYNC]: {
    cooldown: 0,
    message: (
      "There was a problem communicating with sync storage."
    ),
  },
  [ErrorType.SERVER.UNAUTHORISED]: {
    cooldown: 0,
    message: (
      "You are not authorised to access your course's Ed Karma server."
    ),
  },
  [ErrorType.SERVER.UNAVAILABLE]: {
    cooldown: 0,
    message: (
      "There was a problem communicating with your course's Ed Karma " +
      "server."
    ),
  },
  [ErrorType.SERVER.UNAUTHORISED_SAVED]: {
    cooldown: 0,
    message: (
      "You are not authorised to access your course's Ed Karma server. " +
      "Scores will be saved locally until you have access."
    ),
  },
  [ErrorType.SERVER.UNAVAILABLE_SAVED]: {
    cooldown: 0,
    message: (
      "There was a problem communicating with your course's Ed Karma " +
      "server. Scores will be saved locally until the server is available."
    ),
  },
  [ErrorType.CANT_SYNC_TO_SERVER]: {
    cooldown: 0,
    message: (
      "You have configured scores to be stored locally instead of on a " +
      "server. Please update your settings and try again."
    ),
  },
  [ErrorType.MUST_GRANT_PERMISSION]: {
    cooldown: 0,
    message: (
      "Permission must be granted to use the Server option."
    ),
  }
};

const lastOccurrence = {};

////////////////////////////////////////////////////////////////////////

export function configureErrors(config) {
    for (const [err, conf] of Object.entries(config)) {
        Object.assign(errorConfig[err], conf);
    }
}

export function handleError(errorType) {
  const now = new Date();
  lastOccurrence[errorType] ??= new Date(0);

  const elapsed = timeDiff(lastOccurrence[errorType], now);

  if (elapsed > getCooldown(errorType)) {
    showErrorToast(getMessage(errorType));
  }

  lastOccurrence[errorType] = now;
}

////////////////////////////////////////////////////////////////////////
// Utility

// milliseconds
function timeDiff(before, after) {
  return after.getTime() - before.getTime();
}

// milliseconds
function getCooldown(errorType) {
  return 1000 * (errorConfig[errorType]?.cooldown ?? 0);
}

function getMessage(errorType) {
  return errorConfig[errorType]?.message ??
    "An error was encountered while communicating with your course's " +
    "Ed Karma server.";
}

////////////////////////////////////////////////////////////////////////
// Toast

function showErrorToast(message) {
  toast.error(message, {
    position: toast.POSITION.BOTTOM_LEFT,
    className: "toast-error",
    autoClose: 10000,
  });
}

////////////////////////////////////////////////////////////////////////
