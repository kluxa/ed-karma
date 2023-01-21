import React, { useEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-toastify/dist/ReactToastify.css'
import './App.scss'

import '../lib/ThemeManager'
import { handleError } from '../lib/ErrorManager'
import MainStorage from '../db/MainStorage'

const storage = new MainStorage();

let ticketNo = 0;

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
        <span className="navbar-my-brand">Ed Karma - Analytics</span>
      </div>
    </nav>
  );
}

function Main() {
  const [courseId, setCourseId] = useState(null);
  const [courseData, setCourseData] = useState([]);

  const [loading, setLoading] = useState(false);

  const handleCourseSelected = async (courseId) => {
    const currTicketNo = ++ticketNo;
    setLoading(true);
    await delay(500);

    storage.getSummary(courseId).then((data) => {
      if (currTicketNo !== ticketNo) return;

      const sorted = Object.values(data);
      sorted.sort((a, b) => a.name.toLowerCase().localeCompare(
        b.name.toLowerCase()
      ));
      setCourseId(courseId);
      setCourseData(sorted);
      setLoading(false);

    }).catch((err) => {
      if (currTicketNo !== ticketNo) return;

      setCourseId(courseId);
      setCourseData([]);
      setLoading(false);
      handleError(err.message);
    });
  };

  return (
    <div className="container-fluid h-100 main">
      <div className="row h-100 main-content">
        <CoursesPanel
          handleCourseSelected={handleCourseSelected}
        />
        <StatsPanel
          courseId={courseId} data={courseData} key={ticketNo}
          loading={loading}
        />
      </div>
    </div>
  );
}

function CoursesPanel(props) {
  const [courses, setCourses] = useState({});

  useEffect(() => {
    storage.getAllCourses().then((db) => setCourses(db));
  }, []);

  return (
    <div className="col courses-panel">
      <div className="row d-flex justify-content-sm-end">
        <div className="col pt-3 pe-3" id="courses-panel-content">
          <CoursesList
            courses={courses}
            handleCourseSelected={props.handleCourseSelected}
          />
        </div>
      </div>
    </div>
  );
}

function CoursesList(props) {
  return (
    <div id="courses-list">
      { Object.entries(props.courses).map(([courseId, course]) =>
          course.status === 'active' &&
            <>
              <input
                type="radio" name="courses"
                id={`course-${courseId}`}
                className="btn-check"
                onChange={() => props.handleCourseSelected(courseId)}
              />

              <label
                className="btn d-block mb-2 p-2"
                for={`course-${courseId}`}
              >
                {`${course.code} - ${course.name}`}
              </label>
            </>
      )}
    </div>
  );
}

function StatsPanel(props) {
  return (
    <div className="col h-100 overflow-y-scroll stats-panel">
      <div className="row">
        <div className="col pt-3 px-3" id="stats-panel-content">
          { props.loading ?
            <div id="spinner" className="text-center mt-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div> :
            <SearchableTable courseId={props.courseId} data={props.data} />
          }
        </div>
      </div>
    </div>
  );
}

function SearchableTable(props) {
  const [shownData, setShownData] = useState(props.data);
  const [filterStr, setFilterStr] = useState('');

  useEffect(() => {
    setShownData(props.data);
  }, [props.data]);

  const columns = [
    { label: "Name", accessor: "name" },
    { label: "Posts", accessor: "posts" },
    { label: "Replies", accessor: "replies" },
    { label: "Karma", accessor: "karma" },
  ];

  const sortData = (field, order) => {
    const sorted = [...props.data].sort((a, b) =>
      a[field].toString().localeCompare(b[field].toString(), "en", {
        numeric: true,
      }) * (order === 0 ? 1 : -1) * (field === "name" ? 1 : -1)
    );
    setShownData(sorted);
  };

  return (
    <div id="stats-search-table">
      <input
        type="text" id="user-filter" placeholder="Filter Users"
        onKeyUp={(e) => setFilterStr(e.target.value.toLowerCase())}
      />
      <table id="users-table" className="table table-sm">
        <TableHead columns={columns} sortData={sortData} />
        <TableBody
          courseId={props.courseId} data={shownData}
          filterStr={filterStr}
        />
      </table>
    </div>
  );
}

function TableHead(props) {
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState(0);

  const handleSortingChange = (field) => {
    let newSortOrder;
    if (field !== sortField) {
      newSortOrder = 0;
    } else {
      newSortOrder = 1 - sortOrder;
    }
    setSortField(field);
    setSortOrder(newSortOrder);
    props.sortData(field, newSortOrder);
  };

  return (
    <thead>
      <tr id="users-table-header">
        { props.columns.map(({label, accessor}, index) =>
          <th
            className={"nobr" + (
              sortField === accessor ? ` sort-${sortOrder}` : ''
            )}
            width={index === 0 && "60%"}
            onClick={() => handleSortingChange(accessor)}
          >
            {label}
          </th>
        )}
      </tr>
    </thead>
  );
}

function TableBody({courseId, data, filterStr}) {
  return (
    <tbody id="users-table-body">
      { data.map((user) =>
        (filterStr === '' || user.name.toLowerCase().includes(filterStr)) &&
        <tr>
          <td>
            <a
              href={`https://edstem.org/courses/${courseId}/analytics/discussion/users/${user.id}`}
              target="_blank" rel="noreferrer"
            >
              {user.name}
            </a>
          </td>
          <td>{user.posts}</td>
          <td>{user.replies}</td>
          <td>{user.karma}</td>
        </tr>
      )}
    </tbody>
  );
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  })
}

export default App
