import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-toastify/dist/ReactToastify.css'
import './App.scss'

import { getThemeSetting, setThemeSetting } from '../lib/ThemeManager'
import { ErrorType, handleError } from '../lib/ErrorManager'
import MainStorage from '../db/MainStorage'

const storage = new MainStorage();

function App() {
  return (
    <>
      <Navbar />
      <Main />
      <ToastContainer />
    </>
  );
}

function Navbar() {
  return (
    <nav className="navbar fixed-top">
      <div className="container">
        <span className="navbar-my-brand">Ed Karma - Settings</span>
      </div>
    </nav>
  );
}

function Main() {
  return (
    <div className="container h-100 main" style={{maxWidth: "1000px"}}>
      <div className="row h-100 py-3">
        <div className="col">
          <ThemeSection />
          <StorageSection />
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////

function ThemeSection() {
  return (
    <div>
      <h2>Theme</h2>
      <p>
        Choose between light and dark themes, or automatically set the
        theme based on your system settings.
      </p>
      <ThemeForm />
    </div>
  );
}

function ThemeForm() {
  const themes = [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['system', 'System'],
  ];

  const handleThemeSelected = (theme) => {
    setThemeSetting(theme);
  };

  return (
    <form>
      {
        themes.map(([id, name]) =>
          <div class="form-check">
            <input
              type="radio" name="theme"
              id={`theme-${id}`}
              className="form-check-input"
              defaultChecked={id === (getThemeSetting() || 'light')}
              onChange={() => handleThemeSelected(id)}
            />
            <label className="form-check-label" for={`theme-${id}`}>
              {name}
            </label>
          </div>
        )
      }
    </form>
  );
}

////////////////////////////////////////////////////////////////////////

function StorageSection() {
  return (
    <div className="mt-3">
      <h2>Storage</h2>
      <StorageInfo />
      <StorageSettings />
    </div>
  );
}

function StorageInfo() {
  return (
    <>
      <p>
        Configure where contribution scores are stored for each course.
        There are two options:
      </p>
      <ul>
        <li>
          <b>Local:</b> Contribution scores are stored in your browser
          and synced between all your devices. Using this option means
          that scores will not be shared between course staff.
        </li>
        <li>
          <b>Server:</b> Contribution scores are stored in a remote
          server that was set up by your course authority. You will need
          to specify the base URL of the server and provide an API key.
        </li>
      </ul>
      <p>
        The <b>Sync to Server</b> button uploads contribution scores
        that are currently stored locally to the server. This should be
        used if your course uses a server and scores were saved locally
        at any point, for example, if the server was not available for
        some time and scores were saved locally instead.
      </p>
    </>
  );
}

function StorageSettings() {
  const [courses, setCourses] = useState({});

  useEffect(() => {
    storage.getAllCourses().then((data) => setCourses(data));
  }, []);

  return (
    <div id="course-settings">
      { Object.entries(courses).map(([courseId, course]) =>
          course.status === "active" &&
            <CourseStorageSettings course={course} />
      )}
    </div>
  );
}

function CourseStorageSettings({course}) {
  return (
    <div className="card mt-4">
      <div className="card-header">
        <h5 className="mb-1">
          {course.code} - {course.name}
        </h5>
      </div>
      <div className="card-body">
        <CourseStorageSettingsForm course={course} />
      </div>
    </div>
  );
}

function CourseStorageSettingsForm({course}) {
  const settings = course.settings.storage;

  const [storageType, setStorageType] = useState(settings.type);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);

  const [savedType, setSavedType] = useState(settings.type);

  const [error, setError] = useState('');

  const handleChange = (event) => {
    const target = event.target;
    const name = target.name;
    if (name === "storage") {
      setStorageType(target.value);
    } else if (name === "base-url") {
      setBaseUrl(target.value);
    } else if (name === "api-key") {
      setApiKey(target.value);
    }
  }

  const handleSave = (event) => {
    if (!errorCheck()) return;

    if (storageType === 'local') {
      updateSettings();
      return;
    }

    browser.permissions.request({
      origins: ["<all_urls>"],
    }).then((granted) => {
      if (granted) {
        updateSettings();
      } else {
        setStorageType('local');
        handleError(ErrorType.MUST_GRANT_PERMISSION);
      }
    });
  };

  const errorCheck = () => {
    if (storageType === 'server') {
      if (baseUrl.trim() === '' || apiKey === '') {
        setError('Please specify the base URL and API key');
        return false;
      }
      if (!isValidHttpUrl(baseUrl)) {
        setError('Please provide a valid URL');
        return false;
      }
    }
    return true;
  }

  const updateSettings = () => {
    setError('');
    storage.setCourseSettings(course.id, storageType, baseUrl, apiKey)
      .then(() => {
        setSavedType(storageType);
        showSuccessToast("Settings saved!");
      });
  }

  const handleSync = (event) => {
    syncScoresToServer(course.id);
  };

  return (
    <form>
      <div className="row mb-3">
        <div className="col-2">
          <select
            name="storage"
            id="storage" className="form-select"
            value={storageType}
            onChange={handleChange}
          >
            <option value="local">Local</option>
            <option value="server">Server</option>
          </select>
        </div>
        <div className="col-6">
          <input
            type="text" name="base-url" placeholder="Base URL"
            aria-label="Base URL"
            disabled={storageType !== "server"}
            id="base-url" className="form-control"
            value={storageType === "server" ? baseUrl : ''}
            onChange={handleChange}
          />
        </div>
        <div className="col">
          <input
            type="password" name="api-key" placeholder="API key"
            aria-label="API key"
            disabled={storageType !== "server"}
            id="api-key" className="form-control"
            value={storageType === "server" ? apiKey : ''}
            onChange={handleChange}
          />
        </div>
      </div>
      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
        >
          Save
        </button>

        { error !== '' &&
            <span className="ms-2 align-middle"> {error} </span>
        }

        <button
          type="button"
          disabled={savedType !== "server"}
          className="btn btn-secondary float-end"
          onClick={handleSync}
        >
          Sync to Server
        </button>
      </div>
    </form>
  );
}

function syncScoresToServer(courseId) {
  storage.syncToServer(courseId).then(() => {
    showSuccessToast("Scores saved to server!");
  }).catch((err) => {
    handleError(err.message);
  });
}

function showSuccessToast(message) {
  toast.success(message, {
    position: toast.POSITION.BOTTOM_LEFT,
    className: "toast-success",
    hideProgressBar: true,
    pauseOnHover: false,
  });
}

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (e) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

////////////////////////////////////////////////////////////////////////

export default App
